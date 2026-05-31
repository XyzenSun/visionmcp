# @xyzensun/visionmcp

[English](./README.md) | [中文](./README_CN.md)

一个 Node.js 实现的 MCP stdio server，为不具备原生多模态能力的 MCP 客户端暴露一个图片理解工具 `readimg`。工具会把图片转发给你配置的多模态大模型，返回纯文本结果。

内置三种上游请求格式：**OpenAI**、**Anthropic**、**Gemini**。

## 通过 MCP 安装/使用

无需全局安装，在 MCP 客户端里用 `npx` 拉起即可：

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

> 不要把 `API_KEY` 或包含密钥的 MCP 配置文件提交到仓库。

## 必填环境变量

| 变量名     | 说明                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| `BASE_URL` | 服务根 URL，例如 `https://api-inference.modelscope.ai`。**不要带 API 路径**，路径会根据 `FORMAT` 自动追加。 |
| `FORMAT`   | `openai`、`anthropic`、`gemini` 中的一个。                                              |
| `API_KEY`  | 上游服务的 API key。                                                                    |
| `MODEL`    | 传给上游接口的模型 ID。                                                                 |

## 工具：`readimg`

参数：

```ts
{
  image_path?: string;       // 本地绝对路径
  image_base64?: string;     // 原始 base64 或 data URL（data:image/png;base64,...）
  mime_type?: string;        // 可选，覆盖 MIME 类型
  prompt?: string;           // 可选，默认 "请详细描述这张图片"
  system_prompt?: string;    // 可选，自定义视觉 LLM 的系统提示词（默认：内置图像识别专家提示词）
  timeout_seconds?: number;  // 可选，默认 120 秒，超时会中断上游请求
}
```

- `image_path` 和 `image_base64` 二选一，必须有且只有一个。
- `image_path` 必须是本地路径，`http://` / `https://` URL 会被拒绝。
- MIME 推断：本地文件按扩展名、data URL 按前缀，推断不出则回退 `image/png`。
- 超时触发后通过 `AbortSignal` 中断上游请求，工具返回 `timeout after <N> seconds`。

### 本地路径示例

```json
{
  "image_path": "/absolute/path/to/image.png",
  "prompt": "请描述图片中的主要对象"
}
```

### Base64 示例

```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgo=",
  "prompt": "这张图片里有什么？",
  "timeout_seconds": 60
}
```

## 上游路径规范

| Format      | Method | URL                                                       |
| ----------- | ------ | --------------------------------------------------------- |
| `openai`    | POST   | `{BASE_URL}/v1/chat/completions`                          |
| `anthropic` | POST   | `{BASE_URL}/v1/messages`                                  |
| `gemini`    | POST   | `{BASE_URL}/v1beta/models/{MODEL}:generateContent`        |

所有请求都是**非流式**，统一带 `temperature: 0.7`，不发送 `max_tokens`。

## 不支持的能力

- 远端图片 URL（`image_path` 不允许 `http://` / `https://`）。
- 一次调用多张图片。
- 结构化 JSON 输出。
- 调用方自定义 `temperature` / `max_tokens`。
- 本地路径白名单或沙箱隔离。
- 偏离上述规范的自定义上游路径。

## 安全说明

本地文件以服务端进程的权限读取；MVP 不限制路径。仅在你自己掌控的可信本地 MCP 环境中使用。远端 URL fetch 已被禁用以避免 SSRF。

## 开发

```bash
npm install
npm run build
npm test
```

本地 MCP 客户端冒烟测试：

```bash
API_KEY=<your_key> \
MODEL=Qwen/Qwen3-VL-235B-A22B-Instruct \
node test/mcp-client.mjs ./test/sample.png "请描述这张图片"
```

## 许可

MIT
