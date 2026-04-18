import { generateStructuredObject } from "@hamhome/agent";
import { z } from "zod";
import { getAgentErrorMessage } from "../errors";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";

const translationSchema = z.object({
  translatedText: z.string().trim().min(1),
});

type TranslationOutput = z.infer<typeof translationSchema>;

class TranslationService {
  async translate(text: string, targetLang: "zh" | "en" = "zh"): Promise<string> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await generateStructuredObject({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        temperature: 0.1,
        maxTokens: Math.min(config.maxTokens ?? 500, 500),
        schema: translationSchema,
        system:
          targetLang === "zh"
            ? "你是精准翻译助手。请保留原始含义、术语、Markdown 结构与列表格式，只返回翻译后的文本。"
            : "You are a precise translation assistant. Preserve meaning, terminology, markdown structure, and list formatting. Return only the translated text.",
        prompt: `targetLanguage: ${targetLang}\n\ntext:\n${text}`,
      });

      return (result.object as TranslationOutput).translatedText.trim();
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "翻译失败"));
    }
  }
}

export const translationService = new TranslationService();
