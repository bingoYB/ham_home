import type { SupportedLanguage } from './language';
import type { ExtensionScreenshotId } from '../components/extensionScreenshots';

export interface GuideCopy {
  title: string;
  description: string;
  answer: string;
  steps: string[];
  limits: string[];
}

export interface GuideDefinition {
  slug: string;
  screenshot: ExtensionScreenshotId;
  zh: GuideCopy;
  en: GuideCopy;
}

export type LocalizedGuide = GuideCopy & Pick<GuideDefinition, 'slug' | 'screenshot'>;

export const GUIDES: GuideDefinition[] = [
  {
    slug: 'ai-collections', screenshot: 'imageClipSave',
    zh: {
      title: '如何用 AI 整理网页、文本和图片收藏？',
      description: '用 HamHome 收藏网页、文本和图片，按需生成摘要、分类和标签，在同一个收藏库中筛选和整理。',
      answer: 'HamHome 的收藏库包含网页书签、文本剪藏和图片收藏。保存整页时可提取正文并保留快照；右键选中文字或图片可只收藏需要的片段。配置 AI 后，可让模型辅助生成摘要、分类和标签，再由你检查和调整。',
      steps: ['从工具栏、快捷键或右键菜单保存当前网页；也可以右键选中文字或图片进行剪藏。', '按需配置 AI 服务。图片分析需要支持图像输入的模型，并可单独关闭。', '检查标题、摘要、分类和标签，确认后保存到收藏库。', '按内容类型、分类、标签或时间筛选；对选中的书签批量整理或重新分析。'],
      limits: ['AI 功能会把相关内容发送给你配置的服务；隐私域名与自动隐私检测可跳过分析。', '网页快照需在保存时成功生成，页面截图只覆盖当前可见区域。', '未配置 AI 也可以手动保存、分类、打标签和使用关键词搜索。'],
    },
    en: {
      title: 'How can AI organize saved pages, text and images?',
      description: 'Save pages, text and images in HamHome, optionally generate summaries and tags with AI, and organize them in one library.',
      answer: 'HamHome collections include page bookmarks, text clips and image clips. Save a whole page with extracted content and optional snapshots, or right-click selected text or an image to keep just that piece. After configuring AI, use suggested summaries, categories and tags, then review the result yourself.',
      steps: ['Save a page from the toolbar, shortcut or context menu; right-click selected text or an image to create a clip.', 'Optionally configure an AI provider. Image analysis requires a vision-capable model and can be disabled separately.', 'Review the title, summary, category and tags before saving.', 'Filter by content type, category, tags or date; organize selected bookmarks in bulk or re-run analysis.'],
      limits: ['AI sends relevant content to your selected provider. Privacy domains and automatic privacy detection can skip analysis.', 'A snapshot must be captured successfully when saving. Screenshots cover the visible page area.', 'Manual capture, categories, tags and keyword search work without configuring AI.'],
    },
  },
  {
    slug: 'semantic-search', screenshot: 'aiAgent',
    zh: {
      title: '忘记标题，如何通过内容找回收藏？',
      description: '了解 HamHome 的关键词、语义和对话式搜索，以及单独配置 Embedding 的要求。',
      answer: '记得准确词语时，先搜索标题、网址、描述或正文；只记得主题时，可启用 Embedding 语义搜索，再配合分类、标签和时间筛选。内置 Agent 也能用自然语言检索和总结已保存内容，返回可点击的书签来源。',
      steps: ['先用关键词搜索收藏，并按内容类型、分类或日期缩小范围。', '如需按主题查找，在设置中单独配置 Embedding 服务并建立向量索引。', '用自然语言描述主题，例如“上周保存的 React 文章”，或向 Agent 提问。', '打开匹配的收藏来源，核对原文；模型生成的总结仍需检查。'],
      limits: ['配置聊天模型不等于配置 Embedding；语义搜索需要独立的模型配置和可用索引。', '只能搜索已保存且可用的内容；尚未索引的内容可能无法被语义检索召回。', '云端 Embedding 和 Agent 请求可能产生服务商 API 费用，按服务商定价计算。'],
    },
    en: {
      title: 'How do I find saved content when I forget its title?',
      description: 'Use keyword, semantic and conversational search in HamHome, with separately configured embeddings.',
      answer: 'Use keyword search when you remember exact words in a title, URL, description or page text. Enable embedding-based semantic search when you remember a topic, then narrow results by tags, categories and dates. The optional Agent can search and summarize saved content in natural language with clickable bookmark sources.',
      steps: ['Start with keyword search and narrow results by content type, category or date.', 'For topic-based search, configure an embedding provider separately and build the vector index.', 'Describe your topic, such as “React articles saved last week”, or ask the Agent.', 'Open the matching sources and check the original content; review generated summaries.'],
      limits: ['A chat model configuration does not configure embeddings. Semantic search requires its own model and a usable index.', 'Search covers saved, available content. Unindexed items may not appear in semantic results.', 'Cloud embedding and Agent requests may incur charges under your provider’s pricing.'],
    },
  },
  {
    slug: 'tab-workspaces', screenshot: 'workspaces',
    zh: {
      title: '如何保存一组标签页，下次继续工作？',
      description: '把浏览器窗口保存为 HamHome 工作空间，恢复全部或选中页面，并通过规则整理标签页。',
      answer: 'HamHome 工作空间可以保存一组打开的标签页，包括页面顺序、固定状态和支持的 Tab Group 信息。再次使用时，恢复全部或选中页面到当前窗口或新窗口；有长期价值的页面可转成网页书签。',
      steps: ['在当前浏览器窗口使用“保存工作空间”，为这组页面命名。', '在工作空间中检查页面列表，按需要设置分类和标签。', '恢复全部或选中页面到当前窗口或新窗口，可跳过已打开的重复网址。', '在 Chrome/Edge 中按域名、网址或标题设置 Tab 分组规则，并按需使用 AI 分组。'],
      limits: ['工作空间保存网址与会话组织信息，不是远端网站的登录状态或页面完整运行状态。', '当前 Firefox 构建不运行原生 Tab Group 自动分组，工作空间仍可用于保存和恢复页面。', '恢复页面仍需相应的网络与网站访问权限；需要离线阅读时，可另存网页快照。'],
    },
    en: {
      title: 'How do I save a group of tabs and resume work later?',
      description: 'Save a browser window as a HamHome workspace, restore selected pages, and organize tabs with grouping rules.',
      answer: 'HamHome workspaces save a set of open tabs with page order, pinned state and supported Tab Group information. Restore all or selected pages into the current window or a new one, then turn pages worth keeping into long-term bookmarks.',
      steps: ['Save the current browser window as a workspace and give it a name.', 'Review the page list and organize the workspace with categories and tags.', 'Restore all or selected pages into the current or a new window, optionally skipping duplicate URLs.', 'On Chrome/Edge, configure Tab Group rules by domain, URL or title, and optionally use AI grouping.'],
      limits: ['Workspaces store URLs and session organization, not website sign-in sessions or full running page state.', 'The current Firefox build does not run native Tab Group automation. Workspaces still save and restore pages.', 'Restoring pages still requires network and website access. Save page snapshots separately for offline reading.'],
    },
  },
  {
    slug: 'privacy-sync', screenshot: 'importExportSync',
    zh: {
      title: '收藏存在哪里？AI 和 WebDAV 会传输什么？',
      description: '了解 HamHome 的本地存储、自选 AI 服务、WebDAV 同步范围，以及快照和截图的限制。',
      answer: 'HamHome 的主要收藏与工作空间数据默认保存在浏览器存储和 IndexedDB，无需注册 HamHome 账号。启用 AI 时，相关内容发送给你配置的服务；启用 WebDAV 时，结构化数据同步到你配置的服务器。本地 HTML/Markdown 快照文件和页面截图默认不通过 WebDAV 同步。',
      steps: ['先使用本地收藏与工作空间，按需导出数据备份。', '需要 AI 时配置你选择的服务与模型，并设置隐私域名。', '需要跨设备同步时，在各设备配置自己的 WebDAV 服务并检查同步状态。', '查看存储占用，按需要下载本地快照与截图；Agent 可以解释配置和检查状态，凭据由你填写。'],
      limits: ['本地优先不等于所有功能都离线；AI、链接检查与 WebDAV 需要相应的网络访问。', 'WebDAV 同步结构化数据及书签正文，不等于整台设备的完整备份；JSON 备份也不包含页面截图。', '自选云端 AI 服务的数据处理规则由服务商决定；图片分析需要图像模型，且可单独关闭。'],
    },
    en: {
      title: 'Where are collections stored, and what do AI and WebDAV send?',
      description: 'Understand local storage, optional AI providers, WebDAV sync scope, and snapshot and screenshot limitations.',
      answer: 'Primary HamHome collections and workspace data stay in browser storage and IndexedDB by default, with no HamHome account required. AI sends relevant content to your configured provider. Optional WebDAV sync sends structured data to your own server. Local HTML/Markdown snapshot files and page screenshots are not synced through WebDAV.',
      steps: ['Start with local collections and workspaces, and export data backups when needed.', 'Configure your chosen provider and models only if you need AI, and set privacy domains.', 'For cross-device sync, configure your WebDAV service on each device and check sync status.', 'Review storage use and download local snapshots or screenshots when needed. The Agent can explain settings and check status; you enter credentials yourself.'],
      limits: ['Local first does not mean every feature is offline. AI, link checks and WebDAV require the relevant network access.', 'WebDAV synchronizes structured data and bookmark text, not a complete device backup. JSON backups do not include page screenshots.', 'Your selected cloud provider governs its data handling. Image analysis requires a vision model and can be disabled separately.'],
    },
  },
];

export function getGuide(slug: string, language: SupportedLanguage): LocalizedGuide | undefined {
  const guide = GUIDES.find((item) => item.slug === slug);
  return guide ? { slug: guide.slug, screenshot: guide.screenshot, ...guide[language] } : undefined;
}
