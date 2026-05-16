#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { asErrorMessage } from "./errors.js";
import { loadImage } from "./image.js";
import { getProvider } from "./providers/index.js";
import { DEFAULT_PROMPT, analyzeImageInputShape, parseAnalyzeImageInput } from "./schema.js";
import { DEFAULT_TIMEOUT_SECONDS, withTimeout } from "./timeout.js";

const server = new McpServer({
  name: "visionmcp",
  version: "0.1.0",
});

server.tool(
  "readimg",
  `readimg is an image-reading tool backed by a specialized vision LLM. It accepts a base64-encoded image or an absolute local file path, and supports an optional custom prompt (a sensible default is used when omitted) and a configurable timeout (defaults to 120 seconds).
  there is an json scheme example
<example>
{
  "image_path": "/absolute/path/to/photo.png",
  "prompt": "What objects are visible in this image?",
  "timeout_seconds": 60
}
</example>`,
  analyzeImageInputShape,
  async (input) => {
    try {
      const parsedInput = parseAnalyzeImageInput(input);
      const config = loadConfig();
      const image = await loadImage(parsedInput);
      const provider = getProvider(config.format);
      const text = await withTimeout(parsedInput.timeout_seconds ?? DEFAULT_TIMEOUT_SECONDS, (signal) =>
        provider.analyze(config, {
          prompt: parsedInput.prompt ?? DEFAULT_PROMPT,
          image,
          signal,
        }),
      );

      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      throw new Error(asErrorMessage(error));
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
