-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('desktop', 'mobile');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "geo" TEXT NOT NULL DEFAULT 'us',
    "device" "DeviceType" NOT NULL DEFAULT 'desktop',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetPosition" INTEGER,
    "totalResults" INTEGER,
    "serpFeatures" JSONB,
    "results" JSONB,
    "provider" TEXT NOT NULL DEFAULT 'mock',

    CONSTRAINT "RankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorRankSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "position" INTEGER,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorRankSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageKeyword" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "geo" TEXT NOT NULL DEFAULT 'us',
    "device" "DeviceType" NOT NULL DEFAULT 'desktop',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageKeywordPosition" (
    "id" TEXT NOT NULL,
    "pageKeywordId" TEXT NOT NULL,
    "position" INTEGER,
    "totalResults" INTEGER,
    "serpFeatures" JSONB,
    "topResults" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageKeywordPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_domain_idx" ON "Project"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_domain_key" ON "Project"("name", "domain");

-- CreateIndex
CREATE INDEX "Keyword_projectId_isActive_idx" ON "Keyword"("projectId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_projectId_keyword_targetUrl_geo_device_key" ON "Keyword"("projectId", "keyword", "targetUrl", "geo", "device");

-- CreateIndex
CREATE INDEX "Competitor_projectId_idx" ON "Competitor"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_projectId_domain_key" ON "Competitor"("projectId", "domain");

-- CreateIndex
CREATE INDEX "RankSnapshot_projectId_checkedAt_idx" ON "RankSnapshot"("projectId", "checkedAt");

-- CreateIndex
CREATE INDEX "RankSnapshot_keywordId_checkedAt_idx" ON "RankSnapshot"("keywordId", "checkedAt");

-- CreateIndex
CREATE INDEX "CompetitorRankSnapshot_competitorId_createdAt_idx" ON "CompetitorRankSnapshot"("competitorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorRankSnapshot_snapshotId_competitorId_key" ON "CompetitorRankSnapshot"("snapshotId", "competitorId");

-- CreateIndex
CREATE INDEX "PageKeyword_projectId_isActive_idx" ON "PageKeyword"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "PageKeyword_pageUrl_idx" ON "PageKeyword"("pageUrl");

-- CreateIndex
CREATE UNIQUE INDEX "PageKeyword_projectId_pageUrl_keyword_geo_device_key" ON "PageKeyword"("projectId", "pageUrl", "keyword", "geo", "device");

-- CreateIndex
CREATE INDEX "PageKeywordPosition_pageKeywordId_checkedAt_idx" ON "PageKeywordPosition"("pageKeywordId", "checkedAt");

-- CreateIndex
CREATE INDEX "PageKeywordPosition_checkedAt_idx" ON "PageKeywordPosition"("checkedAt");

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankSnapshot" ADD CONSTRAINT "RankSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorRankSnapshot" ADD CONSTRAINT "CompetitorRankSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "RankSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorRankSnapshot" ADD CONSTRAINT "CompetitorRankSnapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageKeyword" ADD CONSTRAINT "PageKeyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageKeywordPosition" ADD CONSTRAINT "PageKeywordPosition_pageKeywordId_fkey" FOREIGN KEY ("pageKeywordId") REFERENCES "PageKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
