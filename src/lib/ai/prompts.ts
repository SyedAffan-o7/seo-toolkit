export function buildAuditPrompt(opts: {
  keyword: string;
  yourUrl: string;
  competitorUrl: string;
  yourAudit: Record<string, unknown>;
  competitorAudit: Record<string, unknown>;
  keywordComparison: Record<string, unknown>;
  top10Analysis: Record<string, unknown> | null;
  yourPosition: number | null;
  competitorPosition: number | null;
}): string {
  return `You are an elite SEO strategist with 15+ years of experience. Analyze the following competitive on-page SEO audit data and generate personalized, actionable suggestions.

TARGET KEYWORD: "${opts.keyword}"

YOUR PAGE: ${opts.yourUrl}
YOUR GOOGLE POSITION: ${opts.yourPosition ?? "Not in top 100"}

COMPETITOR PAGE: ${opts.competitorUrl}
COMPETITOR GOOGLE POSITION: ${opts.competitorPosition ?? "Not in top 100"}

--- YOUR PAGE DATA ---
${JSON.stringify(opts.yourAudit, null, 2)}

--- COMPETITOR PAGE DATA ---
${JSON.stringify(opts.competitorAudit, null, 2)}

--- KEYWORD COMPARISON ---
${JSON.stringify(opts.keywordComparison, null, 2)}

--- TOP 10 RESULTS ANALYSIS ---
${opts.top10Analysis ? JSON.stringify(opts.top10Analysis, null, 2) : "N/A"}

--- INSTRUCTIONS ---
Generate 6-12 highly specific, actionable SEO suggestions for the user's page. Each suggestion must be contextual and reference actual values from the data above.

For each suggestion, provide:
1. category: "critical" (blocking issue), "warning" (hurting rankings), or "info" (improvement opportunity)
2. priority: integer 1-10 (10 = fix immediately, 1 = nice to have)
3. message: A single compelling sentence describing the issue/opportunity. Be specific (e.g., "Your title is 24 characters — 30 characters shorter than competitor's 54-char title")
4. action: 2-4 sentences with EXACT, implementable steps. Include code/examples where relevant. If rewriting a title or meta, provide the exact recommended text.
5. yourValue: The actual metric/status from the user's page (e.g., "24 chars", "Missing", "480 words", "Yes")
6. competitorValue: The competitor's corresponding metric (e.g., "54 chars", "Present", "1,200 words", "Yes")
7. impact: 1-2 sentences explaining WHY this matters for Google rankings and what the expected outcome is. Be specific about ranking impact where possible.

RULES:
- Never suggest anything the page already has correctly implemented
- If competitor is worse in an area, do NOT suggest it
- Focus on the biggest ranking-impact items first
- Compare directly against the competitor AND top 10 averages
- If word count is below top 10 average, suggest exactly how many words to add and what topics to cover
- If keyword is missing from title/H1/meta, provide exact rewritten text recommendations
- Suggest schema markup types based on the page context
- If the page ranks lower than competitor, explain the likely gap causes
- Do NOT mention "AI" or "algorithm" in your response
- Write like a senior SEO consultant speaking to a client

Return ONLY a JSON array of suggestion objects. No markdown, no code fences.`
}

export function buildContentGapPrompt(opts: {
  keyword: string;
  yourUrl: string;
  competitorUrl: string;
  yourHtml: string;
  competitorHtml: string;
  top10Titles: string[];
  top10Snippets: string[];
}): string {
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + "..." : s;

  return `You are a senior content strategist. Analyze the following pages and top-ranking results for the keyword "${opts.keyword}" to identify content gaps.

YOUR PAGE: ${opts.yourUrl}
COMPETITOR PAGE: ${opts.competitorUrl}

--- YOUR PAGE TEXT (first 3000 chars) ---
${truncate(opts.yourHtml, 3000)}

--- COMPETITOR PAGE TEXT (first 3000 chars) ---
${truncate(opts.competitorHtml, 3000)}

--- TOP 10 RANKING PAGE TITLES ---
${opts.top10Titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

--- TOP 10 RANKING PAGE SNIPPETS ---
${opts.top10Snippets.map((s, i) => `${i + 1}. ${truncate(s, 200)}`).join("\n")}

--- TASK ---
Identify the TOP 8 content gaps: specific topics, subtopics, questions, or content types that the top 10 results cover but the user's page is missing.

For each gap, provide:
1. topic: Specific topic name (e.g., "Pricing comparison tables", "Step-by-step setup guide")
2. priority: "high" | "medium" | "low"
3. evidence: Quote or reference from top-ranking pages showing this topic is covered
4. recommendation: Exactly what content to add, how much (word count), and where on the page
5. searchIntent: What search intent this satisfies (informational, transactional, navigational)

Return ONLY a JSON array. No markdown.`
}

export function buildMetaGeneratorPrompt(opts: {
  keyword: string;
  currentTitle: string;
  currentMeta: string;
  h1: string;
  pageTopic: string;
  competitorTitle?: string;
  competitorMeta?: string;
}): string {
  return `You are an expert copywriter specializing in SEO meta tags that maximize click-through rates.

Keyword: "${opts.keyword}"
Page Topic: ${opts.pageTopic}
Current Title: ${opts.currentTitle || "(empty)"}
Current Meta Description: ${opts.currentMeta || "(empty)"}
H1 Heading: ${opts.h1 || "(empty)"}
${opts.competitorTitle ? `Competitor Title: ${opts.competitorTitle}` : ""}
${opts.competitorMeta ? `Competitor Meta: ${opts.competitorMeta}` : ""}

Generate 3 optimized title tag options (50-60 characters each) and 3 optimized meta description options (150-160 characters each).

RULES:
- Include the exact keyword naturally near the start
- Use power words that increase CTR (Best, Ultimate, Guide, Proven, Step-by-Step, etc.)
- Each option should have a different angle/emotion
- Title: 50-60 chars. Meta: 150-160 chars.
- Make them compelling enough to beat competitor listings

Return JSON with "titles" and "descriptions" arrays. Each item: { text, length, angle }`
}
