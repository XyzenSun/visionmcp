import { parseJsonResponse } from "../errors.js";
import { joinBaseUrl } from "./base-url.js";
import type { ProviderAdapter } from "./types.js";

export const geminiProvider: ProviderAdapter = {
  async analyze(config, request) {
    const response = await fetch(joinBaseUrl(config.baseUrl, `/v1beta/models/${encodeURIComponent(config.model)}:generateContent`), {
      method: "POST",
      headers: {
        "x-goog-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      signal: request.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemPrompt }],
        },
        contents: [
          {
            parts: [
              { text: request.prompt },
              {
                inline_data: {
                  mime_type: request.image.mimeType,
                  data: request.image.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    return extractGeminiText(await parseJsonResponse(response));
  },
};

export function extractGeminiText(json: unknown): string {
  if (!isRecord(json) || !Array.isArray(json.candidates)) {
    throw new Error("Gemini response did not contain extractable text");
  }

  for (const candidate of json.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
      continue;
    }

    for (const part of candidate.content.parts) {
      if (isRecord(part) && typeof part.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }

  throw new Error("Gemini response did not contain extractable text");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
