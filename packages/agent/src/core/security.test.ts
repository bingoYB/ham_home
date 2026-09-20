import { describe, expect, it, vi } from "vitest";
import { ToolPermissionError } from "./errors";
import { DefaultSecurityPolicy, SecurityInterceptor } from "./security";
import type { ToolExecutionContext } from "./types";

describe("Security Policy and Interceptors", () => {
  const dummyContext: ToolExecutionContext = {
    agentId: "agent-1",
    sessionId: "session-1",
  };

  describe("DefaultSecurityPolicy", () => {
    it("should return allow mode by default if no rules match", () => {
      const policy = new DefaultSecurityPolicy();
      const result = policy.getToolPermission("testTool", {}, dummyContext);
      expect(result.mode).toBe("allow");
    });

    it("should return configured default mode", () => {
      const policy = new DefaultSecurityPolicy({ defaultMode: "deny" });
      const result = policy.getToolPermission("testTool", {}, dummyContext);
      expect(result.mode).toBe("deny");
      expect(result.reason).toBeDefined();
    });

    it("should respect specific tool rules", () => {
      const policy = new DefaultSecurityPolicy({
        rules: {
          dangerousTool: "deny",
          askTool: "ask",
          safeTool: "allow",
        },
        defaultMode: "deny",
      });

      expect(policy.getToolPermission("dangerousTool", {}, dummyContext).mode).toBe("deny");
      expect(policy.getToolPermission("askTool", {}, dummyContext).mode).toBe("ask");
      expect(policy.getToolPermission("safeTool", {}, dummyContext).mode).toBe("allow");
      expect(policy.getToolPermission("unmappedTool", {}, dummyContext).mode).toBe("deny");
    });
  });

  describe("SecurityInterceptor", () => {
    it("should pass through when policy allows", async () => {
      const policy = new DefaultSecurityPolicy({ defaultMode: "allow" });
      const interceptor = new SecurityInterceptor(policy);

      const input = { data: "test" };
      const result = await interceptor.beforeExecute("myTool", input, dummyContext);
      expect(result).toBe(input);
    });

    it("should throw ToolPermissionError when policy denies", async () => {
      const policy = new DefaultSecurityPolicy({ defaultMode: "deny" });
      const interceptor = new SecurityInterceptor(policy);

      await expect(interceptor.beforeExecute("myTool", {}, dummyContext))
        .rejects.toThrowError(ToolPermissionError);
    });

    it("should throw if ask mode but no onAsk handler", async () => {
      const policy = new DefaultSecurityPolicy({ rules: { askTool: "ask" } });
      const interceptor = new SecurityInterceptor(policy);

      await expect(interceptor.beforeExecute("askTool", {}, dummyContext))
        .rejects.toThrowError(/Approval required but no onAsk handler provided/);
    });

    it("should allow execution if onAsk handler resolves to true", async () => {
      const onAskMock = vi.fn().mockResolvedValue(true);
      const policy = new DefaultSecurityPolicy({
        rules: { askTool: "ask" },
        onAsk: onAskMock
      });
      const interceptor = new SecurityInterceptor(policy);

      const input = { data: "test" };
      const result = await interceptor.beforeExecute("askTool", input, dummyContext);

      expect(result).toBe(input);
      expect(onAskMock).toHaveBeenCalledWith("askTool", input, dummyContext, undefined);
    });

    it("should throw ToolPermissionError if onAsk handler resolves to false", async () => {
      const onAskMock = vi.fn().mockResolvedValue(false);
      const policy = new DefaultSecurityPolicy({
        rules: { askTool: "ask" },
        onAsk: onAskMock
      });
      const interceptor = new SecurityInterceptor(policy);

      await expect(interceptor.beforeExecute("askTool", {}, dummyContext))
        .rejects.toThrowError(/User denied execution/);
      expect(onAskMock).toHaveBeenCalledWith("askTool", {}, dummyContext, undefined);
    });
  });
});
