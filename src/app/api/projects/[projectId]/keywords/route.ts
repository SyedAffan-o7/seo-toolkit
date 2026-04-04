import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/utils";
import { z } from "zod";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isPrismaKnownError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

const createKeywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  targetUrl: z.string().min(1, "Target URL is required"),
  geo: z.string().optional().default("us"),
  device: z.enum(["desktop", "mobile"]).optional().default("desktop"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keywords });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch keywords") },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const parsed = createKeywordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const keyword = await prisma.keyword.create({
      data: {
        projectId: params.projectId,
        keyword: parsed.data.keyword.trim(),
        targetUrl: normalizeUrl(parsed.data.targetUrl),
        geo: parsed.data.geo,
        device: parsed.data.device,
      },
    });

    return NextResponse.json({ keyword }, { status: 201 });
  } catch (error: unknown) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Keyword already tracked for this URL, geo, and device in the selected project",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create keyword") },
      { status: 500 }
    );
  }
}
