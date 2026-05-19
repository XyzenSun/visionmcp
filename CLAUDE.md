# @xyzensun/visionmcp — 项目根层指引

## 项目概述

TypeScript 实现的 MCP stdio server，暴露单一工具 `readimg`：接收本地图片路径或 base64，转给用户通过环境变量配置的多模态后端（OpenAI / Anthropic / Gemini 三种格式之一），返回纯文本。已发布到 npm，启动方式 `npx -y @xyzensun/visionmcp`。

技术栈：Node >= 20，TypeScript ESM（`type: "module"`，编译目标 `ES2022 / NodeNext`），依赖 `@modelcontextprotocol/sdk` 与 `zod`，测试用 `vitest`。

## 目录结构

```
src/                源码（唯一可编辑的实现位置）
  index.ts          MCP server 入口，注册 readimg 工具
  config.ts         BASE_URL / FORMAT / API_KEY / MODEL 解析与校验（zod）
  schema.ts         readimg 输入 schema + image_path/image_base64 互斥校验
  image.ts          本地文件 / 原始 base64 / data URL → { base64, mimeType }
  timeout.ts        withTimeout：AbortController + 默认 120s
  errors.ts         UpstreamError、parseJsonResponse、消息截断工具
  providers/
    index.ts        按 FORMAT 做 lazy import
    types.ts        ProviderAdapter 接口与共享 SYSTEM_PROMPT
    base-url.ts     joinBaseUrl 拼接工具
    openai.ts       POST /v1/chat/completions
    anthropic.ts    POST /v1/messages
    gemini.ts       POST /v1beta/models/{model}:generateContent
tests/              vitest 单元测试（mock fetch，不打真实上游）
test/               手动 MCP 客户端冒烟脚本与测试图片
scripts/            开发辅助脚本（smoke.sh 等）
dist/               tsc 编译产物（仅由 `npm run build` 生成）
brainstorm/specs/   原始设计文档（不发布）
```

## 核心命令

| 命令 | 用途 |
| ---- | ---- |
| `npm run build` | tsc 编译到 dist/ |
| `npm test` | 跑 vitest，全部 mock fetch，不需要网络 |
| `scripts/smoke.sh` | 端到端 MCP 冒烟（包装脚本，详见下方） |
| `npm publish` | 由 `prepublishOnly` 自动串接 build + test |

端到端冒烟命令较长（涉及 dist 检查、默认 BASE_URL/FORMAT、默认图片路径、MCP client 启动），统一通过 `scripts/smoke.sh` 调用：

```bash
API_KEY=<key> MODEL=<model_id> scripts/smoke.sh [image_path] [prompt] [timeout_seconds]
```

可选环境变量：`BASE_URL`（默认 `https://api-inference.modelscope.ai`）、`FORMAT`（默认 `openai`）。注意这两个默认值由 `test/mcp-client.mjs` 注入，仅作用于冒烟流程；运行已发布的 server 本体（`npx ... visionmcp`）时 `BASE_URL` / `FORMAT` 仍由 `src/config.ts` 标为必填。

## 关键约束

### 构建产物
- `dist/` 永远由 `npm run build` 生成，禁止手动编辑或提交手工修改后的 dist。改实现请改 `src/`，再重新构建。
- `package.json` 的 `files` 限定只发布 `dist` + `README.md`，新增运行时需要的文件时记得追加。
- 发版走 `npm publish`：`prepublishOnly` 会自动跑 build + test，本地不要绕过这条路径。

### Schema 与输入校验
- `src/schema.ts` 是 `readimg` 输入的唯一权威；任何字段变更必须同步：① `analyzeImageInputShape` ② `superRefine` 互斥/冲突校验 ③ `tests/image.test.ts` 与/或 `tests/providers.test.ts` 用例 ④ `src/index.ts` 中工具描述与 example 块。
- 两条不可放宽的产品契约：`image_path` 与 `image_base64` 必须互斥；`image_path` 拒绝 `http(s)://`（避免 SSRF）。如需放宽，先在设计文档中重新论证。
- `DEFAULT_PROMPT`（`请详细描述这张图片`）与 `DEFAULT_TIMEOUT_SECONDS`（120）属于对外行为，修改视为破坏性变更，需对应升 minor/major。

### 测试与冒烟
- `tests/` 全部以 `vi.spyOn(globalThis, "fetch")` 形式 mock 上游，禁止在单测中发起真实网络请求；若运行单测时观察到真实网络错误，定位漏 mock 的 `fetch` 调用并补上对应的 spy，而不是放过。
- 端到端验证一律走 `scripts/smoke.sh`，它会先检查 `dist/index.js` 是否存在并提示 `npm run build`；不要把真实 `API_KEY` / `MODEL` 写进任何被 git 跟踪的文件。
- 新增字段或新 provider 时，必须同时补"请求构造"与"响应解析"两类用例（参考 `tests/providers.test.ts` 中现有三个 provider 的成对覆盖）。

### Provider 适配器
- 新 provider 模块路径 `src/providers/<name>.ts`，导出 `<name>Provider: ProviderAdapter`，并在 `src/providers/index.ts` 的 `LOADERS` 中添加 lazy import 条目（保持 lazy 是为了让未启用的 provider 不进入运行时内存）。
- URL 拼接必须经 `joinBaseUrl(config.baseUrl, "/path")`，不要手拼字符串，否则会在 `BASE_URL` 带/不带尾斜杠时出错。
- 必须复用 `SYSTEM_PROMPT`（`src/providers/types.ts` 导出）；各 provider 自行决定把它放在 `system` / `systemInstruction` 等价字段中下发。
- 必须用 `parseJsonResponse(response)` 解析上游响应：它统一抛 `UpstreamError` 并自动截断 body，避免泄露完整响应。
- 必须接受并向 `fetch` 转发 `request.signal`，否则 `withTimeout` 无法 abort。
- 新增 `FORMAT` 值时同步更新：① `src/config.ts` 的 `SUPPORTED_FORMATS` ② `LOADERS` ③ `README.md` 路径表 ④ `tests/providers.test.ts`。

### 错误信息
- 抛给 MCP 客户端的错误消息禁止包含 `API_KEY`、`Authorization` 头或其值；上游响应必须经 `truncateSummary()`，禁止把原始 body 直接拼进异常。

## 何时阅读外部资料

- 需要核对原始 MVP 范围、未覆盖场景的设计决策、或扩展需要追溯历史契约时：阅读 `brainstorm/specs/2026-05-16-vision-mcp-server-design.md`。日常编码无需打开。
- 需要查 MCP SDK 或 zod 的 API 用法时：使用 context7 MCP 工具获取当前文档，而不是凭记忆写。
