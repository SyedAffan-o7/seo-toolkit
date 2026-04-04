import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createCompetitorSchema = z.object({
  domain: z.string().min(1),
  label: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    const competitors = await prisma.competitor.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ competitors });
  } catch (error: unknown) {
    console.error("Failed to fetch competitors", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await req.json();
    const parsed = createCompetitorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 }
      );
    }

    const { domain, label } = parsed.data;

    const competitor = await prisma.competitor.create({
      data: {
        projectId,
        domain,
        label: label || null,
      },
    });

    return NextResponse.json({ competitor });
  } catch (error: unknown) {
    console.error("Failed to create competitor", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create competitor" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const competitorId = searchParams.get("competitorId");

    if (!competitorId) {
      return NextResponse.json(
        { error: "competitorId is required" },
        { status: 400 }
      );
    }

    await prisma.competitor.delete({
      where: { id: competitorId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete competitor", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
