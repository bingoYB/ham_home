import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

import { createLogger } from "@hamhome/utils";

const logger = createLogger({ namespace: "AI" });

function createPromptTemplate(withSystem: boolean) {
  return ChatPromptTemplate.fromMessages(
    withSystem
      ? [
          ["system", "{system}"],
          ["human", "{prompt}"],
        ]
      : [["human", "{prompt}"]],
  );
}

export function logRequest(
  debug: boolean,
  taskName: string,
  params: { system?: string; prompt: string },
) {
  if (!debug) {
    return;
  }

  logger.info(`[${taskName}] Request:`, {
    system: params.system
      ? `${params.system.slice(0, 200)}${params.system.length > 200 ? "..." : ""}`
      : undefined,
    prompt: `${params.prompt.slice(0, 500)}${params.prompt.length > 500 ? "..." : ""}`,
  });
}

export function logResponse(debug: boolean, taskName: string, result: unknown) {
  if (!debug) {
    return;
  }

  logger.info(`[${taskName}] Response:`, result);
}

export async function invokeStructuredChain<T extends z.ZodTypeAny>(options: {
  model: unknown;
  schema: T;
  prompt: string;
  system?: string;
  taskName: string;
  debug?: boolean;
}): Promise<z.infer<T>> {
  const { model, schema, prompt, system, taskName, debug = false } = options;
  logRequest(debug, taskName, { system, prompt });

  // Use StructuredOutputParser instead of withStructuredOutput for better compatibility
  // across diverse models (Ollama, SiliconFlow, etc) that might fail with function calling.
  // We need to import it here or at the top of the file
  const { StructuredOutputParser } = await import("@langchain/core/output_parsers");
  const parser = StructuredOutputParser.fromZodSchema(schema as any);
  const formatInstructions = parser.getFormatInstructions();

  const augmentedSystem = system
    ? `${system}\n\nIMPORTANT: You must process the request and reply ONLY with a valid JSON object.\n${formatInstructions}`
    : `Please process the following request and reply ONLY with a valid JSON object.\n\n${formatInstructions}`;

  const promptTemplate = createPromptTemplate(true);
  const chain = RunnableSequence.from([
    promptTemplate,
    model as any,
    parser,
  ]);

  const result = await chain.invoke({ system: augmentedSystem, prompt });
  logResponse(debug, taskName, result);
  return result as z.infer<T>;
}

function extractTextContent(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "content" in value
  ) {
    const content = (value as { content: unknown }).content;
    if (typeof content === "string") {
      return content.trim();
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (
            typeof item === "object" &&
            item !== null &&
            "text" in item &&
            typeof (item as { text: unknown }).text === "string"
          ) {
            return (item as { text: string }).text;
          }
          return "";
        })
        .join("")
        .trim();
    }
  }

  return "";
}

export async function invokeTextChain(options: {
  model: unknown;
  prompt: string;
  system?: string;
  taskName: string;
  debug?: boolean;
}): Promise<string> {
  const { model, prompt, system, taskName, debug = false } = options;
  logRequest(debug, taskName, { system, prompt });

  const promptTemplate = createPromptTemplate(Boolean(system));
  const chain = RunnableSequence.from([
    promptTemplate,
    model as any,
    new StringOutputParser(),
  ] as any);

  const result = await chain.invoke(system ? { system, prompt } : { prompt });
  const normalizedResult = extractTextContent(result);
  logResponse(debug, taskName, normalizedResult);
  return normalizedResult;
}
