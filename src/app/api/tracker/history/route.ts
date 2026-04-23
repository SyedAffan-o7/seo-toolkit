import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TrackerHistoryResponse, PositionChange } from "@/types/tracker";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const keywordId = searchParams.get("keywordId");

  if (!projectId || !keywordId) {
    return NextResponse.json(
      { error: "projectId and keywordId are required" },
      { status: 400 }
    );
  }

  try {
    const keyword = await prisma.keyword.findFirst({
      where: {
        id: keywordId,
        projectId,
      },
    });

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword not found for selected project" },
        { status: 404 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all competitors for this project
    const competitors = await prisma.competitor.findMany({
      where: { projectId },
      select: {
        id: true,
        domain: true,
        label: true,
      },
    });

    // Get history with competitor data and SERP features
    const history = await prisma.rankSnapshot.findMany({
      where: {
        projectId,
        keywordId,
      },
      orderBy: { checkedAt: "asc" },
      select: {
        id: true,
        checkedAt: true,
        targetPosition: true,
        totalResults: true,
        provider: true,
        serpFeatures: true,
        competitors: {
          select: {
            competitorId: true,
            position: true,
            found: true,
            competitor: {
              select: {
                domain: true,
                label: true,
              },
            },
          },
        },
      },
    });

    // Calculate position change from last two snapshots
    let latestChange: PositionChange | undefined;
    if (history.length >= 2) {
      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      
      if (latest.targetPosition !== null && previous.targetPosition !== null) {
        const change = previous.targetPosition - latest.targetPosition;
        latestChange = {
          type: change > 0 ? "gain" : change < 0 ? "loss" : "stable",
          from: previous.targetPosition,
          to: latest.targetPosition,
          change,
          isSignificant: Math.abs(change) >= 5,
        };
      } else if (latest.targetPosition !== null && previous.targetPosition === null) {
        latestChange = {
          type: "new",
          from: null,
          to: latest.targetPosition,
          change: 0,
          isSignificant: true,
        };
      }
    }

    const response: TrackerHistoryResponse = {
      project: {
        id: project.id,
        name: project.name,
        domain: project.domain ?? "",
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      },
      keyword: {
        id: keyword.id,
        projectId: keyword.projectId,
        keyword: keyword.keyword,
        targetUrl: keyword.targetUrl,
        geo: keyword.geo,
        device: keyword.device,
        isActive: keyword.isActive,
        createdAt: keyword.createdAt.toISOString(),
      },
      history: history.map((point) => ({
        snapshotId: point.id,
        checkedAt: point.checkedAt.toISOString(),
        targetPosition: point.targetPosition,
        totalResults: point.totalResults,
        provider: point.provider,
        serpFeatures: (point.serpFeatures as unknown as TrackerHistoryResponse["history"][number]["serpFeatures"]) ?? undefined,
        competitors: point.competitors.map((comp) => ({
          competitorId: comp.competitorId,
          domain: comp.competitor.domain,
          label: comp.competitor.label,
          position: comp.position,
          found: comp.found,
        })),
      })),
      competitors: competitors.map((comp) => ({
        id: comp.id,
        projectId,
        domain: comp.domain,
        label: comp.label,
        createdAt: new Date().toISOString(),
      })),
      latestChange,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch tracker history") },
      { status: 500 }
    );
  }
}
