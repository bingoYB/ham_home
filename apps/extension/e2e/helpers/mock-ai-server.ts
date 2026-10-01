import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Worker } from "@playwright/test";
import { E2E_EXTENSION_CONFIG } from "../e2e.config";

export interface MockChatReply {
  /** Text pieces streamed one by one; joined for non-streaming requests. */
  chunks: string[];
  /** Delay before each streamed chunk, so tests can watch text arrive. */
  chunkDelayMs?: number;
}

export interface MockChatRequest {
  body: {
    model?: string;
    stream?: boolean;
    messages?: Array<{ role: string; content: unknown }>;
    tools?: unknown[];
  };
  /** The client closed the connection before the whole reply was sent. */
  aborted: boolean;
  /** The whole reply was sent. */
  completed: boolean;
}

export interface MockAiServer {
  /** OpenAI-compatible base URL, e.g. `http://127.0.0.1:53211/v1`. */
  baseUrl: string;
  /** Chat completion requests in arrival order. */
  requests: MockChatRequest[];
  /** Queues the reply for the next chat completion; the last queued reply is reused. */
  enqueueReply(reply: MockChatReply): void;
  close(): Promise<void>;
}

const DEFAULT_REPLY: MockChatReply = { chunks: ["OK"] };

/**
 * Starts a local OpenAI-compatible `/v1/chat/completions` mock on a free
 * port. Streaming requests get SSE chunks with `chunkDelayMs` between them,
 * so a test can observe a streamed answer and stop it halfway; other paths
 * return 404.
 *
 * Example:
 * ```ts
 * const server = await startMockAiServer();
 * server.enqueueReply({ chunks: ["Hello", " world"], chunkDelayMs: 200 });
 * await pointAiConfigToMock(extensionWorker, server.baseUrl);
 * ```
 */
export async function startMockAiServer(): Promise<MockAiServer> {
  const requests: MockChatRequest[] = [];
  const replies: MockChatReply[] = [];
  const nextReply = () => (replies.length > 1 ? replies.shift()! : replies[0] ?? DEFAULT_REPLY);

  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
    }
    if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
      res.writeHead(404).end();
      return;
    }

    const request: MockChatRequest = { body: JSON.parse(raw || "{}"), aborted: false, completed: false };
    requests.push(request);
    res.on("close", () => {
      request.aborted = !request.completed;
    });

    const reply = nextReply();
    if (request.body.stream) {
      await streamReply(res, reply, request);
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      request.completed = true;
      res.end(JSON.stringify(completion(reply.chunks.join(""))));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requests,
    enqueueReply: (reply) => {
      replies.push(reply);
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/**
 * Points the extension's AI config at the mock. Call it after
 * `resetExtensionData()`, which restores the default config.
 */
export async function pointAiConfigToMock(worker: Worker, baseUrl: string): Promise<void> {
  const aiConfig = {
    ...E2E_EXTENSION_CONFIG.aiConfig,
    // The mock only speaks the OpenAI chat completions protocol.
    provider: "custom" as const,
    apiMode: "chat" as const,
    baseUrl,
  };
  await worker.evaluate(async (config) => {
    await chrome.storage.sync.set({ aiConfig: config });
  }, aiConfig);
}

async function streamReply(res: http.ServerResponse, reply: MockChatReply, request: MockChatRequest): Promise<void> {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  send(chunk({ role: "assistant", content: "" }));
  for (const text of reply.chunks) {
    await delay(reply.chunkDelayMs ?? 0);
    if (request.aborted || res.destroyed) {
      return;
    }
    send(chunk({ content: text }));
  }

  send(chunk({}, "stop"));
  send({ ...chunk({}), choices: [], usage: { prompt_tokens: 10, completion_tokens: reply.chunks.length, total_tokens: 10 + reply.chunks.length } });
  request.completed = true;
  res.end("data: [DONE]\n\n");
}

function chunk(delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id: "chatcmpl-e2e",
    object: "chat.completion.chunk",
    created: 1,
    model: "e2e-chat-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function completion(content: string) {
  return {
    id: "chatcmpl-e2e",
    object: "chat.completion",
    created: 1,
    model: "e2e-chat-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
