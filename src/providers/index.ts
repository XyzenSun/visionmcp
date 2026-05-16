import type { ProviderFormat } from "../config.js";
import { anthropicProvider } from "./anthropic.js";
import { geminiProvider } from "./gemini.js";
import { openaiProvider } from "./openai.js";
import type { ProviderAdapter } from "./types.js";

const PROVIDERS: Record<ProviderFormat, ProviderAdapter> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

export function getProvider(format: ProviderFormat): ProviderAdapter {
  return PROVIDERS[format];
}

export type { AnalyzeRequest, ProviderAdapter } from "./types.js";
