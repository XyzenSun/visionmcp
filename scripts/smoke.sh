#!/usr/bin/env bash
# Wrapper around test/mcp-client.mjs for end-to-end MCP smoke tests.
# Usage:
#   API_KEY=<key> MODEL=<model_id> scripts/smoke.sh [image_path] [prompt] [timeout_seconds]
# Optional env: BASE_URL (default: https://api-inference.modelscope.ai), FORMAT (default: openai).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${1:-$ROOT/test/sample.png}"
PROMPT="${2:-请详细描述这张图片}"
TIMEOUT="${3:-}"

if [[ -z "${API_KEY:-}" || -z "${MODEL:-}" ]]; then
  echo "API_KEY and MODEL must be set in the environment." >&2
  echo "Example: API_KEY=sk-... MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct scripts/smoke.sh" >&2
  exit 1
fi

if [[ ! -f "$ROOT/dist/index.js" ]]; then
  echo "dist/index.js missing — run 'npm run build' first." >&2
  exit 1
fi

cd "$ROOT"
if [[ -n "$TIMEOUT" ]]; then
  exec node test/mcp-client.mjs "$IMAGE" "$PROMPT" "$TIMEOUT"
else
  exec node test/mcp-client.mjs "$IMAGE" "$PROMPT"
fi
