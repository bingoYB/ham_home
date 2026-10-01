# HamHome Web - 组件文档

本文档记录 `apps/web` 产品落地页当前使用的页面组件。组件内容以扩展实际能力为准，截图统一来自插件自动截图输出并复制到 `apps/web/public/screenshots/extension/`。

## 目录结构

```text
app/components/
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

首页页面组件，组合导航、Hero、真实截图功能展示、能力网格、隐私说明、FAQ、底部 CTA 和页脚。

### Props

| name | type | required | default | description |
|------|------|----------|---------|-------------|
| - | - | - | - | 无 props |

### Usage

```tsx
<HomePage />
```

### 行为说明

- 使用 `useWebPreferences()` 管理语言与主题。
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
| onToggleLanguage | () => void | 是 | - | 切换语言回调 |

### Usage

```tsx
<Header
  isDark={isDark}
  isEn={isEn}
  onToggleTheme={toggleTheme}
  onToggleLanguage={toggleLanguage}
/>
```

### 行为说明

- 下载菜单通过 `getDownloadChannels()` 和 `getRecommendedDownloadChannel()` 自动推荐当前浏览器渠道。
- 副标题与落地页定位一致：AI 浏览器工作台。

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
- 能力标签为 2×2 网格：文字与图片剪藏、Agent 帮你用插件、工作空间与 Tab 分组、隐私边界可控。
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
- 文案强调 HamHome 围绕真实浏览流程工作。

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

- 使用分类按钮切换 FAQ 类别。
- 问答内容已对齐当前扩展实现，不再声明未实现的 WebDAV 加密同步能力。
- AI FAQ 描述新版 Agent UI、支持的 Provider 范围和图片剪藏 AI 分析。
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
