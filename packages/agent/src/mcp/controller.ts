import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolRegistry } from "../tools";
import { logger } from "../utils/logger";
import type {
  MCPAIToolOptions,
  MCPControlListToolsResult,
  MCPControlToolset,
  MCPRegistryToolOptions,
  MCPServerAdapter,
  MCPServerDefinition,
  MCPServerSnapshot,
  MCPServerStatus,
  MCPToolDefinition,
} from "./types";

/**
 * MCP 子命名空间日志。
 */
const mcpLogger = logger.child("mcp");

/**
 * 当远端 tool 没有提供 schema 时，退化为一个宽松对象输入。
 * 这样至少还能让模型以 JSON object 的形式调用，而不是完全不可用。
 */
const fallbackInputSchema = z.record(z.string(), z.unknown());

/**
 * 把 server / tool 名规整成更稳定的 AI tool name 片段。
 * 这里不改动原始 tool name，只影响暴露给模型时的最终名称。
 */
function normalizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * 构造暴露给 AI SDK 的 tool 名称。
 * 默认会自动加上 `server__tool` 前缀，避免多个 MCP server 出现同名工具冲突。
 */
function buildAIToolName(
  serverName: string,
  toolName: string,
  options: MCPAIToolOptions = {},
): string {
  const { namespaceTools = true, separator = "__" } = options;

  if (!namespaceTools) {
    return toolName;
  }

  return `${normalizeSegment(serverName)}${separator}${normalizeSegment(toolName)}`;
}

/**
 * 单个 MCP server 的运行时控制器。
 * 负责：
 * 1. 管理 server 生命周期
 * 2. 缓存 server 暴露的 tools
 * 3. 把 tools 转成 AI SDK 可直接消费的 ToolSet
 */
export class MCPServerController {
  readonly name: string;
  readonly description?: string;

  private adapter: MCPServerAdapter;
  private enabled: boolean;
  private status: MCPServerStatus = "disconnected";
  private metadata?: Record<string, unknown>;
  private lastError?: string;
  private tools = new Map<string, MCPToolDefinition>();

  constructor(definition: MCPServerDefinition) {
    this.name = definition.name;
    this.description = definition.description;
    this.adapter = definition.adapter;
    this.enabled = definition.enabled ?? true;
    this.metadata = definition.metadata;
  }

  /** 当前 server 是否处于启用状态 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 当前 server 的生命周期状态 */
  getStatus(): MCPServerStatus {
    return this.status;
  }

  /** 输出一个稳定快照，供 UI / 控制工具 / 调试逻辑使用 */
  getSnapshot(): MCPServerSnapshot {
    return {
      name: this.name,
      description: this.description,
      enabled: this.enabled,
      status: this.status,
      toolCount: this.tools.size,
      tools: this.listToolNames(),
      metadata: this.metadata,
      lastError: this.lastError,
    };
  }

  /** 返回当前缓存中的 tool 名称列表 */
  listToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** 返回当前缓存中的 tool 定义 */
  getToolDefinitions(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * 显式启用或停用 server。
   * 启用时会尝试立即 connect，停用时会立即 disconnect。
   */
  async setEnabled(enabled: boolean): Promise<MCPServerSnapshot> {
    this.enabled = enabled;

    if (!enabled) {
      await this.disconnect();
      return this.getSnapshot();
    }

    await this.connect();
    return this.getSnapshot();
  }

  /**
   * 建立与 MCP server 的连接。
   * 如果 adapter.connect 没有直接返回 tools，会继续回退到 adapter.listTools。
   */
  async connect(forceRefresh = false): Promise<MCPServerSnapshot> {
    if (!this.enabled) {
      return this.getSnapshot();
    }

    if (this.status === "connected" && !forceRefresh) {
      return this.getSnapshot();
    }

    if (this.status === "connecting") {
      throw new Error(`MCP server "${this.name}" is already connecting.`);
    }

    this.status = "connecting";
    this.lastError = undefined;

    try {
      const connectResult = await this.adapter.connect?.();

      // metadata 会增量合并，方便 adapter 在 connect 后补充传输层信息。
      if (connectResult?.metadata) {
        this.metadata = {
          ...(this.metadata || {}),
          ...connectResult.metadata,
        };
      }

      const tools =
        connectResult?.tools ??
        (this.adapter.listTools ? await this.adapter.listTools() : []);

      // connect 完成后，用最新工具列表刷新本地缓存。
      this.setTools(tools || []);
      this.status = "connected";
      mcpLogger.info(`Connected MCP server "${this.name}" with ${this.tools.size} tools.`);

      return this.getSnapshot();
    } catch (error) {
      this.status = "disconnected";
      this.lastError = error instanceof Error ? error.message : String(error);
      mcpLogger.error(`Failed to connect MCP server "${this.name}".`, error);
      throw error;
    }
  }

  /**
   * 刷新 tool 列表。
   * 如果当前尚未连接，则会退化为一次强制 connect。
   */
  async refreshTools(): Promise<MCPServerSnapshot> {
    if (this.status !== "connected") {
      return this.connect(true);
    }

    const tools = this.adapter.listTools ? await this.adapter.listTools() : this.getToolDefinitions();
    this.setTools(tools || []);
    return this.getSnapshot();
  }

  /** 断开 server 连接 */
  async disconnect(): Promise<void> {
    if (this.status === "disconnected") {
      return;
    }

    this.status = "disconnecting";

    try {
      await this.adapter.disconnect?.();
    } finally {
      this.status = "disconnected";
      mcpLogger.info(`Disconnected MCP server "${this.name}".`);
    }
  }

  /**
   * 调用某个 tool。
   * 优先使用 tool 自带的 execute；没有的话再回退到 adapter.callTool。
   */
  async callTool<TOutput = unknown>(toolName: string, input: unknown): Promise<TOutput> {
    let definition = this.tools.get(toolName);

    // 某些 server 可能在 connect 后动态增删工具，这里做一次按需刷新兜底。
    if (!definition && this.adapter.listTools) {
      await this.refreshTools();
      definition = this.tools.get(toolName);
    }

    if (!definition) {
      throw new Error(`Tool "${toolName}" was not found on MCP server "${this.name}".`);
    }

    if (definition.execute) {
      return definition.execute(input, {
        serverName: this.name,
        toolName,
      }) as Promise<TOutput>;
    }

    if (!this.adapter.callTool) {
      throw new Error(
        `MCP server "${this.name}" does not provide an execute handler for tool "${toolName}".`,
      );
    }

    return this.adapter.callTool<TOutput>(toolName, input);
  }

  /**
   * 把当前 server 的工具集转换为 AI SDK ToolSet。
   * 只有在 connected 状态下才会暴露工具，避免模型调用到不可执行的 server。
   */
  getAITools(options: MCPAIToolOptions = {}): ToolSet {
    if (this.status !== "connected") {
      return {};
    }

    const result: ToolSet = {};

    for (const definition of this.tools.values()) {
      const aiToolName = buildAIToolName(this.name, definition.name, options);

      result[aiToolName] = tool({
        description: definition.description,
        // 如果远端没有 schema，就用一个宽松对象保证模型仍能传参。
        inputSchema: definition.inputSchema ?? fallbackInputSchema,
        ...(definition.outputSchema ? { outputSchema: definition.outputSchema } : {}),
        execute: async (input: unknown) => this.callTool(definition.name, input),
      });
    }

    return result;
  }

  /** 用新的工具列表完全覆盖当前缓存 */
  private setTools(tools: MCPToolDefinition[]): void {
    this.tools.clear();

    for (const definition of tools) {
      this.tools.set(definition.name, definition);
    }
  }
}

/**
 * MCP server 注册中心。
 * 负责统一管理多个 server，并聚合出 agent 可直接消费的 ToolSet。
 */
export class MCPRegistry {
  private servers = new Map<string, MCPServerController>();

  /** 注册单个 server */
  registerServer(definition: MCPServerDefinition): MCPServerController {
    const server = new MCPServerController(definition);
    this.servers.set(definition.name, server);
    return server;
  }

  /** 批量注册 server */
  registerServers(definitions: MCPServerDefinition[]): MCPServerController[] {
    return definitions.map((definition) => this.registerServer(definition));
  }

  /** 注销某个 server；如果已连接会先断开 */
  async unregisterServer(name: string): Promise<boolean> {
    const server = this.servers.get(name);

    if (!server) {
      return false;
    }

    await server.disconnect();
    this.servers.delete(name);
    return true;
  }

  /** 获取某个 server 控制器 */
  getServer(name: string): MCPServerController | undefined {
    return this.servers.get(name);
  }

  /** 获取所有 server 的运行时快照 */
  listServers(): MCPServerSnapshot[] {
    return Array.from(this.servers.values()).map((server) => server.getSnapshot());
  }

  /** 连接指定 server */
  async connectServer(name: string): Promise<MCPServerSnapshot> {
    return this.requireServer(name).connect();
  }

  /** 断开指定 server */
  async disconnectServer(name: string): Promise<void> {
    await this.requireServer(name).disconnect();
  }

  /** 启用并连接指定 server */
  async enableServer(name: string): Promise<MCPServerSnapshot> {
    return this.requireServer(name).setEnabled(true);
  }

  /** 停用并断开指定 server */
  async disableServer(name: string): Promise<MCPServerSnapshot> {
    return this.requireServer(name).setEnabled(false);
  }

  /** 刷新指定 server 的工具定义 */
  async refreshServer(name: string): Promise<MCPServerSnapshot> {
    return this.requireServer(name).refreshTools();
  }

  /** 连接所有已启用的 server */
  async connectEnabledServers(): Promise<MCPServerSnapshot[]> {
    const targets = Array.from(this.servers.values()).filter((server) => server.isEnabled());
    return Promise.all(targets.map((server) => server.connect()));
  }

  /** 断开所有 server */
  async disconnectAll(): Promise<void> {
    await Promise.all(Array.from(this.servers.values()).map((server) => server.disconnect()));
  }

  /**
   * 聚合所有 MCP tools。
   * 这是给 agent 对接时最核心的入口，返回结果可直接传给 `generateText/streamText`。
   */
  async getTools(options: MCPRegistryToolOptions = {}): Promise<ToolSet> {
    const {
      includeControlTools = false,
      enabledOnly = true,
      connectIfNeeded = true,
      ...toolOptions
    } = options;

    const result: ToolSet = {};
    const servers = Array.from(this.servers.values()).filter((server) =>
      enabledOnly ? server.isEnabled() : true,
    );

    for (const server of servers) {
      // 默认在读取工具前自动 connect，减少接入端的样板代码。
      if (connectIfNeeded && server.isEnabled() && server.getStatus() !== "connected") {
        await server.connect();
      }

      Object.assign(result, server.getAITools(toolOptions));
    }

    if (includeControlTools) {
      Object.assign(result, this.createControlTools());
    }

    return result;
  }

  /**
   * 把当前 MCP tools 直接注册进现有 ToolRegistry。
   * 适合和项目里已有的 globalToolRegistry 一起使用。
   */
  async registerTools(
    registry: ToolRegistry,
    options: MCPRegistryToolOptions = {},
  ): Promise<void> {
    const tools = await this.getTools(options);
    registry.registerTools(tools);
  }

  /**
   * 生成一组 agent 可调用的 MCP 控制工具。
   * 这些工具主要用于：
   * 1. 查询 server 状态
   * 2. 启停 server
   * 3. 刷新工具列表
   * 4. 查询当前暴露了哪些 tools
   */
  createControlTools(): MCPControlToolset {
    return {
      mcp_list_servers: tool({
        description: "List all registered MCP servers and their runtime status.",
        inputSchema: z.object({}),
        execute: async () => this.listServers(),
      }),
      mcp_enable_server: tool({
        description: "Enable and connect a registered MCP server.",
        inputSchema: z.object({
          name: z.string().describe("Registered MCP server name."),
        }),
        execute: async ({ name }) => this.enableServer(name),
      }),
      mcp_disable_server: tool({
        description: "Disable and disconnect a registered MCP server.",
        inputSchema: z.object({
          name: z.string().describe("Registered MCP server name."),
        }),
        execute: async ({ name }) => this.disableServer(name),
      }),
      mcp_refresh_server: tool({
        description: "Refresh tool metadata for a registered MCP server.",
        inputSchema: z.object({
          name: z.string().describe("Registered MCP server name."),
        }),
        execute: async ({ name }) => this.refreshServer(name),
      }),
      mcp_list_tools: tool({
        description: "List exposed tool names for one MCP server or all MCP servers.",
        inputSchema: z.object({
          name: z.string().optional().describe("Optional registered MCP server name."),
          includeDisabled: z
            .boolean()
            .optional()
            .default(false)
            .describe("Whether disabled MCP servers should also be included."),
        }),
        execute: async ({
          name,
          includeDisabled = false,
        }): Promise<MCPControlListToolsResult[]> => {
          // 如果明确指定了 server，则只返回这个 server 的工具情况。
          if (name) {
            const server = this.requireServer(name);
            return [server.getSnapshot()].map((snapshot) => ({
              server: snapshot.name,
              enabled: snapshot.enabled,
              status: snapshot.status,
              tools: snapshot.tools,
            }));
          }

          // 否则返回全量列表，并按需过滤 disabled server。
          return this.listServers()
            .filter((server) => (includeDisabled ? true : server.enabled))
            .map((server) => ({
              server: server.name,
              enabled: server.enabled,
              status: server.status,
              tools: server.tools,
            }));
        },
      }),
    };
  }

  /** 内部校验：确保 server 已注册，否则抛出清晰错误 */
  private requireServer(name: string): MCPServerController {
    const server = this.servers.get(name);

    if (!server) {
      throw new Error(`Unknown MCP server "${name}".`);
    }

    return server;
  }
}

/** 默认的全局 MCP 注册中心 */
export const globalMCPRegistry = new MCPRegistry();
