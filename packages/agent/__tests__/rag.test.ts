import { describe, expect, it } from "vitest";
import { AgentRAG, HashEmbeddingEmbedder, InMemoryVectorStore, splitTextIntoChunks } from "../src/rag";

describe("RAG Module", () => {
  it("should split long text with overlap", () => {
    const chunks = splitTextIntoChunks(
      "第一段介绍智能体系统。\n\n第二段介绍浏览器端运行。\n\n第三段介绍服务端运行与共享能力。",
      {
        chunkSize: 20,
        chunkOverlap: 5,
      },
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("第一段");
  });

  it("should index and retrieve relevant chunks", async () => {
    const rag = new AgentRAG({
      embedder: new HashEmbeddingEmbedder({ dimension: 384 }),
      vectorStore: new InMemoryVectorStore(),
      chunkSize: 80,
      chunkOverlap: 20,
    });

    await rag.addDocuments([
      {
        id: "browser-agent",
        title: "Browser Agent",
        content:
          "浏览器端 agent 可以调用 DOM、IndexedDB 和页面事件能力，适合做用户交互和轻量本地工作流。",
      },
      {
        id: "server-agent",
        title: "Server Agent",
        content:
          "服务端 agent 更适合执行后台任务、连接数据库、访问私有 API，并处理长时间运行的作业。",
      },
    ]);

    const results = await rag.retrieve("哪个 agent 适合连接数据库？", {
      topK: 1,
      minScore: 0,
    });

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe("server-agent");
  });

  it("should build agent-ready context messages", async () => {
    const rag = new AgentRAG({
      embedder: new HashEmbeddingEmbedder({ dimension: 256 }),
      vectorStore: new InMemoryVectorStore(),
    });

    await rag.addDocuments({
      id: "shared-runtime",
      title: "Shared Runtime Strategy",
      content:
        "为了同时支持浏览器端和服务端，agent 的 RAG 层应该基于抽象的 Embedder 和 VectorStore 接口，默认实现保持纯 TypeScript。",
      metadata: {
        scope: "architecture",
      },
    });

    const context = await rag.buildContext("如何同时支持浏览器和服务端？", {
      topK: 1,
      minScore: 0,
      includeScores: true,
      prefix: "以下是检索到的知识：",
    });

    expect(context).toContain("以下是检索到的知识");
    expect(context).toContain("Shared Runtime Strategy");

    const message = await rag.createContextMessage("如何支持双端运行？", {
      topK: 1,
      minScore: 0,
    });

    expect(message.role).toBe("system");
    expect(String(message.content)).toContain("retrieved knowledge");
  });

  it("should remove documents from the vector store", async () => {
    const rag = new AgentRAG();

    await rag.addDocuments([
      {
        id: "doc-1",
        content: "alpha beta gamma",
      },
      {
        id: "doc-2",
        content: "delta epsilon zeta",
      },
    ]);

    expect(await rag.count()).toBeGreaterThan(0);
    await rag.removeDocument("doc-1");

    const results = await rag.retrieve("alpha", {
      topK: 3,
      minScore: 0,
    });

    expect(results.some((item) => item.documentId === "doc-1")).toBe(false);
  });

  it("should replace chunks when the same document is re-indexed", async () => {
    const rag = new AgentRAG({
      chunkSize: 12,
      chunkOverlap: 2,
    });

    await rag.addDocuments({
      id: "doc-replace",
      content: "旧知识片段一。旧知识片段二。旧知识片段三。",
    });

    const firstCount = await rag.count();
    expect(firstCount).toBeGreaterThan(1);

    await rag.addDocuments({
      id: "doc-replace",
      content: "新知识只保留一段，强调浏览器和服务端共用接口。",
    });

    const results = await rag.retrieve("旧知识", {
      topK: 5,
      minScore: 0,
    });

    expect(results.some((item) => item.content.includes("旧知识"))).toBe(false);
  });
});
