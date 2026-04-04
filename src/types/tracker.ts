export interface ProjectSummary {
  id: string;
  name: string;
  domain: string;
  description?: string | null;
  createdAt: string;
  competitorCount?: number;
  keywordCount?: number;
}

export interface KeywordSummary {
  id: string;
  projectId: string;
  keyword: string;
  targetUrl: string;
  geo: string;
  device: "desktop" | "mobile";
  isActive: boolean;
  createdAt: string;
  lastPosition?: number | null;
  bestPosition?: number | null;
  averagePosition?: number | null;
}

export interface CompetitorSummary {
  id: string;
  projectId: string;
  domain: string;
  label: string | null;
  createdAt: string;
}

export interface SerpFeature {
  type: string;
  present: boolean;
  ownedByTarget?: boolean;
  ownedByCompetitor?: string | null;
}

export interface CompetitorPosition {
  competitorId: string;
  domain: string;
  label: string | null;
  position: number | null;
  found: boolean;
}

export interface TrackerPoint {
  snapshotId: string;
  checkedAt: string;
  targetPosition: number | null;
  totalResults: number | null;
  provider: string;
  serpFeatures?: SerpFeature[];
  competitors?: CompetitorPosition[];
}

export interface PositionChange {
  type: "gain" | "loss" | "stable" | "new";
  from: number | null;
  to: number | null;
  change: number;
  isSignificant: boolean; // +/- 5 or more
}

export interface TrackerHistoryResponse {
  project: ProjectSummary;
  keyword: KeywordSummary;
  history: TrackerPoint[];
  competitors?: CompetitorSummary[];
  latestChange?: PositionChange;
}

export interface PerformanceMetrics {
  totalKeywords: number;
  activeKeywords: number;
  averagePosition: number;
  keywordsInTop10: number;
  keywordsInTop3: number;
  positionGains: number;
  positionLosses: number;
  biggestWin: { keyword: string; change: number } | null;
  biggestLoss: { keyword: string; change: number } | null;
  visibilityScore: number; // 0-100
}
