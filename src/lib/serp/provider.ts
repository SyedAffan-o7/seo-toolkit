import { SerpResult, SerpFeature } from "@/types/serp";
import { MockSerpProvider } from "./mock";
import { SerpApiProvider } from "./serpapi";
import { SerperProvider } from "./serper";

export interface SerpProviderOptions {
  keyword: string;
  geo?: string;
  device?: "desktop" | "mobile";
  numResults?: number;
  domainOverride?: string; // e.g., "google.com" to force specific domain
}

export interface SerpProviderResult {
  results: SerpResult[];
  serpFeatures: SerpFeature[];
  totalResults: number;
}

export interface SerpProvider {
  name: string;
  search(options: SerpProviderOptions): Promise<SerpProviderResult>;
}

export function getSerpProvider(): SerpProvider {
  const provider = process.env.SERP_PROVIDER || "mock";

  switch (provider) {
    case "serpapi":
      return new SerpApiProvider(process.env.SERP_API_KEY || "");
    case "serper":
      return new SerperProvider(process.env.SERP_API_KEY || "");
    case "mock":
    default:
      return new MockSerpProvider();
  }
}
