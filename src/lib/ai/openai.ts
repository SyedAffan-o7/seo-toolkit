import OpenAI from "openai";

const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "[AI] No OpenAI API key found. Set OPENAI_KEY or OPENAI_API_KEY in environment."
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || "sk-fake",
});

export function isAiEnabled(): boolean {
  return !!apiKey && apiKey !== "sk-fake" && !apiKey.startsWith("sk-fake");
}
