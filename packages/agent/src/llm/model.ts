import {
  generateText,
  streamText,
  jsonSchema,
  Output,
  tool as aiTool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai";
import { resolveLanguageModel } from "./providers";
import { validateStrictJsonSchema } from "../utils/schema";
import type {
  AgentMessage,
  AiSdkProviderConfig,
  JsonSchema,
  ModelClient,
  ModelGenerateRequest,
  ModelGenerateResult,
} from "../core/types";

/**
 * Vercel AI SDK backed model client used by the default Agent runtime.
 *
 * Example:
 * ```ts
 * const client = new AiSdkModelClient({ provider: "openai", model: "gpt-4.1-mini" });
 * const result = await client.generate({ messages, tools, maxIterations: 3, toolContext });
 * ```
 */
export class AiSdkModelClient implements ModelClient {
  constructor(private readonly config: AiSdkProviderConfig) {}

  async generate<TOutput = unknown>(request: ModelGenerateRequest): Promise<ModelGenerateResult<TOutput>> {
    const model = await this.resolveModel(request.model ?? this.config.model, request.invocationMode);
    const tools = toAiSdkTools(request);


    try {
      const result = await generateText({
        model,
        system: buildSystemPrompt(request.systemPrompt),
        messages: toModelMessages(request.messages),
        tools,
        output: toAiSdkOutput(request.outputSchema),
        activeTools: request.activeToolNames as Array<keyof typeof tools> | undefined,
        temperature: request.temperature,
        abortSignal: request.signal,
        experimental_context: request.toolContext,
        experimental_onStepStart: ({ stepNumber }) => {
          request.emit?.({ type: "agent.iteration.started", iteration: stepNumber + 1 });
        },
      });

      const toolCalls: ModelGenerateResult["toolCalls"] = (result.toolCalls ?? []).map((call) => ({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        input: call.input as unknown,
      }));

      return {
        text: result.text,
        output: request.outputSchema ? (result.output as TOutput) : undefined,
        toolCalls,
        usage: result.totalUsage,
      };
    } catch (error: any) {
      // 兼容模型接口返回stream数据的情况
      if (error?.statusCode === 200 && typeof error?.responseBody === "string" && error.responseBody.includes("data:")) {
        return this.stream<TOutput>(request);
      }
      throw error;
    }
  }

  async stream<TOutput = unknown>(request: ModelGenerateRequest): Promise<ModelGenerateResult<TOutput>> {
    const model = await this.resolveModel(request.model ?? this.config.model, request.invocationMode);
    const tools = toAiSdkTools(request);

    const result = streamText({
      model,
      system: buildSystemPrompt(request.systemPrompt),
      messages: toModelMessages(request.messages),
      tools,
      output: toAiSdkOutput(request.outputSchema),
      activeTools: request.activeToolNames as Array<keyof typeof tools> | undefined,
      temperature: request.temperature,
      abortSignal: request.signal,
      experimental_context: request.toolContext,
      experimental_onStepStart: ({ stepNumber }) => {
        request.emit?.({ type: "agent.iteration.started", iteration: stepNumber + 1 });
      },
    });

    for await (const chunk of result.textStream) {
      if (chunk) {
        request.emit?.({ type: "message.delta", delta: chunk });
      }
    }

    const text = await result.text;
    const aiToolCalls = await result.toolCalls;
    const usage = await result.usage;

    const toolCalls: ModelGenerateResult["toolCalls"] = (aiToolCalls ?? []).map((call: any) => ({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: (call.args !== undefined ? call.args : call.input) as unknown,
    }));

    let output: TOutput | undefined;
    if (request.outputSchema && "output" in result) {
      output = await result.output as TOutput;
    }

    if (request.outputSchema && text) {
      try {
        output ??= JSON.parse(text) as TOutput;
      } catch (e) {
        // ignore parsing error
      }
    }

    return {
      text,
      output,
      toolCalls,
      usage,
    };
  }

  private async resolveModel(model: string | LanguageModel | undefined, invocationMode?: "response" | "chat"): Promise<LanguageModel> {
    return resolveLanguageModel({ ...this.config, model }, invocationMode);
  }
}

function toAiSdkTools(request: ModelGenerateRequest): ToolSet {
  return Object.fromEntries(
    request.tools.map((tool) => [
      tool.name,
      aiTool({
        description: tool.description,
        inputSchema: jsonSchema((tool.parameters ?? { type: "object", properties: {}, additionalProperties: true }) as JsonSchema),
      }),
    ]),
  );
}

function toAiSdkOutput(outputSchema: JsonSchema | undefined) {
  if (!outputSchema) {
    return undefined;
  }

  validateStrictJsonSchema(outputSchema);

  return Output.object({
    schema: jsonSchema(outputSchema),
  });
}

function toModelMessages(messages: AgentMessage[]): ModelMessage[] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      if (message.role === "user") {
        const parts = toUserContentParts(message);
        return parts ? ({ role: "user", content: parts } as ModelMessage) : { role: "user", content: message.content };
      }

      if (message.role === "tool") {
        let result: any;
        try {
          result = JSON.parse(message.content);
        } catch {
          result = message.content;
        }

        return {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: (message.metadata?.toolCallId as string) || "unknown",
              toolName: (message.metadata?.toolName as string) || "unknown",
              output: toToolResultOutput(result),
            },
          ],
        } as ModelMessage;
      }

      if (message.metadata?.toolCalls && Array.isArray(message.metadata.toolCalls) && message.metadata.toolCalls.length > 0) {
        const toolCalls = message.metadata.toolCalls as any[];
        const content: any[] = [];
        if (message.content) {
          content.push({ type: "text", text: message.content });
        }
        for (const call of toolCalls) {
          content.push({
            type: "tool-call",
            toolCallId: call.toolCallId || "unknown",
            toolName: call.toolName,
            input: call.input,
          });
        }
        return { role: "assistant", content } as ModelMessage;
      }

      return { role: "assistant", content: message.content };
    });
}

/**
 * Builds the multimodal content parts of a user message.
 * Returns undefined when the message carries no attachment, so plain text
 * messages keep their original string content.
 */
function toUserContentParts(message: AgentMessage): any[] | undefined {
  if (!message.attachments?.length) {
    return undefined;
  }

  const parts: any[] = [];
  if (message.content) {
    parts.push({ type: "text", text: message.content });
  }

  for (const attachment of message.attachments) {
    if (attachment.type === "text") {
      if (attachment.text) {
        parts.push({ type: "text", text: attachment.text });
      }
      continue;
    }

    parts.push(toImagePart(attachment.image, attachment.mediaType));
  }

  return parts.length > 0 ? parts : undefined;
}

/** `data:<mediaType>;base64,<content>` */
const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.+)$/s;

/**
 * The AI SDK treats any parsable URL — `data:` URLs included — as a remote
 * asset to download, and its downloader rejects every scheme but http(s).
 * Splitting a data URL into base64 + mediaType keeps it inline instead.
 */
function toImagePart(image: string, mediaType?: string): any {
  const dataUrl = DATA_URL_PATTERN.exec(image);
  if (dataUrl) {
    return {
      type: "image",
      image: dataUrl[2],
      mediaType: mediaType ?? dataUrl[1],
    };
  }

  return {
    type: "image",
    image,
    ...(mediaType ? { mediaType } : {}),
  };
}

function buildSystemPrompt(systemPrompt: string | undefined): string | undefined {
  return systemPrompt;
}

function toToolResultOutput(result: unknown) {
  if (typeof result === "string") {
    return { type: "text", value: result };
  }

  return { type: "json", value: result === undefined ? null : result };
}
