import type { LanguageModelMiddleware } from "ai";

type ModelCallOptions = Parameters<
  NonNullable<LanguageModelMiddleware["transformParams"]>
>[0]["params"];

/** Retry unsupported JSON-object mode as text, retaining the schema as guidance. */
export const compatibleStructuredOutputMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  async wrapGenerate({ doGenerate, model, params }) {
    try {
      return await doGenerate();
    } catch (error) {
      if (!shouldRetryWithoutResponseFormat(error, params)) throw error;
      return model.doGenerate(toTextResponseOptions(params));
    }
  },
  async wrapStream({ doStream, model, params }) {
    try {
      return await doStream();
    } catch (error) {
      if (!shouldRetryWithoutResponseFormat(error, params)) throw error;
      return model.doStream(toTextResponseOptions(params));
    }
  },
};

function shouldRetryWithoutResponseFormat(error: unknown, params: ModelCallOptions): boolean {
  if (params.abortSignal?.aborted || params.responseFormat?.type !== "json") return false;
  if (!error || typeof error !== "object") return false;

  const { statusCode, message, responseBody } = error as {
    statusCode?: unknown;
    message?: unknown;
    responseBody?: unknown;
  };
  const details = [message, responseBody].filter((value) => typeof value === "string").join(" ");
  return statusCode === 400 && /response[_\s.-]?format/i.test(details);
}

function toTextResponseOptions(params: ModelCallOptions): ModelCallOptions {
  const format = params.responseFormat;
  const schema = format?.type === "json" ? format.schema : undefined;
  const instruction = [
    "Return only a valid JSON object, without Markdown or additional text.",
    ...(schema ? [`The JSON object must match this JSON Schema: ${JSON.stringify(schema)}`] : []),
  ].join("\n");
  const systemIndex = params.prompt.findIndex((message) => message.role === "system");
  const prompt: ModelCallOptions["prompt"] = systemIndex < 0
    ? [{ role: "system", content: instruction }, ...params.prompt]
    : params.prompt.map((message, index) =>
      index === systemIndex && message.role === "system"
        ? { ...message, content: `${message.content}\n\n${instruction}` }
        : message,
    );

  return { ...params, prompt, responseFormat: { type: "text" } };
}
