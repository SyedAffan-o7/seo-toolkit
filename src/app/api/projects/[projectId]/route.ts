import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    // Delete related data first (cascade delete)
    // Delete PageKeywordPosition records (related to PageKeyword)
    const pageKeywords = await prisma.pageKeyword.findMany({
      where: { projectId },
      select: { id: true },
    });
    const pageKeywordIds = pageKeywords.map(pk => pk.id);

    if (pageKeywordIds.length > 0) {
      await prisma.pageKeywordPosition.deleteMany({
        where: {
          pageKeywordId: { in: pageKeywordIds },
        },
      });
    }

    await prisma.pageKeyword.deleteMany({
      where: { projectId },
    });

    // Delete RankSnapshot records (related to Keywords)
    const keywords = await prisma.keyword.findMany({
      where: { projectId },
      select: { id: true },
    });
    const keywordIds = keywords.map(k => k.id);

    if (keywordIds.length > 0) {
      // Get snapshot IDs
      const snapshots = await prisma.rankSnapshot.findMany({
        where: { keywordId: { in: keywordIds } },
        select: { id: true },
      });
      const snapshotIds = snapshots.map(s => s.id);

      if (snapshotIds.length > 0) {
        await prisma.competitorRankSnapshot.deleteMany({
          where: { snapshotId: { in: snapshotIds } },
        });
      }

      await prisma.rankSnapshot.deleteMany({
        where: { keywordId: { in: keywordIds } },
      });
    }

    await prisma.keyword.deleteMany({
      where: { projectId },
    });

    await prisma.competitor.deleteMany({
      where: { projectId },
    });

    // Delete the project
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete project") },
      { status: 500 }
    );
  }
}
