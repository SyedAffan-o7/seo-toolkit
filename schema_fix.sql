-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS "PageKeywordPosition" CASCADE;
DROP TABLE IF EXISTS "PageKeyword" CASCADE;
DROP TABLE IF EXISTS "CompetitorRankSnapshot" CASCADE;
DROP TABLE IF EXISTS "Competitor" CASCADE;
DROP TABLE IF EXISTS "RankSnapshot" CASCADE;
DROP TABLE IF EXISTS "Keyword" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TYPE IF EXISTS "DeviceType" CASCADE;

-- Create Enum type
CREATE TYPE "DeviceType" AS ENUM ('desktop', 'mobile');

-- Create Project table
CREATE TABLE "Project" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE(name, domain)
);

-- Create Keyword table
CREATE TABLE "Keyword" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    geo TEXT DEFAULT 'us',
    device "DeviceType" DEFAULT 'desktop',
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("projectId", keyword, "targetUrl", geo, device)
);

-- Create Competitor table
CREATE TABLE "Competitor" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    label TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("projectId", domain)
);

-- Create RankSnapshot table
CREATE TABLE "RankSnapshot" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    "keywordId" TEXT NOT NULL REFERENCES "Keyword"(id) ON DELETE CASCADE,
    "checkedAt" TIMESTAMP DEFAULT now(),
    "targetPosition" INTEGER,
    "totalResults" INTEGER,
    "serpFeatures" JSONB,
    results JSONB,
    provider TEXT DEFAULT 'mock'
);

-- Create CompetitorRankSnapshot table
CREATE TABLE "CompetitorRankSnapshot" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "snapshotId" TEXT NOT NULL REFERENCES "RankSnapshot"(id) ON DELETE CASCADE,
    "competitorId" TEXT NOT NULL REFERENCES "Competitor"(id) ON DELETE CASCADE,
    position INTEGER,
    found BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT now(),
    UNIQUE("snapshotId", "competitorId")
);

-- Create PageKeyword table
CREATE TABLE "PageKeyword" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
    "pageUrl" TEXT NOT NULL,
    keyword TEXT NOT NULL,
    geo TEXT DEFAULT 'us',
    device "DeviceType" DEFAULT 'desktop',
    "isActive" BOOLEAN DEFAULT true,
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE("projectId", "pageUrl", keyword, geo, device)
);

-- Create PageKeywordPosition table
CREATE TABLE "PageKeywordPosition" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "pageKeywordId" TEXT NOT NULL REFERENCES "PageKeyword"(id) ON DELETE CASCADE,
    position INTEGER,
    "totalResults" INTEGER,
    "serpFeatures" JSONB,
    "topResults" JSONB,
    "checkedAt" TIMESTAMP DEFAULT now()
);

-- Add indexes
CREATE INDEX "Project_domain_idx" ON "Project"(domain);
CREATE INDEX "Keyword_projectId_isActive_idx" ON "Keyword"("projectId", "isActive");
CREATE INDEX "Competitor_projectId_idx" ON "Competitor"("projectId");
CREATE INDEX "RankSnapshot_projectId_checkedAt_idx" ON "RankSnapshot"("projectId", "checkedAt");
CREATE INDEX "RankSnapshot_keywordId_checkedAt_idx" ON "RankSnapshot"("keywordId", "checkedAt");
CREATE INDEX "CompetitorRankSnapshot_competitorId_createdAt_idx" ON "CompetitorRankSnapshot"("competitorId", "createdAt");
CREATE INDEX "PageKeyword_projectId_isActive_idx" ON "PageKeyword"("projectId", "isActive");
CREATE INDEX "PageKeyword_pageUrl_idx" ON "PageKeyword"("pageUrl");
CREATE INDEX "PageKeywordPosition_pageKeywordId_checkedAt_idx" ON "PageKeywordPosition"("pageKeywordId", "checkedAt");
CREATE INDEX "PageKeywordPosition_checkedAt_idx" ON "PageKeywordPosition"("checkedAt");
