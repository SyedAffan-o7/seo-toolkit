import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSerpProvider } from "@/lib/serp/provider";
import { extractDomain, domainMatch, normalizeUrl } from "@/lib/utils";
import { z } from "zod";

const bulkCheckSchema = z.object({
  projectId: z.string(),
  pageKeywordIds: z.array(z.string()).optional(), // Check specific ones, or all active if empty
  checkAllActive: z.boolean().default(false),
  numResults: z.number().int().min(10).max(200).optional(),
  pageKeywordDepths: z.record(z.string(), z.number().int().min(10).max(200)).optional(),
});

// POST /api/page-keywords/check - Bulk check rankings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bulkCheckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { projectId, pageKeywordIds, checkAllActive, numResults, pageKeywordDepths } = parsed.data;

    // Build query
    const where: { projectId: string; id?: { in: string[] }; isActive?: boolean } = { projectId };
    if (pageKeywordIds && pageKeywordIds.length > 0) {
      where.id = { in: pageKeywordIds };
    } else if (checkAllActive) {
      where.isActive = true;
    } else {
      return NextResponse.json(
        { error: "Provide pageKeywordIds or set checkAllActive to true" },
        { status: 400 }
      );
    }

    // Fetch page-keyword mappings
    const mappings = await prisma.pageKeyword.findMany({
      where,
      include: {
        project: true,
      },
    });

    if (mappings.length === 0) {
      return NextResponse.json({ error: "No page-keyword mappings found" }, { status: 404 });
    }

    const provider = getSerpProvider();
    const results = [];
    const errors = [];

    // Check each mapping
    for (const mapping of mappings) {
      try {
        // Normalize the page URL
        const normalizedPageUrl = normalizeUrl(mapping.pageUrl);
        const pageDomain = extractDomain(normalizedPageUrl);
        
        console.log(`[PageKeyword Check] Checking: "${mapping.keyword}" for ${normalizedPageUrl} (domain: ${pageDomain})`);
        
        const depthFromPayload = pageKeywordDepths?.[mapping.id];
        const depthFromMapping = (mapping as any).checkDepth;
        const depth = depthFromPayload ?? depthFromMapping ?? numResults ?? 20;

        console.log(`[PageKeyword Check] Depth resolution: payload=${depthFromPayload}, mapping.checkDepth=${depthFromMapping}, numResults=${numResults}, final=${depth}`);

        const providerResult = await provider.search({
          keyword: mapping.keyword,
          geo: mapping.geo,
          device: mapping.device,
          numResults: depth,
        });

        console.log(`[PageKeyword Check] Got ${providerResult.results.length} results from SERP provider (requested ${depth})`);

        // Find position - first try domain match (most common use case)
        let pagePosition: number | null = null;
        let domainPosition: number | null = null;

        for (const result of providerResult.results) {
          if (domainMatch(result.url, pageDomain)) {
            // Found a domain match
            if (domainPosition === null) {
              domainPosition = result.position;
            }
            
            // Try to match the specific page path
            try {
              const resultPath = new URL(result.url).pathname.replace(/\/+$/, "");
              const pagePath = new URL(normalizedPageUrl).pathname.replace(/\/+$/, "");
              
              if (pagePath === "" || pagePath === "/" || 
                  resultPath === pagePath || 
                  resultPath.startsWith(pagePath) || 
                  pagePath.startsWith(resultPath)) {
                pagePosition = result.position;
                console.log(`[PageKeyword Check] Found exact match at position #${pagePosition}: ${result.url}`);
                break;
              }
            } catch {
              // If URL parsing fails, use domain match as position
              pagePosition = result.position;
              console.log(`[PageKeyword Check] Found domain match at position #${pagePosition}: ${result.url}`);
              break;
            }
          }
        }

        // If no exact page match, use domain position
        if (pagePosition === null && domainPosition !== null) {
          pagePosition = domainPosition;
          console.log(`[PageKeyword Check] Using domain-level match at position #${pagePosition}`);
        }

        // If not found on local domain, try google.com as fallback
        // Skip for Serper provider since it always searches google.com
        let globalDomainPosition: number | null = null;
        if (pagePosition === null && mapping.geo && provider.name !== "serper") {
          console.log(`[PageKeyword Check] Not found on local domain, trying google.com...`);
          const globalResult = await provider.search({
            keyword: mapping.keyword,
            geo: mapping.geo,
            device: mapping.device,
            numResults: depth,
            domainOverride: "google.com",
          });

          console.log(`[PageKeyword Check] Got ${globalResult.results.length} results from google.com`);

          for (const result of globalResult.results) {
            if (domainMatch(result.url, pageDomain)) {
              if (globalDomainPosition === null) {
                globalDomainPosition = result.position;
              }

              try {
                const resultPath = new URL(result.url).pathname.replace(/\/+$/, "");
                const pagePath = new URL(normalizedPageUrl).pathname.replace(/\/+$/, "");

                if (pagePath === "" || pagePath === "/" ||
                    resultPath === pagePath ||
                    resultPath.startsWith(pagePath) ||
                    pagePath.startsWith(resultPath)) {
                  pagePosition = result.position;
                  console.log(`[PageKeyword Check] Found exact match on google.com at position #${pagePosition}: ${result.url}`);
                  break;
                }
              } catch {
                pagePosition = result.position;
                console.log(`[PageKeyword Check] Found domain match on google.com at position #${pagePosition}: ${result.url}`);
                break;
              }
            }
          }

          if (pagePosition === null && globalDomainPosition !== null) {
            pagePosition = globalDomainPosition;
            console.log(`[PageKeyword Check] Using domain-level match on google.com at position #${pagePosition}`);
          }
        }

        if (pagePosition === null) {
          console.log(`[PageKeyword Check] Not found in top ${providerResult.results.length} results`);
          // Log first 5 results for debugging
          providerResult.results.slice(0, 5).forEach((r, i) => {
            console.log(`  Result #${i + 1}: ${r.url} (domain: ${extractDomain(r.url)})`);
          });
        }

        // Save position to database
        const positionRecord = await prisma.pageKeywordPosition.create({
          data: {
            pageKeywordId: mapping.id,
            position: pagePosition,
            totalResults: providerResult.totalResults,
            serpFeatures: providerResult.serpFeatures || [],
            topResults: JSON.parse(JSON.stringify(providerResult.results.slice(0, 10))),
          },
        });

        results.push({
          mappingId: mapping.id,
          pageUrl: mapping.pageUrl,
          keyword: mapping.keyword,
          position: pagePosition,
          domainPosition,
          totalResults: providerResult.totalResults,
          serpFeatures: providerResult.serpFeatures,
          checkedAt: positionRecord.checkedAt,
          success: true,
          debug: {
            targetDomain: pageDomain,
            normalizedPageUrl,
            depthUsed: depth,
            geo: mapping.geo,
            device: mapping.device,
            resultsReturned: providerResult.results.length,
            top5: providerResult.results.slice(0, 5).map(r => ({
              pos: r.position,
              url: r.url,
              domain: r.domain,
            })),
          },
        });
      } catch (error) {
        console.error(`Error checking ${mapping.pageUrl} for "${mapping.keyword}":`, error);
        errors.push({
          mappingId: mapping.id,
          pageUrl: mapping.pageUrl,
          keyword: mapping.keyword,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        });
      }
    }

    return NextResponse.json({
      checked: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("Bulk check error:", error);
    return NextResponse.json(
      { error: "Failed to run bulk check" },
      { status: 500 }
    );
  }
}
