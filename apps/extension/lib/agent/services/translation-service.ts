import { z } from "zod";
import type { JsonSchema } from "@browser-agent-sdk/agent";
import { runExtensionCommand } from "../command-runner";
import { getAgentErrorMessage } from "../errors";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";

const translationSchema = z.object({
  translatedText: z.string().trim().min(1),
});

type TranslationOutput = z.infer<typeof translationSchema>;

const translationOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    translatedText: { type: "string" },
  },
  required: ["translatedText"],
  additionalProperties: false,
};

class TranslationService {
  async translate(text: string, targetLang: "zh" | "en" = "zh"): Promise<string> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await runExtensionCommand<Record<string, never>, TranslationOutput>({
        config,
        temperature: 0.1,
        maxIterations: 1,
        systemPrompt:
          targetLang === "zh"
            ? "你是精准翻译助手。请保留原始含义、术语、Markdown 结构与列表格式，只返回翻译后的文本。"
            : "You are a precise translation assistant. Preserve meaning, terminology, markdown structure, and list formatting. Return only the translated text.",
        command: {
          name: "translateText",
          description: "Translate text into the target language.",
          outputSchema: translationOutputSchema,
          prompt: `targetLanguage: ${targetLang}\n\ntext:\n${text}`,
        },
        input: {},
      });

      return translationSchema.parse(result.output).translatedText.trim();
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "翻译失败"));
    }
  }
}

export const translationService = new TranslationService();
