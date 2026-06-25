import { z } from "zod";
import type { JsonSchema } from "@browser-agent-sdk/agent";
import type { AIGeneratedCategory } from "@/types";
import { runExtensionCommand } from "../command-runner";
import { getAgentErrorMessage } from "../errors";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";

type GeneratedCategoryOutput = {
  name: string;
  icon?: string | null;
  children?: GeneratedCategoryOutput[] | null;
};

const generatedCategorySchema: z.ZodType<GeneratedCategoryOutput> = z.lazy(() =>
  z.object({
    name: z.string(),
    icon: z.string().nullable().optional(),
    children: z.array(generatedCategorySchema).nullable().optional(),
  }),
);

const generatedCategoryListSchema = z.object({
  categories: z.array(generatedCategorySchema),
});

type CategoryGenerationOutput = z.infer<typeof generatedCategoryListSchema>;

function createGeneratedCategoryJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      name: { type: "string" },
      icon: {},
      children: {},
    },
    required: ["name"],
    additionalProperties: false,
  };
}

const generatedCategoryListOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: createGeneratedCategoryJsonSchema(),
    },
  },
  required: ["categories"],
  additionalProperties: false,
};

function normalizeGeneratedCategory(
  category: GeneratedCategoryOutput,
): AIGeneratedCategory {
  return {
    name: category.name,
    ...(category.icon ? { icon: category.icon } : {}),
    ...(category.children?.length
      ? { children: category.children.map(normalizeGeneratedCategory) }
      : {}),
  };
}

class CategoryGenerationService {
  async generateCategories(description: string): Promise<AIGeneratedCategory[]> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await runExtensionCommand<Record<string, never>, CategoryGenerationOutput>({
        config,
        temperature: config.temperature ?? 0.4,
        maxIterations: 1,
        systemPrompt:
          config.language === "zh"
            ? "你是 HamHome 的分类体系设计助手。请根据用户描述生成可直接用于书签管理的层级分类方案，名称清晰、避免重复、层级不要过深。"
            : "You are HamHome's category system design assistant. Generate a practical hierarchical category scheme for bookmark management with clear non-duplicated names and shallow depth.",
        command: {
          name: "generateCategories",
          description: "Generate a bookmark category tree.",
          outputSchema: generatedCategoryListOutputSchema,
          prompt: `language: ${config.language}\n\ndescription:\n${description}`,
        },
        input: {},
      });

      return generatedCategoryListSchema
        .parse(result.output)
        .categories.map(normalizeGeneratedCategory);
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "分类生成失败"));
    }
  }
}

export const categoryGenerationService = new CategoryGenerationService();
