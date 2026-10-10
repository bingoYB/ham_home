# HamHome Web - 组件文档

本文档记录 `apps/web` 产品落地页当前使用的页面组件。组件内容以扩展实际能力为准，截图统一来自插件自动截图输出并复制到 `apps/web/public/screenshots/extension/`。

## 目录结构

```text
app/components/
├── SiteDocument.tsx
├── LandingPage.tsx
├── GuidePage.tsx
├── JsonLd.tsx
├── LegacyLanguageNotice.tsx
├── NotFoundContent.tsx
├── Header.tsx
├── Footer.tsx
├── PrivacyPolicyContent.tsx
├── LandingActionButtons.tsx
├── LandingOverview.tsx
├── LandingCapabilities.tsx
├── LandingPrivacy.tsx
├── LandingFAQ.tsx
├── LandingCta.tsx
├── FeatureHeroBanner.tsx
├── FeatureSection.tsx
├── FeatureShowcase.tsx
├── ExtensionScreenshotFrame.tsx
├── extensionScreenshots.ts
├── showcaseFeatures.tsx
└── demos/
    ├── AIChatSearchDemo.tsx
    └── ...
```

## HomePage

首页路由组件，组合产品结构化数据与 `LandingPage`；`/zh/`、`/en/` 静态生成，旧 `/` 保留中文兼容入口。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| - | - | - | - | 无 props |

### Usage

```tsx
<HomePage />
```

### 行为说明

- 页面语言由路由确定并传入 `LandingPage`，首屏 HTML 与 metadata 对齐。
- 将 `isEn` 与 `isDark` 传入 Hero 和功能展示区，自动选择中英文、明暗主题截图。
- 不再依赖 mock bookmark 数据渲染主落地页展示，主展示内容以自动截图为准。

---

## Header

顶部导航栏组件，展示 Logo、品牌、副标题、语言切换、主题切换、GitHub 入口和下载下拉菜单。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isDark | boolean | 是 | - | 当前是否为深色主题 |
| isEn | boolean | 是 | - | 当前是否为英文模式 |
| onToggleTheme | (e?: React.MouseEvent) => void | 是 | - | 切换主题回调 |
| languageSwitchHref | string | 是 | - | 当前页面另一语言版本的路径（不含 base path，由 `Link` 补全） |
| onLanguageSwitch | () => void | 是 | - | 点击语言链接时的回调，用于记录显式语言偏好 |

### Usage

```tsx
<Header
  isDark={isDark}
  isEn={isEn}
  onToggleTheme={toggleTheme}
  languageSwitchHref={languageSwitchHref}
  onLanguageSwitch={rememberLanguageSwitch}
/>
```

### 行为说明

- 下载菜单通过 `getDownloadChannels()` 和 `getRecommendedDownloadChannel()` 自动推荐当前浏览器渠道。
- 副标题来自 `PRODUCT_COPY`：AI 网页收藏与标签页管理 / AI Web Clipper & Tab Manager。
- 语言切换是带 `hrefLang` 与 `lang` 的真实链接（`Link`，关闭预取），静态 HTML 中即可发现另一语言版本；目标保留指南或隐私页面路径，点击时记录显式语言偏好。下载菜单抽取为 `DownloadDropdown`。

---

## FeatureHeroBanner

首页首屏 Hero，展示品牌主张、下载/GitHub 操作、核心能力标签，以及自动截图轮播。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |
| isDark | boolean | 是 | - | 当前是否为深色主题，用于选择截图主题 |

### Usage

```tsx
<FeatureHeroBanner isEn={isEn} isDark={isDark} />
```

### 行为说明

- 轮播展示真实插件截图：书签库、视觉画廊、AI Agent、书签健康中心、工作空间、Tab 分组、导入导出与同步。
- 能力标签为 2×2 网格：文字与图片剪藏、Agent 辅助管理与操作、工作空间与 Tab 分组、隐私边界可控。
- 唯一的 `h1` 由 Logo、品牌名 HamHome 和类别标签组成（如「HamHome — AI 网页收藏与标签页管理」，与页面 title 一致）；Logo 为装饰图（空 alt），类别前有仅供读屏的「—」分隔。
- 最终口号「借助 AI，让收藏有序，让标签页井然。」与对应英文作为 `h1` 之后的大号段落，来自 `PRODUCT_COPY`；轮播交给 `HeroScreenshotCarousel`。
- 截图路径由 `getExtensionScreenshotSrc()` 生成，自动带上 `NEXT_PUBLIC_BASE_PATH`。
- 不再使用 Imgur 老截图。

---

## ExtensionScreenshotFrame

通用截图展示框，给插件自动截图添加浏览器窗口样式、标题栏和稳定纵横比。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| id | ExtensionScreenshotId | 是 | - | 截图 ID |
| isEn | boolean | 是 | - | 选择英文或中文截图目录 |
| isDark | boolean | 是 | - | 选择深色或浅色截图目录 |
| caption | string | 否 | 截图标题 | 标题栏文案 |
| priority | boolean | 否 | false | 是否优先加载 |
| className | string | 否 | - | 外层样式 |
| imageClassName | string | 否 | - | 图片样式 |

### Usage

```tsx
<ExtensionScreenshotFrame
  id="aiAgent"
  isEn={isEn}
  isDark={isDark}
/>
```

### 行为说明

- `popupSave`（页内保存浮窗）、`popupQuickPanel`（扩展快捷面板）和 `imageClipSave`（图片剪藏浮窗）使用竖向 popup 比例，其余截图使用桌面 3:2 比例。
- 截图 ID 与文件对应关系见 `extensionScreenshots.ts`：`01`–`09` 为原有截图，`10-visual-gallery`、`11-image-clip-save`、`12-health-center`、`13-trash` 对应视觉画廊、图片剪藏、书签健康中心和回收站。
- 只负责展示截图，不包含业务交互。

---

## FeatureShowcase

首页核心功能展示区，按实际扩展功能展示多组自动截图和对应能力说明。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |
| isDark | boolean | 是 | - | 当前是否为深色主题 |

### Usage

```tsx
<FeatureShowcase isEn={isEn} isDark={isDark} />
```

### 行为说明

- 展示 AI 收藏、富剪藏、书签库视图、健康中心与回收站、AI Agent、工作空间、Tab 分组、导入导出与同步八个区块。
- 区块数据（图标、截图 ID、中英文标题/描述/要点）集中在 `showcaseFeatures.tsx` 的 `getShowcaseFeatures(isEn)`，组件本身只负责渲染。
- 多截图布局按截图比例自适应：首张为 popup 比例时使用窄列 + 宽列，两张都是桌面截图时等宽两列；移动端纵向堆叠。
- 内容说明覆盖真实实现：页面截图、文字/图片剪藏、视觉画廊、自定义时间范围、书签体检、30 天回收站、WebDAV 按网址对齐与删除墓碑、Obsidian Markdown 工作流等。
- 每个区块使用真实截图和右侧能力要点，不再渲染旧的手写产品 demo。

---

## FeatureSection

功能区块容器，负责统一标题、图标、描述、背景和内容插槽。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| id | string | 是 | - | section id |
| icon | ReactNode | 是 | - | 标题图标 |
| title | string | 是 | - | 区块标题 |
| description | string | 是 | - | 区块描述 |
| children | ReactNode | 是 | - | 区块主体 |
| alternate | boolean | 否 | false | 是否使用交替背景 |
| className | string | 否 | - | 自定义样式 |

### Usage

```tsx
<FeatureSection id="agent-control" icon={<Bot />} title="AI Agent" description="...">
  <ExtensionScreenshotFrame id="aiAgent" isEn={isEn} isDark={isDark} />
</FeatureSection>
```

### 行为说明

- 偶数/奇数区块可交替背景，提高长页面扫读性。

---

## LandingOverview

首屏下方能力摘要组件，概括当前扩展真实界面和核心功能。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |

### Usage

```tsx
<LandingOverview isEn={isEn} />
```

### 行为说明

- 展示 AI 收藏、富剪藏、健康中心、Agent 代办、工作空间、Tab 分组、WebDAV、隐私保护八个摘要，桌面端 4 列。
- 文案按保存内容、找回收藏、理顺标签页展开，AI 与 Agent 作为可选辅助能力。

---

## LandingCapabilities

更多能力网格，展示 Agent 代办插件、书签搜索、快照与截图、回收站、WebDAV、浏览器迁移、Provider 和隐私边界。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |

### Usage

```tsx
<LandingCapabilities isEn={isEn} />
```

### 行为说明

- 八个静态能力卡片按语言切换标题和描述。
- Provider 描述与扩展实际 `provider-config.ts` 保持一致。

---

## LandingPrivacy

数据与隐私边界说明区，说明本地存储、隐私域名、WebDAV 同步范围和敏感配置边界。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |

### Usage

```tsx
<LandingPrivacy isEn={isEn} />
```

### 行为说明

- 明确 WebDAV 同步结构化数据（含剪藏与删除墓碑），本地快照文件与页面截图默认仍在本机。
- 说明图片剪藏只在开启图片分析时发送给 AI 服务，隐私页面不会发送；隐私域名同时跳过 AI 分析和页面截图。
- 明确 API Key、Base URL、隐私域名、WebDAV 凭据和浏览器快捷键由用户手动配置。

---

## LandingFAQ

常见问题组件，按通用、隐私、AI、同步四类展示问答。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |

### Usage

```tsx
<LandingFAQ isEn={isEn} />
```

### 行为说明

- 四个类别与全部答案始终存在于初始 HTML；分类锚点滚动到对应区域，原生 `details/summary` 折叠答案。
- 问答内容已对齐当前扩展实现，不再声明未实现的 WebDAV 加密同步能力。
- FAQ 数据统一在 `app/lib/faq.ts`；通用类第一题为「什么是 HamHome？」（默认展开），先给出产品定义；覆盖 Agent 任务示例、不配置 AI 的能力、账号要求、Embedding 独立配置与图片分析。
- 覆盖剪藏、页面截图存储位置、删除后进入回收站及墓碑同步、WebDAV 按网址对齐避免重复等问题。

---

## LandingCta

首页底部行动区，承接安装扩展和查看 GitHub 的主要操作。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| isEn | boolean | 是 | - | 当前是否为英文模式 |

### Usage

```tsx
<LandingCta isEn={isEn} />
```

### 行为说明

- 复用 `LandingActionButtons`，保证 Hero 与底部 CTA 的下载行为一致。

---

## AIChatSearchDemo

旧 demo 兼容组件，已更新为当前 `GlobalAgentLauncher` 风格的 Agent 展示，用于仍引用 demo 的内部组件。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| bookmarks | Bookmark[] | 是 | - | 用于生成参考卡片的模拟书签 |
| isEn | boolean | 是 | - | 当前是否为英文模式 |
| className | string | 否 | - | 外层样式 |
| onSourceClick | (bookmarkId: string) => void | 否 | - | 参考卡片点击回调 |

### Usage

```tsx
<AIChatSearchDemo bookmarks={bookmarks} isEn={isEn} />
```

### 行为说明

- 展示悬浮 Agent 面板风格：会话标题、过程步骤、参考卡片、建议 chip 和输入区。
- 该组件保留给旧 demo 引用；当前落地页主功能展示使用真实截图。


## LandingPage

客户端首页组合组件；渲染既有功能与截图、四类任务指南、Agent 示例、完整 FAQ。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | SupportedLanguage | 是 | — | 路由确定的 zh/en，初始 HTML 不根据浏览器语言覆盖 |

```tsx
<LandingPage language="en" />
```

主题由 `useWebPreferences(language)` 管理；语言切换导航到独立 URL。

## SiteDocument

两个根布局共用的文档外壳，保持初始 `html lang`、样式与现有 Clarity 脚本一致。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | SupportedLanguage | 是 | — | HTML 文档语言 |
| children | ReactNode | 是 | — | 页面内容 |

```tsx
<SiteDocument language="zh">{children}</SiteDocument>
```

`(legacy)` 保留原有链接；`(localized)/[lang]` 静态生成语言根布局。

## JsonLd

服务端输出 `<script type="application/ld+json">`，只负责渲染；数据由 `app/lib/structured-data.ts` 的纯函数生成。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| data | Record<string, unknown> | 是 | — | 结构化数据对象 |

```tsx
<JsonLd data={buildSoftwareApplicationJsonLd('en')} />
<JsonLd data={buildGuideJsonLd('en', guide)} />
```

- `buildSoftwareApplicationJsonLd(language)`：首页 `SoftwareApplication`，`@id` 按语言区分（`/zh/#software`、`/en/#software`），包含作者、开源许可、免费 `offers`（价格 0）及 GitHub/商店 `sameAs`。
- `buildGuideJsonLd(language, guide)`：指南页 `TechArticle`（标题、描述、语言、更新日期、作者、真实截图、`about` 指向同语言产品节点）与 `BreadcrumbList`。
- `serializeJsonLd` 转义 `<`；不生成评分、评论或安装量。

## LegacyLanguageNotice

旧 `/` 与 `/privacy-policy/` 的英文提示条。兼容页面固定输出中文并 canonical 到 `/zh/`，因此不做自动跳转；水合后若访客偏好英文，显示指向对应英文页面的链接。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 无 props |

```tsx
<SiteDocument language="zh">
  <LegacyLanguageNotice />
  {children}
</SiteDocument>
```

- 状态由 `useLegacyLanguageNotice()` 管理：偏好来自 `resolvePreferredLanguage()`（先读显式切换记录，再读浏览器语言）。
- 首屏 HTML 不渲染提示，避免水合差异；点击链接会记录英文偏好，关闭按钮只在当前页面隐藏。
- 只挂在 `(legacy)` 布局，正式语言页面不显示。

## LandingGuides

四类任务指南的内部链接网格：AI 收藏、语义搜索、工作空间、隐私与同步。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | SupportedLanguage | 是 | — | 文案与链接语言 |

```tsx
<LandingGuides language="zh" />
```

数据来自 `app/lib/guides.ts`，首页与指南页复用同一套链接。

## GuidePage

指南展示组件，组合直接答案、操作步骤、真实截图、使用条件、证据链接与安装按钮。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | SupportedLanguage | 是 | — | 页面语言 |
| guide | LocalizedGuide | 是 | — | 静态指南内容与截图（`GuideCopy` + `slug` + `screenshot`） |

```tsx
<GuidePage language="en" guide={guide} />
```

`generateStaticParams` 生成全部八篇指南；页面保留对应语言的导航、隐私链接与使用文档。路由同时输出 `TechArticle` 与面包屑 JSON-LD，`og:type` 为 `article`。

## AgentExamples

用请求与结果说明可选 Agent 的实际价值：查找收藏、总结网页、检查同步状态。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| isEn | boolean | 是 | — | 示例语言 |

```tsx
<AgentExamples isEn={false} />
```

这是任务示例展示，不执行真实插件操作，不暗示通用自主 Agent。

## HeroScreenshotCarousel

首屏截图轮播，复用 `ExtensionScreenshotFrame`；状态与自动播放由 `useScreenshotCarousel` 管理。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| isEn | boolean | 是 | — | 截图与按钮语言 |
| isDark | boolean | 是 | — | 截图主题 |

```tsx
<HeroScreenshotCarousel isEn={true} isDark={false} />
```

保留四秒自动播放；卸载时清理定时器与 carousel `select` 监听。

## DownloadDropdown

浏览器下载渠道下拉菜单，从原 `Header` 抽取，推荐渠道与下载行为保持一致。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| isEn | boolean | 是 | — | 渠道标签语言 |

```tsx
<DownloadDropdown isEn={true} />
```

复用 `app/lib/download.ts`，无独立渠道地址副本。

## Footer

品牌定位、浏览器标识、对应语言隐私政策与 GitHub 链接。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| isEn | boolean | 是 | — | 定位文案与链接语言 |

```tsx
<Footer isEn={false} />
```

品牌定位来自 `PRODUCT_COPY`，隐私链接使用 `localizedPath`。

## PrivacyPolicyContent

中英文隐私说明页面；标题、描述、正文与更新时间来自 `app/lib/privacy-policy.ts`（`PRIVACY_POLICY_COPY`、`PRIVACY_POLICY_SECTIONS`、`PRIVACY_POLICY_UPDATED_AT`）。正文按扩展实际实现说明数据范围、存储位置（含浏览器同步存储）、权限用途和会接收数据的服务（AI、Embedding、WebDAV、网站图标服务等），修改正文时同步更新日期。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | SupportedLanguage | 否 | zh | 初始语言，由正式语言路由传入 |

```tsx
<PrivacyPolicyContent language="en" />
```

首页链接与语言切换保留对应语言路径，不根据浏览器偏好替换初始文档语言。

## NotFoundContent

全局 404 页面内容，由 `app/global-not-found.tsx` 包在 `SiteDocument language="zh"` 中渲染，并导出为 `404.html`（GitHub Pages 对不存在的路径返回该文件）。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 无 props |

```tsx
<SiteDocument language="zh">
  <NotFoundContent />
</SiteDocument>
```

- 中文为主、附英文说明，提供「返回中文首页」与「Go to English home」两个入口。
- 入口使用带 base path 的普通 `<a>`：404 页拥有独立文档，用客户端 `Link` 跳到其他根布局时页面不会切换。
- 主题通过 `useSystemTheme()` 跟随系统深浅色；页面由 Next 自动输出 `noindex`。
- 两个根布局之外没有共享布局，因此依赖 `next.config.js` 中的 `experimental.globalNotFound`（Next 16.1）；`verify:export` 会检查 `404.html` 的语言、样式、noindex、首页入口与图标，升级 Next 后可据此发现回归。

## Web 语言、SEO 与验证约定

- `useWebPreferences(language)` 返回对象，负责主题切换，并提供 `languageSwitchHref`（另一语言的同一页面）与 `rememberLanguageSwitch`；只有显式切换语言才写入偏好，页面挂载不会覆盖它。显式语言路由优先于历史本地偏好。跟随系统深浅色的逻辑在 `useSystemTheme()`，404 页同样复用。
- `app/lib/site.ts` 统一类别、口号、介绍、作者、语言标签、有效官网地址和内容更新时间；`languageAlternates(path)` 生成 hreflang，`x-default` 指向 canonical 的中文页面（不指向旧 `/`），页面 metadata 与 sitemap 共用。
- `createPageMetadata(language, { path, title, description, type })` 统一 canonical、hreflang、OG 与资源 URL；指南传 `type: 'article'`，隐私页传入专属标题与描述。
- 站点图标统一为 `SITE_ICONS`（16/32/48/128 PNG 与 apple-touch-icon），随部署走 base path，正式页面与 404 页共用。
- 社交分享图 `public/og-image.png`（1200×630）由 `node apps/extension/scripts/generate-og-image.mjs` 生成，文案与 `PRODUCT_COPY` 一致；修改定位时同步更新脚本中的文案并重新生成。
- `sitemap` 只列出正式语言路由；首页与指南的 `lastModified` 用 `CONTENT_UPDATED_AT`，隐私页用 `PRIVACY_POLICY_UPDATED_AT`。
- 保留 `/` 与 `/privacy-policy/` 为兼容入口；目录静态导出用 `trailingSlash: true`。
- 验证：先运行 `pnpm --filter web test`（vitest，覆盖语言路由、hreflang 与结构化数据），再运行 `NEXT_PUBLIC_BASE_PATH=/ham_home pnpm build:web`，然后 `pnpm --filter web verify:export`。该脚本检查 14 个 HTML 页面的语言、canonical 与 hreflang（含 x-default）、页头可抓取的语言切换链接、OG（含分享图文件与尺寸）、首页 `h1`、FAQ 首题与完整性、产品与指南结构化数据、隐私页描述、图标、内部链接和资源，以及 `404.html`、sitemap 与 robots。
