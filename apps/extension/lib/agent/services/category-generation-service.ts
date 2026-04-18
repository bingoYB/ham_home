import { generateStructuredObject } from "@hamhome/agent";
import { z } from "zod";
import type { AIGeneratedCategory } from "@/types";
import { getAgentErrorMessage } from "../errors";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";

const generatedCategorySchema: z.ZodType<AIGeneratedCategory> = z.lazy(() =>
  z.object({
    name: z.string().trim().min(1).max(40),
    icon: z.string().trim().max(4).optional(),
    children: z.array(generatedCategorySchema).max(12).optional(),
  }),
);

const generatedCategoryListSchema = z.object({
  categories: z.array(generatedCategorySchema).min(3).max(12),
});

type CategoryGenerationOutput = z.infer<typeof generatedCategoryListSchema>;

class CategoryGenerationService {
  async generateCategories(description: string): Promise<AIGeneratedCategory[]> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await generateStructuredObject({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        temperature: config.temperature ?? 0.4,
        maxTokens: config.maxTokens ?? 1200,
        schema: generatedCategoryListSchema,
        system:
          config.language === "zh"
            ? "你是 HamHome 的分类体系设计助手。请根据用户描述生成可直接用于书签管理的层级分类方案，名称清晰、避免重复、层级不要过深。"
            : "You are HamHome's category system design assistant. Generate a practical hierarchical category scheme for bookmark management with clear non-duplicated names and shallow depth.",
        prompt: `language: ${config.language}\n\ndescription:\n${description}`,
      });

      return (result.object as CategoryGenerationOutput).categories;
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "分类生成失败"));
    }
  }
}

export const categoryGenerationService = new CategoryGenerationService();
