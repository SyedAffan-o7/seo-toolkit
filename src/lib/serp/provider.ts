import { SerpResult, SerpFeature } from "@/types/serp";
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
  const provider = process.env.SERP_PROVIDER || "serper";
  const apiKey = process.env.SERP_API_KEY;

  switch (provider) {
    case "serpapi":
      return new SerpApiProvider(apiKey || "");
    case "serper":
      return new SerperProvider(apiKey || "");
    default:
      throw new Error(
        `Unknown SERP_PROVIDER "${provider}". Must be "serper" or "serpapi". Set SERP_PROVIDER and SERP_API_KEY in environment variables.`
      );
  }
}
