import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Force dynamic rendering - uses request.url
export const dynamic = 'force-dynamic';

// GET /api/page-keywords/history?pageKeywordId=xxx&days=30
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKeywordId = searchParams.get("pageKeywordId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!pageKeywordId) {
      return NextResponse.json(
        { error: "pageKeywordId required" },
        { status: 400 }
      );
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const history = await prisma.pageKeywordPosition.findMany({
      where: {
        pageKeywordId,
        checkedAt: {
          gte: cutoff,
        },
      },
      orderBy: {
        checkedAt: "asc",
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching position history:", error);
    return NextResponse.json(
      { error: "Failed to fetch position history" },
      { status: 500 }
    );
  }
}
