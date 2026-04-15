import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/page-keywords/export?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 }
      );
    }

    const mappings = await prisma.pageKeyword.findMany({
      where: { projectId },
      include: {
        positions: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV Headers
    const headers = [
      "Page URL",
      "Keyword",
      "Location",
      "Device",
      "Active",
      "Current Position",
      "Last Checked",
      "Notes",
    ];

    // CSV Rows
    const rows = mappings.map((m) => [
      m.pageUrl,
      m.keyword,
      m.geo,
      m.device,
      m.isActive ? "Yes" : "No",
      m.positions[0]?.position?.toString() || "Not found",
      m.positions[0]?.checkedAt 
        ? new Date(m.positions[0].checkedAt).toISOString()
        : "Never",
      m.notes || "",
    ]);

    // Escape special characters
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="page-keywords-${projectId}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting page keywords:", error);
    return NextResponse.json(
      { error: "Failed to export page keywords" },
      { status: 500 }
    );
  }
}
