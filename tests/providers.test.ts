import { afterEach, describe, expect, it, vi } from "vitest";

import type { ServerConfig } from "../src/config.js";
import { parseJsonResponse } from "../src/errors.js";
import { anthropicProvider, extractAnthropicText } from "../src/providers/anthropic.js";
import { geminiProvider, extractGeminiText } from "../src/providers/gemini.js";
import { openaiProvider, extractOpenAiText } from "../src/providers/openai.js";
import { SYSTEM_PROMPT } from "../src/providers/types.js";
import { DEFAULT_TIMEOUT_SECONDS, withTimeout } from "../src/timeout.js";

const image = { base64: "iVBORw0KGgo=", mimeType: "image/png" };
const config: ServerConfig = {
  baseUrl: "https://api.example.com",
  format: "openai",
  apiKey: "secret",
  model: "vision-model",
};

describe("provider request construction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs OpenAI requests and extracts text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ choices: [{ message: { content: "answer" } }] }));

    await expect(openaiProvider.analyze(config, { prompt: "describe", image })).resolves.toBe("answer");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = requestBody(fetchMock);
    expect(body.model).toBe("vision-model");
    expect(body.temperature).toBe(0.7);
    expect(body.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content[1].image_url.url).toBe(`data:image/png;base64,${image.base64}`);
  });

  it("constructs Anthropic requests and extracts text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "answer" }] }));

    await expect(anthropicProvider.analyze({ ...config, format: "anthropic" }, { prompt: "describe", image })).resolves.toBe("answer");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-api-key": "secret",
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = requestBody(fetchMock);
    expect(body.system).toBe(SYSTEM_PROMPT);
    expect(body.messages[0].content[0].source).toEqual({
      type: "base64",
      media_type: "image/png",
      data: image.base64,
    });
  });

  it("constructs Gemini requests and extracts text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: "answer" }] } }] }),
    );

    await expect(geminiProvider.analyze({ ...config, format: "gemini" }, { prompt: "describe", image })).resolves.toBe("answer");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1beta/models/vision-model:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-goog-api-key": "secret",
          "Content-Type": "application/json",
        },
      }),
    );
    const body = requestBody(fetchMock);
    expect(body.systemInstruction).toEqual({ parts: [{ text: SYSTEM_PROMPT }] });
    expect(body.contents[0].parts[1].inline_data).toEqual({
      mime_type: "image/png",
      data: image.base64,
    });
    expect(body.generationConfig.temperature).toBe(0.7);
  });
});

describe("provider response parsing", () => {
  it("extracts first OpenAI text block", () => {
    expect(extractOpenAiText({ choices: [{ message: { content: [{ text: "block text" }] } }] })).toBe("block text");
  });

  it("extracts first Anthropic text block", () => {
    expect(extractAnthropicText({ content: [{ type: "image" }, { type: "text", text: "block text" }] })).toBe("block text");
  });

  it("extracts first Gemini candidate text part", () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: "block text" }] } }] })).toBe("block text");
  });

  it("fails when no text is present", () => {
    expect(() => extractOpenAiText({ choices: [{ message: { content: [] } }] })).toThrow(/extractable text/);
    expect(() => extractAnthropicText({ content: [] })).toThrow(/extractable text/);
    expect(() => extractGeminiText({ candidates: [] })).toThrow(/extractable text/);
  });
});

describe("timeout handling", () => {
  it("aborts the upstream request and reports a timeout error", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal ?? undefined;
          signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
      );

      const promise = withTimeout(1, (signal) =>
        openaiProvider.analyze(config, { prompt: "describe", image, signal }),
      );
      const assertion = expect(promise).rejects.toThrow(/timeout after 1 seconds/);

      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it("uses the documented default timeout of 120 seconds", () => {
    expect(DEFAULT_TIMEOUT_SECONDS).toBe(120);
  });
});

describe("upstream errors", () => {
  it("includes non-2xx status and truncates response summary", async () => {
    const response = new Response("x".repeat(600), { status: 500 });

    await expect(parseJsonResponse(response)).rejects.toThrow(/status 500: x{500}\.\.\./);
  });
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function requestBody(fetchMock: ReturnType<typeof vi.spyOn>): any {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}
