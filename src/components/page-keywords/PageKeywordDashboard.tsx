"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Award, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import toast from "react-hot-toast";

interface PageKeywordPosition {
  id: string;
  position: number | null;
  totalResults: number | null;
  checkedAt: string;
}

interface PageKeyword {
  id: string;
  pageUrl: string;
  keyword: string;
  geo: string;
  device: "desktop" | "mobile";
  isActive: boolean;
  notes?: string;
  positions: PageKeywordPosition[];
}

interface PageKeywordDashboardProps {
  projectId: string;
}

interface Stats {
  totalMappings: number;
  activeMappings: number;
  checkedToday: number;
  topRankers: number; // Position 1-3
  firstPage: number; // Position 1-10
  averagePosition: number;
  improved: number;
  declined: number;
}

export default function PageKeywordDashboard({ projectId }: PageKeywordDashboardProps) {
  const [mappings, setMappings] = useState<PageKeyword[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<PageKeyword | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchMappings();
  }, [projectId]);

  const fetchMappings = async () => {
    try {
      const res = await fetch(`/api/page-keywords?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMappings(data);
      
      // Auto-select first mapping with positions if none selected
      if (!selectedMapping && data.length > 0) {
        const withPositions = data.find((m: PageKeyword) => m.positions.length > 0);
        if (withPositions) setSelectedMapping(withPositions);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (): Stats => {
    const active = mappings.filter(m => m.isActive);
    const withPositions = active.filter(m => m.positions.length > 0);
    
    const positions = withPositions.map(m => m.positions[0]?.position).filter((p): p is number => p !== null);
    const avgPos = positions.length > 0 
      ? positions.reduce((a, b) => a + b, 0) / positions.length 
      : 0;
    
    // Count improved/declined by comparing latest to previous
    let improved = 0;
    let declined = 0;
    
    withPositions.forEach(m => {
      if (m.positions.length >= 2) {
        const latest = m.positions[0].position;
        const previous = m.positions[1].position;
        if (latest !== null && previous !== null) {
          if (latest < previous) improved++;
          else if (latest > previous) declined++;
        }
      }
    });

    const today = new Date().toDateString();
    const checkedToday = withPositions.filter(m => 
      new Date(m.positions[0]?.checkedAt).toDateString() === today
    ).length;

    return {
      totalMappings: mappings.length,
      activeMappings: active.length,
      checkedToday,
      topRankers: positions.filter(p => p && p <= 3).length,
      firstPage: positions.filter(p => p && p <= 10).length,
      averagePosition: Math.round(avgPos * 10) / 10,
      improved,
      declined,
    };
  };

  const getChartData = (mapping: PageKeyword) => {
    const cutoff = new Date();
    if (timeRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
    else if (timeRange === "30d") cutoff.setDate(cutoff.getDate() - 30);
    else cutoff.setDate(cutoff.getDate() - 90);

    return mapping.positions
      .filter(p => new Date(p.checkedAt) >= cutoff)
      .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
      .map(p => ({
        date: new Date(p.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        position: p.position ?? null,
        fullDate: new Date(p.checkedAt).toLocaleDateString(),
      }));
  };

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (current < previous) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (current > previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const stats = calculateStats();

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Mappings</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.totalMappings}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.activeMappings} active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Average Position</p>
          <p className={`mt-2 text-2xl font-semibold ${
            stats.averagePosition <= 10 ? "text-emerald-600" : 
            stats.averagePosition <= 30 ? "text-amber-600" : "text-gray-900"
          }`}>
            {stats.averagePosition > 0 ? `#${stats.averagePosition}` : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Across all tracked keywords</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Top 3 Rankings</p>
          <div className="mt-2 flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            <p className="text-2xl font-semibold text-gray-900">{stats.topRankers}</p>
          </div>
          <p className="mt-1 text-xs text-gray-400">First page: {stats.firstPage}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Recent Changes</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-lg font-semibold text-emerald-600">{stats.improved}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-lg font-semibold text-red-600">{stats.declined}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">Since last check</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Position History Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Position History</h3>
              {selectedMapping && (
                <p className="text-sm text-gray-500">
                  {selectedMapping.keyword} →{" "}
                  <a 
                    href={selectedMapping.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {new URL(selectedMapping.pageUrl).pathname}
                  </a>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    timeRange === range
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
                </button>
              ))}
            </div>
          </div>

          {selectedMapping && selectedMapping.positions.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData(selectedMapping)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    reversed
                    domain={[1, "dataMax + 5"]}
                    tickFormatter={(v) => `#${v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload[0]) {
                        const value = payload[0].value as number | null;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <p className="text-sm text-gray-500">{label}</p>
                            <p className="text-lg font-semibold">
                              {value ? `Position #${value}` : "Not found"}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="3 3" label="Top 3" />
                  <ReferenceLine y={10} stroke="#6b7280" strokeDasharray="3 3" label="Page 1" />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ fill: "#0284c7", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "#0284c7" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Target className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2">No position history available</p>
                <p className="text-sm">Run a check to start tracking</p>
              </div>
            </div>
          )}
        </div>

        {/* Mapping Selector & Quick Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trackings</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {mappings.filter(m => m.isActive).map((mapping) => {
              const latest = mapping.positions[0];
              const previous = mapping.positions[1];
              
              return (
                <button
                  key={mapping.id}
                  onClick={() => setSelectedMapping(mapping)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedMapping?.id === mapping.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {mapping.keyword}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {new URL(mapping.pageUrl).pathname}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {getTrendIcon(latest?.position ?? null, previous?.position ?? null)}
                      {latest?.position ? (
                        <span className={`text-sm font-semibold ${
                          latest.position <= 3 ? "text-emerald-600" :
                          latest.position <= 10 ? "text-amber-600" : "text-gray-600"
                        }`}>
                          #{latest.position}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  {latest?.checkedAt && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(latest.checkedAt).toLocaleDateString()}
                    </p>
                  )}
                </button>
              );
            })}
            {mappings.filter(m => m.isActive).length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <AlertTriangle className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm">No active mappings</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
