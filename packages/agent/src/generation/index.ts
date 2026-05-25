import { generateObject, streamObject } from "ai";
import { createAgentModel } from "../agent";
import { logger } from "../utils/logger";
import type { AgentModelConfig } from "../agent/types";

export interface GenerateStructuredObjectOptions extends AgentModelConfig {
  schema: any;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateStructuredObject(
  options: GenerateStructuredObjectOptions,
): Promise<any> {
  const { schema, prompt, system, temperature, maxTokens, ...modelConfig } =
    options;

  const model = createAgentModel(modelConfig);

  try {
    return await generateObject({
      model,
      schema: schema as any,
      prompt,
      system,
      temperature,
      maxOutputTokens: maxTokens,
    });
  } catch (e: any) {
    if (e.message?.includes("Invalid JSON response")) {
      logger.warn("generateObject failed with Invalid JSON response, falling back to streamObject", { error: e.message });
      const result = await streamObject({
        model,
        schema: schema as any,
        prompt,
        system,
        temperature,
        maxOutputTokens: maxTokens,
      });
      const object = await readStructuredObjectFromTextStream(
        result.textStream,
        schema,
      );
      return {
        object,
      };
    }
    throw e;
  }
}

async function readStructuredObjectFromTextStream<T>(
  textStream: AsyncIterable<string>,
  schema: {
    safeParse?: (value: unknown) =>
      | { success: true; data: T }
      | { success: false; error: unknown };
  },
): Promise<T> {
  let text = "";

  for await (const chunk of textStream) {
    text += chunk;

    const parsed = tryParseJson(text);
    if (parsed === undefined) {
      continue;
    }

    if (!schema.safeParse) {
      return parsed as T;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    throw result.error;
  }

  const parsed = JSON.parse(text) as unknown;
  if (!schema.safeParse) {
    return parsed as T;
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  throw result.error;
}

function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
