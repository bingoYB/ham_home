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
      "适用场景：从 0 开始建立书签库、保存新网页、查找资料、批量整理、跨设备迁移和同步。",
      "",
      "初始化使用：",
      "1. 打开“设置 -> AI”，配置 AI provider、model、API Key、Base URL 等信息；API Key 和 Base URL 必须由用户手动填写，agent 只能引导打开设置页。",
      "2. 在“分类”页面配置分类系统：先建立常用一级分类，再补充二级分类；如果需要批量整理，可同步维护标签和 presetTags。",
      "3. 可选：进入“导入导出”页面，从浏览器导入书签或导入之前导出的插件数据；导入后可批量触发 AI 分析，补充描述、分类和标签。",
      "",
      "保存新增场景：",
      "- 在正在浏览的网站里，按下插件快捷键、通过右键菜单，或点击插件图标唤起保存面板。",
      "- HamHome 会读取当前页面标题、URL 和可用内容，自动生成描述、分类和标签建议。",
      "- 用户确认分类、标签、快照等信息后保存；隐私域名或敏感页面可跳过 AI 分析。",
      "",
      "书签查找：",
      "- 在书签侧边栏快速搜索当前收藏，并按关键词、分类、标签、域名、时间范围筛选。",
      "- 在书签管理页使用卡片/列表视图、批量选择、自定义筛选器和排序来整理大量书签。",
      "- 地址栏 Omnibox 搜索：在浏览器地址栏输入 HamHome 关键词，可快速搜索书签和工作空间；启用语义搜索后，相关内容会参与排序。",
      "- 在 AI 对话窗口直接让 AI Agent 帮忙查找，例如“找一下最近保存的 React 性能优化文章”。",
      "- 语义搜索开启后，可以用自然语言查找含义相关的书签，不必精确命中标题关键词。",
      "",
      "分类体系建设：",
      "- 可以在“分类”页面手动创建、编辑、删除、置顶分类，支持父子层级、图标和批量删除。",
      "- 新用户可先应用预设分类模板，再按自己的收藏习惯微调。",
      "- 也可以输入偏好，让 AI 生成一套分类体系，确认后应用到书签分类。",
      "- 工作空间也有独立分类模式，不要把工作空间分类和书签分类混在一起解释。",
      "",
      "整理和维护：",
      "- 批量选择书签后可添加标签、移动分类、删除、重新 AI 分析或同步快照。",
      "- 分类树用于稳定归档，标签用于横向主题；两者可以同时使用。",
      "- 标签云和标签统计可帮助发现高频主题；书签管理页可按标签筛选，也可批量添加或移除标签。",
      "- 置顶常用书签、查看标签统计和分类统计，可帮助发现需要清理的收藏。",
      "",
      "多设备同步：",
      "1. 自动同步：在“设置 -> 存储/同步”配置 WebDAV，开启同步后可手动同步或按功能入口同步书签、快照和配置数据。",
      "2. 手动迁移：在“导入导出”页面导出插件数据，然后到其他设备安装 HamHome 后再导入。",
      "3. 如果只想回到浏览器原生体系，可将 HamHome 数据反向导入到浏览器书签栏。",
      "",
      "相关功能：",
      "- 配合网页快照保存离线内容，配合工作空间保存一组浏览上下文，配合标签组规则管理当前浏览器标签。",
    ].join("\n"),
  },
  {
    id: "semantic-search",
    title: "语义搜索",
    summary: "用自然语言查找含义相关的书签，不局限于关键词命中。",
    detail: [
      "适用场景：用户记得内容含义但不记得标题、网址或精确关键词，例如“上个月看的那篇讲向量数据库的文章”。",
      "",
      "初始化使用：",
      "1. 打开“设置 -> AI -> Embedding”，启用语义搜索。",
      "2. 配置 embedding provider、model、batchSize 和可选 dimensions；API Key、Base URL 等敏感连接信息需要用户手动填写。",
      "3. 对已有书签重建向量索引；新增书签保存后会逐步纳入检索范围。",
      "",
      "查找方式：",
      "- 在书签侧边栏或书签管理页输入自然语言问题，使用混合检索同时结合关键词和语义。",
      "- 在浏览器地址栏使用 HamHome Omnibox 搜索时，如果语义检索可用，会把语义结果与关键词结果合并排序。",
      "- 在 AI 对话窗口描述目标，让 Agent 调用搜索工具并总结命中的书签。",
      "- 可继续追加分类、标签、域名、时间范围等筛选条件缩小范围。",
      "",
      "排查建议：",
      "- 如果语义结果很少，先确认 embedding 已启用、API Key 可用，并检查向量索引覆盖率。",
      "- 如果用户只想精确匹配标题或 URL，可切换关键词检索或使用筛选器。",
    ].join("\n"),
  },
  {
    id: "ai-automation",
    title: "AI 自动化",
    summary: "用 AI 生成书签描述、分类、标签、翻译和批量整理结果。",
    detail: [
      "适用场景：减少手动填写描述、分类和标签的成本，让保存和批量整理更像确认建议，而不是从空白开始编辑。",
      "",
      "初始化使用：",
      "1. 在“设置 -> AI”选择 provider、model、temperature、maxTokens。",
      "2. 手动填写 API Key、Base URL 等敏感信息；agent 不能代填或读取这些值。",
      "3. 按需要开启 enableSmartCategory、enableTagSuggestion、enableTranslation、autoDetectPrivacy。",
      "4. 先配置分类系统和常用标签，AI 推荐会更稳定。",
      "",
      "保存网页时：",
      "- 唤起保存面板后，AI 可根据标题、URL 和页面内容生成描述、分类、标签和翻译结果。",
      "- 用户需要确认结果再保存；对隐私页面或命中隐私域名的页面，应跳过内容分析。",
      "",
      "整理已有书签：",
      "- 在书签管理页批量选择书签后，可重新 AI 分析、补充描述、移动分类或补标签。",
      "- 对导入的大量浏览器书签，建议先建立分类体系，再批量分析。",
      "",
      "Agent 能做什么：",
      "- 可以读取非敏感配置状态、打开设置页、搜索书签、给出整理建议，并在安全白名单内调整开关。",
      "- 不能代填 API Key、Base URL、隐私域名、同步凭据或浏览器快捷键。",
    ].join("\n"),
  },
  {
    id: "snapshots",
    title: "网页快照",
    summary: "保存网页内容，支持离线查看和 Obsidian 同步。",
    detail: [
      "适用场景：担心网页失效、需要离线阅读，或想把收藏内容同步到 Obsidian/WebDAV 做长期知识库。",
      "",
      "初始化使用：",
      "1. 在“设置 -> 常规”开启 autoSaveSnapshot，决定保存书签时是否自动保存快照。",
      "2. 按需要选择 HTML 或 Markdown 快照工作流；Markdown 更适合同步到笔记系统。",
      "3. 如需跨设备或外部知识库，进入“设置 -> 存储/同步”配置 WebDAV/Obsidian。",
      "",
      "日常使用：",
      "- 保存网页时可一并保存快照，之后在书签列表中查看、删除或同步。",
      "- 保存书签时可选择同步到 Obsidian；Markdown 快照更适合沉淀到 Obsidian 知识库。",
      "- 如果同步到 Obsidian 失败，可重试保存、检查 Markdown 快照是否生成，并确认 Obsidian/WebDAV 配置可用。",
      "- 对已有书签，可在管理页批量处理有快照的项目。",
      "- 同步账号、密码、远程地址等敏感信息需要用户在设置页手动填写。",
      "",
      "隐私提示：",
      "- 私密网站、内网页面和登录态内容不一定适合保存快照；可通过隐私域名和自动隐私检测跳过。",
    ].join("\n"),
  },
  {
    id: "privacy",
    title: "隐私保护",
    summary: "本地优先保存数据，敏感配置不由 agent 代填。",
    detail: [
      "核心原则：本地优先，敏感值不由 agent 代填；需要外部 AI 或同步服务时，由用户明确配置。",
      "",
      "数据范围：",
      "- 书签、分类、标签、快照和配置主要保存在本地浏览器环境。",
      "- 使用云端 AI 时，可能发送 URL、标题、页面摘要或内容片段用于生成描述、分类、标签和语义索引。",
      "- 使用 WebDAV/Obsidian 同步时，会把用户选择同步的数据发送到用户配置的目标服务。",
      "",
      "初始化建议：",
      "1. 在“隐私”页面了解数据处理说明。",
      "2. 在“设置 -> AI”开启 autoDetectPrivacy，并维护隐私域名。",
      "3. 如果希望尽量少外发数据，可选择 Ollama 等本地模型，或关闭页面内容分析和自动快照。",
      "",
      "Agent 边界：",
      "- 可以说明风险、读取非敏感状态、打开隐私或设置页面。",
      "- 不能代填、读取或输出 API Key、Base URL、隐私域名、同步 URL、用户名、密码和浏览器快捷键。",
    ].join("\n"),
  },
  {
    id: "workspaces-tab-groups",
    title: "工作空间与标签组",
    summary: "保存当前窗口、管理工作空间，并用规则组织浏览器标签组。",
    detail: [
      "适用场景：临时项目、调研任务、购物比较、旅行规划等需要保存一组打开页面，而不一定马上整理成长期书签。",
      "",
      "工作空间使用：",
      "1. 在浏览器中打开一组相关页面。",
      "2. 进入“工作空间”页面保存当前窗口，HamHome 会记录页面标题、域名、favicon、顺序和分组信息。",
      "3. 之后可恢复、编辑、删除工作空间，或把其中页面转换为正式书签。",
      "- 恢复时可选择恢复到当前窗口或新窗口，并可跳过重复 URL，避免打开已经存在的页面。",
      "- 保存当前窗口时会保留浏览器 Tab Group 信息；恢复工作空间时也会尽量还原分组。",
      "- 工作空间、页面和 Tab 分组可以拖拽调整；单个页面可复制 URL、编辑信息、移动到其他工作空间或保存为书签。",
      "",
      "标签组规则：",
      "- 在“标签组”页面创建规则，可按域名、标题或关键词把浏览器标签自动分组。",
      "- 适合把文档、代码仓库、设计稿、邮箱、会议页面等按工作流分开。",
      "- 复杂规则建议用户确认后保存；agent 可以解释规则、打开页面或查询数据摘要。",
      "",
      "Tab 标签页 AI 自动分组：",
      "- 适合当前窗口打开了很多标签页、但还没有稳定规则时使用。",
      "- HamHome 可以读取当前窗口标签页的标题、URL、域名等非敏感摘要，调用 AI 生成分组建议。",
      "- 用户确认后再应用分组，避免 AI 把工作流拆错；确认前可以调整分组名称、成员标签页和颜色。",
      "- 常用且稳定的 AI 分组结果，可沉淀为标签组规则，之后自动按规则执行。",
      "- 需要浏览器支持 tabGroups，并在标签组设置中开启 AI 自动分组。",
      "- 已有规则优先匹配；规则没有命中且允许 AI 时，才会请求 AI 生成分组建议。",
      "- 置顶标签页、隐私页面或命中隐私检测的页面会跳过自动 AI 分组。",
      "",
      "和书签管理的关系：",
      "- 工作空间偏向保存一次浏览上下文，书签偏向长期归档。",
      "- 当某个工作空间稳定复用时，可把页面转成书签，再用分类和标签纳入长期管理。",
    ].join("\n"),
  },
  {
    id: "import-export-sync",
    title: "导入导出与同步",
    summary: "导入浏览器/文件书签，导出数据，并通过 WebDAV/Obsidian 同步。",
    detail: [
      "适用场景：首次迁移浏览器书签、备份 HamHome 数据、跨设备迁移、同步快照到外部服务，或把插件数据反向导入浏览器书签栏。",
      "",
      "首次导入：",
      "1. 进入“导入导出”页面。",
      "2. 选择从浏览器书签或文件导入；导入前建议先规划分类系统。",
      "3. 导入后可批量 AI 分析，补充描述、分类、标签和快照。",
      "- HTML 书签导入可保留浏览器文件夹结构，并将文件夹映射为 HamHome 分类。",
      "- 导入时可跳过重复项；大量导入建议开启分批处理，减少失败后重来成本。",
      "- 插件完整数据导入可包含书签、分类、工作空间、工作空间分类和 Tab 分组规则。",
      "",
      "备份与迁移：",
      "- 手动方式：导出插件数据，在另一台设备安装 HamHome 后导入。",
      "- 自动方式：在“设置 -> 存储/同步”配置 WebDAV，开启后手动同步或按功能入口同步。",
      "- WebDAV 开启后，后台会定期同步；本地书签变化后也会延迟触发同步。",
      "- 如果另一台设备没有立即更新，可先手动同步，并检查 WebDAV URL、账号、密码和远端数据状态。",
      "- 清理远端同步数据属于高风险操作，执行前要提醒用户确认备份。",
      "- Obsidian 场景：配合 Markdown 快照，把收藏内容同步到知识库。",
      "",
      "反向导入到浏览器书签栏：",
      "- 当用户想回到浏览器原生书签体系，或要把整理后的结果给其他工具使用，可以把 HamHome 数据导出/反向导入到浏览器书签栏。",
      "- 同步回浏览器书签栏时，可选择根文件夹、是否先清空目标区域、是否跳过重复项。",
      "- 反向导入前建议先检查分类和标签，避免把临时或重复项目带回浏览器书签栏。",
      "",
      "敏感信息边界：",
      "- WebDAV URL、用户名、密码和端到端加密密码需要用户手动填写，agent 只能引导打开配置页。",
    ].join("\n"),
  },
  {
    id: "settings",
    title: "插件设置",
    summary: "统一配置主题、语言、AI、Embedding、存储、同步和面板行为。",
    detail: [
      "从 0 开始推荐顺序：",
      "1. 常规设置：确认语言、主题、默认分类、内容面板位置、是否自动保存快照和是否启用 omnibox 搜索。",
      "2. AI 设置：配置 provider、model、temperature、maxTokens，并由用户手动填写 API Key、Base URL。",
      "3. 分类和标签：先建立分类系统，再维护常用标签和 presetTags。",
      "4. Embedding 设置：如需自然语言查找，启用语义搜索并配置 embedding provider/model。",
      "5. 存储/同步设置：如需跨设备，配置 WebDAV/Obsidian；如只迁移一次，可使用导入导出。",
      "",
      "常见配置项：",
      "- 常规设置：语言、主题、默认分类、自动快照、omnibox 搜索、内容面板位置。",
      "- AI 设置：provider、model、temperature、maxTokens、智能分类、标签建议、翻译、隐私检测。",
      "- Embedding 设置：语义搜索开关、provider、model、dimensions、batchSize。",
      "- 存储/同步设置：本地存储信息、向量索引、WebDAV/Obsidian 同步。",
      "",
      "快捷键与入口：",
      "- save-bookmark：保存当前网页，通常用于唤起保存面板。",
      "- save-workspace：保存当前窗口为工作空间。",
      "- toggle-bookmark-panel：切换当前网页上的书签侧边栏。",
      "- 右键菜单也提供“收藏到 HamHome”“保存当前窗口为工作空间”和“管理 HamHome”等入口。",
      "- 浏览器快捷键必须由用户在浏览器扩展快捷键页面手动配置，agent 不能代填。",
      "",
      "agent 可自动修改的安全项：",
      "- settings: theme、language、autoSaveSnapshot、enableOmniboxSearch、defaultCategory、panelPosition。",
      "- aiConfig: provider、model、temperature、maxTokens、enableTranslation、enableSmartCategory、enableTagSuggestion、presetTags、autoDetectPrivacy。",
      "- embeddingConfig: enabled、provider、model、dimensions、batchSize。",
      "",
      "必须手动填写的敏感项：apiKey、baseUrl、privacyDomains、同步 URL、用户名、密码、浏览器快捷键。",
      "",
      "回答用户时：",
      "- 用户问“怎么开始用”时，应按常规设置 -> AI -> 分类 -> 导入 -> 同步/搜索的顺序回答。",
      "- 用户问某个敏感配置时，说明 agent 不能代填，并引导打开对应设置页。",
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
    "",
    "从 0 开始使用建议：",
    "1. 先引导用户完成基础设置：语言/主题/默认分类、AI provider/model，以及由用户手动填写 API Key、Base URL。",
    "2. 再引导用户建立分类系统和常用标签；如果已有大量收藏，可从浏览器或文件导入书签。",
    "3. 保存新增网页时，说明可用快捷键、右键菜单或插件图标唤起保存面板，由 AI 生成分类/标签/描述后用户确认保存。",
    "4. 查找书签时，说明可在书签侧边栏、书签管理页使用筛选器，也可在 AI 对话窗口让 Agent 帮忙查找；语义搜索需要先配置 embedding。",
    "5. 多设备使用时，优先说明 WebDAV/Obsidian 同步；只做一次迁移时，说明导出插件数据再到其他设备导入。",
    "6. 回答时按用户场景给步骤，不要只罗列能力；涉及敏感配置时说明不能代填，并引导打开设置页。",
    "",
    "Agent 可以：搜索和总结书签、统计最近收藏、读取非敏感配置状态、打开插件页面、解释功能用法，并在安全白名单内调整主题、语言、AI 开关、默认分类、面板位置、Embedding 参数等配置。",
    "Agent 不可以：代填或读取 API Key、Base URL、隐私域名、WebDAV/Obsidian 凭据、浏览器快捷键；遇到这些问题要解释边界并引导用户手动配置。",
    "",
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
