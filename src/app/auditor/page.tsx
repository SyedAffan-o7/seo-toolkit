"use client";

import { FormEvent, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import type {
  AuditCompareResponse,
  AuditSnapshot,
  AuditSuggestion,
} from "@/types/audit";
import toast from "react-hot-toast";
import {
  FileSearch,
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Trophy,
  TrendingUp,
} from "lucide-react";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function ScoreRing({ score, label, url }: { score: number; label: string; url: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let colorClass = "text-red-500";
  let bgClass = "bg-red-50";
  let statusText = "Needs Work";
  let statusDesc = "Major SEO issues found";

  if (score >= 80) {
    colorClass = "text-green-500";
    bgClass = "bg-green-50";
    statusText = "Excellent";
    statusDesc = "Well optimized for search";
  } else if (score >= 60) {
    colorClass = "text-yellow-500";
    bgClass = "bg-yellow-50";
    statusText = "Good";
    statusDesc = "Some improvements needed";
  } else if (score >= 40) {
    colorClass = "text-orange-500";
    bgClass = "bg-orange-50";
    statusText = "Fair";
    statusDesc = "Several issues to fix";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="120" height="120" className="-rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-100"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={colorClass}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={url}>{url}</p>
      </div>
      <div className={`rounded-full px-3 py-1 text-xs font-medium ${bgClass} ${colorClass}`}>
        {statusText}
      </div>
      <p className="text-xs text-gray-500 text-center max-w-[200px]">{statusDesc}</p>
    </div>
  );
}

function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3 w-3" />
      {trueLabel || "Yes"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <XCircle className="h-3 w-3" />
      {falseLabel || "No"}
    </span>
  );
}

function SuggestionItem({ item, index }: { item: AuditSuggestion; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const config = {
    critical: {
      icon: XCircle,
      bg: "bg-red-50 border-red-300",
      text: "text-red-900",
      iconColor: "text-red-600",
      label: "FIX NOW",
      labelBg: "bg-red-600",
      labelText: "text-white",
      barColor: "bg-red-500",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-yellow-50 border-yellow-300",
      text: "text-yellow-900",
      iconColor: "text-yellow-600",
      label: "FIX SOON",
      labelBg: "bg-yellow-500",
      labelText: "text-white",
      barColor: "bg-yellow-500",
    },
    info: {
      icon: Info,
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-900",
      iconColor: "text-blue-600",
      label: "IMPROVE",
      labelBg: "bg-blue-500",
      labelText: "text-white",
      barColor: "bg-blue-500",
    },
  };

  const c = config[item.category];
  const Icon = c.icon;
  const priorityNum = item.priority ?? 5;

  return (
    <div className={`rounded-lg border-2 ${c.bg} hover:shadow-md transition-shadow overflow-hidden`}>
      {/* Priority bar */}
      <div className="flex items-center gap-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 ${i < priorityNum ? c.barColor : "bg-gray-200"}`}
          />
        ))}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 ${c.iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-bold px-2.5 py-1 rounded ${c.labelBg} ${c.labelText}`}>
                #{index + 1} {c.label}
              </span>
              <span className="text-xs text-gray-500 font-medium">Priority {priorityNum}/10</span>
            </div>
            <p className={`text-sm leading-relaxed ${c.text} font-semibold`}>{item.message}</p>
          </div>
        </div>

        {/* You vs Competitor comparison */}
        {(item.yourValue || item.competitorValue) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white/70 border border-gray-200 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-0.5">Your Page</p>
              <p className="text-xs text-gray-800 font-medium break-words">{item.yourValue || "—"}</p>
            </div>
            <div className="rounded-md bg-white/70 border border-gray-200 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-0.5">Competitor</p>
              <p className="text-xs text-gray-800 font-medium break-words">{item.competitorValue || "—"}</p>
            </div>
          </div>
        )}

        {/* Expand/collapse for action + impact */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide Details" : "Show Exact Steps & Impact"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Action steps */}
            {item.action && (
              <div className="rounded-md bg-white border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> EXACT STEPS TO FIX
                </p>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{item.action}</pre>
              </div>
            )}

            {/* Impact explanation */}
            {item.impact && (
              <div className="rounded-md bg-white border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-wide text-indigo-700 font-bold mb-1.5 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> WHY THIS MATTERS
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{item.impact}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      {children}
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10 w-56 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
          {text}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
        </div>
      )}
    </div>
  );
}

interface MetricInfo {
  label: string;
  description: string;
  goodRange?: string;
}

const metricHelp: Record<string, MetricInfo> = {
  titleLength: {
    label: "Title Length",
    description: "The title tag appears in search results. Keep it 30-65 characters to avoid truncation.",
    goodRange: "30-65 chars",
  },
  metaDescLength: {
    label: "Meta Description Length",
    description: "The meta description appears under your title in search results. Aim for 70-160 characters.",
    goodRange: "70-160 chars",
  },
  wordCount: {
    label: "Word Count",
    description: "Total words on the page. More content often ranks better. Aim for 800+ words.",
    goodRange: "800+ words",
  },
  h1Count: {
    label: "H1 Count",
    description: "The H1 is the main heading. Use exactly one H1 per page.",
    goodRange: "Exactly 1",
  },
  h2Count: {
    label: "H2 Count",
    description: "H2s organize content into sections. More H2s help structure long content.",
    goodRange: "2+ recommended",
  },
  internalLinks: {
    label: "Internal Links",
    description: "Links to other pages on your site. Helps distribute link equity and navigation.",
    goodRange: "Varies by page",
  },
  externalLinks: {
    label: "External Links",
    description: "Links to other websites. Can add credibility when linking to authoritative sources.",
    goodRange: "Quality over quantity",
  },
  imagesWithAlt: {
    label: "Images with Alt Text",
    description: "Alt text helps search engines understand images and improves accessibility.",
    goodRange: "All images should have alt",
  },
  keywordDensity: {
    label: "Keyword Density",
    description: "How often your target keyword appears. Aim for 1-2% to avoid keyword stuffing.",
    goodRange: "1-2%",
  },
  keywordInTitle: {
    label: "Keyword in Title",
    description: "Having your target keyword in the title tag helps relevance.",
    goodRange: "Recommended",
  },
  keywordInH1: {
    label: "Keyword in H1",
    description: "Including the keyword in your main heading reinforces topic relevance.",
    goodRange: "Recommended",
  },
  keywordInMeta: {
    label: "Keyword in Meta Description",
    description: "The keyword in meta description can improve click-through rates.",
    goodRange: "Recommended",
  },
  keywordInUrl: {
    label: "Keyword in URL",
    description: "Having the keyword in the URL slug can help with rankings.",
    goodRange: "Recommended",
  },
  hasSchema: {
    label: "Schema Markup",
    description: "Structured data helps search engines understand your content and can enable rich snippets.",
    goodRange: "Recommended",
  },
};

function MetricRow({
  metricKey,
  valueA,
  valueB,
  better,
}: {
  metricKey: string;
  valueA: string | number;
  valueB: string | number;
  better?: "a" | "b" | "equal" | null;
}) {
  const info = metricHelp[metricKey];
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-3 last:border-0 items-center">
      <Tooltip text={info?.description || ""}>
        <span className="text-sm font-medium text-gray-700">{info?.label || metricKey}</span>
      </Tooltip>
      <div className="text-center">
        <span
          className={`text-sm ${better === "a" ? "font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded" : "text-gray-900"}`}
        >
          {valueA}
        </span>
        {better === "a" && <TrendingUp className="inline h-3 w-3 ml-1 text-green-600" />}
      </div>
      <div className="text-center">
        <span
          className={`text-sm ${better === "b" ? "font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded" : "text-gray-900"}`}
        >
          {valueB}
        </span>
        {better === "b" && <TrendingUp className="inline h-3 w-3 ml-1 text-green-600" />}
      </div>
    </div>
  );
}

function numBetter(a: number, b: number): "a" | "b" | "equal" {
  if (a > b) return "a";
  if (b > a) return "b";
  return "equal";
}

function RankingComparisonCard({ data }: { data: AuditCompareResponse["rankingComparison"] }) {
  const formatPosition = (pos: number | null) => {
    if (pos === null) return { text: "Not in top 100", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    if (pos <= 3) return { text: `#${pos}`, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
    if (pos <= 10) return { text: `#${pos}`, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
    return { text: `#${pos}`, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
  };

  const yourPos = formatPosition(data.yourPosition);
  const compPos = formatPosition(data.competitorPosition);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Actual Google Rankings
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg border ${yourPos.border} ${yourPos.bg} p-4 text-center`}>
          <p className="text-xs text-gray-500 mb-1">Your Position</p>
          <p className={`text-2xl font-bold ${yourPos.color}`}>{yourPos.text}</p>
          {data.yourPosition && data.yourPosition > 10 && (
            <p className="text-xs text-gray-500 mt-1">Page 2+ (low visibility)</p>
          )}
        </div>

        <div className={`rounded-lg border ${compPos.border} ${compPos.bg} p-4 text-center`}>
          <p className="text-xs text-gray-500 mb-1">Competitor Position</p>
          <p className={`text-2xl font-bold ${compPos.color}`}>{compPos.text}</p>
          {data.competitorPosition && data.competitorPosition <= 10 && (
            <p className="text-xs text-gray-500 mt-1">First page (high visibility)</p>
          )}
        </div>
      </div>

      {data.yourPosition && data.competitorPosition && data.positionGap !== 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            {data.positionGap < 0 ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                You&apos;re ahead by {Math.abs(data.positionGap)} position{Math.abs(data.positionGap) > 1 ? "s" : ""}!
              </span>
            ) : (
              <span className="text-red-600 font-medium">
                They&apos;re beating you by {data.positionGap} position{data.positionGap > 1 ? "s" : ""}.
              </span>
            )}
            {" "}Out of {data.totalResults.toLocaleString()} total results for this keyword.
          </p>
        </div>
      )}
    </div>
  );
}

function Top10AnalysisCard({ data }: { data: AuditCompareResponse["top10Analysis"] }) {
  if (!data) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Info className="h-4 w-4" />
        What Top 10 Results Have in Common
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Analyzed the top 5 ranking pages to find patterns that correlate with high rankings.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Avg Word Count</p>
          <p className="text-lg font-semibold text-gray-900">{data.avgWordCount.toLocaleString()} words</p>
          <p className="text-xs text-gray-400">Top pages are comprehensive</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Avg Title Length</p>
          <p className="text-lg font-semibold text-gray-900">{data.avgTitleLength} chars</p>
          <p className="text-xs text-gray-400">Sweet spot for click-through</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Using Schema Markup</p>
          <p className="text-lg font-semibold text-gray-900">{data.pagesWithSchema}/5 pages</p>
          <p className="text-xs text-gray-400">Rich snippets advantage</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Avg Internal Links</p>
          <p className="text-lg font-semibold text-gray-900">{data.avgInternalLinks} links</p>
          <p className="text-xs text-gray-400">Good site structure</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Insight:</strong> If your page is significantly below these averages, that might be why you&apos;re not ranking as high.
        </p>
      </div>
    </div>
  );
}

function ActionPlan({ suggestions, yourScore, competitorScore }: { suggestions: AuditSuggestion[]; yourScore: number; competitorScore: number }) {
  const criticalCount = suggestions.filter(s => s.category === "critical").length;
  const warningCount = suggestions.filter(s => s.category === "warning").length;
  const infoCount = suggestions.filter(s => s.category === "info").length;

  return (
    <div className="rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        📋 Your Step-by-Step Action Plan
      </h3>

      <div className="space-y-4 text-sm">
        {/* Priority 1 - Critical */}
        {criticalCount > 0 ? (
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start gap-3">
              <span className="bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shrink-0">STEP 1</span>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-1">🚨 Fix {criticalCount} Critical Issue{criticalCount > 1 ? "s" : ""} First</p>
                <p className="text-gray-700 mb-2">These are BLOCKING your rankings. Without fixing these, you won&apos;t rank well no matter what else you do.</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>What to do:</strong> Scroll down and fix all items marked &quot;FIX NOW&quot; (red). These are usually quick fixes like adding a title tag or H1 heading.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-bold text-green-900">✅ No critical issues - great foundation!</p>
            </div>
          </div>
        )}

        {/* Priority 2 - Warnings */}
        {warningCount > 0 && (
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start gap-3">
              <span className="bg-yellow-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shrink-0">STEP 2</span>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-1">⚡ Address {warningCount} Warning{warningCount > 1 ? "s" : ""}</p>
                <p className="text-gray-700 mb-2">These are what separate you from your competitor. Fix these to close the ranking gap.</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>What to do:</strong> Fix items marked &quot;FIX SOON&quot; (yellow). Focus on content length, keyword placement, and schema markup.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Priority 3 - Info */}
        {infoCount > 0 && (
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shrink-0">STEP 3</span>
              <div className="flex-1">
                <p className="font-bold text-gray-900 mb-1">🎯 Polish {infoCount} Enhancement{infoCount > 1 ? "s" : ""}</p>
                <p className="text-gray-700 mb-2">These give you the final edge to outrank competitors.</p>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>What to do:</strong> Improve items marked &quot;IMPROVE&quot; (blue). These are nice-to-haves that add up over time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Final step */}
        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
          <div className="flex items-start gap-3">
            <span className="bg-purple-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shrink-0">STEP 4</span>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">📊 Monitor & Wait</p>
              <p className="text-gray-700">After making changes, wait 2-4 weeks for Google to re-crawl and re-rank your page. Check your position weekly.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t-2 border-green-200">
        <div className="bg-white rounded-lg p-3">
          <p className="text-sm font-bold text-gray-900 mb-1">💡 Quick Win Strategy:</p>
          <p className="text-xs text-gray-700">
            {yourScore >= competitorScore
              ? "You're ahead! Maintain your advantage by keeping content fresh and monitoring competitor changes."
              : criticalCount > 0
              ? `Fix the ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} TODAY. This alone could move you up ${Math.min(criticalCount * 5, 20)} positions.`
              : `You need ${competitorScore - yourScore} more points. Focus on content depth and schema markup for fastest results.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuditDetails({ audit, label }: { audit: AuditSnapshot; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{label} Raw Data</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-4 space-y-2 text-xs text-gray-700">
          <p><strong>Title:</strong> {audit.title || "(empty)"}</p>
          <p><strong>H1:</strong> {audit.h1 || "(empty)"}</p>
          <p><strong>Meta Desc:</strong> {audit.metaDescription || "(empty)"}</p>
          <p><strong>Canonical:</strong> {audit.canonical || "(none)"}</p>
          <p><strong>Robots:</strong> {audit.robotsMeta || "(none)"}</p>
          <p><strong>Schema Types:</strong> {audit.schemaTypes.length ? audit.schemaTypes.join(", ") : "(none)"}</p>
        </div>
      )}
    </div>
  );
}

export default function AuditorPage() {
  const [keyword, setKeyword] = useState("");
  const [yourUrl, setYourUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuditCompareResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !yourUrl.trim() || !competitorUrl.trim()) {
      toast.error("All fields are required");
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/audit/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          urls: [yourUrl.trim(), competitorUrl.trim()],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.error === "string" ? err.error : "Audit failed"
        );
      }

      const data: AuditCompareResponse = await res.json();
      setResult(data);
      toast.success("Audit complete!");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Something went wrong"));
    } finally {
      setIsLoading(false);
    }
  };

  const yours = result?.audits[0];
  const competitor = result?.audits[1];

  return (
    <>
      <TopBar
        title="SEO Auditor"
        subtitle="Compare your page against a competitor and get actionable insights"
      />

      <div className="p-6 space-y-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileSearch className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Competitive On-Page Audit
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. best pizza dubai"
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Page URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={yourUrl}
                  onChange={(e) => setYourUrl(e.target.value)}
                  placeholder="https://yoursite.com/page"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Competitor Page URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                <input
                  type="url"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com/page"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4" />
                Run Competitive Audit
              </>
            )}
          </button>
        </form>

        {/* Results */}
        {result && yours && competitor && (
          <div className="space-y-6">
            {/* Summary Intro */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Audit Results for &ldquo;{result.keyword}&rdquo;
              </h3>
              <p className="text-sm text-blue-700">
                Comparing your page against a competitor for the keyword <strong>{result.keyword}</strong>.
                The score (0-100) shows how well each page is optimized for search engines.
                Scroll down to see detailed metrics and actionable suggestions.
              </p>
            </div>

            {/* Score Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center">
                <ScoreRing score={yours.score} label="Your Page" url={yours.url} />
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center">
                <ScoreRing score={competitor.score} label="Competitor" url={competitor.url} />
              </div>
            </div>

            {/* Ranking Comparison */}
            {result.rankingComparison && (
              <div className="grid gap-6 md:grid-cols-2">
                <RankingComparisonCard data={result.rankingComparison} />
                <Top10AnalysisCard data={result.top10Analysis} />
              </div>
            )}

            {/* Comparison Table */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Side-by-Side Comparison
              </h3>

              <div className="grid grid-cols-3 gap-2 border-b border-gray-200 pb-3 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Metric <span className="text-gray-400 font-normal">(hover ?)</span>
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase text-center">
                  Your Page
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase text-center">
                  Competitor
                </span>
              </div>

              <MetricRow
                metricKey="titleLength"
                valueA={`${yours.titleLength} chars`}
                valueB={`${competitor.titleLength} chars`}
                better={
                  yours.titleLength >= 30 && yours.titleLength <= 65
                    ? competitor.titleLength >= 30 && competitor.titleLength <= 65
                      ? "equal"
                      : "a"
                    : competitor.titleLength >= 30 && competitor.titleLength <= 65
                      ? "b"
                      : "equal"
                }
              />
              <MetricRow
                metricKey="metaDescLength"
                valueA={`${yours.metaDescriptionLength} chars`}
                valueB={`${competitor.metaDescriptionLength} chars`}
                better={null}
              />
              <MetricRow
                metricKey="wordCount"
                valueA={`${yours.wordCount.toLocaleString()} words`}
                valueB={`${competitor.wordCount.toLocaleString()} words`}
                better={numBetter(yours.wordCount, competitor.wordCount)}
              />
              <MetricRow
                metricKey="h1Count"
                valueA={yours.headingCounts.h1}
                valueB={competitor.headingCounts.h1}
                better={
                  yours.headingCounts.h1 === 1
                    ? competitor.headingCounts.h1 === 1
                      ? "equal"
                      : "a"
                    : competitor.headingCounts.h1 === 1
                      ? "b"
                      : "equal"
                }
              />
              <MetricRow
                metricKey="h2Count"
                valueA={yours.headingCounts.h2}
                valueB={competitor.headingCounts.h2}
                better={numBetter(yours.headingCounts.h2, competitor.headingCounts.h2)}
              />
              <MetricRow
                metricKey="internalLinks"
                valueA={yours.internalLinks}
                valueB={competitor.internalLinks}
                better={numBetter(yours.internalLinks, competitor.internalLinks)}
              />
              <MetricRow
                metricKey="externalLinks"
                valueA={yours.externalLinks}
                valueB={competitor.externalLinks}
                better={null}
              />
              <MetricRow
                metricKey="imagesWithAlt"
                valueA={`${yours.imagesWithAlt}/${yours.totalImages}`}
                valueB={`${competitor.imagesWithAlt}/${competitor.totalImages}`}
                better={null}
              />
              <MetricRow
                metricKey="keywordDensity"
                valueA={`${yours.keywordDensity}%`}
                valueB={`${competitor.keywordDensity}%`}
                better={null}
              />

              {/* Boolean checks with tooltips */}
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-3 items-center">
                <Tooltip text={metricHelp.keywordInTitle.description}>
                  <span className="text-sm font-medium text-gray-700">{metricHelp.keywordInTitle.label}</span>
                </Tooltip>
                <div className="text-center"><BoolBadge value={yours.keywordInTitle} trueLabel="Present" falseLabel="Missing" /></div>
                <div className="text-center"><BoolBadge value={competitor.keywordInTitle} trueLabel="Present" falseLabel="Missing" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-3 items-center">
                <Tooltip text={metricHelp.keywordInH1.description}>
                  <span className="text-sm font-medium text-gray-700">{metricHelp.keywordInH1.label}</span>
                </Tooltip>
                <div className="text-center"><BoolBadge value={yours.keywordInH1} trueLabel="Present" falseLabel="Missing" /></div>
                <div className="text-center"><BoolBadge value={competitor.keywordInH1} trueLabel="Present" falseLabel="Missing" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-3 items-center">
                <Tooltip text={metricHelp.keywordInMeta.description}>
                  <span className="text-sm font-medium text-gray-700">{metricHelp.keywordInMeta.label}</span>
                </Tooltip>
                <div className="text-center"><BoolBadge value={yours.keywordInMeta} trueLabel="Present" falseLabel="Missing" /></div>
                <div className="text-center"><BoolBadge value={competitor.keywordInMeta} trueLabel="Present" falseLabel="Missing" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-3 items-center">
                <Tooltip text={metricHelp.keywordInUrl.description}>
                  <span className="text-sm font-medium text-gray-700">{metricHelp.keywordInUrl.label}</span>
                </Tooltip>
                <div className="text-center"><BoolBadge value={yours.keywordInUrl} trueLabel="Present" falseLabel="Missing" /></div>
                <div className="text-center"><BoolBadge value={competitor.keywordInUrl} trueLabel="Present" falseLabel="Missing" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 items-center">
                <Tooltip text={metricHelp.hasSchema.description}>
                  <span className="text-sm font-medium text-gray-700">{metricHelp.hasSchema.label}</span>
                </Tooltip>
                <div className="text-center"><BoolBadge value={yours.hasSchema} trueLabel="Found" falseLabel="Not Found" /></div>
                <div className="text-center"><BoolBadge value={competitor.hasSchema} trueLabel="Found" falseLabel="Not Found" /></div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 flex items-start gap-1.5">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span><strong>How to read this:</strong> Hover over any metric name to learn what it means. The <TrendingUp className="inline h-3 w-3" /> icon shows which page performs better for that metric.</span>
                </p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Suggestions for Your Page
                </h3>
                {result.suggestionsForFirst.length === 0 ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    No issues found — your page is well-optimised!
                  </p>
                ) : (
                  result.suggestionsForFirst.map((s, i) => (
                    <SuggestionItem key={i} item={s} index={i} />
                  ))
                )}
              </div>
              <div className="space-y-4">
                <ActionPlan
                  suggestions={result.suggestionsForFirst}
                  yourScore={yours.score}
                  competitorScore={competitor.score}
                />
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="text-base font-semibold text-gray-900">
                    Competitor Weaknesses
                  </h3>
                  {result.suggestionsForSecond.length === 0 ? (
                    <p className="text-sm text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Competitor page has no obvious gaps.
                    </p>
                  ) : (
                    result.suggestionsForSecond.map((s, i) => (
                      <SuggestionItem key={i} item={s} index={i} />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Raw Data Expandable */}
            <div className="grid gap-4 md:grid-cols-2">
              <AuditDetails audit={yours} label="Your Page" />
              <AuditDetails audit={competitor} label="Competitor" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
