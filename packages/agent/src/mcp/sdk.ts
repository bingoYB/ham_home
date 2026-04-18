import { jsonSchema } from "ai";
import {
  Client,
  type ClientOptions,
} from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ClientCapabilities,
  Implementation,
  Tool as MCPRemoteTool,
} from "@modelcontextprotocol/sdk/types.js";
import type { MCPServerAdapter, MCPToolDefinition } from "./types";

const defaultClientInfo: Implementation = {
  name: "ai-sdk-demo-mcp-client",
  version: "1.0.0",
};

type MCPTransportFactory = () => Transport | Promise<Transport>;
type NormalizedContentBlock = {
  type: string;
  text?: string;
  [key: string]: unknown;
};
type StandardCallToolResult = {
  content: NormalizedContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type LegacyCallToolResult = {
  toolResult: unknown;
};
type NormalizableCallToolResult = StandardCallToolResult | LegacyCallToolResult;

function isTransportFactory(value: Transport | MCPTransportFactory): value is MCPTransportFactory {
  return typeof value === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeToolArguments(input: unknown): Record<string, unknown> | undefined {
  if (input == null) {
    return undefined;
  }

  if (!isRecord(input)) {
    throw new Error("MCP tools require JSON object arguments.");
  }

  return input;
}

function normalizeCallToolResult(result: NormalizableCallToolResult): unknown {
  const compatibilityResult = result as { toolResult?: unknown };

  if ("toolResult" in compatibilityResult) {
    return compatibilityResult.toolResult;
  }

  const standardResult = result as StandardCallToolResult;

  if (!standardResult.isError && standardResult.structuredContent !== undefined) {
    return standardResult.structuredContent;
  }

  if (
    !standardResult.isError &&
    standardResult.content.length === 1 &&
    standardResult.content[0]?.type === "text"
  ) {
    return standardResult.content[0].text;
  }

  return {
    isError: standardResult.isError ?? false,
    structuredContent: standardResult.structuredContent,
    content: standardResult.content,
  };
}

function toToolDefinition(tool: MCPRemoteTool): MCPToolDefinition {
  return {
    name: tool.name,
    description: tool.description?.trim() || `MCP tool "${tool.name}"`,
    inputSchema: jsonSchema(tool.inputSchema),
    ...(tool.outputSchema ? { outputSchema: jsonSchema(tool.outputSchema) } : {}),
  };
}

function toURL(url: string | URL): URL {
  return url instanceof URL ? url : new URL(url);
}

export interface MCPSDKClientAdapterOptions {
  transport: Transport | MCPTransportFactory;
  clientInfo?: Implementation;
  capabilities?: ClientCapabilities;
  clientOptions?: ClientOptions;
  connectOptions?: RequestOptions;
  listToolsOptions?: RequestOptions;
  callToolOptions?:
    | RequestOptions
    | ((context: {
        toolName: string;
        input: Record<string, unknown> | undefined;
      }) => RequestOptions | undefined);
  normalizeResult?: (result: NormalizableCallToolResult) => unknown;
  metadata?: Record<string, unknown>;
}

export interface MCPStreamableHTTPServerAdapterOptions
  extends Omit<MCPSDKClientAdapterOptions, "transport"> {
  url: string | URL;
  transportOptions?: ConstructorParameters<typeof StreamableHTTPClientTransport>[1];
}

/**
 * 基于官方 `@modelcontextprotocol/sdk` Client 的通用 adapter。
 * 这一层把标准 MCP server 转成项目现有的 `MCPServerAdapter` 接口。
 */
export function createMCPSDKClientAdapter(
  options: MCPSDKClientAdapterOptions,
): MCPServerAdapter {
  const {
    transport,
    clientInfo = defaultClientInfo,
    capabilities,
    clientOptions,
    connectOptions,
    listToolsOptions,
    callToolOptions,
    normalizeResult = normalizeCallToolResult,
    metadata,
  } = options;

  let client: Client | undefined;
  let connectedTransport: Transport | undefined;

  async function createTransport(): Promise<Transport> {
    return isTransportFactory(transport) ? await transport() : transport;
  }

  async function ensureClient(): Promise<Client> {
    if (client) {
      return client;
    }

    connectedTransport = await createTransport();
    client = new Client(clientInfo, {
      ...clientOptions,
      capabilities: capabilities ?? clientOptions?.capabilities,
    });
    await client.connect(connectedTransport, connectOptions);
    return client;
  }

  async function getToolDefinitions(): Promise<MCPToolDefinition[]> {
    const currentClient = await ensureClient();
    const result = await currentClient.listTools(undefined, listToolsOptions);
    return result.tools.map(toToolDefinition);
  }

  return {
    connect: async () => {
      const currentClient = await ensureClient();
      const tools = await getToolDefinitions();

      return {
        tools,
        metadata: {
          ...metadata,
          transport: connectedTransport?.constructor?.name,
          serverCapabilities: currentClient.getServerCapabilities(),
          serverVersion: currentClient.getServerVersion(),
          instructions: currentClient.getInstructions(),
          sessionId: connectedTransport?.sessionId,
        },
      };
    },
    disconnect: async () => {
      try {
        await client?.close();
      } finally {
        client = undefined;
        connectedTransport = undefined;
      }
    },
    listTools: async () => getToolDefinitions(),
    callTool: async <TOutput = unknown>(toolName: string, input: unknown) => {
      const currentClient = await ensureClient();
      const normalizedInput = normalizeToolArguments(input);
      const requestOptions =
        typeof callToolOptions === "function"
          ? callToolOptions({
              toolName,
              input: normalizedInput,
            })
          : callToolOptions;

      const result = await currentClient.callTool(
        {
          name: toolName,
          ...(normalizedInput ? { arguments: normalizedInput } : {}),
        },
        undefined,
        requestOptions,
      );

      return normalizeResult(result) as TOutput;
    },
  };
}

/**
 * 标准 MCP Streamable HTTP transport。
 * 适用于浏览器和 Node.js；浏览器端推荐优先使用这个 transport。
 */
export function createStreamableHTTPMCPServerAdapter(
  options: MCPStreamableHTTPServerAdapterOptions,
): MCPServerAdapter {
  const { url, transportOptions, ...rest } = options;

  return createMCPSDKClientAdapter({
    ...rest,
    transport: () => new StreamableHTTPClientTransport(toURL(url), transportOptions),
    metadata: {
      transportType: "streamable-http",
      endpoint: toURL(url).toString(),
      ...(rest.metadata ?? {}),
    },
  });
}
