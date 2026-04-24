import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string(),
  pageUrl: z.string().min(1), // Accept any non-empty string, we'll normalize it
  keyword: z.string().min(1),
  geo: z.string().default("us"),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
  notes: z.string().optional(),
  checkDepth: z.number().int().min(20).max(100).default(100),
});

const updateSchema = z.object({
  id: z.string(),
  keyword: z.string().min(1).optional(),
  geo: z.string().optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /api/page-keywords?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const pageUrl = searchParams.get("pageUrl");
    const isActive = searchParams.get("isActive");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const where: { projectId: string; pageUrl?: string; isActive?: boolean } = { projectId };
    if (pageUrl) where.pageUrl = pageUrl;
    if (isActive !== null) where.isActive = isActive === "true";

    const pageKeywords = await prisma.pageKeyword.findMany({
      where,
      include: {
        positions: {
          orderBy: { checkedAt: "desc" },
          take: 30,
        },
        _count: {
          select: { positions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pageKeywords);
  } catch (error) {
    console.error("Error fetching page keywords:", error);
    return NextResponse.json(
      { error: "Failed to fetch page keywords" },
      { status: 500 }
    );
  }
}

// POST /api/page-keywords - Create new mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize the URL (add https:// if missing)
    const normalizedPageUrl = normalizeUrl(data.pageUrl);

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pageKeyword = await prisma.pageKeyword.create({
      data: {
        projectId: data.projectId,
        pageUrl: normalizedPageUrl,
        keyword: data.keyword,
        geo: data.geo,
        device: data.device,
        notes: data.notes,
        checkDepth: data.checkDepth,
      },
      include: {
        positions: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(pageKeyword, { status: 201 });
  } catch (error) {
    console.error("Error creating page keyword:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "This page-keyword combination already exists for this project" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create page keyword: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PATCH /api/page-keywords - Update mapping
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const pageKeyword = await prisma.pageKeyword.update({
      where: { id },
      data: updateData,
      include: {
        positions: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(pageKeyword);
  } catch (error) {
    console.error("Error updating page keyword:", error);
    return NextResponse.json(
      { error: "Failed to update page keyword" },
      { status: 500 }
    );
  }
}

// DELETE /api/page-keywords?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.pageKeyword.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page keyword:", error);
    return NextResponse.json(
      { error: "Failed to delete page keyword" },
      { status: 500 }
    );
  }
}
