import type { ServerConfig } from "../config.js";
import type { LoadedImage } from "../image.js";

export type AnalyzeRequest = {
  prompt: string;
  image: LoadedImage;
  signal?: AbortSignal;
};

export type ProviderAdapter = {
  analyze(config: ServerConfig, request: AnalyzeRequest): Promise<string>;
};
