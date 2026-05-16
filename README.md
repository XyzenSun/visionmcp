# @xyzensun/visionmcp

[English](./README.md) | [中文](./README_CN.md)

A Node.js MCP stdio server that exposes a single image-understanding tool (`readimg`) for MCP clients that lack native multimodal input. The tool forwards the image to a user-configured multimodal model and returns plain text.

Supports three upstream request formats out of the box: **OpenAI**, **Anthropic**, **Gemini**.

## Install / use via MCP

No global install needed. Configure your MCP client to launch the package via `npx`:

```json
{
  "mcpServers": {
    "visionmcp": {
      "command": "npx",
      "args": ["-y", "@xyzensun/visionmcp"],
      "env": {
        "BASE_URL": "https://api-inference.modelscope.ai",
        "FORMAT": "openai",
        "API_KEY": "your_api_key_here",
        "MODEL": "Qwen/Qwen3-VL-235B-A22B-Instruct"
      }
    }
  }
}
```

> Do not commit `API_KEY` or any MCP config file containing secrets.

## Required environment variables

| Variable   | Description                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `BASE_URL` | Service root URL, e.g. `https://api-inference.modelscope.ai`. **Do not include the API path** — paths are appended automatically per `FORMAT`. |
| `FORMAT`   | One of `openai`, `anthropic`, `gemini`.                                                           |
| `API_KEY`  | Upstream provider API key.                                                                        |
| `MODEL`    | Model identifier sent to the upstream endpoint.                                                   |

## Tool: `readimg`

Parameters:

```ts
{
  image_path?: string;       // absolute local file path
  image_base64?: string;     // raw base64 or data URL (data:image/png;base64,...)
  mime_type?: string;        // optional MIME override
  prompt?: string;           // optional; default: "请详细描述这张图片"
  timeout_seconds?: number;  // optional; default 120; aborts upstream on timeout
}
```

- Exactly one of `image_path` or `image_base64` must be provided.
- `image_path` must be a local path; `http://` / `https://` URLs are rejected.
- MIME inference: file extension for local paths, prefix for data URLs, fallback `image/png`.
- On timeout, the upstream request is aborted via `AbortSignal` and the tool returns `timeout after <N> seconds`.

### Local path example

```json
{
  "image_path": "/absolute/path/to/image.png",
  "prompt": "Describe the main objects in this image."
}
```

### Base64 example

```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgo=",
  "prompt": "What is in this image?",
  "timeout_seconds": 60
}
```

## Provider path conventions

| Format      | Method | URL                                                       |
| ----------- | ------ | --------------------------------------------------------- |
| `openai`    | POST   | `{BASE_URL}/v1/chat/completions`                          |
| `anthropic` | POST   | `{BASE_URL}/v1/messages`                                  |
| `gemini`    | POST   | `{BASE_URL}/v1beta/models/{MODEL}:generateContent`        |

All requests are non-streaming and send `temperature: 0.7`. `max_tokens` is not set.

## What is not supported

- Remote image URLs (`http://` / `https://` in `image_path`).
- Multiple images per call.
- Structured JSON output.
- Caller-provided `temperature` / `max_tokens`.
- Local path allowlists or isolation.
- Custom upstream endpoint paths beyond the conventions above.

## Security notes

Local files are read with the server process's filesystem permissions; the MVP does not restrict paths. Use only in trusted local MCP environments under your own control. Remote URL fetching is disabled to avoid SSRF.

## Development

```bash
npm install
npm run build
npm test
```

Manual MCP client smoke test:

```bash
API_KEY=<your_key> \
MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct \
node test/mcp-client.mjs ./test/sample.png "Describe this image"
```

## License

MIT
