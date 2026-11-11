import { describe, expect, it } from "vitest";
import { getAgentErrorMessage } from "../errors";

describe("agent error messages", () => {
  it("preserves error details serialized across the extension boundary", () => {
    expect(getAgentErrorMessage({ message: "分类包含不支持的字符：", name: "Error" })).toBe("分类包含不支持的字符：");
  });

  it("includes provider HTTP status without replacing the provider message", () => {
    expect(getAgentErrorMessage(Object.assign(new Error("Invalid API key"), { statusCode: 401 }))).toBe("HTTP 401: Invalid API key");
  });

  it("uses a generic fallback only when no message is available", () => {
    expect(getAgentErrorMessage("Connection refused")).toBe("Connection refused");
    expect(getAgentErrorMessage({ message: " " }, "No details")).toBe("No details");
    expect(getAgentErrorMessage(null, "No details")).toBe("No details");
  });
});
