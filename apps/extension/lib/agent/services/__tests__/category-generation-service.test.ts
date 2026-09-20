import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateStrictJsonSchema, type JsonSchema } from "@hamhome/agent";

const mocks = vi.hoisted(() => ({
  runExtensionCommand: vi.fn(),
}));

vi.mock("../../command-runner", () => ({
  runExtensionCommand: mocks.runExtensionCommand,
}));

vi.mock("../../factory", () => ({
  resolveAgentConfig: vi.fn(async () => ({
    language: "zh",
    temperature: 0.4,
    rawConfig: { enabled: true, apiKey: "test-key", model: "test-model" },
  })),
  assertAgentConfigured: vi.fn(),
}));

describe("CategoryGenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses an OpenAI-compatible strict recursive output schema", async () => {
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        categories: [
          {
            name: "开发",
            icon: null,
            children: [
              { name: "前端", icon: "code", children: null },
            ],
          },
        ],
      },
    });

    const { categoryGenerationService } = await import("../category-generation-service");
    const result = await categoryGenerationService.generateCategories("开发分类");
    const outputSchema = mocks.runExtensionCommand.mock.calls[0][0].command
      .outputSchema as JsonSchema;

    expect(() => validateStrictJsonSchema(outputSchema)).not.toThrow();
    expect(outputSchema).toMatchObject({
      required: ["categories"],
      additionalProperties: false,
      $defs: {
        category: {
          required: ["name", "icon", "children"],
          additionalProperties: false,
        },
      },
    });
    expect(result).toEqual([
      {
        name: "开发",
        children: [{ name: "前端", icon: "code" }],
      },
    ]);
  });
});
