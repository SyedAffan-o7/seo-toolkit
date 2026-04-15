export type AuditSnapshot = {
  url: string;
  title: string;
  titleLength: number;
  h1: string;
  metaDescription: string;
  metaDescriptionLength: number;
  canonical: string;
  robotsMeta: string;
  wordCount: number;
  headingCounts: { h1: number; h2: number; h3: number; h4: number };
  internalLinks: number;
  externalLinks: number;
  totalImages: number;
  imagesWithAlt: number;
  hasSchema: boolean;
  schemaTypes: string[];
  keywordInTitle: boolean;
  keywordInH1: boolean;
  keywordInMeta: boolean;
  keywordInUrl: boolean;
  keywordDensity: number;
  keywordTokens: string[];
  keywordVariations: string[];
  keywordPresence: {
    title: boolean;
    meta: boolean;
    h1: boolean;
    h2: boolean;
    body: boolean;
  };
  keywordCount: number;
  totalTokens: number;
  phrasePresence: {
    title: boolean;
    meta: boolean;
    h1: boolean;
    h2: boolean;
    body: boolean;
  };
  score: number;
  // NEW: Actual Google ranking position
  googlePosition: number | null;
};

export type KeywordComparison = {
  primaryUsage: {
    you: { title: boolean; meta: boolean; h1: boolean; h2: boolean; body: boolean };
    competitor: { title: boolean; meta: boolean; h1: boolean; h2: boolean; body: boolean };
  };
  density: { you: number; competitor: number };
  score: { you: number; competitor: number };
  overlap: string[];
  missingKeywords: string[];
  weakUsage: string[];
  phraseMatch: {
    you: { title: boolean; meta: boolean; h1: boolean; h2: boolean };
    competitor: { title: boolean; meta: boolean; h1: boolean; h2: boolean };
  };
};

export type AuditSuggestion = {
  category: "critical" | "warning" | "info";
  message: string;
  priority: number; // 1-10, higher = fix first
  action: string; // exact step to take
  yourValue: string;
  competitorValue: string;
  impact: string; // why this matters for ranking
};

export type AuditCompareResponse = {
  keyword: string;
  audits: [AuditSnapshot, AuditSnapshot];
  suggestionsForFirst: AuditSuggestion[];
  suggestionsForSecond: AuditSuggestion[];
  // NEW: Actual ranking comparison
  rankingComparison: {
    yourPosition: number | null;
    competitorPosition: number | null;
    positionGap: number;
    totalResults: number;
  };
  // NEW: Top 10 analysis
  top10Analysis: {
    avgWordCount: number;
    avgTitleLength: number;
    pagesWithSchema: number;
    avgInternalLinks: number;
  } | null;
  keywordComparison: KeywordComparison;
};
