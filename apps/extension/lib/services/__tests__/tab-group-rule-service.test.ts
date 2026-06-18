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
        reuseExistingGroup: false,
        groupTitle: "工作",
        color: "green",
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
        reuseExistingGroup: true,
        groupTitle: "工作",
        color: "green",
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
        reuseExistingGroup: false,
        groupTitle: "烹饪",
        color: "green",
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

    expect(prompt).toContain("Page metadata:");
    expect(prompt).toContain("Page Title: 番茄浓汤食谱 - 家常菜谱");
    expect(prompt).toContain("Keywords: 食谱, 番茄, 汤");
    expect(prompt).toContain("Open Graph Site Name: 厨房日记");
    expect(prompt).toContain("Open Graph Type: article");
    expect(prompt).toContain("Headings: 番茄浓汤 | 食材 | 步骤");
  });
});
