import { NextRequest, NextResponse } from "next/server";
import { getSerpProvider } from "@/lib/serp/provider";
import { extractDomain, domainMatch, normalizeUrl } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { SerpCheckResponse } from "@/types/serp";
import { z } from "zod";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const requestSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  targetUrl: z.string().min(1, "Target URL or domain is required"),
  geo: z.string().optional().default("us"),
  device: z.enum(["desktop", "mobile"]).optional().default("desktop"),
  numResults: z.number().optional().default(200),
  saveSnapshot: z.boolean().optional().default(false),
  projectId: z.string().optional(),
  keywordId: z.string().optional(),
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

    const {
      keyword,
      targetUrl,
      geo,
      device,
      numResults,
      saveSnapshot,
      projectId,
      keywordId,
    } = parsed.data;
    const targetDomain = extractDomain(targetUrl);
    const normalizedTargetUrl = normalizeUrl(targetUrl);

    const provider = getSerpProvider();
    const providerResult = await provider.search({
      keyword,
      geo,
      device,
      numResults,
    });

    let targetPosition: number | null = null;

    const results = providerResult.results.map((result) => {
      const isMatch = domainMatch(result.url, targetDomain);
      if (isMatch && targetPosition === null) {
        targetPosition = result.position;
      }
      return { ...result, isTargetMatch: isMatch };
    });

    let snapshotId: string | undefined;

    if (saveSnapshot) {
      if (!projectId && !keywordId) {
        return NextResponse.json(
          { error: "projectId or keywordId is required when saveSnapshot=true" },
          { status: 400 }
        );
      }

      let resolvedKeywordId = keywordId;
      let resolvedProjectId = projectId;

      if (resolvedKeywordId) {
        const existingKeyword = await prisma.keyword.findUnique({
          where: { id: resolvedKeywordId },
        });

        if (!existingKeyword) {
          return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
        }

        resolvedProjectId = existingKeyword.projectId;
      } else if (resolvedProjectId) {
        const upsertedKeyword = await prisma.keyword.upsert({
          where: {
            projectId_keyword_targetUrl_geo_device: {
              projectId: resolvedProjectId,
              keyword,
              targetUrl: normalizedTargetUrl,
              geo,
              device,
            },
          },
          create: {
            projectId: resolvedProjectId,
            keyword,
            targetUrl: normalizedTargetUrl,
            geo,
            device,
          },
          update: {
            isActive: true,
          },
        });

        resolvedKeywordId = upsertedKeyword.id;
      }

      if (resolvedProjectId && resolvedKeywordId) {
        const snapshot = await prisma.rankSnapshot.create({
          data: {
            projectId: resolvedProjectId,
            keywordId: resolvedKeywordId,
            checkedAt: new Date(),
            targetPosition,
            totalResults: providerResult.totalResults,
            serpFeatures: providerResult.serpFeatures,
            results,
            provider: provider.name,
          },
        });

        snapshotId = snapshot.id;
      }
    }

    const response: SerpCheckResponse = {
      keyword,
      targetUrl,
      targetDomain,
      geo: geo!,
      device: device!,
      totalResults: providerResult.totalResults,
      targetPosition,
      results,
      serpFeatures: providerResult.serpFeatures,
      checkedAt: new Date().toISOString(),
      snapshotId,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("SERP check error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
