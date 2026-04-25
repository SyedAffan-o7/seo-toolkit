"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Edit2, Check, X, Globe, Monitor, Smartphone, Search, FileText, ExternalLink, Download, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface PageKeyword {
  id: string;
  pageUrl: string;
  keyword: string;
  geo: string;
  device: "desktop" | "mobile";
  isActive: boolean;
  checkDepth?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  positions: {
    id: string;
    position: number | null;
    totalResults: number | null;
    checkedAt: string;
  }[];
  _count: {
    positions: number;
  };
}

interface PageKeywordManagerProps {
  projectId: string;
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
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
  { value: "ae", label: "UAE" },
];

export default function PageKeywordManager({ projectId }: PageKeywordManagerProps) {
  const [mappings, setMappings] = useState<PageKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [numResults] = useState<number>(20);
  const [rowDepths, setRowDepths] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  interface NewMapping {
    id: string;
    pageUrl: string;
    keyword: string;
    geo: string;
    device: "desktop" | "mobile";
    checkDepth: number;
  }

  const [newMappings, setNewMappings] = useState<NewMapping[]>([
    { id: "1", pageUrl: "", keyword: "", geo: "us", device: "desktop", checkDepth: 20 },
  ]);

  const addMappingRow = () => {
    setNewMappings((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        pageUrl: "",
        keyword: "",
        geo: prev[prev.length - 1]?.geo || "us",
        device: prev[prev.length - 1]?.device || "desktop",
        checkDepth: prev[prev.length - 1]?.checkDepth || 20,
      },
    ]);
  };

  const removeMappingRow = (id: string) => {
    setNewMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMappingRow = (id: string, updates: Partial<NewMapping>) => {
    setNewMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const [editMapping, setEditMapping] = useState({
    keyword: "",
    geo: "us",
    device: "desktop" as "desktop" | "mobile",
    isActive: true,
    notes: "",
  });

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch(`/api/page-keywords?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PageKeyword[] = await res.json();
      console.log("[fetchMappings] Loaded mappings with checkDepth:", data.map((m) => ({ id: m.id, keyword: m.keyword, checkDepth: m.checkDepth })));
      setMappings(data);
    } catch {
      toast.error("Failed to load page-keyword mappings");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mappings.length]);

  const handleAdd = async () => {
    const validMappings = newMappings.filter(
      (m) => m.pageUrl.trim() && m.keyword.trim()
    );

    if (validMappings.length === 0) {
      toast.error("At least one Page URL and keyword are required");
      return;
    }

    console.log("[handleAdd] Sending mappings with checkDepth:", validMappings.map(m => ({ keyword: m.keyword, checkDepth: m.checkDepth })));

    try {
      const results = await Promise.all(
        validMappings.map(async (mapping) => {
          const payload = {
            pageUrl: mapping.pageUrl,
            keyword: mapping.keyword,
            geo: mapping.geo,
            device: mapping.device,
            checkDepth: mapping.checkDepth,
            projectId,
          };
          console.log("[handleAdd] POST payload:", payload);
          const res = await fetch("/api/page-keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const responseData = await res.json().catch(() => null);
          console.log("[handleAdd] Response:", res.status, responseData);
          if (!res.ok) {
            return { ok: false, error: responseData?.error || `HTTP ${res.status}`, mapping };
          }
          return { ok: true, mapping, checkDepth: responseData?.checkDepth };
        })
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        const errors = failed.map((f) => `${f.mapping.keyword}: ${f.error}`).join("; ");
        throw new Error(`Failed to create ${failed.length} mapping(s): ${errors}`);
      }

      toast.success(`${validMappings.length} mapping(s) added successfully`);
      setNewMappings([
        { id: "1", pageUrl: "", keyword: "", geo: "us", device: "desktop", checkDepth: 20 },
      ]);
      setIsAdding(false);
      fetchMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add mapping(s)");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch("/api/page-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...editMapping,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Mapping updated");
      setEditingId(null);
      fetchMappings();
    } catch {
      toast.error("Failed to update mapping");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this mapping? This will also delete all position history.")) return;

    try {
      const res = await fetch(`/api/page-keywords?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Mapping deleted");
      fetchMappings();
    } catch {
      toast.error("Failed to delete mapping");
    }
  };

  const handleBulkCheck = async () => {
    if (mappings.filter(m => m.isActive).length === 0) {
      toast.error("No active mappings to check");
      return;
    }

    setIsChecking(true);
    try {
      // Build per-row depths map for active mappings
      const depths: Record<string, number> = {};
      mappings
        .filter((m) => m.isActive)
        .forEach((m) => {
          depths[m.id] = rowDepths[m.id] ?? m.checkDepth ?? 20;
        });

      console.log("[Bulk Check] Sending depths:", depths, "numResults:", numResults);
      const res = await fetch("/api/page-keywords/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          checkAllActive: true,
          pageKeywordDepths: depths,
        }),
      });

      if (!res.ok) throw new Error("Failed to check rankings");

      const data = await res.json();
      console.log("[Bulk Check Response]", JSON.stringify(data, null, 2));
      toast.success(`Checked ${data.checked} mappings, ${data.failed} failed`);
      fetchMappings();
    } catch {
      toast.error("Failed to run bulk check");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckSingle = async (mappingId: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping) return;

    setIsChecking(true);
    try {
      // Use slider value if changed, otherwise use mapping's saved checkDepth
      const depth = rowDepths[mappingId] ?? mapping.checkDepth ?? 20;
      const res = await fetch("/api/page-keywords/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pageKeywordIds: [mappingId],
          checkAllActive: false,
          pageKeywordDepths: { [mappingId]: depth },
        }),
      });

      if (!res.ok) throw new Error("Failed to check ranking");

      const data = await res.json();
      const result = data.results?.[0];
      if (result?.success) {
        const pos = result.position;
        if (pos) {
          toast.success(`Found at position #${pos} (depth: ${depth})`);
        } else {
          toast(`Not found in top ${depth} results`, { icon: "ℹ️" });
        }
      } else {
        toast.error("Check failed");
      }
      fetchMappings();
    } catch {
      toast.error("Failed to check ranking");
    } finally {
      setIsChecking(false);
    }
  };

  const startEditing = (mapping: PageKeyword) => {
    setEditingId(mapping.id);
    setEditMapping({
      keyword: mapping.keyword,
      geo: mapping.geo,
      device: mapping.device,
      isActive: mapping.isActive,
      notes: mapping.notes || "",
    });
  };

  const handleExport = () => {
    window.open(`/api/page-keywords/export?projectId=${projectId}`, "_blank");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/page-keywords/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Import failed");

      const data = await res.json();
      toast.success(`Imported ${data.created} mappings, skipped ${data.skipped}`);
      if (data.errors.length > 0) {
        console.warn("Import errors:", data.errors);
      }
      fetchMappings();
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

const handleToggleActive = async (id: string,currentActive:boolean)=>{

  try {
    const res = await fetch(`/api/page-keywords`,{
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        id,
        isActive:!currentActive
      })
    });

    if(!res.ok) throw new Error(" Failed to update")

    toast.success(`${currentActive ? "Deactivated" : "Activated"} mapping`)
    fetchMappings()
  } catch {
    toast.error("Failed to update mapping")
  }
}
 
  const getPositionBadge = (position: number | null) => {
    if (position === null) return <span className="text-gray-400">Not found</span>;
    if (position <= 3) return <span className="text-emerald-600 font-semibold">#{position}</span>;
    if (position <= 10) return <span className="text-amber-600 font-medium">#{position}</span>;
    return <span className="text-gray-600">#{position}</span>;
  };

  // Get position closest to N days ago within a ±3 day window
  const getPositionNDaysAgo = (
    positions: PageKeyword["positions"],
    daysAgo: number
  ): number | null => {
    if (!positions || positions.length === 0) return null;
    const target = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    const windowMs = 3 * 24 * 60 * 60 * 1000;
    let best: { diff: number; position: number | null } | null = null;
    for (const p of positions) {
      const t = new Date(p.checkedAt).getTime();
      const diff = Math.abs(t - target);
      if (diff <= windowMs && (!best || diff < best.diff)) {
        best = { diff, position: p.position };
      }
    }
    return best ? best.position : null;
  };

  const getAvgPosition = (positions: PageKeyword["positions"]): number | null => {
    if (!positions || positions.length === 0) return null;
    const found = positions.filter((p) => p.position !== null) as { position: number }[];
    if (found.length === 0) return null;
    const sum = found.reduce((acc, p) => acc + p.position, 0);
    return Math.round(sum / found.length);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Page → Keyword Rankings</h2>
          <p className="text-sm text-gray-500 mt-1">
            {mappings.length} mappings · {mappings.filter(m => m.isActive).length} active
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handleBulkCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            {isChecking ? "Checking..." : "Check All Rankings"}
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("[Add Mapping] clicked, current isAdding:", isAdding);
              setIsAdding(true);
              console.log("[Add Mapping] set isAdding to true");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Mapping
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Mappings</h3>
          <div className="space-y-3">
            {newMappings.map((mapping, index) => (
              <div key={mapping.id} className="bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                {/* Row 1: Page URL & Keyword */}
                <div className="grid gap-3 md:grid-cols-2 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Page URL {index === 0 && "*"}
                    </label>
                    <input
                      type="url"
                      value={mapping.pageUrl}
                      onChange={(e) => updateMappingRow(mapping.id, { pageUrl: e.target.value })}
                      placeholder="https://yoursite.com/page"
                      className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Keyword {index === 0 && "*"}
                    </label>
                    <input
                      type="text"
                      value={mapping.keyword}
                      onChange={(e) => updateMappingRow(mapping.id, { keyword: e.target.value })}
                      placeholder="e.g. best seo tools"
                      className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                {/* Row 2: Location, Device, Depth, Remove */}
                <div className="grid gap-3 md:grid-cols-12 items-center">
                  {/* Location */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                    <select
                      value={mapping.geo}
                      onChange={(e) => updateMappingRow(mapping.id, { geo: e.target.value })}
                      className="w-full rounded-md border border-gray-300 bg-white py-2 px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                    >
                      {GEO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Device */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Device</label>
                    <div className="flex rounded-md border border-gray-300 bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => updateMappingRow(mapping.id, { device: "desktop" })}
                        className={`flex-1 flex items-center justify-center gap-1 rounded p-1.5 text-sm transition-colors ${
                          mapping.device === "desktop"
                            ? "bg-brand-600 text-white"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMappingRow(mapping.id, { device: "mobile" })}
                        className={`flex-1 flex items-center justify-center gap-1 rounded p-1.5 text-sm transition-colors ${
                          mapping.device === "mobile"
                            ? "bg-brand-600 text-white"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mobile</span>
                      </button>
                    </div>
                  </div>

                  {/* Depth */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Depth: <span className="text-brand-600 font-medium">{mapping.checkDepth}</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={10}
                      value={mapping.checkDepth}
                      onChange={(e) => updateMappingRow(mapping.id, { checkDepth: Number(e.target.value) })}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />
                  </div>

                  {/* Remove */}
                  <div className="md:col-span-1 flex justify-end">
                    {newMappings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMappingRow(mapping.id)}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button & Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={addMappingRow}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Another Mapping
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Add {newMappings.length} Mapping{newMappings.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mappings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Page URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Keyword
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location/Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Current Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Week
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  15 Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Avg Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Checks
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((mapping) => (
                <tr
                  key={mapping.id}
                  className={`transition-colors hover:bg-gray-50 ${
                    !mapping.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={mapping.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate max-w-[200px]"
                        title={mapping.pageUrl}
                      >
                        {new URL(mapping.pageUrl).pathname || "/"}
                      </a>
                      <ExternalLink className="h-3 w-3 text-gray-400 shrink-0" />
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[220px]">
                      {new URL(mapping.pageUrl).hostname}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === mapping.id ? (
                      <input
                        type="text"
                        value={editMapping.keyword}
                        onChange={(e) => setEditMapping({ ...editMapping, keyword: e.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{mapping.keyword}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === mapping.id ? (
                      <div className="flex gap-2">
                        <select
                          value={editMapping.geo}
                          onChange={(e) => setEditMapping({ ...editMapping, geo: e.target.value })}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          {GEO_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <select
                          value={editMapping.device}
                          onChange={(e) => setEditMapping({ ...editMapping, device: e.target.value as "desktop" | "mobile" })}
                          className="rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="desktop">Desktop</option>
                          <option value="mobile">Mobile</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="h-3.5 w-3.5" />
                        {mapping.geo.toUpperCase()}
                        <span className="text-gray-300">|</span>
                        {mapping.device === "desktop" ? (
                          <Monitor className="h-3.5 w-3.5" />
                        ) : (
                          <Smartphone className="h-3.5 w-3.5" />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getPositionBadge(mapping.positions[0]?.position ?? null)}
                    {mapping.positions[0]?.checkedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(mapping.positions[0].checkedAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getPositionBadge(getPositionNDaysAgo(mapping.positions, 7))}
                  </td>
                  <td className="px-4 py-3">
                    {getPositionBadge(getPositionNDaysAgo(mapping.positions, 15))}
                  </td>
                  <td className="px-4 py-3">
                    {getPositionBadge(getAvgPosition(mapping.positions))}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {mapping._count.positions} check{mapping._count.positions === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="10"
                        value={rowDepths[mapping.id] ?? mapping.checkDepth ?? 20}
                        onChange={(e) =>
                          setRowDepths((prev) => ({
                            ...prev,
                            [mapping.id]: parseInt(e.target.value),
                          }))
                        }
                        className="h-2 w-20 rounded-lg bg-gray-200 accent-brand-600 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 w-6 text-right">
                        {rowDepths[mapping.id] ?? mapping.checkDepth ?? 20}
                      </span>
                      <button
                        onClick={() => handleCheckSingle(mapping.id)}
                        disabled={isChecking}
                        className="flex items-center gap-1 px-2 py-1 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 disabled:opacity-50 text-xs font-medium transition-colors"
                      >
                        <Search className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(mapping.id, mapping.isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          mapping.isActive ? "bg-brand-600" : "bg-gray-200"
                        }`}
                        aria-label={mapping.isActive ? "Deactivate mapping" : "Activate mapping"}
                        title={mapping.isActive ? "Active (click to deactivate)" : "Inactive (click to activate)"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            mapping.isActive ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      {editingId === mapping.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(mapping.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(mapping)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mapping.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {mappings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-sm">
                      <FileText className="mx-auto h-10 w-10 text-gray-300" />
                      <h3 className="mt-3 text-base font-medium text-gray-900">
                        No mappings yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Add page → keyword mappings to start tracking rankings
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {mappings.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, mappings.length)} of {mappings.length} mappings
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(mappings.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(mappings.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(mappings.length / itemsPerPage)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
