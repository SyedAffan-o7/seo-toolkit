import { openai, isAiEnabled } from "./openai";
import { buildAuditPrompt, buildMetaGeneratorPrompt } from "./prompts";
import type { AuditSuggestion } from "@/types/audit";

interface AiAuditOptions {
  keyword: string;
  yourUrl: string;
  competitorUrl: string;
  yourAudit: Record<string, unknown>;
  competitorAudit: Record<string, unknown>;
  keywordComparison: Record<string, unknown>;
  top10Analysis: Record<string, unknown> | null;
  yourPosition: number | null;
  competitorPosition: number | null;
}

export async function generateAiSuggestions(
  opts: AiAuditOptions
): Promise<AuditSuggestion[]> {
  if (!isAiEnabled()) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = buildAuditPrompt(opts);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert SEO strategist. Respond only with valid JSON arrays. No markdown, no explanations outside JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty AI response");
  }

  const parsed = JSON.parse(content);
  const suggestions: AuditSuggestion[] = Array.isArray(parsed)
    ? parsed
    : parsed.suggestions || parsed.data || [];

  // Validate and normalize
  return suggestions
    .filter((s) => s.message && s.action)
    .map((s) => ({
      category: ["critical", "warning", "info"].includes(s.category)
        ? (s.category as "critical" | "warning" | "info")
        : "info",
      priority: Math.max(1, Math.min(10, Number(s.priority) || 5)),
      message: String(s.message),
      action: String(s.action),
      yourValue: String(s.yourValue ?? ""),
      competitorValue: String(s.competitorValue ?? ""),
      impact: String(s.impact ?? ""),
    }));
}

interface MetaOption {
  text: string;
  length: number;
  angle: string;
}

interface MetaGeneratorResult {
  titles: MetaOption[];
  descriptions: MetaOption[];
}

export async function generateAiMetaTags(opts: {
  keyword: string;
  currentTitle: string;
  currentMeta: string;
  h1: string;
  pageTopic: string;
  competitorTitle?: string;
  competitorMeta?: string;
}): Promise<MetaGeneratorResult> {
  if (!isAiEnabled()) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = buildMetaGeneratorPrompt(opts);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert SEO copywriter. Respond only with valid JSON. No markdown.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty AI response");
  }

  const parsed = JSON.parse(content);
  return {
    titles: (parsed.titles || []).map((t: unknown) => ({
      text: String((t as Record<string, unknown>).text ?? ""),
      length: Number((t as Record<string, unknown>).length ?? 0),
      angle: String((t as Record<string, unknown>).angle ?? ""),
    })),
    descriptions: (parsed.descriptions || []).map((d: unknown) => ({
      text: String((d as Record<string, unknown>).text ?? ""),
      length: Number((d as Record<string, unknown>).length ?? 0),
      angle: String((d as Record<string, unknown>).angle ?? ""),
    })),
  };
}
