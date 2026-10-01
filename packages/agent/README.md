# @hamhome/agent

HamHome 内置的浏览器端 Agent 运行时。

`@hamhome/agent` 让网页、浏览器插件和内嵌助手可以在 Vercel AI SDK 之上获得 AI 对话、工具调用、页面上下文、技能知识和会话记忆能力。

> 本包源自开源项目 [browser-agent-sdk](https://github.com/bingoYB/browser-agent-sdk) 的 `packages/agent`，
> 已内置到本仓库并按 HamHome 的需求独立演进，不再跟随上游发布版本。

## 使用 (Usage)

作为 workspace 包直接引用，无需安装：

```json
{
  "dependencies": {
    "@hamhome/agent": "workspace:*"
  }
}
```

## 快速开始 (Quick Start)

```ts
import { createAgent, IndexedDBMemory } from "@hamhome/agent";
import { openaiProvider } from "@hamhome/agent/providers";

const agent = createAgent({
  providers: [openaiProvider],
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: "<your-api-key>",
  systemPrompt: "你是运行在当前网页中的智能助手。",
  memory: new IndexedDBMemory({ dbName: "browser-agent", maxMessages: 100 }),
  maxIterations: 5,
});

agent.tools.register({
  name: "getCurrentPage",
  description: "读取当前页面标题和地址。",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  execute: () => ({
    title: document.title,
    url: location.href,
  }),
});

const result = await agent.run("帮我总结当前页面", {
  tools: ["getCurrentPage"],
});

console.log(result.text);
```

## 核心特性 (Core Features)

- **Agent Runtime**: 提供 `run()` 与 `runStream()` 等执行方法。When the model still calls tools after `maxIterations` steps, the agent makes one extra step that asks for an answer from the gathered tool results; tool calls in that step are not executed. `result.usage` sums every step, including that one.
- **Tool Registry**: 支持 JSON Schema 验证、页面/会话级别的作用域 (`ToolScope`)。Tool names must match `^[a-zA-Z0-9_-]{1,64}$` for OpenAI and Anthropic, so `onConflict: "namespace"` produces `{namespace}_{name}`. Type unions such as `type: ["string", "null"]` are supported.
- **Command Registry**: 封装常用的工作流，包含输入与输出 Schema。
- **Page Tools**: 根据不同 URL 或路由动态切换页面级别的工具与 Prompt。
- **Skills**: 提供上下文能力 (`AgentSkillRuntime`)，以及技能工具与文档的动态加载。`skill_view` / `discoverSkill` / `activateSkill` are only exposed to the model when they can return something (an active skill to view, an inactive skill to discover), and the prompt index only mentions the exposed ones. After `discoverSkill` finds a skill, the model calls `activateSkill` to mount that skill's tools (set `discoverSkill.allowActivation: false` to turn this off). An activated skill stays active in later runs of the same session even when those requests do not match it; `result.pinnedSkillIds` lists these skills. When each turn uses a new agent, pass that list back as `skillContext.pinnedSkillIds`, which replaces what the agent remembers (`[]` drops them all). Commands on their own memory neither use nor change the pinned skills. `maxSkillContextTokens` caps the documents that `skill_view` and `activateSkill` return.
- **Memory**: 提供基于内存 (`InMemory`) 以及基于浏览器 IndexedDB 的多会话存储。`maxMessages` trims the oldest messages but never leaves a tool result without its tool call, and never drops the newest user message, so a single long tool loop may temporarily exceed the limit.
- **Security & Permissions**: 支持细粒度工具拦截与权限审批策略 (`DefaultSecurityPolicy`)。
- **MCP (Model Context Protocol)**: 原生支持连接并调用 MCP Server。
- **Planning Mode**: 提供 `PlanManager` 以支持复杂任务的任务拆分与计划管理。

## 模型支持 (Providers)

默认通过 Vercel AI SDK 解析模型。支持的 Provider 包含：

- `gateway`, `vercel`, `openai`, `openai-compatible`, `anthropic`, `google`, `xai`, `azure`, `amazon-bedrock`, `groq`, `deepinfra`, `mistral`, `togetherai`, `cohere`, `fireworks`, `deepseek`, `cerebras`, `perplexity`

The core entry bundles no provider. Import the definitions you need from `@hamhome/agent/providers` and pass them in `providers`; `provider` must name one of them (it defaults to `gateway`). Each AI SDK provider package is side-effect free, so the bundle only contains the providers you import. `allProviders` lists all of them for scripts and tests.

```ts
import { anthropicProvider, openaiCompatibleProvider } from "@hamhome/agent/providers";

const agent = createAgent({
  providers: [anthropicProvider, openaiCompatibleProvider],
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  apiKey: "<your-api-key>",
});
```

`providers` is not needed when `model` is already an AI SDK model instance. A custom `AiSdkProviderDefinition` (`{ name, supports, create }`) can replace a built-in one, for example to wrap the factory with custom auth.

支持自定义传入 `modelClient`, `languageModel` 或 `embeddingClient` 以便在特定场景（例如自定义认证、私有部署）下获得完全控制权。

## 工具 (Tools)

工具统一注册至 `agent.tools`。每次执行时接收经过验证的入参和包含 `agentId`, `sessionId`, `runId`, `toolCallId`, `pageId`, `url`, `signal`, `metadata` 等运行时上下文。

```ts
agent.tools.register({
  name: "addNumbers",
  description: "计算两个数字之和。",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
    },
    required: ["a", "b"],
    additionalProperties: false,
  },
  execute: (input: { a: number; b: number }) => ({
    sum: input.a + input.b,
  }),
});
```

## 命令 (Commands)

Commands package a fixed task (classification, summarization, extraction) as a prompt plus optional input/output schemas. Register reusable commands on `agent.commands`, or pass a definition straight to `run()` for a one-off task without registering it:

```ts
import type { AgentCommand } from "@hamhome/agent";

const translateCommand: AgentCommand<{ text: string }, { translatedText: string }> = {
  name: "translate",
  prompt: (input) => `Translate into English:\n${input.text}`,
  outputSchema: {
    type: "object",
    properties: { translatedText: { type: "string" } },
    required: ["translatedText"],
    additionalProperties: false,
  },
};

const { output } = await agent.commands.run(translateCommand, { text: "你好" }, {
  systemPrompt: "You are a precise translator.",
  temperature: 0.1,
});
```

A command runs on its own throwaway memory: it does not see the conversation history and does not add to it. Set `useSessionMemory: true` on the command (or on one run) to run it inside the conversation; `sessionId` then picks the session, defaulting to the active one.

## 向量 (Embedding)

```ts
import { createEmbeddingClient } from "@hamhome/agent";
import { openaiProvider } from "@hamhome/agent/providers";

const embedder = createEmbeddingClient({
  providers: [openaiProvider],
  provider: "openai",
  model: "text-embedding-3-small",
  apiKey: "<your-api-key>",
  dimensions: 512, // sent as `dimensions` / `outputDimensionality` where the provider supports it
});

const vector = await embedder.embed("退货政策");
```

`providerOptions` configures the provider factory (for example `headers` or `fetch`); it is not a per-call model option.

## 安全与权限控制 (Security & Permissions)

SDK 提供了 `DefaultSecurityPolicy` 可以在调用工具时进行权限管控（例如拦截危险操作）。配合拦截器 `ToolInterceptor`，可以灵活地校验或篡改请求：

```ts
import { createAgent, DefaultSecurityPolicy } from "@hamhome/agent";

const securityPolicy = new DefaultSecurityPolicy({
  defaultMode: "allow",
  rules: { deleteFile: "ask" }, // tool name -> "allow" | "ask" | "deny"
  onAsk: async (toolName, input, context, reason) => {
    // Show an approval prompt in your UI and resolve with the user's decision.
    return confirm(`Allow ${toolName}?`);
  },
});

const agent = createAgent({
  // ...
  securityPolicy,
});
```

Without `onAsk`, the agent emits a `tool.call.requires_action` event and waits for `agent.approveToolCall(toolCallId, approved)`. A denied or rejected call is not executed; the model receives a `ToolPermissionError` tool result and the `tool.call.failed` event carries the same error, so the UI can tell a rejection apart from a tool failure.

Aborting the run's `signal` stops waiting for a pending approval (through either `onAsk` or `approveToolCall`), and the run rejects with the abort reason. Any tool calls left in that step get an error tool result, so the session history stays valid for the next run.

Interceptors (`AgentConfig.interceptors`) run around every tool call: `beforeExecute` in order, `afterExecute` in reverse order. Return a value to replace the input or output, or return nothing to keep it unchanged:

```ts
const agent = createAgent({
  // ...
  interceptors: [
    {
      beforeExecute: (toolName, input) => {
        console.log("tool call", toolName, input); // observe only: input is kept
      },
    },
  ],
});
```

## MCP 支持 (Model Context Protocol)

你可以很方便地将标准 MCP Server 对接至 Agent。The client connects over Streamable HTTP (stdio servers are not supported in the browser) and registers the server's tools on `agent.tools`:

```ts
import { connectMcpServer } from "@hamhome/agent";

const connection = await connectMcpServer(agent, "https://mcp.example.com/mcp", {
  namespace: "docs", // tools are registered as `docs_{toolName}`
});

// Re-read the server's tool list after it changes.
await connection.refreshTools();

// Unregisters the server's tools and closes the connection.
await connection.disconnect();
```

## 计划模式 (Planning Mode)

针对长链路和复杂任务，提供 `PlanManager` 来管理任务的状态与进度：

```ts
import { PlanManager } from "@hamhome/agent";

const plan = new PlanManager({ namespace: "plan" });
// plan.getTools() returns the planning tools: plan_createTask, plan_updateTask, ...
agent.tools.registerMany(plan.getTools());
```

## 上下文窗口 (Context Window)

By default every model step receives the whole session history. Set `contextWindow` to fit it into a token budget instead:

```ts
const agent = createAgent({
  // ...
  contextWindow: {
    maxTokens: 16000, // estimated tokens of history per model step
    maxToolResultTokens: 4000, // longer tool results are cut down, even under budget
    summarize: true, // summarize dropped turns with the agent's model
  },
});
```

Over budget, image attachments of earlier turns go first, then whole turns from the oldest. A turn starts at a user message and keeps its tool calls with their results; the newest turn is always kept. With `summarize`, the dropped turns are summarized with one extra model call (counted in `result.usage`), the summary is sent ahead of the kept turns, and later steps only summarize newly dropped messages. A failed summary falls back to dropping. Only the request is fitted: the stored history is unchanged. The agent emits `context.compacted` when more turns fall out of the window.

Tokens are estimated (about 4 characters or 1 CJK character per token, 1000 per image); pass `estimateTokens` for a real tokenizer. `TokenBudgetContextBuilder` implements this; create one yourself and pass it as `contextBuilder` to share its summary cache across agents, or implement `ContextBuilder` for a custom strategy.

## 流式输出 (Streaming)

通过 `runStream()` 可获取运行时生命周期事件，非常适用于在聊天 UI、Debug 面板中展现调用状态。

```ts
for await (const event of agent.runStream("查询页面信息")) {
  if (event.type === "message.delta") {
    console.log(event.delta);
  }

  if (event.type === "agent.completed") {
    console.log(event.result.text);
  }
}
```

Every event emitted during a run carries that run's `runId` (also returned as `result.runId`), and tool call events carry the model's `toolCallId`. `runStream()` yields only its own run's events, so concurrent runs on one agent stay apart. Pass `runId` in the run options to use your own id, such as a UI turn id. Registry events emitted outside a run (`tool.registered`, `page.changed`, ...) have no `runId` and are not part of any stream.

Models that expose their reasoning stream it as `reasoning.delta` events, separate from the answer's `message.delta`. Provider errors during streaming reject the stream like they reject `run()`. Leaving the loop early (`break`, `return` or a thrown error) aborts the run, so an abandoned stream stops calling the model and tools; an abort never triggers the `auto` invocation-mode fallback.

## License

MIT
