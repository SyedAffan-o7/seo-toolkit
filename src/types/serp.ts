export interface SerpResult {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  isTargetMatch: boolean;
  serpFeatures: SerpFeature[];
}

export type SerpFeature =
  | "featured_snippet"
  | "people_also_ask"
  | "local_pack"
  | "knowledge_panel"
  | "image_pack"
  | "video"
  | "top_stories"
  | "shopping"
  | "sitelinks";

export interface SerpCheckRequest {
  keyword: string;
  targetUrl: string;
  geo?: string;
  device?: "desktop" | "mobile";
  numResults?: number;
  saveSnapshot?: boolean;
  projectId?: string;
  keywordId?: string;
}

export interface SerpCheckResponse {
  keyword: string;
  targetUrl: string;
  targetDomain: string;
  geo: string;
  device: string;
  totalResults: number;
  targetPosition: number | null;
  results: SerpResult[];
  serpFeatures: SerpFeature[];
  checkedAt: string;
  snapshotId?: string;
}

export interface SerpCompareRequest {
  keyword: string;
  urls: string[];
  geo?: string;
  device?: "desktop" | "mobile";
  saveSnapshot?: boolean;
  projectId?: string;
}

export interface SerpCompareResponse {
  keyword: string;
  geo: string;
  device: string;
  results: SerpResult[];
  comparisons: UrlComparison[];
  checkedAt: string;
  snapshotId?: string;
}

export interface UrlComparison {
  url: string;
  domain: string;
  position: number | null;
  found: boolean;
}
