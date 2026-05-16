import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads required environment variables", () => {
    expect(
      loadConfig({
        BASE_URL: "https://example.com/",
        FORMAT: "openai",
        API_KEY: "key",
        MODEL: "model",
      }),
    ).toEqual({
      baseUrl: "https://example.com",
      format: "openai",
      apiKey: "key",
      model: "model",
    });
  });

  it("rejects missing required variables", () => {
    expect(() => loadConfig({ FORMAT: "openai" })).toThrow(/BASE_URL|API_KEY|MODEL/);
  });

  it("rejects invalid FORMAT values", () => {
    expect(() =>
      loadConfig({
        BASE_URL: "https://example.com",
        FORMAT: "other",
        API_KEY: "key",
        MODEL: "model",
      }),
    ).toThrow(/FORMAT must be one of openai, anthropic, or gemini/);
  });
});
