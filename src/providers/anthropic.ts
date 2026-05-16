import { parseJsonResponse } from "../errors.js";
import { joinBaseUrl } from "./base-url.js";
import { SYSTEM_PROMPT, type ProviderAdapter } from "./types.js";

export const anthropicProvider: ProviderAdapter = {
  async analyze(config, request) {
    const response = await fetch(joinBaseUrl(config.baseUrl, "/v1/messages"), {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      signal: request.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: request.image.mimeType,
                  data: request.image.base64,
                },
              },
              { type: "text", text: request.prompt },
            ],
          },
        ],
      }),
    });

    return extractAnthropicText(await parseJsonResponse(response));
  },
};

export function extractAnthropicText(json: unknown): string {
  if (!isRecord(json) || !Array.isArray(json.content)) {
    throw new Error("Anthropic response did not contain extractable text");
  }

  for (const block of json.content) {
    if (isRecord(block) && block.type === "text" && typeof block.text === "string" && block.text.trim()) {
      return block.text;
    }
  }

  throw new Error("Anthropic response did not contain extractable text");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
