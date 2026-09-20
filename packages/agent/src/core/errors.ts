export class WebAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ToolNotFoundError extends WebAgentError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" was not found.`);
  }
}

export class ToolValidationError extends WebAgentError {
  constructor(message: string) {
    super(message);
  }
}

export class ToolExecutionError extends WebAgentError {
  constructor(toolName: string, cause: unknown) {
    super(`Tool "${toolName}" failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

export class ToolTimeoutError extends WebAgentError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" timed out.`);
  }
}

export class ToolPermissionError extends WebAgentError {
  constructor(toolName: string, reason?: string) {
    super(reason ? `Tool "${toolName}" is not permitted: ${reason}` : `Tool "${toolName}" is not permitted.`);
  }
}

export class CommandNotFoundError extends WebAgentError {
  constructor(commandName: string) {
    super(`Command "${commandName}" was not found.`);
  }
}

export class SchemaValidationError extends WebAgentError {
  constructor(message: string) {
    super(message);
  }
}
