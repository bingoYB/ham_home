import {
  createUsageGuideSkill,
  type AgentSkill,
  type AgentTool,
} from "@browser-agent-sdk/agent";

export type HamHomeFeatureId =
  | "bookmarks"
  | "semantic-search"
  | "ai-automation"
  | "snapshots"
  | "privacy"
  | "workspaces-tab-groups"
  | "import-export-sync"
  | "settings";

interface HamHomeFeatureDoc {
  id: HamHomeFeatureId;
  title: string;
  summary: string;
  detail: string;
}

const HAMHOME_FEATURES: HamHomeFeatureDoc[] = [
  {
    id: "bookmarks",
    title: "书签管理",
    summary: "管理、搜索、筛选、批量整理本地书签。",
    detail: [
      "能力范围：",
      "- 查看全部书签，支持卡片视图和列表视图。",
      "- 按关键词、分类、标签、域名、时间范围和自定义筛选器查找书签。",
      "- 批量选择书签后添加标签、移动分类、删除或重新 AI 分析。",
      "- 支持分类树、标签云、置顶常用书签和本地快照入口。",
      "",
      "配置方式：",
      "- 在“设置 -> 常规”里调整默认分类、语言、主题、自动快照等行为。",
      "- 在“分类”页面维护分类树；在“标签”页面查看标签统计。",
      "- 智能分类和标签推荐需要在“设置 -> AI”开启相关开关，并配置可用模型。",
    ].join("\n"),
  },
  {
    id: "semantic-search",
    title: "语义搜索",
    summary: "用自然语言查找含义相关的书签，不局限于关键词命中。",
    detail: [
      "能力范围：",
      "- 支持关键词检索、语义检索和混合检索。",
      "- 可根据自然语言问题检索标题、描述、标签和页面内容摘要。",
      "- 支持按分类、标签、域名、时间范围继续收窄结果。",
      "",
      "配置方式：",
      "- 在“设置 -> AI -> Embedding”开启语义检索。",
      "- 配置 embedding provider、model、batchSize 和可选 dimensions。",
      "- API Key、Base URL 等敏感/连接信息需要用户在设置页手动填写，agent 不会代填。",
      "- 配置完成后可以重建向量索引；索引覆盖率会影响语义检索效果。",
    ].join("\n"),
  },
  {
    id: "ai-automation",
    title: "AI 自动化",
    summary: "用 AI 生成书签描述、分类、标签、翻译和批量整理结果。",
    detail: [
      "能力范围：",
      "- 保存网页时提取页面内容并生成标题、描述、分类和标签建议。",
      "- 支持批量 AI 整理既有书签。",
      "- 支持文本翻译、分类生成、标签建议、标签预设匹配。",
      "- 全局助手可以调用工具查询数据、搜索书签、打开页面、调整安全配置项。",
      "",
      "配置方式：",
      "- 在“设置 -> AI”选择 provider、model、temperature、maxTokens。",
      "- 可安全开关：enableSmartCategory、enableTagSuggestion、enableTranslation、autoDetectPrivacy。",
      "- API Key、Base URL、隐私域名等敏感信息必须由用户手动在设置页填写。",
    ].join("\n"),
  },
  {
    id: "snapshots",
    title: "网页快照",
    summary: "保存网页内容，支持离线查看和 Obsidian 同步。",
    detail: [
      "能力范围：",
      "- 保存书签时可自动保存网页快照。",
      "- 支持 HTML 或 Markdown 快照，列表中可查看、删除和同步快照。",
      "- 支持批量同步有快照的书签到 Obsidian/WebDAV 目标。",
      "",
      "配置方式：",
      "- 在“设置 -> 常规”切换 autoSaveSnapshot。",
      "- 在“设置 -> 存储/同步”配置同步服务。",
      "- 同步账号、密码、远程地址等敏感信息需要用户在设置页手动填写。",
    ].join("\n"),
  },
  {
    id: "privacy",
    title: "隐私保护",
    summary: "本地优先保存数据，敏感配置不由 agent 代填。",
    detail: [
      "能力范围：",
      "- 本地存储书签、分类、标签、快照和配置。",
      "- 支持隐私域名，命中后跳过页面内容 AI 分析。",
      "- 支持 autoDetectPrivacy 自动检测隐私页面。",
      "- 可使用 Ollama 等本地模型降低外发数据。",
      "",
      "配置方式：",
      "- 在“隐私”页面查看隐私说明。",
      "- 在“设置 -> AI”打开 autoDetectPrivacy。",
      "- 隐私域名、API Key、同步凭据等敏感项不会被 agent 自动修改；agent 会引导用户打开对应页面。",
    ].join("\n"),
  },
  {
    id: "workspaces-tab-groups",
    title: "工作空间与标签组",
    summary: "保存当前窗口、管理工作空间，并用规则组织浏览器标签组。",
    detail: [
      "能力范围：",
      "- 保存当前窗口为工作空间，记录页面标题、域名、favicon、顺序和分组信息。",
      "- 管理工作空间页面，支持恢复、编辑和转换为书签。",
      "- 标签组规则可以按域名、标题或关键词自动分组。",
      "",
      "配置方式：",
      "- 在“工作空间”页面保存和管理窗口集合。",
      "- 在“标签组”页面创建和维护自动分组规则。",
      "- agent 可以打开对应页面、查询规则/数据摘要；复杂规则建议用户确认后保存。",
    ].join("\n"),
  },
  {
    id: "import-export-sync",
    title: "导入导出与同步",
    summary: "导入浏览器/文件书签，导出数据，并通过 WebDAV/Obsidian 同步。",
    detail: [
      "能力范围：",
      "- 支持导入浏览器书签或文件数据。",
      "- 支持导出标准格式数据，便于备份和迁移。",
      "- 支持同步状态展示、手动同步和批量同步。",
      "",
      "配置方式：",
      "- 在“导入导出”页面执行数据导入和导出。",
      "- 在“设置 -> 存储/同步”配置同步目标。",
      "- 远程地址、用户名、密码等敏感信息必须由用户手动填写。",
    ].join("\n"),
  },
  {
    id: "settings",
    title: "插件设置",
    summary: "统一配置主题、语言、AI、Embedding、存储、同步和面板行为。",
    detail: [
      "能力范围：",
      "- 常规设置：语言、主题、默认分类、自动快照、omnibox 搜索、内容面板位置。",
      "- AI 设置：provider、model、temperature、maxTokens、智能分类、标签建议、翻译开关。",
      "- Embedding 设置：语义搜索开关、provider、model、dimensions、batchSize。",
      "- 存储/同步设置：本地存储信息、向量索引、WebDAV/Obsidian 同步。",
      "",
      "agent 可自动修改的安全项：",
      "- settings: theme、language、autoSaveSnapshot、enableOmniboxSearch、defaultCategory、panelPosition。",
      "- aiConfig: provider、model、temperature、maxTokens、enableTranslation、enableSmartCategory、enableTagSuggestion、presetTags、autoDetectPrivacy。",
      "- embeddingConfig: enabled、provider、model、dimensions、batchSize。",
      "",
      "必须手动填写的敏感项：apiKey、baseUrl、privacyDomains、同步 URL、用户名、密码、浏览器快捷键。",
    ].join("\n"),
  },
];

const FEATURE_BY_ID = new Map(HAMHOME_FEATURES.map((item) => [item.id, item]));

function normalizeFeatureId(input: unknown): HamHomeFeatureId | null {
  if (typeof input !== "string") {
    return null;
  }

  return FEATURE_BY_ID.has(input as HamHomeFeatureId)
    ? (input as HamHomeFeatureId)
    : null;
}

/**
 * 返回 HamHome 功能总览，供 agent 和 UI 渲染插件功能清单。
 *
 * 示例：
 * ```ts
 * const overview = getHamHomeFeatureOverview();
 * overview[0].id; // "bookmarks"
 * ```
 */
export function getHamHomeFeatureOverview() {
  return HAMHOME_FEATURES.map(({ id, title, summary }) => ({
    id,
    title,
    summary,
  }));
}

/**
 * 根据功能 ID 返回详细说明；未知 ID 会返回 null。
 */
export function getHamHomeFeatureDetail(featureId: string) {
  const normalizedId = normalizeFeatureId(featureId);
  if (!normalizedId) {
    return null;
  }

  return FEATURE_BY_ID.get(normalizedId) || null;
}

/**
 * 创建功能清单工具，让 agent 能先给用户一个插件能力总览。
 */
export function createListHamHomeFeaturesTool(): AgentTool {
  return {
    name: "list_hamhome_features",
    description:
      "List HamHome extension features with concise descriptions and stable feature ids.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    metadata: { readOnly: true, riskLevel: "low" },
    execute: () => ({
      features: getHamHomeFeatureOverview(),
      detailTool: "get_hamhome_feature_detail",
    }),
  };
}

/**
 * 创建功能详情工具，让 agent 按需读取指定功能的详细能力与配置说明。
 */
export function createGetHamHomeFeatureDetailTool(): AgentTool {
  return {
    name: "get_hamhome_feature_detail",
    description:
      "Get detailed HamHome feature documentation, including supported capabilities and configuration guidance.",
    parameters: {
      type: "object",
      properties: {
        featureId: {
          type: "string",
          enum: HAMHOME_FEATURES.map((item) => item.id),
          description: "Feature id returned by list_hamhome_features.",
        },
      },
      required: ["featureId"],
      additionalProperties: false,
    },
    metadata: { readOnly: true, riskLevel: "low" },
    execute: (input) => {
      const featureId =
        input && typeof input === "object" && "featureId" in input
          ? String((input as { featureId?: unknown }).featureId)
          : "";
      const detail = getHamHomeFeatureDetail(featureId);

      return (
        detail || {
          error: `Unknown feature id: ${featureId}`,
          availableFeatureIds: HAMHOME_FEATURES.map((item) => item.id),
        }
      );
    },
  };
}

/**
 * 创建 HamHome 插件使用指南 skill。该 skill 提供总览文档，并挂载功能详情工具。
 */
export function createHamHomeFeatureSkill(): AgentSkill {
  const overview = [
    "HamHome 是智能书签管理浏览器插件。",
    "你可以帮助用户理解插件功能、查询书签数据、打开插件页面，并在安全范围内调整配置。",
    "功能清单：",
    ...getHamHomeFeatureOverview().map(
      (feature) => `- ${feature.id}: ${feature.title} - ${feature.summary}`,
    ),
    "",
    "需要详细说明时，先调用 get_hamhome_feature_detail(featureId)。",
    "遇到敏感配置（API Key、Base URL、隐私域名、同步凭据、快捷键）时，不要代填；应说明原因并引导用户打开对应设置页。",
  ].join("\n");

  return createUsageGuideSkill({
    id: "hamhome-feature-guide",
    name: "HamHome 功能指南",
    description:
      "HamHome extension feature guide covering bookmarks, semantic search, AI automation, privacy, snapshots, workspaces, import/export, sync, and settings.",
    documents: [
      {
        id: "hamhome-feature-overview",
        kind: "manual",
        title: "HamHome 功能总览",
        content: overview,
        tags: ["hamhome", "features", "settings", "assistant"],
      },
    ],
    tools: [{ tool: createGetHamHomeFeatureDetailTool() }],
  });
}
