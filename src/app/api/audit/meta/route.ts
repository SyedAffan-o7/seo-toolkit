import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateAiMetaTags } from "@/lib/ai/analyze";

const requestSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  currentTitle: z.string().optional().default(""),
  currentMeta: z.string().optional().default(""),
  h1: z.string().optional().default(""),
  pageTopic: z.string().min(1, "Page topic is required"),
  competitorTitle: z.string().optional(),
  competitorMeta: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await generateAiMetaTags(parsed.data);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Meta generator error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
