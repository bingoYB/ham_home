import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Agent } from "../core/agent";
import type { AgentTool, JsonSchema, ToolScope } from "../core/types";

/**
 * Options for connecting to an MCP server.
 */
export interface McpClientOptions {
  /**
   * Optional scope to assign to the registered tools.
   */
  scope?: ToolScope;

  /**
   * Optional namespace prefix for the tool names to prevent conflicts.
   * If provided, tool names will be formatted as `{namespace}_{original_name}`.
   */
  namespace?: string;

  /**
   * Information about the client connecting to the MCP server.
   * Defaults to { name: "browser-agent-sdk", version: "1.0.0" }.
   */
  clientInfo?: {
    name: string;
    version: string;
  };
}

/**
 * An active connection to an MCP server.
 */
export interface McpConnection {
  /**
   * The underlying MCP Client instance from the @modelcontextprotocol/sdk package.
   */
  client: Client;

  /**
   * Disconnects from the server and unregisters all associated tools from the agent.
   */
  disconnect: () => Promise<void>;

  /**
   * Refreshes the list of tools from the server and updates the agent's tool registry.
   */
  refreshTools: () => Promise<void>;
}

/**
 * Connects to a remote MCP (Model Context Protocol) server via Streamable HTTP,
 * retrieves its available tools, and registers them dynamically into the given Agent.
 *
 * @param agent - The Agent instance to register tools into.
 * @param url - The Streamable HTTP endpoint URL of the MCP server.
 * @param options - Configuration options for the connection and tool registration.
 * @returns A promise resolving to an McpConnection object.
 */
export async function connectMcpServer(
  agent: Agent,
  url: string | URL,
  options: McpClientOptions = {}
): Promise<McpConnection> {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const clientInfo = options.clientInfo ?? { name: "browser-agent-sdk", version: "1.0.0" };

  const client = new Client(clientInfo, {
    capabilities: {}
  });

  await client.connect(transport);

  let unregisterCallbacks: Array<() => void> = [];

  const registerServerTools = async () => {
    // Unregister previously registered tools if any to avoid dangling references
    unregisterCallbacks.forEach(unregister => unregister());
    unregisterCallbacks = [];

    const response = await client.listTools();

    for (const tool of response.tools) {
      const toolName = options.namespace ? `${options.namespace}_${tool.name}` : tool.name;

      const agentTool: AgentTool = {
        name: toolName,
        description: tool.description ?? `Tool ${tool.name} from MCP server`,
        parameters: tool.inputSchema as JsonSchema,
        scope: options.scope,
        execute: async (input: unknown) => {
          const result = await client.callTool({
            name: tool.name,
            arguments: input as Record<string, unknown>
          });

          if (result.isError) {
            throw new Error(`MCP Tool ${tool.name} execution failed: ${JSON.stringify(result.content)}`);
          }

          // Simplify output if it's a single text block, which is common
          const content = result.content as Array<{ type: string; text?: string }>;
          if (content && content.length === 1 && content[0].type === "text") {
            return content[0].text;
          }

          return result.content;
        }
      };

      // Register the tool, replacing any existing tool with the same name
      const unregister = agent.tools.register(agentTool, { onConflict: "replace" });
      unregisterCallbacks.push(unregister);
    }
  };

  await registerServerTools();

  return {
    client,
    refreshTools: registerServerTools,
    disconnect: async () => {
      unregisterCallbacks.forEach(unregister => unregister());
      unregisterCallbacks = [];
      await client.close();
    }
  };
}
