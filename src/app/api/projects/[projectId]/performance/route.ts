import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { PerformanceMetrics } from "@/types/tracker";

type KeywordWithSnapshots = {
  id: string;
  keyword: string;
  rankSnapshots: Array<{
    id: string;
    targetPosition: number | null;
  }>;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    // Get all keywords for this project
    const keywords = await prisma.keyword.findMany({
      where: { projectId, isActive: true },
      include: {
        rankSnapshots: {
          orderBy: { checkedAt: "desc" },
          take: 2, // Get last 2 snapshots to calculate change
          select: {
            id: true,
            targetPosition: true,
          },
        },
      },
    });

    if (keywords.length === 0) {
      const emptyMetrics: PerformanceMetrics = {
        totalKeywords: 0,
        activeKeywords: 0,
        averagePosition: 0,
        keywordsInTop10: 0,
        keywordsInTop3: 0,
        positionGains: 0,
        positionLosses: 0,
        biggestWin: null,
        biggestLoss: null,
        visibilityScore: 0,
      };
      return NextResponse.json(emptyMetrics);
    }

    let totalPosition = 0;
    let keywordsWithPosition = 0;
    let keywordsInTop10 = 0;
    let keywordsInTop3 = 0;
    let positionGains = 0;
    let positionLosses = 0;
    let biggestWin: { keyword: string; change: number } | null = null;
    let biggestLoss: { keyword: string; change: number } | null = null;

    keywords.forEach((kw: KeywordWithSnapshots) => {
      const [latest, previous] = kw.rankSnapshots;

      if (latest?.targetPosition) {
        totalPosition += latest.targetPosition;
        keywordsWithPosition++;

        if (latest.targetPosition <= 10) keywordsInTop10++;
        if (latest.targetPosition <= 3) keywordsInTop3++;

        // Calculate change
        if (previous?.targetPosition) {
          const change = previous.targetPosition - latest.targetPosition;
          if (change > 0) {
            positionGains++;
            if (!biggestWin || change > biggestWin.change) {
              biggestWin = { keyword: kw.keyword, change };
            }
          } else if (change < 0) {
            positionLosses++;
            if (!biggestLoss || Math.abs(change) > Math.abs(biggestLoss.change)) {
              biggestLoss = { keyword: kw.keyword, change };
            }
          }
        }
      }
    });

    const averagePosition = keywordsWithPosition > 0 
      ? Math.round(totalPosition / keywordsWithPosition) 
      : 0;

    // Calculate visibility score (0-100)
    // Based on: % in top 10, % in top 3, average position
    const top10Percent = keywords.length > 0 ? (keywordsInTop10 / keywords.length) * 100 : 0;
    const top3Percent = keywords.length > 0 ? (keywordsInTop3 / keywords.length) * 100 : 0;
    const positionScore = averagePosition > 0 ? Math.max(0, 100 - averagePosition * 2) : 0;
    const visibilityScore = Math.round((top10Percent * 0.4) + (top3Percent * 0.4) + (positionScore * 0.2));

    const metrics: PerformanceMetrics = {
      totalKeywords: keywords.length,
      activeKeywords: keywords.length,
      averagePosition,
      keywordsInTop10,
      keywordsInTop3,
      positionGains,
      positionLosses,
      biggestWin,
      biggestLoss,
      visibilityScore: Math.min(100, visibilityScore),
    };

    return NextResponse.json(metrics);
  } catch (error: unknown) {
    console.error("Failed to fetch performance metrics", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
