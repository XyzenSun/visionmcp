#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const imagePath = process.argv[2];
const prompt = process.argv[3] ?? "请详细描述这张图片";
const timeoutArg = process.argv[4] ?? process.env.TIMEOUT_SECONDS;
const timeoutSeconds = timeoutArg ? Number(timeoutArg) : undefined;

if (timeoutArg !== undefined && (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)) {
  console.error("Invalid TIMEOUT_SECONDS value; must be a positive number.");
  process.exit(1);
}

const apiKey = process.env.API_KEY ?? process.env.MODELSCOPE_API_KEY;
const baseUrl = process.env.BASE_URL ?? "https://api-inference.modelscope.ai";
const format = process.env.FORMAT ?? "openai";
const model = process.env.MODEL;

if (!imagePath) {
  console.error("Usage: API_KEY=<your_key> MODEL=<model_id> node test/mcp-client.mjs <image_path> [prompt] [timeout_seconds]");
  process.exit(1);
}

if (!apiKey) {
  console.error("Missing API_KEY. Set API_KEY or MODELSCOPE_API_KEY in the environment.");
  process.exit(1);
}

if (!model) {
  console.error("Missing MODEL. Set MODEL in the environment (e.g. Qwen/Qwen3-VL-235B-A22B-Instruct).");
  process.exit(1);
}

const resolvedImagePath = resolve(imagePath);
if (!existsSync(resolvedImagePath)) {
  console.error(`Image file does not exist: ${resolvedImagePath}`);
  process.exit(1);
}

const client = new Client({
  name: "vision-mcp-test-client",
  version: "0.1.0",
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(projectRoot, "dist/index.js")],
  cwd: projectRoot,
  env: {
    BASE_URL: baseUrl,
    FORMAT: format,
    API_KEY: apiKey,
    MODEL: model,
  },
  stderr: "inherit",
});

try {
  await client.connect(transport);

  const result = await client.callTool({
    name: "readimg",
    arguments: {
      image_path: resolvedImagePath,
      prompt,
      ...(timeoutSeconds !== undefined ? { timeout_seconds: timeoutSeconds } : {}),
    },
  });

  for (const item of result.content) {
    if (item.type === "text") {
      console.log(item.text);
    }
  }
} finally {
  await client.close();
}
