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

const agent = createAgent({
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

- **Agent Runtime**: 提供 `run()` 与 `runStream()` 等执行方法。
- **Tool Registry**: 支持 JSON Schema 验证、页面/会话级别的作用域 (`ToolScope`)。
- **Command Registry**: 封装常用的工作流，包含输入与输出 Schema。
- **Page Tools**: 根据不同 URL 或路由动态切换页面级别的工具与 Prompt。
- **Skills**: 提供上下文能力 (`AgentSkillRuntime`)，以及技能工具与文档的动态加载。
- **Memory**: 提供基于内存 (`InMemory`) 以及基于浏览器 IndexedDB 的多会话存储。
- **Security & Permissions**: 支持细粒度工具拦截与权限审批策略 (`DefaultSecurityPolicy`)。
- **MCP (Model Context Protocol)**: 原生支持连接并调用 MCP Server。
- **Planning Mode**: 提供 `PlanManager` 以支持复杂任务的任务拆分与计划管理。

## 模型支持 (Providers)

默认通过 Vercel AI SDK 解析模型。支持的 Provider 包含：

- `gateway`, `vercel`, `openai`, `openai-compatible`, `anthropic`, `google`, `xai`, `azure`, `amazon-bedrock`, `groq`, `deepinfra`, `mistral`, `togetherai`, `cohere`, `fireworks`, `deepseek`, `cerebras`, `perplexity`

支持自定义传入 `modelClient`, `languageModel` 或 `embeddingClient` 以便在特定场景（例如自定义认证、私有部署）下获得完全控制权。

## 工具 (Tools)

工具统一注册至 `agent.tools`。每次执行时接收经过验证的入参和包含 `agentId`, `sessionId`, `pageId`, `url`, `signal`, `metadata` 等运行时上下文。

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

## 安全与权限控制 (Security & Permissions)

SDK 提供了 `DefaultSecurityPolicy` 可以在调用工具时进行权限管控（例如拦截危险操作）。配合拦截器 `ToolInterceptor`，可以灵活地校验或篡改请求：

```ts
import { createAgent, DefaultSecurityPolicy } from "@hamhome/agent";

const securityPolicy = new DefaultSecurityPolicy({
  rules: [
    { tool: "deleteFile", mode: "ask", reason: "涉及文件删除" }, // 需要审批
    { tool: "*", mode: "allow" } // 其他允许
  ],
  onAsk: async (toolName, input, context, reason) => {
    // 触发 UI 上的授权弹窗
    return confirm(`是否允许执行 ${toolName}？原因：${reason}`);
  }
});

const agent = createAgent({
  // ...
  securityPolicy,
});
```

## MCP 支持 (Model Context Protocol)

你可以很方便地将标准 MCP Server 对接至 Agent：

```ts
import { connectMcpServer } from "@hamhome/agent";

const connection = await connectMcpServer(agent, {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-everything"]
});

// 使用完毕后可断开
// await connection.close();
```

## 计划模式 (Planning Mode)

针对长链路和复杂任务，提供 `PlanManager` 来管理任务的状态与进度：

```ts
import { PlanManager } from "@hamhome/agent";

const plan = new PlanManager({ namespace: "plan" });
// plan.getTools() 提供给 Agent 用于自我规划的工具集合
agent.tools.register(plan.getTools());
```

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

## License

MIT
