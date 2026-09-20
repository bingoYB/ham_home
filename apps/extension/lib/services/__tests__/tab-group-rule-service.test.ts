import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRules: vi.fn(),
  getAutoGroupSettings: vi.fn(),
  getAIGroupCache: vi.fn(),
  setAIGroupCache: vi.fn(),
  runExtensionCommand: vi.fn(),
}));

vi.mock("@/lib/storage/tab-group-rules-storage", () => ({
  tabGroupRulesStorage: {
    getRules: mocks.getRules,
    getAutoGroupSettings: mocks.getAutoGroupSettings,
    getAIGroupCache: mocks.getAIGroupCache,
    setAIGroupCache: mocks.setAIGroupCache,
  },
}));

vi.mock("@/lib/privacy/privacy-detector", () => ({
  containsPrivateContent: vi.fn(async () => ({ isPrivate: false })),
}));

vi.mock("@/lib/agent/factory", () => ({
  resolveAgentConfig: vi.fn(async () => ({
    language: "zh",
    rawConfig: { enabled: true, apiKey: "test-key", model: "test-model" },
  })),
  assertAgentConfigured: vi.fn(),
}));

vi.mock("@/lib/agent/command-runner", () => ({
  runExtensionCommand: mocks.runExtensionCommand,
}));

describe("TabGroupRuleService auto grouping", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getRules.mockResolvedValue([]);
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: true,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: false,
    });
    mocks.getAIGroupCache.mockResolvedValue(null);

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      tabs: {
        get: vi.fn(async () => ({ groupId: -1 })),
        group: vi.fn(async (options: { groupId?: number }) => options.groupId ?? 100),
        query: vi.fn(async () => [
          {
            id: 90,
            title: "需求文档",
            url: "https://docs.example/spec",
            groupId: 7,
          },
          {
            id: 91,
            title: "任务看板",
            url: "https://board.example/sprint",
            groupId: -1,
          },
        ]),
      },
      tabGroups: {
        TAB_GROUP_ID_NONE: -1,
        query: vi.fn(async () => [
          { id: 7, title: "工作", color: "blue" },
        ]),
        update: vi.fn(),
      },
    };
  });

  it("uses custom rules before domain auto grouping", async () => {
    mocks.getRules.mockResolvedValue([
      {
        id: "rule-baidu",
        name: "搜索规则",
        enabled: true,
        matchType: "domain",
        matchCondition: "contains",
        pattern: "baidu.com",
        groupTitle: "搜索",
        color: "red",
        collapsed: true,
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: true,
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://www.baidu.com/s?wd=hamhome",
      1,
      "百度搜索",
      { allowAI: true },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(mocks.runExtensionCommand).not.toHaveBeenCalled();
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        title: "搜索",
        color: "red",
        collapsed: true,
      }),
    );
  });

  it("groups tabs by root domain with a random color when domain auto grouping is enabled", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: true,
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://www.baidu.com/s?wd=hamhome",
      1,
      "百度搜索",
      { allowAI: false },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(mocks.runExtensionCommand).not.toHaveBeenCalled();
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        title: "baidu",
        color: "yellow",
        collapsed: false,
      }),
    );

    randomSpy.mockRestore();
  });

  it("reuses an existing root-domain group and preserves its color", async () => {
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: true,
    });

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: {
          query: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
      };
    }).chrome;
    chromeMock.tabGroups.query.mockResolvedValue([
      { id: 8, title: "github", color: "cyan" },
    ]);

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://docs.github.com/actions",
      1,
      "GitHub Actions docs",
      { allowAI: false },
    );

    expect(grouped).toBe(true);
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12, groupId: 8 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        title: "github",
        color: "cyan",
        collapsed: false,
      }),
    );
  });

  it("uses the registrable domain label for common second-level domains", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: true,
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://news.bbc.co.uk/world",
      1,
      "BBC News",
      { allowAI: false },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        title: "bbc",
        color: "yellow",
      }),
    );

    randomSpy.mockRestore();
  });

  it("does not run domain auto grouping when AI auto grouping is enabled", async () => {
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: true,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: true,
    });
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "AI 分组",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://www.baidu.com/s?wd=hamhome",
      1,
      "百度搜索",
      { allowAI: true },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(mocks.runExtensionCommand).toHaveBeenCalled();
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        title: "AI 分组",
      }),
    );
  });

  it("reuses an existing group when AI returns an existing group title", async () => {
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "工作",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      {
        allowAI: true,
        description: "家常汤品做法，与办公和项目管理无关。",
      },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12, groupId: 7 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        title: "工作",
        color: "blue",
        collapsed: false,
      }),
    );
  });

  it("reuses an existing group when AI explicitly chooses a matching group", async () => {
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "工作",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://docs.example/project-plan",
      1,
      "项目计划",
      {
        allowAI: true,
        description: "项目规划和协作文档。",
      },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12, groupId: 7 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        title: "工作",
        color: "blue",
        collapsed: false,
      }),
    );
  });

  it("reuses a confirmed cached AI group for the same domain before asking AI", async () => {
    mocks.getAIGroupCache.mockResolvedValueOnce({
      url: "https://docs.example/project-plan",
      groupTitle: "工作",
      color: "blue",
      updatedAt: Date.now(),
      status: "confirmed",
      agreeCount: 2,
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    const grouped = await tabGroupRuleService.autoGroupTab(
      12,
      "https://docs.example/release-notes",
      1,
      "发布说明",
      {
        allowAI: true,
        description: "同一产品文档站点下的发布说明。",
      },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(grouped).toBe(true);
    expect(mocks.getAIGroupCache).toHaveBeenCalledWith("domain:docs.example");
    expect(mocks.runExtensionCommand).not.toHaveBeenCalled();
    expect(mocks.setAIGroupCache).not.toHaveBeenCalled();
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12, groupId: 7 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        title: "工作",
        color: "blue",
        collapsed: false,
      }),
    );
  });

  it("includes page metadata in the AI grouping prompt", async () => {
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "烹饪",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      {
        allowAI: true,
        description: "家常汤品做法",
        metadata: {
          pageTitle: "番茄浓汤食谱 - 家常菜谱",
          metaDescription: "番茄浓汤的详细做法",
          keywords: "食谱, 番茄, 汤",
          openGraphTitle: "番茄浓汤",
          openGraphDescription: "适合晚餐的家常汤品",
          openGraphSiteName: "厨房日记",
          openGraphType: "article",
          twitterTitle: "今日食谱：番茄浓汤",
          twitterDescription: "十分钟上手",
          canonicalUrl: "https://cooking.example/recipes/soup",
          language: "zh-CN",
          headings: ["番茄浓汤", "食材", "步骤"],
        },
      },
    );

    const prompt = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.prompt;
    const outputSchema = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.outputSchema;

    expect(prompt).toContain("页面元数据:");
    expect(prompt).toContain("页面标题: 番茄浓汤食谱 - 家常菜谱");
    expect(prompt).toContain("关键词: 食谱, 番茄, 汤");
    expect(prompt).toContain("Open Graph 站点名: 厨房日记");
    expect(prompt).toContain("Open Graph 类型: article");
    expect(prompt).toContain("标题层级: 番茄浓汤 | 食材 | 步骤");
    expect(prompt).not.toContain("reuseExistingGroup");
    expect(outputSchema.properties).not.toHaveProperty("reuseExistingGroup");
  });

  it("includes custom grouping requirements in the AI prompt and cache key", async () => {
    const customInstructions = "优先按项目分组；娱乐网站单独分组";
    mocks.getAutoGroupSettings.mockResolvedValue({
      aiAutoGroupEnabled: true,
      aiAutoGroupInstructions: customInstructions,
      domainAutoGroupEnabled: false,
    });
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "项目",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://docs.example/project-plan#intro",
      1,
      "项目计划",
      {
        allowAI: true,
        description: "项目规划和协作文档。",
      },
    );

    const prompt = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.prompt;
    const cacheKey =
      `domain:docs.example::instructions=${encodeURIComponent(customInstructions)}`;

    expect(prompt).toContain("自定义分类要求:");
    expect(prompt).toContain(customInstructions);
    expect(mocks.getAIGroupCache).toHaveBeenCalledWith(cacheKey);
    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      cacheKey,
      expect.objectContaining({
        groupTitle: "项目",
      }),
    );
  });

  it("only asks AI for a group title and chooses new group color locally", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "烹饪",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      {
        allowAI: true,
        description: "家常汤品做法",
      },
    );

    const prompt = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.prompt;
    const outputSchema = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.outputSchema;
    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabs: { group: ReturnType<typeof vi.fn> };
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(prompt).toContain("现有标签组（含成员摘要）:");
    expect(prompt).toContain("- 工作 —");
    expect(prompt).not.toContain("(blue)");
    expect(outputSchema).toMatchObject({
      properties: { groupTitle: { type: "string" } },
      required: ["groupTitle"],
      additionalProperties: false,
    });
    expect(chromeMock.tabs.group).toHaveBeenCalledWith({ tabIds: 12 });
    expect(chromeMock.tabGroups.update).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        title: "烹饪",
        color: "yellow",
        collapsed: false,
      }),
    );
    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      "domain:cooking.example",
      expect.objectContaining({
        groupTitle: "烹饪",
        color: "yellow",
      }),
    );

    randomSpy.mockRestore();
  });

  it("instructs AI to keep group titles short", async () => {
    mocks.runExtensionCommand.mockResolvedValue({
      output: {
        groupTitle: "烹饪",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      {
        allowAI: true,
        description: "家常汤品做法",
      },
    );

    const systemPrompt = mocks.runExtensionCommand.mock.calls[0]?.[0]?.systemPrompt;

    expect(systemPrompt).toContain("中文不超过 5 个字");
    expect(systemPrompt).toContain("英文不超过 2 个单词");
  });

  it("trims overlong AI group titles before grouping and caching", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.42);
    mocks.runExtensionCommand.mockResolvedValueOnce({
      output: {
        groupTitle: "番茄浓汤菜谱",
      },
    });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      {
        allowAI: true,
      },
    );

    mocks.runExtensionCommand.mockResolvedValueOnce({
      output: {
        groupTitle: "Machine Learning Research",
      },
    });

    await tabGroupRuleService.autoGroupTab(
      13,
      "https://ai.example/research",
      1,
      "Machine Learning Research",
      {
        allowAI: true,
      },
    );

    const chromeMock = (globalThis as typeof globalThis & {
      chrome: {
        tabGroups: { update: ReturnType<typeof vi.fn> };
      };
    }).chrome;

    expect(chromeMock.tabGroups.update).toHaveBeenNthCalledWith(
      1,
      100,
      expect.objectContaining({
        title: "番茄浓汤菜",
        color: "yellow",
      }),
    );
    expect(chromeMock.tabGroups.update).toHaveBeenNthCalledWith(
      2,
      100,
      expect.objectContaining({
        title: "Machine Learning",
        color: "yellow",
      }),
    );
    expect(mocks.setAIGroupCache).toHaveBeenNthCalledWith(
      1,
      "domain:cooking.example",
      expect.objectContaining({ groupTitle: "番茄浓汤菜" }),
    );
    expect(mocks.setAIGroupCache).toHaveBeenNthCalledWith(
      2,
      "domain:ai.example",
      expect.objectContaining({ groupTitle: "Machine Learning" }),
    );

    randomSpy.mockRestore();
  });

  it("includes existing group members and ungrouped tabs in the prompt", async () => {
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "工作" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://cooking.example/recipes/soup",
      1,
      "番茄浓汤食谱",
      { allowAI: true },
    );

    const prompt = mocks.runExtensionCommand.mock.calls[0]?.[0]?.command.prompt;

    // 分组成员摘要：让 AI 知道「工作」组里实际装的是什么
    expect(prompt).toContain("需求文档");
    expect(prompt).toContain("docs.example");
    expect(prompt).toContain("1 个标签页");
    // 未分组标签页：提示 AI 存在潜在同伴 tab
    expect(prompt).toContain("当前窗口中尚未分组的标签页:");
    expect(prompt).toContain("任务看板 (board.example)");
    // 任务指令已恢复
    expect(prompt).toContain("任务：");
    expect(prompt).toContain("不要照抄当前页面的具体标题");
  });

  it("stores a first-time AI suggestion as pending with its path signature", async () => {
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "开发" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://github.com/acme/repo/issues/1",
      1,
      "Fix typo",
      { allowAI: true },
    );

    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      "domain:github.com",
      expect.objectContaining({
        groupTitle: "开发",
        status: "pending",
        samplePath: "acme",
        agreeCount: 1,
      }),
    );
  });

  it("does not reuse a pending cache entry for a different site section", async () => {
    mocks.getAIGroupCache.mockResolvedValue({
      url: "https://github.com/sponsors/acme",
      groupTitle: "赞助",
      color: "pink",
      updatedAt: Date.now(),
      status: "pending",
      samplePath: "sponsors",
      agreeCount: 1,
    });
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "开发" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://github.com/acme/repo/issues/1",
      1,
      "Fix typo",
      { allowAI: true },
    );

    // 跨栏目必须重新询问 AI，而不是沿用单页样本得出的结论
    expect(mocks.runExtensionCommand).toHaveBeenCalled();
  });

  it("marks a domain as multiPurpose when a new page contradicts the cached conclusion", async () => {
    mocks.getAIGroupCache.mockResolvedValue({
      url: "https://github.com/sponsors/acme",
      groupTitle: "赞助",
      color: "pink",
      updatedAt: Date.now(),
      status: "pending",
      samplePath: "sponsors",
      agreeCount: 1,
    });
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "开发" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://github.com/acme/repo/issues/1",
      1,
      "Fix typo",
      { allowAI: true },
    );

    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      "domain:github.com",
      expect.objectContaining({ status: "multiPurpose" }),
    );
  });

  it("promotes a pending entry to confirmed when another section agrees", async () => {
    mocks.getAIGroupCache.mockResolvedValue({
      url: "https://docs.example/guide/intro",
      groupTitle: "文档",
      color: "blue",
      updatedAt: Date.now(),
      status: "pending",
      samplePath: "guide",
      agreeCount: 1,
    });
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "文档" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://docs.example/api/reference",
      1,
      "API Reference",
      { allowAI: true },
    );

    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      "domain:docs.example",
      expect.objectContaining({
        groupTitle: "文档",
        status: "confirmed",
        agreeCount: 2,
      }),
    );
  });

  it("never reuses a multiPurpose domain cache", async () => {
    mocks.getAIGroupCache.mockResolvedValue({
      url: "https://github.com/acme/repo",
      groupTitle: "开发",
      color: "blue",
      updatedAt: Date.now(),
      status: "multiPurpose",
      samplePath: "acme",
      agreeCount: 1,
    });
    mocks.runExtensionCommand.mockResolvedValue({ output: { groupTitle: "赞助" } });

    const { tabGroupRuleService } = await import("../tab-group-rule-service");

    await tabGroupRuleService.autoGroupTab(
      12,
      "https://github.com/sponsors/acme",
      1,
      "Sponsors",
      { allowAI: true },
    );

    expect(mocks.runExtensionCommand).toHaveBeenCalled();
    // multiPurpose 是终态，不应被后续结论覆盖
    expect(mocks.setAIGroupCache).toHaveBeenCalledWith(
      "domain:github.com",
      expect.objectContaining({ status: "multiPurpose", groupTitle: "开发" }),
    );
  });
});
