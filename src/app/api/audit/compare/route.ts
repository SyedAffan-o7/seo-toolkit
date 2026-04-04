import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractDomain, domainMatch, normalizeUrl } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { AuditCompareResponse, AuditSnapshot, AuditSuggestion, KeywordComparison } from "@/types/audit";
import { getSerpProvider } from "@/lib/serp/provider";

const requestSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  urls: z.array(z.string().url().min(1)).min(2).max(2),
  geo: z.string().optional().default("us"),
  device: z.enum(["desktop", "mobile"]).optional().default("desktop"),
});

const STOPWORDS = new Set([
  "the",
  "is",
  "at",
  "which",
  "on",
  "and",
  "a",
  "an",
  "of",
  "for",
  "to",
  "in",
  "with",
  "by",
  "from",
  "this",
  "that",
  "it",
  "as",
  "be",
  "or",
  "are",
  "was",
  "were",
  "but",
  "if",
]);

const SIMPLE_SYNONYMS: Record<string, string[]> = {
  buy: ["purchase"],
  purchase: ["buy"],
  cheap: ["budget"],
  budget: ["cheap"],
};

function stripSections(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ");
}

function htmlToText(html: string): string {
  return stripSections(html).replace(/<[^>]+>/g, " ");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function uniqueWords(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function buildVariations(keyword: string): string[] {
  const tokens = tokenize(keyword);
  const variations = new Set<string>();
  tokens.forEach((t) => {
    variations.add(t);
    if (t.endsWith("s")) variations.add(t.slice(0, -1));
    else variations.add(`${t}s`);
    (SIMPLE_SYNONYMS[t] || []).forEach((syn) => variations.add(syn));
  });
  return Array.from(variations);
}

function countMatches(haystack: string[], needles: string[]): number {
  const set = new Set(haystack);
  return needles.filter((n) => set.has(n)).length;
}

function extractTagContent(html: string, tag: string): string {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "i")
  );
  return match?.[1]?.trim() || "";
}

function extractMetaContent(html: string, name: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`,
      "i"
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function extractCanonical(html: string): string {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i
  );
  return m?.[1]?.trim() || "";
}

function extractFirstH1(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
}

function extractHeadings(html: string, tag: "h1" | "h2") {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "gi");
  const values: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html))) {
    const text = m[1]?.replace(/<[^>]+>/g, "").trim();
    if (text) values.push(text);
  }
  return values;
}

function countHeadings(html: string) {
  return {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
    h4: (html.match(/<h4[\s>]/gi) || []).length,
  };
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(html: string): number {
  const text = stripHtmlToText(html);
  if (!text) return 0;
  return text.split(" ").length;
}

function countLinks(html: string, pageUrl: string) {
  let pageDomain = "";
  try {
    pageDomain = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  const linkMatches = html.match(/<a[^>]+href=["']([^"'#]*)["']/gi) || [];
  let internal = 0;
  let external = 0;

  for (const tag of linkMatches) {
    const hrefMatch = tag.match(/href=["']([^"'#]*)["']/i);
    const href = hrefMatch?.[1] || "";
    if (!href || href.startsWith("javascript:") || href.startsWith("mailto:"))
      continue;

    if (href.startsWith("/") || href.startsWith("#")) {
      internal++;
    } else {
      try {
        const linkDomain = new URL(href).hostname.replace(/^www\./, "");
        if (linkDomain === pageDomain) internal++;
        else external++;
      } catch {
        internal++;
      }
    }
  }

  return { internal, external };
}

function countImages(html: string) {
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const total = imgTags.length;
  const withAlt = imgTags.filter(
    (t) => /alt=["'][^"']+["']/i.test(t)
  ).length;
  return { total, withAlt };
}

function hasSchemaOrg(html: string): boolean {
  return /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const blocks =
    html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ) || [];
  for (const block of blocks) {
    const inner = block.replace(/<\/?script[^>]*>/gi, "").trim();
    try {
      const parsed = JSON.parse(inner);
      if (parsed["@type"]) types.push(parsed["@type"]);
      if (Array.isArray(parsed["@graph"])) {
        for (const item of parsed["@graph"]) {
          if (item["@type"]) types.push(item["@type"]);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return Array.from(new Set(types));
}

function computeKeywordDensity(html: string, keyword: string): number {
  const text = stripHtmlToText(html).toLowerCase();
  const kw = keyword.toLowerCase();
  if (!text || !kw) return 0;
  const words = text.split(" ").length;
  const kwWords = kw.split(" ").length;
  let count = 0;
  let idx = text.indexOf(kw);
  while (idx !== -1) {
    count++;
    idx = text.indexOf(kw, idx + 1);
  }
  return words > 0 ? parseFloat(((count * kwWords * 100) / words).toFixed(2)) : 0;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timeout: ${url} took longer than 30 seconds to respond`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function computeScore(a: AuditSnapshot): number {
  let score = 0;
  if (a.title && a.titleLength >= 30 && a.titleLength <= 65) score += 10;
  else if (a.title) score += 5;
  if (a.metaDescription && a.metaDescriptionLength >= 70 && a.metaDescriptionLength <= 160) score += 10;
  else if (a.metaDescription) score += 5;
  if (a.headingCounts.h1 === 1) score += 10;
  else if (a.headingCounts.h1 > 0) score += 5;
  if (a.headingCounts.h2 >= 2) score += 5;
  if (a.keywordInTitle) score += 15;
  if (a.keywordInH1) score += 15;
  if (a.keywordInMeta) score += 5;
  if (a.keywordInUrl) score += 5;
  if (a.hasSchema) score += 10;
  if (a.wordCount >= 300) score += 5;
  if (a.wordCount >= 800) score += 5;
  if (a.totalImages > 0 && a.imagesWithAlt === a.totalImages) score += 5;
  return Math.min(score, 100);
}

function buildAudit(
  html: string,
  url: string,
  keyword: string,
  googlePosition: number | null
): AuditSnapshot {
  const cleanedHtml = stripSections(html);
  const title = extractTagContent(html, "title");
  const h1 = extractFirstH1(html);
  const h2s = extractHeadings(html, "h2");
  const metaDescription = extractMetaContent(html, "description");
  const canonical = extractCanonical(html);
  const robotsMeta = extractMetaContent(html, "robots");
  const bodyText = htmlToText(cleanedHtml);
  const wordCount = countWords(cleanedHtml);
  const headingCounts = countHeadings(html);
  const links = countLinks(html, url);
  const images = countImages(html);
  const hasSchema = hasSchemaOrg(html);
  const schemaTypes = extractSchemaTypes(html);
  const keywordLower = keyword.toLowerCase();
  const keywordDensity = computeKeywordDensity(cleanedHtml, keyword);

  const bodyTokens = tokenize(bodyText);
  const uniqueBodyTokens = uniqueWords(bodyTokens);
  const keywordTokens = tokenize(keywordLower);
  const keywordVariations = buildVariations(keywordLower);

  const keywordPresence = {
    title: tokenize(title).some((t) => keywordVariations.includes(t)),
    meta: tokenize(metaDescription).some((t) => keywordVariations.includes(t)),
    h1: tokenize(h1).some((t) => keywordVariations.includes(t)),
    h2: h2s.some((h) => tokenize(h).some((t) => keywordVariations.includes(t))),
    body: keywordVariations.some((t) => uniqueBodyTokens.includes(t)),
  };

  const keywordFrequency = bodyTokens.filter((t) => keywordVariations.includes(t)).length;

  const snapshot: AuditSnapshot = {
    url,
    title,
    titleLength: title.length,
    h1,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    robotsMeta,
    wordCount,
    headingCounts,
    internalLinks: links.internal,
    externalLinks: links.external,
    totalImages: images.total,
    imagesWithAlt: images.withAlt,
    hasSchema,
    schemaTypes,
    keywordInTitle: keywordPresence.title,
    keywordInH1: keywordPresence.h1,
    keywordInMeta: keywordPresence.meta,
    keywordInUrl: url.toLowerCase().includes(keywordLower.replace(/\s+/g, "-")),
    keywordDensity,
    keywordTokens,
    keywordVariations,
    keywordPresence,
    keywordFrequency,
    score: 0,
    googlePosition,
  };
  snapshot.score = computeScore(snapshot);
  return snapshot;
}

function buildKeywordComparison(a: AuditSnapshot, b: AuditSnapshot): KeywordComparison {
  const missingVariations = b.keywordVariations.filter((v) => !a.keywordVariations.includes(v)).slice(0, 10);
  const overlap = a.keywordVariations.filter((v) => b.keywordVariations.includes(v));
  const weakUsage: string[] = [];
  if (!a.keywordInTitle && b.keywordInTitle) weakUsage.push("Add keyword to title");
  if (!a.keywordInH1 && b.keywordInH1) weakUsage.push("Add keyword to H1");
  if (!a.keywordInMeta && b.keywordInMeta) weakUsage.push("Add keyword to meta description");
  if (!a.keywordPresence?.h2 && b.keywordPresence?.h2) weakUsage.push("Add keyword to H2/subheadings");

  return {
    primaryUsage: {
      you: {
        title: a.keywordInTitle,
        meta: a.keywordInMeta,
        h1: a.keywordInH1,
      },
      competitor: {
        title: b.keywordInTitle,
        meta: b.keywordInMeta,
        h1: b.keywordInH1,
      },
    },
    missingVariations,
    overlap,
    weakUsage,
    frequency: {
      you: a.keywordFrequency,
      competitor: b.keywordFrequency,
    },
  };
}

async function analyzeTop10(results: { url: string; title: string }[]) {
  if (results.length === 0) return null;

  const stats = {
    totalWordCount: 0,
    totalTitleLength: 0,
    pagesWithSchema: 0,
    totalInternalLinks: 0,
    pagesAnalyzed: 0,
  };

  // Analyze first 5 results to avoid too many requests
  const toAnalyze = results.slice(0, 5);

  await Promise.all(
    toAnalyze.map(async (result) => {
      try {
        const html = await fetchHtml(result.url);
        stats.totalWordCount += countWords(html);
        stats.totalTitleLength += extractTagContent(html, "title").length;
        if (hasSchemaOrg(html)) stats.pagesWithSchema++;
        stats.totalInternalLinks += countLinks(html, result.url).internal;
        stats.pagesAnalyzed++;
      } catch {
        // Skip failed fetches
      }
    })
  );

  if (stats.pagesAnalyzed === 0) return null;

  return {
    avgWordCount: Math.round(stats.totalWordCount / stats.pagesAnalyzed),
    avgTitleLength: Math.round(stats.totalTitleLength / stats.pagesAnalyzed),
    pagesWithSchema: stats.pagesWithSchema,
    avgInternalLinks: Math.round(stats.totalInternalLinks / stats.pagesAnalyzed),
  };
}

function generateSuggestions(
  a: AuditSnapshot,
  b: AuditSnapshot,
  top10: AuditCompareResponse["top10Analysis"]
): AuditSuggestion[] {
  const suggestions: AuditSuggestion[] = [];

  // Helper: target word count (top10 avg or competitor, whichever is higher)
  const targetWords = top10
    ? Math.max(top10.avgWordCount, b.wordCount)
    : b.wordCount;

  // ═══════════════════════════════════════════════════════
  // CRITICAL — Without these, you CANNOT rank
  // ═══════════════════════════════════════════════════════

  if (!a.title) {
    suggestions.push({
      category: "critical",
      priority: 10,
      message: "Your page has NO title tag. Google cannot rank a page without a title.",
      action: `Add this to your HTML <head>:\n<title>${b.title || "Your Keyword - Your Brand"}</title>\nKeep it between 50-60 characters and include your keyword at the start.`,
      yourValue: "Missing",
      competitorValue: b.title ? `"${b.title}" (${b.titleLength} chars)` : "Also missing",
      impact: "Title tag is the #1 on-page ranking factor. Without it, you won't appear in search results at all.",
    });
  }

  if (a.headingCounts.h1 === 0) {
    suggestions.push({
      category: "critical",
      priority: 10,
      message: "Your page has NO H1 heading. Google uses this to understand your page topic.",
      action: `Add one H1 at the top of your content:\n<h1>${b.h1 || "Your Keyword - Descriptive Heading"}</h1>\nInclude your keyword naturally. Only use ONE H1 per page.`,
      yourValue: "Missing",
      competitorValue: b.h1 ? `"${b.h1}"` : "Also missing",
      impact: "H1 is the most important heading on the page. Google uses it to determine what your page is about.",
    });
  }

  if (!a.metaDescription) {
    suggestions.push({
      category: "critical",
      priority: 9,
      message: "Your page has NO meta description. This is what users see in Google search results.",
      action: `Add this to your HTML <head>:\n<meta name="description" content="Write a compelling 150-160 character description that includes your keyword and makes people want to click.">\nMake it sell your page — this is your ad in Google.`,
      yourValue: "Missing",
      competitorValue: b.metaDescription
        ? `"${b.metaDescription.slice(0, 80)}..." (${b.metaDescriptionLength} chars)`
        : "Also missing",
      impact: "Pages with meta descriptions get 5.8% more clicks on average. Google may also generate a poor description automatically.",
    });
  }

  // Not indexed at all
  if (!a.googlePosition && b.googlePosition) {
    suggestions.push({
      category: "critical",
      priority: 10,
      message: `Your page is NOT in Google's top 100 results. Competitor ranks #${b.googlePosition}.`,
      action: `1. Check if indexed: Search "site:${new URL(a.url).hostname}" on Google\n2. If not indexed: Submit your URL in Google Search Console → URL Inspection → Request Indexing\n3. Check robots.txt isn't blocking the page\n4. Make sure the page has a sitemap entry`,
      yourValue: "Not found in top 100",
      competitorValue: `Ranking #${b.googlePosition}`,
      impact: "If your page isn't indexed, nothing else matters. Fix this first before any other changes.",
    });
  }

  // ═══════════════════════════════════════════════════════
  // CRITICAL — Keyword placement (biggest ranking factors)
  // ═══════════════════════════════════════════════════════

  if (!a.keywordInTitle && b.keywordInTitle) {
    suggestions.push({
      category: "critical",
      priority: 9,
      message: "Keyword is MISSING from your title tag. Competitor HAS it in theirs.",
      action: `Rewrite your title to include the keyword at the beginning:\nYour title: "${a.title}"\nCompetitor: "${b.title}"\n\nRewrite to something like: "[keyword] - [your unique angle] | [brand]"`,
      yourValue: `"${a.title}" (no keyword)`,
      competitorValue: `"${b.title}" (has keyword)`,
      impact: "Title tag keyword placement is one of the strongest ranking signals. Pages with keyword in title rank 2-3x better.",
    });
  }

  if (!a.keywordInH1 && b.keywordInH1) {
    suggestions.push({
      category: "critical",
      priority: 8,
      message: "Keyword is MISSING from your H1 heading. Competitor HAS it in theirs.",
      action: `Rewrite your H1 to include the keyword:\nYour H1: "${a.h1}"\nCompetitor H1: "${b.h1}"\n\nMake your H1 include the keyword naturally while being descriptive.`,
      yourValue: `"${a.h1}" (no keyword)`,
      competitorValue: `"${b.h1}" (has keyword)`,
      impact: "H1 keyword presence is a top-5 on-page ranking factor. Google directly uses it to understand page relevance.",
    });
  }

  if (!a.keywordInMeta && b.keywordInMeta && a.metaDescription) {
    suggestions.push({
      category: "critical",
      priority: 8,
      message: "Keyword is MISSING from your meta description. Competitor HAS it.",
      action: `Rewrite your meta description to include the keyword:\nYours: "${a.metaDescription.slice(0, 100)}..."\nCompetitor: "${b.metaDescription.slice(0, 100)}..."\n\nGoogle bolds matching keywords in search results — this directly increases click-through rate.`,
      yourValue: `"${a.metaDescription.slice(0, 60)}..." (no keyword)`,
      competitorValue: `"${b.metaDescription.slice(0, 60)}..." (has keyword)`,
      impact: "Keyword in meta description increases CTR by up to 15%. Google bolds matching keywords, making your result stand out.",
    });
  }

  // ═══════════════════════════════════════════════════════
  // WARNING — Content gaps (these close the ranking gap)
  // ═══════════════════════════════════════════════════════

  // Ranking gap context
  if (a.googlePosition && b.googlePosition && a.googlePosition > b.googlePosition) {
    const gap = a.googlePosition - b.googlePosition;
    suggestions.push({
      category: "warning",
      priority: 7,
      message: `You rank ${gap} positions BELOW your competitor. Fix the items below to close this gap.`,
      action: `Focus on the highest-priority items first. Each fix below is ordered by how much it affects rankings.\nThe biggest gains usually come from: content depth, keyword placement, and schema markup.`,
      yourValue: `#${a.googlePosition}`,
      competitorValue: `#${b.googlePosition}`,
      impact: `Closing a ${gap}-position gap is achievable. Moving from page 2 to page 1 can increase traffic 10x.`,
    });
  }

  // Word count gap
  if (a.wordCount < targetWords * 0.8) {
    const wordsNeeded = Math.round(targetWords - a.wordCount);
    const sectionsNeeded = Math.ceil(wordsNeeded / 300);
    suggestions.push({
      category: "warning",
      priority: 7,
      message: `Your content is ${wordsNeeded} words shorter than needed to compete.`,
      action: `Add ${wordsNeeded}+ more words (about ${sectionsNeeded} new sections of 300 words each).\n\nWhat to add:\n• Answer common questions people ask about this topic\n• Add a FAQ section (3-5 questions)\n• Include examples, case studies, or data\n• Cover subtopics your competitor covers\n• Add a comparison table or step-by-step guide\n\nTarget: ${targetWords}+ words total.`,
      yourValue: `${a.wordCount} words`,
      competitorValue: `${b.wordCount} words${top10 ? ` (top 10 avg: ${top10.avgWordCount})` : ""}`,
      impact: "Content depth is a top-3 ranking factor. Longer, comprehensive content ranks significantly higher for competitive keywords.",
    });
  }

  // Title length optimization
  if (a.title) {
    if (a.titleLength < 30) {
      suggestions.push({
        category: "warning",
        priority: 6,
        message: `Your title is too short (${a.titleLength} chars). You're wasting valuable ranking space.`,
        action: `Expand your title to 50-60 characters. Add descriptive keywords.\nCurrent: "${a.title}" (${a.titleLength} chars)\nCompetitor: "${b.title}" (${b.titleLength} chars)\n\nAdd power words, location, year, or benefits to fill the space.`,
        yourValue: `${a.titleLength} chars (too short)`,
        competitorValue: `${b.titleLength} chars`,
        impact: "Titles under 30 chars waste 50% of available search result space. Longer titles can include more ranking keywords.",
      });
    } else if (a.titleLength > 65) {
      suggestions.push({
        category: "warning",
        priority: 6,
        message: `Your title is too long (${a.titleLength} chars). Google will cut it off at ~60 chars.`,
        action: `Shorten to 50-60 characters. Put keyword at the start.\nCurrent: "${a.title}" (${a.titleLength} chars)\nGoogle shows: "${a.title.slice(0, 58)}..."\n\nMove the most important keyword to the first 30 characters.`,
        yourValue: `${a.titleLength} chars (truncated in search)`,
        competitorValue: `${b.titleLength} chars`,
        impact: "Truncated titles look unprofessional in search results and may lose important keywords that were cut off.",
      });
    }
  }

  // Meta description length
  if (a.metaDescription) {
    if (a.metaDescriptionLength < 70) {
      suggestions.push({
        category: "warning",
        priority: 5,
        message: `Meta description too short (${a.metaDescriptionLength} chars). You're losing click-through potential.`,
        action: `Expand to 150-160 characters. Include:\n• Your keyword (for bold matching)\n• A clear benefit or value proposition\n• A call to action ("Learn more", "Compare prices", "Free guide")\n\nCurrent: "${a.metaDescription}"`,
        yourValue: `${a.metaDescriptionLength} chars`,
        competitorValue: `${b.metaDescriptionLength} chars`,
        impact: "Short descriptions leave empty space in search results. Filling the snippet gives you more visibility.",
      });
    } else if (a.metaDescriptionLength > 160) {
      suggestions.push({
        category: "warning",
        priority: 5,
        message: `Meta description too long (${a.metaDescriptionLength} chars). Google will truncate it.`,
        action: `Trim to 150-160 characters. Put the most compelling part first.\nCurrent first 155 chars: "${a.metaDescription.slice(0, 155)}..."`,
        yourValue: `${a.metaDescriptionLength} chars (cut off)`,
        competitorValue: `${b.metaDescriptionLength} chars`,
        impact: "Truncated descriptions look incomplete. Keep key selling points within the first 155 characters.",
      });
    }
  }

  // Multiple H1 tags
  if (a.headingCounts.h1 > 1) {
    suggestions.push({
      category: "warning",
      priority: 6,
      message: `You have ${a.headingCounts.h1} H1 tags. Google expects exactly ONE.`,
      action: `Keep the most relevant H1 (the one with your keyword) and change all others to H2.\nYour page has ${a.headingCounts.h1} H1s — find and fix in your HTML.`,
      yourValue: `${a.headingCounts.h1} H1 tags (confusing)`,
      competitorValue: `${b.headingCounts.h1} H1 tag`,
      impact: "Multiple H1s dilute your page's topic signal. Google can't determine which heading represents your main topic.",
    });
  }

  // H2 heading structure gap
  if (b.headingCounts.h2 > a.headingCounts.h2 + 2) {
    const needed = b.headingCounts.h2 - a.headingCounts.h2;
    suggestions.push({
      category: "warning",
      priority: 5,
      message: `Competitor uses ${b.headingCounts.h2} subheadings (H2). You only have ${a.headingCounts.h2}.`,
      action: `Add ${needed}+ more H2 subheadings to structure your content better.\n\nGood H2s for this topic:\n• "What is [keyword]?"\n• "Benefits of [keyword]"\n• "How to [keyword] — Step by Step"\n• "[keyword] vs Alternatives"\n• "Frequently Asked Questions"\n\nEach H2 should introduce a new section with 150-300 words.`,
      yourValue: `${a.headingCounts.h2} H2 subheadings`,
      competitorValue: `${b.headingCounts.h2} H2 subheadings`,
      impact: "Well-structured content with H2s ranks better AND can win featured snippets. Each H2 is a chance to rank for related queries.",
    });
  }

  // Schema markup gap
  if (!a.hasSchema && b.hasSchema) {
    const types = b.schemaTypes.length > 0 ? b.schemaTypes.join(", ") : "structured data";
    suggestions.push({
      category: "warning",
      priority: 6,
      message: `Competitor uses schema markup (${types}). You have NONE.`,
      action: `Add schema markup to get rich snippets in Google (stars, prices, FAQs, etc.).\n\nCompetitor uses: ${types}\n\nEasiest to add:\n1. FAQ Schema — add 3-5 Q&As, appears as expandable questions in Google\n2. Article/Product Schema — shows author, date, price in results\n3. Use Google's Structured Data Markup Helper: https://www.google.com/webmasters/markup-helper/\n\nOr add JSON-LD in your <head> section.`,
      yourValue: "No schema markup",
      competitorValue: `Uses: ${types}`,
      impact: "Schema markup can increase CTR by 30%. Rich snippets take up more space in search results and attract more clicks.",
    });
  } else if (top10 && !a.hasSchema && top10.pagesWithSchema >= 3) {
    suggestions.push({
      category: "warning",
      priority: 6,
      message: `${top10.pagesWithSchema} of the top 5 results use schema markup. You don't.`,
      action: `Add schema markup to compete with the top results.\n\nStart with FAQ Schema — it's the easiest and most impactful:\n1. Add 3-5 common questions about your topic\n2. Wrap them in FAQPage schema\n3. Google may show them as expandable results\n\nUse: https://technicalseo.com/tools/schema-markup-generator/`,
      yourValue: "No schema",
      competitorValue: `${top10.pagesWithSchema}/5 top pages use schema`,
      impact: "You're at a disadvantage without schema. Top-ranking pages overwhelmingly use structured data.",
    });
  }

  // Image alt text gap
  if (a.totalImages > 0 && a.imagesWithAlt < a.totalImages) {
    const missing = a.totalImages - a.imagesWithAlt;
    suggestions.push({
      category: "warning",
      priority: 4,
      message: `${missing} of ${a.totalImages} images are missing alt text.`,
      action: `Add descriptive alt text to every image:\n<img src="..." alt="descriptive text including keyword where natural">\n\nGood: alt="best running shoes for flat feet 2024"\nBad: alt="image1" or alt=""\n\nInclude your keyword in 1-2 image alts naturally. Describe what's in the image.`,
      yourValue: `${a.imagesWithAlt}/${a.totalImages} have alt text`,
      competitorValue: `${b.imagesWithAlt}/${b.totalImages} have alt text`,
      impact: "Image alt text helps Google Image search rankings and is an accessibility requirement. It's also an easy place to add keywords.",
    });
  }

  // Internal links gap
  if (b.internalLinks > a.internalLinks + 3) {
    const needed = b.internalLinks - a.internalLinks;
    suggestions.push({
      category: "warning",
      priority: 5,
      message: `Competitor has ${needed} more internal links than you.`,
      action: `Add ${needed}+ internal links to related pages on your site.\n\nWhere to add them:\n• Link to related blog posts or guides\n• Add a "Related Articles" section at the bottom\n• Link keywords in your text to relevant pages\n• Add breadcrumb navigation if missing\n\nInternal links pass authority and help Google discover all your pages.`,
      yourValue: `${a.internalLinks} internal links`,
      competitorValue: `${b.internalLinks} internal links`,
      impact: "Internal links distribute ranking authority across your site. More internal links = stronger page authority.",
    });
  }

  // External links gap
  if (b.externalLinks > 0 && a.externalLinks === 0) {
    suggestions.push({
      category: "info",
      priority: 3,
      message: "You have NO outbound links. Competitor links to external sources.",
      action: `Add 2-5 outbound links to authoritative sources (studies, statistics, official sites).\n\nWhy: Google sees pages that link to quality sources as more trustworthy.\nDon't link to competitors — link to data sources, research, tools.`,
      yourValue: "0 external links",
      competitorValue: `${b.externalLinks} external links`,
      impact: "Outbound links to authoritative sources signal trust to Google. Pages with quality outbound links rank slightly better.",
    });
  }

  // Keyword in URL
  if (!a.keywordInUrl && b.keywordInUrl) {
    suggestions.push({
      category: "info",
      priority: 3,
      message: "Competitor has the keyword in their URL. You don't.",
      action: `If possible, change your URL to include the keyword:\nYour URL: ${a.url}\nCompetitor: ${b.url}\n\nIdeal format: yourdomain.com/keyword-phrase\n\n⚠️ WARNING: Only change URL if the page is new. For established pages, set up a 301 redirect from old URL to new URL to preserve rankings.`,
      yourValue: a.url,
      competitorValue: b.url,
      impact: "Keyword in URL is a minor ranking factor (~1-2% impact). Only worth changing for new pages.",
    });
  }

  // Keyword density comparison
  if (a.keywordDensity < 0.5 && b.keywordDensity >= 0.5) {
    suggestions.push({
      category: "warning",
      priority: 5,
      message: `Your keyword density is very low (${a.keywordDensity.toFixed(1)}%) compared to competitor (${b.keywordDensity.toFixed(1)}%).`,
      action: `Naturally increase keyword usage in your content:\n• Use the exact keyword 3-5 more times in your body text\n• Use keyword variations and synonyms throughout\n• Include keyword in at least one H2 subheading\n• Don't force it — write naturally\n\nTarget: ${b.keywordDensity.toFixed(1)}% density (about ${Math.ceil(b.keywordDensity * b.wordCount / 100)} mentions in ${b.wordCount} words).`,
      yourValue: `${a.keywordDensity.toFixed(2)}% (${Math.round(a.keywordDensity * a.wordCount / 100)} mentions)`,
      competitorValue: `${b.keywordDensity.toFixed(2)}% (${Math.round(b.keywordDensity * b.wordCount / 100)} mentions)`,
      impact: "Low keyword density means Google may not see your page as relevant for this query. Match or slightly exceed competitor density.",
    });
  } else if (a.keywordDensity > 3 && b.keywordDensity < 3) {
    suggestions.push({
      category: "warning",
      priority: 6,
      message: `Your keyword density is too high (${a.keywordDensity.toFixed(1)}%). This looks like keyword stuffing.`,
      action: `Reduce keyword repetition. Replace some instances with:\n• Synonyms and related terms\n• Pronouns ("it", "this", "these")\n• Natural language variations\n\nTarget: 0.5-2.5% density. You're at ${a.keywordDensity.toFixed(1)}%.`,
      yourValue: `${a.keywordDensity.toFixed(2)}% (over-optimized)`,
      competitorValue: `${b.keywordDensity.toFixed(2)}% (natural)`,
      impact: "Keyword stuffing can trigger Google penalties and actually LOWER your rankings. Reduce to a natural level.",
    });
  }

  // Score comparison — if competitor is significantly ahead
  if (b.score > a.score + 15) {
    suggestions.push({
      category: "info",
      priority: 2,
      message: `Your SEO score is ${a.score}/100. Competitor scores ${b.score}/100. Gap: ${b.score - a.score} points.`,
      action: `Focus on the critical and warning items above in order. Each fix will improve your score.\nTarget: Match or exceed ${b.score}/100 by fixing the top issues listed above.`,
      yourValue: `${a.score}/100`,
      competitorValue: `${b.score}/100`,
      impact: `Closing a ${b.score - a.score}-point SEO gap will significantly improve your ranking chances.`,
    });
  }

  // Sort by priority (highest first)
  suggestions.sort((x, y) => y.priority - x.priority);

  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { keyword, urls, geo, device } = parsed.data;

    // Fetch both pages AND Google SERP data in parallel
    const [[htmlA, htmlB], serpResult] = await Promise.all([
      Promise.all(urls.map((u) => fetchHtml(u))),
      getSerpProvider().search({ keyword, geo, device, numResults: 100 }),
    ]);

    // Find positions for both URLs
    const domains = urls.map((url) => extractDomain(url));
    const findPosition = (domain: string) => {
      const match = serpResult.results.find((r) => domainMatch(r.url, domain));
      return match ? match.position : null;
    };

    const positionA = findPosition(domains[0]);
    const positionB = findPosition(domains[1]);

    // Build audits with ranking data
    const auditA = buildAudit(htmlA, urls[0], keyword, positionA);
    const auditB = buildAudit(htmlB, urls[1], keyword, positionB);

    // Analyze top 10 results for patterns
    const top10Results = serpResult.results.slice(0, 10);
    const top10Analysis = await analyzeTop10(top10Results);

    // Compare keyword usage between your page and competitor
    const keywordComparison = buildKeywordComparison(auditA, auditB);

    const response: AuditCompareResponse = {
      keyword,
      audits: [auditA, auditB],
      suggestionsForFirst: generateSuggestions(auditA, auditB, top10Analysis),
      suggestionsForSecond: generateSuggestions(auditB, auditA, top10Analysis),
      rankingComparison: {
        yourPosition: positionA,
        competitorPosition: positionB,
        positionGap: (positionB ?? 100) - (positionA ?? 100),
        totalResults: serpResult.totalResults,
      },
      top10Analysis,
      keywordComparison,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Audit compare error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
