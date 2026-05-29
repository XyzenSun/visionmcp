#!/usr/bin/env node
import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { asErrorMessage } from "./errors.js";
import { loadImage } from "./image.js";
import { getProvider } from "./providers/index.js";
import { DEFAULT_PROMPT, analyzeImageInputShape, parseAnalyzeImageInput } from "./schema.js";
import { DEFAULT_TIMEOUT_SECONDS, withTimeout } from "./timeout.js";

const require = createRequire(import.meta.url);
const packageMetadata = require("../package.json") as { name: string; version: string };

const server = new McpServer({
  name: packageMetadata.name,
  version: packageMetadata.version,
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
      const image = await withTimeout(DEFAULT_TIMEOUT_SECONDS, () => loadImage(parsedInput));
      const provider = await getProvider(config.format);
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
