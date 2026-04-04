import TopBar from "@/components/layout/TopBar";
import Link from "next/link";
import { Compass, ArrowRight, Search, GitCompareArrows } from "lucide-react";

export default function ExplorerPage() {
  return (
    <>
      <TopBar
        title="SERP Explorer"
        subtitle="Keyword and SERP exploration workspace"
      />

      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Compass className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">SERP Explorer</h2>
            <p className="mt-2 text-sm text-gray-600">
              This section is being expanded. For now, use the implemented
              modules below to run one-off SERP checks and multi-URL comparisons.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/rank-checker"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Rank Checker</p>
                <p className="mt-1 text-sm text-gray-600">
                  Check where a domain ranks for a keyword.
                </p>
              </div>
              <Search className="h-5 w-5 text-brand-600" />
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <Link
            href="/compare"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Compare URLs</p>
                <p className="mt-1 text-sm text-gray-600">
                  Compare multiple domains for one keyword.
                </p>
              </div>
              <GitCompareArrows className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
