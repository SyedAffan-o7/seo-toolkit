import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractDomain } from "@/lib/utils";
import { z } from "zod";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isPrismaKnownError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  domain: z.string().min(1, "Domain is required"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to fetch projects") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name.trim(),
        domain: extractDomain(parsed.data.domain),
        description: parsed.data.description?.trim() || null,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: unknown) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return NextResponse.json(
        { error: "Project with same name + domain already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create project") },
      { status: 500 }
    );
  }
}
