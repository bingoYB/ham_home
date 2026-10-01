import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateStrictJsonSchema, type JsonSchema } from "@hamhome/agent";

const mocks = vi.hoisted(() => ({
  runCommand: vi.fn(),
}));

vi.mock("../../factory", () => ({
  createExtensionAgent: vi.fn(async () => ({
    agent: { commands: { run: mocks.runCommand } },
    config: {
      language: "zh",
      temperature: 0.4,
      rawConfig: { enabled: true, apiKey: "test-key", model: "test-model" },
    },
  })),
}));

describe("CategoryGenerationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses an OpenAI-compatible strict recursive output schema", async () => {
    mocks.runCommand.mockResolvedValue({
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
    const [command, input, options] = mocks.runCommand.mock.calls[0];
    const outputSchema = command.outputSchema as JsonSchema;

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
    expect(command.prompt(input, {})).toBe("language: zh\n\ndescription:\n开发分类");
    expect(options).toMatchObject({ temperature: 0.4 });
    expect(options.systemPrompt).toContain("分类体系设计助手");
    expect(result).toEqual([
      {
        name: "开发",
        children: [{ name: "前端", icon: "code" }],
      },
    ]);
  });
});
