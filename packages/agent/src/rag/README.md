# RAG 外部知识库接入说明

本文档说明如何把当前 `src/rag` 模块接到外部知识库或已有向量数据库上。

当前模块默认提供的是：

- 本地 embedding：`HashEmbeddingEmbedder`
- 内存向量库：`InMemoryVectorStore`
- 高层封装：`AgentRAG`

这套默认实现适合：

- 浏览器端 demo
- 服务端轻量 PoC
- 单测和本地开发

如果你的系统已经有外部知识库，或者已经把文档和向量存进了向量数据库，那么推荐保留 `AgentRAG` 这一层，只替换下面两个抽象：

- `Embedder`
- `VectorStore`

相关接口定义见：

- [types.ts](/Users/bingo/workspace/ai-work/projects/ai-sdk-demo/src/rag/types.ts)

## 一、整体接入思路

`AgentRAG` 的工作流可以拆成 5 步：

1. 接收原始文档
2. 按 `chunker` 规则切分为多个 `RAGChunk`
3. 使用 `Embedder` 把文本转成向量
4. 使用 `VectorStore` 写入或查询
5. 把检索结果组装成 agent 可消费的 context

所以接入外部知识库时，一般有两种模式。

### 模式 A：外部库里已经有“文档 + 向量”

这种情况最常见于：

- Pinecone
- Qdrant
- Milvus
- pgvector
- Elasticsearch / OpenSearch 向量检索

你通常只需要：

- 实现一个查询用的 `Embedder`
- 实现一个读取外部向量库的 `VectorStore`

这时 `AgentRAG.addDocuments()` 可以继续用，也可以不用。

如果你们的入库流程在别的系统里完成，那么运行时只需要 `retrieve()` / `buildContext()`，不一定要在这个 SDK 内部执行写入。

### 模式 B：外部库只有原始知识，没有现成向量

这种情况通常需要：

- 用当前 SDK 或独立离线任务先做 chunk
- 调用 embedding 服务生成向量
- 写入你们自己的向量库

这时建议把“离线建索引”和“在线检索”拆开：

- 离线任务负责 `chunk + embedding + upsert`
- 运行时 agent 只负责 `query embedding + search`

## 二、当前代码中的扩展点

### 1. `Embedder`

接口：

```ts
export interface Embedder {
  dimension?: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

职责：

- 输入一批文本
- 输出同顺序的一批向量

运行时要求：

- 浏览器端可用时，不能依赖 Node-only API
- 服务端可用时，可以接远程 embedding API
- 返回向量维度要稳定

### 2. `VectorStore`

接口：

```ts
export interface VectorStore {
  add(chunks: RAGChunk[]): Promise<void>;
  search(queryEmbedding: number[], options?: VectorSearchOptions): Promise<RAGSearchResult[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
```

职责：

- 接收带 embedding 的 chunk 并写入
- 根据查询向量返回检索结果
- 支持按文档删除

如果你的线上系统只允许“查，不允许写”，也可以实现一个只面向检索的版本，但要注意：

- `AgentRAG.addDocuments()` 会调用 `add()`
- `AgentRAG.removeDocument()` 会调用 `deleteByDocumentId()`

如果这些方法在你的场景下不需要，可以：

- 保留接口但抛出明确错误
- 或者只在业务侧使用 `retrieve()` / `buildContext()`，避免调用写入相关方法

## 三、最小接入方式

如果你已经有外部向量数据库，推荐最小接法如下：

```ts
import { AgentRAG } from "../rag";

const rag = new AgentRAG({
  embedder: new YourEmbedder(),
  vectorStore: new YourVectorStore(),
  defaultTopK: 5,
  defaultMinScore: 0.2,
});
```

之后可以直接使用：

```ts
const results = await rag.retrieve("如何连接数据库？");

const context = await rag.buildContext("如何连接数据库？", {
  topK: 3,
  prefix: "以下是检索到的知识：",
});
```

## 四、如何实现自定义 Embedder

下面是一个“调用远程 embedding 服务”的通用示例：

```ts
import type { Embedder } from "./types";

export class RemoteEmbeddingProvider implements Embedder {
  readonly dimension = 1536;

  constructor(
    private readonly baseURL: string,
    private readonly apiKey: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status}`);
    }

    const json = await response.json();
    return json.data.map((item: { embedding: number[] }) => item.embedding);
  }
}
```

实现时建议注意：

- 批量请求而不是逐条请求
- 对超长文本做截断或分批
- 给网络失败、超时、限流做重试
- 保证返回顺序与输入顺序一致

## 五、如何实现外部 VectorStore

下面是一个通用的“远程向量库包装器”示例。

```ts
import type {
  RAGChunk,
  RAGSearchResult,
  VectorSearchOptions,
  VectorStore,
} from "./types";

export class RemoteVectorStore implements VectorStore {
  constructor(
    private readonly baseURL: string,
    private readonly apiKey: string,
  ) {}

  async add(chunks: RAGChunk[]): Promise<void> {
    const payload = chunks.map((chunk) => ({
      id: chunk.id,
      vector: chunk.embedding,
      payload: {
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        content: chunk.content,
        index: chunk.index,
        metadata: chunk.metadata,
      },
    }));

    const response = await fetch(`${this.baseURL}/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ points: payload }),
    });

    if (!response.ok) {
      throw new Error(`Vector upsert failed: ${response.status}`);
    }
  }

  async search(
    queryEmbedding: number[],
    options: VectorSearchOptions = {},
  ): Promise<RAGSearchResult[]> {
    const response = await fetch(`${this.baseURL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        vector: queryEmbedding,
        topK: options.topK ?? 5,
        minScore: options.minScore,
        documentIds: options.documentIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vector search failed: ${response.status}`);
    }

    const json = await response.json();

    return json.data.map((item: any) => ({
      id: item.id,
      documentId: item.payload.documentId,
      documentTitle: item.payload.documentTitle,
      content: item.payload.content,
      index: item.payload.index,
      metadata: item.payload.metadata,
      score: item.score,
      embedding: undefined,
    }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/delete-by-document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      throw new Error(`Vector delete failed: ${response.status}`);
    }
  }

  async clear(): Promise<void> {
    const response = await fetch(`${this.baseURL}/clear`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vector clear failed: ${response.status}`);
    }
  }

  async count(): Promise<number> {
    const response = await fetch(`${this.baseURL}/count`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vector count failed: ${response.status}`);
    }

    const json = await response.json();
    return json.count;
  }
}
```

## 六、外部向量库字段怎么映射

建议你的外部知识库至少保留这些字段：

| 当前字段 | 建议映射 |
| --- | --- |
| `id` | 向量点 ID / chunk ID |
| `documentId` | 原始文档 ID |
| `documentTitle` | 文档标题 |
| `content` | chunk 正文 |
| `index` | chunk 在原文中的顺序 |
| `metadata` | 业务元数据 |
| `embedding` | 向量值 |

如果你的外部库支持 payload / metadata 过滤，推荐把以下字段显式存进去：

- `tenantId`
- `knowledgeBaseId`
- `documentId`
- `sourceType`
- `tags`
- `visibility`

这样后续就能通过 `VectorSearchOptions.filter` 或自定义 `search` 参数实现租户隔离和知识域过滤。

## 七、如果“知识已在外部库中”，如何避免重复入库

如果你的文档已经由别的索引系统入库，那么运行时通常不需要再调用：

- `rag.addDocuments()`
- `rag.removeDocument()`
- `rag.clear()`

可以只把 `AgentRAG` 当成“统一检索包装层”来用：

```ts
const rag = new AgentRAG({
  embedder: new RemoteEmbeddingProvider(baseURL, apiKey),
  vectorStore: new RemoteVectorStore(baseURL, apiKey),
});

const context = await rag.buildContext(userQuery, {
  topK: 5,
  minScore: 0.25,
});
```

如果你想彻底禁止写操作，可以在自定义 `VectorStore` 中这样处理：

```ts
async add(): Promise<void> {
  throw new Error("This VectorStore is read-only.");
}
```

## 八、浏览器端 / 服务端的实现建议

### 浏览器端

推荐：

- 调你们自己的服务端检索 API
- 不要把向量库直连凭证放到浏览器
- 不要把私有知识直接全量下发到前端

更安全的结构是：

- 浏览器端 agent 只负责发 query
- 服务端负责 embedding 和 vector search
- 前端只拿回 topK 检索结果

### 服务端

推荐：

- 服务端直连 embedding 服务
- 服务端直连向量库
- 在服务端做权限过滤、租户过滤和审计日志

## 九、和当前 `AgentRAG` 配合时的注意点

### 1. `search()` 返回值要完整

`AgentRAG.buildContext()` 依赖这些字段来拼装上下文：

- `documentId`
- `documentTitle`
- `content`
- `score`

如果缺失这些字段，最终 prompt 会退化，甚至无法定位来源。

### 2. 分数区间不一定统一

不同向量数据库的分数语义不完全一致：

- 有的返回余弦相似度，越大越相关
- 有的返回距离，越小越相关
- 有的会归一化到 `0 ~ 1`

当前 `AgentRAG` 默认假设：

- 分数越大越好
- `minScore` 是“低于即过滤”

如果你的外部库返回的是距离值，那么需要在 `search()` 里先转换再返回。

### 3. 重复写入同一文档时要有替换语义

当前 `AgentRAG.addDocuments()` 会先按 `documentId` 删除旧 chunk，再写新 chunk。

如果你的外部库是 upsert 模式，也建议保持这个语义一致，否则会出现：

- 同一文档多个版本残留
- 检索结果混入旧内容

## 十、推荐的生产实践

- 把 embedding 模型和向量库维度固定下来，避免维度漂移
- 离线建索引和在线检索分离
- 在服务端统一做权限裁剪
- 为 `documentId`、`tenantId`、`knowledgeBaseId` 建好过滤索引
- 对检索结果保留 `source` 信息，方便 agent 回答时引用
- 给 `minScore`、`topK` 做业务级默认值，而不是完全依赖调用方

## 十一、一个完整的接入示例

```ts
import { AgentRAG } from "./rag";
import { RemoteEmbeddingProvider } from "./remote-embedder";
import { RemoteVectorStore } from "./remote-vector-store";

const rag = new AgentRAG({
  embedder: new RemoteEmbeddingProvider(
    process.env.EMBEDDING_BASE_URL!,
    process.env.EMBEDDING_API_KEY!,
  ),
  vectorStore: new RemoteVectorStore(
    process.env.VECTOR_BASE_URL!,
    process.env.VECTOR_API_KEY!,
  ),
  defaultTopK: 4,
  defaultMinScore: 0.2,
});

const contextMessage = await rag.createContextMessage("用户的问题", {
  topK: 4,
  prefix: "以下是与当前问题最相关的知识片段：",
});

const messages = [
  contextMessage,
  {
    role: "user" as const,
    content: "用户的问题",
  },
];
```

## 十二、推荐下一步

如果你们已经确定外部知识库类型，建议直接在 `src/rag` 下新增一个适配文件，例如：

- `qdrant-store.ts`
- `pgvector-store.ts`
- `pinecone-store.ts`
- `remote-embedder.ts`

这样业务侧只需要：

```ts
const rag = new AgentRAG({
  embedder: new OpenAIEmbedder(...),
  vectorStore: new QdrantVectorStore(...),
});
```

就能无缝复用现有 `retrieve()`、`buildContext()` 和 `createContextMessage()` 流程。
