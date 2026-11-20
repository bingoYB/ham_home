import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { AiSdkModelClient } from "@hamhome/agent";
import type { PageContent } from "@/types";

const state = vi.hoisted(() => ({
  language: "zh" as "zh" | "en",
  config: {
    provider: "ollama",
    model: "qwen2.5:0.5b-instruct",
    baseUrl: "http://localhost:11434/v1",
    apiMode: "chat",
    smallModelMode: true,
    temperature: 0.2,
    presetTags: ["阅读", "工具", "开发"],
  },
}));

// Only browser storage and unused library-write helpers are replaced.
// Factory, SDK, prompts, model requests, field parsers and analysis service are real.
vi.mock("@/lib/storage", () => ({
  configStorage: {
    getAIConfig: async () => state.config,
    getSettings: async () => ({ language: state.language }),
  },
}));
vi.mock("@/lib/agent/category-utils", () => ({
  createAIRecommendedCategory: vi.fn(),
  matchCategoryByName: vi.fn(),
}));

interface Fixture {
  id: string;
  language: "zh" | "en";
  title: string;
  url: string;
  content: string;
  categoryNames?: string[];
  existingTags?: string[];
  mode?: "category" | "tags";
}

const fixtures: Fixture[] = [
  {
    id: "zh-typescript", language: "zh" as const,
    title: "TypeScript 入门：类型、接口与泛型", url: "https://example.com/typescript",
    content: "TypeScript 是建立在 JavaScript 之上的编程语言，通过静态类型检查帮助开发者发现错误。本文介绍字符串、数字和布尔值等基本类型，使用 interface 描述对象结构，再用泛型编写可复用函数。开发者可以在已有 JavaScript 项目中逐步使用 TypeScript。代码最终编译为 JavaScript，可以在浏览器和 Node.js 环境中运行。",
  },
  {
    id: "zh-bookmark-tool", language: "zh" as const,
    title: "HamHome 智能书签管理工具", url: "https://example.com/hamhome",
    content: "HamHome 是一款浏览器书签管理扩展。用户保存网页后，可以借助人工智能生成摘要、推荐分类并提取标签。扩展支持关键词搜索、语义搜索、网页快照和稍后阅读，也可以导入浏览器已有书签。数据默认保存在本地，可选择通过 WebDAV 在多台设备之间同步。支持配置云端模型，也可以连接本地 Ollama。小模型兼容模式会分别请求标题、摘要、分类和标签。",
  },
  {
    id: "zh-sparse-page", language: "zh" as const,
    title: "首页", url: "https://example.com/home", content: "欢迎访问。",
  },
  {
    id: "en-git-guide", language: "en" as const,
    title: "Git branching basics", url: "https://example.com/git-branches",
    content: "This tutorial explains how Git branches help teams work on features independently. Create a branch with git switch -c, make small commits, and open a pull request for review. Keep the branch up to date by merging changes from the main branch. Resolve conflicting edits carefully, run the project tests, and merge after review. Delete the feature branch once the work is complete.",
  },
  {
    id: "zh-recipe", language: "zh" as const,
    title: "番茄炒蛋的家常做法", url: "https://example.com/tomato-eggs",
    content: "准备两个番茄、三个鸡蛋、少量盐和食用油。番茄洗净切块，鸡蛋打散。热锅放油，先把蛋液炒至刚刚凝固后盛出。锅中再加入番茄，翻炒至出汁，然后倒回鸡蛋，加盐并翻拌均匀。喜欢汤汁多一些可以加入少量清水。整道菜约十分钟完成，适合搭配米饭。",
  },
];

const edgeFixtures: Fixture[] = [
  {
    id: "zh-existing-category-colon", language: "zh",
    title: "React 组件状态管理实践", url: "https://example.com/react-state",
    content: "本文介绍前端开发中 React 组件的状态管理。使用 useState 保存本地状态，通过 props 在组件之间传递数据，在复杂页面中使用 Context 共享状态。文章给出了表单输入、购物车数量和列表筛选等例子，适合已经掌握 JavaScript 的前端开发者阅读。",
    categoryNames: ["开发：前端"],
  },
  {
    id: "zh-existing-tags-colon", language: "zh",
    title: "HTTP 缓存基础", url: "https://example.com/http-cache",
    content: "本文介绍 HTTP 缓存。浏览器通过 Cache-Control 和 Expires 判断缓存是否仍然有效，使用 ETag 和 Last-Modified 进行协商缓存。合理配置缓存可以减少重复下载，改善网页加载性能。",
    existingTags: ["HTTP：缓存", "Web：性能"], mode: "tags",
  },
];

const suiteFixtures = process.env.OLLAMA_SUITE === "edge" ? edgeFixtures
  : process.env.OLLAMA_SUITE === "all" ? [...fixtures, ...edgeFixtures] : fixtures;
const selectedFixtures = Array.from({ length: Number(process.env.OLLAMA_REPEAT || 1) }, (_, index) =>
  suiteFixtures.map(fixture => ({ ...fixture, id: Number(process.env.OLLAMA_REPEAT || 1) > 1 ? `${fixture.id}-round-${index + 1}` : fixture.id })),
).flat();
const caseTimeoutMs = Number(process.env.OLLAMA_CASE_TIMEOUT_MS || 180_000);

it("records actual local Ollama outputs through the current small-model analysis path", async () => {
  const report: any = {
    startedAt: new Date().toISOString(), model: state.config.model,
    config: state.config, fixtures: selectedFixtures, caseTimeoutMs, requests: [], cases: [],
    scope: "Real current factory + SDK + Ollama + service; browser storage and unused category writes mocked. No browser UI or user AI settings modified.",
  };
  const reportPath = fileURLToPath(new URL(`./${process.env.OLLAMA_RESULTS_FILE || "results.json"}`, import.meta.url));
  const flush = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
  let currentCase = "connection";
  const originalGenerate = AiSdkModelClient.prototype.generate;
  const spy = vi.spyOn(AiSdkModelClient.prototype, "generate").mockImplementation(async function (this: AiSdkModelClient, request) {
    const prompt = request.messages.map((message) => message.content).join("\n");
    const field = prompt.includes("Respond with the word OK") ? "connection" :
      /适合保存的页面标题|suitable bookmark title/.test(prompt) ? "title" :
      /这个页面的摘要|summary of the page/.test(prompt) ? "summary" :
      /最合适的分类名称|best category name/.test(prompt) ? "category" : "tags";
    const record: any = {
      case: currentCase, field, retry: /上次输出的格式无效|previous response had an invalid format/.test(prompt),
      startedAt: new Date().toISOString(), outputSchema: request.outputSchema ?? null,
      temperature: request.temperature, systemPrompt: request.systemPrompt, prompt,
      maxOutputTokens: request.maxOutputTokens,
    };
    report.requests.push(record);
    flush();
    const start = Date.now();
    try {
      const result = await originalGenerate.call(this, request);
      record.rawText = result.text;
      record.toolCalls = result.toolCalls;
      record.usage = result.usage;
      console.log(JSON.stringify({ case: currentCase, field, retry: record.retry, textLength: result.text.length, preview: result.text.slice(0, 300) }));
      return result;
    } catch (error: any) {
      record.error = { name: error.name, message: error.message, statusCode: error.statusCode, responseBody: error.responseBody };
      throw error;
    } finally {
      record.durationMs = Date.now() - start;
      flush();
    }
  });
  try {
    const { agentConfigService } = await import("@/lib/agent/services/agent-config-service");
    report.connection = await agentConfigService.testConnection();
    flush();
    expect(report.connection.success).toBe(true);
    const { bookmarkAnalysisService } = await import("@/lib/agent/services/bookmark-analysis-service");
    for (const fixture of selectedFixtures) {
      currentCase = fixture.id;
      state.language = fixture.language;
      const pageContent: PageContent = {
        url: fixture.url, title: fixture.title, content: fixture.content,
        textContent: fixture.content, htmlContent: "", excerpt: fixture.content.slice(0, 100),
        favicon: "", metadata: {}, isReaderable: true,
      };
      const result: any = { id: fixture.id, startedAt: new Date().toISOString() };
      const start = Date.now();
      const requestStart = report.requests.length;
      try {
        result.output = await bookmarkAnalysisService.analyzeBookmark({
          pageContent,
          mode: fixture.mode,
          userCategories: fixture.categoryNames ? fixture.categoryNames.map((name, index) => ({
            id: `category-${index}`, name, parentId: null, order: index, createdAt: 0, updatedAt: 0,
          })) : [
            { id: "dev", name: "开发", parentId: null, order: 0, createdAt: 0, updatedAt: 0 },
            { id: "tools", name: "工具", parentId: null, order: 1, createdAt: 0, updatedAt: 0 },
            { id: "life", name: "生活", parentId: null, order: 2, createdAt: 0, updatedAt: 0 },
          ],
          existingTags: fixture.existingTags ?? ["TypeScript", "编程", "工具", "美食"],
          signal: AbortSignal.timeout(caseTimeoutMs),
        });
        result.status = "success";
      } catch (error: any) {
        result.status = "failed";
        result.error = { name: error.name, message: error.message };
      }
      result.durationMs = Date.now() - start;
      result.requestCount = report.requests.length - requestStart;
      report.cases.push(result);
      console.log(JSON.stringify(result));
      flush();
    }
    report.finishedAt = new Date().toISOString();
    report.summary = {
      success: report.cases.filter((item: any) => item.status === "success").length,
      failed: report.cases.filter((item: any) => item.status === "failed").length,
      requestCount: report.requests.length,
      schemaRequests: report.requests.filter((item: any) => item.outputSchema !== null).length,
    };
    flush();
    expect(report.cases).toHaveLength(selectedFixtures.length);
  } finally {
    spy.mockRestore();
    flush();
  }
});
