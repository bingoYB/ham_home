import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMCPSDKClientAdapter, MCPRegistry } from "../src/mcp";
import { ToolRegistry } from "../src/tools";

describe("MCP Registry", () => {
  it("should connect enabled servers and expose namespaced AI tools", async () => {
    const registry = new MCPRegistry();
    const readFileInputSchema = z.object({
      path: z.string(),
    });
    const toolExecutionOptions = {
      toolCallId: "test-tool-call",
      messages: [],
    };

    registry.registerServer({
      name: "filesystem",
      description: "Local file access",
      adapter: {
        connect: async () => ({
          metadata: { transport: "mock" },
          tools: [
            {
              name: "read_file",
              description: "Read one file",
              inputSchema: readFileInputSchema,
              execute: async (input: unknown) => {
                const { path } = readFileInputSchema.parse(input);
                return `content:${path}`;
              },
            },
          ],
        }),
      },
    });

    const tools = await registry.getTools();
    expect(Object.keys(tools)).toEqual(["filesystem__read_file"]);

    const result = await tools.filesystem__read_file.execute?.(
      {
        path: "/tmp/demo.txt",
      },
      toolExecutionOptions,
    );

    expect(result).toBe("content:/tmp/demo.txt");
    expect(registry.listServers()[0]).toMatchObject({
      name: "filesystem",
      status: "connected",
      enabled: true,
      toolCount: 1,
      metadata: { transport: "mock" },
    });
  });

  it("should support agent-facing control tools for enable and disable", async () => {
    const registry = new MCPRegistry();
    let disconnectCount = 0;
    const toolExecutionOptions = {
      toolCallId: "test-tool-call",
      messages: [],
    };

    registry.registerServer({
      name: "browser",
      enabled: false,
      adapter: {
        connect: async () => ({
          tools: [
            {
              name: "navigate",
              description: "Navigate to a url",
              execute: async (input: unknown) => input,
            },
          ],
        }),
        disconnect: async () => {
          disconnectCount += 1;
        },
      },
    });

    const controlTools = registry.createControlTools();

    const beforeEnable = await controlTools.mcp_list_servers.execute?.({}, toolExecutionOptions);
    expect(beforeEnable?.[0]).toMatchObject({
      name: "browser",
      enabled: false,
      status: "disconnected",
    });

    const enabled = await controlTools.mcp_enable_server.execute?.(
      {
        name: "browser",
      },
      toolExecutionOptions,
    );

    expect(enabled).toMatchObject({
      name: "browser",
      enabled: true,
      status: "connected",
      tools: ["navigate"],
    });

    const tools = await registry.getTools();
    expect(Object.keys(tools)).toEqual(["browser__navigate"]);

    const disabled = await controlTools.mcp_disable_server.execute?.(
      {
        name: "browser",
      },
      toolExecutionOptions,
    );

    expect(disabled).toMatchObject({
      name: "browser",
      enabled: false,
      status: "disconnected",
    });
    expect(disconnectCount).toBe(1);
  });

  it("should register MCP tools into the shared ToolRegistry", async () => {
    const registry = new MCPRegistry();
    const toolRegistry = new ToolRegistry();

    registry.registerServer({
      name: "memory",
      adapter: {
        connect: async () => ({
          tools: [
            {
              name: "search_notes",
              description: "Search internal notes",
              execute: async (_input: unknown) => ["note-1"],
            },
          ],
        }),
      },
    });

    await registry.registerTools(toolRegistry, {
      includeControlTools: true,
    });

    expect(toolRegistry.hasTool("memory__search_notes")).toBe(true);
    expect(toolRegistry.hasTool("mcp_list_servers")).toBe(true);
  });

  it("should adapt a standard MCP server via the official SDK client", async () => {
    const registry = new MCPRegistry();
    const server = new McpServer({
      name: "sdk-fixture",
      version: "1.0.0",
    });
    const toolExecutionOptions = {
      toolCallId: "test-tool-call",
      messages: [],
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    server.registerTool(
      "echo",
      {
        description: "Echo the input text",
        inputSchema: {
          text: z.string(),
        },
        outputSchema: {
          text: z.string(),
        },
      },
      async ({ text }) => ({
        content: [
          {
            type: "text" as const,
            text: `echo:${text}`,
          },
        ],
        structuredContent: {
          text: `echo:${text}`,
        },
      }),
    );

    await server.connect(serverTransport);

    registry.registerServer({
      name: "official",
      adapter: createMCPSDKClientAdapter({
        transport: clientTransport,
      }),
    });

    const tools = await registry.getTools();
    expect(Object.keys(tools)).toEqual(["official__echo"]);

    const result = await tools.official__echo.execute?.(
      {
        text: "hello",
      },
      toolExecutionOptions,
    );

    expect(result).toEqual({
      text: "echo:hello",
    });
    expect(registry.listServers()[0]).toMatchObject({
      name: "official",
      status: "connected",
      toolCount: 1,
      metadata: {
        transport: "InMemoryTransport",
        serverVersion: {
          name: "sdk-fixture",
          version: "1.0.0",
        },
      },
    });

    await registry.disconnectAll();
    await server.close();
  });
});
