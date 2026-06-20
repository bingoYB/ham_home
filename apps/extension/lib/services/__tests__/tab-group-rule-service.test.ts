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

describe("TabGroupRuleService AI auto grouping", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getRules.mockResolvedValue([]);
    mocks.getAutoGroupSettings.mockResolvedValue({ aiAutoGroupEnabled: true });
    mocks.getAIGroupCache.mockResolvedValue(null);

    (globalThis as typeof globalThis & { chrome?: unknown }).chrome = {
      tabs: {
        get: vi.fn(async () => ({ groupId: -1 })),
        group: vi.fn(async (options: { groupId?: number }) => options.groupId ?? 100),
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

    expect(prompt).toContain("现有标签组:\n- 工作");
    expect(prompt).not.toContain("(blue)");
    expect(outputSchema.properties).toEqual({ groupTitle: {} });
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
      "https://cooking.example/recipes/soup",
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
      "https://cooking.example/recipes/soup",
      expect.objectContaining({ groupTitle: "番茄浓汤菜" }),
    );
    expect(mocks.setAIGroupCache).toHaveBeenNthCalledWith(
      2,
      "https://ai.example/research",
      expect.objectContaining({ groupTitle: "Machine Learning" }),
    );

    randomSpy.mockRestore();
  });
});
