import {
  SerpProvider,
  SerpProviderOptions,
  SerpProviderResult,
} from "./provider";
import { SerpResult, SerpFeature } from "@/types/serp";

const MOCK_DOMAINS = [
  "example.com",
  "wikipedia.org",
  "medium.com",
  "github.com",
  "stackoverflow.com",
  "dev.to",
  "reddit.com",
  "quora.com",
  "youtube.com",
  "linkedin.com",
  "twitter.com",
  "facebook.com",
  "amazon.com",
  "nytimes.com",
  "bbc.com",
  "cnn.com",
  "techcrunch.com",
  "verge.com",
  "wired.com",
  "forbes.com",
];

const MOCK_FEATURES: SerpFeature[] = [
  "people_also_ask",
  "featured_snippet",
  "video",
  "image_pack",
];

function generateMockTitle(keyword: string, domain: string): string {
  const templates = [
    `${keyword} - Complete Guide | ${domain}`,
    `Best ${keyword} Resources in 2024 | ${domain}`,
    `Understanding ${keyword}: A Deep Dive - ${domain}`,
    `${keyword} Explained Simply - ${domain}`,
    `Top 10 Tips for ${keyword} | ${domain}`,
    `How to Master ${keyword} - ${domain}`,
    `${keyword}: Everything You Need to Know - ${domain}`,
    `The Ultimate ${keyword} Guide | ${domain}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateMockSnippet(keyword: string): string {
  const templates = [
    `Learn everything about ${keyword} with our comprehensive guide. Updated for 2024 with the latest best practices and strategies.`,
    `Discover the top strategies for ${keyword}. Our experts break down the key concepts and provide actionable insights.`,
    `${keyword} is essential for modern businesses. Find out why and how to implement it effectively in your workflow.`,
    `A complete overview of ${keyword} including tips, tools, and techniques used by industry professionals.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export class MockSerpProvider implements SerpProvider {
  name = "mock";

  async search(options: SerpProviderOptions): Promise<SerpProviderResult> {
    const numResults = options.numResults || 10;
    const shuffled = [...MOCK_DOMAINS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numResults, shuffled.length));

    const results: SerpResult[] = selected.map((domain, index) => ({
      position: index + 1,
      url: `https://www.${domain}/${options.keyword.toLowerCase().replace(/\s+/g, "-")}`,
      domain,
      title: generateMockTitle(options.keyword, domain),
      snippet: generateMockSnippet(options.keyword),
      isTargetMatch: false,
      serpFeatures:
        index === 0
          ? (["featured_snippet"] as SerpFeature[])
          : index === 3
            ? (["people_also_ask"] as SerpFeature[])
            : [],
    }));

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      results,
      serpFeatures: MOCK_FEATURES.slice(
        0,
        Math.floor(Math.random() * 3) + 1
      ),
      totalResults: 1_240_000 + Math.floor(Math.random() * 500_000),
    };
  }
}
