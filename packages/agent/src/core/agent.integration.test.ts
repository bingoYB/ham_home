import { describe, expect, it } from "vitest";
import { createAgent } from "../index";
// Only run this test if an API key is provided
const shouldRun = !!process.env.OPENAI_API_KEY;

describe.runIf(shouldRun)("Agent Integration (Real API)", () => {
  it("can interact with a real language model", async () => {
    const agent = createAgent({
      provider: "openai",
      model: process.env.TEST_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      systemPrompt: "You are a helpful assistant. Reply with exactly one word: 'hello'.",
      temperature: 0,
    });

    const result = await agent.run("Say hello");

    // Check if the model returned a sensible text
    expect(result.text.toLowerCase()).toContain("hello");
  }, 60000); // 60s timeout for network request

  it("can use a tool with a real language model", async () => {
    const agent = createAgent({
      provider: "openai",
      model: process.env.TEST_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      systemPrompt: "You are a helpful assistant.",
      temperature: 0,
      tools: [
        {
          name: "getWeather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA"
              }
            },
            required: ["location"]
          },
          execute: ({ location }) => {
            return { weather: "Sunny", temperature: 72, location };
          }
        }
      ]
    });

    const result = await agent.run("What's the weather like in Paris?");

    console.log("result.text", result);

    // Check if the agent called the tool
    expect(result.toolCalls.length).toBeGreaterThan(0);
    expect(result.toolCalls[0].toolName).toBe("getWeather");

    // Ensure the final response incorporates the tool's output
    expect(result.text.toLowerCase()).toContain("sunny");
  }, 60000);

  it("can generate structured JSON output", async () => {
    const agent = createAgent({
      provider: "openai",
      model: process.env.TEST_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      temperature: 0,
    });

    agent.commands.register({
      name: "extractInfo",
      prompt: "Extract information from the following text: {{text}}",
      outputSchema: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
            description: "A list of relevant tags"
          },
          summary: {
            type: "string",
            description: "A short summary of the text"
          },
          category: {
            type: "string",
            description: "The main category of the text"
          }
        },
        required: ["tags", "summary", "category"],
        additionalProperties: false
      }
    });

    const result = await agent.commands.run<{ text: string }, { tags: string[], summary: string, category: string }>("extractInfo", {
      text: "TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale."
    });

    console.log("result output", result.output);

    // Check if the output is structured correctly
    expect(result.output).toHaveProperty("tags");
    expect(result.output).toHaveProperty("summary");
    expect(result.output).toHaveProperty("category");
    expect(Array.isArray(result.output.tags)).toBe(true);
    expect(typeof result.output.summary).toBe("string");
    expect(typeof result.output.category).toBe("string");
  }, 60000);

  it("can run built-in testConnection command with real API", async () => {
    const agent = createAgent({
      provider: "openai",
      model: process.env.TEST_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      temperature: 0,
    });

    const result = await agent.commands.run("testConnection", {});
    expect(result.output).toHaveProperty("success");
    expect(typeof (result.output as any).success).toBe("boolean");
    expect((result.output as any).success).toBe(true);
  }, 60000);
});
