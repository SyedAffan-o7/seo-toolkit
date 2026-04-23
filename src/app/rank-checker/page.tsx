"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import SearchForm from "@/components/rank-checker/SearchForm";
import ResultsTable from "@/components/rank-checker/ResultsTable";
import { SerpCheckResponse } from "@/types/serp";
import toast from "react-hot-toast";
import { Search, TrendingUp, Target, Zap } from "lucide-react";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function RankCheckerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SerpCheckResponse | null>(null);

  const handleSearch = async (data: {
    keyword: string;
    targetUrl: string;
    geo: string;
    device: "desktop" | "mobile";
    numResults: number;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/serp/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to check ranking");
      }

      const response: SerpCheckResponse = await res.json();
      setResult(response);

      if (response.targetPosition !== null) {
        toast.success(
          `Found at position #${response.targetPosition}!`
        );
      } else {
        toast.error(
          `Not found in top ${response.results.length} results`
        );
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Something went wrong"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TopBar
        title="Rank Checker"
        subtitle="Check where your website ranks for any keyword"
      />
      <div className="p-6 space-y-6">
        {/* Search Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results */}
        {result && <ResultsTable data={result} />}

        {/* Empty State */}
        {!result && !isLoading && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <Search className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Check Your Rankings
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Enter a keyword and your website URL above to see where you rank
                in Google search results. Results include top 10 positions with
                SERP features.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <Target className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1.5 text-xs font-medium text-gray-600">
                    Position Tracking
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <TrendingUp className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1.5 text-xs font-medium text-gray-600">
                    SERP Analysis
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <Zap className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1.5 text-xs font-medium text-gray-600">
                    CSV Export
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
