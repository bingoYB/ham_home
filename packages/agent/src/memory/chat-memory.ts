import { generateText, type LanguageModel } from "ai";
import { BaseMemory } from "./base";
import type { MemoryOptions } from "./types";

/**
 * 支持 LLM 自动压缩总结的消息记忆实现
 */
export class ChatMemory extends BaseMemory {
  private model: LanguageModel;
  private summarizerPrompt: string;

  constructor(
    options: MemoryOptions & {
      model: LanguageModel;
      summarizerPrompt?: string;
    }
  ) {
    super(options);
    this.model = options.model;
    this.summarizerPrompt =
      options.summarizerPrompt ||
      "Summarize this conversation for continuity. Include: " +
      "1) What was accomplished, 2) Current state, 3) Key decisions made. " +
      "Be concise but preserve critical details.";
  }

  /**
   * 使用 LLM 对上下文进行摘要压缩
   */
  protected async compress(): Promise<void> {
    if (this.messages.length <= 1) return;

    // 获取需要压缩的消息（取截断后的 JSON 字符串以防超长）
    const conversationText = JSON.stringify(this.messages).slice(0, 80_000);

    const { text } = await generateText({
      model: this.model,
      messages: [
        {
          role: "user",
          content: `${this.summarizerPrompt}\n\n${conversationText}`,
        },
      ],
    });

    const summary = text || "(no summary)";

    // 组合新消息列表：一条用户角色的摘要消息，一条助手的确认消息
    this.messages = [
      {
        role: "user",
        content: `[Conversation compressed.]\n\n${summary}`,
      },
      {
        role: "assistant",
        content: "Understood. I have the context from the summary. Continuing.",
      },
    ];
  }

  /**
   * 静态构建方法
   */
  static async create(
    options: MemoryOptions & { model: LanguageModel }
  ): Promise<ChatMemory> {
    const memory = new ChatMemory(options);
    // 加载已有数据
    await memory.getMessages();
    return memory;
  }
}
