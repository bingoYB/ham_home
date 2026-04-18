import type { FlexibleSchema, ToolSet } from "ai";

/**
 * MCP server 当前的生命周期状态。
 * 这里保持为非常轻量的状态机，方便 agent 或 UI 直接读取。
 */
export type MCPServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

/**
 * MCP tool 执行时可拿到的上下文。
 * 适合在 execute 中做日志、埋点、路由分发等。
 */
export interface MCPToolExecutionContext {
  serverName: string;
  toolName: string;
}

/**
 * 单个 MCP tool 的定义。
 * 这里故意和具体协议传输解耦，只保留 agent 运行时真正需要的字段。
 */
export interface MCPToolDefinition<
  TInput = unknown,
  TOutput = unknown,
  TInputSchema extends FlexibleSchema<TInput> = FlexibleSchema<TInput>,
  TOutputSchema extends FlexibleSchema<TOutput> = FlexibleSchema<TOutput>,
> {
  /** tool 的原始名称 */
  name: string;
  /** 供模型理解用途的描述 */
  description: string;
  /** tool 输入参数的 Zod schema，会直接透传给 AI SDK */
  inputSchema?: TInputSchema;
  /** tool 输出的 schema，可选 */
  outputSchema?: TOutputSchema;
  /**
   * 本地执行器。
   * 如果某个 server 已经把 tool 封装成可直接执行的函数，可以直接填这里。
   * 否则可以留空，改由 adapter.callTool 统一分发。
   */
  execute?: (
    input: TInput,
    context: MCPToolExecutionContext,
  ) => Promise<TOutput> | TOutput;
}

/**
 * server connect 后返回的结构。
 * 常见场景是一次性把 metadata 和 tools 全部带回来。
 */
export interface MCPServerConnectResult {
  tools?: MCPToolDefinition[];
  metadata?: Record<string, unknown>;
}

/**
 * MCP server 适配器。
 * 这一层负责屏蔽具体 transport / protocol 实现，让上层只关心控制逻辑。
 */
export interface MCPServerAdapter {
  /** 建立连接，可选地返回 tools 和 metadata */
  connect?: () => Promise<MCPServerConnectResult | void>;
  /** 断开连接 */
  disconnect?: () => Promise<void>;
  /** 拉取最新 tool 列表 */
  listTools?: () => Promise<MCPToolDefinition[]>;
  /** 按名称调用 tool，适合远程代理场景 */
  callTool?: <TOutput = unknown>(name: string, input: unknown) => Promise<TOutput>;
}

/**
 * 注册 server 时需要提供的定义。
 */
export interface MCPServerDefinition {
  name: string;
  description?: string;
  /** 是否默认启用。关闭时不会自动接入 agent toolset。 */
  enabled?: boolean;
  /** 额外的展示或诊断信息 */
  metadata?: Record<string, unknown>;
  adapter: MCPServerAdapter;
}

/**
 * 面向外部暴露的 server 快照。
 * 这个结构会被控制工具直接返回，所以尽量保持稳定和可读。
 */
export interface MCPServerSnapshot {
  name: string;
  description?: string;
  enabled: boolean;
  status: MCPServerStatus;
  toolCount: number;
  tools: string[];
  metadata?: Record<string, unknown>;
  lastError?: string;
}

/**
 * MCP tool 转换为 AI SDK tool 时的命名配置。
 */
export interface MCPAIToolOptions {
  /** 是否给 tool 名加 server 前缀，默认开启以避免重名 */
  namespaceTools?: boolean;
  /** server 和 tool 之间的分隔符，默认 `__` */
  separator?: string;
}

/**
 * Registry 聚合 tools 时的附加选项。
 */
export interface MCPRegistryToolOptions extends MCPAIToolOptions {
  /** 是否把 mcp_list_servers 这类控制工具一起暴露出去 */
  includeControlTools?: boolean;
  /** 是否仅返回已启用 server 的 tools */
  enabledOnly?: boolean;
  /** 读取 tools 前是否自动 connect 尚未连接的 server */
  connectIfNeeded?: boolean;
}

/**
 * `mcp_list_tools` 控制工具的返回结构。
 */
export interface MCPControlListToolsResult {
  server: string;
  enabled: boolean;
  status: MCPServerStatus;
  tools: string[];
}

/**
 * 内置控制工具的类型定义。
 */
export interface MCPControlToolset extends ToolSet {
  mcp_list_servers: ToolSet[string];
  mcp_enable_server: ToolSet[string];
  mcp_disable_server: ToolSet[string];
  mcp_refresh_server: ToolSet[string];
  mcp_list_tools: ToolSet[string];
}
