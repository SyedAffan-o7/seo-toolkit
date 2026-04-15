import axios from "axios";
import {
  SerpProvider,
  SerpProviderOptions,
  SerpProviderResult,
} from "./provider";
import { SerpResult, SerpFeature } from "@/types/serp";

interface SerpApiOrganicResult {
  link?: string;
  position?: number;
  title?: string;
  snippet?: string;
  sitelinks?: unknown;
}

export class SerpApiProvider implements SerpProvider {
  name = "serpapi";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(options: SerpProviderOptions): Promise<SerpProviderResult> {
    const targetResults = options.numResults || 200;
    const maxPerPage = 10; // SerpAPI typically returns ~10 per page
    let allResults: SerpResult[] = [];
    const allFeatures: SerpFeature[] = [];
    let totalResults = 0;

    const locationFallback: Record<string, string> = {
      ae: "Dubai, United Arab Emirates",
    };

    // Map country codes to Google domains (us -> google.com, not google.us)
    const domainMapping: Record<string, string> = {
      us: "google.com",
      uk: "google.co.uk",
      ae: "google.ae",
      // Add more as needed
    };

    // Fetch pages until we have enough results or no more available
    for (let start = 0; start < targetResults; start += maxPerPage) {
      const params: Record<string, string | number> = {
        api_key: this.apiKey,
        q: options.keyword,
        engine: "google",
        num: Math.min(maxPerPage, targetResults - start),
        start: start,
        hl: "en",
        google_domain: options.domainOverride
          ? options.domainOverride
          : options.geo
            ? (domainMapping[options.geo.toLowerCase()] || `google.${options.geo.toLowerCase()}`)
            : "google.com",
      };

      if (options.geo) {
        params.gl = options.geo;

        const loc = locationFallback[options.geo.toLowerCase()];
        if (loc) params.location = loc;
      }

      if (options.device === "mobile") {
        params.device = "mobile";
      }

      const response = await axios.get("https://serpapi.com/search.json", {
        params,
      });

      const data = response.data;
      const organicResults = data.organic_results || [];
      const localPlaces = data.local_results?.places || [];

      console.log(
        `[SerpAPI] page start=${start} num=${params.num} organic=${organicResults.length} local=${localPlaces.length} domain=${params.google_domain} gl=${params.gl ?? ""} location=${params.location ?? ""}`
      );

      // Log local results on first page
      if (start === 0 && localPlaces.length > 0) {
        console.log(`[SerpAPI] Local Pack results:`);
        localPlaces.forEach((lr: { title?: string; link?: string; place_id?: string }, i: number) => {
          console.log(`  Local #${i + 1}: "${lr.title}" -> ${lr.link || "no link"}`);
        });
      }

      // Log ALL organic URLs for this page
      organicResults.forEach((item: SerpApiOrganicResult) => {
        console.log(`  [SerpAPI] organic pos=${item.position} ${item.link}`);
      });

      // Collect SERP features from first page only
      if (start === 0) {
        if (data.answer_box) allFeatures.push("featured_snippet");
        if (data.related_questions) allFeatures.push("people_also_ask");
        if (data.local_results) allFeatures.push("local_pack");
        if (data.knowledge_graph) allFeatures.push("knowledge_panel");
        if (data.inline_images) allFeatures.push("image_pack");
        if (data.inline_videos) allFeatures.push("video");
        if (data.top_stories) allFeatures.push("top_stories");
        if (data.shopping_results) allFeatures.push("shopping");

        const rawTotal = data.search_information?.total_results;
        totalResults = typeof rawTotal === "number"
          ? rawTotal
          : parseInt((rawTotal || "0").replace(/,/g, ""), 10);

        // Include local results as part of all results
        if (localPlaces.length > 0) {
          const localResults: SerpResult[] = localPlaces
            .filter((item: { link?: string }) => item.link)
            .map((item: { title?: string; link?: string; position?: number; snippet?: string }, idx: number) => {
              const url = item.link || "";
              let domain = "";
              try {
                domain = new URL(url).hostname.replace(/^www\./, "");
              } catch {
                domain = url;
              }
              return {
                position: item.position || idx + 1,
                url,
                domain,
                title: item.title || "",
                snippet: item.snippet || "",
                isTargetMatch: false,
                serpFeatures: ["local_pack" as SerpFeature],
              };
            });
          allResults = [...allResults, ...localResults];
          console.log(`[SerpAPI] Added ${localResults.length} local results with links`);
        }
      }

      if (organicResults.length === 0) {
        break; // No more results available
      }

      const pageResults: SerpResult[] = organicResults.map(
        (item: SerpApiOrganicResult) => {
          const url = item.link || "";
          let domain = "";
          try {
            domain = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            domain = url;
          }

          const itemFeatures: SerpFeature[] = [];
          if (item.sitelinks) itemFeatures.push("sitelinks");

          return {
            position: item.position || start + organicResults.indexOf(item) + 1,
            url,
            domain,
            title: item.title || "",
            snippet: item.snippet || "",
            isTargetMatch: false,
            serpFeatures: itemFeatures,
          };
        }
      );

      allResults = [...allResults, ...pageResults];

      // Limit to target results
      if (allResults.length >= targetResults) {
        allResults = allResults.slice(0, targetResults);
        break;
      }
    }

    return {
      results: allResults,
      serpFeatures: Array.from(new Set(allFeatures)),
      totalResults,
    };
  }
}
