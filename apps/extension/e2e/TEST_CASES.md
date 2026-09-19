# HamHome E2E 核心流程测试用例设计

本文档用于指导 `apps/extension/e2e/tests/*.spec.ts` 的后续落地。优先覆盖用户最常走、最容易回归、并且不依赖真实外部服务的流程。

## 测试分层

| 优先级 | 范围 | 目标 |
| --- | --- | --- |
| P0 | 主应用加载、书签保存、书签列表、基础导入导出、设置持久化 | 每次 PR 都应该稳定运行 |
| P1 | 工作区、Tab 分组规则、隐私设置、批量操作、HTML 导入 | 核心功能扩展面，适合 CI 运行 |
| P2 | AI 真实请求、WebDAV 真实同步、复杂拖拽、多浏览器商店差异 | 需要 mock、专用环境或手动验证辅助 |

## 测试数据策略

1. 每个用例独立启动扩展上下文，测试前清理 `chrome.storage.local`、`chrome.storage.sync` 和相关 IndexedDB。
2. 优先通过统一 helper 预置数据，不在业务 spec 中散写 storage key。建议后续新增：
   - `e2e/helpers/storage.ts`：`resetExtensionData`、`seedBookmarks`、`seedCategories`、`seedWorkspaces`。
   - `e2e/helpers/pages.ts`：`openAppPage`、`openPopupPage`、`openRoute`、`attachScreenshot`。
   - `e2e/helpers/desktop-screenshot.ts`：`attachDesktopScreenshot`，用于必须看到浏览器标签栏的场景。
   - `e2e/e2e.config.ts` + `e2e/helpers/extension-config.ts`：每个测试上下文自动注入 AI/Embedding 基础配置。
   - `e2e/helpers/factories.ts`：`createBookmarkFixture`、`createCategoryFixture`、`createWorkspaceFixture`。
3. AI、WebDAV、Chrome 书签 API、当前窗口 tabs 需要分层处理：
   - P0 只验证 UI 配置保存、失败态和不阻塞主流程。
   - P1 可以 mock 当前窗口 tabs、文件导入、下载。
   - P2 才接真实网络服务或浏览器环境。
4. 选择器优先级：`role` / `label` / 稳定业务文本优先；对于图标按钮、重复卡片、虚拟列表、拖拽区域，建议补少量 `data-testid`。
5. AI/Embedding 默认配置指向本地 OpenAI-compatible mock：
   - `E2E_AI_BASE_URL` / `E2E_AI_API_KEY` / `E2E_AI_MODEL`
   - `E2E_EMBEDDING_BASE_URL` / `E2E_EMBEDDING_API_KEY` / `E2E_EMBEDDING_MODEL`
   - 如某个测试需要空配置，可设置 `E2E_INJECT_AI_CONFIG=0` 或在用例内覆盖 storage。

## 建议 spec 拆分

| 文件 | 覆盖范围 |
| --- | --- |
| `app-shell.spec.ts` | 扩展加载、主导航、hash 路由、空态入口 |
| `popup-save.spec.ts` | popup 保存、更新、删除当前页书签 |
| `bookmark-library.spec.ts` | 书签列表、搜索筛选、编辑、删除、批量操作 |
| `masonry-layout.spec.ts` | 卡片视图瀑布流布局：首屏、滚动、改变列数后都不重叠 |
| `import-export.spec.ts` | JSON/HTML 导入、导出下载、重复数据处理 |
| `settings-privacy.spec.ts` | 设置页、主题/语言、隐私域名、快照开关、清理数据 |
| `workspaces.spec.ts` | 工作区列表、搜索、编辑、页面管理、从工作区保存为书签 |
| `tab-groups.spec.ts` | Tab 分组规则创建、编辑、开关、删除 |
| `tab-auto-group-desktop.spec.ts` | 真实 Tab 自动分组结果和浏览器整窗截图 |
| `ai-sync.spec.ts` | AI 配置失败态、批量 AI 入口、WebDAV 配置和失败态 |

## P0 用例

### APP-001 主应用冒烟

- 前置：无数据。
- 步骤：打开 `app.html`。
- 断言：
  - 能解析合法 `extensionId`。
  - `#root` 可见且非空。
  - 侧边栏品牌 `HamHome` 可见。
  - 首屏无未捕获错误。

现有 `app-page.spec.ts` 已覆盖大部分，可保留为基础冒烟。

### APP-002 空数据首页引导

- 前置：清空所有扩展数据。
- 步骤：打开 `app.html#all`。
- 断言：
  - 书签列表显示空态文案。
  - “导入数据”按钮跳转到 `#import-export`。
  - “WebDAV 同步”按钮跳转到 `#settings?tab=storage`。
  - 侧边栏书签、分类、标签 badge 为 0。

### APP-003 侧边栏导航和直接路由

- 前置：预置少量书签、分类、标签。
- 步骤：
  - 依次点击书签、工作区、Tab 分组、分类、标签、隐私、导入导出、设置、关于。
  - 直接访问 `app.html#settings?tab=storage` 后刷新。
- 断言：
  - URL hash 与当前页面标题同步。
  - 刷新后仍停留在目标页面。
  - `settings?tab=storage` 打开设置页并激活存储 tab。

### CONTENT-001 触发页内保存浮窗并保存书签

- 前置：打开一个可注入 content script 的真实页面，关闭自动保存快照。
- 步骤：
  - 向当前 tab 发送 `START_SAVE_FLOW`（等价于快捷键 / 右键菜单 / Popup 触发）。
  - 等待浮窗展开保存表单，修改标题后保存。
- 断言：
  - 表单读取到当前页面标题。
  - 保存后书签写入存储，浮窗自动关闭。

### CONTENT-002 已收藏页面进入更新态

- 前置：同 CONTENT-001，并已通过页内浮窗保存过该页面。
- 步骤：再次触发 `START_SAVE_FLOW`。
- 断言：
  - 浮窗按钮显示更新语义。
  - 表单回填已保存的标题。

### CONTENT-003 开启弹窗保存后页面内不接管

- 前置：同 CONTENT-001，并把设置 `usePopupSavePanel` 打开。
- 步骤：向当前 tab 发送 `START_SAVE_FLOW`。
- 断言：
  - 回执为 `{ ok: false }`，调用方会回退到 Popup 内的保存表单。
  - 页面内不出现任何保存浮窗（`[data-hamhome-save-flow]`）。

### POPUP-001 保存当前页为新书签

> 说明：保存流程默认在页面内完成，Popup 内的保存表单是页面无法接管时的回退视图；
> 用例通过快捷面板的「保存当前页面」进入该回退视图。

- 前置：
  - 打开一个可控测试页面作为当前活动 tab。
  - 预置一个分类和两个已有标签。
- 步骤：
  - 打开 `popup.html`，点击「保存当前页面」进入保存表单。
  - 修改标题、描述、分类、标签。
  - 点击保存。
  - 打开 `app.html#all`。
- 断言：
  - popup 表单能读取当前页标题和 URL。
  - 保存按钮在标题为空时禁用。
  - 保存成功后列表出现该书签。
  - 分类、标签、描述保存正确。

### POPUP-002 已收藏页面进入更新态

- 前置：预置一个 URL 与当前活动 tab 相同的书签。
- 步骤：
  - 打开 `popup.html`。
  - 修改标题或标签，点击更新。
  - 点击删除，并在确认弹窗中确认。
  - 再次打开主应用列表。
- 断言：
  - 按钮显示更新语义。
  - 不会创建重复 URL 书签。
  - 原书签字段被更新。
  - 删除需要经过面板内的确认弹窗（不再使用浏览器原生 confirm）。

### POPUP-004 快捷面板展示最近保存并可回退到保存表单

- 前置：预置一条书签。
- 步骤：
  - 打开 `popup.html` 停留在快捷面板。
  - 点击「保存当前页面」。
- 断言：
  - 快捷面板展示最近保存的书签。
  - 「保存当前页面」按钮可用。
  - 页面无法接管保存流程时，Popup 回退展示保存表单并读取到当前页标题。

### POPUP-005 开启弹窗保存后直接展示保存表单

- 前置：把设置 `usePopupSavePanel` 打开。
- 步骤：
  - 打开 `popup.html`，不点击「保存当前页面」。
  - 点击保存表单左上角的返回按钮。
- 断言：
  - Popup 打开即进入保存表单，并读取到当前页标题。
  - 返回后回到快捷面板。

### LIB-001 书签列表渲染和视图切换

- 前置：预置 6 条书签，覆盖不同分类、标签、创建时间、快照标记。
- 步骤：
  - 打开 `app.html#all`。
  - 切换宫格和列表视图。
- 断言：
  - 列表能展示全部可见书签。
  - 切换视图后数据不丢失。
  - 有快照的书签显示快照相关操作，无快照的不显示。

### LIB-002 关键词、标签、分类、时间筛选

- 前置：预置不同标题、URL、描述、标签、分类、时间的书签。
- 步骤：
  - 输入关键词。
  - 选择标签筛选。
  - 选择分类筛选。
  - 选择时间筛选。
  - 清除筛选。
- 断言：
  - 每一步结果数量和可见标题符合预期。
  - 筛选 badge/状态栏显示当前条件。
  - 清除后恢复完整列表。

### LIB-003 编辑单个书签

- 前置：预置一个书签和两个分类。
- 步骤：
  - 点击书签编辑。
  - 修改标题、描述、分类、标签。
  - 保存并刷新页面。
- 断言：
  - 弹窗初始值正确。
  - 保存后列表更新。
  - 刷新后仍保留修改。

### LIB-004 删除单个书签

- 前置：预置两个书签。
- 步骤：
  - 删除其中一个书签。
  - 确认删除弹窗。
- 断言：
  - 被删书签从普通列表消失。
  - 另一个书签仍存在。
  - 侧边栏数量同步减少。

### LIB-005 批量打标签、移动分类、删除

- 前置：预置 3 条书签、2 个分类。
- 步骤：
  - 全选当前筛选结果。
  - 批量添加标签。
  - 批量移动分类。
  - 批量删除。
- 断言：
  - 选中数量显示正确。
  - 批量标签和分类写入所有选中项。
  - 删除后选择态清空，列表数量更新。

### LIB-007 瀑布流卡片不重叠

- 前置：预置 60 条书签，描述长度和标签数量刻意做出差异，保证卡片高度各不相同。
- 步骤：
  - 打开 `app.html#all` 进入卡片视图。
  - 首屏渲染完成后采集所有可见卡片的位置。
  - 滚动 2000px 后再次采集。
  - 把窗口缩窄到 900px（列数会变化）后再次采集。
  - 关键词筛选到少量结果后采集，再清空筛选回到完整列表采集。
- 断言：
  - 每个时刻任意两张可见卡片的矩形都不相交（容忍 1px 子像素误差）。
  - 每个时刻滚动视口内都有卡片：滚动后不会空白，筛选前后也不会空白。

### IMPORT-001 JSON 导入

- 前置：清空数据，准备包含 `categories`、`bookmarks`、`workspaces`、`tabGroupRules` 的 JSON fixture。
- 步骤：
  - 打开 `app.html#import-export`。
  - 选择 JSON 文件导入。
  - 回到书签、分类、工作区、Tab 分组页面检查。
- 断言：
  - 显示导入成功。
  - 分类层级正确。
  - 书签数量、标题、标签、分类映射正确。
  - 工作区和 Tab 分组规则被导入。

### IMPORT-002 导出 JSON 和 HTML

- 前置：预置书签、分类、工作区、Tab 分组规则。
- 步骤：
  - 分别点击导出 JSON、导出 HTML。
- 断言：
  - Playwright 捕获下载。
  - JSON 可解析且包含核心数据。
  - HTML 包含 Netscape Bookmark 格式的基础结构和书签链接。

### SETTINGS-001 主题、语言、快照设置持久化

- 前置：无特殊数据。
- 步骤：
  - 打开设置页。
  - 切换语言。
  - 切换深色/浅色/Auto。
  - 切换自动保存快照。
  - 刷新页面。
- 断言：
  - 页面语言、主题 class、开关状态更新。
  - 刷新后配置仍然存在。

### SETTINGS-002 清理数据

- 前置：预置书签、分类、向量或快照可用时预置对应数据。
- 步骤：
  - 打开设置存储 tab。
  - 触发清理书签数据或全部数据。
  - 确认弹窗。
- 断言：
  - 对应数据被清空。
  - 主页面回到空态。
  - 清理按钮的 loading/禁用态正确。

## P1 用例

### PRIVACY-001 隐私域名增删

- 前置：无数据。
- 步骤：
  - 打开 `app.html#privacy`。
  - 输入 `example.com` 并添加。
  - 重复添加一次。
  - 删除该域名。
- 断言：
  - 域名会小写并展示。
  - 重复添加不会产生重复项。
  - 删除后列表消失。

### CATE-001 分类创建、编辑、删除

- 前置：预置一个根分类。
- 步骤：
  - 新建子分类。
  - 编辑名称或图标。
  - 展开/收起分类树。
  - 删除分类。
- 断言：
  - 层级关系正确。
  - 书签数量统计正确。
  - 删除确认后分类消失，关联书签变为未分类或符合当前业务规则。

### CATE-002 预设分类导入

- 前置：清空分类。
- 步骤：打开分类页，选择通用或专业预设并导入。
- 断言：
  - 分类树按预设生成。
  - 重复导入不会创建同层级同名重复分类。

### WORKSPACE-001 工作区列表、搜索、编辑、删除

- 前置：预置两个工作区、一个工作区分类、多条页面。
- 步骤：
  - 打开 `app.html#workspaces`。
  - 搜索工作区名称、页面标题、域名、标签。
  - 编辑工作区名称、描述、分类、标签。
  - 删除一个工作区。
- 断言：
  - 搜索结果准确。
  - 编辑后刷新仍保留。
  - 删除后列表和存储同步更新。

### WORKSPACE-002 工作区页面管理

- 前置：预置一个包含多页面的工作区。
- 步骤：
  - 编辑工作区内页面标题和 URL。
  - 删除工作区内页面。
  - 将页面保存为普通书签。
- 断言：
  - 页面编辑结果持久化。
  - 删除只影响当前工作区页面。
  - 保存为书签后 `#all` 中出现该页面。

### WORKSPACE-003 保存当前窗口

- 前置：打开多个可控测试 tab。
- 步骤：
  - 打开工作区页。
  - 点击保存当前窗口。
  - 编辑工作区信息并保存。
- 断言：
  - 预览列出当前窗口页面。
  - 保存后工作区出现。
  - 默认去重逻辑生效。

### TABGROUP-001 创建 Tab 分组规则

- 前置：清空 Tab 分组规则。
- 步骤：
  - 打开 `app.html#tab-groups`。
  - 点击新建规则。
  - 填写规则名称、分组标题、颜色、匹配条件、pattern。
  - 保存。
- 断言：
  - 必填字段为空时无法保存且显示错误。
  - 保存后规则组出现在列表。
  - 刷新后规则仍存在。

### TABGROUP-002 编辑、开关、删除规则

- 前置：预置一个包含两个 matcher 的规则组。
- 步骤：
  - 关闭规则组开关。
  - 编辑规则组，新增或删除 matcher。
  - 删除规则组。
- 断言：
  - 开关状态持久化到所有子规则。
  - matcher 变更正确。
  - 删除后列表为空或不再显示目标规则。

### TABGROUP-003 自动分组整窗截图

- 前置：
  - 本地以 `HEADED=1 E2E_DESKTOP_SCREENSHOT=1` 运行。
  - 如需截图失败时判红，额外设置 `E2E_DESKTOP_SCREENSHOT_REQUIRED=1`。
  - 预置一条 `urlContains` 规则，分组标题为固定测试值。
- 步骤：
  - 打开一个 URL 命中规则的新 tab。
  - 等待 `chrome.tabGroups.query` 返回目标分组。
  - 将命中页面带到前台。
  - 调用 `attachDesktopScreenshot` 截取浏览器整窗。
- 断言：
  - 目标 tab 被加入原生 Chrome Tab Group。
  - 分组标题、颜色、折叠状态与规则一致。
  - HTML 报告中附加包含标签栏、地址栏和分组结果的整窗截图；若当前 macOS 会话无截图权限，则附加诊断说明。

### HTMLIMPORT-001 HTML 导入保留目录

- 前置：准备 Netscape Bookmark HTML fixture，包含嵌套文件夹和重复链接。
- 步骤：
  - 打开导入导出页。
  - 勾选保留目录。
  - 导入 HTML。
- 断言：
  - 文件夹映射为分类层级。
  - 重复链接被跳过。
  - 进度和结果详情显示正确。

### HTMLIMPORT-002 HTML 导入取消和恢复

- 前置：准备较大的 HTML fixture。
- 步骤：
  - 开始导入。
  - 中途取消。
  - 刷新页面。
- 断言：
  - 取消后任务状态明确。
  - 刷新后不会误恢复已取消任务。
  - 已导入数据状态符合当前业务策略。

## P2 用例

### AI-001 未配置 AI 时的建议入口

- 前置：清空 AI 配置。
- 步骤：
  - 打开 popup 或书签编辑入口。
  - 点击获取 AI 建议。
- 断言：
  - 显示可理解的配置提示。
  - 点击配置跳转到 `app.html#settings`。
  - 不影响手动保存书签。

### AI-002 AI 配置连接失败态

- 前置：设置一个不可访问的 `baseUrl` 或通过路由 mock 返回失败。
- 步骤：
  - 打开设置 AI tab。
  - 点击测试连接。
- 断言：
  - loading 态和失败结果正确。
  - API key 不以明文出现在报告截图之外的日志中。

### AI-003 批量 AI 整理进度

- 前置：预置多条书签，并 mock 后台 AI 任务状态。
- 步骤：
  - 选择多条书签。
  - 点击批量 AI 整理。
- 断言：
  - 进度条显示 processed/total/success/failed。
  - 任务完成后结果 toast 符合预期。

### SYNC-001 WebDAV 配置保存和失败态

- 前置：无真实 WebDAV 服务。
- 步骤：
  - 打开设置存储 tab。
  - 填写 WebDAV URL、用户名、密码。
  - 启用同步并触发同步。
- 断言：
  - 配置保存后刷新仍存在。
  - 不可达服务显示失败态。
  - 侧边栏同步状态展示错误或未配置状态。

### SYNC-002 真实 WebDAV 同步

- 前置：提供隔离 WebDAV 测试服务和测试账号。
- 步骤：
  - 端 A 上传本地数据。
  - 清空本地后从远端恢复。
- 断言：
  - 书签、分类、工作区、Tab 规则恢复一致。
  - 冲突处理符合 `sync-engine` 约定。

### WORKSPACE-004 通过确认弹窗删除工作空间

- 前置：预置 1 个工作空间。
- 步骤：
  - 打开 `app.html#workspaces`。
  - 点击工作空间卡片上的删除按钮，并在确认弹窗中确认。
- 断言：
  - 删除需要经过面板内的确认弹窗（不再使用浏览器原生 confirm）。
  - 确认后列表与存储中的工作空间均被清空。

### DND-001 工作区拖拽排序

- 前置：预置多个工作区和页面。
- 步骤：
  - 拖拽工作区排序。
  - 拖拽页面在同一工作区内排序。
  - 拖拽页面到另一个工作区。
- 断言：
  - UI 顺序即时更新。
  - 刷新后顺序保持。
  - 重复 URL 拖入目标工作区时显示已存在提示。

## 变体覆盖

核心用例不再单独维护英文版或暗色版 spec，而是在 Playwright project 层复跑同一套
`tests/*.spec.ts`：

- `chromium-extension`：默认中文 / 系统主题。
- `chromium-extension-english`：写入 `settings.language = "en"` 和 `theme = "light"`。
- `chromium-extension-dark`：写入 `settings.language = "zh"` 和 `theme = "dark"`。

断言要求：

- 语言相关定位使用 `e2eVariant.text(zh, en)` 或中英兼容的 `role` / `label` / 文本正则。
- 暗色 project 必须断言 `html.dark` 生效。
- 所有核心流程的关键节点截图在三个 project 中都会附加到 HTML 报告。

## 推荐落地顺序

1. 先补 `helpers/storage.ts` 和 `helpers/factories.ts`，让所有用例可独立、可重复。
2. 实现 P0：`app-shell.spec.ts`、`bookmark-library.spec.ts`、`popup-save.spec.ts`、`import-export.spec.ts`、`settings-privacy.spec.ts`。
3. 再实现 P1：工作区、Tab 分组、HTML 导入、隐私域名和分类管理。
4. 最后实现 P2：AI、WebDAV、复杂拖拽、真实浏览器差异。

## CI 建议

- PR 必跑 P0，失败保留截图、trace 和 video。
- main 分支或 nightly 跑 P0 + P1。
- P2 使用手动触发或带环境变量的专用 job，例如 `E2E_REAL_WEBDAV=1`、`E2E_REAL_AI=1`。
- 外部服务、网络和账号相关失败不应阻塞普通 PR，除非该 PR 明确修改同步或 AI 能力。
