import { MemoryStorage, MemoryOptions, ModelMessage } from "../src/memory/types";
import { BaseMemory } from "../src/memory/base";
import { describe, it, expect, vi } from "vitest";

// 模拟存储
class MockStorage implements MemoryStorage {
  private data: Map<string, ModelMessage[]> = new Map();
  async save(key: string, messages: ModelMessage[]) { this.data.set(key, messages); }
  async load(key: string) { return this.data.get(key) || null; }
  async delete(key: string) { this.data.delete(key); }
  async clear() { this.data.clear(); }
}

describe("Memory System", () => {
  it("should add messages and trigger base persistence", async () => {
    const storage = new MockStorage();
    const sessionId = "test-session";
    
    // 我们需要一个简单的类来测试基类逻辑
    class SimpleMemory extends BaseMemory {
      public compressCount = 0;
      protected async compress() {
        this.compressCount++;
        this.messages = this.messages.slice(-2);
      }
    }

    const memory = new SimpleMemory({
      sessionId,
      maxMessages: 3,
      storage
    });

    await memory.addMessage({ role: "user", content: "hi 1" });
    await memory.addMessage({ role: "assistant", content: "hello 1" });
    
    expect((await memory.getMessages()).length).toBe(2);
    
    // 添加第三个消息，触发阈值
    await memory.addMessage({ role: "user", content: "hi 2" });
    expect(memory.compressCount).toBe(0); // 还没超过 maxMessages

    // 添加第四个消息，触发压缩
    await memory.addMessage({ role: "assistant", content: "hello 2" });
    expect(memory.compressCount).toBe(1);
    expect((await memory.getMessages()).length).toBe(2); 
  });

  it("should load existing session from storage", async () => {
    const storage = new MockStorage();
    const sessionId = "existing-session";
    const initialMessages: ModelMessage[] = [{ role: "user", content: "old message" }];
    await storage.save(sessionId, initialMessages);

    class SimpleMemory extends BaseMemory {
      protected async compress() {}
    }

    const memory = new SimpleMemory({ sessionId, storage });
    const messages = await memory.getMessages();
    expect(messages).toEqual(initialMessages);
  });
});
