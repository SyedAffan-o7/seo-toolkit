"use client";

import { useState } from "react";
import { Search, Globe, Monitor, Smartphone, Loader2 } from "lucide-react";

interface SearchFormProps {
  onSubmit: (data: {
    keyword: string;
    targetUrl: string;
    geo: string;
    device: "desktop" | "mobile";
    numResults: number;
  }) => void;
  isLoading: boolean;
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
  { value: "ae", label: "United Arab Emirates" }  ,
];

export default function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [geo, setGeo] = useState("us");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [numResults, setNumResults] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !targetUrl.trim()) return;
    onSubmit({ keyword: keyword.trim(), targetUrl: targetUrl.trim(), geo, device, numResults });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Target URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Target URL
          </label>
          <div className="relative"> 
            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              required
            />
          </div>
        </div>

        {/* Keyword Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Target Keyword
          </label>  
          <div className="relative"> 
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. best seo tools"
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Geo Select */}
        <div className="w-[320px] pr-8">
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

        {/* Depth Slider */}
        <div className="flex-1 max-w-[240px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Search Depth: <span className="text-brand-600 font-semibold">{numResults}</span>
          </label>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={numResults}
            onChange={(e) => setNumResults(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        {/* Device Toggle */}
        <div className="flex-1 max-w-[340px] pl-8 pr-8">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Device
          </label>
          <div className="flex justify-between rounded-lg border border-gray-300 bg-white p-0.5 gap-1">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !keyword.trim() || !targetUrl.trim()}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Check Ranking
            </>
          )}
        </button>
      </div>
    </form>
  );
}
