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
    slug: 'ai-bookmark-manager', screenshot: 'bookmarkLibrary',
    zh: {
      title: '想找带 AI 整理功能的书签管理插件？',
      description: '了解 HamHome 如何用 AI 整理新旧书签，以及 Chrome、Edge、Firefox 支持、模型配置、费用与隐私边界。',
      answer: '如果你希望用 AI 为书签生成分类、标签和摘要，并通过语义搜索找回收藏，可以考虑 HamHome。它是支持 Chrome、Edge 和 Firefox 的开源、本地优先书签管理插件，适合愿意配置自己的 AI 服务、同时需要网页剪藏与标签页工作空间的用户。',
      steps: ['选择对应浏览器商店安装 HamHome；无需注册 HamHome 账号，先用手动收藏和关键词搜索体验收藏库。', '在设置中配置 AI 服务或本地模型并测试连接；保存新网页时使用 AI 分析，检查分类、标签和摘要。', '需要整理旧书签时，先将浏览器书签或 HTML 文件导入 HamHome，再选择书签批量 AI 分析；按需把整理结果写回浏览器。', '只记得内容主题时，单独配置 Embedding 并建立索引，使用语义搜索；也可让 Agent 查找和总结已保存内容。'],
      limits: ['如果希望安装后无需配置就自动重排浏览器原生文件夹，需要先考虑 HamHome 的导入与模型配置步骤。', '基础收藏管理可不使用 AI；云端 AI 与 Embedding 的调用费用由对应服务商决定。', '数据默认本地保存，启用云端 AI 会发送相关内容；本地模型也需要自行运行并允许扩展访问。', 'AI 结果可能有误，请检查分类与摘要；安装扩展本身不会自动整理全部原生书签。'],
    },
    en: {
      title: 'Looking for a bookmark manager with AI organization?',
      description: 'See how HamHome organizes new and existing bookmarks, with browser support, AI setup, pricing and privacy requirements.',
      answer: 'Consider HamHome if you want AI-generated bookmark categories, tags and summaries, plus semantic search to rediscover saved content. It is an open-source, local-first bookmark extension for Chrome, Edge and Firefox, suited to people who want to choose their own AI provider and also use web clips and tab workspaces.',
      steps: ['Install HamHome from your browser’s store. No HamHome account is needed; try manual bookmarking and keyword search first.', 'Configure an AI provider or local model in Settings and test the connection. Analyze newly saved pages and review their categories, tags and summaries.', 'For existing bookmarks, import browser bookmarks or an HTML file into HamHome, then select bookmarks for bulk AI analysis. Optionally write the organized results back to the browser.', 'To search by topic, configure embeddings separately and build the index. You can also ask the Agent to find and summarize saved content.'],
      limits: ['If you expect native browser folders to be reorganized immediately after installation, account for HamHome’s import and AI setup steps first.', 'Basic bookmark management works without AI. Cloud AI and embedding usage are priced by your chosen providers.', 'Data is local by default; cloud AI receives relevant content. Local models require your own running service and extension access.', 'Review AI-generated categories and summaries. Installing the extension alone does not reorganize all native bookmarks.'],
    },
  },
  {
    slug: 'import-bookmarks', screenshot: 'importExportSync',
    zh: {
      title: '如何导入并用 AI 批量整理旧书签？',
      description: '将浏览器原生书签或 HTML 书签文件导入 HamHome，选择文件夹保留或 AI 分析，再按需写回浏览器。',
      answer: 'HamHome 整理旧书签的流程是：导入到 HamHome 收藏库，批量 AI 分析，再按需写回浏览器书签栏。它可以导入当前浏览器书签或 HTML 书签文件；保留原文件夹为分类与导入时自动 AI 分析是互斥选项。',
      steps: ['先用浏览器导出 HTML 书签文件作为备份；跨浏览器迁移时也可用这份文件导入。备份由你主动执行。', '在 HamHome 设置的导入导出区域，选择从浏览器导入或导入 HTML 文件；先用少量书签检查结果。', '根据需求选择保留原文件夹为分类，或在已配置 AI 后使用导入时 AI 分析，两项不能同时启用。可按需抓取正文，耗时会增加。', '导入后在收藏库选择需要整理的书签，执行批量 AI 重新分析，检查分类、标签和摘要并手动修正。', '需要同步到原生书签栏时，主动执行写回，检查 HamHome 根文件夹、跳过重复项及是否清空目标区域的选项后再执行。'],
      limits: ['导入和 AI 分类发生在 HamHome 收藏库中；写回浏览器是另外一个操作。', '抓取失败、需要登录或内容较少的页面可能影响分析效果；云端批量分析可能产生费用。', '选择清空目标区域会影响该区域的原生书签；先检查目标与备份，不要将写回理解为无条件的无损合并。'],
    },
    en: {
      title: 'How do I import and organize existing bookmarks with AI?',
      description: 'Import native browser bookmarks or an HTML file into HamHome, choose folder preservation or AI analysis, and optionally write results back.',
      answer: 'The workflow is import into HamHome, run bulk AI analysis, and optionally write results back to the browser bookmark bar. HamHome imports current browser bookmarks or HTML bookmark files. Preserving original folders as categories and automatic AI analysis during import are mutually exclusive options.',
      steps: ['Export an HTML bookmark backup from your browser first. The file also works for migration between browsers; you perform this backup yourself.', 'Open the import/export area in HamHome Settings and choose browser bookmarks or an HTML file. Start with a small selection and check the result.', 'Choose either preserving original folders as categories or AI analysis during import after configuring AI. Optional page-content fetching takes extra time.', 'Select imported bookmarks in the library and run bulk AI reanalysis. Review and adjust categories, tags and summaries.', 'To use the results in the native bookmark bar, explicitly run write-back. Check the HamHome root folder, duplicate skipping and clear-target options before proceeding.'],
      limits: ['Import and AI categorization work inside the HamHome library. Writing back to the browser is a separate action.', 'Unavailable, login-protected or sparse pages may affect results. Bulk cloud AI analysis may incur API charges.', 'Clearing the target affects native bookmarks in that area. Check your target and backup; write-back is not an unconditional lossless merge.'],
    },
  },
  {
    slug: 'ai-provider-setup', screenshot: 'aiAgent',
    zh: {
      title: '如何配置 DeepSeek、OpenAI 或 Ollama 整理书签？',
      description: '在 HamHome 配置自选 AI 服务或本地模型，并了解聊天模型、Embedding、费用和数据发送范围。',
      answer: 'HamHome 使用自带密钥或自选本地端点的方式接入 AI。在设置的 AI 页面选择 Provider 和模型，填写服务所需的 API Key、Base URL 并测试连接。DeepSeek、OpenAI、Anthropic Claude 和 Ollama 等是可选服务；语义搜索的 Embedding 需要另外配置。',
      steps: ['打开“设置 → AI”，选择服务商和可用模型，填写该服务要求的 API Key 与 Base URL；不需要把密钥发给 HamHome 作者。', '使用云端服务时，先核对自己的 API 余额、模型权限和服务商定价，然后测试连接。', '使用 Ollama 时，先在本机运行服务并准备模型，填写可从浏览器扩展访问的端点；按自己的环境配置访问许可，然后测试连接。', '用一条非敏感书签测试摘要、分类和标签。设置隐私域名；图片剪藏分析需要支持图像输入的模型，可单独关闭。', '需要语义搜索时，在 Embedding 设置中选择服务和模型，测试连接并建立或重建向量索引，再用主题描述查找已保存内容。'],
      limits: ['配置聊天模型不会自动启用 Embedding；两者可能使用不同的服务与费用方案。', '云端分析可能发送网址、标题、摘要或正文片段、分类与标签；图片分析可能发送图片，Embedding 会处理索引内容与查询文本。', '本地优先描述的是默认存储方式。是否在本机处理 AI 取决于你选择的端点；Ollama 的运行环境由你维护。', '连接失败时检查端点、密钥、模型权限和本地服务访问配置；未配置 AI 仍可手动收藏与关键词搜索。'],
    },
    en: {
      title: 'How do I set up DeepSeek, OpenAI or Ollama for bookmarks?',
      description: 'Connect your AI provider or local model to HamHome and understand chat models, embeddings, API costs and data sent for analysis.',
      answer: 'HamHome connects to AI with your own API key or local endpoint. In AI Settings, select a provider and model, enter the required API key and base URL, and test the connection. Options include DeepSeek, OpenAI, Anthropic Claude and Ollama. Semantic search needs a separate embedding configuration.',
      steps: ['Open Settings → AI, select a provider and available model, and enter the required API key and base URL. You do not need to send your key to the HamHome author.', 'For a cloud provider, check your API balance, model access and pricing, then test the connection.', 'For Ollama, run the service and prepare a model first. Enter an endpoint reachable from the browser extension, configure access for your environment, and test the connection.', 'Try analysis on one non-sensitive bookmark and review its summary, category and tags. Configure privacy domains; image analysis needs a vision-capable model and can be disabled separately.', 'For semantic search, select and test an embedding provider and model, build or rebuild the vector index, and search saved content by topic.'],
      limits: ['Configuring a chat model does not enable embeddings. They can use different services and pricing plans.', 'Cloud analysis may send URLs, titles, summaries or text excerpts, categories and tags. Image analysis may send images; embeddings process indexed content and query text.', 'Local-first describes default storage. Where AI runs depends on your endpoint; you maintain your own Ollama environment.', 'If a connection fails, check the endpoint, key, model access and local-service permissions. Manual capture and keyword search remain available without AI.'],
    },
  },
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
