# HamHome AEO 与渠道文案完整方案

日期：2026-10-09。适用范围：Web、GitHub 描述与 README，以及由产品负责人手动更新的 Chrome / Edge / Firefox 商店介绍。

## 1. 最终定位与口号

产品类别：**开源、本地优先的网页收藏与标签页管理扩展**。英文：**Open-source, local-first web clipper and tab manager**。

中文口号：**借助 AI，让收藏有序，让标签页井然。**

英文口号：**Keep your collections organized and your tabs tidy, with help from AI.**

收藏与标签页是产品主角，AI 是辅助能力。Agent 用具体任务解释，不把 HamHome 定位成通用 Agent 平台。

| 产品概念 | 范围 | 对外用词 |
| --- | --- | --- |
| 收藏库 | 网页、文本、图片 | 收藏 / collections |
| 网页书签 | 链接、正文、摘要，以及可选快照与截图 | 网页收藏 / page bookmarks |
| 文本剪藏 | 原文片段与来源 | 文本剪藏 / text clips |
| 图片收藏 | 图片与来源信息 | 图片收藏 / image clips |
| 工作空间 | 一组可恢复标签页及组织信息 | 标签页工作空间 / tab workspaces |
| Agent | 查找、总结、检查状态与支持的管理操作 | 按需启用的操作助手 |

“书签管理”继续作为功能与搜索用词；产品总称用“网页收藏”，并明确包含文本和图片。

### 中文统一介绍

> HamHome 是一款开源、本地优先的网页收藏与标签页管理扩展。收藏网页、文本和图片，用关键词或语义搜索找回内容，保存并恢复标签页工作空间；内置 Agent 可辅助查找、总结和执行支持的管理操作。AI 服务与 WebDAV 同步由你选择。

### English product introduction

> HamHome is an open-source, local-first web clipper and tab manager. Save pages, text and images, find saved content with keyword or semantic search, and restore tab workspaces. An optional AI Agent helps you search, summarize and run supported management tasks. Choose your own AI provider and optional WebDAV sync.

### 发布事实边界

- 本方案基于仓库现有能力与用户确认的文本、图片收藏能力；本地实现不能单独证明各商店当前版本已经包含该功能。
- 每个商店应以其实际发布包核对文字、截图与权限。未发布的能力先删去对应段落，待同平台版本更新后再补回。
- 初稿不宣传当时开发中的自动归档、稍后读与标签预算；2026-10-10 的 `1.4.3` 已包含这些能力，随新版审核提交的补充文案见第 9 节。尚未更新到该版本的渠道仍使用基础介绍。
- 不使用“所有数据永不外发”“全部离线”“WebDAV 同步完整快照”“已实现加密同步”等承诺。
- Chrome/Edge 支持原生 Tab Group 自动分组；当前 Firefox 构建不运行该自动化。不要根据浏览器提供新 API 就宣称插件已适配。
- Agent 只承诺已支持的工具；敏感凭据由用户填写，不描述成任意网站、任意任务都能自动完成。

## 2. AEO 内容与证据策略

目标：让搜索系统能识别 HamHome 的产品类别，并在收藏整理、内容回找、标签页工作现场与隐私控制相关问题中引用准确答案。

| 用户问题 | 对应内容 | 可核实证据 |
| --- | --- | --- |
| 如何整理网页、文本和图片？ | AI 收藏指南 | 保存与剪藏界面、使用指南 |
| 忘记标题如何找回收藏？ | 语义搜索指南 | 搜索/Agent 界面、Embedding 配置要求 |
| 如何保存一组标签页？ | 工作空间指南 | 工作空间截图、浏览器差异 |
| 数据存在哪里，AI 会发送什么？ | 隐私与同步指南 | 数据范围说明、隐私政策、源码 |

页面采用：直接答案 → 操作步骤 → 真实截图 → 使用条件与范围 → 安装入口与相关资料。关键词作为初始选题假设，后续用实际搜索查询调整，不批量生成重复关键词页。

Agent 示例：

1. “帮我找上周保存的 React 文章。” → 查找收藏与来源。
2. “总结这些已保存的网页。” → 带来源的内容总结。
3. “检查 WebDAV 同步状态，打开对应设置。” → 查看状态并打开相关页面。

这三项是任务示例，不是保证每次模型输出相同结果。修改与删除操作以该发布版本的工具和确认机制为准。

## 3. Web 实施内容

- 首页主口号采用最终版本，产品定义明确网页、文本、图片收藏与标签页管理。首页唯一的 `h1` 为“HamHome — 产品类别”（与 title 一致），口号作为其后的大号副标题。
- 沿用现有视觉样式和真实截图；调整介绍顺序，增加任务指南与 Agent 示例。
- 独立生成 `/zh/` 与 `/en/`，各自的初始 HTML、`html lang`、title、description、OG 和 canonical 与语言一致。页头语言切换是带 `hreflang` 的真实链接，指向另一语言的同一页面，不依赖 JavaScript 即可被发现。
- 旧 `/` 与 `/privacy-policy/` 保留中文兼容页面，canonical 指向对应中文页；旧网址可继续访问。GitHub Pages 静态托管不在这里承诺 HTTP 301。兼容页面不做自动跳转（避免与 canonical 冲突），偏好英文的访客在水合后看到指向对应英文页的提示条。
- hreflang 的 `x-default` 统一指向 canonical 中文页面（如 `/zh/`），不指向旧 `/`；页面 metadata 与 sitemap 共用同一套生成逻辑。
- 四个指南，每个提供中文与英文：`ai-collections`、`semantic-search`、`tab-workspaces`、`privacy-sync`，路径为 `/{language}/guides/{slug}/`。
- FAQ 所有类别和答案进入静态 HTML；使用原生折叠面板与类别锚点，不依赖点击后才创建正文。通用类第一题为“什么是 HamHome？”并默认展开。
- 增加 `SoftwareApplication` JSON-LD，与可见产品介绍一致；按语言区分 `@id`，标注扩展免费（`offers` 价格 0，AI 服务费用另由服务商收取）。指南页增加 `TechArticle` 与面包屑，`og:type` 为 `article`。不添加评分、评论或下载量，不承诺富结果展示。
- 社交分享图 `og-image.png`（1200×630）更新为新定位：品牌名、中英文类别与三项要点，配色与官网品牌橙一致。由 `node apps/extension/scripts/generate-og-image.mjs` 生成（依赖 macOS 系统字体），同一脚本输出 `docs/og-image.png` 与商店小宣传图 `docs/og-image-440x280.png`。
- 隐私政策页按扩展实际实现重写：定位、数据范围、浏览器同步存储（storage.sync，含 AI 配置与 API Key）、与 manifest 一致的权限说明，以及会接收数据的服务（AI、Embedding、WebDAV、Cravatar 网站图标服务、书签体检访问的网站）；隐私页使用专属 description。
- 官网基准地址为 `https://bingoyb.github.io/ham_home`，由 `NEXT_PUBLIC_SITE_URL` 统一配置。canonical、OG、robots、sitemap 与部署地址一致。
- Pages 构建配置保留 `NEXT_PUBLIC_BASE_PATH=/ham_home`；静态页面带尾斜杠，生成目录中的 `index.html`。
- 项目导出的 robots 使用允许抓取规则，sitemap 列出正式语言页面与指南。GitHub Pages 项目站位于 `/ham_home/`：实际 robots 控制位于主机根目录，`/ham_home/robots.txt` 不能代替它。2026-10-09 核对 `https://bingoyb.github.io/robots.txt` 返回 HTTP 404；因此不能只凭本仓库文件宣称平台已经读取项目抓取规则。上线后手动向搜索平台提交 `https://bingoyb.github.io/ham_home/sitemap.xml`。`lastModified` 使用实际内容更新日期，修改内容时更新 `CONTENT_UPDATED_AT`（隐私页使用 `PRIVACY_POLICY_UPDATED_AT`），不使用每次构建时间冒充更新。
- 延续现有官网 Clarity 集成；本轮不新增事件埋点。扩展本地优先与官网访问分析是不同范围。

如未来切换域名，应同时更新站点环境变量、Pages 域名绑定、GitHub Homepage、README、商店官网/支持/隐私链接，并核对所有资源路径。

## 4. GitHub 实施内容

### About 描述（可直接使用）

```text
Open-source, local-first web clipper & tab manager: save pages, text and images, search collections, restore workspaces, and manage supported tasks with an AI Agent. Optional WebDAV sync. | 开源、本地优先的网页收藏与标签页管理扩展：网页、文本与图片剪藏，语义搜索、工作空间恢复、Agent 辅助操作与可选 WebDAV 同步。
```

保留现有 topics，补充准确分类：`bookmark-manager`、`browser-extension`、`web-clipper`、`semantic-search`、`local-first`、`webdav`。Homepage 保持现有有效 GitHub Pages 地址。

英文 `README.md` 和中文 `docs/README_zh.md` 同步口号、产品定义、Agent 管理能力，增加产品事实表、场景指南与上手入口；保留后面的功能说明和产品截图。

About 与 topics 可直接在 GitHub 更新；README、Web 与方案文档属于本地仓库改动，需要后续提交、推送并进入部署流程才会在远端生效。本轮不包含发布扩展或操作插件市场。

## 5. 插件市场手动更新包

执行人：产品负责人。以下正文为准备稿，先按各商店当前发布版本核对“发布事实边界”，再复制到对应语言字段。

### 5.1 名称、短描述与口号

| 字段 | 中文 | English |
| --- | --- | --- |
| 展示名称 | HamHome — AI 网页收藏与标签页管理 | HamHome — AI Web Clipper & Tab Manager |
| 品牌口号 | 借助 AI，让收藏有序，让标签页井然。 | Keep your collections organized and your tabs tidy, with help from AI. |

中文短描述：

```text
收藏网页、文本和图片，用 AI 查找和整理内容，保存并恢复标签页工作空间。本地优先，按需启用 Agent 辅助操作。
```

英文短描述：

```text
Save pages, text and images, find collections with AI, and organize tab workspaces. Local first, with optional AI Agent help.
```

英文短描述为 125 个字符，不超过 Chrome 的 132 字符限制；其余商店以各自后台实际校验为准。扩展名称与短描述可能受发布包 `manifest` 及国际化文件联动：`apps/extension/public/_locales/en/messages.json`、`zh_CN/messages.json` 中的 `extName` / `extDescription`。这两个键已在本地改为上表的展示名称与短描述，并在 `wxt.config.ts` 补充 `short_name: "HamHome"`（供空间不足的界面使用）；随下一个扩展版本打包发布后生效，发布前核对构建产物。Chrome 会把同一上下文的多个右键菜单项归入以扩展名称命名的子菜单，名称变长后该子菜单标题也随之变长。

### 5.2 中文长描述（复制正文）

```text
借助 AI，让收藏有序，让标签页井然。

HamHome 是一款开源、本地优先的网页收藏与标签页管理扩展。收藏网页、文本和图片，用关键词或语义搜索找回内容，把一组标签页保存为可恢复的工作空间。按需启用 AI 和 Agent，帮助你整理内容、查找收藏和完成支持的管理操作。

收藏网页、文本和图片
- 保存网页链接与正文，并按需保留本地 HTML/Markdown 快照和页面截图。
- 右键收藏选中的文字或图片，保留来源信息。
- 配置 AI 后生成摘要、分类和标签；图片分析需要支持图像输入的模型，并可单独关闭。

找回你保存过的内容
- 按标题、网址、描述或正文进行关键词搜索。
- 单独配置 Embedding 后启用语义搜索，按主题查找内容。
- 配合分类、标签、内容类型和时间筛选，缩小搜索范围。

用 Agent 辅助管理和操作
- 用自然语言查找和总结已保存内容，例如“帮我找上周保存的 React 文章”。
- 解释插件功能、打开相关页面、检查状态，并执行支持的管理工具。
- 执行过程可见；API Key、端点地址和 WebDAV 凭据等敏感设置仍由你填写。

保存并恢复标签页工作空间
- 保存一组标签页及页面顺序、固定状态和支持的分组信息。
- 恢复全部或选中页面到当前窗口或新窗口，按需跳过重复网址。
- 将有长期价值的工作空间页面转成网页书签。

本地优先，服务由你选择
- 主要数据默认保存在浏览器本地，无需注册 HamHome 账号。
- AI 功能使用你配置的服务或本地端点，相关内容会发送给该服务；云端 API 费用按服务商定价计算。
- 可配置隐私域名，让敏感页面跳过 AI 分析与截图。
- 导入浏览器书签、导出 JSON/HTML，或通过自选 WebDAV 服务同步结构化数据与书签正文。
- 本地快照文件和页面截图不通过 WebDAV 同步；JSON 备份不包含页面截图。

上手：安装后先保存一个网页、文字片段或图片，再进入收藏库。需要时再配置 AI、Embedding 或 WebDAV。
```

### 5.3 English long description (copy text)

```text
Keep your collections organized and your tabs tidy, with help from AI.

HamHome is an open-source, local-first web clipper and tab manager. Save pages, text and images, find saved content with keyword or semantic search, and keep groups of tabs as restorable workspaces. Enable AI and the Agent when you need help organizing content, finding collections or running supported management tasks.

Save pages, text and images
- Save page links and extracted content, with optional local HTML/Markdown snapshots and page screenshots.
- Right-click selected text or an image to save a clip with its source.
- Configure AI for suggested summaries, categories and tags. Image analysis needs a vision-capable model and can be disabled separately.

Find what you saved
- Search titles, URLs, descriptions and page content with keywords.
- Configure embeddings separately to search by topic with semantic search.
- Narrow results by category, tags, content type and date.

Ask the Agent for help
- Find and summarize saved content in natural language, such as “Find the React articles I saved last week.”
- Get feature explanations, open extension views, check status and run supported management tools.
- See execution steps. You still enter sensitive settings such as API keys, endpoints and WebDAV credentials yourself.

Save and restore tab workspaces
- Save groups of tabs with page order, pinned state and supported grouping information.
- Restore all or selected pages into the current or a new window, optionally skipping duplicate URLs.
- Turn workspace pages worth keeping into long-term bookmarks.

Local first, with services you choose
- Primary data stays in your browser by default. No HamHome account is required.
- AI uses your configured provider or local endpoint and sends relevant content there. Cloud API fees follow the provider’s pricing.
- Configure privacy domains to skip AI analysis and screenshots on sensitive pages.
- Import browser bookmarks, export JSON/HTML, or use your own WebDAV service to sync structured data and bookmark text.
- Local snapshot files and page screenshots are not synced through WebDAV. JSON backups do not include page screenshots.

Start by saving a page, text passage or image, then open the library. Configure AI, embeddings or WebDAV only when you need them.
```

### 5.4 各浏览器的必填补充

把对应补充放在“工作空间”段落后，中文和英文分别填写，不能把三家浏览器的能力当成完全一致。

| 商店 | 中文补充 | English addition |
| --- | --- | --- |
| Chrome | 在 Chrome 中，可按域名、网址、标题或正则自动整理原生 Tab Group，按需使用 AI 分组；手动规则优先。 | On Chrome, organize native Tab Groups by domain, URL, title or regex, with optional AI grouping. Manual rules run first. |
| Edge | 在 Edge 中，可按域名、网址、标题或正则自动整理原生 Tab Group，按需使用 AI 分组；手动规则优先。 | On Edge, organize native Tab Groups by domain, URL, title or regex, with optional AI grouping. Manual rules run first. |
| Firefox | Firefox 支持收藏与工作空间保存/恢复；当前 Firefox 构建不运行原生 Tab Group 自动分组。 | Firefox supports collections and saving/restoring workspaces. The current Firefox build does not run native Tab Group automation. |

### 5.5 截图与关联链接

截图按用户任务排列，每张配一条简短标题。Chrome 建议从以下选择最多五张，其他商店以后台允许数量为准：

1. 网页收藏与 AI 整理 / Save pages with AI assistance。
2. 文本与图片剪藏 / Clip text and images。
3. 收藏搜索与 Agent 帮助 / Find saved content with Agent assistance。
4. 工作空间与标签页管理 / Save and restore tab workspaces。
5. 数据控制与 WebDAV / Control your data and sync。

用该商店实际版本和对应语言的界面截图。Firefox 第四张用工作空间，不展示尚未适配的原生 Tab Group 自动化。小宣传图（440×280）使用 `docs/og-image-440x280.png`，与官网分享图同源生成。

| 链接字段 | 中文目标 | English target |
| --- | --- | --- |
| 官网 | https://bingoyb.github.io/ham_home/zh/ | https://bingoyb.github.io/ham_home/en/ |
| 隐私政策 | https://bingoyb.github.io/ham_home/zh/privacy-policy/ | https://bingoyb.github.io/ham_home/en/privacy-policy/ |
| 使用说明 | https://github.com/bingoYB/ham_home/blob/main/docs/USAGE_zh.md | https://github.com/bingoYB/ham_home/blob/main/docs/USAGE_en.md |
| 支持 | https://github.com/bingoYB/ham_home/issues | https://github.com/bingoYB/ham_home/issues |

### 5.6 手动更新顺序

1. 确认 Web 改动已部署，新官网与隐私链接返回正常页面。尚未部署时继续使用原有可访问链接。
2. 分别检查三商店的发布包版本，确认剪藏、Agent、工作空间等正文所述能力确实存在。
3. 分别进入中文和英文语言字段，粘贴对应标题、短描述、长描述；插入该浏览器补充段落。
4. 删除该发布版本未支持的功能段落；不要用开发分支截图替代发布版本截图。
5. 名称/摘要由 manifest 提供：国际化文件已在本地更新，随下一个版本打包发布；长描述、截图与小宣传图按后台流程更新。
6. 更新官网、隐私、使用与支持链接，预览并按各商店流程保存或提交审核。
7. 审核通过后，打开中英文公开页面逐项复核。记录版本、日期与状态，区分“已提交”“审核中”和“公开页面已更新”。

## 6. 验证与效果评估

开发验证：

```bash
pnpm --filter web test
NEXT_PUBLIC_BASE_PATH=/ham_home pnpm build:web
pnpm --filter web verify:export
git diff --check
```

检查静态 HTML 的语言、canonical、alternate、OG、完整 FAQ、JSON-LD、静态资源与内部链接；浏览器检查中英文切换、指南、隐私页、折叠 FAQ 与移动端排版。

上线后验证：新旧页面均可访问；提交新 sitemap，核对 Search Console 收录状态。检查首页、四类指南和对应语言页面，不把构建成功等同于线上已生效。

固定中英文问题做基线抽样，例如“有哪些本地优先的网页收藏工具”“怎样收藏网页里的文字和图片”“忘记文章标题如何找回收藏”“怎样保存浏览器标签页工作现场”。记录平台、模型/模式、日期、问题原文、是否提到 HamHome、是否引用官网、描述是否准确。每次重复抽样，观察趋势，不把一次回答视为稳定排名或推荐保证。

指标包括：非品牌查询曝光、指南页面收录、官网点击、各商店安装趋势和 AI 引用准确率。未单独埋点时不要声称已经获得安装入口点击数据；官网 GitHub Pages 没有完整服务端爬虫日志时不要声称已验证所有 AI bot 到访。

不创建定时监控；不把付费目录、批量外链或 `llms.txt` 当成第一批必做项。

## 7. 官方依据

- [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)：基础 SEO、文本可读性与可见内容一致的结构化数据；没有特殊 AI 标记要求。
- [OpenAI：Overview of OpenAI Crawlers](https://developers.openai.com/api/docs/bots)：`OAI-SearchBot` 面向搜索，`GPTBot` 面向训练，两者可分别配置。
- [Chrome：Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)：准确定位、132 字符以内的摘要、简洁长描述与当前版本真实截图。
- [Next.js：Static Exports](https://nextjs.org/docs/app/guides/static-exports)：静态生成路由与导出部署限制。

## 8. 执行记录

| 项目 | 本轮状态 |
| --- | --- |
| 完整方案与商店手动更新包 | 已写入本文第五节，包含中英文名称、短描述、长描述、浏览器差异、截图顺序和更新步骤 |
| Web | 本地完成首屏与定位、Agent 任务示例、完整 FAQ、四主题双语指南、语言路由与 SEO 修正 |
| README | 本地完成中英文同步、产品事实表、Agent 管理与操作说明、指南入口 |
| GitHub About | 已通过 `gh repo edit` 更新，`gh repo view` 回读与本文第四节一致；258 个字符 |
| GitHub topics | 保留原有五个主题，新增六个准确类别；Homepage 保持现有 GitHub Pages 地址 |
| 插件市场 | 2026-10-10 经产品负责人确认后执行发布与描述更新，分平台结果见第九节 |
| 扩展名称与短描述 | 已随 `1.4.3` 打包；Chrome 草稿与 Firefox 商店的中英文名称、摘要已核验 |
| 分享图与小宣传图 | 已按新定位重新生成 `apps/web/public/og-image.png`、`docs/og-image.png`、`docs/og-image-440x280.png` |
| Review 修正（2026-10-10） | x-default 指向 canonical 中文页；隐私页专属描述与正文重写；兼容页面英文提示；首页 `h1` 含品牌与类别；JSON-LD 按语言区分并标注免费、指南增加文章与面包屑；Web 测试改用 vitest；全局 404 页（`global-not-found`）、完整站点图标、FAQ 首题与英文标点修正；页头语言切换改为可抓取链接 |
| 代码提交与线上 Web 部署 | 已提交并推送到 `feat/agent-runtime-upgrade`；Web 与 README 尚未合并到 `main`，新版 Web 未部署 |

验证已通过：

- `pnpm --filter web test`（vitest）：12 个单元测试通过，覆盖语言切换、尾斜杠、不支持的语言、hreflang/x-default 与产品、指南结构化数据。
- `NEXT_PUBLIC_BASE_PATH=/ham_home pnpm build:web`：Next.js 16.1.1 静态构建和 TypeScript 检查成功。
- `pnpm --filter web verify:export`：14 个 HTML 页面与 `404.html`，12 个 sitemap 正式地址；语言、canonical/hreflang（含 x-default）、页头语言切换链接、OG（指南为 article，分享图文件存在且尺寸与 meta 一致）、首页 `h1`、FAQ 首题与 19 个完整答案、产品与指南 JSON-LD、隐私页专属描述、站点图标、内部链接与图片资源通过。
- `git diff --check`（本轮 Web、README、workflow 文件）：通过。
- Playwright：中文首页切换英文时标题、文档语言与 canonical 同步；指南切换语言保留原主题；同步 FAQ 实际展开；英文隐私页可访问；桌面和 390px 布局无横向溢出，控制台未见错误。
- 扩展 manifest：用临时配置只构建 background 到草稿目录，确认 `short_name` 与中英文名称、描述解析正确（未覆盖本地 `.output`）。
- 目视检查：首页英文桌面与中文移动端截图已核对；截图保存在 `output/playwright/`，不属于产品发布素材。

构建时的 `baseline-browser-mapping` 数据更新时间提示在修改前的基线中同样存在，不影响构建通过。最初沙箱构建因 Turbopack 需要本地端口而被系统限制，允许本地构建进程后验证通过。

前期 Web 文案实施仅修改扩展的国际化名称、摘要和 `short_name`。2026-10-10 发布阶段按用户要求纳入全部本地功能改动，并发布 `1.4.3`，见下节。

## 9. v1.4.3 发布与商店更新（2026-10-10）

### 9.1 已执行状态

- 全部原有本地修改提交为 `ba32f55`（`feat: add tab lifecycle management and AEO marketing`）；版本号单独提交为 `c6b00d9`（`chore(extension): bump version to 1.4.3`）。分支与 `v1.4.3` 标签均已推送。
- [GitHub Release v1.4.3](https://github.com/bingoYB/ham_home/releases/tag/v1.4.3) 已公开发布，附带 Chrome、Firefox、Edge 三个 zip；源码包用于 Firefox 审核。
- Chrome 后台已核验草稿包为 `1.4.3`，中英文名称、摘要与长描述已保存并读回。新版与文案一起提交审核，状态为“待审核”，通过后自动发布；当前公开包仍为 `1.4.2`。
- Firefox `1.4.3` 已成功提交（file status: `unreviewed`），验证为 0 errors / 31 warnings / 0 notices。通过官方 API 更新中英文名称、摘要与第五节基础长描述，包含 Firefox 的工作空间与 Tab Group 能力差异，并读回核验。新增稍后读、自动归档和标签预算段落待该版本审核上架后再加入。
- Edge 上传在 TLS 建连阶段失败：`Client network socket disconnected before secure TLS connection was established`。仅重试 Edge 后仍失败；备用开发者后台也返回 `ERR_CONNECTION_CLOSED`。该平台包未上传成功，描述尚未更新。网络恢复后仅处理 Edge，不重复提交 Chrome 和 Firefox。
- GitHub About、topics 与 Homepage 已再次读回核验。Web 与 README 已推送到功能分支，未合并部署，因此商店继续使用原有可访问官网、支持和隐私网址。

### 9.2 随新版加入的长描述段落

Chrome 已将以下段落放在“工作空间”段落后、“本地优先”段落前。Edge 待成功上传新版后使用同样段落；Firefox 待新版审核上架后再加入。

```text
给标签页减负，留住值得读的内容
- 一键加入稍后读并关闭页面，按阅读状态管理队列；可添加备注、标记已读或转入收藏库。
- 在标签页中心归档并恢复页面；闲置自动归档和标签预算按需开启，自动归档需本机确认。
- 用 AI 查看并调整保留、稍后读和归档建议，配合本周概览回顾使用情况。
```

```text
Reduce tab clutter and keep what is worth reading
- Add a page to Read later and close the tab. Track reading status, add notes, mark items as read or keep them in the library.
- Archive and restore pages from the tab center. Enable idle auto-archiving and tab budgets when needed; auto-archiving requires consent on each device.
- Review and adjust AI suggestions to keep, read later or archive tabs, and revisit your activity with the weekly overview.
```

### 9.3 发布验证与工具限制

- 扩展 336 个测试、Agent 233 个测试、Web 12 个测试及 11 个扩展端到端测试通过；Agent 6 个集成测试按配置跳过。扩展 TypeScript、三个浏览器生产构建、Web 静态构建与导出检查通过。
- 三个插件 zip 的 manifest 均为 `1.4.3`；名称与摘要符合文案，Chrome/Edge 含 `tabGroups`，Firefox 不含；插件与源码 zip 中未包含私有环境配置或密钥文件。
- 本机使用 Node 24 与 Corepack pnpm 9。当前发布工具混用第三方 `FormData` 与 Node 原生 fetch，上传被编码成 `text/plain`：Firefox 返回 415；Chrome 工具可能报告上传步骤完成而后台仍是旧包。已通过本地 Request 复现。Firefox 本次用临时表单兼容处理成功提交；Chrome 改用 Edge 浏览器中的官方后台直接上传，并核验版本与送审回执。兼容处理仅用于发布进程，未修改插件包或仓库代码。
- Firefox 的 31 条验证警告和已有构建 warning 未作为审核通过证据；最终上架取决于各商店审核。
