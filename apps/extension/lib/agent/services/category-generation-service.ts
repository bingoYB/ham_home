import { z } from "zod";
import type { AgentCommand, JsonSchema } from "@hamhome/agent";
import type { AIGeneratedCategory, Language } from "@/types";
import { getAgentErrorMessage } from "../errors";
import { createExtensionAgent } from "../factory";

interface GenerateCategoriesInput {
  language: Language;
  description: string;
}

type GeneratedCategoryOutput = {
  name: string;
  icon: string | null;
  children: GeneratedCategoryOutput[] | null;
};

const generatedCategorySchema: z.ZodType<GeneratedCategoryOutput> = z.lazy(() =>
  z.object({
    name: z.string(),
    icon: z.string().nullable(),
    children: z.array(generatedCategorySchema).nullable(),
  }),
);

const generatedCategoryListSchema = z.object({
  categories: z.array(generatedCategorySchema),
});

type CategoryGenerationOutput = z.infer<typeof generatedCategoryListSchema>;

const generatedCategoryListOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: { $ref: "#/$defs/category" },
    },
  },
  required: ["categories"],
  additionalProperties: false,
  $defs: {
    category: {
      type: "object",
      properties: {
        name: { type: "string" },
        icon: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        children: {
          anyOf: [
            {
              type: "array",
              items: { $ref: "#/$defs/category" },
            },
            { type: "null" },
          ],
        },
      },
      required: ["name", "icon", "children"],
      additionalProperties: false,
    },
  },
};

function buildCategoryGenerationSystemPrompt(language: Language): string {
  return language === "zh"
    ? "你是 HamHome 的分类体系设计助手。请根据用户描述生成可直接用于书签管理的层级分类方案，名称清晰、避免重复、层级不要过深。"
    : "You are HamHome's category system design assistant. Generate a practical hierarchical category scheme for bookmark management with clear non-duplicated names and shallow depth.";
}

const generateCategoriesCommand: AgentCommand<
  GenerateCategoriesInput,
  CategoryGenerationOutput
> = {
  name: "generateCategories",
  description: "Generate a bookmark category tree.",
  outputSchema: generatedCategoryListOutputSchema,
  maxIterations: 1,
  prompt: ({ language, description }) =>
    `language: ${language}\n\ndescription:\n${description}`,
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
    const { agent, config } = await createExtensionAgent();

    try {
      const { output } = await agent.commands.run(
        generateCategoriesCommand,
        { language: config.language, description },
        {
          systemPrompt: buildCategoryGenerationSystemPrompt(config.language),
          temperature: config.temperature ?? 0.4,
        },
      );

      return generatedCategoryListSchema
        .parse(output)
        .categories.map(normalizeGeneratedCategory);
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "分类生成失败"));
    }
  }
}

export const categoryGenerationService = new CategoryGenerationService();
