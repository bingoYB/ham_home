import { PRODUCT_COPY } from './site';

export type FAQCategory = 'general' | 'privacy' | 'ai' | 'sync';

export const FAQ_CATEGORIES: { id: FAQCategory; labelEn: string; labelZh: string }[] = [
  { id: 'general', labelEn: 'GENERAL', labelZh: '通用' },
  { id: 'privacy', labelEn: 'PRIVACY & DATA', labelZh: '隐私与数据' },
  { id: 'ai', labelEn: 'AI FEATURES', labelZh: 'AI 功能' },
  { id: 'sync', labelEn: 'SYNC & BACKUP', labelZh: '同步与备份' },
];

export const FAQS: Record<FAQCategory, { qEn: string; aEn: string; qZh: string; aZh: string }[]> = {
  general: [
    {
      qEn: 'What is HamHome?',
      aEn: PRODUCT_COPY.en.description,
      qZh: '什么是 HamHome？',
      aZh: PRODUCT_COPY.zh.description
    },
    {
      qEn: 'Can I use HamHome without configuring AI?',
      aEn: 'Yes. Save pages, text and images, manually organize categories and tags, search by keywords, and save or restore workspaces. AI summaries, semantic search and the Agent require the corresponding provider or local endpoint configuration.',
      qZh: '不配置 AI 也能使用 HamHome 吗？',
      aZh: '可以。你仍可收藏网页、文本和图片，手动整理分类与标签、使用关键词搜索，以及保存和恢复工作空间。AI 摘要、语义搜索和 Agent 需要配置对应的服务商或本地端点。',
    },
    {
      qEn: 'Do I need a HamHome account?',
      aEn: 'No. Primary data stays in your browser by default. AI provider accounts and optional WebDAV credentials are configured separately by you.',
      qZh: '需要注册 HamHome 账号吗？',
      aZh: '不需要。主要数据默认保存在你的浏览器中，AI 服务账号与可选 WebDAV 凭据由你另外配置。',
    },
    {
      qEn: 'Can I save part of a page instead of the whole page?',
      aEn: 'Yes. Select text or right-click an image and choose to save it. Text clips keep the exact quote and reopen the source page at that passage; image clips keep the image URL, source page, size, format, and dominant colors. Both appear in the library as cards and can be filtered by content type.',
      qZh: '可以只保存页面中的一段文字或一张图片吗？',
      aZh: '可以。选中文字或右键图片即可单独保存。文字剪藏保留原文，打开时会定位到来源页中的那一段；图片剪藏记录图片地址、来源页、尺寸、格式和主色。两者都会以卡片形式出现在收藏库中，并可按内容类型筛选。'
    },
    {
      qEn: 'Which browsers are supported?',
      aEn: 'HamHome supports Chrome / Chromium and Microsoft Edge with Manifest V3 builds. Firefox builds are also provided. The current Firefox build does not run native Tab Group automation; use workspaces to save and restore sessions.',
      qZh: '支持哪些浏览器？',
      aZh: 'HamHome 支持 Chrome / Chromium 和 Microsoft Edge 的 Manifest V3 构建，也提供 Firefox 构建；当前 Firefox 构建不运行原生 Tab Group 自动分组，可使用工作空间保存和恢复会话。'
    },
    {
      qEn: 'Is this only a bookmark manager?',
      aEn: 'No. Bookmarks are the long-term layer, but HamHome also manages current browsing sessions through workspaces and Tab Group rules. You can save open tabs, restore selected pages, and convert useful workspace pages into bookmarks later.',
      qZh: '它只是一个书签管理器吗？',
      aZh: '不是。书签是长期归档层，HamHome 也通过工作空间和 Tab 分组规则管理当前浏览会话。你可以保存打开的标签页，稍后恢复选中页面，再把有价值的工作空间页面转成正式书签。'
    }
  ],
  privacy: [
    {
      qEn: 'Where is my data stored?',
      aEn: 'Primary data is stored locally in browser storage and IndexedDB. That includes bookmarks, clips, categories, settings, snapshots, page screenshots, AI cache, vector data, workspaces, and rules.',
      qZh: '我的数据存储在哪里？',
      aZh: '主要数据保存在浏览器存储和 IndexedDB 中，包括书签、剪藏、分类、设置、快照、页面截图、AI 缓存、向量数据、工作空间和规则。'
    },
    {
      qEn: 'Are my private sites sent to AI?',
      aEn: 'You can configure privacy domains and use automatic privacy detection so sensitive sites skip AI analysis and page screenshots. AI keys, Base URLs, privacy domains, WebDAV credentials, and browser shortcuts are manually configured by the user.',
      qZh: '我的私人网站内容会发送给 AI 吗？',
      aZh: '你可以配置隐私域名并启用自动隐私检测，让敏感站点跳过 AI 分析和页面截图。API Key、Base URL、隐私域名、WebDAV 凭据和浏览器快捷键都由用户手动配置。'
    },
    {
      qEn: 'Where are page screenshots stored?',
      aEn: 'Page screenshots capture only the visible area of the page, without HamHome UI, and are stored in IndexedDB on the current device. They are not included in WebDAV sync or JSON backups, and private pages skip screenshots by default. Settings shows how many screenshots you have and how much space they use; each one can be downloaded or deleted from the screenshot viewer.',
      qZh: '页面截图保存在哪里？',
      aZh: '页面截图只截取网页当前可见区域，不包含 HamHome 自身界面，保存在当前设备的 IndexedDB 中，不进入 WebDAV 同步或 JSON 备份，隐私页面默认跳过截图。设置中可以查看截图数量与占用空间，单张截图可在截图查看器中下载或删除。'
    },
    {
      qEn: 'Can the Agent change sensitive settings?',
      aEn: 'No. The Agent can explain settings, open relevant extension views, inspect safe status, and adjust safe non-sensitive options, but it does not read or fill API keys, Base URLs, privacy domains, sync credentials, or browser shortcuts.',
      qZh: 'Agent 能修改敏感设置吗？',
      aZh: '不能。Agent 可以解释设置含义、打开相关插件页面、检查安全状态，并在安全白名单内调整非敏感开关，但不会读取或代填 API Key、Base URL、隐私域名、同步凭据或浏览器快捷键。'
    }
  ],
  ai: [
    {
      qEn: 'Does semantic search need a separate configuration?',
      aEn: 'Yes. Configure an embedding provider and model separately from the chat model, then build the vector index. Keyword search remains available without embeddings.',
      qZh: '语义搜索需要单独配置吗？',
      aZh: '需要。Embedding 服务与模型独立于聊天模型配置，随后建立向量索引；未配置 Embedding 时仍可使用关键词搜索。',
    },
    {
      qEn: 'Do I need to pay for AI features?',
      aEn: 'HamHome uses a Bring Your Own Key model. You connect your own provider account or local endpoint. Cloud API usage may incur charges under that provider’s pricing; local endpoints such as Ollama depend on your own setup.',
      qZh: '我需要为 AI 功能付费吗？',
      aZh: 'HamHome 采用自带密钥模式。你接入自己的服务商账号或本地端点。云端 API 是否收费及费用由服务商决定；Ollama 等本地端点取决于你自己的运行环境。'
    },
    {
      qEn: 'Which AI providers are supported?',
      aEn: 'Chat providers include OpenAI, Anthropic, Google Gemini, Azure OpenAI, DeepSeek, Groq, Mistral, Moonshot/Kimi, Zhipu/GLM, Tencent Hunyuan, NVIDIA NIM, SiliconFlow, Ollama, and custom OpenAI-compatible APIs. Embeddings are configured separately for semantic search.',
      qZh: '支持哪些 AI Provider？',
      aZh: '聊天模型支持 OpenAI、Anthropic、Google Gemini、Azure OpenAI、DeepSeek、Groq、Mistral、Moonshot/Kimi、智谱/GLM、腾讯混元、NVIDIA NIM、SiliconFlow、Ollama 和自定义 OpenAI 兼容 API。语义搜索的 Embedding 会单独配置。'
    },
    {
      qEn: 'Does AI analyze image clips?',
      aEn: 'Yes, with a vision-capable model. When you save an image clip, HamHome can send the image to your AI provider to suggest a title, summary, category, and tags. You can turn off "AI analysis for image clips" in AI settings, and images from private pages are never sent.',
      qZh: 'AI 会分析图片剪藏吗？',
      aZh: '会，需要使用支持图像输入的模型。保存图片剪藏时，HamHome 可以把图片发送给你配置的 AI 服务，生成标题、摘要、分类和标签。你可以在 AI 设置中关闭「图片剪藏 AI 分析」，隐私页面上的图片始终不会发送。'
    },
    {
      qEn: 'What can the AI Agent do for me?',
      aEn: 'The Agent can find and summarize saved content, explain features, open extension pages, check status and run supported management tools. For example, ask it to find saved React articles or inspect WebDAV sync status. It shows execution steps; credentials and sensitive settings remain under your control.',
      qZh: 'AI Agent 能帮我完成哪些操作？',
      aZh: 'Agent 可以查找和总结已保存内容、解释功能、打开插件页面、检查状态，并执行支持的管理工具。例如让它查找收藏中的 React 文章，或检查 WebDAV 同步状态。执行过程可见，凭据与敏感设置仍由你控制。'
    }
  ],
  sync: [
    {
      qEn: 'Can I sync my data across multiple devices?',
      aEn: 'Yes. WebDAV sync writes structured HamHome data under /HamHomeSync, including settings, bookmarks and bookmark text content, clips, categories, workspaces, workspace categories, Tab Group rules, and auto-group settings. Bookmarks are matched by URL, so syncing from several devices does not create duplicates.',
      qZh: '我可以在多个设备之间同步我的数据吗？',
      aZh: '可以。WebDAV 会在 /HamHomeSync 下同步结构化数据，包括设置、书签与书签正文、剪藏、分类、工作空间、工作空间分类、Tab 分组规则和自动分组设置。书签按网址对齐身份，多台设备同步也不会产生重复书签。'
    },
    {
      qEn: 'What happens when I delete a bookmark?',
      aEn: 'It moves to Trash and stays restorable for 30 days, together with its content, snapshot, screenshot, and clips. After that, or when you delete it forever, HamHome removes the data and keeps only a lightweight tombstone so the deletion also syncs to your other devices.',
      qZh: '删除书签后会发生什么？',
      aZh: '书签会先进入回收站，连同正文、快照、截图和剪藏一起保留 30 天，期间可随时恢复。到期或你手动彻底删除后，HamHome 会清除这些数据，只保留一条轻量墓碑，让删除结果同步到其他设备。'
    },
    {
      qEn: 'Are local snapshots and page screenshots synced through WebDAV?',
      aEn: 'No. WebDAV sync focuses on structured data and bookmark text content. Local HTML/Markdown snapshot files and page screenshots remain on the device unless you download them or send Markdown-style notes through the Obsidian workflow.',
      qZh: '本地快照和页面截图会通过 WebDAV 同步吗？',
      aZh: '不会。WebDAV 同步重点是结构化数据和书签正文。本地 HTML/Markdown 快照文件和页面截图默认只在本机，除非你手动下载，或通过 Obsidian 工作流发送 Markdown 风格笔记。'
    },
    {
      qEn: 'Can I move data back to the browser bookmark bar?',
      aEn: 'Yes. HamHome can write organized bookmarks back to the browser bookmark bar, with options for root folder, clear-first behavior, and duplicate skipping.',
      qZh: '可以把数据写回浏览器书签栏吗？',
      aZh: '可以。HamHome 支持把整理后的书签写回浏览器书签栏，并可配置根文件夹、是否先清空目标区域和是否跳过重复项。'
    }
  ]
};

export function getFaqGroups(isEn: boolean) {
  return FAQ_CATEGORIES.map((category) => ({
    id: category.id, label: isEn ? category.labelEn : category.labelZh,
    items: FAQS[category.id].map((faq) => ({ question: isEn ? faq.qEn : faq.qZh, answer: isEn ? faq.aEn : faq.aZh })),
  }));
}
