import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { connectMcpServer } from "./client";
import type { Agent } from "../core/agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js");
vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js");

describe("MCP Client Connector", () => {
  let mockAgent: Agent;
  let mockRegister: Mock;
  let mockConnect: Mock;
  let mockListTools: Mock;
  let mockCallTool: Mock;
  let mockClose: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegister = vi.fn().mockReturnValue(vi.fn());
    mockConnect = vi.fn().mockResolvedValue(undefined);
    mockListTools = vi.fn().mockResolvedValue({ tools: [] });
    mockCallTool = vi.fn().mockResolvedValue({ content: [] });
    mockClose = vi.fn().mockResolvedValue(undefined);

    vi.mocked(Client).mockImplementation(function () {
      return {
        connect: mockConnect,
        listTools: mockListTools,
        callTool: mockCallTool,
        close: mockClose
      } as unknown as Client;
    });

    vi.mocked(StreamableHTTPClientTransport).mockImplementation(function () {
      return {} as unknown as StreamableHTTPClientTransport;
    });

    mockRegister = vi.fn().mockReturnValue(vi.fn());

    // Create a mock Agent
    mockAgent = {
      tools: {
        register: mockRegister
      }
    } as unknown as Agent;
  });

  it("should connect, list tools and register them", async () => {
    mockListTools.mockResolvedValue({
      tools: [
        { name: "test_tool", description: "A test tool", inputSchema: { type: "object" } }
      ]
    });

    const connection = await connectMcpServer(mockAgent, "http://localhost/sse");

    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL("http://localhost/sse"));
    expect(Client).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
    expect(mockListTools).toHaveBeenCalled();

    expect(mockRegister).toHaveBeenCalledTimes(1);
    const registeredTool = mockRegister.mock.calls[0][0];
    expect(registeredTool.name).toBe("test_tool");
    expect(registeredTool.description).toBe("A test tool");
  });

  it("should support namespace for tool names", async () => {
    mockListTools.mockResolvedValue({
      tools: [
        { name: "query", description: "Query DB", inputSchema: { type: "object" } }
      ]
    });

    await connectMcpServer(mockAgent, "http://localhost/sse", { namespace: "db" });

    expect(mockRegister).toHaveBeenCalledTimes(1);
    const registeredTool = mockRegister.mock.calls[0][0];
    expect(registeredTool.name).toBe("db_query");
  });

  it("should execute tool correctly and return text content", async () => {
    mockListTools.mockResolvedValue({
      tools: [
        { name: "echo", description: "Echo tool", inputSchema: { type: "object" } }
      ]
    });

    mockCallTool.mockResolvedValue({
      isError: false,
      content: [{ type: "text", text: "Hello" }]
    });

    await connectMcpServer(mockAgent, "http://localhost/sse");

    const registeredTool = mockRegister.mock.calls[0][0];

    const result = await registeredTool.execute({ msg: "Hello" });

    expect(mockCallTool).toHaveBeenCalledWith({
      name: "echo",
      arguments: { msg: "Hello" }
    });
    expect(result).toBe("Hello");
  });

  it("should return full content array if not a single text", async () => {
    mockListTools.mockResolvedValue({
      tools: [{ name: "complex" }]
    });

    const contentArr = [
      { type: "text", text: "Part 1" },
      { type: "image", data: "base64..." }
    ];

    mockCallTool.mockResolvedValue({
      isError: false,
      content: contentArr
    });

    await connectMcpServer(mockAgent, "http://localhost/sse");
    const registeredTool = mockRegister.mock.calls[0][0];

    const result = await registeredTool.execute({});
    expect(result).toBe(contentArr);
  });

  it("should throw error if MCP execution fails", async () => {
    mockListTools.mockResolvedValue({
      tools: [{ name: "fail" }]
    });

    mockCallTool.mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Permission denied" }]
    });

    await connectMcpServer(mockAgent, "http://localhost/sse");
    const registeredTool = mockRegister.mock.calls[0][0];

    await expect(registeredTool.execute({})).rejects.toThrow("MCP Tool fail execution failed");
  });

  it("should refresh tools when requested", async () => {
    mockListTools
      .mockResolvedValueOnce({ tools: [{ name: "tool1" }] })
      .mockResolvedValueOnce({ tools: [{ name: "tool1" }, { name: "tool2" }] });

    const connection = await connectMcpServer(mockAgent, "http://localhost/sse");
    expect(mockRegister).toHaveBeenCalledTimes(1);

    await connection.refreshTools();
    expect(mockRegister).toHaveBeenCalledTimes(3); // 1 from initial + 2 from refresh
  });

  it("should disconnect properly", async () => {
    const unregisterMock = vi.fn();
    mockRegister.mockReturnValue(unregisterMock);

    mockListTools.mockResolvedValue({
      tools: [{ name: "tool1" }]
    });

    mockClose.mockResolvedValue(undefined);

    const connection = await connectMcpServer(mockAgent, "http://localhost/sse");

    await connection.disconnect();

    expect(unregisterMock).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
