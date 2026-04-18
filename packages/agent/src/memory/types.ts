import type { ModelMessage } from "ai";
export type { ModelMessage };

/**
 * 消息持久化抽象接口
 */
export interface MemoryStorage {
  /**
   * 保存消息列表
   * @param key 唯一标识（如 sessionId）
   * @param messages 消息列表
   */
  save(key: string, messages: ModelMessage[]): Promise<void>;

  /**
   * 加载消息列表
   * @param key 唯一标识
   */
  load(key: string): Promise<ModelMessage[] | null>;

  /**
   * 删除消息
   * @param key 唯一标识
   */
  delete(key: string): Promise<void>;

  /**
   * 清除所有
   */
  clear(): Promise<void>;
}

/**
 * 记忆配置选项
 */
export interface MemoryOptions {
  /**
   * 会话唯一标识
   */
  sessionId: string;
  /**
   * 最大消息保留数量，超过此值将触发压缩
   */
  maxMessages?: number;
  /**
   * 持久化存储实现
   */
  storage?: MemoryStorage;
  /**
   * 用于压缩的 LLM 配置
   */
  summarizer?: {
    model: string;
    prompt?: string;
  };
}
