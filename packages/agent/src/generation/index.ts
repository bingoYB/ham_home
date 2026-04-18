import { generateObject } from "ai";
import { createAgentModel } from "../agent";
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

  return generateObject({
    model,
    schema: schema as any,
    prompt,
    system,
    temperature,
    maxOutputTokens: maxTokens,
  });
}
