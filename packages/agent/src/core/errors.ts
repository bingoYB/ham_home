export class WebAgentError extends Error {
  /**
   * @param name Explicit error name. Built-in errors always pass one: minifiers
   * rename classes, so `new.target.name` would break checks such as
   * `error.name === "ToolPermissionError"` in production bundles.
   */
  constructor(message: string, name?: string) {
    super(message);
    this.name = name ?? (new.target === WebAgentError ? "WebAgentError" : new.target.name);
  }
}

export class ToolNotFoundError extends WebAgentError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" was not found.`, "ToolNotFoundError");
  }
}

export class ToolValidationError extends WebAgentError {
  constructor(message: string) {
    super(message, "ToolValidationError");
  }
}

export class ToolExecutionError extends WebAgentError {
  constructor(toolName: string, cause: unknown) {
    super(
      `Tool "${toolName}" failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      "ToolExecutionError",
    );
  }
}

export class ToolTimeoutError extends WebAgentError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" timed out.`, "ToolTimeoutError");
  }
}

export class ToolPermissionError extends WebAgentError {
  constructor(toolName: string, reason?: string) {
    super(
      reason ? `Tool "${toolName}" is not permitted: ${reason}` : `Tool "${toolName}" is not permitted.`,
      "ToolPermissionError",
    );
  }
}

export class CommandNotFoundError extends WebAgentError {
  constructor(commandName: string) {
    super(`Command "${commandName}" was not found.`, "CommandNotFoundError");
  }
}

export class SchemaValidationError extends WebAgentError {
  constructor(message: string) {
    super(message, "SchemaValidationError");
  }
}
