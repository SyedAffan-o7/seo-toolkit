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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newMapping, setNewMapping] = useState({
    pageUrl: "",
    keyword: "",
    geo: "us",
    device: "desktop" as "desktop" | "mobile",
    notes: "",
  });

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
      const data = await res.json();
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

  const handleAdd = async () => {
    if (!newMapping.pageUrl.trim() || !newMapping.keyword.trim()) {
      toast.error("Page URL and keyword are required");
      return;
    }

    try {
      const res = await fetch("/api/page-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMapping,
          projectId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      toast.success("Mapping added successfully");
      setNewMapping({
        pageUrl: "",
        keyword: "",
        geo: "us",
        device: "desktop",
        notes: "",
      });
      setIsAdding(false);
      fetchMappings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add mapping");
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
          depths[m.id] = rowDepths[m.id] ?? numResults;
        });

      const res = await fetch("/api/page-keywords/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          checkAllActive: true,
          numResults,
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
            onClick={() => setIsAdding(true)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Mapping</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Page URL
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={newMapping.pageUrl}
                  onChange={(e) => setNewMapping({ ...newMapping, pageUrl: e.target.value })}
                  placeholder="https://yoursite.com/page"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target Keyword
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={newMapping.keyword}
                  onChange={(e) => setNewMapping({ ...newMapping, keyword: e.target.value })}
                  placeholder="e.g. best seo tools"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={newMapping.geo}
                  onChange={(e) => setNewMapping({ ...newMapping, geo: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {GEO_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Device
              </label>
              <div className="flex rounded-lg border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setNewMapping({ ...newMapping, device: "desktop" })}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    newMapping.device === "desktop"
                      ? "bg-brand-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setNewMapping({ ...newMapping, device: "mobile" })}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    newMapping.device === "mobile"
                      ? "bg-brand-600 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (optional)
            </label>
            <input
              type="text"
              value={newMapping.notes}
              onChange={(e) => setNewMapping({ ...newMapping, notes: e.target.value })}
              placeholder="e.g. Main product page, priority keyword"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
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
              Add Mapping
            </button>
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
                  Active
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
              {mappings.map((mapping) => (
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
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="10"
                        value={rowDepths[mapping.id] ?? numResults}
                        onChange={(e) =>
                          setRowDepths((prev) => ({
                            ...prev,
                            [mapping.id]: parseInt(e.target.value),
                          }))
                        }
                        className="h-2 w-28 rounded-lg bg-gray-200 accent-brand-600 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 w-8 text-right">
                        {rowDepths[mapping.id] ?? numResults}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(mapping.id, mapping.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        mapping.isActive ? "bg-brand-600" : "bg-gray-200"
                      }`}
                      aria-label={mapping.isActive ? "Deactivate mapping" : "Activate mapping"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          mapping.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{mapping._count.positions} checks</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
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
                  <td colSpan={7} className="px-4 py-12 text-center">
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
      </div>
    </div>
  );
}
