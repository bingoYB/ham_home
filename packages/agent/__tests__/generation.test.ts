import { generateObject, streamObject, type LanguageModel } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAgentModel } from "../src/agent";
import { generateStructuredObject } from "../src/generation";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  return {
    ...actual,
    generateObject: vi.fn(),
    streamObject: vi.fn(),
  };
});

vi.mock("../src/agent", async () => {
  const actual = await vi.importActual<typeof import("../src/agent")>(
    "../src/agent",
  );

  return {
    ...actual,
    createAgentModel: vi.fn(),
  };
});

const mockedGenerateObject = vi.mocked(generateObject);
const mockedStreamObject = vi.mocked(streamObject);
const mockedCreateAgentModel = vi.mocked(createAgentModel);
const model = {} as LanguageModel;

describe("generateStructuredObject", () => {
  beforeEach(() => {
    mockedGenerateObject.mockReset();
    mockedStreamObject.mockReset();
    mockedCreateAgentModel.mockReset();
    mockedCreateAgentModel.mockReturnValue(model);
  });

  it("should resolve from streamed JSON without waiting for the stream result object", async () => {
    mockedGenerateObject.mockRejectedValueOnce(
      new Error("Invalid JSON response"),
    );

    mockedStreamObject.mockResolvedValueOnce({
      textStream: (async function* () {
        yield '{"title":"ok",';
        yield '"summary":"done"}';
        await new Promise(() => {});
      })(),
      object: new Promise(() => {}),
      usage: new Promise(() => {}),
    } as never);

    const result = await generateStructuredObject({
      provider: "openai",
      model: "gpt-4o-mini",
      schema: z.object({
        title: z.string(),
        summary: z.string(),
      }),
      prompt: "analyze",
    });

    expect(result.object).toEqual({
      title: "ok",
      summary: "done",
    });
  });
});
