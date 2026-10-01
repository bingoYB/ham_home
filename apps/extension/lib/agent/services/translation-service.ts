import { z } from "zod";
import type { AgentCommand, JsonSchema } from "@hamhome/agent";
import { getAgentErrorMessage } from "../errors";
import { createExtensionAgent } from "../factory";

type TargetLanguage = "zh" | "en";

interface TranslateTextInput {
  text: string;
  targetLang: TargetLanguage;
}

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

function buildTranslationSystemPrompt(targetLang: TargetLanguage): string {
  return targetLang === "zh"
    ? "你是精准翻译助手。请保留原始含义、术语、Markdown 结构与列表格式，只返回翻译后的文本。"
    : "You are a precise translation assistant. Preserve meaning, terminology, markdown structure, and list formatting. Return only the translated text.";
}

const translateTextCommand: AgentCommand<TranslateTextInput, TranslationOutput> = {
  name: "translateText",
  description: "Translate text into the target language.",
  outputSchema: translationOutputSchema,
  maxIterations: 1,
  prompt: ({ text, targetLang }) => `targetLanguage: ${targetLang}\n\ntext:\n${text}`,
};

class TranslationService {
  async translate(text: string, targetLang: TargetLanguage = "zh"): Promise<string> {
    const { agent } = await createExtensionAgent();

    try {
      const { output } = await agent.commands.run(
        translateTextCommand,
        { text, targetLang },
        { systemPrompt: buildTranslationSystemPrompt(targetLang), temperature: 0.1 },
      );

      return translationSchema.parse(output).translatedText.trim();
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "翻译失败"));
    }
  }
}

export const translationService = new TranslationService();
