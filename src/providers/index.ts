import type { ProviderFormat } from "../config.js";
import type { ProviderAdapter } from "./types.js";

const LOADERS: Record<ProviderFormat, () => Promise<ProviderAdapter>> = {
  openai: async () => (await import("./openai.js")).openaiProvider,
  anthropic: async () => (await import("./anthropic.js")).anthropicProvider,
  gemini: async () => (await import("./gemini.js")).geminiProvider,
};

export async function getProvider(format: ProviderFormat): Promise<ProviderAdapter> {
  return LOADERS[format]();
}

export type { AnalyzeRequest, ProviderAdapter } from "./types.js";
