import type { ModelMessage } from "ai";
import type { MemoryOptions, MemoryStorage } from "./types";

/**
 * 上下文记忆管理类 (Vercel AI SDK 兼容版)
 */
export abstract class BaseMemory {
  protected messages: ModelMessage[] = [];
  protected sessionId: string;
  protected maxMessages: number;
  protected storage?: MemoryStorage;

  constructor(options: MemoryOptions) {
    this.sessionId = options.sessionId;
    this.maxMessages = options.maxMessages || 10;
    this.storage = options.storage;
  }

  /**
   * 获取当前上下文消息
   */
  async getMessages(): Promise<ModelMessage[]> {
    if (this.messages.length === 0 && this.storage) {
      const stored = await this.storage.load(this.sessionId);
      if (stored) {
        this.messages = stored;
      }
    }
    return this.messages;
  }

  /**
   * 添加消息
   */
  async addMessage(message: ModelMessage): Promise<void> {
    this.messages.push(message);
    
    // 检查是否需要压缩
    if (this.messages.length > this.maxMessages) {
      await this.compress();
    }

    // 持久化存储
    if (this.storage) {
      await this.storage.save(this.sessionId, this.messages);
    }
  }

  /**
   * 清除记忆
   */
  async clear(): Promise<void> {
    this.messages = [];
    if (this.storage) {
      await this.storage.delete(this.sessionId);
    }
  }

  /**
   * 上下文压缩抽象方法，子类实现具体压缩算法
   */
  protected abstract compress(): Promise<void>;
}
