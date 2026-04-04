import { NextRequest, NextResponse } from "next/server";
import { getSerpProvider } from "@/lib/serp/provider";
import { extractDomain, domainMatch, normalizeUrl } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { SerpCompareResponse, UrlComparison } from "@/types/serp";
import { z } from "zod";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const requestSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  urls: z
    .array(z.string().min(1))
    .min(2, "At least 2 URLs are required")
    .max(10, "Maximum 10 URLs allowed"),
  geo: z.string().optional().default("us"),
  device: z.enum(["desktop", "mobile"]).optional().default("desktop"),
  saveSnapshot: z.boolean().optional().default(false),
  projectId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { keyword, urls, geo, device, saveSnapshot, projectId } = parsed.data;

    const provider = getSerpProvider();
    const providerResult = await provider.search({
      keyword,
      geo,
      device,
      numResults: 100,
    });

    const targetDomains = urls.map((url) => ({
      url,
      domain: extractDomain(url),
    }));

    const results = providerResult.results.map((result) => {
      const matchingTarget = targetDomains.find((t) =>
        domainMatch(result.url, t.domain)
      );
      return {
        ...result,
        isTargetMatch: !!matchingTarget,
      };
    });

    const comparisons: UrlComparison[] = targetDomains.map((target) => {
      const match = results.find((r) => domainMatch(r.url, target.domain));
      return {
        url: target.url,
        domain: target.domain,
        position: match ? match.position : null,
        found: !!match,
      };
    });

    let snapshotId: string | undefined;

    if (saveSnapshot) {
      if (!projectId) {
        return NextResponse.json(
          { error: "projectId is required when saveSnapshot=true" },
          { status: 400 }
        );
      }

      const targetUrl = normalizeUrl(urls[0]);
      const trackedKeyword = await prisma.keyword.upsert({
        where: {
          projectId_keyword_targetUrl_geo_device: {
            projectId,
            keyword,
            targetUrl,
            geo,
            device,
          },
        },
        create: {
          projectId,
          keyword,
          targetUrl,
          geo,
          device,
        },
        update: {
          isActive: true,
        },
      });

      const snapshot = await prisma.rankSnapshot.create({
        data: {
          projectId,
          keywordId: trackedKeyword.id,
          checkedAt: new Date(),
          targetPosition: comparisons[0]?.position ?? null,
          totalResults: providerResult.totalResults,
          serpFeatures: providerResult.serpFeatures,
          results,
          provider: provider.name,
        },
      });

      const competitorDomains = comparisons.slice(1);
      if (competitorDomains.length > 0) {
        for (const comp of competitorDomains) {
          const competitor = await prisma.competitor.upsert({
            where: {
              projectId_domain: {
                projectId,
                domain: comp.domain,
              },
            },
            create: {
              projectId,
              domain: comp.domain,
              label: comp.url,
            },
            update: {
              label: comp.url,
            },
          });

          await prisma.competitorRankSnapshot.upsert({
            where: {
              snapshotId_competitorId: {
                snapshotId: snapshot.id,
                competitorId: competitor.id,
              },
            },
            create: {
              snapshotId: snapshot.id,
              competitorId: competitor.id,
              position: comp.position,
              found: comp.found,
            },
            update: {
              position: comp.position,
              found: comp.found,
            },
          });
        }
      }

      snapshotId = snapshot.id;
    }

    const response: SerpCompareResponse = {
      keyword,
      geo: geo!,
      device: device!,
      results,
      comparisons,
      checkedAt: new Date().toISOString(),
      snapshotId,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("SERP compare error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
