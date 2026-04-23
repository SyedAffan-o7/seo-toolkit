"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import type {
  KeywordSummary,
  ProjectSummary,
  TrackerHistoryResponse,
  CompetitorSummary,
  PerformanceMetrics,
} from "@/types/tracker";
import { 
  BarChart3, 
  Loader2, 
  Plus, 
  Radar, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Users, 
  Trash2,
  Star,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const GEO_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "in", label: "India" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
];

export default function TrackerPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [keywords, setKeywords] = useState<KeywordSummary[]>([]);
  const [history, setHistory] = useState<TrackerHistoryResponse["history"]>([]);
  const [competitors, setCompetitors] = useState<CompetitorSummary[]>([]);
  const [latestChange, setLatestChange] = useState<TrackerHistoryResponse["latestChange"]>();
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedKeywordId, setSelectedKeywordId] = useState("");

  const [projectName, setProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [keywordName, setKeywordName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [geo, setGeo] = useState("us");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isCreatingKeyword, setIsCreatingKeyword] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [competitorDomain, setCompetitorDomain] = useState("");
  const [competitorLabel, setCompetitorLabel] = useState("");
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [showCompetitorForm, setShowCompetitorForm] = useState(false);

  const selectedKeyword = useMemo(
    () => keywords.find((item) => item.id === selectedKeywordId),
    [keywords, selectedKeywordId]
  );

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (!res.ok) throw new Error("Failed to load projects");
    const data = await res.json();
    setProjects(data.projects || []);
    if (!selectedProjectId && data.projects?.length) {
      setSelectedProjectId(data.projects[0].id);
    }
  }, [selectedProjectId]);

  const fetchKeywords = useCallback(async (projectId: string) => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/keywords`);
    if (!res.ok) throw new Error("Failed to load keywords");
    const data = await res.json();
    const loaded = data.keywords || [];
    setKeywords(loaded);

    if (!loaded.find((item: KeywordSummary) => item.id === selectedKeywordId)) {
      setSelectedKeywordId(loaded[0]?.id || "");
    }
  }, [selectedKeywordId]);

  const fetchHistory = useCallback(async (projectId: string, keywordId: string) => {
    if (!projectId || !keywordId) {
      setHistory([]);
      setCompetitors([]);
      setLatestChange(undefined);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/tracker/history?projectId=${projectId}&keywordId=${keywordId}`
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load history");
      }

      const data: TrackerHistoryResponse = await res.json();
      setHistory(data.history || []);
      setCompetitors(data.competitors || []);
      setLatestChange(data.latestChange);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not load history"));
      setHistory([]);
      setCompetitors([]);
      setLatestChange(undefined);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchPerformance = useCallback(async (projectId: string) => {
    if (!projectId) {
      setPerformance(null);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/performance`);
      if (!res.ok) throw new Error("Failed to load performance");
      const data: PerformanceMetrics = await res.json();
      setPerformance(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not load performance metrics"));
      setPerformance(null);
    }
  }, []);

  const fetchCompetitors = useCallback(async (projectId: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/competitors`);
      if (!res.ok) throw new Error("Failed to load competitors");
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch (error: unknown) {
      console.error("Failed to fetch competitors", error);
    }
  }, []);

  useEffect(() => {
    fetchProjects().catch((error: unknown) =>
      toast.error(getErrorMessage(error, "Failed to load profiles"))
    );
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchKeywords(selectedProjectId).catch((error: unknown) =>
        toast.error(getErrorMessage(error, "Failed to load keywords"))
      );
      fetchPerformance(selectedProjectId);
      fetchCompetitors(selectedProjectId);
    }
  }, [selectedProjectId, fetchKeywords, fetchPerformance, fetchCompetitors]);

  useEffect(() => {
    fetchHistory(selectedProjectId, selectedKeywordId);
  }, [selectedProjectId, selectedKeywordId, fetchHistory]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreatingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to create project");
      }

      setProjectName("");
      toast.success("Project created");
      // Redirect to page rankings with the new project
      router.push(`/rank-checker/pages?projectId=${payload.project.id}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create project"));
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateKeyword = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Select a project first");
      return;
    }
    if (!keywordName.trim() || !targetUrl.trim()) {
      toast.error("Keyword and target URL are required");
      return;
    }

    setIsCreatingKeyword(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keywordName.trim(),
          targetUrl: targetUrl.trim(),
          geo,
          device,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to create keyword");
      }

      setKeywordName("");
      setTargetUrl("");
      await fetchKeywords(selectedProjectId);
      setSelectedKeywordId(payload.keyword.id);
      toast.success("Keyword added to tracking");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create keyword"));
    } finally {
      setIsCreatingKeyword(false);
    }
  };

  const handleRunSnapshot = async () => {
    if (!selectedProjectId || !selectedKeyword) {
      toast.error("Select a keyword to run tracking");
      return;
    }

    setIsRunningCheck(true);
    try {
      const res = await fetch("/api/serp/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: selectedKeyword.keyword,
          targetUrl: selectedKeyword.targetUrl,
          geo: selectedKeyword.geo,
          device: selectedKeyword.device,
          numResults: 20,
          saveSnapshot: true,
          projectId: selectedProjectId,
          keywordId: selectedKeyword.id,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to run snapshot");
      }

      await fetchHistory(selectedProjectId, selectedKeyword.id);
      await fetchPerformance(selectedProjectId);
      toast.success("Snapshot saved to tracker");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to run snapshot"));
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handleAddCompetitor = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error("Select a project first");
      return;
    }
    if (!competitorDomain.trim()) {
      toast.error("Competitor domain is required");
      return;
    }

    setIsAddingCompetitor(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: competitorDomain.trim(),
          label: competitorLabel.trim() || undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to add competitor");
      }

      setCompetitorDomain("");
      setCompetitorLabel("");
      setShowCompetitorForm(false);
      await fetchCompetitors(selectedProjectId);
      toast.success("Competitor added");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to add competitor"));
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    if (!confirm("Remove this competitor from tracking?")) return;

    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/competitors?competitorId=${competitorId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to delete competitor");
      }

      await fetchCompetitors(selectedProjectId);
      toast.success("Competitor removed");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to remove competitor"));
    }
  };

  const chartData = history.map((item) => ({
    ...item,
    label: new Date(item.checkedAt).toLocaleDateString(),
    position: item.targetPosition ?? 100,
  }));

  // Prepare competitor chart data
  const competitorChartData: Record<string, { label: string; position: number }[]> = {};
  competitors.forEach((comp) => {
    competitorChartData[comp.id] = history.map((item) => {
      const compData = item.competitors?.find((c) => c.competitorId === comp.id);
      return {
        label: new Date(item.checkedAt).toLocaleDateString(),
        position: compData?.position ?? 100,
      };
    });
  });

  const COMP_COLORS = ["#ef4444", "#f97316", "#a855f7", "#14b8a6", "#ec4899"];

  // Merge competitor positions into chartData for multi-line chart
  const mergedChartData = chartData.map((point, i) => {
    const merged: Record<string, string | number | null> = {
      label: point.label,
      position: point.position,
      snapshotId: point.snapshotId,
    };
    competitors.forEach((comp) => {
      const compPoint = competitorChartData[comp.id]?.[i];
      merged[`comp_${comp.id}`] = compPoint?.position ?? null;
    });
    return merged;
  });

  return (
    <>
      <TopBar title="Rank Tracker" subtitle="Track keywords for a specific profile and analyze ranking trends" />

      <div className="p-6 space-y-6">

        {/* ── Performance Dashboard ── */}
        {performance && selectedProjectId && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Performance Overview</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-5">
              <div className="rounded-lg bg-indigo-50 p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{performance.totalKeywords}</p>
                <p className="text-xs text-indigo-600 mt-1">Keywords</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {performance.averagePosition > 0 ? `#${performance.averagePosition}` : "—"}
                </p>
                <p className="text-xs text-gray-600 mt-1">Avg Position</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{performance.keywordsInTop10}</p>
                <p className="text-xs text-green-600 mt-1">In Top 10</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{performance.keywordsInTop3}</p>
                <p className="text-xs text-amber-600 mt-1">In Top 3</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <p className="text-2xl font-bold text-emerald-700">{performance.positionGains}</p>
                </div>
                <p className="text-xs text-emerald-600 mt-1">Gains</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="text-2xl font-bold text-red-700">{performance.positionLosses}</p>
                </div>
                <p className="text-xs text-red-600 mt-1">Losses</p>
              </div>
            </div>

            {/* Biggest win / loss + visibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-5 pb-5">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Visibility Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-indigo-700">{performance.visibilityScore}</span>
                  <span className="text-sm text-gray-500 mb-1">/100</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${performance.visibilityScore}%` }}
                  />
                </div>
              </div>
              {performance.biggestWin && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-600 mb-1">Biggest Win</p>
                  <p className="text-sm font-semibold text-green-900 truncate">{performance.biggestWin.keyword}</p>
                  <p className="text-lg font-bold text-green-700">+{performance.biggestWin.change} positions</p>
                </div>
              )}
              {performance.biggestLoss && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Biggest Loss</p>
                  <p className="text-sm font-semibold text-red-900 truncate">{performance.biggestLoss.keyword}</p>
                  <p className="text-lg font-bold text-red-700">{performance.biggestLoss.change} positions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Position Change Alert ── */}
        {latestChange && latestChange.type !== "stable" && (
          <div
            className={`rounded-xl border-2 p-4 flex items-center gap-3 ${
              latestChange.type === "gain"
                ? "border-green-300 bg-green-50"
                : latestChange.type === "loss"
                ? "border-red-300 bg-red-50"
                : "border-blue-300 bg-blue-50"
            }`}
          >
            {latestChange.type === "gain" ? (
              <TrendingUp className="h-6 w-6 text-green-600 shrink-0" />
            ) : latestChange.type === "loss" ? (
              <TrendingDown className="h-6 w-6 text-red-600 shrink-0" />
            ) : (
              <Star className="h-6 w-6 text-blue-600 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-bold ${
                latestChange.type === "gain" ? "text-green-900" : latestChange.type === "loss" ? "text-red-900" : "text-blue-900"
              }`}>
                {latestChange.type === "gain"
                  ? `Position Gained! Moved from #${latestChange.from} → #${latestChange.to} (+${latestChange.change} positions)`
                  : latestChange.type === "loss"
                  ? `Position Dropped. Moved from #${latestChange.from} → #${latestChange.to} (${latestChange.change} positions)`
                  : `New Entry! Your page appeared at #${latestChange.to}`}
              </p>
              {latestChange.isSignificant && (
                <p className={`text-xs mt-0.5 ${
                  latestChange.type === "gain" ? "text-green-700" : latestChange.type === "loss" ? "text-red-700" : "text-blue-700"
                }`}>
                  {latestChange.type === "gain"
                    ? "Significant improvement detected."
                    : latestChange.type === "loss"
                    ? "Significant drop — check for recent changes or algorithm updates."
                    : "Your page is now indexed and ranking."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Create Project / Add Keyword Row ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreateProject} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Create Project</h3>
            </div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isCreatingProject}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isCreatingProject && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Project
            </button>
          </form>

          <form onSubmit={handleCreateKeyword} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-900">Add Keyword To Track</h3>
            </div>
            <input
              value={keywordName}
              onChange={(e) => setKeywordName(e.target.value)}
              placeholder="best seo toolkit"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://yourdomain.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={geo} onChange={(e) => setGeo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {GEO_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value as "desktop" | "mobile")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isCreatingKeyword || !selectedProjectId}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isCreatingKeyword && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Keyword
            </button>
          </form>
        </div>

        {/* ── Competitor Management ── */}
        {selectedProjectId && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Tracked Competitors ({competitors.length})
                </h3>
              </div>
              <button
                onClick={() => setShowCompetitorForm(!showCompetitorForm)}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                <Plus className="h-3 w-3" />
                Add Competitor
              </button>
            </div>

            {showCompetitorForm && (
              <form onSubmit={handleAddCompetitor} className="border-b border-gray-100 p-4 bg-purple-50">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Domain *</label>
                    <input
                      value={competitorDomain}
                      onChange={(e) => setCompetitorDomain(e.target.value)}
                      placeholder="competitor.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Label (optional)</label>
                    <input
                      value={competitorLabel}
                      onChange={(e) => setCompetitorLabel(e.target.value)}
                      placeholder="Main competitor"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingCompetitor}
                    className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isAddingCompetitor && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add
                  </button>
                </div>
              </form>
            )}

            {competitors.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {competitors.map((comp, i) => (
                  <div key={comp.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: COMP_COLORS[i % COMP_COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{comp.domain}</p>
                        {comp.label && <p className="text-xs text-gray-500">{comp.label}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompetitor(comp.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Remove competitor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-center text-sm text-gray-500">
                No competitors tracked yet. Add competitors to see how they rank alongside you.
              </div>
            )}
          </div>
        )}

        {/* ── Chart + Snapshot Controls ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="min-w-[240px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.domain})
                </option>
              ))}
            </select>

            <select
              value={selectedKeywordId}
              onChange={(e) => setSelectedKeywordId(e.target.value)}
              className="min-w-[280px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={!selectedProjectId}
            >
              <option value="">Select tracked keyword</option>
              {keywords.map((keyword) => (
                <option key={keyword.id} value={keyword.id}>
                  {keyword.keyword} → {keyword.targetUrl}
                </option>
              ))}
            </select>

            <button
              onClick={handleRunSnapshot}
              disabled={isRunningCheck || !selectedKeyword}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isRunningCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
              Run Snapshot
            </button>
          </div>

          {/* Chart legend */}
          {chartData.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-gray-700 font-medium">Your Position</span>
              </div>
              {competitors.map((comp, i) => (
                <div key={comp.id} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COMP_COLORS[i % COMP_COLORS.length] }}
                  />
                  <span className="text-gray-700">{comp.label || comp.domain}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div className="h-80 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {isLoadingHistory ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history...
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-sm text-gray-500 gap-2">
                <BarChart3 className="h-8 w-8 text-gray-300" />
                No snapshots yet. Run a snapshot to start trend tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedChartData} margin={{ left: 16, right: 16, top: 10, bottom: 10 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis reversed allowDecimals={false} tick={{ fontSize: 12 }} domain={[1, "dataMax"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Your Position"
                  />
                  {competitors.map((comp, i) => (
                    <Line
                      key={comp.id}
                      type="monotone"
                      dataKey={`comp_${comp.id}`}
                      stroke={COMP_COLORS[i % COMP_COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name={comp.label || comp.domain}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Checked</th>
                  <th className="px-3 py-2">Your Position</th>
                  {competitors.map((comp) => (
                    <th key={comp.id} className="px-3 py-2">{comp.label || comp.domain}</th>
                  ))}
                  <th className="px-3 py-2">Results</th>
                  <th className="px-3 py-2">Provider</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((point, idx) => {
                  const prevPoint = idx < history.length - 1
                    ? [...history].reverse()[idx + 1]
                    : null;
                  const posChange = point.targetPosition && prevPoint?.targetPosition
                    ? prevPoint.targetPosition - point.targetPosition
                    : 0;

                  return (
                    <tr key={point.snapshotId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600">{new Date(point.checkedAt).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900">
                            {point.targetPosition ? `#${point.targetPosition}` : "Not Found"}
                          </span>
                          {posChange > 0 && (
                            <span className="inline-flex items-center text-xs text-green-600 font-medium">
                              <TrendingUp className="h-3 w-3 mr-0.5" />+{posChange}
                            </span>
                          )}
                          {posChange < 0 && (
                            <span className="inline-flex items-center text-xs text-red-600 font-medium">
                              <TrendingDown className="h-3 w-3 mr-0.5" />{posChange}
                            </span>
                          )}
                        </div>
                      </td>
                      {competitors.map((comp) => {
                        const compData = point.competitors?.find((c) => c.competitorId === comp.id);
                        return (
                          <td key={comp.id} className="px-3 py-2 text-gray-700">
                            {compData?.position ? `#${compData.position}` : compData?.found === false ? "Not Found" : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-gray-600">{point.totalResults?.toLocaleString() || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {point.provider}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <BarChart3 className="h-4 w-4" />
            Lower position is better (1 = top result). Dashed lines = competitors.
          </div>
        </div>
      </div>
    </>
  );
}
