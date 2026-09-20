import { describe, expect, it } from "vitest";
import {
  createAgent,
  type ModelClient,
  type ModelGenerateRequest,
} from "../index";

class RecordingModelClient implements ModelClient {
  readonly requests: ModelGenerateRequest[] = [];

  async generate(request: ModelGenerateRequest) {
    this.requests.push(request);
    return { text: '{"category":"设计","tags":["图表"]}', toolCalls: [] };
  }
}

describe("multimodal command attachments", () => {
  it("delivers command attachments to the model through memory", async () => {
    const modelClient = new RecordingModelClient();
    const agent = createAgent({ modelClient });

    agent.commands.register({
      name: "analyzeImage",
      prompt: "describe the image",
      attachments: [{ type: "image", image: "AAAA", mediaType: "image/png" }],
    });

    await agent.commands.run("analyzeImage", {});

    const userMessage = modelClient.requests[0].messages.find(
      (message) => message.role === "user",
    );
    expect(userMessage?.content).toBe("describe the image");
    expect(userMessage?.attachments).toEqual([
      { type: "image", image: "AAAA", mediaType: "image/png" },
    ]);
  });

  it("leaves plain commands without attachments", async () => {
    const modelClient = new RecordingModelClient();
    const agent = createAgent({ modelClient });

    agent.commands.register({ name: "plain", prompt: "hello" });
    await agent.commands.run("plain", {});

    const userMessage = modelClient.requests[0].messages.find(
      (message) => message.role === "user",
    );
    expect(userMessage?.attachments).toBeUndefined();
  });
});
