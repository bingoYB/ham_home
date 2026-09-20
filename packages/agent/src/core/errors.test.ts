import { describe, expect, it } from "vitest";
import {
  WebAgentError,
  ToolNotFoundError,
  ToolValidationError,
  ToolExecutionError,
  ToolTimeoutError,
  ToolPermissionError,
  CommandNotFoundError,
  SchemaValidationError,
} from "./errors";

describe("errors", () => {
  it("WebAgentError sets name and message", () => {
    const err = new WebAgentError("test message");
    expect(err.name).toBe("WebAgentError");
    expect(err.message).toBe("test message");
  });

  it("ToolNotFoundError", () => {
    const err = new ToolNotFoundError("my_tool");
    expect(err.name).toBe("ToolNotFoundError");
    expect(err.message).toBe('Tool "my_tool" was not found.');
  });

  it("ToolValidationError", () => {
    const err = new ToolValidationError("invalid input");
    expect(err.name).toBe("ToolValidationError");
    expect(err.message).toBe("invalid input");
  });

  it("ToolExecutionError with Error cause", () => {
    const err = new ToolExecutionError("my_tool", new Error("underlying error"));
    expect(err.name).toBe("ToolExecutionError");
    expect(err.message).toBe('Tool "my_tool" failed: underlying error');
  });

  it("ToolExecutionError with string cause", () => {
    const err = new ToolExecutionError("my_tool", "underlying string");
    expect(err.message).toBe('Tool "my_tool" failed: underlying string');
  });

  it("ToolTimeoutError", () => {
    const err = new ToolTimeoutError("my_tool");
    expect(err.name).toBe("ToolTimeoutError");
    expect(err.message).toBe('Tool "my_tool" timed out.');
  });

  it("ToolPermissionError", () => {
    const err = new ToolPermissionError("my_tool");
    expect(err.name).toBe("ToolPermissionError");
    expect(err.message).toBe('Tool "my_tool" is not permitted.');
  });

  it("CommandNotFoundError", () => {
    const err = new CommandNotFoundError("my_cmd");
    expect(err.name).toBe("CommandNotFoundError");
    expect(err.message).toBe('Command "my_cmd" was not found.');
  });

  it("SchemaValidationError", () => {
    const err = new SchemaValidationError("bad schema");
    expect(err.name).toBe("SchemaValidationError");
    expect(err.message).toBe("bad schema");
  });
});
