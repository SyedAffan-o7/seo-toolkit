import axios from "axios";
import {
  SerpProvider,
  SerpProviderOptions,
  SerpProviderResult,
} from "./provider";
import { SerpResult, SerpFeature } from "@/types/serp";

interface SerperOrganicResult {
  link?: string;
  position?: number;
  title?: string;
  snippet?: string;
  sitelinks?: unknown;
}

export class SerperProvider implements SerpProvider {
  name = "serper";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(options: SerpProviderOptions): Promise<SerpProviderResult> {
    const targetResults = options.numResults || 100;
    const allResults: SerpResult[] = [];
    const allFeatures: SerpFeature[] = [];

    const body: Record<string, unknown> = {
      q: options.keyword,
      num: Math.min(targetResults, 100),
      hl: "en",
      gl: options.geo || "us",
      page: 1,
    };

    if (options.device === "mobile") {
      body.device = "mobile";
    }

    const response = await axios.post(
      "https://google.serper.dev/search",
      body,
      {
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    const organicResults: SerperOrganicResult[] = data.organic || [];

    console.log(`[Serper] query="${options.keyword}" organic=${organicResults.length}`);

    if (data.answerBox) allFeatures.push("featured_snippet");
    if (data.peopleAlsoAsk) allFeatures.push("people_also_ask");
    if (data.localResults) allFeatures.push("local_pack");
    if (data.knowledgeGraph) allFeatures.push("knowledge_panel");
    if (data.images) allFeatures.push("image_pack");
    if (data.videos) allFeatures.push("video");

    organicResults.forEach((item) => {
      const url = item.link || "";
      let domain = "";
      try {
        domain = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        domain = url;
      }

      const result: SerpResult = {
        position: item.position || 0,
        url,
        domain,
        title: item.title || "",
        snippet: item.snippet || "",
        isTargetMatch: false,
        serpFeatures: item.sitelinks ? ["sitelinks"] : [],
      };
      allResults.push(result);
    });

    return {
      results: allResults.slice(0, targetResults),
      serpFeatures: Array.from(new Set(allFeatures)),
      totalResults: organicResults.length,
    };
  }
}
