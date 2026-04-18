# Agent 使用文档

本文档基于当前仓库里的 `src/agent`、`src/tools`、`src/skill`、`src/memory`、`src/mcp`、`src/scheduler` 实现整理，描述的是这个项目里 `Agent` 的真实行为，而不是通用概念说明。

## 1. 能力概览

`Agent` 是一个运行时编排层，负责把下面这些模块组合起来：

- `model`：内部初始化的模型实例，用户只需要传 `provider/baseURL/apiKey/model`
- `tools`：普通工具注册表 `ToolRegistry`
- `skills`：按需加载的 `SkillLoader`
- `memory`：对话记忆 `BaseMemory`
- `mcp`：MCP server 聚合器 `MCPRegistry`
- `hooks`：运行生命周期事件
- `scheduler`：任务编排与 workflow 执行

它提供 3 个最核心的调用方式：

- `step()`：只执行一轮模型调用，不自动继续 tool loop
- `run()`：自动循环执行，直到模型不再发起 `toolCalls`
- `stream()`：流式输出文本，同时保留和 `run()` 一样的自动 tool loop

## 2. 最小可用示例

```ts
import { z } from "zod";
import { Agent } from "ai-sdk-demo";

const agent = new Agent({
  name: "demo-agent",
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: "You are a helpful assistant.",
});

agent.registerTool(
  "calculator",
  {
    description: "Add two numbers",
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ a, b }) => a + b,
  },
);

const result = await agent.run("请帮我算一下 12 + 30");

console.log(result.text);
console.log(result.iterations);
console.log(result.steps);
```

如果模型直接回答，不触发工具：

- `result.text` 是最终文本
- `result.steps` 为空数组
- `result.iterations` 一般为 `1`

如果模型先调用工具再继续回答：

- `Agent` 会自动执行工具
- 自动把 `tool-result` 追加回对话
- 再次调用模型，直到没有新的 `toolCalls`

## 3. 构造函数

```ts
const agent = new Agent({
  name: "demo-agent",
  provider,
  model,
  apiKey,
  baseURL,
  memory,
  tools,
  skills,
  mcp,
  systemPrompt,
  workspace,
});
```

### `AgentOptions`

| 字段 | 说明 |
| --- | --- |
| `name` | agent 名称，默认是 `"agent"` |
| `provider` | 模型提供方，默认按 `openai` 处理；非 OpenAI 也可走 OpenAI-compatible |
| `model` | 必填，模型名字符串；高级场景也兼容直接传 `LanguageModel` |
| `apiKey` / `apikey` | provider 的 API key |
| `baseURL` / `baseUrl` / `baseurl` | 自定义模型网关地址；接 OpenAI-compatible 服务时通常要传 |
| `memory` | 可选，对话记忆实现 |
| `tools` | 可选，`ToolRegistry` |
| `skills` | 可选，`SkillLoader` |
| `mcp` | 可选，`MCPRegistry` |
| `systemPrompt` | 可选，支持字符串或异步函数 |
| `workspace` | 可选，主要用于 skill 相关 system prompt 展示，默认 `"your workspace"` |

说明：

- `provider: "openai"` 时，内部使用 `@ai-sdk/openai` 初始化
- 其他 provider 当前按 OpenAI-compatible 方式处理，通常需要同时传 `baseURL`

## 4. `step()`、`run()`、`stream()` 的区别

### `step(input, options)`

适合：

- 只想执行一轮 LLM 调用
- 想自己接管 tool loop
- 想调试单轮 prompt / tools 输入

特点：

- 会把输入消息和 system prompt 组装好
- 会把 tools 传给模型
- 不会自动执行 `toolCalls`
- 返回 `AgentStepResult`

注意：

- 如果配置了 `memory`，`step()` 会先保存输入消息
- 但它不会像 `run()` 那样自动把 assistant 最终回复写回 `memory`

### `run(input, options)`

适合绝大多数场景。

特点：

- 自动运行多轮 loop
- 每轮如果模型返回 `toolCalls`，就执行工具并继续下一轮
- 直到模型不再返回 `toolCalls`
- 返回 `AgentRunResult`

### `stream(input, callbacks, options)`

适合：

- 聊天 UI
- 需要边生成边渲染文本

特点：

- 文本通过 `onText` 回调持续输出
- 工具调用可以通过 `onToolCall` 观察
- 最终仍然返回完整的 `AgentRunResult`
- 内部仍然是自动 loop，不需要你手动续跑

示例：

```ts
const result = await agent.stream(
  "帮我查询信息并总结",
  {
    onStart: (context) => {
      console.log("runId:", context.runId);
    },
    onText: (delta) => {
      process.stdout.write(delta);
    },
    onToolCall: (toolCall) => {
      console.log("tool call:", toolCall);
    },
    onFinish: (finalResult) => {
      console.log("\nfinish:", finalResult.finishReason);
    },
  },
);
```

## 5. 输入与返回值

### 输入 `AgentInput`

`Agent` 支持 3 种输入：

```ts
await agent.run("hello");

await agent.run({
  role: "user",
  content: "hello",
});

await agent.run([
  { role: "user", content: "hello" },
  { role: "assistant", content: "hi" },
]);
```

### `AgentRunResult` 重点字段

| 字段 | 说明 |
| --- | --- |
| `text` | 最终输出文本 |
| `messages` | 本次运行结束后的完整消息列表 |
| `steps` | 每一轮工具调用的详细记录 |
| `iterations` | 实际执行轮数 |
| `runId` | 本次运行唯一 ID |
| `context` | 运行上下文 |
| `toolCalls` | 最后一轮模型响应里的工具调用 |
| `usage` | token 使用量，取决于底层 provider 是否返回 |

其中 `steps` 很适合做调试、可观测性和回放：

```ts
for (const step of result.steps) {
  console.log(step.stepNumber);
  console.log(step.toolCalls);
  console.log(step.toolResults);
}
```

## 6. 工具用法

### 6.1 注册普通工具

`agent.registerTool()` 和 `tools.registerTool()` 都直接接收原始配置对象，内部会自动调用 `tool()`。

```ts
import { z } from "zod";

agent.registerTool(
  "search_docs",
  {
    description: "Search internal docs",
    inputSchema: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      return `result for ${query}`;
    },
  },
);
```

也可以先维护一个 `ToolRegistry`：

```ts
import { ToolRegistry, Agent } from "ai-sdk-demo";

const tools = new ToolRegistry();

tools.registerTool(
  "echo",
  {
    description: "Echo input",
    inputSchema: z.object({
      text: z.string(),
    }),
    execute: async ({ text }) => text,
  },
);

const agent = new Agent({
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  tools,
});
```

### 6.2 限制本轮可用工具

```ts
await agent.run("只允许使用指定工具", {
  toolNames: ["calculator", "search_docs"],
});
```

说明：

- `toolNames` 只会从已注册的 `ToolRegistry` 中筛选
- `additionalTools` 会额外合并进来
- 只要注册了 skill，`load_skill` 仍会自动加入
- 如果启用了 MCP，也会继续合并 MCP tools

### 6.3 追加临时工具

```ts
await agent.run("执行一次性工具", {
  additionalTools: {
    temp_echo: tool({
      description: "Temporary tool",
      inputSchema: z.object({
        text: z.string(),
      }),
      execute: async ({ text }) => `temp:${text}`,
    }),
  },
});
```

### 6.4 工具报错行为

默认情况下，工具执行报错不会中断整个 `run()`：

- agent 会捕获异常
- 把错误转成 `tool-result`
- 继续下一轮模型调用

如果你希望工具一旦失败就立即抛错：

```ts
await agent.run("strict mode", {
  continueOnToolError: false,
});
```

## 7. Skill 用法

`Skill` 适合放“按需加载的长提示词”或“领域操作手册”。

### 7.1 注册 skill

```ts
agent.registerSkills([
  {
    name: "debugging",
    desc: "Debug complex issues",
    loader: async () => {
      return "Use logs, isolate variables, and verify assumptions step by step.";
    },
  },
]);
```

### 7.2 skill 的真实行为

一旦注册了任意 skill，agent 会自动做两件事：

1. 把 skill 描述拼进 system prompt
2. 自动暴露一个 `load_skill` 工具给模型

模型可以在运行中调用：

```ts
load_skill({ name: "debugging" })
```

返回内容会被包装成：

```xml
<skill name="debugging">
...
</skill>
```

这意味着：

- skill 不会在每次运行一开始就把全部正文塞进上下文
- 只有模型认为需要时，才会显式加载

## 8. Memory 用法

### 8.1 使用 `BaseMemory` 子类

`Agent` 只依赖 `BaseMemory` 抽象。只要实现 `compress()`，就能挂接自己的记忆策略。

测试里最简单的做法是只保留最近 N 条消息：

```ts
import { BaseMemory } from "ai-sdk-demo";

class SimpleMemory extends BaseMemory {
  protected async compress(): Promise<void> {
    this.messages = this.messages.slice(-this.maxMessages);
  }
}
```

### 8.2 使用内置 `ChatMemory`

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { ChatMemory } from "ai-sdk-demo";

const summarizer = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}).chat("gpt-4o-mini");

const memory = await ChatMemory.create({
  sessionId: "demo-session",
  maxMessages: 20,
  model: summarizer,
});

const agent = new Agent({
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  memory,
});
```

注意：

- 当前 `Agent` 已支持内部初始化模型
- `ChatMemory` 的压缩模型目前仍需要单独传入 `LanguageModel`

### 8.3 记忆的写入时机

这是一个比较重要的实现细节：

- `run()` 会先保存输入消息
- 如果有工具循环，会持续保存 assistant/tool 消息
- 最终回答也会保存到 `memory`
- `stream()` 与 `run()` 一样
- `step()` 只会保存输入，不会自动保存最终 assistant 回复

### 8.4 持久化存储

`BaseMemory` 支持注入 `storage`，只要实现 `MemoryStorage` 接口即可：

```ts
interface MemoryStorage {
  save(key, messages): Promise<void>;
  load(key): Promise<ModelMessage[] | null>;
  delete(key): Promise<void>;
  clear(): Promise<void>;
}
```

## 9. MCP 用法

### 9.1 注册 MCP server

```ts
import { Agent, MCPRegistry } from "ai-sdk-demo";

const mcp = new MCPRegistry();

mcp.registerServer({
  name: "filesystem",
  enabled: true,
  adapter: {
    connect: async () => ({
      tools: [
        {
          name: "read_file",
          description: "Read file content",
          execute: async (input) => {
            return `read: ${JSON.stringify(input)}`;
          },
        },
      ],
    }),
  },
});

const agent = new Agent({
  provider: "openai",
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  mcp,
});
```

### 9.2 MCP 的默认行为

在 `run()` / `stream()` / `step()` 里：

- `includeMCPTools` 默认是 `true`
- 读取工具前会自动连接已启用的 server
- MCP tool 默认会命名为 `server__tool`

例如：

- server 名 `filesystem`
- tool 名 `read_file`
- 暴露给模型的名称通常是 `filesystem__read_file`

### 9.3 控制是否暴露 MCP 管理工具

```ts
await agent.run("检查 MCP server 状态", {
  includeMCPControlTools: true,
});
```

这会额外暴露：

- `mcp_list_servers`
- `mcp_enable_server`
- `mcp_disable_server`
- `mcp_refresh_server`
- `mcp_list_tools`

如果你完全不希望本轮接入 MCP：

```ts
await agent.run("不要接入 MCP", {
  includeMCPTools: false,
});
```

## 10. Workflow / TaskManager

`Agent` 内置了一个轻量工作流封装，可以让任务节点里继续调用当前 agent。

### 10.1 直接跑 workflow

```ts
const workflow = await agent.runWorkflow([
  {
    id: "prepare",
    run: ({ setSharedState }) => {
      setSharedState("prompt", "请输出总结");
      return "ready";
    },
  },
  {
    id: "respond",
    dependsOn: ["prepare"],
    run: async ({ sharedState }) => {
      const runAgent = sharedState.runAgent as typeof agent.run;
      const result = await runAgent(String(sharedState.prompt), {
        includeMCPTools: false,
      });
      return result.text;
    },
  },
]);
```

### 10.2 自动注入的 sharedState

通过 `createTaskManager()` 或 `runWorkflow()` 创建的任务上下文里，会自动带上：

- `sharedState.agentName`
- `sharedState.runAgent`

其中 `runAgent(input, options)` 本质上就是当前 agent 的 `run()`。

### 10.3 调度能力

底层 `TaskManager` 支持：

- `dependsOn` 依赖拓扑
- `concurrency` 并发控制
- `stopOnError` 失败即停
- 失败后自动跳过下游任务

## 11. Hooks / 生命周期事件

可以通过 `agent.getHookManager()` 监听运行过程：

```ts
agent.getHookManager().on("llm:before", ({ stepNumber }) => {
  console.log("before llm", stepNumber);
});

agent.getHookManager().on("tool:after", ({ toolName, output }) => {
  console.log(toolName, output);
});

agent.getHookManager().on("agent:after_run", ({ result }) => {
  console.log(result.text);
});
```

常用事件包括：

- `agent:before_run`
- `agent:after_run`
- `agent:loop_start`
- `agent:loop_step`
- `agent:loop_finish`
- `agent:error`
- `llm:before`
- `llm:after`
- `llm:error`
- `tool:before`
- `tool:after`
- `tool:error`
- `skill:before`
- `skill:after`
- `skill:error`

这套 hooks 适合做：

- 日志
- tracing
- metrics
- 调试面板
- 任务可视化

## 12. `AgentRunOptions` 说明

| 字段 | 说明 |
| --- | --- |
| `provider` | 可选，覆盖默认 provider |
| `model` | 可选，覆盖默认模型名；高级场景也兼容直接传 `LanguageModel` |
| `apiKey` / `apikey` | 可选，覆盖默认 API key |
| `baseURL` / `baseUrl` / `baseurl` | 可选，覆盖默认模型网关地址 |
| `systemPrompt` | 追加本轮 system prompt |
| `temperature` | 透传给底层模型 |
| `maxTokens` | 透传为 `maxOutputTokens` |
| `maxIterations` | 最大循环次数，默认 `8` |
| `continueOnToolError` | 默认继续执行；传 `false` 才会在工具报错时抛出 |
| `toolNames` | 仅从 `ToolRegistry` 中挑选部分工具 |
| `additionalTools` | 本轮追加临时工具 |
| `includeMCPTools` | 是否合并 MCP tools，默认 `true` |
| `includeMCPControlTools` | 是否合并 MCP 控制工具，默认 `false` |
| `metadata` | 放进 `context.metadata` |
| `signal` | 传入运行时上下文，可供外部中断感知 |

## 13. 一个完整示例

```ts
import { tool } from "ai";
import { z } from "zod";
import { Agent } from "ai-sdk-demo";

const agent = new Agent({
  name: "assistant",
  provider: "zhipu",
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
  model: "glm-4-flash",
  systemPrompt: "You are a precise engineering assistant.",
  workspace: process.cwd(),
});

agent.registerTool(
  "calculator",
  {
    description: "Add numbers",
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ a, b }) => a + b,
  },
);

agent.registerSkills([
  {
    name: "debugging",
    desc: "General debugging workflow",
    loader: async () =>
      "Start from reproduction, inspect logs, reduce variables, and confirm the root cause.",
  },
]);

const result = await agent.run("请先加载需要的 skill，然后计算 21 + 21，并给出简短解释", {
  maxIterations: 6,
  includeMCPTools: false,
  metadata: {
    source: "cli",
  },
});

console.log(result.text);
console.log(result.context.runId);
console.log(result.steps);
```

## 14. 使用建议

- 业务侧默认优先用 `run()`，因为它已经处理了大部分 agent loop 样板代码
- 想接 UI 流式输出时用 `stream()`
- 想做 prompt 调试、单轮分析或自己控制 tool loop 时用 `step()`
- 需要长期对话时加 `memory`
- 需要“大段领域知识按需注入”时加 `skills`
- 需要外部 tool 生态接入时加 `mcp`
- 需要多阶段任务编排时用 `runWorkflow()`

## 15. 当前实现里的注意点

1. `step()` 与 `run()` 的 memory 写入行为不一样，前者不会自动保存最终 assistant 回复。
2. `maxTokens` 在内部会映射到底层 AI SDK 的 `maxOutputTokens`。
3. 即使设置了 `toolNames`，只要注册了 skill，`load_skill` 依然会自动加入。
4. MCP tool 默认会按 `server__tool` 命名，避免不同 server 的同名工具冲突。
5. `run()` / `stream()` 超过 `maxIterations` 会直接抛错，不会返回半成品结果对象。
