import { ToolPermissionError } from "./errors";
import type { SecurityPolicy, ToolExecutionContext, ToolInterceptor, ToolSecurityOptions } from "./types";

export interface DefaultSecurityPolicyOptions {
  defaultMode?: "allow" | "deny";
  rules?: Record<string, "allow" | "ask" | "deny">;
  onAsk?: (toolName: string, input: unknown, context: ToolExecutionContext, reason?: string) => Promise<boolean>;
}

export class DefaultSecurityPolicy implements SecurityPolicy {
  private readonly defaultMode: "allow" | "deny";
  private readonly rules: Record<string, "allow" | "ask" | "deny">;
  public readonly onAsk?: (toolName: string, input: unknown, context: ToolExecutionContext, reason?: string) => Promise<boolean>;

  constructor(options: DefaultSecurityPolicyOptions = {}) {
    this.defaultMode = options.defaultMode ?? "allow";
    this.rules = options.rules ?? {};
    this.onAsk = options.onAsk;
  }

  getToolPermission(toolName: string, _input: unknown, _context: ToolExecutionContext): ToolSecurityOptions {
    const mode = this.rules[toolName] ?? this.defaultMode;
    return {
      mode,
      reason: mode === "deny" ? "Default policy denied." : undefined,
    };
  }
}

export class SecurityInterceptor implements ToolInterceptor {
  constructor(private readonly policy: SecurityPolicy) {}

  async beforeExecute(toolName: string, input: unknown, context: ToolExecutionContext): Promise<unknown> {
    const permission = await this.policy.getToolPermission(toolName, input, context);

    if (permission.mode === "deny") {
      throw new ToolPermissionError(toolName, permission.reason);
    }

    if (permission.mode === "ask") {
      // Also check if policy defines onAsk
      const onAskHandler = (this.policy as any).onAsk;
      if (!onAskHandler || typeof onAskHandler !== "function") {
        throw new ToolPermissionError(toolName, "Approval required but no onAsk handler provided.");
      }

      const approved = await onAskHandler(toolName, input, context, permission.reason);
      if (!approved) {
        throw new ToolPermissionError(toolName, "User denied execution.");
      }
    }

    return input;
  }
}
