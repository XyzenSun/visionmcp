import { parseJsonResponse } from "../errors.js";
import { joinBaseUrl } from "./base-url.js";
import type { ProviderAdapter } from "./types.js";

export const openaiProvider: ProviderAdapter = {
  async analyze(config, request) {
    const response = await fetch(joinBaseUrl(config.baseUrl, "/v1/chat/completions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: request.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: request.systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: request.prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${request.image.mimeType};base64,${request.image.base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    return extractOpenAiText(await parseJsonResponse(response));
  },
};

export function extractOpenAiText(json: unknown): string {
  if (!isRecord(json)) {
    throw new Error("OpenAI response did not contain extractable text");
  }

  const choices = json.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new Error("OpenAI response did not contain extractable text");
  }

  const message = choices[0].message;
  if (!isRecord(message)) {
    throw new Error("OpenAI response did not contain extractable text");
  }

  const content = message.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (isRecord(block) && typeof block.text === "string" && block.text.trim()) {
        return block.text;
      }
    }
  }

  throw new Error("OpenAI response did not contain extractable text");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
