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

    if (!this.apiKey) {
      throw new Error("Serper API key is not configured. Set SERP_API_KEY in environment variables.");
    }

    const perPage = 10;
    const totalPages = Math.ceil(targetResults / perPage);
    console.log(`[Serper] Starting search: keyword="${options.keyword}", targetResults=${targetResults}, totalPages=${totalPages}, geo=${options.geo}, device=${options.device}`);

    for (let page = 1; page <= totalPages; page++) {
      const body: Record<string, unknown> = {
        q: options.keyword,
        num: perPage,
        hl: "en",
        gl: options.geo || "us",
        page,
      };

      if (options.device === "mobile") {
        body.device = "mobile";
      }

      let response;
      try {
        response = await axios.post(
          "https://google.serper.dev/search",
          body,
          {
            headers: {
              "X-API-KEY": this.apiKey,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response) {
          const msg = err.response.data?.message || err.response.statusText || "Unknown Serper API error";
          throw new Error(`Serper API error (${err.response.status}): ${msg}`);
        }
        throw err;
      }

      const data = response.data;
      const organicResults: SerperOrganicResult[] = data.organic || [];

      console.log(`[Serper] query="${options.keyword}" page=${page} organic=${organicResults.length}`);

      if (page === 1) {
        if (data.answerBox) allFeatures.push("featured_snippet");
        if (data.peopleAlsoAsk) allFeatures.push("people_also_ask");
        if (data.localResults) allFeatures.push("local_pack");
        if (data.knowledgeGraph) allFeatures.push("knowledge_panel");
        if (data.images) allFeatures.push("image_pack");
        if (data.videos) allFeatures.push("video");
      }

      organicResults.forEach((item, idx) => {
        const url = item.link || "";
        let domain = "";
        try {
          domain = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          domain = url;
        }

        // Calculate absolute position: (page - 1) * perPage + index + 1
        // Serper's item.position is relative to the page, so we calculate our own
        const absolutePosition = (page - 1) * perPage + idx + 1;

        const result: SerpResult = {
          position: absolutePosition,
          url,
          domain,
          title: item.title || "",
          snippet: item.snippet || "",
          isTargetMatch: false,
          serpFeatures: item.sitelinks ? ["sitelinks"] : [],
        };
        allResults.push(result);
      });

      if (organicResults.length < perPage) {
        console.log(`[Serper] Stopping early: only got ${organicResults.length} results on page ${page} (expected ${perPage})`);
        break;
      }

      if (allResults.length >= targetResults) {
        console.log(`[Serper] Reached target: have ${allResults.length}, need ${targetResults}`);
        break;
      }
      console.log(`[Serper] Page ${page} complete, have ${allResults.length} total, continuing...`);
    }

    const finalResults = allResults.slice(0, targetResults);
    console.log(`[Serper] Finished search: requested=${targetResults}, fetched=${allResults.length}, returning=${finalResults.length}`);
    return {
      results: finalResults,
      serpFeatures: Array.from(new Set(allFeatures)),
      totalResults: finalResults.length,
    };
  }
}
