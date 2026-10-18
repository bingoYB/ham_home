# HamHome 商店文案 V2

更新日期：2026-10-17。适用于 Chrome Web Store、Edge Add-ons 和 Firefox Add-ons 的本地化资料。本文件是待提交文案；修改文件与扩展 manifest 不代表商店页面已更新。

## 名称与简述

| 字段 | 简体中文 | English |
| --- | --- | --- |
| 名称 | HamHome — AI 书签管理与网页收藏 | HamHome — AI Bookmark Manager |
| 简述 | 用 AI 为书签生成分类、标签和摘要，导入旧书签后批量分析，通过语义搜索找回收藏。支持文字图片剪藏、标签页工作空间、本地存储与自选 AI。 | Organize bookmarks with AI categories, tags, summaries, and semantic search. Local storage, your AI provider, and tab workspaces. |

简述分别为 69 / 129 个字符；已同步 `public/_locales/zh_CN/messages.json` 与 `public/_locales/en/messages.json`。提交前仍需核对各商店字段限制与最终预览。

## 中文长描述

HamHome 是一款开源、本地优先的 AI 书签管理插件，支持 Chrome、Edge 和 Firefox。用 AI 为书签生成分类、标签和摘要，导入旧书签后批量分析，通过关键词或语义搜索找回收藏。也支持文字图片剪藏和标签页工作空间。

借助 AI，让收藏有序，让标签页井然。

**用 AI 整理新收藏**

配置你选择的 AI 服务后，保存网页时可生成分类、标签和摘要，检查并调整结果。需要保留局部内容时，可以右键剪藏文字或图片；图片分析需支持图像输入的模型，可单独关闭。

**导入并批量整理旧书签**

从浏览器或 HTML 书签文件导入到 HamHome，再选中书签批量 AI 分析。导入时保留原文件夹为分类与自动 AI 分析是互斥选项。整理后可主动写回浏览器书签栏；安装扩展本身不会自动重排全部原生文件夹。

**通过内容找回收藏**

用关键词查找标题、网址、描述与正文；单独配置 Embedding 并建立索引后，可按主题进行语义搜索。内置 Agent 可辅助查找、总结已保存内容，并执行支持的管理操作。

**保存浏览现场**

把一组标签页保存为工作空间，稍后恢复全部或选中页面。Chrome 与 Edge 可使用原生 Tab Group 自动分组；当前 Firefox 构建使用工作空间保存和恢复页面，不运行原生 Tab Group 自动分组。

**本地存储，自选 AI**

无需注册 HamHome 账号，主要收藏数据默认保存在浏览器本地。基础收藏管理和关键词搜索可不使用 AI。AI 需配置自己的服务商账号/API Key 或本地端点，可选择 OpenAI、DeepSeek、Anthropic Claude、Ollama 等；云端 API 与 Embedding 费用由服务商决定。

启用云端 AI 时，相关网页内容会发送给你配置的服务。可设置隐私域名，让相应页面跳过分析；本地模型需要自行运行并配置扩展访问。可选 WebDAV 同步将结构化数据同步到自己的服务器，本地快照文件和页面截图默认不通过 WebDAV 同步。

入门指南：https://bingoyb.github.io/ham_home/zh/guides/ai-bookmark-manager/
旧书签整理：https://bingoyb.github.io/ham_home/zh/guides/import-bookmarks/
AI 配置：https://bingoyb.github.io/ham_home/zh/guides/ai-provider-setup/
源代码：https://github.com/bingoYB/ham_home

## English long description

HamHome is an open-source, local-first AI bookmark manager for Chrome, Edge and Firefox. Generate categories, tags and summaries, import existing bookmarks for bulk AI analysis, and find saved content with keyword or semantic search. Also save text and image clips and tab workspaces.

Keep your collections organized and your tabs tidy, with help from AI.

**Organize new bookmarks with AI**

Connect your chosen AI provider to generate categories, tags and summaries when saving pages, then review and adjust the results. Right-click text or images to keep only what you need. Image analysis requires a vision-capable model and can be disabled separately.

**Import and organize existing bookmarks**

Import browser bookmarks or an HTML bookmark file into HamHome, then select items for bulk AI analysis. Preserving original folders as categories and automatic AI analysis during import are mutually exclusive. Optionally write organized bookmarks back to the browser bookmark bar. Installing the extension alone does not rearrange all native folders.

**Rediscover saved content**

Search titles, URLs, descriptions and page text by keyword. Configure embeddings separately and build an index to search by topic. The built-in Agent can help find and summarize saved content and run supported management actions.

**Resume a browsing session**

Save a group of tabs as a workspace and restore all or selected pages later. Chrome and Edge support native Tab Group automation. The current Firefox build saves and restores workspaces without native Tab Group automation.

**Local storage, your AI provider**

No HamHome account is required. Primary collection data stays in your browser by default. Basic bookmark management and keyword search work without AI. AI requires your own provider account/API key or local endpoint, with options including OpenAI, DeepSeek, Anthropic Claude and Ollama. Cloud AI and embedding charges depend on your providers.

Cloud AI receives relevant page content for processing. Configure privacy domains to skip analysis for those pages. Local models require your own running service and extension access. Optional WebDAV sync sends structured data to your server; local snapshot files and page screenshots are not synced by default.

Getting started: https://bingoyb.github.io/ham_home/en/guides/ai-bookmark-manager/
Existing bookmarks: https://bingoyb.github.io/ham_home/en/guides/import-bookmarks/
AI setup: https://bingoyb.github.io/ham_home/en/guides/ai-provider-setup/
Source code: https://github.com/bingoYB/ham_home

## 提交与复测

- 网站新指南上线后再提交含这些链接的商店长描述，检查各语言商店预览。
- 扩展名称与简介随下一次经过验证的扩展版本提交；商店审核与公开展示状态分别记录。
- 以实际插件截图展示导入、批量分析和搜索步骤；示例图片不作为真实整理成功率的证明。
- 发布后分别记录 ChatGPT 等产品的查询日期、问题、是否联网、引用 URL 和是否提及 HamHome。推荐结果是观察指标，不保证收录或推荐。
