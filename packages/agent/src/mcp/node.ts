import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createMCPSDKClientAdapter, type MCPSDKClientAdapterOptions } from "./sdk";
import type { MCPServerAdapter } from "./types";

export interface MCPStdioServerAdapterOptions
  extends Omit<MCPSDKClientAdapterOptions, "transport"> {
  server: StdioServerParameters;
}

/**
 * Node.js 专用的 stdio MCP adapter。
 * 浏览器端无法创建子进程，因此不能使用这个 transport。
 */
export function createStdioMCPServerAdapter(
  options: MCPStdioServerAdapterOptions,
): MCPServerAdapter {
  const { server, ...rest } = options;

  return createMCPSDKClientAdapter({
    ...rest,
    transport: () => new StdioClientTransport(server),
    metadata: {
      transportType: "stdio",
      command: server.command,
      args: server.args,
      cwd: server.cwd,
      ...(rest.metadata ?? {}),
    },
  });
}

export type { StdioServerParameters };
