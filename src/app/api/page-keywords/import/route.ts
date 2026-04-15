import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const importRowSchema = z.object({
  pageUrl: z.string().url(),
  keyword: z.string().min(1),
  geo: z.string().default("us"),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// POST /api/page-keywords/import - Import CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "File and projectId required" },
        { status: 400 }
      );
    }

    // Read CSV content
    const content = await file.text();
    const lines = content.trim().split("\n");
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    // Parse headers
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const pageUrlIndex = headers.findIndex((h) => h.includes("page") || h.includes("url"));
    const keywordIndex = headers.findIndex((h) => h.includes("keyword"));
    const geoIndex = headers.findIndex((h) => h.includes("location") || h.includes("geo"));
    const deviceIndex = headers.findIndex((h) => h.includes("device"));
    const activeIndex = headers.findIndex((h) => h.includes("active"));
    const notesIndex = headers.findIndex((h) => h.includes("note"));

    if (pageUrlIndex === -1 || keywordIndex === -1) {
      return NextResponse.json(
        { error: "CSV must have Page URL and Keyword columns" },
        { status: 400 }
      );
    }

    // Parse and validate rows
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        // Simple CSV parsing (handles basic cases, not perfect for all edge cases)
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const rowData = {
          pageUrl: values[pageUrlIndex] || "",
          keyword: values[keywordIndex] || "",
          geo: geoIndex >= 0 ? values[geoIndex] || "us" : "us",
          device: deviceIndex >= 0 && values[deviceIndex]?.toLowerCase() === "mobile" ? "mobile" : "desktop",
          isActive: activeIndex >= 0 ? values[activeIndex]?.toLowerCase() !== "no" : true,
          notes: notesIndex >= 0 ? values[notesIndex] || "" : "",
        };

        const parsed = importRowSchema.safeParse(rowData);
        if (!parsed.success) {
          results.errors.push(`Row ${i}: ${parsed.error.errors[0].message}`);
          continue;
        }

        // Check if already exists
        const existing = await prisma.pageKeyword.findUnique({
          where: {
            projectId_pageUrl_keyword_geo_device: {
              projectId,
              pageUrl: parsed.data.pageUrl,
              keyword: parsed.data.keyword,
              geo: parsed.data.geo,
              device: parsed.data.device,
            },
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await prisma.pageKeyword.create({
          data: {
            projectId,
            ...parsed.data,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Row ${i}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error importing page keywords:", error);
    return NextResponse.json(
      { error: "Failed to import page keywords" },
      { status: 500 }
    );
  }
}
