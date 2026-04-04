"use client";

import { FormEvent, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import PositionBadge from "@/components/rank-checker/PositionBadge";
import SerpFeatureBadge from "@/components/rank-checker/SerpFeatureBadge";
import { SerpCompareResponse, UrlComparison } from "@/types/serp";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  GitCompareArrows,
  Search,
  Plus,
  Trash2,
  Globe,
  Monitor,
  Smartphone,
  Loader2,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const GEO_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "in", label: "India" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "jp", label: "Japan" },
  { value: "ae", label: "United Arab Emirates" },
];

export default function ComparePage() {
  const [keyword, setKeyword] = useState("");
  const [urls, setUrls] = useState(["", ""]);
  const [geo, setGeo] = useState("us");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SerpCompareResponse | null>(null);

  const addUrl = () => {
    if (urls.length < 10) setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 2) setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const updated = [...urls];
    updated[index] = value;
    setUrls(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validUrls = urls.filter((u) => u.trim());
    if (!keyword.trim() || validUrls.length < 2) {
      toast.error("Enter a keyword and at least 2 URLs");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/serp/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          urls: validUrls,
          geo,
          device,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.error === "string" ? err.error : "Comparison failed"
        );
      }

      const response: SerpCompareResponse = await res.json();
      setResult(response);
      toast.success("Comparison complete!");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Something went wrong"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;
    const headers = ["URL", "Domain", "Position", "Found"];
    const rows = result.comparisons.map((c: UrlComparison) => [
      c.url,
      c.domain,
      c.position ?? "Not Found",
      c.found ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare-${result.keyword.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <TopBar
        title="Compare URLs"
        subtitle="Compare multiple URLs for a keyword — find who ranks and who doesn't"
      />
      <div className="p-6 space-y-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
        >
          {/* Keyword */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Target Keyword
            </label>
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. best CRM software"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                required
              />
            </div>
          </div>

          {/* URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URLs / Domains to Compare
            </label>
            <div className="space-y-2">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {i + 1}
                  </span>
                  <div className="relative flex-1 max-w-lg">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => updateUrl(i, e.target.value)}
                      placeholder={`e.g. competitor${i + 1}.com`}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                    />
                  </div>
                  {urls.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeUrl(i)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {urls.length < 10 && (
              <button
                type="button"
                onClick={addUrl}
                className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add URL
              </button>
            )}
          </div>

          {/* Geo + Device + Submit */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location
              </label>
              <select
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
              >
                {GEO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Device
              </label>
              <div className="flex rounded-lg border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setDevice("desktop")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    device === "desktop"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDevice("mobile")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    device === "mobile"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompareArrows className="h-4 w-4" />
                  Compare
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Comparison Summary */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Comparison for &ldquo;{result.keyword}&rdquo;
                  </h3>
                  <p className="text-sm text-gray-500">
                    {result.comparisons.filter((c: UrlComparison) => c.found).length} of{" "}
                    {result.comparisons.length} URLs found in top 20
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

              {/* Comparison Cards */}
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.comparisons.map((comp: UrlComparison, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      comp.found
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-red-200 bg-red-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {comp.domain}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {comp.url}
                        </p>
                      </div>
                      <PositionBadge position={comp.position} size="md" />
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {comp.found ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-700">
                            Ranking at position #{comp.position}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-medium text-red-700">
                            Not in top 20 — content gap
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full SERP Results */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Full SERP Results
                </h3>
                <p className="text-sm text-gray-500">
                  Top {result.results.length} organic results &middot;{" "}
                  {result.device} &middot; {result.geo.toUpperCase()}
                </p>
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
                    {result.results.map((r) => (
                      <tr
                        key={r.position}
                        className={cn(
                          "transition-colors hover:bg-gray-50",
                          r.isTargetMatch &&
                            "bg-brand-50/50 hover:bg-brand-50"
                        )}
                      >
                        <td className="px-5 py-4 w-16">
                          <PositionBadge position={r.position} size="sm" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-xl">
                            <div className="flex items-center gap-2">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "text-sm font-medium hover:underline",
                                  r.isTargetMatch
                                    ? "text-brand-700"
                                    : "text-blue-700"
                                )}
                              >
                                {r.title}
                              </a>
                              <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                              {r.isTargetMatch && (
                                <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                                  COMPARED
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-emerald-700 truncate">
                              {r.url}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {r.snippet}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {r.serpFeatures.map((f) => (
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
        )}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <GitCompareArrows className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Compare Multiple URLs
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Enter a keyword and multiple URLs/domains to compare their
                rankings. Find out who ranks, who doesn&apos;t, and identify content
                gaps.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
