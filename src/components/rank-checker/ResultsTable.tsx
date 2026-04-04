"use client";

import { SerpCheckResponse } from "@/types/serp";
import PositionBadge from "./PositionBadge";
import SerpFeatureBadge from "./SerpFeatureBadge";
import { ExternalLink, Download, Trophy, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsTableProps {
  data: SerpCheckResponse;
}

export default function ResultsTable({ data }: ResultsTableProps) {
  const handleExportCSV = () => {
    const headers = ["Position", "URL", "Domain", "Title", "Snippet", "Match", "SERP Features"];
    const rows = data.results.map((r) => [
      r.position,
      r.url,
      r.domain,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.snippet.replace(/"/g, '""')}"`,
      r.isTargetMatch ? "Yes" : "No",
      r.serpFeatures.join(", "),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serp-${data.keyword.replace(/\s+/g, "-")}-${data.checkedAt.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Position Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500">Your Position</p>
              <div className="mt-2 flex items-center gap-2">
                {data.targetPosition !== null ? (
                  <>
                    <PositionBadge position={data.targetPosition} size="lg" />
                    <span className="text-lg font-semibold text-gray-900">
                      Position #{data.targetPosition}
                    </span>
                    <span className="text-sm text-gray-500">
                      of {data.results.length} checked
                    </span>
                  </>
                ) : (
                  <>
                    <PositionBadge position={null} size="lg" />
                    <span className="text-sm text-red-600 font-medium">
                      Not found in top {data.results.length}
                    </span>
                  </>
                )}
              </div>
            </div>
            {data.targetPosition !== null && data.targetPosition <= 3 ? (
              <Trophy className="h-8 w-8 text-amber-400" />
            ) : data.targetPosition === null ? (
              <AlertTriangle className="h-8 w-8 text-red-300" />
            ) : null}
          </div>
        </div>

        {/* Domain Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Target Domain</p>
          <p className="mt-2 text-lg font-semibold text-gray-900 truncate">
            {data.targetDomain}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {data.device} &middot; {data.geo.toUpperCase()}
          </p>
        </div>

        {/* Total Results Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Results</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {data.totalResults.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Checked {new Date(data.checkedAt).toLocaleString()}
          </p>
        </div>

        {/* SERP Features Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">SERP Features</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.serpFeatures.length > 0 ? (
              data.serpFeatures.map((f) => (
                <SerpFeatureBadge key={f} feature={f} />
              ))
            ) : (
              <span className="text-sm text-gray-400">None detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              SERP Results for &ldquo;{data.keyword}&rdquo;
            </h3>
            <p className="text-sm text-gray-500">
              Top {data.results.length} organic results checked
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Page
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Features
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.results.map((result) => (
                <tr
                  key={result.position}
                  className={cn(
                    "transition-colors hover:bg-gray-50",
                    result.isTargetMatch && "bg-brand-50/50 hover:bg-brand-50"
                  )}
                >
                  <td className="px-5 py-4 w-16">
                    <PositionBadge position={result.position} size="sm" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "text-sm font-medium hover:underline",
                            result.isTargetMatch
                              ? "text-brand-700"
                              : "text-blue-700"
                          )}
                        >
                          {result.title}
                        </a>
                        <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                        {result.isTargetMatch && (
                          <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                            YOUR SITE
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-emerald-700 truncate">
                        {result.url}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {result.snippet}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {result.serpFeatures.map((f) => (
                        <SerpFeatureBadge key={f} feature={f} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
