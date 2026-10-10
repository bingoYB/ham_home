# Extension 组件文档

## SavePanel

保存当前页面为 HamHome 书签的弹出面板，负责书签表单、AI 推荐入口和页面快照/Obsidian 保存开关。

### SavePanelView

保存面板展示组件。业务状态由 `useSavePanel` 注入，组件只负责渲染表单、快照开关和操作按钮。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| title | `string` | ✓ | - | 书签标题 |
| description | `string` | ✓ | - | 书签摘要 |
| categoryId | `string \| null` | ✓ | - | 当前分类 ID |
| tags | `string[]` | ✓ | - | 当前标签列表 |
| categories | `LocalCategory[]` | ✓ | - | 可选分类列表 |
| allTags | `string[]` | ✓ | - | 标签建议列表 |
| existingBookmark | `LocalBookmark \| null` | ✓ | - | 当前 URL 已存在的书签 |
| aiRecommendedCategory | `string \| null` | ✓ | - | AI 推荐但未创建的分类 |
| aiStatus | `AIStatusType` | ✓ | - | AI 推荐状态 |
| aiError | `string \| null` | ✓ | - | AI 错误信息 |
| saving | `boolean` | ✓ | - | 是否正在保存 |
| saveSnapshot | `boolean` | ✓ | - | 本次保存是否保存快照 |
| snapshotStatus | `SavePanelSnapshotStatus` | ✓ | - | 书签与快照保存状态 |
| snapshotError | `string \| null` | ✓ | - | 快照保存错误信息 |
| syncToObsidian | `boolean` | ✓ | - | 本次保存快照后是否将书签笔记发送到 Obsidian |
| obsidianStatus | `SavePanelObsidianStatus` | ✓ | - | Obsidian 同步状态 |
| obsidianError | `string \| null` | ✓ | - | Obsidian 同步错误信息 |
| actionError | `SavePanelActionError \| null` | ✓ | - | 保存/删除失败信息，展示在面板内 |
| onTitleChange | `(value: string) => void` | ✓ | - | 标题变更回调 |
| onDescriptionChange | `(value: string) => void` | ✓ | - | 摘要变更回调 |
| onCategoryChange | `(value: string \| null) => void` | ✓ | - | 分类变更回调 |
| onTagsChange | `(value: string[]) => void` | ✓ | - | 标签变更回调 |
| onSaveSnapshotChange | `(value: boolean) => void` | ✓ | - | 快照开关变更回调 |
| onSyncToObsidianChange | `(value: boolean) => void` | ✓ | - | Obsidian 同步开关变更回调 |
| onLoadSuggestions | `() => void` | ✓ | - | 触发 AI 推荐 |
| onApplyAICategory | `() => void` | ✓ | - | 应用 AI 推荐分类 |
| onRetry | `() => void` | ✓ | - | 重试 AI 推荐 |
| onConfigureAI | `() => void` | - | - | 打开 AI 设置 |
| onSave | `() => void` | ✓ | - | 保存书签 |
| onCancel | `() => void` | - | - | 取消保存 |
| onDelete | `() => void` | - | - | 删除现有书签 |
| portalContainer | `HTMLElement` | - | - | Popover portal 容器，在 shadow root（页内浮窗）中渲染时必传 |

**用法示例：**

```tsx
<SavePanelView
  title={title}
  description={description}
  categoryId={categoryId}
  tags={tags}
  categories={categories}
  allTags={allTags}
  existingBookmark={existingBookmark}
  aiRecommendedCategory={aiRecommendedCategory}
  aiStatus={aiStatus}
  aiError={aiError}
  saving={saving}
  saveSnapshot={saveSnapshot}
  snapshotStatus={snapshotStatus}
  snapshotError={snapshotError}
  syncToObsidian={syncToObsidian}
  obsidianStatus={obsidianStatus}
  obsidianError={obsidianError}
  onTitleChange={setTitle}
  onDescriptionChange={setDescription}
  onCategoryChange={setCategoryId}
  onTagsChange={setTags}
  onSaveSnapshotChange={setSaveSnapshot}
  onSyncToObsidianChange={setSyncToObsidian}
  onLoadSuggestions={runAIAnalysis}
  onApplyAICategory={applyAIRecommendedCategory}
  onRetry={retryAnalysis}
  onSave={save}
/>
```

**行为说明：**

- 剪藏（图片 / 选中文字）的 AI 分析主体是剪藏内容本身，不是来源页：图片以多模态附件形式发送给模型，由模型描述画面并给出分类与标签；选中文字以选段为主体，只产出分类与标签。整页书签仍走原有的页面分析提示词，三者的提示词相互独立。
- 图片剪藏不做文本降级：模型不支持图片输入、图片下载失败或体积超限时，面板直接在 `AIStatus` 上展示可操作的错误提示，并提供重试入口。
- 图片剪藏的标题由模型对图片的描述填充，可在保存前手动修改。
- 隐私页面（命中隐私域名或自动检测为隐私）不会触发任何剪藏 AI 分析；图片剪藏另受设置页「图片剪藏 AI 分析」开关控制。
- `saveSnapshot` 初始值跟随设置页的默认保存快照策略。
- 保存面板内调整快照开关只影响本次保存，不反写设置页默认值。
- 快照类型由系统自动决定：可阅读页面优先保存 Markdown，其他页面保存完整 HTML。
- 勾选 `保存快照` 后，面板会显示 `保存后同步到 Obsidian` 开关。
- Obsidian 保存与本地快照格式解耦，使用书签正文生成 Markdown 笔记；本地快照可自动保存为 Markdown 或 HTML。
- Obsidian 保存使用 `obsidian://new` 协议，优先通过剪贴板传递笔记内容，剪贴板失败时回退到 URI 内容参数。
- 快照保存失败不会回滚已保存书签，面板会保留错误状态，用户可稍后通过书签管理页重试。
- 删除书签走面板内的 `ConfirmDialog` 确认，保存/删除失败在按钮上方以内联错误提示展示，不再使用浏览器原生 `confirm` / `alert`（页面可重写这两个方法，且在页内浮窗中体验割裂）。
- 在 shadow root 中渲染时，确认弹窗同样通过 `portalContainer` 指定 portal 容器。

### InPageSaveFlow

页内保存浮窗。触发保存后先在页面右下角展示分析中的轻量浮窗，AI 分析完成后原地展开保存表单，整个过程不依赖 Popup，用户可以继续操作页面。

只在 content script 中使用，无 props，状态由 `useInPageSave` 管理。

**行为说明：**

- 触发来源：快捷键 `save-bookmark`、右键菜单「收藏到 HamHome」、Popup 的「保存当前页面」，统一通过 `START_SAVE_FLOW` 消息进入。
- 设置 `settings.usePopupSavePanel` 打开时不再挂载浮窗，content script 对 `START_SAVE_FLOW` 回执 `{ ok: false }`，保存流程回退到 `PopupSaveView`。
- 分析阶段保存表单已挂载但隐藏，分析完成后直接展示结果，避免二次等待；分析较慢时可点「直接编辑」立即展开表单。
- 浏览器内部页、隐私页面等无法保存时展示提示浮窗并自动消失。
- 保存成功后展示成功提示并自动关闭；Esc 可随时关闭浮窗。
- 面板渲染在 shadow root 内，分类下拉等 Popover 需通过 `portalContainer` 指定 portal 容器。
- While the overlay is open, `useTabBusySignal` marks the tab as busy (renewed every 7.5 minutes), so auto archive and making room never close it mid-save.
- Unless a clip (selection / image) is being saved, the header shows a **Read later** button (`ReadLaterInsteadButton`). It closes the overlay and sends `HAMHOME_READ_LATER_THIS_TAB`; the background queues the tab, closes it as configured and shows the usual undo toast.

### PopupSaveView

Popup 内的保存表单。两种情况下使用：用户在设置中打开「在扩展弹窗中保存」（`settings.usePopupSavePanel`），或当前页面无法注入 content script（浏览器内部页、应用商店、PDF 阅读器等）。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| onBack | `() => void` | ✓ | - | 返回快捷面板 |

**行为说明：**

- `settings.usePopupSavePanel` 打开时，点击扩展图标的 Popup 直接进入保存表单，点返回仍可回到 `QuickPanel`。

## QuickPanel

Popup 快捷面板，扩展图标点击后的默认视图。保存书签的 AI 分析与表单已移到页面内，Popup 只保留快捷开关与入口。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| onFallbackToSaveView | `() => void` | ✓ | - | 页内保存不可用时切换到 Popup 内保存表单 |

**行为说明：**

- 「保存当前页面」向当前 tab 发送 `START_SAVE_FLOW`，收到回执后关闭 Popup；没有回执则回退到 `PopupSaveView`。
- `settings.usePopupSavePanel` 打开时跳过消息发送，直接切换到 `PopupSaveView`，按钮下方的说明文案同步切换。
- 提供打开书签面板、保存当前窗口为工作空间、管理书签、设置四个快捷入口，并展示最近保存的 5 条书签。
- 常用设置区可直接切换「默认保存快照」「地址栏搜索增强」，改动实时写入设置。
- 面板高度收口在浏览器给 Popup 的上限（600px）：底部状态栏固定，上方内容整体滚动，内容不够高时面板仍按内容收窄。
- 内容滚动区用原生滚动容器加 `scrollbar-slim`，没有用 `ScrollArea`：`ScrollArea` 的 viewport 靠 `height: 100%` 撑开，在 `max-height` 收口的弹性盒里百分比会按收口前的内容高度计算，viewport 会比容器更高并把底栏顶出可视区。

**Tab lifecycle additions:**

- Quick actions are: save current page, **Read later & close** (`readLaterTab`, shortcut `read-later-close`), save window as workspace, open HamHome; settings moved to the header icon.
- `PopupTabsCard` shows budget usage, stale / duplicate tabs, today's automatic archiving (view / restore all) and pending confirmations; "Tidy up" expands `PopupTriagePanel` in place (most idle first, with read later / bookmark / archive buttons per tab).
- `PopupRecentSection` switches between recent saves and the Read later queue (unread items, newest first); opening a queue item calls `readLaterOpen`, which marks it as reading.
- Recent saves only list library bookmarks; queue-only read later items stay out.

## BookmarkSubjectDialog / ImageClipMetadata

“我的收藏”中图片剪藏和选中文字剪藏的主体详情弹窗。图片详情通过 `ImageClipMetadata` 在原图下方展示 AI 提取的主色板，以及原图尺寸、文件大小和格式。

### BookmarkSubjectDialog Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmark | `LocalBookmark \| null` | ✓ | - | 当前收藏对应的书签信息 |
| subject | `BookmarkClipSubject \| null` | ✓ | - | 图片或文字剪藏主体，图片主体可包含 `imageMetadata` |
| open | `boolean` | ✓ | - | 是否打开弹窗 |
| onOpenChange | `(open: boolean) => void` | ✓ | - | 弹窗开关回调 |

### ImageClipMetadata Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| metadata | `ImageClipMetadata` | - | `undefined` | 主色、宽高、原图字节数、格式和 MIME；没有可展示字段时不渲染 |

**用法示例：**

```tsx
<BookmarkSubjectDialog
  bookmark={bookmark}
  subject={clipSubject}
  open={open}
  onOpenChange={setOpen}
/>
```

**行为说明：**

- 图片主色限制为 1–8 个 `#RRGGBB` 值，并按视觉占比从高到低显示在原图正下方。
- 技术信息读取原始图片的尺寸、字节大小与格式，不使用发送给 AI 的压缩副本。
- 历史剪藏没有新增字段时保持兼容，只隐藏缺失的信息项。

## BookmarkHealthPage

普通书签收藏的健康检查页面，展示链接状态、重复项、统计和修复入口。图片剪藏与选中文字剪藏属于内容收藏，不进入健康中心。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 页面通过 `BookmarkContext`、`bookmarkClipStorage` 和后台服务自行加载数据 |

**用法示例：**

```tsx
<BookmarkHealthPage />
```

**行为说明：**

- 页面根据 `BookmarkClipSubjectIndex` 排除图片剪藏和选中文字剪藏，统计、筛选、搜索与进度只计算普通书签收藏。
- 全量、单条和定期扫描均在 `BookmarkHealthService` 再次执行同一范围过滤，内容收藏不会发起健康检查请求。
- 普通书签的失效链接、跳转、访问异常与重复 URL 仍按既有规则检查；历史内容收藏健康记录会在扫描时清理。
- 重复项由 `useDuplicateBookmarks` 从当前书签列表实时计算，未体检也能进入「重复书签」筛选；每组标记最早收藏的一条为「保留」，其余为「重复」。
- 支持勾选后批量删除，以及「清理重复项」一键删除每组的非保留项；两者都是软删除（进回收站）并刷新 `updatedAt`，删除结果会通过 WebDAV 同步到其他设备。
- 列表用 `useScrollAreaVirtualList` 虚拟化：上千条书签时全量渲染会把页面切换卡住（每行都带 Checkbox、状态徽章和操作按钮），现在只渲染视口附近的行。整页共用一个滚动容器，统计卡片、筛选栏仍跟随列表一起滚动。

## TrashPage

书签回收站页面，列出已删除书签、剩余保留天数，支持恢复、彻底删除与清空。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 页面通过 `BookmarkContext` 与 `bookmarkStorage` 自行加载已删除书签 |

**用法示例：**

```tsx
<TrashPage />
```

**行为说明：**

- 删除书签是软删除，先进回收站保留 30 天，期间可随时恢复；到期由后台 `bookmarkRetentionService` 自动彻底删除。
- 彻底删除会清空正文、快照、截图、剪藏、体检记录与向量，只留下 `{ id, deletedAt }` 墓碑，删除结果经 WebDAV 同步到其他设备；墓碑满 90 天后清理。
- 剩余 3 天内的条目用醒目样式提示，避免用户错过恢复窗口。

## BatchSelectionToolbar

批量选择工具栏，左侧全选与已选数量，右侧由调用方以 children 传入批量操作按钮。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| visibleIds | `string[]` | 是 | - | 当前可见列表的全部 ID，全选只作用于可见项 |
| selectedCount | `number` | 是 | - | 已选数量 |
| onToggleSelectAll | `(ids: string[]) => void` | 是 | - | 切换全选 |
| children | `ReactNode` | 否 | - | 右侧批量操作按钮 |

**用法示例：**

```tsx
<BatchSelectionToolbar
  visibleIds={visibleIds}
  selectedCount={selectedIds.size}
  onToggleSelectAll={toggleSelectAll}
>
  <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
    批量删除
  </Button>
</BatchSelectionToolbar>
```

## WorkspacesPage

工作空间管理页面，用于保存所有浏览器窗口（当前会话）、搜索筛选已保存工作空间、按分组网格查看已保存页面，并在右侧按窗口分组查看当前所有打开的 Tabs。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 页面组件通过 `workspaceStorage`、`workspaceService` 和 `BookmarkContext` 自行加载工作空间、分类和标签数据 |

**用法示例：**

```tsx
<WorkspacesPage />
```

**行为说明：**

- 页面采用左侧工作空间内容流 + 右侧当前 Tabs 侧栏结构。
- 左侧每个工作空间以保存时间作为分组头，页面以紧凑卡片网格展示。
- 点击分组或卡片会选中工作空间，选中后在分组内展示选择、恢复、智能分析和转书签工具。
- 右侧 Tabs 侧栏通过 `workspaceService.previewCurrentWindow(true)` 读取所有窗口可保存页面，并支持按窗口分组展示、刷新、标题排序和保存所有窗口。
- 工作空间使用 `local:workspaces` 持久化，包含名称、描述、分类、标签、页面标题/URL/域名/Cravatar 图标、恢复状态和后续 AI 分析预留字段。
- 工作空间分类使用独立的 `local:workspaceCategories` 持久化，不复用书签分类；转书签弹窗仍使用书签分类。
- 分组头部提供编辑入口，可修改工作空间名称、描述、独立分类和标签。
- 恢复页面数量超过阈值时会先弹出确认，恢复成功后更新 `restoredAt` 和 `isRestored`；若工作空间保存了浏览器原生 Tab Groups，会在恢复时重建分组，并短暂跳过插件自动分组规则，避免规则分组覆盖工作空间分组。
- 转书签前会弹出确认框，允许统一设置分类和标签；已存在 URL 会标记并跳过。
- AI 命令推荐只会更新候选页面选择，不会直接写入书签，仍需用户在确认框中提交。
- 保存弹窗会提示重复 URL，默认去重保存；用户也可以选择保留全部页面。
- 工作空间保存和分析完成后，会关闭本次保存预览中的浏览器 Tab；重复 URL 即使被去重未写入工作空间，也会一并关闭。
- With the tab budget on, restoring a workspace that would go over the budget first asks (`useWorkspaceBudgetSwitch` + `WorkspaceBudgetSwitchDialog`, passed to `useWorkspacesPage` as `beforeRestore`): save the current window as a workspace and switch, restore anyway, or cancel.
- Restored tabs are marked as bulk-opened before they are created, so they trigger no budget nudge or making room for 2 minutes.

## TabGroupsPage

浏览器 Tab 分组规则管理页面，用于创建、编辑、启停和删除自动 Tab 分组规则，并控制 AI 自动分组、按域名自动分组开关与自定义分类要求。页面通过 `useTabGroupRules` 读取 `sync:tabGroupRules` 和 `sync:tabGroupAutoGroupSettings`，按分组配置聚合展示已保存规则，并通过弹窗维护规则条件；后台监听新建/更新 Tab 后执行同一套匹配规则。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 页面组件自行组合规则弹窗和规则列表，不接收外部 props |

**用法示例：**

```tsx
<TabGroupsPage />
```

**行为说明：**

- 规则匹配对象支持域名部分、URL、页面标题和页面标题忽略大小写。
- 匹配条件支持包含、完全相等、前缀为、后缀为和正则匹配。
- 同一分组可以配置多条匹配条件，底层仍按多条 `TabGroupRule` 保存以兼容已有数据。
- 规则保存到 `sync:tabGroupRules`，会跟随浏览器账号同步。
- AI 自动分组开关、按域名自动分组开关和自定义分类要求保存到 `sync:tabGroupAutoGroupSettings`，默认关闭且要求为空。
- AI 自动分组设置包含 `updatedAt`，WebDAV 同步会按更新时间合并，避免旧远端配置覆盖本地刚修改的开关或要求。
- AI 自动分组与按域名自动分组互斥，开启其中一个策略时不能同时开启另一个策略。
- 按域名自动分组仅在未命中自定义规则时生效，会按主域名归入同名分组，例如 `www.baidu.com` 归为 `baidu`，新分组颜色随机。
- AI 自动分组结果按域名和当前自定义分类要求缓存在 `local:tabGroupAIGroupCache`，同一域名再次打开且要求未变时优先复用历史分组，避免重复调用 AI。
- Chromium 浏览器命中规则后使用 `chrome.tabs.group` 分组，并用 `chrome.tabGroups.update` 设置组名、颜色和折叠状态。
- 已存在同名分组时，新 Tab 会加入同名分组；不存在时会创建新的浏览器原生分组。
- AI 自动分组开启时，后台先执行规则匹配；未命中且页面加载完成后，读取 URL、标题和页面描述，并把自定义分类要求作为基础判断逻辑传给 AI，调用已配置的 AI 服务选择已有分组或返回新分组名。
- 当前浏览器不支持 `chrome.tabGroups` 时页面仍允许编辑规则，但会展示不支持提示，后台不会执行分组。

### TabAutoGroupSettingsCard

Tab 自动分组策略设置卡片，用于展示 AI 自动分组、按域名自动分组和 AI 自定义分类要求。组件只接收状态和事件回调，不直接访问存储层。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| supported | `boolean` | ✓ | - | 当前浏览器是否支持 `chrome.tabGroups` |
| aiAutoGroupEnabled | `boolean` | ✓ | - | AI 自动分组是否开启 |
| aiAutoGroupInstructions | `string` | ✓ | - | AI 自动分组自定义分类要求 |
| domainAutoGroupEnabled | `boolean` | ✓ | - | 按域名自动分组是否开启 |
| onAiAutoGroupEnabledChange | `(enabled: boolean) => void` | ✓ | - | AI 自动分组开关变化回调 |
| onDomainAutoGroupEnabledChange | `(enabled: boolean) => void` | ✓ | - | 按域名自动分组开关变化回调 |
| onAiAutoGroupInstructionsChange | `(instructions: string) => void` | ✓ | - | 自定义分类要求输入变化回调 |
| onAiAutoGroupInstructionsSave | `() => void` | ✓ | - | 自定义分类要求失焦保存回调 |

**用法示例：**

```tsx
<TabAutoGroupSettingsCard
  supported={state.supported}
  aiAutoGroupEnabled={state.aiAutoGroupEnabled}
  aiAutoGroupInstructions={state.aiAutoGroupInstructions}
  domainAutoGroupEnabled={state.domainAutoGroupEnabled}
  onAiAutoGroupEnabledChange={state.updateAiAutoGroupEnabled}
  onDomainAutoGroupEnabledChange={state.updateDomainAutoGroupEnabled}
  onAiAutoGroupInstructionsChange={state.updateAiAutoGroupInstructions}
  onAiAutoGroupInstructionsSave={state.saveAiAutoGroupInstructions}
/>
```

**行为说明：**

- AI 自动分组开启时禁用按域名自动分组开关。
- 按域名自动分组开启时禁用 AI 自动分组开关和 AI 自定义分类要求输入。
- 不支持 `chrome.tabGroups` 时所有自动分组策略控件都会禁用。

### TabGroupRuleForm

Tab 分组规则弹窗表单组件，负责渲染规则名称、目标分组名称、颜色、多条匹配对象与匹配条件、折叠和启用状态输入。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| form | `TabGroupRuleFormState` | ✓ | - | 当前弹窗表单状态，包含 `matchers` 条件列表，每条条件包含 `matchType`、`matchCondition` 和 `pattern` |
| editing | `boolean` | ✓ | - | 是否处于编辑已有规则分组状态 |
| saving | `boolean` | ✓ | - | 保存按钮 loading/disabled 状态 |
| onChange | `(form: TabGroupRuleFormState) => void` | ✓ | - | 表单字段变更回调 |
| onSave | `() => void \| Promise<void>` | ✓ | - | 保存或创建规则 |
| onCancel | `() => void` | ✓ | - | 关闭弹窗并重置表单 |

**用法示例：**

```tsx
<TabGroupRuleForm
  form={form}
  editing={editingGroupKey != null}
  saving={saving}
  onChange={setForm}
  onSave={saveRule}
  onCancel={resetForm}
/>
```

**行为说明：**

- 组件不直接访问存储层，字段校验和保存由 `useTabGroupRules` 处理。
- 新建规则默认启用，默认颜色为 `blue`，默认不折叠目标分组。
- 匹配对象下拉项包含域名部分、URL、页面标题和页面标题(忽略大小写)，不展示旧版正则对象。
- 匹配条件下拉项包含包含、完全相等、前缀为、后缀为和正则匹配。
- 点击加号会在当前条件后新增一条匹配条件；点击减号删除该条件，至少保留一条条件。
- **Protect tabs in this group** (`form.protectTabs`, saved as `TabGroupRule.protectTabs`): while the rule is enabled, tabs in a group with this rule's title (trimmed, case-insensitive) count as protected, so auto archive and making room never close them, even with the global "protect grouped tabs" switch off.

### TabGroupRuleList

Tab 分组规则列表组件，按规则名称、目标分组、颜色和折叠状态聚合展示已保存规则，展示匹配方式、匹配内容和目标分组，并提供启停、编辑、删除操作入口。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| groups | `TabGroupRuleGroup[]` | ✓ | - | 已聚合的规则分组列表 |
| loading | `boolean` | ✓ | - | 是否正在加载规则 |
| onEdit | `(group: TabGroupRuleGroup) => void` | ✓ | - | 编辑规则分组回调 |
| onDelete | `(group: TabGroupRuleGroup) => void` | ✓ | - | 删除规则分组回调 |
| onToggle | `(group: TabGroupRuleGroup) => void` | ✓ | - | 启用/停用规则分组回调 |

**用法示例：**

```tsx
<TabGroupRuleList
  groups={groups}
  loading={loading}
  onEdit={editRuleGroup}
  onDelete={deleteRuleGroup}
  onToggle={toggleRuleGroup}
/>
```

**行为说明：**

- 空列表时显示空状态，引导用户创建第一条规则。
- 每个分组面板显示该分组下的所有匹配条件，启停操作会同步更新该分组下的全部底层规则。
- 列表组件只触发上层回调，不直接修改规则存储。
- Rule groups with `protectTabs` show a "Protected" badge next to their title.

### WorkspacePageDialogs

工作空间页面弹窗组合组件，集中挂载保存、编辑和转书签弹窗，降低 `WorkspacesPage` 的组合复杂度。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| state | `ReturnType<typeof useWorkspacesPage>` | ✓ | - | 工作空间页面 hook 状态和操作集合 |
| bookmarkCategories | `LocalCategory[]` | ✓ | - | 书签分类列表，仅传给转书签弹窗 |
| bookmarkTags | `string[]` | ✓ | - | 书签标签列表，仅传给转书签弹窗 |

**用法示例：**

```tsx
<WorkspacePageDialogs
  state={state}
  bookmarkCategories={bookmarkCategories}
  bookmarkTags={bookmarkTags}
/>
```

**行为说明：**

- 保存和编辑弹窗使用 `state.workspaceCategories`，不读取 `bookmarkCategories`。
- 转书签弹窗使用 `bookmarkCategories`，因为转书签目标仍是书签系统。

### WorkspaceSection

工作空间展示组件，负责渲染单个工作空间的分组头和页面卡片网格。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| workspace | `Workspace` | ✓ | - | 当前工作空间 |
| pages | `WorkspaceTabPage[]` | ✓ | - | 当前要展示的页面列表 |
| categoryName | `string` | ✓ | - | 展示用分类名称 |
| onEdit | `(workspace: Workspace) => void` | ✓ | - | 打开工作空间编辑弹窗 |
| onUpdateName | `(workspaceId: string, newName: string) => void` | - | - | 更新工作空间名称回调 |
| onRestore | `(workspace: Workspace, mode: WorkspaceRestoreMode) => void` | ✓ | - | 恢复整个工作空间 |
| onDelete | `(workspace: Workspace) => void` | ✓ | - | 删除工作空间 |

**用法示例：**

```tsx
<WorkspaceSection
  workspace={workspace}
  pages={workspace.pages}
  categoryName="默认分类"
  onEdit={openEditDialog}
  onUpdateName={updateWorkspaceName}
  onRestore={restoreWorkspace}
  onDelete={deleteWorkspace}
/>
```

**行为说明：**

- 当 `workspace.tabGroups` 存在时，页面会按浏览器原生标签组关系插入分组 Header；组内页面仍使用外层同一套卡片布局。
- 未选中时点击页面卡片只切换到对应工作空间，不直接改变页面选择。
- 选中时页面卡片可切换选择状态，并展示转书签状态徽标。
- 编辑按钮只打开编辑弹窗，不改变当前页面选择。

### WorkspaceTabGroupList

工作空间标签分组展示组件，按浏览器标签顺序渲染未分组页面和原生标签组 Header。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| pages | `WorkspaceTabPage[]` | ✓ | - | 要展示的页面列表 |
| tabGroups | `WorkspaceTabGroup[]` | - | - | 已保存或当前会话中的浏览器标签组元信息 |
| className | `string` | - | - | 外层容器样式 |
| grid | `boolean` | - | `false` | 是否使用工作空间网格布局 |
| renderPage | `(page: WorkspaceTabPage) => React.ReactNode` | ✓ | - | 页面卡片渲染函数 |

**用法示例：**

```tsx
<WorkspaceTabGroupList
  pages={workspace.pages}
  tabGroups={workspace.tabGroups}
  grid
  renderPage={(page) => <WorkspacePageTile page={page} />}
/>
```

**行为说明：**

- 分组键由 `windowId` 和 `tabGroupId` 共同确定，避免多窗口中原生分组 ID 冲突。
- 分组标题、颜色、折叠状态来自保存会话时采集的浏览器 `tabGroups` 元信息。
- 组件不为分组额外包裹卡片容器，组内页面和未分组页面保持相同列表或网格布局。

### WorkspaceSectionHeader

工作空间头部组件，展示名称、分类、页面数、创建/恢复时间及操作按钮。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| workspace | `Workspace` | ✓ | - | 当前工作空间 |
| categoryName | `string` | ✓ | - | 展示用工作空间分类名称 |
| onEdit | `(workspace: Workspace) => void` | ✓ | - | 打开编辑弹窗 |
| onRestore | `(workspace: Workspace, mode: WorkspaceRestoreMode) => void` | ✓ | - | 恢复整个工作空间 |
| onDelete | `(workspace: Workspace) => void` | ✓ | - | 删除工作空间 |
| onUpdateName | `(workspaceId: string, newName: string) => void` | - | - | 更新工作空间名称 |
| expanded | `boolean` | - | `true` | 是否展开内容网格 |
| onToggle | `() => void` | - | - | 切换展开/收起 |

**用法示例：**

```tsx
<WorkspaceSectionHeader
  workspace={workspace}
  categoryName={categoryName}
  onEdit={openEditDialog}
  onRestore={restoreWorkspace}
  onDelete={deleteWorkspace}
  onUpdateName={updateWorkspaceName}
  expanded={expanded}
  onToggle={() => setExpanded(!expanded)}
/>
```

**行为说明：**

- 点击标题区域只切换当前工作空间。
- 编辑、恢复和删除按钮各自触发上层回调，不直接访问存储层。

### WorkspaceSaveDialog

保存当前窗口为工作空间的确认弹窗，负责展示工作空间基础字段、独立分类创建入口、重复 URL 提示和页面预览。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | 弹窗是否打开 |
| preview | `WorkspacePreview \| null` | ✓ | - | 当前窗口预览 |
| saving | `boolean` | ✓ | - | 是否正在保存 |
| name | `string` | ✓ | - | 工作空间名称 |
| description | `string` | ✓ | - | 工作空间描述 |
| categoryId | `string \| null` | ✓ | - | 工作空间分类 ID，来自 `local:workspaceCategories` |
| tags | `string[]` | ✓ | - | 工作空间标签 |
| keepDuplicatePages | `boolean` | ✓ | - | 是否保留重复 URL 页面 |
| categories | `WorkspaceCategory[]` | ✓ | - | 独立工作空间分类列表 |
| allTags | `string[]` | ✓ | - | 工作空间标签建议 |
| newCategoryName | `string` | ✓ | - | 待创建的工作空间分类名称 |
| creatingCategory | `boolean` | ✓ | - | 是否正在创建工作空间分类 |
| onOpenChange | `(open: boolean) => void` | ✓ | - | 弹窗开关回调 |
| onNameChange | `(value: string) => void` | ✓ | - | 名称变更 |
| onDescriptionChange | `(value: string) => void` | ✓ | - | 描述变更 |
| onCategoryChange | `(value: string \| null) => void` | ✓ | - | 工作空间分类变更 |
| onTagsChange | `(value: string[]) => void` | ✓ | - | 标签变更 |
| onNewCategoryNameChange | `(value: string) => void` | ✓ | - | 新分类名称变更 |
| onCreateCategory | `() => void` | ✓ | - | 创建工作空间分类 |
| onKeepDuplicatePagesChange | `(value: boolean) => void` | ✓ | - | 重复 URL 保留策略变更 |
| onSave | `() => void` | ✓ | - | 保存工作空间 |

**用法示例：**

```tsx
<WorkspaceSaveDialog
  open={saveDialogOpen}
  preview={preview}
  saving={saving}
  name={workspaceName}
  description={workspaceDescription}
  categoryId={workspaceCategoryId}
  tags={workspaceTags}
  keepDuplicatePages={keepDuplicatePages}
  categories={workspaceCategories}
  allTags={workspaceTagSuggestions}
  newCategoryName={newWorkspaceCategoryName}
  creatingCategory={creatingWorkspaceCategory}
  onOpenChange={setSaveDialogOpen}
  onNameChange={setWorkspaceName}
  onDescriptionChange={setWorkspaceDescription}
  onCategoryChange={setWorkspaceCategoryId}
  onTagsChange={setWorkspaceTags}
  onNewCategoryNameChange={setNewWorkspaceCategoryName}
  onCreateCategory={createWorkspaceCategory}
  onKeepDuplicatePagesChange={setKeepDuplicatePages}
  onSave={saveWorkspace}
/>
```

**行为说明：**

- 分类选择和新建分类只读写工作空间分类，不访问书签分类。
- 保存弹窗的标签建议来自已有工作空间标签。
- 页面预览复用 `WorkspaceTabGroupList`，保存前即可确认浏览器原生标签组关系。

### WorkspaceEditDialog

编辑已保存工作空间的弹窗，复用 `WorkspaceSaveFields` 修改名称、描述、独立分类和标签。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | 弹窗是否打开 |
| saving | `boolean` | ✓ | - | 是否正在保存修改 |
| name | `string` | ✓ | - | 工作空间名称 |
| description | `string` | ✓ | - | 工作空间描述 |
| categoryId | `string \| null` | ✓ | - | 工作空间分类 ID |
| tags | `string[]` | ✓ | - | 工作空间标签 |
| categories | `WorkspaceCategory[]` | ✓ | - | 独立工作空间分类列表 |
| allTags | `string[]` | ✓ | - | 工作空间标签建议 |
| newCategoryName | `string` | ✓ | - | 待创建的工作空间分类名称 |
| creatingCategory | `boolean` | ✓ | - | 是否正在创建工作空间分类 |
| onOpenChange | `(open: boolean) => void` | ✓ | - | 弹窗开关回调 |
| onNameChange | `(value: string) => void` | ✓ | - | 名称变更 |
| onDescriptionChange | `(value: string) => void` | ✓ | - | 描述变更 |
| onCategoryChange | `(value: string \| null) => void` | ✓ | - | 工作空间分类变更 |
| onTagsChange | `(value: string[]) => void` | ✓ | - | 标签变更 |
| onNewCategoryNameChange | `(value: string) => void` | ✓ | - | 新分类名称变更 |
| onCreateCategory | `() => void` | ✓ | - | 创建工作空间分类 |
| onSave | `() => void` | ✓ | - | 保存修改 |

**用法示例：**

```tsx
<WorkspaceEditDialog
  open={editDialogOpen}
  saving={updatingWorkspace}
  name={workspaceName}
  description={workspaceDescription}
  categoryId={workspaceCategoryId}
  tags={workspaceTags}
  categories={workspaceCategories}
  allTags={workspaceTagSuggestions}
  newCategoryName={newWorkspaceCategoryName}
  creatingCategory={creatingWorkspaceCategory}
  onOpenChange={setEditDialogOpen}
  onNameChange={setWorkspaceName}
  onDescriptionChange={setWorkspaceDescription}
  onCategoryChange={setWorkspaceCategoryId}
  onTagsChange={setWorkspaceTags}
  onNewCategoryNameChange={setNewWorkspaceCategoryName}
  onCreateCategory={createWorkspaceCategory}
  onSave={updateWorkspace}
/>
```

**行为说明：**

- 保存修改调用 `workspaceStorage.updateWorkspace`，不改变工作空间页面列表。

### WorkspaceSaveFields

工作空间表单字段组件，渲染名称、描述、独立工作空间分类、新建分类和标签输入。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| name | `string` | ✓ | - | 工作空间名称 |
| description | `string` | ✓ | - | 工作空间描述 |
| categoryId | `string \| null` | ✓ | - | 当前工作空间分类 ID |
| tags | `string[]` | ✓ | - | 当前标签 |
| categories | `WorkspaceCategory[]` | ✓ | - | 独立工作空间分类列表 |
| allTags | `string[]` | ✓ | - | 标签建议 |
| newCategoryName | `string` | ✓ | - | 待创建分类名称 |
| creatingCategory | `boolean` | ✓ | - | 是否正在创建分类 |
| namePlaceholder | `string` | - | - | 名称占位符 |
| onNameChange | `(value: string) => void` | ✓ | - | 名称变更 |
| onDescriptionChange | `(value: string) => void` | ✓ | - | 描述变更 |
| onCategoryChange | `(value: string \| null) => void` | ✓ | - | 分类变更 |
| onTagsChange | `(value: string[]) => void` | ✓ | - | 标签变更 |
| onNewCategoryNameChange | `(value: string) => void` | ✓ | - | 新分类名称变更 |
| onCreateCategory | `() => void` | ✓ | - | 创建分类 |

**用法示例：**

```tsx
<WorkspaceSaveFields
  name={workspaceName}
  description={workspaceDescription}
  categoryId={workspaceCategoryId}
  tags={workspaceTags}
  categories={workspaceCategories}
  allTags={workspaceTagSuggestions}
  newCategoryName={newWorkspaceCategoryName}
  creatingCategory={creatingWorkspaceCategory}
  onNameChange={setWorkspaceName}
  onDescriptionChange={setWorkspaceDescription}
  onCategoryChange={setWorkspaceCategoryId}
  onTagsChange={setWorkspaceTags}
  onNewCategoryNameChange={setNewWorkspaceCategoryName}
  onCreateCategory={createWorkspaceCategory}
/>
```

**行为说明：**

- `categories` 必须来自工作空间分类存储，不能传入书签分类。
- 在新分类输入框按 Enter 会触发 `onCreateCategory`。

### WorkspaceCurrentTabsPanel

当前会话 Tabs 侧栏组件，展示所有浏览器窗口可保存标签页，按窗口分组展示，并提供刷新、排序和保存入口。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| preview | `WorkspacePreview \| null` | ✓ | - | 当前窗口预览数据 |
| loading | `boolean` | ✓ | - | 是否正在读取当前窗口 Tabs |
| onRefresh | `() => void` | ✓ | - | 刷新当前窗口 Tabs |
| onSaveCurrentWindow | `(customPreview?: WorkspacePreview) => void` | ✓ | - | 打开保存工作空间弹窗，可传入指定窗口预览 |

**用法示例：**

```tsx
<WorkspaceCurrentTabsPanel
  preview={currentWindowPreview}
  loading={currentWindowLoading}
  onRefresh={refreshCurrentWindowPreview}
  onSaveCurrentWindow={openSaveDialog}
/>
```

**行为说明：**

- 默认按浏览器标签页顺序展示；有浏览器原生标签组时，会在对应窗口内用分组 Header 分隔组内页面。
- 无可保存页面时展示空状态，不触发保存。

### WorkspaceSearchBar

工作空间搜索和筛选条，负责关键词搜索、独立工作空间分类筛选和排序方式选择。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| searchQuery | `string` | ✓ | - | 搜索关键词 |
| categoryFilter | `string` | ✓ | - | 当前分类筛选值 |
| sortBy | `'createdAt' \| 'restoredAt'` | ✓ | - | 排序方式 |
| categories | `WorkspaceCategory[]` | ✓ | - | 独立工作空间分类列表 |
| onSearchChange | `(value: string) => void` | ✓ | - | 搜索变更 |
| onCategoryFilterChange | `(value: string) => void` | ✓ | - | 分类筛选变更 |
| onSortByChange | `(value: 'createdAt' \| 'restoredAt') => void` | ✓ | - | 排序变更 |

**用法示例：**

```tsx
<WorkspaceSearchBar
  searchQuery={searchQuery}
  categoryFilter={categoryFilter}
  sortBy={sortBy}
  categories={workspaceCategories}
  onSearchChange={setSearchQuery}
  onCategoryFilterChange={setCategoryFilter}
  onSortByChange={setSortBy}
/>
```

**行为说明：**

- `categories` 必须来自 `workspaceStorage.getCategories()`，不能传入 `BookmarkContext.categories`。

### WorkspacePageTile

工作空间页面卡片组件，用于在分组网格中展示单个已保存页面。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| page | `WorkspaceTabPage` | ✓ | - | 页面数据 |
| selected | `boolean` | ✓ | - | 页面是否选中 |
| status | `WorkspacePageBookmarkStatus` | - | - | 页面转书签状态 |
| onClick | `(pageId: string) => void` | ✓ | - | 点击页面卡片 |

**用法示例：**

```tsx
<WorkspacePageTile
  page={page}
  selected={selectedPageIds.has(page.id)}
  status={pageStatusById[page.id]}
  onClick={togglePage}
/>
```

**行为说明：**

- `status` 为 `not_bookmarked` 或未传入时不显示状态徽标。

### WorkspacePageFavicon

页面 favicon 展示组件，提供统一尺寸和无图标时的站点占位图标。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| favicon | `string` | - | - | favicon URL |
| url | `string` | - | - | 页面 URL，用于生成 Cravatar favicon |
| className | `string` | - | - | 自定义尺寸或样式 |

**用法示例：**

```tsx
<WorkspacePageFavicon favicon={page.favicon} url={page.url} className="h-7 w-7" />
```

**行为说明：**

- favicon 图片统一使用方形展示，不做圆形裁切。
- `favicon` 为空时显示 `Globe` 占位图标，避免页面卡片布局跳动。
- 工作空间保存预览中的 favicon 基于页面 URL 通过 Cravatar favicon API 生成。

## bookmarkPanel

书签面板相关组件，用于 Content UI 侧边书签浏览。

### BookmarkPanel

书签面板主容器组件，整合头部搜索筛选和分类树列表。

| Prop           | Type                    | Required | Default | Description            |
| -------------- | ----------------------- | -------- | ------- | ---------------------- |
| bookmarks      | `LocalBookmark[]`       | ✓        | -       | 书签数据列表           |
| categories     | `LocalCategory[]`       | ✓        | -       | 分类数据列表           |
| isOpen         | `boolean`               | ✓        | -       | 面板是否打开           |
| position       | `PanelPosition`         | ✓        | -       | 面板位置（left/right） |
| onClose        | `() => void`            | ✓        | -       | 关闭回调               |
| onOpenBookmark | `(url: string) => void` | -        | -       | 打开书签回调           |
| onOpenSettings | `() => void`            | -        | -       | 打开设置回调           |

**行为说明：**

- 面板始终按当前视口左右边缘定位，不依赖挂载容器宽度
- 监听 `settings.enableSidePanel` 变化，关闭后内容页不再渲染触发器与面板
- 监听 `settings.panelPosition` 变化，内容页无需刷新即可在左/右侧间切换
- 面板关闭时同时禁用 pointer events 和 `visibility`，避免隐藏态遮挡页面交互
- 收起位移使用内联 `transform`，不使用 Tailwind 的 `translate-*` 工具类：这些工具类依赖
  `@property` 注册的 `--tw-translate-*`，而该注册只能存在于 document 级样式表中
  （见 `utils/shadow-root-style-guard.ts`），被页面移除后整条 `translate` 声明会失效
- 当前页面不可见或失去活跃状态时，content UI 不响应打开指令并自动收起面板
- 侧边栏头部下方展示 `PinnedSection`，用于快速访问置顶分类和置顶书签
- Below it, `ReadLaterQuickSection` lists the newest unread Read later items (via `useReadLaterQuickList`, loaded only while the panel is open). It is hidden while searching or filtering; opening an item marks it as reading and closes the panel.
- The bookmark list only contains library bookmarks (`getBookmarks()` leaves queue-only read later items out).

---

### PinnedSection

侧边栏置顶区组件，展示用户置顶的分类和书签，并支持展开/折叠和手动排序。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmarks | `LocalBookmark[]` | ✓ | - | 当前书签列表 |
| categories | `LocalCategory[]` | ✓ | - | 当前分类列表 |
| onOpenBookmark | `(url: string) => void` | ✓ | - | 点击置顶书签时打开 URL |
| onSelectCategory | `(categoryId: string) => void` | ✓ | - | 点击置顶分类时筛选该分类 |
| t | `(key: string, options?: Record<string, unknown>) => string` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<PinnedSection
  bookmarks={bookmarks}
  categories={categories}
  onOpenBookmark={handleOpenBookmark}
  onSelectCategory={handleSelectPinnedCategory}
  t={t}
/>
```

**行为说明：**

- 无置顶内容时不渲染。
- 默认展示前 5 条置顶内容，超过 5 条时可展开。
- 点击置顶分类会清空搜索关键词，并将列表筛选到该分类。
- 点击置顶书签会直接打开网页。
- 鼠标悬停置顶项时展示上移/下移按钮，排序结果写入 `pinStorage`。

---

### BookmarkHeader

书签面板头部组件，包含关键词搜索框、筛选器和快捷操作（QuickActions）。

| Prop                   | Type                                                    | Required | Default | Description           |
| ---------------------- | ------------------------------------------------------- | -------- | ------- | --------------------- |
| searchQuery            | `string`                                                | ✓        | -       | 搜索关键词            |
| onSearchChange         | `(query: string) => void`                               | ✓        | -       | 搜索变更回调          |
| bookmarkCount          | `number`                                                | ✓        | -       | 总书签数              |
| filteredCount          | `number`                                                | ✓        | -       | 筛选后书签数          |
| allTags                | `string[]`                                              | ✓        | -       | 所有可用标签          |
| selectedTags           | `string[]`                                              | ✓        | -       | 已选标签              |
| onToggleTag            | `(tag: string) => void`                                 | ✓        | -       | 切换标签选择          |
| onClearTagFilter       | `() => void`                                            | ✓        | -       | 清除标签筛选          |
| timeRange              | `TimeRange`                                             | ✓        | -       | 时间范围筛选          |
| onTimeRangeChange      | `(range: TimeRange) => void`                            | ✓        | -       | 时间范围变更          |
| onClearTimeFilter      | `() => void`                                            | ✓        | -       | 清除时间筛选          |
| customFilters          | `CustomFilter[]`                                        | ✓        | -       | 自定义筛选器列表      |
| selectedCustomFilterId | `string`                                                | -        | -       | 选中的自定义筛选器 ID |
| onSelectCustomFilter   | `(filterId: string \| null) => void`                    | -        | -       | 选择自定义筛选器回调  |
| onSaveCustomFilter     | `(name: string, conditions: FilterCondition[]) => void` | -        | -       | 保存自定义筛选器回调  |
| className              | `string`                                                | -        | -       | 自定义样式类          |

**行为说明：**

- 快捷操作区域使用共享的 `QuickActions` 组件
- 包含主题切换、语言切换和"更多"下拉菜单
- app 页面全局 AI 入口使用右下角 `GlobalAgentLauncher`
- 筛选图标下拉（`FilterDropdownMenu`）内置"自定义时间范围"入口，点击后打开内部维护的 `CustomDateRangeDialog` 弹窗

---

## common

通用共享组件，可在多处复用。

### QuickActions

快捷操作组件，包含主题切换、语言切换和"更多"下拉菜单。可复用于 BookmarkHeader 和 Popup。

| Prop            | Type                | Required | Default     | Description                    |
| --------------- | ------------------- | -------- | ----------- | ------------------------------ |
| size            | `'default' \| 'sm'` | -        | `'default'` | 尺寸变体                       |
| showTooltip     | `boolean`           | -        | `true`      | 是否显示 tooltip               |
| className       | `string`            | -        | -           | 自定义样式类                   |
| portalContainer | `HTMLElement`       | -        | -           | Portal 容器（用于 content UI） |

**功能说明：**

- **主题切换按钮**：点击切换浅色/深色主题
- **语言切换按钮**：点击切换中文/英文语言
- **更多菜单**（hover 触发下拉）：
  - 管理书签：打开书签管理页面（app.html）
  - 保存当前窗口：通过后台服务保存当前窗口为工作空间
  - 查看快捷键：打开浏览器扩展快捷键设置页面
  - 设置：打开扩展设置页面

**用法示例：**

```tsx
// 在 BookmarkHeader (content UI) 中使用
const { container: portalContainer } = useContentUI();
<QuickActions portalContainer={portalContainer} />

// 在 Popup 中使用
<QuickActions size="sm" showTooltip />
```

**行为说明：**

- 更多菜单使用 hover 触发，鼠标移入按钮打开，移出菜单关闭
- 在 content UI 环境中需要传入 portalContainer 确保 Portal 正确渲染
- 使用 `useShortcuts` hook 获取快捷键信息并显示在菜单项中

---

### TagInput

标签输入组件，复用 `@hamhome/ui-business/common` 的 `TagInput`，Extension 侧仅负责注入 i18n 文案。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| value | `string[]` | ✓ | - | 当前标签列表 |
| onChange | `(tags: string[]) => void` | ✓ | - | 标签变更回调 |
| placeholder | `string` | - | - | 输入框占位文案 |
| maxTags | `number` | - | `10` | 最大标签数 |
| suggestions | `string[]` | - | `[]` | 标签建议列表 |
| className | `string` | - | - | 自定义样式类 |

**行为说明：**

- 回车添加标签，空输入 Backspace 删除最后一个标签。
- 建议筛选、标签样式和删除按钮来自共享业务组件。

---

### CategorySelect

分类选择组件，用于书签保存/编辑场景，支持树形分类搜索、未分类选项和 AI 推荐分类映射。

| Prop                  | Type                         | Required | Default | Description                      |
| --------------------- | ---------------------------- | -------- | ------- | -------------------------------- |
| value                 | `string \| null`             | ✓        | -       | 当前选中的分类 ID，`null` 表示未分类 |
| onChange              | `(value: string \| null) => void` | ✓   | -       | 分类变更回调                     |
| categories            | `LocalCategory[]`            | ✓        | -       | 分类列表                         |
| aiRecommendedCategory | `string \| null`             | -        | -       | AI 推荐分类路径或名称            |
| onApplyAICategory     | `() => void`                 | -        | -       | 应用 AI 推荐分类回调             |
| placeholder           | `string`                     | -        | -       | 自定义占位文案                   |
| className             | `string`                     | -        | -       | 自定义容器样式类                 |

**行为说明：**

- 触发器支持 `Enter`、`Space`、`ArrowUp`、`ArrowDown` 打开下拉
- 下拉打开后支持 `↑/↓` 高亮切换、`Enter` 选择、`Esc` 关闭、`Home/End` 跳转到首尾项
- 树节点在非搜索态下支持 `←/→` 收起或展开子分类
- 打开下拉时会自动展开当前分类的父级，并将当前分类滚动到可见区域
- 打开下拉后会自动聚焦搜索框，输入字符可直接过滤分类结果
- 已选中项使用低饱和主色提示，悬停和键盘高亮使用中性底色，避免深色主题下出现大面积高亮色
- 组件只展示 AI 推荐分类状态；已有分类的自动匹配与选中由上层业务 hook 在 AI 结果处理阶段完成

---

### CategoryTreeView

分类层级树视图组件，按分类层级展示书签，支持展开/折叠。
主体树与书签项结构复用 `@hamhome/ui-business/bookmark-panel`，Extension 侧注入 Cravatar favicon 和 content UI Portal 容器。

| Prop                  | Type                                        | Required | Default | Description              |
| --------------------- | ------------------------------------------- | -------- | ------- | ------------------------ |
| bookmarks             | `LocalBookmark[]`                           | ✓        | -       | 书签数据列表             |
| categories            | `LocalCategory[]`                           | ✓        | -       | 分类数据列表             |
| highlightedBookmarkId | `string \| null`                            | -        | -       | 高亮的书签 ID            |
| bookmarkRefs          | `MutableRefObject<Map<string, HTMLElement>>`| -        | -       | 书签元素引用（用于滚动） |
| onOpenBookmark        | `(url: string) => void`                     | -        | -       | 打开书签回调             |
| className             | `string`                                    | -        | -       | 自定义样式类             |

**行为说明：**

- 默认展开所有顶层分类和未分类节点
- 点击分类头部可切换展开/折叠
- 支持多层嵌套分类结构
- 未分类书签（`categoryId` 为 `null`、空字符串、或指向不存在的分类）归类到"未分类"节点

---

### TagFilterList

可搜索的标签多选列表。标签筛选的三个入口——「我的收藏」筛选栏、侧边栏 `BookmarkHeader`、
弹窗形态的 `TagFilterPopover`——都复用它，各自只负责外壳（触发器、已选回显、清除入口）。

| Prop         | Type                      | Required | Default | Description            |
| ------------ | ------------------------- | -------- | ------- | ---------------------- |
| allTags      | `string[]`                | ✓        | -       | 全部可选标签           |
| selectedTags | `string[]`                | ✓        | -       | 已选标签               |
| onToggleTag  | `(tag: string) => void`   | ✓        | -       | 切换某个标签的选中态   |
| height       | `number`                  | -        | `256`   | 列表可视区高度（像素） |
| className    | `string`                  | -        | -       | 自定义容器样式类       |

**行为说明：**

- 列表用 TanStack Virtual 虚拟化，只渲染可视区内的行。标签上千时下拉打开一次只产生十几个节点，
  不会因为一次性铺开全部标签而卡住
- 顶部搜索框按子串（忽略大小写）过滤，右侧 `×` 清空关键词
- 选中判断走 `Set`，避免逐行 `Array.includes` 让渲染退化成 O(n²)
- 行高固定 32px，虚拟化不需要实测；改行内边距时要同步改 `ROW_HEIGHT`
- 滚动容器用 `ScrollArea type="auto"`：默认的 hover 模式在指针进入前 viewport 是 `overflow: hidden`，
  虚拟化会拿不到真正的滚动容器
- 无匹配时按「一个标签都没有」和「搜不到」显示不同文案

---

### TagFilterDropdown

标签筛选下拉外壳，`BookmarksPage` 筛选栏和侧边栏 `BookmarkHeader` 共用。
搜索框和标签列表来自 `TagFilterList`。

| Prop             | Type                                | Required | Default   | Description                        |
| ---------------- | ----------------------------------- | -------- | --------- | ---------------------------------- |
| allTags          | `string[]`                          | ✓        | -         | 全部可选标签                       |
| selectedTags     | `string[]`                          | ✓        | -         | 已选标签                           |
| onToggleTag      | `(tag: string) => void`             | ✓        | -         | 切换某个标签的选中态               |
| onClearTags      | `() => void`                        | -        | -         | 清除全部标签；不传则不显示清除入口 |
| showSelectedTags | `boolean`                           | -        | `true`    | 在列表上方回显已选标签             |
| align            | `"start" \| "center" \| "end"`      | -        | `"end"`   | 弹层相对触发器的对齐方式           |
| children         | `React.ReactNode`                   | ✓        | -         | 触发器                             |

**行为说明：**

- 用 `Popover` 而不是 `DropdownMenu`：`DropdownMenu` 会在列表项之间做 roving focus 和首字母跳转，
  和内嵌的搜索框、虚拟列表互相打架（打开时焦点会被列表项抢走）
- Portal 容器从 `ContentUIContext` 直接取，取不到时回退 `document.body`——
  这个组件在内容脚本（Shadow DOM）和扩展应用页都会用，用 `useContentUI()` 会在应用页每次渲染都告警
- 上层已经单独展示已选标签时（如 `BookmarksPage` 的筛选栏），传 `showSelectedTags={false}` 避免重复

---

### FilterDropdown

筛选类型选择下拉组件，提供标签筛选和时间筛选入口。

| Prop              | Type                         | Required | Default | Description    |
| ----------------- | ---------------------------- | -------- | ------- | -------------- |
| hasTagFilter      | `boolean`                    | ✓        | -       | 是否有标签筛选 |
| hasTimeFilter     | `boolean`                    | ✓        | -       | 是否有时间筛选 |
| onSelectFilter    | `(type: FilterType) => void` | ✓        | -       | 选择筛选类型   |
| onClearTagFilter  | `() => void`                 | -        | -       | 清除标签筛选   |
| onClearTimeFilter | `() => void`                 | -        | -       | 清除时间筛选   |

---

### TagFilterPopover

标签筛选弹窗组件，支持搜索标签和多选。

| Prop         | Type                      | Required | Default | Description  |
| ------------ | ------------------------- | -------- | ------- | ------------ |
| open         | `boolean`                 | ✓        | -       | 弹窗是否打开 |
| onOpenChange | `(open: boolean) => void` | ✓        | -       | 打开状态变更 |
| allTags      | `string[]`                | ✓        | -       | 所有可用标签 |
| selectedTags | `string[]`                | ✓        | -       | 已选标签     |
| onToggleTag  | `(tag: string) => void`   | ✓        | -       | 切换标签选择 |
| onConfirm    | `() => void`              | -        | -       | 确认回调     |

**行为说明：**

- 搜索框和标签列表来自 `TagFilterList`（虚拟滚动），弹窗本身只负责标题、已选回显和确认/取消
- 目前没有页面引用它，保留为弹窗形态的备选外壳

---

### FilterDropdownMenu

筛选器下拉菜单组件（`FilterPopover.tsx`），提供快捷时间筛选、自定义时间范围入口和自定义筛选器选择，是 `BookmarksPage` 和 `BookmarkHeader` 筛选图标的共用下拉内容。

| Prop                    | Type                                  | Required | Default | Description                        |
| ----------------------- | -------------------------------------- | -------- | ------- | ----------------------------------- |
| timeRange               | `TimeRange`                            | ✓        | -       | 当前时间范围                        |
| onTimeRangeChange       | `(range: TimeRange) => void`           | ✓        | -       | 时间范围变更回调                    |
| customFilters           | `CustomFilter[]`                       | -        | `[]`    | 自定义筛选器列表                    |
| selectedCustomFilterId  | `string`                               | -        | -       | 选中的自定义筛选器 ID               |
| onSelectCustomFilter    | `(filterId: string \| null) => void`   | -        | -       | 选择/取消选择自定义筛选器           |
| onOpenCustomFilterDialog| `() => void`                           | ✓        | -       | 打开"添加自定义筛选器"弹窗          |
| onOpenCustomDateRange   | `() => void`                           | ✓        | -       | 打开"自定义时间范围"弹窗            |
| onClearFilter           | `() => void`                           | -        | -       | 清除当前时间/自定义筛选器           |
| children                | `React.ReactNode`                      | ✓        | -       | 下拉触发器（通常是筛选图标按钮）    |

**行为说明：**

- 快捷时间筛选提供 今天/最近一周/最近一月/最近一年 四个预设，选中任一预设会清除已选自定义筛选器
- 预设列表下方是"自定义时间范围"入口，点击后关闭下拉并触发 `onOpenCustomDateRange`（由上层渲染 `CustomDateRangeDialog`），选中时同样清除已选自定义筛选器
- 自定义筛选器列表仅在 `customFilters` 非空时展示，选中自定义筛选器会将时间范围重置为 `all`
- 时间筛选（含自定义范围）与自定义筛选器互斥，二者选其一生效

---

### CustomFilterDialog

新建/编辑自定义筛选器弹窗，支持多个条件（AND 关系）。

| Prop           | Type                                                              | Required | Default | Description        |
| -------------- | ------------------------------------------------------------------ | -------- | ------- | ------------------ |
| open           | `boolean`                                                         | ✓        | -       | 弹窗是否打开        |
| onOpenChange   | `(open: boolean) => void`                                         | ✓        | -       | 打开状态变更        |
| onSave         | `(name: string, conditions: FilterCondition[]) => void`           | ✓        | -       | 保存回调            |
| editingFilter  | `{ id: string; name: string; conditions: FilterCondition[] } \| null` | -    | `null`  | 编辑中的筛选器      |

**行为说明：**

- 条件字段支持 标题/URL/描述/标签/创建时间，操作符按字段类型动态过滤
- 字段切到「创建时间」时，值输入换成 `@hamhome/ui` 的 `DatePicker`（日历下拉），
  不再用 `<input type="date">`；存进条件的值仍是 `YYYY-MM-DD` 字符串
- 创建时间条件按「整天」比较（见 `useBookmarkSearch` 的 `resolveDateBounds`）：
  `等于` 命中当天任意时刻，`大于` 从当天结束之后算起，`小于` 到当天开始之前为止；
  值解析不出有效日期时该条件不参与过滤
- 名称和全部条件值非空时才允许保存
- 保存/取消后会重置表单为一条默认条件（标题包含）

---

### CustomDateRangeDialog

自定义时间范围弹窗组件，从 `FilterDropdownMenu` 的"自定义时间范围"入口打开，用于自由选择起止日期（而非固定预设）。

| Prop         | Type                          | Required | Default | Description                         |
| ------------ | ----------------------------- | -------- | ------- | ------------------------------------ |
| open         | `boolean`                     | ✓        | -       | 弹窗是否打开                          |
| onOpenChange | `(open: boolean) => void`     | ✓        | -       | 打开状态变更                          |
| timeRange    | `TimeRange`                   | ✓        | -       | 当前时间范围，若为 `custom` 用于回填表单 |
| onApply      | `(range: TimeRange) => void`  | ✓        | -       | 应用自定义范围回调                     |

**行为说明：**

- 起止日期都用 `@hamhome/ui` 的 `DatePicker`（触发按钮 + 日历弹层），不再用 `<input type="date">`：
  原生控件的日历样式跟随浏览器，无法适配主题
- 两个选择器互相约束：开始日期的 `max` 是结束日期，结束日期的 `min` 是开始日期，越界的日期点不到
- 日历语言跟随 `i18n.language`；在 Shadow DOM 里渲染时把 content UI 容器传给 `container`
- 起止日期均为必填，且开始日期不得晚于结束日期，否则"应用"按钮禁用
- 应用时开始日期归一化到当天 `00:00:00.000`、结束日期归一化到 `23:59:59.999`，
  确保首尾两天创建的书签都被包含
- 每次打开弹窗都会以当前生效的时间范围（若类型为 `custom`）回填表单，否则清空

---

### BookmarkListItem

书签列表项组件，用于在分类树中显示单个书签。
该组件是 `@hamhome/ui-business/bookmark-panel` 的薄封装，保留 Extension 数据类型与 favicon 解析处理。

| Prop     | Type            | Required | Default | Description |
| -------- | --------------- | -------- | ------- | ----------- |
| bookmark | `LocalBookmark` | ✓        | -       | 书签数据    |

**行为说明：**

- 使用 `<a>` 标签打开链接，在新标签页中打开
- 只显示书签标题，不显示链接地址
- 鼠标悬停时显示 Tooltip，包含标题、描述和完整链接地址
- 显示书签 favicon；除 `data:image` 外，图标地址基于书签 URL 通过 Cravatar favicon API 生成

**用法示例：**

```tsx
<BookmarkListItem bookmark={bookmark} />
```

---

## bookmarkListMng

书签管理页面组件，用于主应用中的网格/列表展示、编辑和快照操作。

### BookmarkCard

网格视图书签卡片，展示书签摘要、分类、标签和更多操作菜单。
主体 UI 复用 `@hamhome/ui-business/bookmark` 的 `BookmarkCard`，Extension 侧负责注入 Cravatar favicon 解析、i18n 和菜单回调。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 展示用分类路径 |
| formattedDate | `string` | ✓ | - | 格式化后的创建时间 |
| isSelected | `boolean` | ✓ | - | 是否被批量选中 |
| isHighlighted | `boolean` | - | `false` | 是否高亮 |
| columnSize | `number` | - | `356` | 瀑布流列宽 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onOpen | `() => void` | ✓ | - | 打开书签 |
| onEdit | `() => void` | ✓ | - | 编辑书签 |
| onDelete | `() => void` | ✓ | - | 删除书签 |
| onViewSnapshot | `() => void` | - | - | 查看快照 |
| onSaveSnapshot | `() => void` | - | - | 保存或更新快照 |
| onDeleteSnapshot | `() => void` | - | - | 删除快照 |
| onSyncToObsidian | `() => void` | - | - | 同步书签笔记到 Obsidian |
| onTogglePin | `() => void` | - | - | 置顶或取消置顶书签 |
| isPinned | `boolean` | - | `false` | 当前书签是否已置顶 |
| onReanalyzeAI | `() => void` | - | - | 重新执行 AI 分析 |
| isProcessingAI | `boolean` | - | - | AI 批处理是否运行中 |
| t | `(key: string, options?: Record<string, unknown>) => string` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<BookmarkCard
  bookmark={bookmark}
  categoryName={categoryName}
  formattedDate={formattedDate}
  isSelected={false}
  onToggleSelect={toggleSelect}
  onOpen={openBookmark}
  onEdit={editBookmark}
  onDelete={deleteBookmark}
  onViewSnapshot={bookmark.hasSnapshot ? viewSnapshot : undefined}
  onSaveSnapshot={saveSnapshot}
  onDeleteSnapshot={bookmark.hasSnapshot ? deleteSnapshot : undefined}
  onSyncToObsidian={syncToObsidian}
  onTogglePin={togglePin}
  isPinned={isPinned}
  t={t}
/>
```

**行为说明：**

- 有快照时展示 `查看快照` 和 `删除快照`。
- 始终可通过更多菜单触发 `保存快照` 或 `更新快照`。
- 可通过更多菜单触发 `同步到 Obsidian`，同步行为由父组件注入。
- 可通过更多菜单触发 `置顶` / `取消置顶`，置顶状态由父组件传入。
- 快照操作由父组件注入，组件不直接访问存储或浏览器 API。
- 除 `data:image` 外，favicon 地址基于书签 URL 通过 Cravatar favicon API 生成。

### BookmarkListItem（管理列表）

列表视图书签行，展示书签标题、域名、分类、时间、标签和更多操作菜单。
主体 UI 复用 `@hamhome/ui-business/bookmark` 的 `BookmarkListItem`，Extension 侧负责注入 Cravatar favicon 解析、i18n 和菜单回调。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| bookmark | `LocalBookmark` | ✓ | - | 书签数据 |
| categoryName | `string` | ✓ | - | 展示用分类路径 |
| formattedDate | `string` | ✓ | - | 格式化后的创建时间 |
| isSelected | `boolean` | ✓ | - | 是否被批量选中 |
| isHighlighted | `boolean` | - | `false` | 是否高亮 |
| onToggleSelect | `() => void` | ✓ | - | 切换选中状态 |
| onOpen | `() => void` | ✓ | - | 打开书签 |
| onEdit | `() => void` | ✓ | - | 编辑书签 |
| onDelete | `() => void` | ✓ | - | 删除书签 |
| onViewSnapshot | `() => void` | - | - | 查看快照 |
| onSaveSnapshot | `() => void` | - | - | 保存或更新快照 |
| onDeleteSnapshot | `() => void` | - | - | 删除快照 |
| onSyncToObsidian | `() => void` | - | - | 同步书签笔记到 Obsidian |
| onTogglePin | `() => void` | - | - | 置顶或取消置顶书签 |
| isPinned | `boolean` | - | `false` | 当前书签是否已置顶 |
| onReanalyzeAI | `() => void` | - | - | 重新执行 AI 分析 |
| isProcessingAI | `boolean` | - | - | AI 批处理是否运行中 |
| t | `(key: string, options?: Record<string, unknown>) => string` | ✓ | - | i18n 翻译函数 |

**用法示例：**

```tsx
<BookmarkListItem
  bookmark={bookmark}
  categoryName={categoryName}
  formattedDate={formattedDate}
  isSelected={false}
  onToggleSelect={toggleSelect}
  onOpen={openBookmark}
  onEdit={editBookmark}
  onDelete={deleteBookmark}
  onSaveSnapshot={saveSnapshot}
  onSyncToObsidian={syncToObsidian}
  onTogglePin={togglePin}
  isPinned={isPinned}
  t={t}
/>
```

**行为说明：**

- 快照菜单项与网格视图一致。
- Obsidian 同步菜单项始终由父组件控制是否可用。
- 置顶菜单项与网格视图一致。
- 快照状态来自 `bookmark.hasSnapshot`，删除快照后父组件需要刷新书签列表。
- 组件保持展示职责，不直接执行快照存储逻辑。
- 除 `data:image` 外，favicon 地址基于书签 URL 通过 Cravatar favicon API 生成。

---

## aiSearch

AI 对话式搜索相关组件，提供底部 AI 搜索栏和对话窗口。

### SearchInputArea

关键词搜索输入组件（纯关键词搜索）。
UI 复用 `@hamhome/ui-business/ai-search` 的 `SearchInputArea`，Extension 侧注入 `ai.searchPlaceholder` 文案。

| Prop        | Type                    | Required | Default | Description        |
| ----------- | ----------------------- | -------- | ------- | ------------------ |
| value       | `string`                | ✓        | -       | 搜索值             |
| onChange    | `(val: string) => void` | ✓        | -       | 值变化回调         |
| onSubmit    | `() => void`            | -        | -       | 搜索提交回调       |
| compact     | `boolean`               | -        | `false` | 紧凑模式（侧边栏） |
| className   | `string`                | -        | -       | 自定义样式类       |
| placeholder | `string`                | -        | -       | placeholder 覆盖   |

**用法示例：**

```tsx
<SearchInputArea
  value={searchQuery}
  onChange={setSearchQuery}
  compact
/>
```

**行为说明：**

- 纯关键词搜索输入框
- Enter 键触发搜索提交
- 支持 compact 模式用于侧边栏紧凑布局

---

### GlobalAgentLauncher

插件 app 页面右下角全局 Agent 入口。组件固定在视口右下角，折叠时显示圆形入口，展开后展示客服式对话窗口、session 切换、执行过程、书签来源与输入框。

| Prop   | Type      | Required | Default | Description |
| ------ | --------- | -------- | ------- | ----------- |
| inline | `boolean` | -        | `false` | 折叠态以内联输入框渲染（用于书签面板），否则固定在视口右下角；状态由 `useGlobalAgent()` 管理 |

**用法示例：**

```tsx
import { GlobalAgentLauncher } from "@/components/agent/GlobalAgentLauncher";

<GlobalAgentLauncher />;
```

**行为说明：**

- 由 `entrypoints/app/App.tsx` 挂载，因此书签、设置、分类、标签、工作空间等 app 页面都会显示入口
- 对话支持多 session 持久化、切换、新建和删除
- assistant 消息可渲染 `AgentProcessStep[]`，展示 skill 匹配、tool 调用、工具输出摘要和失败原因
- 书签搜索结果以 `Source[]` 渲染，点击来源会在新标签页打开对应 URL
- 敏感配置不会在 UI 或 tool 输出里展示明文
- Deleting bookmarks, categories, custom filters, or tab group rules pauses the turn and shows an `AgentApprovalCard`; the turn continues after the user allows or rejects it, and unanswered requests are rejected after 2 minutes
- While a turn runs, the answer streams in live and the busy indicator shows the tool step in progress; `useAgentTurnProgress()` polls the background every 300 ms
- While a turn runs, the send button becomes a stop button: the turn is aborted, nothing of it is saved, and its message goes back into the input
- Long conversations stay within a token budget: earlier turns are summarized, and an "整理较早的对话" step appears in the process steps when that happens

---

### AgentApprovalCard

Inline card in the agent chat that asks the user to approve a high-risk tool call (tools whose `metadata.riskLevel` is `"high"`). Purely presentational: `useGlobalAgent()` (via `useAgentTurnProgress()`) polls the pending request and sends the decision.

| Prop         | Type                       | Required | Default | Description |
| ------------ | -------------------------- | -------- | ------- | ----------- |
| approval     | `AgentToolApprovalRequest` | ✓        | -       | Pending request: localized `title`, `target`, `detail`, and `expiresAt` |
| isResponding | `boolean`                  | -        | `false` | Disables both buttons while the decision is being sent |
| onApprove    | `() => void`               | ✓        | -       | Allow the tool call |
| onReject     | `() => void`               | ✓        | -       | Reject the tool call |

**用法示例：**

```tsx
import { AgentApprovalCard } from "@/components/agent/AgentApprovalCard";

{agent.pendingApproval && (
  <AgentApprovalCard
    approval={agent.pendingApproval}
    isResponding={agent.isRespondingToApproval}
    onApprove={() => void agent.respondToApproval(true)}
    onReject={() => void agent.respondToApproval(false)}
  />
)}
```

**行为说明：**

- Shows what will happen (e.g. "删除书签"), the readable target (bookmark title, category name), and consequences such as "永久删除，无法恢复"
- Displays the remaining minutes before the request is rejected automatically
- A rejected call is not executed; the matching process step shows a "not approved" failure and the agent tells the user it was cancelled

---

### AIChatSearchBar

AI 搜索输入栏组件，包含输入框和提交按钮。搜索栏最大宽度 720px，居中显示。

| Prop          | Type                      | Required | Default | Description      |
| ------------- | ------------------------- | -------- | ------- | ---------------- |
| query         | `string`                  | ✓        | -       | 搜索值           |
| isSearching   | `boolean`                 | ✓        | -       | 是否正在搜索     |
| onQueryChange | `(value: string) => void` | ✓        | -       | 搜索值变化回调   |
| onSubmit      | `() => void`              | ✓        | -       | 提交回调         |

**用法示例：**

```tsx
<AIChatSearchBar
  query={query}
  isSearching={isSearching}
  onQueryChange={setQuery}
  onSubmit={handleSearch}
/>
```

---

### AIChatStatusIndicator

AI 状态指示器组件，显示当前搜索/生成状态。

| Prop    | Type                | Required | Default | Description |
| ------- | ------------------- | -------- | ------- | ----------- |
| status  | `AISearchStatus`    | ✓        | -       | 当前状态    |
| error   | `string \| null`    | -        | -       | 错误信息    |
| onRetry | `() => void`        | -        | -       | 重试回调    |

**用法示例：**

```tsx
<AIChatStatusIndicator status={status} error={error} onRetry={handleRetry} />
```

---

### AIChatSources

AI 引用源列表组件，显示回答引用的书签来源。

| Prop          | Type                         | Required | Default | Description    |
| ------------- | ---------------------------- | -------- | ------- | -------------- |
| sources       | `Source[]`                   | ✓        | -       | 引用源列表     |
| onSourceClick | `(source: Source) => void`   | ✓        | -       | 点击引用回调   |

**用法示例：**

```tsx
<AIChatSources sources={sources} onSourceClick={handleSourceClick} />
```

---

### AIChatSuggestions

AI 后续建议组件，显示可点击的建议操作。

| Prop              | Type                           | Required | Default | Description        |
| ----------------- | ------------------------------ | -------- | ------- | ------------------ |
| suggestions       | `string[]`                     | ✓        | -       | 建议列表           |
| onSuggestionClick | `(suggestion: string) => void` | -        | -       | 点击建议回调       |

**用法示例：**

```tsx
<AIChatSuggestions
  suggestions={suggestions}
  onSuggestionClick={handleSuggestionClick}
/>
```

---

### AIChatMessage

AI 消息组件，显示单条对话消息（用户或助手）。

| Prop          | Type                         | Required | Default | Description            |
| ------------- | ---------------------------- | -------- | ------- | ---------------------- |
| message       | `ChatMessage`                | ✓        | -       | 消息内容               |
| sources       | `Source[]`                   | -        | `[]`    | 引用源（解析引用标记） |
| onSourceClick | `(source: Source) => void`   | ✓        | -       | 点击引用回调           |

**用法示例：**

```tsx
<AIChatMessage
  message={message}
  sources={sources}
  onSourceClick={handleSourceClick}
/>
```

**行为说明：**

- 用户消息显示在右侧，助手消息显示在左侧
- 自动解析消息内容中的 `[1]`、`[2]` 等引用标记并转换为可点击按钮

### AIAnswerPanel（已弃用）

AI 回答面板组件，展示 AI 回答、引用源和后续建议。已被全局 `GlobalAgentLauncher` 入口替代，保留用于向后兼容。

| Prop              | Type                              | Required | Default | Description          |
| ----------------- | --------------------------------- | -------- | ------- | -------------------- |
| compact           | `boolean`                         | -        | `false` | 紧凑模式（侧边栏）   |
| answer            | `string`                          | ✓        | -       | AI 回答内容          |
| status            | `AISearchStatus`                  | ✓        | -       | AI 状态              |
| error             | `string \| null`                  | -        | -       | 错误信息             |
| sources           | `Source[]`                        | ✓        | -       | 引用源列表           |
| onSourceClick     | `(bookmarkId: string) => void`    | ✓        | -       | 点击引用回调         |
| onClose           | `() => void`                      | ✓        | -       | 关闭/收起回调        |
| suggestions       | `string[]`                        | -        | `[]`    | 后续建议列表         |
| onSuggestionClick | `(suggestion: string) => void`    | -        | -       | 后续建议点击回调     |
| onRetry           | `() => void`                      | -        | -       | 重试回调             |
| className         | `string`                          | -        | -       | 自定义样式类         |

**AISearchStatus 类型：**

```ts
type AISearchStatus = 'idle' | 'thinking' | 'searching' | 'writing' | 'done' | 'error';
```

**Source 类型：**

```ts
interface Source {
  index: number;         // 引用编号（从 1 开始）
  bookmarkId: string;    // 书签 ID
  title: string;         // 书签标题
  url: string;           // 书签 URL
  score?: number;        // 综合相关度分数 (0-1)
  keywordScore?: number; // 关键词匹配分数 (0-1)
  semanticScore?: number;// 语义匹配分数 (0-1)
  matchReason?: string;  // 匹配原因描述
}
```

---

## bookmarkListMng

书签列表管理相关组件，用于 `BookmarksPage` 主内容区的书签展示和编辑。

应用内容壳以视口高度作为固定的 flex 布局基准，长页面仍由外层 `ScrollArea` 滚动。`BookmarksPage` 会填满其中的可用区域，筛选栏保持在顶部，网格、列表和视觉画廊共用剩余高度并在内部滚动；滚动条空间会稳定预留，避免动态高度卡片出现后改变列宽。

### BookmarkCard

网格视图下的书签卡片组件。

| Prop           | Type            | Required | Default | Description              |
| -------------- | --------------- | -------- | ------- | ------------------------ |
| bookmark       | `LocalBookmark` | ✓        | -       | 书签数据                 |
| categoryName   | `string`        | ✓        | -       | 分类全路径名称           |
| formattedDate  | `string`        | ✓        | -       | 格式化后的创建日期       |
| isSelected     | `boolean`       | ✓        | -       | 是否被选中               |
| isHighlighted  | `boolean`       | -        | `false` | AI 引用高亮状态          |
| columnSize     | `number`        | -        | `356`   | 卡片宽度                 |
| onToggleSelect | `() => void`    | ✓        | -       | 切换选中状态             |
| onEdit         | `() => void`    | ✓        | -       | 编辑回调                 |
| onDelete       | `() => void`    | ✓        | -       | 删除回调                 |
| t              | `TFunction`     | ✓        | -       | i18n 翻译函数            |

**用法示例：**

```tsx
<BookmarkCard
  bookmark={bookmark}
  categoryName="技术 > 前端"
  formattedDate="今天"
  isSelected={false}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onEdit={() => setEditingBookmark(bookmark)}
  onDelete={() => handleDelete(bookmark)}
  t={t}
/>
```

---

### BookmarkListItem

列表视图下的书签行组件。

| Prop           | Type            | Required | Default | Description        |
| -------------- | --------------- | -------- | ------- | ------------------ |
| bookmark       | `LocalBookmark` | ✓        | -       | 书签数据           |
| categoryName   | `string`        | ✓        | -       | 分类全路径名称     |
| formattedDate  | `string`        | ✓        | -       | 格式化后的创建日期 |
| isSelected     | `boolean`       | ✓        | -       | 是否被选中         |
| isHighlighted  | `boolean`       | -        | `false` | AI 引用高亮状态    |
| onToggleSelect | `() => void`    | ✓        | -       | 切换选中状态       |
| onOpen         | `() => void`    | ✓        | -       | 打开书签回调       |
| onEdit         | `() => void`    | ✓        | -       | 编辑回调           |
| onDelete       | `() => void`    | ✓        | -       | 删除回调           |
| t              | `TFunction`     | ✓        | -       | i18n 翻译函数      |

**用法示例：**

```tsx
<BookmarkListItem
  bookmark={bookmark}
  categoryName="技术 > 前端"
  formattedDate="昨天"
  isSelected={selectedIds.has(bookmark.id)}
  onToggleSelect={() => toggleSelect(bookmark.id)}
  onOpen={() => window.open(bookmark.url, "_blank")}
  onEdit={() => setEditingBookmark(bookmark)}
  onDelete={() => handleDelete(bookmark)}
  t={t}
/>
```

---

### EditBookmarkDialog

书签编辑弹窗组件，支持修改书签的 URL、标题、摘要、分类和标签。

| Prop     | Type            | Required | Default | Description      |
| -------- | --------------- | -------- | ------- | ---------------- |
| bookmark | `LocalBookmark` | ✓        | -       | 要编辑的书签数据 |
| onSaved  | `() => void`    | ✓        | -       | 保存成功回调     |
| onClose  | `() => void`    | ✓        | -       | 关闭弹窗回调     |

**用法示例：**

```tsx
{
  editingBookmark && (
    <EditBookmarkDialog
      bookmark={editingBookmark}
      onSaved={() => {
        refreshBookmarks();
        setEditingBookmark(null);
      }}
      onClose={() => setEditingBookmark(null)}
    />
  );
}
```

**行为说明：**

- 内部使用 `useSavePanel` hook 管理表单状态
- 支持 AI 推荐分类功能
- 自动加载已有标签列表作为建议

---

### SnapshotViewer

网页快照查看器组件，在弹窗中展示保存的网页快照。

| Prop           | Type             | Required | Default | Description      |
| -------------- | ---------------- | -------- | ------- | ---------------- |
| open           | `boolean`        | ✓        | -       | 是否显示         |
| snapshotUrl    | `string \| null` | ✓        | -       | 快照 Blob URL    |
| title          | `string`         | ✓        | -       | 书签标题         |
| loading        | `boolean`        | -        | -       | 加载状态         |
| error          | `string \| null` | -        | -       | 错误信息         |
| onClose        | `() => void`     | ✓        | -       | 关闭回调         |
| onOpenInNewTab | `() => void`     | -        | -       | 新标签页打开回调 |
| onDownload     | `() => void`     | -        | -       | 下载快照回调     |
| onDelete       | `() => void`     | -        | -       | 删除快照回调     |
| t              | `TFunction`      | ✓        | -       | i18n 翻译函数    |

**用法示例：**

```tsx
const { snapshotUrl, loading, error, openSnapshot, closeSnapshot } =
  useSnapshot();

<SnapshotViewer
  open={!!snapshotBookmark}
  snapshotUrl={snapshotUrl}
  title={snapshotBookmark?.title || ""}
  loading={loading}
  error={error}
  onClose={closeSnapshot}
  onDelete={handleDeleteSnapshot}
  t={t}
/>;
```

**行为说明：**

- 使用 iframe 展示快照内容
- 支持在新标签页中打开
- 支持下载快照为 HTML 文件
- 支持删除快照

---

## tabCenter

The tab center page (route `#tabs`, `#tabs?view=archive`, `#tabs?view=rules`) shows open tabs, the tab archive and the rules for the tab lifecycle features (activity tracking, auto archive, tab budget), plus the weekly overview and the rule-based / AI tidy-up dialogs. `components/TabCenterPage.tsx` is the entry; everything else lives in `components/tabCenter/` (with `overview/`, `aiTriage/` and `rules/`). Data and actions come from hooks (`useOpenTabsSnapshot`, `useOpenTabActions`, `useTabArchive`, `useTabLifecycleSettings`, `useTabTidy`, `useTabAITriage`, ...); strings use the `bookmark` namespace under `tabCenter.*`.

### TabCenterPage

Route-level page of the tab center, lazy-loaded by `entrypoints/app/App.tsx` for the `tabs` view. It picks the Open, Archive or Rules view from the `view` query parameter and owns the shared header, the onboarding and the weekly overview dialog.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| currentView | `string` | ✓ | - | Current app view, e.g. `tabs` or `tabs?view=rules`; `view=archive` / `view=rules` pick those views, anything else shows Open |
| onViewChange | `(view: string) => void` | ✓ | - | App navigation; called with `tabs`, `tabs?view=archive`, `tabs?view=rules` or `settings?tab=ai` |

**Usage:**

```tsx
<TabCenterPage currentView={currentView} onViewChange={handleViewChange} />
```

**Behavior:**

- Builds one header (`TabCenterHeader`, `ConsentBanner`, plus `PendingConfirmBanner` once a snapshot exists) and passes it to the active view; the Open view shows only a spinner while the first snapshot loads.
- After lifecycle settings load, opens `TabLifecycleOnboarding` once per mount when onboarding was never completed and auto archive is off in the (synced) settings. When another device already turned it on, `ConsentBanner` asks for this device's consent instead, so the synced settings are kept.
- Turning auto archive on in Rules accepts the synced consent when another device turned it on (`lifecycle.acceptConsent("autoArchive")`), opens the onboarding if it was never completed, otherwise calls `lifecycle.setAutoArchiveEnabled(true)`.
- Finishing the onboarding with the custom plan switches to Rules; with "Tidy up now" it switches to Open with the returned tabs preselected.
- The weekly overview gets `budgetLimit` only while the tab budget is enabled; "Resume hints" in Rules calls `getBackgroundService().resumeBudgetNudge()`.

### TabCenterHeader

Title, description, "This week" button and the Open / Archive / Rules switch at the top of every tab center view; part of the shared header built by `TabCenterPage`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| view | `TabCenterView` | ✓ | - | Active view: `"open"`, `"archive"` or `"rules"` |
| openCount | `number` | ✓ | - | Count on the Open tab |
| archiveCount | `number` | ✓ | - | Count on the Archive tab |
| onViewChange | `(view: TabCenterView) => void` | ✓ | - | Called with the chosen view |
| onOpenOverview | `() => void` | ✓ | - | Opens the weekly overview dialog |

**Usage:**

```tsx
<TabCenterHeader
  view={view}
  openCount={snapshot?.stats.total ?? 0}
  archiveCount={archiveCount}
  onViewChange={setView}
  onOpenOverview={() => setOverviewOpen(true)}
/>
```

**Behavior:**

- The file also exports the `TabCenterView` type (`"open" | "archive" | "rules"`).
- Open and Archive show their counts next to the label; Rules shows none.
- Test IDs: `tab-center-overview`, `tab-center-view-open`, `tab-center-view-archive`, `tab-center-view-rules`.

### ConsentBanner

Amber banner in the shared header, exported from `TabCenterBanners.tsx`: auto archive or automatic make room was turned on on another device (synced settings) and still needs this device's consent before it closes tabs here.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| autoArchive | `boolean` | ✓ | - | Auto archive waits for consent on this device |
| autoMakeRoom | `boolean` | ✓ | - | Automatic make room waits for consent on this device |
| onAccept | `(kind: "autoArchive" \| "autoMakeRoom") => void` | ✓ | - | "Turn on here" for one feature |

**Usage:**

```tsx
<ConsentBanner
  autoArchive={lifecycle.pendingConsents.autoArchive}
  autoMakeRoom={lifecycle.pendingConsents.autoMakeRoom}
  onAccept={(kind) => void lifecycle.acceptConsent(kind)}
/>
```

**Behavior:**

- Renders nothing when both flags are false; otherwise one line per pending feature, each with its own "Turn on here" button.
- `TabCenterPage` accepts through `lifecycle.acceptConsent(kind)` (background `acceptSyncedTabConsent`).
- Test ID: `tab-consent-banner`.

### PendingConfirmBanner

Banner in the shared header, exported from `TabCenterBanners.tsx`, for the "Ask first" (`confirm`) auto archive mode: tabs past the idle threshold that wait for confirmation.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| pending | `PendingArchiveConfirmation[]` | ✓ | - | Tabs waiting for confirmation |
| onConfirm | `() => void` | ✓ | - | "Archive all" |
| onKeep | `() => void` | ✓ | - | "Keep and restart the timer" |

**Usage:**

```tsx
<PendingConfirmBanner
  pending={snapshot.pendingConfirm}
  onConfirm={() => void actions.confirmPending()}
  onKeep={() => void actions.keepPending()}
/>
```

**Behavior:**

- Renders nothing when `pending` is empty; otherwise shows the count with both buttons.
- `TabCenterPage` calls `confirmPending()` / `keepPending()` from `useOpenTabActions` without tab IDs, so they archive every pending tab or restart the idle time of every pending tab.
- Test ID: `tab-pending-confirm`.

### TabLifecycleOnboarding

First-run dialog of the tab center (also shown the first time auto archive is turned on) that shows the current state and a plan before anything is closed. Rendered by `TabCenterPage`; its state comes from `useTabLifecycleOnboarding`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog visibility |
| onboarding | `UseTabLifecycleOnboardingResult` | ✓ | - | Step, choices, summary and `finish` / `skip` from `useTabLifecycleOnboarding` |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Dialog open state changes |
| onDone | `(outcome: OnboardingOutcome) => void` | ✓ | - | Called with the outcome when "Start" is pressed on the last step |

**Usage:**

```tsx
const onboarding = useTabLifecycleOnboarding(snapshot, lifecycle, onboardingOpen);

<TabLifecycleOnboarding
  open={onboardingOpen}
  onboarding={onboarding}
  onOpenChange={setOnboardingOpen}
  onDone={handleOnboardingDone}
/>
```

**Behavior:**

- Step 0: summary of open tabs, windows, stale tabs and duplicate groups (plus an "estimated" note when `summary.estimated`), and the Recommended / Custom plan as radio cards (internal `ChoiceCard`).
- Step 1: how to treat existing tabs ("Start counting from today" / "Tidy up now"), the always-on protections and, when there are any, checkboxes for recommended protected domains (all checked on each opening).
- "Turn on" on step 1 awaits `onboarding.finish()` (spinner while `saving`), keeps the outcome and moves to step 2; "Start" there closes the dialog and calls `onDone(outcome)`.
- "Skip" (steps 0 and 1) awaits `onboarding.skip()`, which marks onboarding as completed, then closes.
- Dismissing with the close button or Esc neither completes onboarding (it opens again on the next visit) nor, on step 2, calls `onDone`.

### OpenTabsView

The tab center's Open view, rendered by `TabCenterPage` once a snapshot exists: stats, toolbar, batch bar and a virtualized list of open tabs grouped by window, tab group or domain, plus the workspace, tidy-up and AI tidy-up dialogs.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| snapshot | `OpenTabsSnapshot` | ✓ | - | Live open tabs snapshot |
| header | `ReactNode` | ✓ | - | Shared tab center header rendered at the top |
| preselectTabIds | `number[]` | | - | Tabs to select when the view opens (onboarding "Tidy up now") |
| onPreselectConsumed | `() => void` | | - | Called after `preselectTabIds` were applied |
| onOpenAISettings | `() => void` | ✓ | - | AI tidy-up without an AI config: go to the AI settings |

**Usage:**

```tsx
<OpenTabsView
  snapshot={snapshot}
  header={header}
  preselectTabIds={preselect}
  onPreselectConsumed={clearPreselect}
  onOpenAISettings={() => onViewChange("settings?tab=ai")}
/>
```

**Behavior:**

- List state (search, grouping, sort, filters, selection) comes from `useOpenTabsList`; rows are virtualized with `useScrollAreaVirtualList`, and "No tabs match" shows when no row is left.
- A non-empty `preselectTabIds` replaces the selection, then `onPreselectConsumed` is called.
- Row and batch actions go through `useOpenTabActions`; batch actions run on the selected tab IDs and clear the selection afterwards.
- "Tidy up" resets `useTabTidy` (every suggestion selected) and opens `TabTidyDialog`; "AI tidy-up" opens `TabAITriageDialog`; "Add to workspace" opens `AddToWorkspaceDialog` with the selected tabs.
- Grouping by tab group is offered only when `chrome.tabGroups` exists.

### OpenTabsStatsBar

Summary line above the open tabs list (e.g. "Budget 47/15 · 6 archiving soon · 3 duplicate groups") with duplicate cleanup and the two tidy-up entries; rendered by `OpenTabsView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| snapshot | `OpenTabsSnapshot` | ✓ | - | Source of budget, stats and auto archive state |
| onCloseDuplicates | `() => void` | ✓ | - | "Close duplicates (n)" |
| onTidyUp | `() => void` | ✓ | - | Opens the rule-based tidy-up |
| onAITriage | `() => void` | ✓ | - | Opens the AI tidy-up |

**Usage:**

```tsx
<OpenTabsStatsBar
  snapshot={snapshot}
  onCloseDuplicates={() => void actions.closeDuplicates()}
  onTidyUp={() => {
    tidy.reset();
    setTidyOpen(true);
  }}
  onAITriage={() => setAITriageOpen(true)}
/>
```

**Behavior:**

- Starts with "Budget count/limit" while the budget is on, otherwise "N open"; the line turns red when `budget.level === "over"`.
- "Archiving soon" (expiring + expired) appears only while auto archive is active; idle past threshold, duplicate groups and protected counts are always shown.
- "Close duplicates" shows `stats.redundantDuplicates` and is disabled when it is 0.
- Test IDs: `open-tabs-stats`, `tab-center-ai-triage`, `tab-center-tidy`.

### OpenTabsToolbar

Search field, grouping and sort selects and filter chips of the open tabs list; controlled by `useOpenTabsList` in `OpenTabsView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| query | `string` | ✓ | - | Search text |
| groupBy | `OpenTabsGroupBy` | ✓ | - | `"window"`, `"group"` or `"domain"` |
| sort | `OpenTabsSort` | ✓ | - | `"position"`, `"recent"` or `"idle"` |
| filters | `ReadonlySet<OpenTabsFilter>` | ✓ | - | Active filter chips |
| supportsGroups | `boolean` | ✓ | - | Browser supports tab groups |
| onQueryChange | `(query: string) => void` | ✓ | - | Search input changed |
| onGroupByChange | `(groupBy: OpenTabsGroupBy) => void` | ✓ | - | Grouping selected |
| onSortChange | `(sort: OpenTabsSort) => void` | ✓ | - | Sort selected |
| onToggleFilter | `(filter: OpenTabsFilter) => void` | ✓ | - | Filter chip clicked |

**Usage:**

```tsx
<OpenTabsToolbar
  query={list.query}
  groupBy={list.groupBy}
  sort={list.sort}
  filters={list.filters}
  supportsGroups={supportsGroups}
  onQueryChange={list.setQuery}
  onGroupByChange={list.setGroupBy}
  onSortChange={list.setSort}
  onToggleFilter={list.toggleFilter}
/>
```

**Behavior:**

- The "By tab group" option is hidden when `supportsGroups` is false.
- Filter chips (Idle > 1 day, Archiving soon, Duplicates, Protected) are toggle buttons with `aria-pressed`; the list shows tabs matching any active filter.
- Fully controlled: searching, grouping and sorting happen in `useOpenTabsList`.

### OpenTabsBatchBar

Sticky bar of batch actions for the selected open tabs; rendered by `OpenTabsView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| visibleTabIds | `number[]` | ✓ | - | IDs of the tabs currently listed |
| selectedTabs | `OpenTabInfo[]` | ✓ | - | Selected tabs |
| onToggleSelectAll | `(tabIds: number[]) => void` | ✓ | - | Select-all checkbox; called with `visibleTabIds` |
| onReadLater | `() => void` | ✓ | - | Read later |
| onBookmark | `() => void` | ✓ | - | Bookmark |
| onWorkspace | `() => void` | ✓ | - | Add to workspace |
| onArchive | `() => void` | ✓ | - | Archive & close |
| onLock | `() => void` | ✓ | - | Lock |
| onUnlock | `() => void` | ✓ | - | Unlock |
| onRenew | `() => void` | ✓ | - | Renew (restart idle timer), in the "More" menu |
| onCloseWithoutRecord | `() => void` | ✓ | - | Close without keeping a record, in the "More" menu |

**Usage:**

```tsx
// run(action) applies the action to the selected tab IDs, then clears the selection
<OpenTabsBatchBar
  visibleTabIds={list.visibleTabIds}
  selectedTabs={list.selectedTabs}
  onToggleSelectAll={(ids) => list.selectOnly(list.selected.size === ids.length ? [] : ids)}
  onReadLater={run(actions.readLater)}
  onBookmark={run(actions.bookmark)}
  onWorkspace={() => setWorkspaceTabs(list.selectedTabs)}
  onArchive={run((ids) => actions.archive(ids))}
  onLock={run((ids) => actions.setLocked(ids, true))}
  onUnlock={run((ids) => actions.setLocked(ids, false))}
  onRenew={run(actions.renew)}
  onCloseWithoutRecord={run(actions.closeWithoutRecord)}
/>
```

**Behavior:**

- The checkbox is checked when the selected count equals the visible count and disabled when nothing is listed; the label switches between "Select all" and "N selected".
- Every action button, including the "More" menu trigger, is disabled while nothing is selected.
- "Close without keeping a record" is styled destructive; `useOpenTabActions().closeWithoutRecord` asks for confirmation before closing.
- Test ID: `open-tabs-archive` on the archive button.

### OpenTabsGroupHeader

Group header row of the open tabs list ("Window 1 (23)", a tab group or a domain) with a checkbox selecting the whole group; rendered by `OpenTabsView` for `header` rows.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | `OpenTabsGroupLabel` | ✓ | - | Window, tab group, ungrouped or domain label |
| count | `number` | ✓ | - | Tabs in the group |
| selectedCount | `number` | ✓ | - | Selected tabs in the group |
| onToggleAll | `(selected: boolean) => void` | ✓ | - | Select or deselect the whole group |

**Usage:**

```tsx
<OpenTabsGroupHeader
  label={row.label}
  count={row.count}
  selectedCount={row.tabIds.filter((id) => list.selected.has(id)).length}
  onToggleAll={(value) => list.setSelected(row.tabIds, value)}
/>
```

**Behavior:**

- Text by kind: "Window N" (plus a "Current window" chip when focused), the group title or "Untitled group", "Not grouped", or the domain ("Other" when empty).
- Tab groups show a colored dot mapped from the Chrome group color name; unknown colors fall back to grey.
- The checkbox is unchecked, indeterminate or checked from `selectedCount` vs `count`.

### OpenTabRow

One open tab in the list (memoized): checkbox, favicon, title, domain, status badges, idle time and quick actions; rendered by `OpenTabsView` for `tab` rows.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| tab | `OpenTabInfo` | ✓ | - | Tab to show |
| selected | `boolean` | ✓ | - | Row is selected |
| archiveMode | `TabArchiveMode` | ✓ | - | Auto archive mode, for the archive badge |
| thresholdUnit | `TabIdleUnit` | ✓ | - | Idle threshold unit, for the archive badge |
| pendingConfirm | `boolean` | ✓ | - | Tab waits for archive confirmation |
| onToggleSelect | `(tabId: number) => void` | ✓ | - | Checkbox toggled |
| onFocus | `(tabId: number) => void` | ✓ | - | Title clicked: switch to the tab |
| onLockToggle | `(tab: OpenTabInfo) => void` | ✓ | - | Lock / unlock button |
| onReadLater | `(tabId: number) => void` | ✓ | - | Read later button |
| onArchive | `(tabId: number) => void` | ✓ | - | Archive & close button |

**Usage:**

```tsx
// onFocus, onLockToggle, onReadLater and onArchive are memoized wrappers around useOpenTabActions
<OpenTabRow
  tab={row.tab}
  selected={list.selected.has(row.tab.tabId)}
  archiveMode={snapshot.autoArchive.mode}
  thresholdUnit={snapshot.autoArchive.threshold.unit}
  pendingConfirm={pending.has(row.tab.tabId)}
  onToggleSelect={list.toggleSelect}
  onFocus={onFocus}
  onLockToggle={onLockToggle}
  onReadLater={onReadLater}
  onArchive={onArchive}
/>
```

**Behavior:**

- Clicking the title calls `onFocus` (URL in the tooltip); the favicon goes through `useSafeFavicon`, with a grey placeholder when there is none.
- The idle column shows "Current" for the active tab, "≈ time" with an "estimate" tooltip when `activityEstimated`, otherwise the relative last-active time.
- Quick actions sit at 60% opacity until the row is hovered or focused; the lock button turns into Unlock for locked tabs, and archive is disabled for pinned tabs.
- Selected rows get a primary border and tint; the row carries `data-testid="open-tab-row"` and `data-tab-id`.

### TabStatusBadges

State of an open tab as small icon + text badges (never color alone); rendered inside `OpenTabRow`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| tab | `OpenTabInfo` | ✓ | - | Tab whose state is shown |
| archiveMode | `TabArchiveMode` | ✓ | - | `"auto"`, `"confirm"` or `"mark-only"` |
| thresholdUnit | `TabIdleUnit` | ✓ | - | Unit of the idle threshold |
| pendingConfirm | `boolean` | ✓ | - | Tab waits for archive confirmation |

**Usage:**

```tsx
<TabStatusBadges
  tab={tab}
  archiveMode={archiveMode}
  thresholdUnit={thresholdUnit}
  pendingConfirm={pendingConfirm}
/>
```

**Behavior:**

- Badges in order: Pinned, Locked, Playing, Saving, Protected domain, Unsaved input, the archive badge, "Duplicate ×N" (when `duplicateCount > 1`) and Sleeping (discarded).
- The archive badge appears only for tabs without any protection reason: "Waiting for confirmation" when pending; for expired tabs "Expired" in `mark-only` mode, otherwise "Archiving soon"; for expiring tabs "Archives tomorrow" (day threshold, at most 1 usage day left) or "Archives <relative time>".
- Tones (internal `StatusBadge`): Locked is info (sky), the archive badge warning (amber), the rest neutral.

### AddToWorkspaceDialog

Dialog that adds pages (open tabs or archived tabs) to an existing workspace or a new one; used by `OpenTabsView` (selected tabs) and `TabArchiveView` (archive entries).

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog visibility |
| pages | `WorkspacePageInput[]` | ✓ | - | Pages to add (`title`, `url`, optional `favicon`) |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Dialog open state changes |
| onAdded | `(count: number) => void` | | - | Called with the number of pages added |

**Usage:**

```tsx
<AddToWorkspaceDialog
  open={!!workspaceTabs}
  pages={(workspaceTabs ?? []).map((tab) => ({ title: tab.title, url: tab.url, favicon: tab.favicon }))}
  onOpenChange={(open) => !open && setWorkspaceTabs(null)}
  onAdded={() => list.clearSelection()}
/>
```

**Behavior:**

- Each opening resets the target to "New workspace" and clears the name; the name field shows only for a new workspace, and an empty name falls back to "Tidied tabs".
- Existing workspaces come from `useAddToWorkspace`; `addPages` skips URLs already in the target workspace (and duplicate URLs for a new one).
- Success shows "Added N pages", calls `onAdded(count)` and closes; failure shows an error toast and keeps the dialog open.
- "Add" is disabled while saving or when `pages` is empty.

### TabTidyDialog

Rule-based (no AI) tidy-up suggestions grouped by destination, opened from "Tidy up" in `OpenTabsStatsBar`; every group and every tab can be unchecked before applying.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog visibility |
| tabCount | `number` | ✓ | - | Open tab count for the description |
| tabs | `Map<number, OpenTabInfo>` | ✓ | - | Open tabs by ID, for titles and domains |
| tidy | `UseTabTidyResult` | ✓ | - | Suggestions, selection and `apply` from `useTabTidy` |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Dialog open state changes |

**Usage:**

```tsx
// tidy = useTabTidy(snapshot); tabsById = new Map(snapshot.tabs.map((tab) => [tab.tabId, tab]))
<TabTidyDialog open={tidyOpen} tabCount={snapshot.stats.total} tabs={tabsById} tidy={tidy} onOpenChange={setTidyOpen} />
```

**Behavior:**

- Groups in order: close duplicates, archive low-value pages, move to Read later, archive idle tabs, then one "Fold into workspace" group per suggestion; empty groups are hidden, and "Nothing to tidy up right now" shows when there is no suggestion.
- Each group (internal `TidyGroup`) has a tri-state checkbox and a hint and starts collapsed; expanding lists every tab with its own checkbox, title and domain.
- "Apply selected (N)" is disabled while applying or when nothing is selected, shows a spinner while applying, and closes the dialog when `tidy.apply()` resolves `true`.
- Applying creates a workspace per workspace group and archives those tabs, queues Read later tabs and closes them, and archives the rest; every archive uses the reason `triage`.

### TabAITriageDialog

AI tidy-up dialog, opened from "AI tidy-up" in `OpenTabsStatsBar`: suggestions grouped by destination (keep, read later, bookmark, workspace, close), based only on titles and cleaned URLs.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog visibility |
| snapshot | `OpenTabsSnapshot` | ✓ | - | Snapshot to analyze |
| tabs | `Map<number, OpenTabInfo>` | ✓ | - | Open tabs by ID, for the rows |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Dialog open state changes |
| onOpenAISettings | `() => void` | ✓ | - | "Set up AI" when no AI service is configured |

**Usage:**

```tsx
<TabAITriageDialog
  open={aiTriageOpen}
  snapshot={snapshot}
  tabs={tabsById}
  onOpenChange={setAITriageOpen}
  onOpenAISettings={onOpenAISettings}
/>
```

**Behavior:**

- Uses `useTabAITriage(snapshot)` and starts an analysis when it opens (from closed) with status `idle`; a finished result survives closing and reopening until it is applied, and "Analyze again" re-runs it (disabled while loading or applying).
- States: spinner with the tab count while loading; "needs an AI service" with a "Set up AI" button (`notConfigured`); a failure message with the error detail (`error`); "Nothing to tidy up" for an empty result.
- With a result, the description shows the analyzed count, a note lists cached, skipped (over the per-run limit) and failed counts, and one `TriageGroupSection` follows per destination; everything is preselected except tabs that local rules keep.
- "Apply selected (N)" is enabled only in `ready` with a selection and closes the dialog on success.
- Applying restarts the idle time of kept tabs, bookmarks (with the suggested category) or adds to a matching or new workspace before archiving, queues Read later tabs and archives `close` tabs; every archive uses the reason `triage`.
- Test IDs: `ai-triage-dialog`, `ai-triage-not-configured`, `ai-triage-apply`.

### TriageGroupSection

One destination of the AI tidy-up (in `aiTriage/`): a group checkbox and every tab with its target and reason; rendered by `TabAITriageDialog` for each entry of `useTabAITriage().groups`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| group | `TriageGroup` | ✓ | - | Destination and its suggestions |
| tabs | `Map<number, OpenTabInfo>` | ✓ | - | Open tabs by ID; suggestions for tabs not in it are skipped |
| selected | `ReadonlySet<number>` | ✓ | - | Selected tab IDs |
| onToggle | `(tabIds: number[], selected: boolean) => void` | ✓ | - | Select or deselect tabs |

**Usage:**

```tsx
<TriageGroupSection
  key={group.destination}
  group={group}
  tabs={tabs}
  selected={triage.selected}
  onToggle={triage.toggle}
/>
```

**Behavior:**

- Renders nothing when none of the group's tabs is in `tabs` any more.
- Starts expanded except for the `keep` group; the header shows the destination with its count and a hint (for `workspace`, the quoted workspace names).
- The tri-state group checkbox toggles every visible tab of the group.
- Each row (internal `TriageRow`) shows the title, "→ category" for bookmarks ("Uncategorized" when none) or "→ workspace", and "domain · reason"; tabs decided by local rules show the localized local reason instead of the AI reason.
- Test ID: `ai-triage-group-<destination>`.

### TabWeeklyOverviewDialog

"This week" dialog opened from `TabCenterHeader`: open tabs over the last 7 days, time over budget, and archive / Read later counts. Local stats of this device only.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog visibility; the overview loads while open |
| budgetLimit | `number` | | - | Tab budget limit while the budget is on |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Dialog open state changes |

**Usage:**

```tsx
<TabWeeklyOverviewDialog
  open={overviewOpen}
  budgetLimit={lifecycle.settings.budget.enabled ? lifecycle.settings.budget.limit : undefined}
  onOpenChange={setOverviewOpen}
/>
```

**Behavior:**

- Fetches `getTabWeeklyOverview()` through `useTabWeeklyOverview(open)` each time it opens; a spinner shows until the first overview arrives.
- The open tabs section (internal `OpenTabsSection`) shows "average · peak" with the change against last week (or "Nothing recorded yet") above `WeeklyOpenTabsChart`.
- When sampling is off (activity tracking disabled), a dashed "not counted" note replaces the summary and the chart.
- With `budgetLimit` and sampling on, adds "Over budget for <duration> this week" or "Never over budget this week".
- `OverviewStatGrid` follows; a "Stats just started" note shows while `trackedDays <= 1`.

### WeeklyOpenTabsChart

Bar chart (in `overview/`) with one column per day: the light bar is the peak, the solid bar the time-weighted average, and a dashed line marks the tab budget; rendered by `TabWeeklyOverviewDialog` while sampling is on.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| days | `TabStatsDayPoint[]` | ✓ | - | Days, oldest first, ending today |
| budgetLimit | `number` | | - | Budget limit, shown as a line |

**Usage:**

```tsx
<WeeklyOpenTabsChart days={overview.days} budgetLimit={budgetLimit} />
```

**Behavior:**

- 120px high; bars scale to the largest of 1, `budgetLimit` and the highest peak, plus 10% headroom.
- Days with a peak of 0 show a flat placeholder; each column's tooltip gives "average, peak", or "Nothing recorded" when `averageOpen` is null.
- The last column is labeled "Today", the others with the short weekday in the UI language; a legend explains Average and Peak.
- Test ID: `weekly-open-tabs-chart`.

### OverviewStatGrid

Two cards (in `overview/`) with the week's counts: Archive (auto archived, archived by you, restored) and Read later (added, finished, expired); rendered by `TabWeeklyOverviewDialog`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| overview | `TabWeeklyOverview` | ✓ | - | Weekly overview with the counts |

**Usage:**

```tsx
<OverviewStatGrid overview={overview} />
```

**Behavior:**

- Reads `autoArchived`, `manualArchived`, `restored`, `readLaterAdded`, `readLaterRead` and `readLaterExpired`; values use tabular numbers.
- Two columns from the `sm` breakpoint, stacked below; each value has `data-testid="overview-<key>"`.

### TabArchiveView

The tab center's Archive view, rendered by `TabCenterPage`: every tab HamHome closed, grouped by day and batch, searchable and filterable, virtualized for up to 10,000 entries, with restore / Read later / bookmark / workspace / delete per entry or in batch.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| header | `ReactNode` | ✓ | - | Shared tab center header rendered at the top |

**Usage:**

```tsx
<TabArchiveView header={header} />
```

**Behavior:**

- Data and actions come from `useTabArchive`; a "Latest: time · reason · N tabs" card offers "Restore this batch" for the newest batch that still has entries.
- `BatchSelectionToolbar` (select all covers the filtered entries) holds restore, Read later, bookmark, add to workspace and delete; they are disabled without a selection and clear it when done.
- Deleting more than one entry asks for a destructive confirmation first; a single delete from a row does not.
- Restoring one entry from its row also switches to the restored tab (`restore([id], true)`); batch restores do not switch.
- A row's bookmark opens `WorkspacePageBookmarkDialog` (the save panel), while the batch bookmark saves in the background; rows show "Bookmarked" when the normalized URL is already in the library.
- Empty state (`archive-empty`): "The archive is empty…" without entries, "No tabs match" when filters hide everything.

### ArchiveToolbar

Search and filters above the archive list: search (titles and URLs), reason, domain and time; rendered by `TabArchiveView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| filter | `ArchiveFilterState` | ✓ | - | Current `query`, `reason`, `domain` and `dateGroup` |
| domains | `string[]` | ✓ | - | Domains present in the archive |
| onChange | `(patch: Partial<ArchiveFilterState>) => void` | ✓ | - | Called with the changed field only |

**Usage:**

```tsx
<ArchiveToolbar filter={archive.filter} domains={archive.domains} onChange={archive.setFilter} />
```

**Behavior:**

- Each select (internal `ToolbarSelect`) starts with an "all" option: reasons from `ARCHIVE_REASONS`, the first 200 of `domains`, and Today / Yesterday / This week / Earlier.
- The search field calls `onChange({ query })` on every keystroke.
- Test ID: `archive-search` on the search input.

### ArchiveDateHeader

Day group heading of the archive list, e.g. "Today (12)"; exported from `ArchiveListHeaders.tsx` and rendered by `TabArchiveView` for `date` rows.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| group | `ArchiveDateGroup` | ✓ | - | `"today"`, `"yesterday"`, `"week"` or `"earlier"` |
| count | `number` | ✓ | - | Entries in the group |

**Usage:**

```tsx
<ArchiveDateHeader group={row.group} count={row.count} />
```

**Behavior:**

- Props are typed inline (`{ group: ArchiveDateGroup; count: number }`); the label comes from `tabCenter.archive.dateGroups.<group>`.
- Display only: no actions.

### ArchiveBatchHeader

Batch block header of the archive list ("10:32 · Idle too long · 6 tabs · Restore this batch"); exported from `ArchiveListHeaders.tsx` and rendered by `TabArchiveView` for `batch` rows.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| batch | `TabArchiveBatch` | | - | Batch record; time and reason are omitted when missing |
| count | `number` | ✓ | - | Entries of the batch in this block |
| selectedCount | `number` | ✓ | - | Selected entries of this block |
| onToggleAll | `(selected: boolean) => void` | ✓ | - | Select or deselect the block |
| onRestore | `() => void` | ✓ | - | "Restore this batch" |

**Usage:**

```tsx
<ArchiveBatchHeader
  batch={row.batch}
  count={row.entryIds.length}
  selectedCount={row.entryIds.filter((id) => selectedIds.has(id)).length}
  onToggleAll={(value) =>
    value
      ? selectAll(Array.from(new Set([...selectedIds, ...row.entryIds])))
      : selectAll(Array.from(selectedIds).filter((id) => !row.entryIds.includes(id)))
  }
  onRestore={() => void archive.restore(row.entryIds)}
/>
```

**Behavior:**

- Shows the close time, the reason, "automatic" for automatic batches and "N tabs", then a "Restore this batch" button.
- The checkbox is unchecked, indeterminate or checked from `selectedCount` vs `count`.
- In `TabArchiveView`, `onRestore` restores only the entries listed in this block (`row.entryIds`), so active filters apply.

### ArchiveEntryRow

One archived tab (memoized): title, domain, idle time when closed, close time, reason, close count and row actions; rendered by `TabArchiveView` for `entry` rows.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| entry | `TabArchiveEntry` | ✓ | - | Archived tab |
| selected | `boolean` | ✓ | - | Row is selected |
| bookmarked | `boolean` | ✓ | - | URL is already in the library |
| onToggleSelect | `(id: string) => void` | ✓ | - | Checkbox toggled |
| onRestore | `(entry: TabArchiveEntry) => void` | ✓ | - | Title click or restore button |
| onReadLater | `(entry: TabArchiveEntry) => void` | ✓ | - | Read later button |
| onBookmark | `(entry: TabArchiveEntry) => void` | ✓ | - | Bookmark button |
| onWorkspace | `(entry: TabArchiveEntry) => void` | ✓ | - | Add to workspace button |
| onDelete | `(entry: TabArchiveEntry) => void` | ✓ | - | Delete button |

**Usage:**

```tsx
<ArchiveEntryRow
  entry={row.entry}
  selected={selectedIds.has(row.entry.id)}
  bookmarked={libraryUrls.has(normalizeBookmarkUrl(row.entry.url))}
  onToggleSelect={toggleSelect}
  onRestore={(entry) => void archive.restore([entry.id], true)}
  onReadLater={(entry) => void archive.readLater([entry.id])}
  onBookmark={setBookmarkEntry}
  onWorkspace={(entry) => setWorkspaceEntries([entry])}
  onDelete={(entry) => void removeEntries([entry.id])}
/>
```

**Behavior:**

- Clicking the title calls `onRestore` (URL in the tooltip).
- Meta line: domain, "idle <duration>" (`closedAt - lastActiveAt`), close time, reason badge, "archived N times" when `closeCount > 1`, and a green "Bookmarked" badge.
- Five icon actions (internal `RowAction`: restore, Read later, bookmark, workspace, delete) sit at 60% opacity until hover or focus.
- Test ID: `archive-entry-row`.

### TabRulesView

The tab center's Rules view, rendered by `TabCenterPage`: cards for activity tracking, auto archive and protections, archive retention and the tab budget.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| header | `ReactNode` | ✓ | - | Shared tab center header rendered at the top |
| snapshot | `OpenTabsSnapshot \| null` | ✓ | - | Open tabs snapshot, for the locked tabs list |
| lifecycle | `UseTabLifecycleSettingsResult` | ✓ | - | Settings, state and setters from `useTabLifecycleSettings` |
| onEnableAutoArchive | `() => void` | ✓ | - | Auto archive switch turned on |
| onResumeNudge | `() => void` | ✓ | - | "Resume hints" for paused budget hints |

**Usage:**

```tsx
<TabRulesView
  header={header}
  snapshot={snapshot}
  lifecycle={lifecycle}
  onEnableAutoArchive={enableAutoArchive}
  onResumeNudge={() => void getBackgroundService().resumeBudgetNudge()}
/>
```

**Behavior:**

- Turning auto archive on calls `onEnableAutoArchive` (the page may show the onboarding first); turning it off calls `lifecycle.setAutoArchiveEnabled(false)` directly.
- While auto archive is active, the switch row shows the last sweep: archived count, archive write error, or why it was skipped (tracking off, inactive, startup grace, minimum open tabs).
- Locked tabs come from `snapshot` (none while it is `null`) and unlock via `useOpenTabActions().setLocked([tabId], false)`; the archive count and "Clear archive" come from `useTabArchiveCount`.
- Budget hints count as paused while `state.budgetNudge` has a `dismissedDate` or a future `snoozedUntil`.
- Other options are saved with `lifecycle.update(...)`; the grouped-tab protection is offered only when `chrome.tabGroups` exists.

### ActivityTrackingCard

Rules card for local tab activity tracking: what it is for, where it is stored, and the switch; rendered by `TabRulesView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| enabled | `boolean` | ✓ | - | Activity tracking is on |
| onChange | `(enabled: boolean) => Promise<void>` | ✓ | - | Turn tracking on or off |

**Usage:**

```tsx
<ActivityTrackingCard enabled={settings.activityTracking} onChange={lifecycle.setActivityTracking} />
```

**Behavior:**

- Turning it on calls `onChange(true)` right away.
- Turning it off first asks for a destructive confirmation ("Turn off and wipe"), since tracking stops and the recorded activity is wiped; cancelling leaves it on.

### AutoArchiveCard

Rules card for auto archive: switch, idle threshold, usage-day counting, mode, optional protections, protected domains and locked tabs; rendered by `TabRulesView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| rule | `TabAutoArchiveSettings` | ✓ | - | Auto archive settings |
| active | `boolean` | ✓ | - | Auto archive is effective on this device (switch state) |
| trackingEnabled | `boolean` | ✓ | - | Activity tracking is on |
| supportsGroups | `boolean` | ✓ | - | Browser supports tab groups |
| lockedTabs | `OpenTabInfo[]` | ✓ | - | Currently locked tabs |
| lastSweepText | `string` | | - | Last sweep summary under the switch |
| onToggle | `(enabled: boolean) => void` | ✓ | - | Switch toggled |
| onChange | `(patch: Partial<TabAutoArchiveSettings>) => void` | ✓ | - | A setting changed |
| onAddDomain | `(input: string) => Promise<boolean>` | ✓ | - | Add a protected domain; resolves `false` for invalid input |
| onRemoveDomain | `(domain: string) => void` | ✓ | - | Remove a protected domain |
| onUnlock | `(tabId: number) => void` | ✓ | - | Unlock a locked tab |

**Usage:**

```tsx
<AutoArchiveCard
  rule={settings.autoArchive}
  active={lifecycle.autoArchiveActive}
  trackingEnabled={settings.activityTracking}
  supportsGroups={supportsGroups}
  lockedTabs={lockedTabs}
  lastSweepText={lifecycle.autoArchiveActive ? sweepText(state.lastSweep) : undefined}
  onToggle={(enabled) => (enabled ? onEnableAutoArchive() : void lifecycle.setAutoArchiveEnabled(false))}
  onChange={(patch) => void lifecycle.update({ autoArchive: patch })}
  onAddDomain={lifecycle.addProtectedDomain}
  onRemoveDomain={(domain) => void lifecycle.removeProtectedDomain(domain)}
  onUnlock={(tabId) => void actions.setLocked([tabId], false)}
/>
```

**Behavior:**

- Without activity tracking the switch is disabled, its row dimmed, and the hint reads "Turn on activity tracking first"; otherwise `lastSweepText` is shown.
- Idle threshold options come from `IDLE_THRESHOLD_OPTIONS` (12 hours, 1/3/7/14/30 days); the "Count" select (usage days / calendar days) only appears for day thresholds.
- Mode: Archive (`auto`), Ask first (`confirm`) or Mark only (`mark-only`), each with its own hint.
- Protection: an always-on note, switches for audible tabs, grouped tabs (only with `supportsGroups`) and unsaved input, plus "Keep at least this many tabs" (0 to `MIN_OPEN_TABS_MAX` = 50) via `NumberSettingInput`.
- Ends with `ProtectedDomainsEditor` and the locked tabs list, each with an "Unlock" button (or a hint when none is locked).
- Test ID: `auto-archive-switch`.

### ArchiveRetentionCard

Rules card for how long archived tabs are kept, with "Clear archive"; rendered by `TabRulesView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| retentionDays | `TabArchiveRetentionDays` | ✓ | - | `30`, `90`, `180` or `null` (forever) |
| entryCount | `number` | ✓ | - | Entries currently in the archive |
| onChange | `(retentionDays: TabArchiveRetentionDays) => void` | ✓ | - | Retention selected |
| onClear | `() => Promise<void>` | ✓ | - | Clear the whole archive |

**Usage:**

```tsx
<ArchiveRetentionCard
  retentionDays={settings.archive.retentionDays}
  entryCount={archive.count}
  onChange={(retentionDays) => void lifecycle.update({ archive: { retentionDays } })}
  onClear={archive.clear}
/>
```

**Behavior:**

- "Keep for" offers 30, 90 and 180 days or Forever (`null`); the description names the `ARCHIVE_MAX_ENTRIES` cap (10,000).
- "Clear archive" shows the entry count, is disabled when it is 0, and calls `onClear` only after a destructive confirmation.

### TabBudgetCard

Rules card for the tab budget: switch, limit, counting scope, what happens over budget and the icon badge; rendered by `TabRulesView`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| budget | `TabBudgetSettings` | ✓ | - | Budget settings |
| autoMakeRoomActive | `boolean` | ✓ | - | Automatic make room is effective on this device |
| nudgePaused | `boolean` | ✓ | - | Budget hints are dismissed or snoozed |
| onChange | `(patch: Partial<TabBudgetSettings>) => void` | ✓ | - | A setting changed |
| onOverActionChange | `(action: TabBudgetOverAction) => void` | ✓ | - | Over-budget action selected |
| onResumeNudge | `() => void` | ✓ | - | "Resume hints" |

**Usage:**

```tsx
<TabBudgetCard
  budget={settings.budget}
  autoMakeRoomActive={lifecycle.autoMakeRoomActive}
  nudgePaused={nudgePaused}
  onChange={(patch) => void lifecycle.update({ budget: patch })}
  onOverActionChange={(action) => void lifecycle.setOverBudgetAction(action)}
  onResumeNudge={onResumeNudge}
/>
```

**Behavior:**

- The limit uses `NumberSettingInput` (`BUDGET_LIMIT_MIN`–`BUDGET_LIMIT_MAX`, 5–100); scope is all windows or each window.
- Over-budget action: Icon only (`badge-only`), In-page hint (`nudge`) or Make room (`auto-archive`); choosing Make room asks for confirmation before `onOverActionChange`.
- A stored `auto-archive` action that is not active on this device shows as `nudge`.
- "Show the tab count on the icon" appears only while the budget is off; a "Resume hints" row appears while `nudgePaused`.
- Test ID: `budget-switch`.

### ProtectedDomainsEditor

Input plus removable badges for domains whose tabs are never closed automatically; rendered inside `AutoArchiveCard`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| domains | `string[]` | ✓ | - | Protected domains |
| disabled | `boolean` | | - | Disables the input and the Add button |
| onAdd | `(input: string) => Promise<boolean>` | ✓ | - | Add the typed domain; resolve `false` when it is invalid |
| onRemove | `(domain: string) => void` | ✓ | - | Remove a domain |

**Usage:**

```tsx
<ProtectedDomainsEditor domains={rule.protectedDomains} onAdd={onAddDomain} onRemove={onRemoveDomain} />
```

**Behavior:**

- Adds on the "Add" button or Enter; blank input is ignored.
- When `onAdd` resolves `false`, shows "Enter a valid domain" and sets `aria-invalid`, keeping the text; success clears the input, and typing clears the error.
- Lists the domains as badges with a remove button, or "No protected domains yet"; `disabled` does not affect the remove buttons.

### NumberSettingInput

Number field (in `rules/`) that keeps a draft while typing and commits a clamped value on blur or Enter, so typing "15" does not stop at "1"; used by `AutoArchiveCard` and `TabBudgetCard`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| id | `string` | | - | Input ID, for a `RuleRow` label |
| value | `number` | ✓ | - | Committed value |
| min | `number` | ✓ | - | Lower bound |
| max | `number` | ✓ | - | Upper bound |
| onCommit | `(value: number) => void` | ✓ | - | Called with the new value |

**Usage:**

```tsx
<NumberSettingInput
  id="budget-limit"
  value={budget.limit}
  min={BUDGET_LIMIT_MIN}
  max={BUDGET_LIMIT_MAX}
  onCommit={(limit) => onChange({ limit })}
/>
```

**Behavior:**

- On blur or Enter the draft is rounded and clamped to `[min, max]` (`resolveNumberDraft`); an empty field or non-numeric input falls back to `value`, so clearing the field to retype never commits the minimum.
- `onCommit` fires only when the result differs from `value`; the draft resyncs whenever `value` changes.

### RuleRow

Layout row of the rules cards (in `rules/`): label and optional description on the left, a control on the right; used by every rules card.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| label | `string` | ✓ | - | Row label |
| description | `string` | | - | Hint under the label |
| htmlFor | `string` | | - | ID of the control the label belongs to |
| disabled | `boolean` | | - | Dims the row |
| children | `ReactNode` | ✓ | - | Control on the right |

**Usage:**

```tsx
<RuleRow label={t("bookmark:tabCenter.rules.budget.enable")} htmlFor="budget-enabled">
  <Switch id="budget-enabled" checked={budget.enabled} onCheckedChange={(value) => onChange({ enabled: value })} />
</RuleRow>
```

**Behavior:**

- `disabled` only dims the row (60% opacity); the child control has to be disabled separately.
- The description is omitted when empty, and the row wraps on narrow widths.

---

## readLater

The Read later page (route `#read-later`) is a reading queue kept as a state of a bookmark: queue-only items stay out of library views, and unread items expire after N days (14, 30, 60 or never).

### ReadLaterPage

The Read later queue page, lazy-loaded by `entrypoints/app/App.tsx` for the `read-later` view. It composes `useReadLaterQueue` with the header, `ReadLaterStats`, `ReadLaterToolbar`, `BatchSelectionToolbar`, a virtualized `ReadLaterCard` list and `ReadLaterTriageDialog`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| currentView | `string` | ✓ | - | Hash view, e.g. `"read-later?q=pricing"`; its `q` parameter seeds the search box |

**Usage:**

```tsx
// entrypoints/app/App.tsx, "read-later" case (lazy import inside <Suspense>)
<ReadLaterPage currentView={currentView} />
```

**Behavior:**

- Search starts from the hash `q` value (initial value only; typing does not write back to the hash) and matches title, URL, description and note; every term must match.
- "Triage" opens `ReadLaterTriageDialog` and is disabled when nothing is unread; the dialog only gets items while the Unread view is active. Clicking the expiring-soon stat switches to Unread sorted by "Expiring soon".
- Batch bar: "Mark as read" (Unread view) or "Add again" (Read / Expired views), "Keep in library" and "Delete", applied to the selected items visible in the current list. Selection clears on view change and after each batch action.
- Deleting more than one item asks for confirmation first; queue-only items go to the trash, library bookmarks only leave the queue. Keep from a card or from triage passes `classify: true` (AI fills in empty category / tags / summary); batch keep passes `false`.
- Every action runs through the background service and shows a success toast (e.g. "Marked 2 as read") or "Something went wrong, please try again".
- The list is virtualized (`useScrollAreaVirtualList`, 112px estimate, 8px gap). Empty states: "Nothing matches your search" while searching, otherwise one per view; the Unread view also shows the `read-later-close` shortcut (falls back to `Alt+Shift+R`).

### ReadLaterCard

One item of the read later queue, rendered by `ReadLaterPage` for each virtual row; exported wrapped in `memo`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| item | `ReadLaterItem` | ✓ | - | Queue entry joined with its bookmark and domain |
| selected | `boolean` | ✓ | - | Checkbox state; also highlights the card |
| expireAfterDays | `ReadLaterExpireAfterDays` | ✓ | - | Expiry setting used for the days-left hint |
| onToggleSelect | `() => void` | ✓ | - | Checkbox toggled |
| onOpen | `() => void` | ✓ | - | Title or "Read" clicked |
| onMarkRead | `() => void` | ✓ | - | "Mark as read" (unread / reading items) |
| onKeep | `() => void` | ✓ | - | "Keep in library" (queue-only items) |
| onRequeue | `() => void` | ✓ | - | "Add again" (read / expired items) |
| onRemove | `() => void` | ✓ | - | Delete, or remove from Read later for library bookmarks |
| onSaveNote | `(note: string) => void` | ✓ | - | Edited note committed |

**Usage:**

```tsx
<ReadLaterCard
  item={item}
  selected={selectedIds.has(id)}
  expireAfterDays={queue.settings.expireAfterDays}
  onToggleSelect={() => toggleSelect(id)}
  onOpen={() => void queue.open(id)}
  onMarkRead={() => void queue.markRead([id])}
  onKeep={() => void queue.keep([id], true)}
  onRequeue={() => void queue.requeue([id])}
  onRemove={() => void removeWithConfirm([id])}
  onSaveNote={(note) => void queue.updateNote(id, note)}
/>
```

**Behavior:**

- The title (falls back to the URL) and the "Read" action call `onOpen`; the page opens the item in a new tab and marks it as reading.
- Meta row (internal `ReadLaterMeta`): domain, "added X ago", "~N min" when estimated, and for unread / reading items "expires in N days" or "expires today" (amber at 3 days or less, absent when expiry is "Never"); badges for "Reading", a non-manual source, "In library" (not queue-only) and "Snapshot not saved".
- Shows the bookmark description (the TL;DR) and the "why read" note, each clamped to two lines.
- Actions follow the state: "Mark as read" for unread / reading, "Add again" for read / expired, "Keep in library" only for queue-only items. The trash button reads "Delete" for queue-only items and "Remove from Read later" for library bookmarks.
- "Add a note" turns the note into an inline input (max 200 characters). Enter or blur commits, calling `onSaveNote` only when the trimmed text differs from the saved note; Escape closes the input.

### ReadLaterSettingsMenu

Read later settings dropdown in the `ReadLaterPage` header.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| settings | `ReadLaterSettings` | ✓ | - | Current read later settings |
| onChange | `(patch: Partial<ReadLaterSettings>) => void` | ✓ | - | Called with the changed field only |

**Usage:**

```tsx
<ReadLaterSettingsMenu settings={queue.settings} onChange={(patch) => void queue.updateSettings(patch)} />
```

**Behavior:**

- Trigger: an outline "Read later settings" button (`data-testid="read-later-settings"`).
- Checkboxes: "Close the tab after adding" (`closeTabOnAdd`) and "Save an offline snapshot when adding" (`saveSnapshotOnAdd`).
- Radio groups: "Expire unread items after" 14 / 30 / 60 days or Never (`READ_LATER_EXPIRY_OPTIONS`, Never is `null`), and "AI summary (TL;DR)": only for single manual adds, for every add, or off (`autoSummary`).
- Each change calls `onChange` with just that field; the page saves it with `useReadLaterQueue().updateSettings` (`tabLifecycleConfigStorage`).

### ReadLaterStats

Queue health strip under the `ReadLaterPage` header.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| unread | `number` | ✓ | - | Unread count (unread and reading items) |
| expiringSoon | `number` | ✓ | - | Pending items expiring within 3 days |
| completion | `{ read: number; expired: number; rate: number \| null }` | ✓ | - | Last 30 days; `rate` is `null` when nothing was read or expired |
| onShowExpiring | `() => void` | ✓ | - | Expiring-soon hint clicked |

**Usage:**

```tsx
<ReadLaterStats
  unread={queue.counts.unread}
  expiringSoon={queue.expiringSoon}
  completion={queue.completion}
  onShowExpiring={() => {
    queue.setView("unread");
    queue.setSort("expiring");
  }}
/>
```

**Behavior:**

- Always shows "N unread".
- "N items expire within 3 days" shows only when `expiringSoon > 0`, as an amber button (`data-testid="read-later-expiring-soon"`) that calls `onShowExpiring`.
- Completion as "Completion in the last 30 days: X% (R read / E expired)", with `rate` rounded to a whole percent; "Nothing read or expired in the last 30 days" when `rate` is `null`.

### ReadLaterToolbar

View tabs, sort and filters of `ReadLaterPage`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| view | `ReadLaterView` | ✓ | - | Active view tab |
| counts | `Record<ReadLaterView, number>` | ✓ | - | Item count per view, shown in each tab |
| sort | `ReadLaterSort` | ✓ | - | Current sort |
| filters | `ReadLaterFilters` | ✓ | - | Domain / source / kept filters |
| domains | `string[]` | ✓ | - | Domains offered by the domain filter |
| onViewChange | `(view: ReadLaterView) => void` | ✓ | - | View tab changed |
| onSortChange | `(sort: ReadLaterSort) => void` | ✓ | - | Sort changed |
| onFiltersChange | `(patch: Partial<ReadLaterFilters>) => void` | ✓ | - | Called with the changed filter only |

**Usage:**

```tsx
<ReadLaterToolbar
  view={queue.view}
  counts={queue.counts}
  sort={queue.sort}
  filters={queue.filters}
  domains={queue.domains}
  onViewChange={queue.setView}
  onSortChange={queue.setSort}
  onFiltersChange={queue.setFilters}
/>
```

**Behavior:**

- Tabs for Unread / Read / Expired, each with its count (`data-testid="read-later-view-<view>"`).
- Sort: Newest first, Oldest first, Shortest read first, Expiring soon.
- Filters: domain ("All domains" plus `domains`), source ("All sources" plus manual, link, tab-center, archive, triage, agent, import) and "In library" (All / In library / Queue only).
- All four selects are the internal `FilterSelect`; its label is only the trigger's `aria-label`, so the trigger shows the current value.

### ReadLaterTriageDialog

Keyboard-driven dialog for clearing unread items one card at a time, opened by the "Triage" button of `ReadLaterPage`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| open | `boolean` | ✓ | - | Dialog open state |
| items | `ReadLaterItem[]` | ✓ | - | Cards to go through, in list order |
| onOpenChange | `(open: boolean) => void` | ✓ | - | Open state changed |
| onRead | `(bookmarkId: string) => void` | ✓ | - | Read (R) |
| onKeep | `(bookmarkId: string) => void` | ✓ | - | Keep in library (S) |
| onMarkRead | `(bookmarkId: string) => void` | ✓ | - | Mark read (D) |
| onRemove | `(bookmarkId: string) => void` | ✓ | - | Delete (X) |

**Usage:**

```tsx
<ReadLaterTriageDialog
  open={triageOpen}
  items={queue.view === "unread" ? queue.items : []}
  onOpenChange={setTriageOpen}
  onRead={(id) => void queue.open(id)}
  onKeep={(id) => void queue.keep([id], true)}
  onMarkRead={(id) => void queue.markRead([id])}
  onRemove={(id) => void queue.remove([id])}
/>
```

**Behavior:**

- Starts at the first card each time it opens and shows "i / n · domain · added X ago", the title, the description (up to five lines) and the note; "All done" when there are no items.
- Keys and matching buttons (internal `TriageButton`): R read (opens it in a new tab, then moves on), S keep in library (queue-only items only, then moves on; the button is disabled otherwise), D mark read, X delete, J / K next / previous.
- D and X do not advance: the item leaves the unread list and the next one takes its place (the index is clamped to the list length).
- Keys are ignored with Cmd / Ctrl / Alt held or while typing in an input or textarea.

## popup (tab lifecycle)

Cards added to the popup (`components/popup/QuickPanel.tsx`) for open tabs and Read later.

### PopupTabsCard

Tabs overview card in the popup, between the quick actions and the recent list.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| snapshot | `OpenTabsSnapshot \| null` | ✓ | - | Open tabs snapshot; nothing renders while `null` |
| recent | `TabArchiveRecentSummary` | ✓ | - | Automatic archive batches of the last 24 hours |
| needsConsent | `boolean` | ✓ | - | Auto archive / auto make-room waits for this device's consent |
| onboardingDone | `boolean` | ✓ | - | Tab lifecycle onboarding completed |
| triageOpen | `boolean` | ✓ | - | Tidy up panel expanded |
| onToggleTriage | `() => void` | ✓ | - | "Tidy up" clicked |
| onViewArchive | `() => void` | ✓ | - | "View" on the archived-today line |
| onRestoreRecent | `() => void` | ✓ | - | "Restore all" on the archived-today line |
| onConfirmPending | `() => void` | ✓ | - | "Archive all" on the pending line |
| onOpenTabCenter | `() => void` | ✓ | - | "View" (pending), "Review" and "Set up" links |

**Usage:**

```tsx
<PopupTabsCard
  snapshot={snapshot}
  recent={recentArchive.summary}
  needsConsent={lifecycle.pendingConsents.autoArchive || lifecycle.pendingConsents.autoMakeRoom}
  onboardingDone={!!lifecycle.state.onboardingCompletedAt}
  triageOpen={triageOpen}
  onToggleTriage={() => setTriageOpen((open) => !open)}
  onViewArchive={() => openTab(getExtensionURL("app.html#tabs?view=archive"))}
  onRestoreRecent={() => {
    void recentArchive.restoreAll().then((count) =>
      toast.success(t("bookmark:tabCenter.archive.restored", { count })),
    );
  }}
  onConfirmPending={() => void tabActions.confirmPending()}
  onOpenTabCenter={() => openTab(getExtensionURL("app.html#tabs"))}
/>
```

**Behavior:**

- Renders nothing until `snapshot` loads. The header shows `count / limit` with the tab budget on (red when over, plus "N over"), otherwise the total number of open tabs.
- With the budget on, a progress bar colored by `budget.level` (emerald normal, amber warning, red over), capped at 100%.
- Summary line "N not opened for over <threshold> · M duplicate groups" (threshold from the auto archive rule) with a "Tidy up" toggle (`aria-expanded`, rotating chevron) that calls `onToggleTriage`.
- Conditional lines: "N tabs archived today · View · Restore all" when `recent.count > 0`; "N tabs waiting to be archived · View · Archive all" for `snapshot.pendingConfirm`; a consent notice with "Review" when `needsConsent`; "Let idle tabs leave the tab bar automatically · Set up" when onboarding is not done and both auto archive and the budget are off.

### PopupTriagePanel

The "Tidy up" panel the popup shows under `PopupTabsCard` while `triageOpen` is true.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| tabs | `OpenTabInfo[]` | ✓ | - | Tabs to offer, already sorted; the first 8 are shown |
| onReadLater | `(tabId: number) => void` | ✓ | - | Row "Read later" |
| onBookmark | `(tabId: number) => void` | ✓ | - | Row "Bookmark" |
| onArchive | `(tabId: number) => void` | ✓ | - | Row "Archive & close" |
| onViewAll | `() => void` | ✓ | - | "View all (N)" clicked |

**Usage:**

```tsx
{triageOpen && (
  <PopupTriagePanel
    tabs={triageTabs}
    onReadLater={(tabId) => void tabActions.readLater([tabId])}
    onBookmark={(tabId) => void tabActions.bookmark([tabId])}
    onArchive={(tabId) => void tabActions.archive([tabId])}
    onViewAll={() => openTab(getExtensionURL("app.html#tabs"))}
  />
)}
```

**Behavior:**

- Lists the first 8 of `tabs` (the popup passes unprotected tabs, least recently used first) with favicon, title and idle time from `displayLastActiveAt`.
- In the popup, "Read later" (source `tab-center`) and "Archive & close" close the tab and show a toast with Undo; "Bookmark" keeps the tab open.
- "No tabs to tidy up" when `tabs` is empty. The footer "View all (N)" counts every tab in `tabs`, not only the eight shown; the popup opens the tab center.

### PopupRecentSection

Tabbed "Recently saved | Read later (N)" list in the popup, below the tabs card.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| recentBookmarks | `LocalBookmark[]` | ✓ | - | Recently saved bookmarks |
| readLaterItems | `ReadLaterItem[]` | ✓ | - | Read later items to list |
| readLaterCount | `number` | ✓ | - | Pending count shown in the tab label |
| onOpenBookmark | `(bookmark: LocalBookmark) => void` | ✓ | - | Saved row clicked |
| onOpenReadLater | `(item: ReadLaterItem) => void` | ✓ | - | Read later row clicked |
| onViewAll | `(tab: RecentTab) => void` | ✓ | - | "View all" with the active tab (`RecentTab` is the file-local `"saves" \| "readLater"`) |

**Usage:**

```tsx
<PopupRecentSection
  recentBookmarks={recentBookmarks}
  readLaterItems={readLaterQueue.slice(0, RECENT_LIMIT)}
  readLaterCount={readLaterQueue.length}
  onOpenBookmark={(bookmark) => openTab(bookmark.url)}
  onOpenReadLater={openReadLaterItem}
  onViewAll={(tab) =>
    openTab(getExtensionURL(tab === "readLater" ? "app.html#read-later" : "app.html"))
  }
/>
```

**Behavior:**

- Opens on "Recently saved"; the active tab is local state. The Read later tab has `data-testid="popup-read-later-tab"`.
- Rows show the favicon (hidden if it fails to load; a bookmark or book icon when missing), the title and a relative time (saved time, or time added to the queue).
- Each tab has its own empty state; the Read later one hints at "Read later & close" and right-clicking a link.
- In the popup the list holds the 5 newest pending items and `readLaterCount` is the full pending count; opening one calls `readLaterOpen` (new tab, marked as reading) and closes the popup.

## contentUi feedback

In-page UI rendered in the content script's shadow root (undo toasts, the tab budget nudge and the "finished reading?" bar); none of these components use a portal today, so any popover, tooltip, select or dialog added to them must portal into the container from `const { container: portalContainer } = useContentUI()`.

### TabFeedbackLayer

Renders the lifecycle feedback the background sends to this tab; mounted once in `components/contentUi/App.tsx`, outside the side panel gate, so it also works with the edge panel turned off.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| panelPosition | `PanelPosition` | ✓ | - | Side of the edge panel; feedback goes to the other bottom corner |

**Usage:**

```tsx
<TabFeedbackLayer panelPosition={panelPosition} />
```

**Behavior:**

- Reads `useTabFeedback()`; renders nothing without a message, otherwise one `FeedbackCard` keyed by `feedbackId`, so a new message replaces the current one.
- `budgetNudge` renders `BudgetNudge`, `readLater` renders `ReadLaterToast`, and `archived` renders an inline message ("Moved "Title" to the archive" or "Moved N tabs to the archive") with Undo (spinner while working, hidden once undone).
- The card sits in the bottom corner opposite the edge panel (`panelPosition === "right"` puts it on the left).
- Closes after 8 seconds unless hovered, focused, held while a note is being written, or an action is running; Esc closes it without swallowing the key from the page.
- Actions call the background service: undo (`undoTabAction`; an expired token shows the failed message), renew, save note, read later one tab (source `triage`, closes it) or archive it (reason `budget`), review all (opens the tab center), not today / pause for an hour (`dismissBudgetNudge`).

### FeedbackCard

Shared shell of the in-page toasts, the budget nudge and the reading bar; used by `TabFeedbackLayer` and `ReadingDoneBar`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| side | `"left" \| "right"` | ✓ | - | Bottom corner to pin to |
| role | `"status" \| "region"` | ✓ | - | `status` for toasts, `region` for the nudge and the reading bar |
| label | `string` | ✓ | - | Accessible label |
| closeLabel | `string` | ✓ | - | Title and `aria-label` of the close button |
| testId | `string` | ✓ | - | Value of `data-hamhome-tab-feedback` |
| className | `string` |  | - | Extra classes for the shell |
| onClose | `() => void` | ✓ | - | Close (X) clicked |
| onHoldChange | `(held: boolean) => void` | ✓ | - | `true` on hover / focus inside, `false` when it leaves |
| children | `ReactNode` | ✓ | - | Card body |

**Usage:**

```tsx
<FeedbackCard
  key={state.feedbackId}
  side={side}
  role="status"
  label={t("bookmark:tabFeedback.archived.label")}
  closeLabel={closeLabel}
  testId="archived"
  onClose={state.dismiss}
  onHoldChange={state.hold}
>
  {/* archived message and Undo button */}
</FeedbackCard>
```

**Behavior:**

- Fixed at `bottom-4` on the left or right, 360px wide (at most the viewport minus 2rem), `z-[100001]` (one layer above the in-page save overlay), sliding in from the bottom; it never takes focus on its own.
- `role="status"` also sets `aria-live="polite"`; `region` has no live region.
- Mouse enter / focus inside call `onHoldChange(true)` and mouse leave / blur call `onHoldChange(false)`, which pauses and resumes the parent's auto-close timer.
- `testId` is written to `data-hamhome-tab-feedback`, not `data-testid`.

### BudgetNudge

Body of the budget nudge that `TabFeedbackLayer` shows when the tab budget is exceeded; the file also exports the `BudgetNudgeCandidate` type (`{ tabId: number; title: string; lastActiveAt: number }`).

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| openCount | `number` | ✓ | - | Open tabs counted by the budget |
| over | `number` | ✓ | - | Tabs over the budget |
| candidates | `BudgetNudgeCandidate[]` | ✓ | - | Least recently used tabs |
| hideTitles | `boolean` | ✓ | - | Show "Tab N" instead of titles |
| handledTabIds | `ReadonlySet<number>` | ✓ | - | Candidates already handled in this nudge |
| status | `TabFeedbackStatus` | ✓ | - | Action status; `working` disables the row buttons |
| onReadLater | `(tabId: number) => void` | ✓ | - | Row "Read later" |
| onArchive | `(tabId: number) => void` | ✓ | - | Row "Archive & close" |
| onReviewAll | `() => void` | ✓ | - | "Review all" |
| onNotToday | `() => void` | ✓ | - | "Not today" |
| onSnooze | `() => void` | ✓ | - | "Pause for an hour" |

**Usage:**

```tsx
<BudgetNudge
  openCount={feedback.openCount}
  over={feedback.over}
  candidates={feedback.candidates}
  hideTitles={feedback.hideTitles}
  handledTabIds={state.handledTabIds}
  status={state.status}
  onReadLater={(tabId) => void state.readLaterTab(tabId)}
  onArchive={(tabId) => void state.archiveTab(tabId)}
  onReviewAll={state.openTabCenter}
  onNotToday={() => void state.dismissToday()}
  onSnooze={() => void state.snoozeHour()}
/>
```

**Behavior:**

- Headline "N tabs open, M over budget", then a "Least recently viewed:" list with each tab's idle time when there are candidates.
- Titles become "Tab 1", "Tab 2", … when `hideTitles` is set or a title is empty (private pages).
- Row buttons are disabled while `status` is `working`; a handled row is dimmed and shows "Done" in place of its buttons, and the card stays open for the next tab.
- Footer: "Review all", "Pause for an hour" and "Not today"; in `TabFeedbackLayer` all three close the card.

### ReadLaterToast

Body of the read later toast, rendered by `TabFeedbackLayer` for `readLater` messages (for example after "Read later & close").

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| title | `string` | ✓ | - | Page title |
| alreadyQueued | `boolean` | ✓ | - | The URL was already in the queue |
| addedAt | `number` | ✓ | - | Time added; the original time when already queued |
| canUndo | `boolean` | ✓ | - | An undo token exists |
| noteEditable | `boolean` | ✓ | - | Offer "Add a note" |
| status | `TabFeedbackStatus` | ✓ | - | Action status |
| onUndo | `() => void` | ✓ | - | "Undo" |
| onRenew | `() => void` | ✓ | - | "Renew" |
| onSaveNote | `(note: string) => void` | ✓ | - | Note submitted |
| onHoldChange | `(held: boolean) => void` | ✓ | - | Holds the auto-close timer while a note is written |

**Usage:**

```tsx
<ReadLaterToast
  title={feedback.title}
  alreadyQueued={feedback.alreadyQueued}
  addedAt={feedback.addedAt}
  canUndo={!!feedback.undoToken}
  noteEditable={feedback.noteEditable}
  status={state.status}
  onUndo={() => void state.undo()}
  onRenew={() => void state.renew()}
  onSaveNote={(note) => void state.saveNote(note)}
  onHoldChange={state.hold}
/>
```

**Behavior:**

- Headline "Added to Read later", or "Already in Read later (added X ago)" when `alreadyQueued`; after an undo or a failed action it reads "Undone" or "Something went wrong, please try again". The page title is shown below.
- Buttons: "Undo" when `canUndo` (spinner while working), "Renew" for already queued items (re-queues it as unread with a fresh expiry; hidden once done), "Add a note" when `noteEditable`. "Saved" appears after a successful renew or note; all buttons are disabled while working and the row disappears after an undo.
- "Add a note" swaps the buttons for an autofocused input (max 200 characters) and Save; starting a note calls `onHoldChange(true)`, submitting calls `onSaveNote` then `onHoldChange(false)`.

### ReadingDoneBar

"Finished reading?" bar for pages opened from Read later; mounted once in `components/contentUi/App.tsx` next to `TabFeedbackLayer`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| panelPosition | `PanelPosition` | ✓ | - | Side of the edge panel; the bar goes to the other bottom corner |

**Usage:**

```tsx
<ReadingDoneBar panelPosition={panelPosition} />
```

**Behavior:**

- Driven by `useReadingDoneBar`: only on pages the background reports as opened from the queue (not yet read, same URL); other pages render nothing.
- Appears once per page load, when the reader scrolls past 85% of the page or the pointer leaves through the top of the window, and only while still on the article URL.
- "Mark as read" marks the item read; "Keep in library" (queue-only items only) keeps it with AI classification and marks it read; "Not yet", the close button and Esc only hide the bar.
- After success it shows "Marked as read" or "Kept in your library and marked as read" and hides itself after 2.5 seconds; on failure the buttons stay for a retry.
- No auto-close timer: `onHoldChange` is a no-op.

## Other additions

Read later and tab lifecycle pieces in other component folders: the in-page edge panel, the in-page save overlay, the Privacy page and the Workspaces page.

### ReadLaterQuickSection

Read later quick list in the in-page edge panel (`BookmarkPanel`), below the pinned section.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| items | `ReadLaterQuickItem[]` | ✓ | - | Newest unread items |
| unreadCount | `number` | ✓ | - | All unread items, shown in the header |
| onOpen | `(bookmarkId: string) => void` | ✓ | - | Row clicked |
| onViewAll | `() => void` | ✓ | - | "View all" clicked |

**Usage:**

```tsx
{!hasFilters && (
  <ReadLaterQuickSection
    items={readLater.items}
    unreadCount={readLater.unreadCount}
    onOpen={(bookmarkId) => {
      readLater.open(bookmarkId);
      onClose();
    }}
    onViewAll={() => {
      readLater.openAll();
      onClose();
    }}
  />
)}
```

**Behavior:**

- Renders nothing when `items` is empty; `BookmarkPanel` also hides it while searching or filtering.
- Header "Read later · N unread" (N counts all unread items) with "View all", which opens the Read later page and closes the panel.
- Shows 3 rows, with a Show more / Show less toggle when there are more; the panel loads up to 8 items via `useReadLaterQuickList`, only while it is open.
- Each row (internal `QuickRow`) shows the favicon (book icon fallback), the title and "Reading · ~N min · domain" (each part only when known); clicking opens the item in a new tab, marks it as reading and closes the panel.

### ReadLaterInsteadButton

Header action of the in-page save overlay (`InPageSaveFlow`), next to the close button: put the page in Read later instead of saving it.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| onClick | `() => void` | ✓ | - | Button clicked |

**Usage:**

```tsx
{!clipContext && <ReadLaterInsteadButton onClick={readLaterInstead} />}
```

**Behavior:**

- Small ghost "Read later" button with the hint "Not ready to keep it? Put it in Read later (closes the tab as configured)" (`data-testid="inpage-save-read-later"`).
- Hidden when the overlay was opened for a clip (`clipContext` set).
- The overlay's handler closes the overlay and sends `readLaterThisTab` to the background, which adds the tab with source `manual`; the tab closes only when `closeTabOnAdd` is on and the tab is not pinned.

### TabActivityPrivacyCard

Card on the Privacy page (`PrivacyPage`) that discloses what tab activity tracking, the tab archive and the local stats record, and where they are kept.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| trackingEnabled | `boolean` | ✓ | - | Activity tracking is on; picks the description |
| onOpenRules | `() => void` | ✓ | - | Manage button clicked |

**Usage:**

```tsx
<TabActivityPrivacyCard
  trackingEnabled={lifecycleSettings.activityTracking}
  onOpenRules={() => {
    window.location.hash = 'tabs?view=rules';
  }}
/>
```

**Behavior:**

- The description depends on `trackingEnabled`: tab usage is recorded locally, or tracking is off and nothing is recorded.
- Four fixed blocks: What is recorded, Where it is kept (this device only; never uploaded, synced, exported or sent to AI), Tab archive, and Local stats.
- "Turn off or wipe under Tabs → Rules" calls `onOpenRules`; the Privacy page navigates to `#tabs?view=rules`.

### WorkspaceBudgetSwitchDialog

Dialog on the Workspaces page shown when restoring a workspace would go over the tab budget; driven by `useWorkspaceBudgetSwitch`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| prompt | `BudgetSwitchPrompt \| null` | ✓ | - | `{ name, pageCount, over }`; the dialog is open while non-null |
| onChoose | `(choice: BudgetSwitchChoice) => void` | ✓ | - | `"switch"`, `"open"` or `"cancel"` |

**Usage:**

```tsx
<WorkspaceBudgetSwitchDialog prompt={budgetSwitch.prompt} onChoose={budgetSwitch.answer} />
```

**Behavior:**

- Text: "Restoring "{name}" opens {pageCount} tabs, {over} over budget."
- Choices: "Cancel", "Open anyway" and "Save current window as a workspace and switch" (primary). Closing the dialog any other way (Esc, overlay click, X button) counts as `cancel`.
- The hook only prompts when the budget is on and `count + pageCount - limit > 0`; otherwise the restore runs directly.
- `switch` saves the current window as a workspace (when it has pages) and closes those tabs before restoring; `open` restores as usual; `cancel` aborts the restore.

---

## Hooks

### useGlobalAgent

全局插件 Agent Hook，封装右下角浮窗所需的多轮会话、session 切换、执行状态、过程步骤、书签来源和 background service 调用。内部通过 `globalAgentService` 使用 `@hamhome/agent` 的 skill/tool loop，实现插件功能问答、功能详情读取、安全配置修改、页面打开、书签搜索和数据查询。

**返回值：**

| Property             | Type                                      | Description            |
| -------------------- | ----------------------------------------- | ---------------------- |
| query                | `string`                                  | 输入框文本             |
| setQuery             | `(query: string) => void`                 | 设置输入框文本         |
| messages             | `ChatMessage[]`                           | 对话历史               |
| currentAnswer        | `string`                                  | 当前正在模拟输出的回答 |
| currentSteps         | `AgentProcessStep[]`                      | 当前回答的执行过程     |
| status               | `AISearchStatus`                          | Agent 状态             |
| error                | `string \| null`                          | 错误信息               |
| sources              | `Source[]`                                | 当前回答的书签来源     |
| suggestions          | `Suggestion[]`                            | 后续建议               |
| sessions             | `ChatSearchSessionSummary[]`              | 可切换的会话列表       |
| currentSessionId     | `string \| null`                          | 当前会话 ID            |
| isOpen               | `boolean`                                 | 浮窗是否展开           |
| open / close         | `() => void`                              | 展开或关闭浮窗         |
| submit               | `() => Promise<void>`                     | 发送当前输入           |
| sendSuggestion       | `(suggestion: Suggestion) => Promise<void>` | 发送建议动作         |
| clearConversation    | `() => Promise<void>`                     | 清空当前会话           |
| switchSession        | `(sessionId: string) => Promise<void>`    | 切换会话               |
| createSession        | `() => Promise<void>`                     | 新建会话               |
| deleteSession        | `(sessionId: string) => Promise<void>`    | 删除会话               |

**ChatMessage 过程字段：**

```ts
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Source[];
  steps?: AgentProcessStep[];
}
```

**用法示例：**

```tsx
const { messages, currentSteps, submit } = useGlobalAgent();
```

---

### useBookmarkSearch

书签搜索筛选 Hook，管理搜索、标签筛选、分类筛选和时间范围筛选状态。

**参数：**

| Param        | Type                           | Description      |
| ------------ | ------------------------------ | ---------------- |
| bookmarks    | `LocalBookmark[]`              | 原始书签列表     |
| categories   | `LocalCategory[]`              | 分类列表（可选） |
| initialState | `Partial<BookmarkSearchState>` | 初始状态（可选） |

**返回值：**

| Property            | Type                         | Description                     |
| ------------------- | ---------------------------- | ------------------------------- |
| searchQuery         | `string`                     | 搜索关键词                      |
| selectedTags        | `string[]`                   | 已选标签                        |
| selectedCategory    | `string`                     | 已选分类 ID（`'all'` 表示全部） |
| timeRange           | `TimeRange`                  | 时间范围筛选                    |
| hasFilters          | `boolean`                    | 是否有任何筛选条件              |
| filteredBookmarks   | `LocalBookmark[]`            | 筛选后的书签列表                |
| setSearchQuery      | `(query: string) => void`    | 设置搜索关键词                  |
| setSelectedTags     | `(tags: string[]) => void`   | 设置已选标签                    |
| setSelectedCategory | `(category: string) => void` | 设置分类                        |
| setTimeRange        | `(range: TimeRange) => void` | 设置时间范围                    |
| toggleTagSelection  | `(tag: string) => void`      | 切换标签选择                    |
| clearFilters        | `() => void`                 | 清除所有筛选                    |
| clearTagFilters     | `() => void`                 | 清除标签筛选                    |
| clearTimeFilter     | `() => void`                 | 清除时间筛选                    |

**TimeRange 类型：**

```ts
type TimeRangeType = "all" | "today" | "week" | "month" | "year" | "custom";

interface TimeRange {
  type: TimeRangeType;
  startDate?: number; // 时间戳（custom 类型时使用）
  endDate?: number; // 时间戳（custom 类型时使用）
}
```

**用法示例：**

```tsx
const {
  searchQuery,
  selectedTags,
  timeRange,
  filteredBookmarks,
  setSearchQuery,
  toggleTagSelection,
  setTimeRange,
  clearFilters,
} = useBookmarkSearch({ bookmarks, categories });
```

**自定义筛选器的条件求值：**

- 字符串字段（标题/URL/描述/标签）统一转小写后比较，支持 等于/不等于/包含/不包含/开头是/结尾是
- `createdAt` 走单独分支：条件值是 `YYYY-MM-DD`（弹窗写入）或毫秒时间戳字符串（Agent 规则可能写入），
  先由 `resolveDateBounds` 换算成当天的 `[00:00:00.000, 23:59:59.999]` 再比。
  书签的 `createdAt` 是毫秒时间戳，直接 `Number('2026-09-20')` 得到 `NaN`，任何比较都不成立
- `等于` = 落在当天区间内，`不等于` = 不在区间内，`大于` = 晚于当天结束，`小于` = 早于当天开始
- 值解析不出有效日期时该条件返回 `true`（不参与过滤），避免筛选器静默地什么都筛不出来

---

### useBookmarkFilter

书签筛选逻辑 Hook，管理搜索、标签筛选、分类筛选状态。

**参数：**

| Param     | Type              | Description  |
| --------- | ----------------- | ------------ |
| bookmarks | `LocalBookmark[]` | 原始书签列表 |

**返回值：**

| Property            | Type                         | Description                     |
| ------------------- | ---------------------------- | ------------------------------- |
| searchQuery         | `string`                     | 搜索关键词                      |
| selectedTags        | `string[]`                   | 已选标签                        |
| selectedCategory    | `string`                     | 已选分类 ID（`'all'` 表示全部） |
| hasFilters          | `boolean`                    | 是否有任何筛选条件              |
| filteredBookmarks   | `LocalBookmark[]`            | 筛选后的书签列表                |
| setSearchQuery      | `(query: string) => void`    | 设置搜索关键词                  |
| setSelectedCategory | `(category: string) => void` | 设置分类                        |
| toggleTagSelection  | `(tag: string) => void`      | 切换标签选择                    |
| clearFilters        | `() => void`                 | 清除所有筛选                    |
| clearSelectedTags   | `() => void`                 | 清除已选标签                    |

**用法示例：**

```tsx
const { searchQuery, filteredBookmarks, setSearchQuery, clearFilters } =
  useBookmarkFilter(bookmarks);
```

---

### useBookmarkSelection

书签批量选择逻辑 Hook。

**返回值：**

| Property            | Type                         | Description       |
| ------------------- | ---------------------------- | ----------------- |
| selectedIds         | `Set<string>`                | 已选书签 ID 集合  |
| toggleSelect        | `(id: string) => void`       | 切换单个选择      |
| selectAll           | `(ids: string[]) => void`    | 全选              |
| deselectAll         | `() => void`                 | 取消全选          |
| toggleSelectAll     | `(allIds: string[]) => void` | 切换全选/取消全选 |
| removeFromSelection | `(id: string) => void`       | 从选择中移除      |

**用法示例：**

```tsx
const { selectedIds, toggleSelect, toggleSelectAll } = useBookmarkSelection();
```

---

### useVirtualBookmarkList

虚拟书签列表 Hook，使用 TanStack Virtual 实现高性能虚拟滚动。

**参数：**

| Param        | Type                   | Default | Description                    |
| ------------ | ---------------------- | ------- | ------------------------------ |
| items        | `{ id: string }[]`     | -       | 书签列表                       |
| estimateSize | `number`               | `88`    | 每项估计高度（像素）           |
| overscan     | `number`               | `5`     | 过扫描数量（预渲染的额外项数） |

**返回值：**

| Property         | Type                                      | Description                |
| ---------------- | ----------------------------------------- | -------------------------- |
| parentRef        | `RefObject<HTMLDivElement>`               | 滚动容器 ref               |
| virtualizer      | `Virtualizer`                             | TanStack Virtual 实例      |
| virtualItems     | `VirtualItem[]`                           | 当前可见的虚拟项列表       |
| totalSize        | `number`                                  | 列表总高度（像素）         |
| scrollToBookmark | `(bookmarkId: string) => void`            | 滚动到指定书签             |
| bookmarkRefs     | `RefObject<Map<string, HTMLElement>>`     | 书签元素引用 Map           |

**用法示例：**

```tsx
const {
  parentRef,
  virtualItems,
  totalSize,
  scrollToBookmark,
  bookmarkRefs,
} = useVirtualBookmarkList({
  items: filteredBookmarks,
  estimateSize: 88,
  overscan: 5,
});

// 渲染虚拟列表
<div ref={parentRef} className="h-full overflow-auto">
  <div style={{ height: `${totalSize}px`, position: 'relative' }}>
    {virtualItems.map((virtualItem) => {
      const bookmark = filteredBookmarks[virtualItem.index];
      return (
        <div
          key={virtualItem.key}
          style={{
            position: 'absolute',
            top: `${virtualItem.start}px`,
            height: `${virtualItem.size}px`,
          }}
        >
          <BookmarkListItem bookmark={bookmark} />
        </div>
      );
    })}
  </div>
</div>
```

**行为说明：**

- 使用 TanStack Virtual 实现虚拟滚动，仅渲染可见区域的书签
- `estimateSize` 应设置为 BookmarkListItem 的估计高度（默认 88px）
- `overscan` 控制预渲染的额外项数，增加可减少滚动时的空白
- `scrollToBookmark` 支持平滑滚动到指定书签（用于 AI 引用点击定位）

---

### useScrollAreaVirtualList

页面级 `ScrollArea` 内的虚拟列表 Hook。适用于「列表上方还有标题、统计卡片等内容一起滚动」的页面：
整页只有一个滚动容器，列表只是其中一段，因此虚拟化器必须知道列表在滚动内容里的起始位置。

**参数：**

| Param        | Type                                     | Default | Description                              |
| ------------ | ---------------------------------------- | ------- | ---------------------------------------- |
| count        | `number`                                 | -       | 列表项总数                               |
| estimateSize | `number`                                 | -       | 每项估计高度（像素），实测前用于占位     |
| gap          | `number`                                 | `0`     | 项与项之间的间距（像素）                 |
| overscan     | `number`                                 | `6`     | 视口外额外渲染的项数                     |
| getItemKey   | `(index: number) => string \| number`    | -       | 稳定的列表项 key，避免筛选后串用高度缓存 |

**返回值：**

| Property       | Type                                | Description                                       |
| -------------- | ----------------------------------- | ------------------------------------------------- |
| viewportRef    | `RefObject<HTMLDivElement \| null>` | 传给 `ScrollArea` 的 `viewportRef`                 |
| listRef        | `(node: HTMLDivElement \| null) => void` | 挂在列表容器上，用于测量列表起始位置         |
| virtualItems   | `VirtualItem[]`                     | 当前需要渲染的虚拟项                              |
| totalSize      | `number`                            | 列表容器应设置的高度（像素）                      |
| scrollMargin   | `number`                            | 列表起始位置，渲染时要从 `virtualItem.start` 减掉 |
| measureElement | `(node: Element \| null) => void`   | 实测行高，挂在每个列表项上（需带 `data-index`）   |

**用法示例：**

```tsx
const { viewportRef, listRef, virtualItems, totalSize, scrollMargin, measureElement } =
  useScrollAreaVirtualList({
    count: rows.length,
    estimateSize: 92,
    gap: 8,
    getItemKey: (index) => rows[index]?.id ?? index,
  });

<ScrollArea className="h-full" viewportRef={viewportRef}>
  <div className="space-y-6 p-6">
    <PageHeader />
    <div ref={listRef} className="relative w-full" style={{ height: `${totalSize}px` }}>
      {virtualItems.map((item) => (
        <div
          key={item.key}
          data-index={item.index}
          ref={measureElement}
          className="absolute left-0 right-0 top-0"
          style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
        >
          <Row data={rows[item.index]} />
        </div>
      ))}
    </div>
  </div>
</ScrollArea>
```

**行为说明：**

- 不传 `scrollMargin` 会让虚拟窗口整体错位：滚到列表区时渲染出来的是另一批行
- 列表上方内容的高度会变（扫描进度卡片出现、筛选栏换行），Hook 内部用 ResizeObserver 重新测量起始位置
- 行高不固定时由 `measureElement` 实测，`estimateSize` 只用于实测前占位；列表项不要写死高度
- 列表项用 `transform: translateY()` 定位，配合 `measureElement` 才能量到真实高度

---

### useMasonryLayout

瀑布流布局计算 Hook。

**参数：**

| Param            | Type     | Default | Description |
| ---------------- | -------- | ------- | ----------- |
| benchWidth       | `number` | `356`   | 基准列宽    |
| itemGap          | `number` | `16`    | 项目间距    |
| maxCol           | `number` | `12`    | 最大列数    |
| minCol           | `number` | `1`     | 最小列数    |
| containerPadding | `number` | `48`    | 容器内边距  |

**返回值：**

| Property     | Type                                   | Description    |
| ------------ | -------------------------------------- | -------------- |
| containerRef | `RefObject<HTMLDivElement>`            | 容器 ref       |
| config       | `{ cols: number; columnSize: number }` | 计算后的列配置 |

**用法示例：**

```tsx
const { containerRef, config } = useMasonryLayout({ benchWidth: 356 });

<div ref={containerRef}>
  <Masonry columnNum={config.cols} columnSize={config.columnSize} ... />
</div>
```

---

### useTheme

主题管理 Hook，管理主题状态（light/dark/system），支持 View Transitions API 动画切换。

**参数：**

| Param                 | Type                  | Description                                         |
| --------------------- | --------------------- | --------------------------------------------------- |
| options.targetElement | `HTMLElement \| null` | 可选的目标元素（用于 content UI 环境的 Shadow DOM） |

**返回值：**

| Property               | Type                                                                | Description                                          |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| theme                  | `'light' \| 'dark' \| 'system'`                                     | 当前主题                                             |
| setTheme               | `(theme: Theme) => Promise<void>`                                   | 设置主题并保存到存储（无动画）                       |
| setThemeWithTransition | `(theme: Theme, options?: ThemeTransitionOptions) => Promise<void>` | 设置主题并使用 View Transitions API 圆形扩展动画切换 |

**ThemeTransitionOptions 类型：**

| Property        | Type      | Default  | Description       |
| --------------- | --------- | -------- | ----------------- |
| x               | `number`  | 屏幕中心 | 点击事件的 X 坐标 |
| y               | `number`  | 屏幕中心 | 点击事件的 Y 坐标 |
| enableAnimation | `boolean` | `true`   | 是否启用动画      |

**用法示例：**

```tsx
// 普通环境
const { theme, setTheme } = useTheme();

// Content UI 环境（需要传入 Shadow DOM 容器）
const { container } = useContentUI();
const { theme, setThemeWithTransition } = useTheme({
  targetElement: container,
});

// 使用圆形扩展动画切换主题（从点击位置向外扩展）
const handleToggleTheme = (e: React.MouseEvent) => {
  const newTheme = theme === "dark" ? "light" : "dark";
  setThemeWithTransition(newTheme, {
    x: e.clientX,
    y: e.clientY,
  });
};

<Button onClick={handleToggleTheme}>
  {theme === "dark" ? <Sun /> : <Moon />}
</Button>;
```

**行为说明：**

- 主题会自动应用到目标元素（添加/移除 `dark` class）
- 如果未指定 targetElement，默认应用到 `document.documentElement`
- 在 content UI 环境中，需要传入 Shadow DOM 容器
- 支持跟随系统主题（`system` 模式）
- 主题设置会自动保存到 WXT Storage 并持久化
- 自动监听 settings 变化，跨标签页同步主题
- `setThemeWithTransition` 使用 View Transitions API 实现从点击位置向外扩展的圆形动画
- 如果浏览器不支持 View Transitions API，会自动降级为无动画切换
- 支持 `prefers-reduced-motion` 媒体查询，尊重用户的动画偏好设置

---

### useLanguage

语言管理 Hook，管理应用的语言切换和持久化。

**返回值：**

| Property            | Type                               | Description                         |
| ------------------- | ---------------------------------- | ----------------------------------- |
| language            | `'en' \| 'zh'`                     | 当前语言                            |
| switchLanguage      | `(lng: Language) => Promise<void>` | 切换语言                            |
| availableLanguages  | `['en', 'zh']`                     | 可用语言列表                        |
| isLoading           | `boolean`                          | 是否正在切换语言                    |
| currentLanguageName | `string`                           | 当前语言名称（'English' 或 '中文'） |

**用法示例：**

```tsx
const { language, switchLanguage } = useLanguage();

<Button onClick={() => switchLanguage(language === "zh" ? "en" : "zh")}>
  <Languages /> {language === "zh" ? "EN" : "中文"}
</Button>;
```

**行为说明：**

- 此 Hook **可独立使用**，不依赖 `BookmarkContext`
- 语言设置会同步到 WXT Storage、`localStorage` 和 `i18n` 实例
- 自动监听其他标签页的语言变化并同步
- 触发自定义事件 `languageChange`，便于其他组件监听

---

### useShortcuts

扩展快捷键管理 Hook，获取当前配置的快捷键信息。

**返回值：**

| Property  | Type                  | Description    |
| --------- | --------------------- | -------------- |
| shortcuts | `ShortcutInfo[]`      | 快捷键列表     |
| isLoading | `boolean`             | 是否加载中     |
| refresh   | `() => Promise<void>` | 刷新快捷键配置 |

**ShortcutInfo 类型：**

| Property    | Type     | Description            |
| ----------- | -------- | ---------------------- |
| name        | `string` | 命令名称               |
| description | `string` | 命令描述               |
| shortcut    | `string` | 当前快捷键（可能为空） |

**用法示例：**

```tsx
const { shortcuts, isLoading, refresh } = useShortcuts();

{
  shortcuts.map((s) => (
    <div key={s.name}>
      <span>{s.description}</span>
      <kbd>{s.shortcut || "未设置"}</kbd>
    </div>
  ));
}
```

**行为说明：**

- 使用 `chrome.commands.getAll()` API 获取快捷键配置
- 自动监听窗口焦点变化，用户从浏览器设置页返回时自动刷新
- 过滤掉内置命令（如 `_execute_action`）

---

### useSnapshot

网页快照管理 Hook，处理快照的查看、保存、删除等操作。

**返回值：**

| Property        | Type                                                  | Description             |
| --------------- | ----------------------------------------------------- | ----------------------- |
| snapshotUrl     | `string \| null`                                      | 当前查看的快照 Blob URL |
| loading         | `boolean`                                             | 是否正在加载            |
| error           | `string \| null`                                      | 错误信息                |
| openSnapshot    | `(bookmarkId: string) => Promise<void>`               | 打开快照查看器          |
| closeSnapshot   | `() => void`                                          | 关闭快照查看器          |
| hasSnapshot     | `(bookmarkId: string) => Promise<boolean>`            | 检查书签是否有快照      |
| saveSnapshot    | `(bookmarkId: string) => Promise<boolean>`            | 手动保存当前页面快照    |
| deleteSnapshot  | `(bookmarkId: string) => Promise<void>`               | 删除快照                |
| getStorageUsage | `() => Promise<{ count: number; totalSize: number }>` | 获取存储使用情况        |

**用法示例：**

```tsx
const {
  snapshotUrl,
  loading,
  error,
  openSnapshot,
  closeSnapshot,
  deleteSnapshot,
} = useSnapshot();

// 打开快照
const handleViewSnapshot = async (bookmark: LocalBookmark) => {
  await openSnapshot(bookmark.id);
};

// 删除快照
const handleDeleteSnapshot = async (bookmarkId: string) => {
  await deleteSnapshot(bookmarkId);
};
```

**行为说明：**

- 使用 IndexedDB 存储快照（Blob 格式）
- 自动管理 Blob URL 的创建和释放
- 与 `snapshotStorage` 模块配合使用
- 更新书签的 `hasSnapshot` 字段
- 通过 `@webext-core/proxy-service` 调用 background 获取页面 HTML

---

## Services

基于 `@webext-core/proxy-service` 的类型安全服务层，用于跨 context 调用 background 方法。

### BackgroundService

提供类型安全的 background 方法调用，替代原生 `chrome.runtime.sendMessage`。

#### 接口定义

```ts
interface IBackgroundService {
  /** Library bookmarks: queue-only read later items are left out */
  getBookmarks(): Promise<LocalBookmark[]>;
  /** 获取所有分类 */
  getCategories(): Promise<LocalCategory[]>;
  /** 获取所有标签 */
  getAllTags(): Promise<string[]>;
  /** 获取设置 */
  getSettings(): Promise<Settings>;
  /** 获取当前页面 HTML */
  getPageHtml(): Promise<string | null>;
  /** 打开设置页面 */
  openOptionsPage(): Promise<void>;
  /** 打开新标签页 */
  openTab(url: string): Promise<void>;

  // ========== Embedding 相关方法 ==========

  /** 获取向量存储统计信息 */
  getVectorStats(): Promise<VectorStoreStats>;
  /** 清空所有向量数据 */
  clearVectorStore(): Promise<void>;
  /** 获取 embedding 队列状态 */
  getEmbeddingQueueStatus(): Promise<QueueStatus>;
  /** 开始重建向量索引 */
  startEmbeddingRebuild(): Promise<{ jobCount: number }>;
  /** 暂停 embedding 队列 */
  pauseEmbeddingQueue(): Promise<void>;
  /** 恢复 embedding 队列 */
  resumeEmbeddingQueue(): Promise<void>;
  /** 停止 embedding 队列 */
  stopEmbeddingQueue(): Promise<void>;
  /** 测试 embedding 连接 */
  testEmbeddingConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }>;
  /** 添加书签到 embedding 队列（保存书签时调用） */
  queueBookmarkEmbedding(bookmarkId: string): Promise<void>;
  /** 批量添加书签到 embedding 队列（导入书签时调用） */
  queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void>;

  // ========== 语义搜索相关方法（用于 content script 调用） ==========

  /** 执行语义搜索（在 background 中执行，确保访问正确的 IndexedDB） */
  semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 检查语义搜索是否可用 */
  isSemanticAvailable(): Promise<boolean>;
  /** 查找相似书签 */
  findSimilarBookmarks(bookmarkId: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 获取书签的 embedding */
  getBookmarkEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null>;
  /** 获取指定模型的所有 embeddings */
  getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]>;
  /** 获取 embedding 覆盖率统计 */
  getEmbeddingCoverageStats(): Promise<{ total: number; withEmbedding: number; coverage: number }>;

  // ========== Read later ==========

  readLaterTab(tabId: number, options?: { source?: ReadLaterSource; note?: string; closeTab?: boolean }): Promise<ReadLaterAddResult>;
  readLaterTabs(tabIds: number[], source: ReadLaterSource, options?: { closeTabs?: boolean }): Promise<ReadLaterBatchResult>;
  readLaterArchiveEntries(entryIds: string[]): Promise<ReadLaterBatchResult>;
  readLaterBookmarks(bookmarkIds: string[]): Promise<ReadLaterBatchResult>;
  /** Newest unread items for the in-page edge panel */
  getReadLaterQuickList(limit?: number): Promise<ReadLaterQuickList>;
  /** Open in a new tab and mark as reading */
  readLaterOpen(bookmarkId: string): Promise<boolean>;
  readLaterMarkRead(bookmarkIds: string[]): Promise<void>;
  readLaterRequeue(bookmarkIds: string[]): Promise<void>;
  readLaterKeep(bookmarkIds: string[], classify: boolean): Promise<void>;
  readLaterRemove(bookmarkIds: string[]): Promise<{ trashed: number; dequeued: number }>;
  readLaterUpdateNote(bookmarkId: string, note: string): Promise<void>;

  // ========== Tab archive & tab center ==========

  /** Archive first, then close; protected tabs are skipped for automatic reasons */
  archiveTabs(tabIds: number[], reason: TabArchiveReason): Promise<ArchiveActionResult>;
  closeDuplicateTabs(tabIds?: number[]): Promise<ArchiveActionResult>;
  closeTabsWithoutRecord(tabIds: number[]): Promise<number>;
  restoreArchiveEntries(entryIds: string[], activate?: boolean): Promise<TabRestoreResult>;
  restoreArchiveBatches(batchIds: string[]): Promise<TabRestoreResult>;
  deleteArchiveEntries(entryIds: string[]): Promise<void>;
  clearTabArchive(): Promise<void>;
  /** `categoryByTabId` files tabs into existing categories (AI tidy-up) */
  bookmarkTabs(tabIds: number[], options?: { categoryByTabId?: Record<number, string> }): Promise<QuickBookmarkResult>;
  bookmarkArchiveEntries(entryIds: string[]): Promise<QuickBookmarkResult>;
  setTabsLocked(tabIds: number[], locked: boolean): Promise<void>;
  /** Reset the idle timer */
  renewTabs(tabIds: number[]): Promise<void>;
  /** Local stats of the last 7 days against the week before (this device only) */
  getTabWeeklyOverview(): Promise<TabWeeklyOverview>;
  focusTab(tabId: number): Promise<void>;
  /** Undo from an in-page toast; false when the token expired */
  undoTabAction(token: string): Promise<boolean>;

  // ========== Lifecycle settings & budget ==========

  dismissBudgetNudge(mode: "today" | "hour"): Promise<void>;
  resumeBudgetNudge(): Promise<void>;
  confirmPendingArchive(tabIds?: number[]): Promise<number>;
  keepPendingArchive(tabIds?: number[]): Promise<void>;
  /** Turning auto archive on records consent for this device; never retroactive */
  setAutoArchiveEnabled(enabled: boolean, patch?: Partial<TabAutoArchiveSettings>): Promise<TabLifecycleSettings>;
  /** "auto-archive" (make room automatically) also needs this device's consent */
  setOverBudgetAction(action: TabBudgetOverAction): Promise<TabLifecycleSettings>;
  acceptSyncedTabConsent(kind: "autoArchive" | "autoMakeRoom"): Promise<void>;
  setTabActivityTracking(enabled: boolean): Promise<void>;
  completeTabCenterOnboarding(): Promise<void>;
  runTabLifecycleSweep(): Promise<TabLifecycleSweepSummary>;

  // ========== 其他方法 ==========

  /** 获取扩展快捷键配置（commands API 只能在 background 中调用） */
  getShortcuts(): Promise<ShortcutCommand[]>;
}
```

#### 使用方式

**1. 在 background.ts 中注册服务（必须在顶部同步执行）：**

```ts
import { registerBackgroundService } from "@/lib/services";

export default defineBackground(() => {
  registerBackgroundService();
  // ...
});
```

**2. 在任意位置获取并调用服务：**

```ts
import { getBackgroundService } from "@/lib/services";

// 获取数据
const backgroundService = getBackgroundService();
const bookmarks = await backgroundService.getBookmarks();
const categories = await backgroundService.getCategories();
const settings = await backgroundService.getSettings();

// 获取页面 HTML
const html = await backgroundService.getPageHtml();

// 打开设置页
await backgroundService.openOptionsPage();

// Embedding 相关操作（在 background 中执行，不受页面关闭影响）
const stats = await backgroundService.getVectorStats();
await backgroundService.startEmbeddingRebuild();

// 语义搜索（在 content script 中使用时自动通过 background service 调用）
const available = await backgroundService.isSemanticAvailable();
const result = await backgroundService.semanticSearch("查找前端相关书签");
```

**Embedding 进度监听：**

Embedding 重建任务在 background 中执行，进度通过消息广播更新：

```ts
import { browser } from 'wxt/browser';

// 监听 embedding 进度
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'EMBEDDING_PROGRESS' && message.payload) {
    const progress = message.payload; // { total, completed, failed, percentage }
    console.log(`进度: ${progress.percentage}%`);
  }
});
```

**行为说明：**

- 服务必须在 background script 启动时同步注册
- 方法调用会自动路由到 background 执行
- 完全类型安全，提供良好的 IDE 支持
- 替代手动编写 `chrome.runtime.sendMessage` / `onMessage` 样板代码
- **Embedding 任务在 background 中执行**，页面关闭后任务不会中断
- **语义搜索在 content script 中自动通过 background service 调用**，确保访问扩展的 IndexedDB 而非当前网页的 IndexedDB

---

### 跨浏览器消息传递工具

对于无法使用 `proxy-service` 的场景（如 background → content script 广播），使用 `browser-api.ts` 中的安全函数：

#### safeSendMessageToTab

安全地向指定 tab 的 content script 发送消息，兼容 Chrome/Firefox/Edge。

```ts
import { safeSendMessageToTab } from "@/utils/browser-api";

// 发送消息并获取响应
const content = await safeSendMessageToTab<PageContent>(tabId, {
  type: "EXTRACT_CONTENT",
});
```

#### safeSendMessageToActiveTab

安全地向当前活动 tab 的 content script 发送消息。

```ts
import { safeSendMessageToActiveTab } from "@/utils/browser-api";

await safeSendMessageToActiveTab({ type: "TOGGLE_BOOKMARK_PANEL" });
```

#### safeBroadcastToTabs

安全地向所有 tab 广播消息，用于 background → content script 场景。

```ts
import { safeBroadcastToTabs } from "@/utils/browser-api";

// 广播给所有 tab
await safeBroadcastToTabs({ type: "TOGGLE_BOOKMARK_PANEL" });

// 带过滤条件的广播
await safeBroadcastToTabs({ type: "REFRESH" }, { url: "*://*.example.com/*" });
```

**兼容性说明：**

- WXT 框架自动处理 `chrome.*` / `browser.*` API polyfill
- 这些工具函数提供额外的错误处理和静默失败机制
- 适用于 Chrome、Firefox、Edge 等主流浏览器

#### isContentScriptContext

检查当前是否在 content script 环境中运行。用于判断是否需要通过 background service 访问扩展的 IndexedDB。

```ts
import { isContentScriptContext } from "@/utils/browser-api";

if (isContentScriptContext()) {
  // 在 content script 中，需要通过 background service 访问扩展存储
  const bgService = getBackgroundService();
  const result = await bgService.semanticSearch(query);
} else {
  // 在扩展页面或 background 中，可以直接访问
  const result = await semanticRetriever.search(query);
}
```

**原理说明：**

- Content script 运行在网页的 origin 下，访问 IndexedDB 时会使用网页的数据库
- 扩展页面（popup、options）和 background 运行在扩展的 origin 下
- 通过检查 `location.protocol` 是否为 `chrome-extension:` 或 `moz-extension:` 来判断环境

---

## Utils

### bookmark-utils

书签相关工具函数。

#### getCategoryPath

获取分类的完整路径（用 `>` 连接）。

```ts
getCategoryPath(
  categoryId: string | null,
  categories: Category[],
  uncategorizedLabel: string
): string
```

#### formatDate

格式化书签创建日期。

```ts
formatDate(
  timestamp: number,
  language: string,
  todayLabel: string,
  yesterdayLabel: string
): string
```

#### CATEGORY_COLOR

分类徽章颜色常量：`'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'`

---

### shadow-root-style-guard

保护 WXT 注入到 `document.head` 的 shadow root 文档级样式。

```ts
import { keepShadowRootDocumentStyles } from "@/utils/shadow-root-style-guard";

// content.ts，在 ui.mount() 之后调用
keepShadowRootDocumentStyles(ctx);
```

**原理说明：**

- `@property` 与 `@font-face` 在 shadow tree 内会被忽略，因此 `createShadowRootUi` 会把它们
  抽出来，作为 `<style wxt-shadow-root-document-styles="...">` 追加到 `document.head`
- 部分站点在软导航时会对 `<head>` 做 diff 重写，把「新文档里不存在」的节点整体删掉
  （Material for MkDocs 的 instant loading 即如此，见 issue #13）
- 该样式一旦被删除，所有 `--tw-*` 自定义属性都会失去注册，
  `translate: var(--tw-translate-x) var(--tw-translate-y)` 这类声明在计算值阶段整体失效并回退为 `none`，
  收起的侧边栏就会紧贴视口边缘显形，且仍是 `pointer-events: none`、没有蒙层，无法点击关闭
- 通过 MutationObserver 监听 `document.head`（以及 `documentElement`，应对整个 `<head>` 被替换的情况），
  发现样式被移除后立即重新挂回；`ctx.onInvalidated` 时停止监听

### content-ui-keyboard-guard

隔离 content UI Shadow DOM 内的键盘事件，避免宿主页面（例如 GitHub）把输入框中的字符识别为页面快捷键。

- `ContentUIProvider` 在 content UI 根节点安装 `keydown`、`keypress` 和 `keyup` 的冒泡拦截器
- 只停止事件继续冒泡到宿主页面，不调用 `preventDefault`，因此 content UI 自身的输入、Enter、方向键等行为仍由组件处理
- 组件卸载时移除监听器，避免重复挂载造成监听器累积

---

## Storage 存储模块

基于 WXT Storage 和 IndexedDB 的存储层抽象。

### bookmark-storage

书签和分类的 CRUD 操作，支持跨设备同步。

**存储策略（分离存储）：**

- 书签元数据存储在 `sync`（跨设备同步，不含 content）
- 书签内容存储在 `local`（本地存储，大体积数据）

#### 存储项

| Key                      | Type                     | Description                            |
| ------------------------ | ------------------------ | -------------------------------------- |
| `sync:bookmarks`         | `BookmarkMeta[]`         | 书签元数据（不含 content，跨设备同步） |
| `sync:categories`        | `LocalCategory[]`        | 分类列表（跨设备同步）                 |
| `local:bookmarkContents` | `Record<string, string>` | 书签内容映射（本地存储）               |

#### BookmarkStorage 方法

| Method                  | Parameters                                        | Return                           | Description                                 |
| ----------------------- | ------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| `getBookmarks`          | `query?: BookmarkQuery, includeContent?: boolean` | `Promise<LocalBookmark[]>`       | 获取书签列表（`includeContent` 默认 false） |
| `getBookmarkById`       | `id: string`                                      | `Promise<LocalBookmark \| null>` | 根据 ID 获取书签                            |
| `getBookmarkByUrl`      | `url: string`                                     | `Promise<LocalBookmark \| null>` | 根据 URL 获取书签                           |
| `createBookmark`        | `data: CreateBookmarkInput`                       | `Promise<LocalBookmark>`         | 创建书签                                    |
| `updateBookmark`        | `id: string, data: UpdateBookmarkInput`           | `Promise<LocalBookmark>`         | 更新书签                                    |
| `deleteBookmark`        | `id: string, permanent?: boolean`                 | `Promise<void>`                  | 删除书签（软删除/永久）                     |
| `restoreBookmark`       | `id: string`                                      | `Promise<LocalBookmark>`         | 恢复已删除书签                              |
| `getDeletedBookmarks`   | -                                                 | `Promise<LocalBookmark[]>`       | 获取回收站书签                              |
| `getCategories`         | -                                                 | `Promise<LocalCategory[]>`       | 获取所有分类                                |
| `createCategory`        | `name: string, parentId?: string \| null`         | `Promise<LocalCategory>`         | 创建分类                                    |
| `updateCategory`        | `id: string, data: Partial<LocalCategory>`        | `Promise<LocalCategory>`         | 更新分类                                    |
| `deleteCategory`        | `id: string`                                      | `Promise<void>`                  | 删除分类                                    |
| `getAllTags`            | -                                                 | `Promise<string[]>`              | 获取所有标签                                |
| `batchOperate`          | `params: BatchOperationParams`                    | `Promise<BatchOperationResult>`  | 批量操作                                    |
| `watchBookmarks`        | `callback: (bookmarks) => void`                   | `() => void`                     | 监听书签变化（不含 content）                |
| `watchCategories`       | `callback: (categories) => void`                  | `() => void`                     | 监听分类变化                                |
| `getBookmarkContent`    | `bookmarkId: string`                              | `Promise<string \| undefined>`   | 获取书签内容                                |
| `setBookmarkContent`    | `bookmarkId: string, content: string`             | `Promise<void>`                  | 设置书签内容                                |
| `deleteBookmarkContent` | `bookmarkId: string`                              | `Promise<void>`                  | 删除书签内容                                |

**用法示例：**

```ts
import { bookmarkStorage } from "@/lib/storage";

// 获取书签（不含 content，性能更好）
const bookmarks = await bookmarkStorage.getBookmarks({ search: "react" });

// 获取书签（包含 content）
const bookmarksWithContent = await bookmarkStorage.getBookmarks({}, true);

// 单独获取书签内容
const content = await bookmarkStorage.getBookmarkContent(bookmarkId);

// 监听变化
const unwatch = bookmarkStorage.watchBookmarks((newBookmarks) => {
  console.log("书签已更新", newBookmarks);
});
```

---

### config-storage

AI 配置和用户设置存储，基于 **WXT Storage (sync)** 实现，支持跨设备同步。

#### 存储项

| Key                  | Type             | Description                |
| -------------------- | ---------------- | -------------------------- |
| `sync:aiConfig`      | `AIConfig`       | AI 配置（跨设备同步）      |
| `sync:settings`      | `LocalSettings`  | 用户设置（跨设备同步）     |
| `sync:customFilters` | `CustomFilter[]` | 自定义筛选器（跨设备同步） |

#### AIProvider 类型

支持的 AI 服务提供商：

| 值            | 服务商名称     | API 兼容性 | 默认 Base URL                                             | 可用模型（第一个为默认）                                                                                  |
| ------------- | -------------- | ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `openai`      | OpenAI         | OpenAI     | `https://api.openai.com/v1`                               | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo, o1-mini, o1-preview                                      |
| `anthropic`   | Anthropic      | Anthropic  | `https://api.anthropic.com`                               | claude-3-5-haiku-latest, claude-3-5-sonnet-latest, claude-3-opus-latest                                   |
| `google`      | Google Gemini  | OpenAI     | `https://generativelanguage.googleapis.com/v1beta/openai` | gemini-2.0-flash, gemini-2.0-flash-lite, gemini-1.5-flash, gemini-1.5-pro                                 |
| `azure`       | Azure OpenAI   | OpenAI     | 用户配置                                                  | gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-35-turbo                                                            |
| `deepseek`    | DeepSeek       | OpenAI     | `https://api.deepseek.com/v1`                             | deepseek-chat, deepseek-reasoner                                                                          |
| `groq`        | Groq           | OpenAI     | `https://api.groq.com/openai/v1`                          | llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it                           |
| `mistral`     | Mistral AI     | OpenAI     | `https://api.mistral.ai/v1`                               | mistral-small-latest, mistral-medium-latest, mistral-large-latest, open-mistral-7b                        |
| `moonshot`    | Moonshot/Kimi  | OpenAI     | `https://api.moonshot.cn/v1`                              | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k                                                         |
| `zhipu`       | 智谱AI/GLM     | OpenAI     | `https://open.bigmodel.cn/api/paas/v4`                    | glm-4-flash, glm-4-plus, glm-4-air, glm-4-long                                                            |
| `hunyuan`     | 腾讯混元       | OpenAI     | `https://api.hunyuan.cloud.tencent.com/v1`                | hunyuan-lite, hunyuan-standard, hunyuan-pro, hunyuan-turbo                                                |
| `nvidia`      | NVIDIA NIM     | OpenAI     | `https://integrate.api.nvidia.com/v1`                     | meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct, nvidia/llama-3.1-nemotron-70b-instruct           |
| `siliconflow` | 硅基流动       | OpenAI     | `https://api.siliconflow.cn/v1`                           | Qwen/Qwen2.5-7B-Instruct, Qwen/Qwen2.5-72B-Instruct, deepseek-ai/DeepSeek-V3, Pro/deepseek-ai/DeepSeek-R1 |
| `ollama`      | Ollama（本地） | OpenAI     | `http://localhost:11434/v1`                               | llama3.2, llama3.1, mistral, qwen2.5, phi3                                                                |
| `custom`      | 自定义         | OpenAI     | 用户配置                                                  | gpt-4o-mini                                                                                               |

**辅助函数：**

| 函数                | 参数                   | 返回值     | 描述                   |
| ------------------- | ---------------------- | ---------- | ---------------------- |
| `getDefaultModel`   | `provider: AIProvider` | `string`   | 获取默认模型（第一个） |
| `getProviderModels` | `provider: AIProvider` | `string[]` | 获取提供商所有可用模型 |
| `getDefaultBaseUrl` | `provider: AIProvider` | `string`   | 获取默认 Base URL      |
| `requiresApiKey`    | `provider: AIProvider` | `boolean`  | 检查是否需要 API Key   |

**行为说明：**

- 大多数提供商兼容 OpenAI API，使用统一的 OpenAI SDK 调用
- `azure` 和 `custom` 需要用户手动配置 Base URL
- `ollama` 不需要 API Key，使用本地服务
- 切换提供商时自动选择第一个模型作为默认值
- 模型选择器支持从预设列表选择，也支持输入自定义模型名称
- 设置页支持通过当前 provider 的官方 `/models` 接口拉取可用模型列表，并与预设推荐一起展示

#### ConfigStorage 方法

| Method               | Parameters                                         | Return                    | Description      |
| -------------------- | -------------------------------------------------- | ------------------------- | ---------------- |
| `getAIConfig`        | -                                                  | `Promise<AIConfig>`       | 获取 AI 配置     |
| `setAIConfig`        | `config: Partial<AIConfig>`                        | `Promise<AIConfig>`       | 设置 AI 配置     |
| `getSettings`        | -                                                  | `Promise<LocalSettings>`  | 获取用户设置     |
| `setSettings`        | `settings: Partial<LocalSettings>`                 | `Promise<LocalSettings>`  | 设置用户设置     |
| `importRawSettings`  | `settings: LocalSettings`                          | `Promise<LocalSettings>`  | 导入远端设置并保留原始更新时间 |
| `resetAIConfig`      | -                                                  | `Promise<AIConfig>`       | 重置 AI 配置     |
| `resetSettings`      | -                                                  | `Promise<LocalSettings>`  | 重置用户设置     |
| `getCustomFilters`   | -                                                  | `Promise<CustomFilter[]>` | 获取自定义筛选器 |
| `setCustomFilters`   | `filters: CustomFilter[]`                          | `Promise<void>`           | 保存自定义筛选器 |
| `addCustomFilter`    | `filter: CustomFilter`                             | `Promise<void>`           | 添加筛选器       |
| `updateCustomFilter` | `filterId: string, updates: Partial<CustomFilter>` | `Promise<void>`           | 更新筛选器       |
| `deleteCustomFilter` | `filterId: string`                                 | `Promise<void>`           | 删除筛选器       |
| `watchAIConfig`      | `callback: (config) => void`                       | `() => void`              | 监听 AI 配置变化 |
| `watchSettings`      | `callback: (settings) => void`                     | `() => void`              | 监听设置变化     |
| `watchCustomFilters` | `callback: (filters) => void`                      | `() => void`              | 监听筛选器变化   |
| `getEmbeddingConfig` | -                                                  | `Promise<EmbeddingConfig>` | 获取 Embedding 配置 |
| `setEmbeddingConfig` | `config: Partial<EmbeddingConfig>`                 | `Promise<EmbeddingConfig>` | 设置 Embedding 配置 |
| `resetEmbeddingConfig` | -                                                | `Promise<EmbeddingConfig>` | 重置 Embedding 配置 |
| `watchEmbeddingConfig` | `callback: (config) => void`                     | `() => void`              | 监听 Embedding 配置变化 |

#### EmbeddingConfig 类型

用于语义搜索的 Embedding 服务配置。

| 属性 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `enabled` | `boolean` | ✓ | `false` | 是否启用语义检索 |
| `provider` | `AIProvider` | ✓ | `'openai'` | 服务提供商 |
| `baseUrl` | `string` | - | - | OpenAI-compatible base url |
| `apiKey` | `string` | - | - | API Key（云端 provider 需要） |
| `model` | `string` | ✓ | `'text-embedding-3-small'` | Embedding 模型名 |
| `dimensions` | `number` | - | - | Output vector size. Only sent when the model accepts it (`getEmbeddingDimensionSpec`); otherwise the model's native size is used |
| `batchSize` | `number` | - | `16` | 批量 embedding 大小 |

**支持 Embedding 的 Provider：**

| Provider | 默认模型 | 说明 |
|----------|----------|------|
| `openai` | `text-embedding-3-small` | OpenAI Embedding API |
| `google` | `text-embedding-004` | Google Gemini Embedding |
| `azure` | `text-embedding-ada-002` | Azure OpenAI（需配置 baseUrl） |
| `mistral` | `mistral-embed` | Mistral AI Embedding |
| `zhipu` | `embedding-3` | 智谱 AI Embedding |
| `hunyuan` | `hunyuan-embedding` | 腾讯混元 Embedding |
| `nvidia` | `nvidia/embed-qa-4` | NVIDIA NIM Embedding |
| `siliconflow` | `BAAI/bge-m3` | 硅基流动 BGE-M3 |
| `ollama` | `nomic-embed-text` | Ollama 本地 Embedding（无需 API Key） |
| `custom` | `text-embedding-3-small` | 自定义 OpenAI 兼容端点 |

**不支持 Embedding 的 Provider：** `anthropic`、`deepseek`、`groq`、`moonshot`

---

### vector-store

书签向量存储模块，基于 **IndexedDB** 实现语义搜索的向量存储。

#### VectorStore 方法

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `saveEmbedding` | `embedding: BookmarkEmbedding` | `Promise<void>` | 保存单个书签向量 |
| `saveEmbeddings` | `embeddings: BookmarkEmbedding[]` | `Promise<void>` | 批量保存书签向量 |
| `getEmbedding` | `bookmarkId: string` | `Promise<BookmarkEmbedding \| null>` | 获取单个书签向量 |
| `getEmbeddings` | `bookmarkIds: string[]` | `Promise<Map<string, BookmarkEmbedding>>` | 批量获取书签向量 |
| `getEmbeddingsByModel` | `modelKey: string` | `Promise<BookmarkEmbedding[]>` | 获取指定模型的所有向量 |
| `getAllEmbeddings` | - | `Promise<BookmarkEmbedding[]>` | 获取所有向量（用于语义搜索） |
| `needsUpdate` | `bookmarkId: string, newChecksum: string` | `Promise<boolean>` | 检查是否需要重新生成向量 |
| `deleteEmbedding` | `bookmarkId: string` | `Promise<void>` | 删除单个书签向量 |
| `deleteEmbeddings` | `bookmarkIds: string[]` | `Promise<void>` | 批量删除书签向量 |
| `deleteByModel` | `modelKey: string` | `Promise<number>` | 删除指定模型的所有向量 |
| `clearAll` | - | `Promise<void>` | 清空所有向量 |
| `getStats` | - | `Promise<VectorStoreStats>` | 获取存储统计信息 |
| `getMissingBookmarkIds` | `allBookmarkIds: string[]` | `Promise<string[]>` | 获取没有向量的书签 ID 列表 |

#### VectorStoreStats 类型

| 属性 | 类型 | 描述 |
|------|------|------|
| `count` | `number` | 总向量数 |
| `countByModel` | `Record<string, number>` | 按模型分组的向量数 |
| `estimatedSize` | `number` | 估算存储大小（字节） |

**用法示例：**

```ts
import { vectorStore } from '@/lib/storage';

// 获取向量统计
const stats = await vectorStore.getStats();
console.log(`已索引 ${stats.count} 个书签，占用 ${(stats.estimatedSize / 1024).toFixed(1)} KB`);

// 获取书签向量
const embedding = await vectorStore.getEmbedding(bookmarkId);

// 清空所有向量（重建前）
await vectorStore.clearAll();
```

---

### Agent Services

插件内 AI 能力统一收敛到 `lib/agent/services/*`，UI 与 hooks 不再直接调用旧 `aiClient`。

#### globalAgentService.runTurn

全局插件智能管理入口。该服务会创建 Browser Agent SDK agent，注册 HamHome 功能 skill 与全局工具集，并持久化多轮 session。

| Property  | Type                             | Required | Description            |
| --------- | -------------------------------- | -------- | ---------------------- |
| input     | `ConversationalSearchTurnInput`  | ✓        | 用户消息或建议动作     |
| sessionId | `string`                         | -        | 需要继续的对话 session |

**返回值（GlobalAgentTurnResult）：**

| Property     | Type                         | Description              |
| ------------ | ---------------------------- | ------------------------ |
| session      | `ChatSearchSessionSnapshot`  | 已保存的 session 快照    |
| displayText  | `string`                     | 本轮展示文本             |
| response     | `ChatSearchResponse`         | 最终回答与建议           |
| sources      | `Source[]`                   | 可渲染的书签来源         |
| steps        | `AgentProcessStep[]`         | skill/tool 执行过程      |
| bookmarks    | `LocalBookmark[]`            | 本轮检索关联书签         |
| searchResult | `SearchResult`               | 检索分数与模式信息       |
| newState     | `ConversationalSearchSession` | 新的结构化会话状态      |

**行为说明：**

- `createHamHomeFeatureSkill()` 提供插件功能总览文档，SDK 会注入 `skill_view`
- `get_hamhome_feature_detail` 用于递进读取功能明细、配置方式和能力边界
- `get_extension_shortcuts` 实时读取浏览器快捷键配置
- `createGlobalAgentTools()` 提供功能清单、书签搜索、快捷键读取、数据摘要、打开插件页面和安全配置工具
- `update_safe_plugin_settings` 只允许白名单字段；`apiKey`、`baseUrl`、`privacyDomains`、同步凭据和快捷键会被拒绝并引导用户打开设置页
- SDK 事件会被转成 `AgentProcessStep[]`，供 `GlobalAgentLauncher` 渲染中间过程

**用法示例：**

```ts
import { globalAgentService } from "@/lib/agent";

const result = await globalAgentService.runTurn({
  type: "message",
  text: "把主题改成深色，然后告诉我 AI 设置在哪里",
});
```

#### bookmarkAnalysisService.analyzeBookmark

一次性分析书签内容，生成标题、摘要、分类、标签。

**参数（EnhancedAnalyzeInput）：**

| Property       | Type              | Required | Description                                |
| -------------- | ----------------- | -------- | ------------------------------------------ |
| pageContent    | `PageContent`     | ✓        | 页面内容对象                               |
| userCategories | `LocalCategory[]` | -        | 用户已有分类（用于优先复用分类）           |
| existingTags   | `string[]`        | -        | 用户已有标签（避免生成语义相近的重复标签） |

**行为说明：**

- 使用统一 agent 配置工厂初始化模型
- 输出固定结构：`title`、`summary`、`category`、`tags`
- AI 失败时直接抛出错误，由调用方决定 UI 提示

**用法示例：**

```ts
import { bookmarkAnalysisService } from "@/lib/agent";

const result = await bookmarkAnalysisService.analyzeBookmark({
  pageContent,
  userCategories: categories,
  existingTags,
});
```

#### translationService.translate

翻译文本（标签或摘要），目标语言由用户设置决定。

| Property   | Type           | Required | Default      | Description  |
| ---------- | -------------- | -------- | ------------ | ------------ |
| text       | `string`       | ✓        | -            | 要翻译的文本 |
| targetLang | `'zh' \| 'en'` | -        | `'zh'`       | 目标语言     |

**行为说明：**

- 由统一 agent 接入层发起模型请求
- 保留 Markdown、列表和术语
- 翻译失败时直接抛出错误，不回退原文

**用法示例：**

```ts
import { translationService } from "@/lib/agent";

const translated = await translationService.translate(text, settings.language);
```

#### categoryGenerationService.generateCategories

根据用户描述生成层级分类方案。

| Property      | Type       | Required | Description      |
| ------------- | ---------- | -------- | ---------------- |
| description   | `string`   | ✓        | 分类方案需求描述 |

#### agentConfigService

统一封装连接测试与可用模型拉取。

| Method                  | Parameters                                 | Return                                   | Description      |
| ----------------------- | ------------------------------------------ | ---------------------------------------- | ---------------- |
| `testConnection`        | -                                          | `Promise<{ success: boolean; message: string }>` | 测试模型连通性   |
| `listAvailableModels`   | `{ provider?, apiKey?, baseUrl? }`         | `Promise<{ models: string[]; endpoint: string }>` | 拉取远端模型列表 |

---

### ai-cache-storage

AI 分析结果缓存，基于 **IndexedDB** 实现（适合大数据存储）。

#### AICacheStorage 方法

| Method                 | Parameters                                         | Return                                     | Description        |
| ---------------------- | -------------------------------------------------- | ------------------------------------------ | ------------------ |
| `getCachedAnalysis`    | `url: string`                                      | `Promise<AnalysisResult \| null>`          | 获取缓存的分析结果 |
| `cacheAnalysis`        | `pageContent: PageContent, result: AnalysisResult` | `Promise<void>`                            | 缓存分析结果       |
| `deleteCachedAnalysis` | `url: string`                                      | `Promise<void>`                            | 删除缓存           |
| `cleanupExpiredCache`  | -                                                  | `Promise<number>`                          | 清理过期缓存       |
| `clearAll`             | -                                                  | `Promise<void>`                            | 清空所有缓存       |
| `getStats`             | -                                                  | `Promise<{ count: number; size: number }>` | 获取缓存统计       |

**行为说明：**

- 缓存有效期为 24 小时
- 自动过期清理
- 使用 URL 作为唯一 key

---

### snapshot-storage

网页快照存储，基于 **IndexedDB** 实现（存储 HTML Blob）。

#### SnapshotStorage 方法

| Method              | Parameters                         | Return                                          | Description       |
| ------------------- | ---------------------------------- | ----------------------------------------------- | ----------------- |
| `saveSnapshot`      | `bookmarkId: string, html: string` | `Promise<Snapshot>`                             | 保存快照          |
| `getSnapshot`       | `bookmarkId: string`               | `Promise<Snapshot \| null>`                     | 获取快照          |
| `getSnapshotAsUrl`  | `bookmarkId: string`               | `Promise<string \| null>`                       | 获取快照 Blob URL |
| `deleteSnapshot`    | `bookmarkId: string`               | `Promise<void>`                                 | 删除快照          |
| `getStorageUsage`   | -                                  | `Promise<{ count: number; totalSize: number }>` | 获取存储使用情况  |
| `clearAllSnapshots` | -                                  | `Promise<void>`                                 | 清除所有快照      |

**行为说明：**

- 每个书签只保存一个快照
- 使用 Blob 格式存储 HTML

---

## Hooks (tab lifecycle & read later)

Hooks for the tab center, the popup tabs card, the Read later page and the in-page lifecycle UI. Hooks marked "content script only" run inside the content UI; the others run in extension pages (app page, popup).

### useAddToWorkspace

Adds pages (open tabs or archived tabs) to an existing workspace or a new one. URLs already in the target workspace, and duplicate URLs in the input, are skipped.

```ts
function useAddToWorkspace(): UseAddToWorkspaceResult
```

| Field | Type | Description |
| --- | --- | --- |
| workspaces | `Workspace[]` | All workspaces, kept current through `workspaceStorage.watchWorkspaces` |
| addPages | `(target: WorkspaceTarget, pages: WorkspacePageInput[]) => Promise<number>` | `{ name }` creates a workspace, `{ workspaceId }` appends to an existing one. Resolves with the number of pages added. Throws `"workspace-missing"` for an unknown ID |

Exported types: `WorkspacePageInput { title; url; favicon? }`, `WorkspaceTarget = { workspaceId: string } | { name: string }`.

**Usage:**

```tsx
// components/tabCenter/AddToWorkspaceDialog.tsx
const { workspaces, addPages } = useAddToWorkspace();
const added = await addPages(
  target === NEW_WORKSPACE ? { name: name.trim() || t("tabCenter.workspace.defaultName") } : { workspaceId: target },
  pages,
);
```

---

### useOpenTabActions

Actions on open tabs for the tab center and the popup. Each action calls the background service and shows a toast. When the result carries an `undoToken`, the toast has an Undo action (`undoTabAction`). Failures show `tabCenter.actionFailed`.

```ts
function useOpenTabActions(): UseOpenTabActionsResult
```

| Field | Type | Description |
| --- | --- | --- |
| focus | `(tabId: number) => Promise<void>` | Activates the tab and focuses its window |
| readLater | `(tabIds: number[]) => Promise<void>` | Calls `readLaterTabs(tabIds, "tab-center", { closeTabs: true })`. Toast has Undo |
| bookmark | `(tabIds: number[]) => Promise<void>` | Calls `bookmarkTabs`. Toast shows the created and existing counts |
| archive | `(tabIds: number[], reason?: TabArchiveReason) => Promise<void>` | Calls `archiveTabs` (default reason `"manual"`). Toast has Undo |
| closeDuplicates | `(tabIds?: number[]) => Promise<void>` | Archives redundant duplicates with reason `"duplicate"`, optionally only within `tabIds`. Toast has Undo |
| setLocked | `(tabIds: number[], locked: boolean) => Promise<void>` | Locks or unlocks tabs |
| renew | `(tabIds: number[]) => Promise<void>` | Restarts the idle time |
| closeWithoutRecord | `(tabIds: number[]) => Promise<void>` | Asks for confirmation in a destructive dialog, then closes the non-pinned tabs without archiving them |
| confirmPending | `(tabIds?: number[]) => Promise<void>` | Confirm mode: archives the tabs waiting for confirmation (all of them when `tabIds` is omitted) |
| keepPending | `(tabIds?: number[]) => Promise<void>` | Confirm mode: keeps those tabs and restarts their idle time |

**Usage:**

```tsx
// components/tabCenter/OpenTabsView.tsx
const actions = useOpenTabActions();
const onLockToggle = useCallback((tab: OpenTabInfo) => void actions.setLocked([tab.tabId], !tab.locked), [actions]);
const onArchive = useCallback((tabId: number) => void actions.archive([tabId]), [actions]);
```

---

### useOpenTabCount

Number of non-incognito tabs in normal windows, used for the sidebar badge. It runs one `tabs.query` after tab created, removed, attached or detached events, debounced by 300 ms. **Returns a plain `number`, not an object.**

```ts
function useOpenTabCount(): number
```

| Field | Type | Description |
| --- | --- | --- |
| (return value) | `number` | Open tab count. It is `0` until loaded and stays `0` where the tabs API is unavailable |

**Usage:**

```tsx
// entrypoints/app/App.tsx
const openTabCount = useOpenTabCount();
// sidebar item
{ title: t("bookmark:tabCenter.navTitle"), url: "#tabs", icon: PanelsTopLeft, isActive: currentViewBase === "tabs", badge: openTabCount }
```

---

### useOpenTabsList

View state of the tab center's open tabs list: search, grouping, sorting, filters, virtual-list rows (`buildOpenTabsRows`) and a selection of tab IDs. Closed tabs drop out of the selection automatically.

```ts
function useOpenTabsList(snapshot: OpenTabsSnapshot | null): UseOpenTabsListResult
```

| Field | Type | Description |
| --- | --- | --- |
| query, setQuery | `string`, `(query: string) => void` | Search on title and URL. Every term must match |
| groupBy, setGroupBy | `OpenTabsGroupBy`, setter | `"window"` (default), `"group"` or `"domain"` |
| sort, setSort | `OpenTabsSort`, setter | `"position"` (default), `"recent"` or `"idle"` |
| filters | `ReadonlySet<OpenTabsFilter>` | Active filters (`idle`, `expiring`, `duplicates`, `protected`). A tab matching any one of them is shown |
| toggleFilter | `(filter: OpenTabsFilter) => void` | Toggles one filter |
| setFilters | `(filters: OpenTabsFilter[]) => void` | Replaces all filters |
| rows | `OpenTabsRow[]` | Group header rows and tab rows for the virtual list |
| visibleTabIds | `number[]` | Tab IDs of the visible tab rows |
| selected | `ReadonlySet<number>` | Selected tab IDs |
| toggleSelect | `(tabId: number) => void` | Toggles one tab |
| setSelected | `(tabIds: number[], selected: boolean) => void` | Adds or removes several tabs |
| selectOnly | `(tabIds: number[]) => void` | Replaces the selection |
| clearSelection | `() => void` | Clears the selection |
| selectedTabs | `OpenTabInfo[]` | Snapshot tabs that are selected |

**Usage:**

```tsx
// components/tabCenter/OpenTabsView.tsx
const list = useOpenTabsList(snapshot);
<OpenTabsToolbar
  query={list.query}
  groupBy={list.groupBy}
  sort={list.sort}
  filters={list.filters}
  supportsGroups={supportsGroups}
  onQueryChange={list.setQuery}
  onGroupByChange={list.setGroupBy}
  onSortChange={list.setSort}
  onToggleFilter={list.toggleFilter}
/>
```

---

### useOpenTabsSnapshot

Live `OpenTabsSnapshot` for extension pages, read directly with `tabLifecycleService.getSnapshot()`. This works because extension pages share the IndexedDB origin with the background. The snapshot reloads 400 ms after tab and window events, relevant `tabs.onUpdated` changes, `storage.session` changes, and lifecycle settings or state changes. It also refreshes once a minute so relative times stay current.

```ts
function useOpenTabsSnapshot(): UseOpenTabsSnapshotResult
```

| Field | Type | Description |
| --- | --- | --- |
| snapshot | `OpenTabsSnapshot \| null` | `null` until the first load |
| loading | `boolean` | `true` until the first load has finished |
| error | `string \| null` | Message of the last load error |
| refresh | `() => Promise<void>` | Reloads immediately |

**Usage:**

```tsx
// components/TabCenterPage.tsx
const { snapshot, loading } = useOpenTabsSnapshot();
// components/popup/QuickPanel.tsx
const { snapshot } = useOpenTabsSnapshot();
```

---

### useReadLaterQueue

State of the Read later page:

- Views (unread, read, expired), sorting, search and filters (domain, source, kept).
- Queue health: items expiring soon and the 30-day completion rate.
- Item actions, run through the background.

The hook needs `BookmarkContext` (`allBookmarks`, `readLaterEntries`). Settings are watched from `tabLifecycleConfigStorage`.

```ts
function useReadLaterQueue(initialQuery?: string): UseReadLaterQueueResult
```

| Field | Type | Description |
| --- | --- | --- |
| settings | `ReadLaterSettings` | Read later settings, kept current |
| view, setView | `ReadLaterView`, setter | `"unread"` (default), `"read"` or `"expired"` |
| sort, setSort | `ReadLaterSort`, setter | `"newest"` (default), `"oldest"`, `"shortest"` or `"expiring"` |
| query, setQuery | `string`, setter | Search on title, URL, description and note |
| filters, setFilters | `ReadLaterFilters`, `(patch: Partial<ReadLaterFilters>) => void` | Domain, source and kept (`all` / `kept` / `queueOnly`) filters. `setFilters` merges the patch |
| items | `ReadLaterItem[]` | Items of the current view after filters, search and sorting |
| counts | `Record<ReadLaterView, number>` | Item count per view |
| domains | `string[]` | Sorted domains of all items |
| expiringSoon | `number` | Pending items that expire within 3 days |
| completion | `{ read: number; expired: number; rate: number \| null }` | Read divided by (read + expired) over the last 30 days |
| updateSettings | `(patch: Partial<ReadLaterSettings>) => Promise<void>` | Writes Read later settings |
| open | `(bookmarkId: string) => Promise<void>` | Opens the item in a new tab and marks it as reading |
| markRead | `(ids: string[]) => Promise<void>` | Marks items as read (toast) |
| requeue | `(ids: string[]) => Promise<void>` | Moves items back to unread and renews their expiry (toast) |
| keep | `(ids: string[], classify: boolean) => Promise<void>` | Keeps items in the library. With `classify`, AI fills in an empty category, tags and summary (toast) |
| remove | `(ids: string[]) => Promise<void>` | Queue-only items go to the trash. Library bookmarks only leave the queue (toast) |
| updateNote | `(id: string, note: string) => Promise<void>` | Sets the note. An empty note clears it |

Exported types: `ReadLaterKeptFilter`, `ReadLaterFilters`. Failed actions show `readLater.actionFailed`.

**Usage:**

```tsx
// components/ReadLaterPage.tsx
const queue = useReadLaterQueue(readQuery(currentView));
<ReadLaterStats
  unread={queue.counts.unread}
  expiringSoon={queue.expiringSoon}
  completion={queue.completion}
  onShowExpiring={() => {
    queue.setView("unread");
    queue.setSort("expiring");
  }}
/>
```

---

### useReadLaterQuickList

Newest unread Read later items (at most 8) for the in-page edge panel, which runs in the content UI. The list loads through the background only while `active` is true. It reloads when the queue or the bookmarks change, so titles of links added without opening them fill in later.

```ts
function useReadLaterQuickList(active: boolean): UseReadLaterQuickListResult
```

| Field | Type | Description |
| --- | --- | --- |
| items | `ReadLaterQuickItem[]` | Newest unread items (at most 8) |
| unreadCount | `number` | Count of all unread items, not only the listed ones |
| open | `(bookmarkId: string) => void` | Opens the item in a new tab and marks it as reading |
| openAll | `() => void` | Opens the Read later page (`openOptionsPage("read-later")`) |

**Usage:**

```tsx
// components/bookmarkPanel/BookmarkPanel.tsx
const readLater = useReadLaterQuickList(isOpen);
<ReadLaterQuickSection
  items={readLater.items}
  unreadCount={readLater.unreadCount}
  onOpen={(bookmarkId) => {
    readLater.open(bookmarkId);
    onClose();
  }}
  onViewAll={() => {
    readLater.openAll();
    onClose();
  }}
/>
```

---

### useReadingDoneBar

"Finished reading?" bar for pages opened from Read later. Content script only. The session comes from `readingSessionBus`. The bar appears once, while the page URL still matches the session, in either of two cases:

- The reader scrolls past 85% of the page.
- The pointer leaves the window through the top.

Esc hides the bar. The confirmation message hides itself after 2.5 s.

```ts
function useReadingDoneBar(): UseReadingDoneBarResult
```

| Field | Type | Description |
| --- | --- | --- |
| session | `ReadingSession \| null` | Page opened from Read later. `null` on all other pages |
| visible | `boolean` | Whether the bar is shown |
| state | `ReadingDoneState` | `"idle"`, `"working"`, `"read"`, `"kept"` or `"failed"` |
| markRead | `() => Promise<void>` | Calls `readLaterMarkRead([bookmarkId])` |
| keep | `() => Promise<void>` | Calls `readLaterKeep([id], true)`, then `readLaterMarkRead([id])` |
| dismiss | `() => void` | Hides the bar |

**Usage:**

```tsx
// components/contentUi/feedback/ReadingDoneBar.tsx
const bar = useReadingDoneBar();
if (!bar.session || !bar.visible) return null;
const working = bar.state === "working";
// ...
<Button size="sm" disabled={working} onClick={() => void bar.markRead()}>{t("bookmark:readingBar.markRead")}</Button>
{bar.session.queueOnly && (
  <Button variant="secondary" size="sm" disabled={working} onClick={() => void bar.keep()}>{t("bookmark:readingBar.keep")}</Button>
)}
```

---

### useRecentAutoArchive

Data for "N tabs archived automatically today": automatic batches from the last 24 hours (`RECENT_AUTO_BATCH_MS`) that were not undone and still hold entries, plus restoring all of them at once. The data is read from `tabArchiveStorage` and reloaded on `watchVersion`.

```ts
function useRecentAutoArchive(): UseRecentAutoArchiveResult
```

| Field | Type | Description |
| --- | --- | --- |
| summary | `TabArchiveRecentSummary` | `{ batchIds, count }` of those batches |
| restoreAll | `() => Promise<number>` | Calls `restoreArchiveBatches(summary.batchIds)` and resolves with the restored count (`0` when there is nothing to restore) |

**Usage:**

```tsx
// components/popup/QuickPanel.tsx
const recentArchive = useRecentAutoArchive();
<PopupTabsCard
  recent={recentArchive.summary}
  onRestoreRecent={() => {
    void recentArchive.restoreAll().then((count) =>
      toast.success(t("bookmark:tabCenter.archive.restored", { count })),
    );
  }}
  // ...other props
/>
```

---

### useTabAITriage

AI tidy-up in the tab center. `run()` calls `tabTriageService.suggest(snapshot)` in the extension page and selects everything except what local rules keep. `apply()` runs the selected suggestions through the background:

- **keep:** renews the AI-kept tabs.
- **bookmark:** bookmarks the tabs (with their category), then archives them.
- **workspace:** adds the tabs to a workspace (an existing one when its name matches, ignoring case), then archives them.
- **readLater:** reads later and closes.
- **close:** archives.

All archiving uses reason `"triage"`.

```ts
function useTabAITriage(snapshot: OpenTabsSnapshot | null): UseTabAITriageResult
```

| Field | Type | Description |
| --- | --- | --- |
| status | `TabTriageStatus` | `"idle"`, `"loading"`, `"ready"`, `"notConfigured"` (AI not set up) or `"error"` |
| error | `string \| null` | Error message when `status` is `"error"` |
| result | `TabTriageResult \| null` | Last result. Cleared after a successful apply |
| groups | `TriageGroup[]` | Suggestions grouped by destination |
| selected | `ReadonlySet<number>` | Selected tab IDs |
| toggle | `(tabIds: number[], selected: boolean) => void` | Selects or deselects tabs |
| run | `() => Promise<void>` | Asks AI about the current snapshot |
| applying | `boolean` | Apply is in progress |
| apply | `() => Promise<boolean>` | Applies the selection. Resolves `true` on success and shows a toast with the kept, queued, bookmarked and archived counts |

**Usage:**

```tsx
// components/tabCenter/TabAITriageDialog.tsx
const triage = useTabAITriage(snapshot);
const { status, result, run } = triage;
const wasOpen = useRef(false);
// Analyze when the dialog opens; a finished result stays until it is applied
useEffect(() => {
  if (open && !wasOpen.current && status === "idle") void run();
  wasOpen.current = open;
}, [open, run, status]);
// ...
<Button
  disabled={status !== "ready" || triage.applying || triage.selected.size === 0}
  onClick={async () => {
    if (await triage.apply()) onOpenChange(false);
  }}
/>
```

---

### useTabArchive

Tab archive view of the tab center. The hook loads all entries and batches from `tabArchiveStorage` and reloads on `watchVersion`. Entries are indexed once, so search and filters run in memory even for 10,000 entries. Actions run in the background and show toasts.

```ts
function useTabArchive(): UseTabArchiveResult
```

| Field | Type | Description |
| --- | --- | --- |
| entries | `TabArchiveEntry[]` | All archived tabs |
| batches | `Map<string, TabArchiveBatch>` | Batches by ID |
| loading | `boolean` | `true` until the first load has finished |
| filter | `ArchiveFilterState` | `{ query, reason, domain, dateGroup }`. Each defaults to `""` or `"all"` |
| setFilter | `(patch: Partial<ArchiveFilterState>) => void` | Merges a filter patch |
| filtered | `IndexedArchiveEntry[]` | Matching entries, newest first |
| domains | `string[]` | Domains sorted by frequency |
| latestBatch | `{ batch: TabArchiveBatch; count: number } \| null` | Most recent batch that still has entries |
| restore | `(entryIds: string[], activate?: boolean) => Promise<void>` | Reopens entries. `activate` focuses the last restored tab |
| restoreBatch | `(batchId: string) => Promise<void>` | Reopens one batch |
| readLater | `(entryIds: string[]) => Promise<void>` | Moves entries into Read later (they leave the archive) |
| bookmark | `(entryIds: string[]) => Promise<void>` | Bookmarks entries (title and URL only) |
| remove | `(entryIds: string[]) => Promise<void>` | Deletes entries |
| clearAll | `() => Promise<void>` | Clears the archive |

**Usage:**

```tsx
// components/tabCenter/TabArchiveView.tsx
const archive = useTabArchive();
const rows = useMemo(() => buildArchiveRows(archive.filtered, archive.batches), [archive.batches, archive.filtered]);
<ArchiveToolbar filter={archive.filter} domains={archive.domains} onChange={archive.setFilter} />
```

---

### useTabArchiveCount

Number of archived tabs from `tabArchiveStorage.count()`. No entries are loaded, so the hook is cheap. It is refreshed on `watchVersion` and also exported from `hooks/useTabArchive.ts`.

```ts
function useTabArchiveCount(): { count: number; clear: () => Promise<void> }
```

| Field | Type | Description |
| --- | --- | --- |
| count | `number` | Number of archive entries |
| clear | `() => Promise<void>` | Calls `clearTabArchive()` and shows a success or failure toast |

**Usage:**

```tsx
// components/TabCenterPage.tsx
const archiveCount = useTabArchiveCount().count;
// components/tabCenter/TabRulesView.tsx
const archive = useTabArchiveCount();
// ... entryCount={archive.count} onClear={archive.clear}
```

---

### useTabBusySignal

Tells the background that a HamHome save flow is open in this tab. Content script only. While `busy` is true, the hook sends `contentTabSignalService.setBusy(true)` and renews it every `TAB_BUSY_TTL_MS / 2` (7.5 min). It sends `setBusy(false)` on cleanup. Busy tabs get the `saving` protection, so auto archive and auto make room never close them during a save.

```ts
function useTabBusySignal(busy: boolean): void
```

Returns `void`.

**Usage:**

```tsx
// components/SavePanel/InPageSaveFlow.tsx
const isOpen = phase !== "idle";
// While the overlay is open the tab is protected from auto archive and making room
useTabBusySignal(isOpen);
```

---

### useTabFeedback

State of the in-page lifecycle feedback. Content script only. The hook receives messages from `tabFeedbackBus`: Read later toasts, "archived" toasts and budget nudges. A message closes after `TAB_FEEDBACK_DURATION_MS` (8000 ms) unless it is held or an action is running. Esc closes it without swallowing the key. Actions run through the background, and the hook never moves focus into the page.

```ts
function useTabFeedback(): UseTabFeedbackResult
```

| Field | Type | Description |
| --- | --- | --- |
| feedback | `TabFeedbackMessage \| null` | Current message (`readLater`, `archived` or `budgetNudge`) |
| feedbackId | `number` | Increases for every new message. Use it as the React key |
| status | `TabFeedbackStatus` | `"idle"`, `"working"`, `"undone"`, `"done"` or `"failed"` |
| handledTabIds | `ReadonlySet<number>` | Nudge candidates that were already handled |
| dismiss | `() => void` | Closes the message and resets the state |
| hold | `(held: boolean) => void` | Pauses or restarts the auto-close timer (hover, focus, typing a note) |
| undo | `() => Promise<void>` | Calls `undoTabAction(undoToken)`. Sets `failed` when the undo has expired |
| renew | `() => Promise<void>` | Read later message only: calls `readLaterRequeue([bookmarkId])` |
| saveNote | `(note: string) => Promise<void>` | Read later message only: calls `readLaterUpdateNote` |
| readLaterTab | `(tabId: number) => Promise<void>` | Nudge: reads a candidate later and closes it (source `"triage"`) |
| archiveTab | `(tabId: number) => Promise<void>` | Nudge: archives a candidate (reason `"budget"`) |
| openTabCenter | `() => void` | Opens the tab center (`openOptionsPage("tabs")`) and dismisses the message |
| dismissToday | `() => Promise<void>` | Calls `dismissBudgetNudge("today")` and dismisses |
| snoozeHour | `() => Promise<void>` | Calls `dismissBudgetNudge("hour")` and dismisses |

**Usage:**

```tsx
// components/contentUi/feedback/TabFeedbackLayer.tsx
const state = useTabFeedback();
const { feedback } = state;
if (!feedback) return null;
// budget nudge branch
<FeedbackCard key={state.feedbackId} onClose={state.dismiss} onHoldChange={state.hold} /* ... */>
  <BudgetNudge
    handledTabIds={state.handledTabIds}
    status={state.status}
    onReadLater={(tabId) => void state.readLaterTab(tabId)}
    onArchive={(tabId) => void state.archiveTab(tabId)}
    onReviewAll={state.openTabCenter}
    onNotToday={() => void state.dismissToday()}
    onSnooze={() => void state.snoozeHour()}
    /* ... */
  />
</FeedbackCard>
```

---

### useTabLifecycleOnboarding

State of the first-run guidance in three steps: plan, existing tabs ("count from today" or "tidy up now") and recommended protected domains. Every time `open` becomes true, the state resets to step 0. All recommendations stay checked until the user toggles one, also when the open tabs load after the dialog opened. `finish()` turns auto archive on through `lifecycle.setAutoArchiveEnabled(true, …)` with the merged protected domains. This is never retroactive.

```ts
function useTabLifecycleOnboarding(
  snapshot: OpenTabsSnapshot | null,
  lifecycle: UseTabLifecycleSettingsResult,
  open: boolean,
): UseTabLifecycleOnboardingResult
```

| Field | Type | Description |
| --- | --- | --- |
| step, setStep | `OnboardingStep` (`0 \| 1 \| 2`), setter | Current step |
| plan, setPlan | `OnboardingPlan`, setter | `"recommended"` (default) or `"custom"` |
| existingTabs, setExistingTabs | `OnboardingExistingTabs`, setter | `"fromToday"` (default) or `"tidyNow"` |
| recommendedDomains | `string[]` | Domains of pinned tabs and known web apps, without domains that are already protected |
| selectedDomains | `ReadonlySet<string>` | Checked recommendations |
| toggleDomain | `(domain: string) => void` | Checks or unchecks one domain |
| summary | `{ tabs; windows; stale; duplicateGroups; estimated: boolean }` | Current tab state. `estimated` is true when more than half of the idle times are estimates |
| saving | `boolean` | `finish()` is in progress |
| finish | `() => Promise<OnboardingOutcome>` | Applies the plan, then completes onboarding (see below) |
| skip | `() => Promise<void>` | Completes onboarding without turning anything on |

What `finish()` does:

- With the recommended plan, it also sets a 7-day idle threshold, `usage-days` counting and mode `auto`, and turns on the budget (15 tabs, action `nudge`). Only a first set-up gets these values (`buildOnboardingPatch`): auto archive or a budget that is already on, e.g. synced from another device, keeps its own settings.
- It returns `{ tidyTabIds, openRules }`. `tidyTabIds` holds the tabs to preselect for "tidy up now". `openRules` is true for the custom plan.

**Usage:**

```tsx
// components/TabCenterPage.tsx
const lifecycle = useTabLifecycleSettings();
const onboarding = useTabLifecycleOnboarding(snapshot, lifecycle, onboardingOpen);
// components/tabCenter/TabLifecycleOnboarding.tsx
const finish = async () => {
  setOutcome(await onboarding.finish());
  onboarding.setStep(2);
};
```

---

### useTabLifecycleSettings

Lifecycle settings (`sync:tabLifecycleSettings`) and this device's lifecycle state (`local:tabLifecycleState`), both watched. Plain options are written directly. The switches that let HamHome close tabs on its own (auto archive, auto make room) go through the background, as do activity tracking, consent and onboarding. The background records this device's consent.

```ts
function useTabLifecycleSettings(): UseTabLifecycleSettingsResult
```

| Field | Type | Description |
| --- | --- | --- |
| settings | `TabLifecycleSettings` | Current settings (defaults until loaded) |
| state | `TabLifecycleLocalState` | Device state: consents, usage days, last sweep, nudge state and so on |
| loading | `boolean` | `true` until both settings and state are loaded |
| autoArchiveActive | `boolean` | `isAutoArchiveEffective(settings, state)` |
| autoMakeRoomActive | `boolean` | `isAutoMakeRoomEffective(settings, state)` |
| pendingConsents | `{ autoArchive: boolean; autoMakeRoom: boolean }` | Switches that are on in the settings (for example from sync) but not consented to on this device |
| update | `(patch: TabLifecycleSettingsPatch) => Promise<void>` | Writes plain options with `tabLifecycleConfigStorage.updateSettings` |
| setAutoArchiveEnabled | `(enabled: boolean, patch?: Partial<TabAutoArchiveSettings>) => Promise<void>` | Background call. Turning it on records consent, and idle time counts from that moment |
| setOverBudgetAction | `(action: TabBudgetOverAction) => Promise<void>` | Background call. `"auto-archive"` records make-room consent |
| setActivityTracking | `(enabled: boolean) => Promise<void>` | Background call. Turning it off wipes the recorded activity |
| acceptConsent | `(kind: "autoArchive" \| "autoMakeRoom") => Promise<void>` | Accepts on this device a switch that was turned on elsewhere |
| completeOnboarding | `() => Promise<void>` | Records that onboarding is complete |
| addProtectedDomain | `(input: string) => Promise<boolean>` | Normalizes the input and adds it. Resolves `false` for an invalid domain |
| removeProtectedDomain | `(domain: string) => Promise<void>` | Removes a protected domain |

**Usage:**

```tsx
// components/TabCenterPage.tsx
const lifecycle = useTabLifecycleSettings();
// components/tabCenter/TabRulesView.tsx (receives `lifecycle` as a prop)
<AutoArchiveCard
  rule={settings.autoArchive}
  active={lifecycle.autoArchiveActive}
  onToggle={(enabled) => (enabled ? onEnableAutoArchive() : void lifecycle.setAutoArchiveEnabled(false))}
  onChange={(patch) => void lifecycle.update({ autoArchive: patch })}
  onAddDomain={lifecycle.addProtectedDomain}
  onRemoveDomain={(domain) => void lifecycle.removeProtectedDomain(domain)}
  // ...other props
/>
```

---

### useTabTidy

Rule-based tidy-up without AI. Suggestions come from `buildTidySuggestions` and all of them are selected by default. `apply()` runs the selected suggestions:

- **Workspace groups:** saved as new workspaces named after the group, then archived.
- **Read later group:** read later and closed.
- **Duplicates, low-value and idle tabs:** archived.

All archiving uses reason `"triage"`.

```ts
function useTabTidy(snapshot: OpenTabsSnapshot | null): UseTabTidyResult
```

| Field | Type | Description |
| --- | --- | --- |
| suggestions | `TidySuggestions` | `{ duplicates, lowValue, readLater, archive, workspaces }`. Empty without a snapshot |
| selected | `ReadonlySet<number>` | Suggested tab IDs, minus the deselected ones |
| toggle | `(tabIds: number[], selected: boolean) => void` | Selects or deselects tabs |
| reset | `() => void` | Selects everything again |
| applying | `boolean` | Apply is in progress |
| apply | `() => Promise<boolean>` | Applies the selection. Resolves `true` on success and shows a toast with the archived and queued counts |

**Usage:**

```tsx
// components/tabCenter/OpenTabsView.tsx
const tidy = useTabTidy(snapshot);
// onTidyUp:
tidy.reset();
setTidyOpen(true);
// components/tabCenter/TabTidyDialog.tsx
<Button disabled={tidy.applying || tidy.selected.size === 0} onClick={async () => {
  if (await tidy.apply()) onOpenChange(false);
}} />
```

---

### useTabWeeklyOverview

Local tab stats for the last 7 days, loaded from the background (`getTabWeeklyOverview`) every time `active` becomes true.

```ts
function useTabWeeklyOverview(active: boolean): UseTabWeeklyOverviewResult
```

| Field | Type | Description |
| --- | --- | --- |
| overview | `TabWeeklyOverview \| null` | Last loaded overview |
| loading | `boolean` | Loading is in progress |

**Usage:**

```tsx
// components/tabCenter/TabWeeklyOverviewDialog.tsx
const { overview, loading } = useTabWeeklyOverview(open);
```

---

### useWorkspaceBudgetSwitch

Runs before a workspace is restored. When restoring would push the open tabs over the tab budget, the hook asks the user to choose:

- **switch:** saves the current window as a workspace and closes its saved tabs, then restores.
- **open:** restores anyway.
- **cancel:** does not restore.

There is no prompt when the budget is off or its status cannot be read (`tabBadgeService.getBudgetStatus()`).

```ts
function useWorkspaceBudgetSwitch(): UseWorkspaceBudgetSwitchResult
```

| Field | Type | Description |
| --- | --- | --- |
| prompt | `BudgetSwitchPrompt \| null` | Open prompt: `{ name, pageCount, over }` |
| answer | `(choice: BudgetSwitchChoice) => void` | Resolves the open prompt with `"switch"`, `"open"` or `"cancel"` |
| beforeRestore | `(workspace: Workspace, pageCount: number) => Promise<boolean>` | Resolves `false` when the restore must not happen (cancel) |

**Usage:**

```tsx
// components/WorkspacesPage.tsx
const budgetSwitch = useWorkspaceBudgetSwitch();
const state = useWorkspacesPage({ beforeRestore: budgetSwitch.beforeRestore });
// ...
<WorkspaceBudgetSwitchDialog prompt={budgetSwitch.prompt} onChoose={budgetSwitch.answer} />
```

---

## Services (tab lifecycle & read later)

Unless noted otherwise, these modules export a singleton instance (for example `readLaterService`). Extension pages and content scripts reach the background modules through `getBackgroundService()`, for example `readLaterTabs` → `readLaterService.addTabs`.

### content-tab-signal-service

Fire-and-forget messages that a content script sends about its own tab. Content script only. The background resolves the tab from `sender.tab` (see `tab-lifecycle-background`), so the page never needs its tab ID. Export: `contentTabSignalService`.

| Method | Description |
| --- | --- |
| `setBusy(busy: boolean): void` | Sends `TAB_MESSAGES.busy`: a HamHome save flow is open (`true`) or closed (`false`) in this tab |
| `readLaterThisTab(): void` | Sends `TAB_MESSAGES.readLaterThisTab`: put this tab in Read later. The tab closes as configured and the usual toast appears |

### page-snapshot-service

Captures a tab's HTML and stores it as the bookmark's offline snapshot. Background only. It uses SingleFile when available and plain `outerHTML` otherwise. Without `tabId`, it uses the active tab from `tabs.query({ active: true, currentWindow: true })`. Export: `pageSnapshotService`.

| Method | Description |
| --- | --- |
| `getPageHtml(tabId?): Promise<string \| null>` | Sends `EXTRACT_HTML` to the content script. Falls back to `scripting.executeScript` (`document.documentElement.outerHTML`) |
| `getPageSingleFileHtml(tabId?): Promise<string \| null>` | Starts `EXTRACT_SINGLEFILE_HTML` with a capture ID and joins the `singlefile.chunk` messages. Falls back to `getPageHtml` |
| `saveSnapshot(bookmarkId, options?): Promise<SnapshotSaveResult>` | Mode `"none"` skips. Modes `"auto"` and `"markdown"` with `markdown` set store Markdown. Otherwise stores the SingleFile HTML. Then sets `hasSnapshot: true` on the bookmark. Options: `SaveSnapshotBackgroundOptions & { tabId? }` |

### read-later-import-service

JSON import of Read later state, lifecycle settings and, when the file has one, the tab archive. Called directly by `ImportExportPage` (extension page). Exports: `importLifecycleData`, `LifecycleImportResult`.

| Method | Description |
| --- | --- |
| `importLifecycleData(data, createdBookmarkIds): Promise<LifecycleImportResult>` | Imports entries, archive and settings, and returns `{ readLater, archived, settings }`. Details below |

How the import works:

- Bookmark IDs change on import, so entries are matched to local bookmarks by normalized URL.
- Entries whose local copy is newer or equally new are skipped.
- The file's `queueOnly` flag is kept only for bookmarks created by this import.
- Archive entries go into one new manual batch.
- Settings are applied through `importRawSettings` with `updatedAt` set to now. Automatic closing still needs this device's consent.

### read-later-service

Read later as a state of a bookmark. Background only.

- Adding a URL that is not bookmarked creates a queue-only bookmark, hidden from library views until kept. Adding a library bookmark only queues it.
- "Read later & close" first extracts the content and writes the bookmark and queue state. Only then does it close the tab.
- Every add stores an undo record.

Export: `readLaterService`.

| Method | Description |
| --- | --- |
| `addTab(tabId, { source?, note?, closeTab?, showFeedback? }): Promise<ReadLaterAddResult>` | One tab (popup, shortcut, context menu, save overlay). Details below |
| `addTabs(tabIds, source, { closeTabs? }): Promise<ReadLaterBatchResult>` | Several tabs (tab center, triage, nudge, agent). Extracts 3 tabs at a time. `closeTabs` overrides the setting. Writes an AI summary only when `autoSummary` is `"all"` |
| `addLink({ url, text?, sourceTabId?, sourceUrl? }): Promise<ReadLaterAddResult>` | "Read link later" without opening the link. Details below |
| `addArchiveEntries(entryIds): Promise<ReadLaterBatchResult>` | Moves archived tabs into the queue (title and URL only). Queued entries leave the archive |
| `addBookmarks(bookmarkIds, source): Promise<ReadLaterBatchResult>` | Queues library bookmarks. No bookmarks are created |
| `getQuickList(limit): Promise<ReadLaterQuickList>` | Newest unread items for the in-page edge panel |
| `open(bookmarkId): Promise<boolean>` | Opens the item in a new active tab and marks it as reading. Remembers the tab for enrichment and for the reading bar |
| `getReadingSession(tabId, pageUrl): Promise<ReadingSession \| null>` | Session of a tab opened from the queue. `null` once the item is read or removed, or after the tab navigated elsewhere |
| `endReadingSession(tabId): Promise<void>` | Forgets the reading tab |
| `handleTabComplete(tabId): Promise<void>` | Runs when a tab finishes loading: fills in links that were added without opening them, then sends `TAB_MESSAGES.readingSession` to the page |
| `markRead(bookmarkIds): Promise<void>` | Sets status `read` and counts `readLaterRead` |
| `requeue(bookmarkIds): Promise<void>` | Moves items back to unread and renews their expiry. Counts `readLaterAdded` for items that were not pending |
| `updateNote(bookmarkId, note): Promise<void>` | Sets the note. An empty note clears it |
| `keep(bookmarkIds, { classify? }): Promise<void>` | Sets `queueOnly: false`. With `classify`, AI fills in an empty category, tags and description |
| `remove(bookmarkIds): Promise<{ trashed; dequeued }>` | Queue-only bookmarks go to the trash. Library bookmarks get `removedAt` |
| `runExpiry(now?): Promise<number>` | Daily task: pending items past `expireAfterDays` become `expired`. Nothing is deleted |
| `revert(record: ReadLaterUndoRecord): Promise<void>` | Undo: reopens closed tabs, purges created bookmarks and restores the previous queue state |

`addTab()` details:

- Defaults: `source` is `"manual"`, and `closeTab` follows `readLater.closeTabOnAdd`.
- When `saveSnapshotOnAdd` is on and the item is new to the queue and not private, it waits for the offline snapshot (at most 10 s). If the snapshot fails, the entry is marked `snapshotMissing`.
- It never closes a pinned tab.
- The toast appears in the tab, or in the tab that becomes active after closing. `showFeedback: false` turns it off.
- It writes an AI summary for new, non-private bookmarks unless `autoSummary` is `"off"`.

`addLink()` details:

- The title comes from the link text. When that is missing, it is asked from the source tab or derived from the URL.
- The entry is marked `needsEnrichment`.
- The toast appears in the source tab, or else in the active tab.

### tab-activity-service

Records when each tab in a normal, non-incognito window was first seen and last used. Background only.

- Activating a tab, focusing its window and switching away from it count as use. So does navigating the active tab.
- Each day with such an interaction is recorded as a usage day.
- Every event persists its change, so the MV3 service worker can stop at any time.
- Records never leave the device.

Export: `tabActivityService`.

| Method | Description |
| --- | --- |
| `isTracking(): Promise<boolean>` | Whether `activityTracking` is on |
| `initialize(): Promise<void>` | Idempotent start-up; every handler waits for it. Details below |
| `syncRecords(current, previous?, now?): Promise<TabActivityRecord[]>` | Same browser session: creates estimated records for unknown tabs, refreshes positions and drops records of tabs that are gone. Also used by the sweep |
| `forgetWindow(windowId): void` | Drops the cached window type and the stored active tab |
| `handleCreated(tab)` | Creates a record, or takes one from the restart pool |
| `handleActivated({ tabId, windowId })` | The previous tab was in use until now. The new tab is in use now. Records the usage day |
| `handleUpdated(tabId, changeInfo, tab)` | URL change: counts as use only for the active tab. Audible change: sets `lastAudibleAt` |
| `handleRemoved(tabId, removeInfo)` | Deletes the record. Keeps it when the window is closing, for the next start-up |
| `handleReplaced(addedTabId, removedTabId)` | Moves the record to the new tab ID |
| `handleAttached(tabId, attachInfo)` | Updates window and index. Deletes the record when the tab moved to a non-normal window |
| `handleWindowFocusChanged(windowId)` | The previous window's tab was in use until now. The newly focused window's active tab is in use now |
| `setLocked(tabIds, locked): Promise<void>` | Locks or unlocks tabs (creates records when needed) and refreshes the persisted `lockedUrls` |
| `renew(tabIds): Promise<void>` | Resets the idle timer |
| `clearAll(): Promise<void>` | Runs when tracking is turned off: wipes records, usage days, locked URLs and pending confirmations |

`initialize()` details:

- On a new browser session, it reconciles the previous records with the current tabs (`reconcileActivityRecordsDetailed`).
- Unclaimed records stay in a pool for 2 minutes, so tabs restored late can still claim them.
- It updates `lastStartupAt`, `trackingStartedAt` and `lockedUrls`.
- In the same session, it only runs `syncRecords`.

### tab-archive-service

The safety net behind every tab HamHome closes. Its header does not name a context, but all callers run in the background: the background service, the sweep, the budget service, undo and agent tools. Archiving comes first and closing second. Entries are committed in one transaction before any tab closes, and nothing closes when that write fails. Exports: `tabArchiveService`, `ArchiveTabsOptions { automatic?; skipProtected? }`.

| Method | Description |
| --- | --- |
| `archiveTabs(tabIds, reason, options?): Promise<TabArchiveResult>` | Archives, then closes. Details below |
| `restoreEntries(entryIds, { activate? }): Promise<TabRestoreResult>` | Reopens entries and removes them from the archive. Details below |
| `restoreBatches(batchIds): Promise<TabRestoreResult>` | Restores every entry of the given batches |
| `deleteEntries(entryIds): Promise<void>` | Deletes entries |
| `clear(): Promise<void>` | Clears the archive |
| `runRetention(now?): Promise<number>` | Daily task: purges entries past `archive.retentionDays` and beyond 10,000 entries, and prunes empty batches older than one day |

`archiveTabs()` details:

- It never closes pinned or incognito tabs.
- `skipProtected` also skips active, audible, busy and locked tabs. `automatic` marks the batch as automatic.
- Each entry stores its origin: window, index and tab group.
- Closing is retried once after 500 ms. Entries of tabs that stayed open are removed from the archive again.
- It counts `autoArchived` or `manualArchived`.

`restoreEntries()` details:

- Tabs reopen in their original window and position. When that window is gone, they open in the last focused normal window.
- Auto tab grouping is suppressed for the restored tabs.
- Budget actions are suppressed for 2 minutes.
- On Chromium, tabs go back into their tab group, or into a recreated group with the same title and color.
- `activate` focuses the last restored tab.

### tab-badge-service

Updates the toolbar badge and title:

- **Tab count:** shown when the budget is on or "show count" is set. Colored by budget level when the budget is on.
- **Pending dot:** a `•` while archive confirmations wait.
- **Flash:** a short badge where no in-page toast can be shown.

Updates are debounced by 300 ms. The badge runs in the background. `getBudgetStatus()` is also called from extension pages (`useWorkspaceBudgetSwitch`). Exports: `tabBadgeService`, `countBudgetTabs`.

| Method | Description |
| --- | --- |
| `countBudgetTabs()` (exported function) | Counts non-pinned tabs per normal, non-incognito window with one `tabs.query`. Marks the focused (or last focused) window |
| `scheduleRefresh(): void` | Runs `refresh()` after 300 ms (debounced) |
| `getBudgetStatus(): Promise<TabBudgetStatus>` | Budget status from the settings and the current counts |
| `refresh(): Promise<void>` | Sets the badge text, color, text color and title. The title is in Chinese or English, from the app language. Skipped while a flash is showing |
| `flash(text = "✓", color = "#16A34A"): Promise<void>` | Shows a badge for 2.5 s, then refreshes |

### tab-bookmark-service

Quick bookmarking of several open or archived tabs at once (tab center, triage), without AI. Runs in the background and is called through the background service. Existing URLs are skipped, never duplicated. If such a URL was a queue-only Read later bookmark, it moves into the library. Export: `tabBookmarkService`.

| Method | Description |
| --- | --- |
| `bookmarkTabs(tabIds, { categoryByTabId? }): Promise<QuickBookmarkResult>` | Extracts content from 3 tabs at a time. Private pages get no description or content. `categoryByTabId` files tabs into existing categories (from AI tidy-up). Queues embeddings |
| `bookmarkArchiveEntries(entryIds): Promise<QuickBookmarkResult>` | Uses only the title and URL of archived entries |

### tab-budget-service

Handles an open tab count over the budget. Background only. The budget never blocks opening a tab. Depending on `overBudgetAction`, it does one of three things:

- Only colors the badge.
- Shows one gentle in-page nudge per overage. A 15-minute cooldown, "not today" and snooze are respected.
- When explicitly turned on on this device, archives the least recently used idle tabs to make room, with an undo toast.

Export: `tabBudgetService`.

| Method | Description |
| --- | --- |
| `evaluate(grew: boolean): Promise<void>` | Runs after tabs open, close or move (the caller debounces). Details below |
| `scheduleNudge(): void` | Tries the nudge after `NUDGE_DWELL_MS` (3 s) |
| `onPageReady(): Promise<void>` | Retries a pending nudge that was not shown yet, when the user lands on another page |

`evaluate()` details:

- It tracks the overage episode in session storage.
- It acts only when the count grew and the action is not `badge-only`.
- It does nothing within 15 minutes after start-up or while HamHome is opening tabs in bulk.
- Otherwise it makes room when that is effective on this device, and falls back to the nudge.
- The nudge appears on the active, fully loaded tab. It lists up to 3 least recently used, unprotected candidates. On private pages their titles are hidden.

### tab-content-service

Talks to content scripts on behalf of the background:

- Makes sure a content script runs. Tabs opened before the extension was installed or updated get the manifest scripts injected on demand.
- Extracts reading content.
- Asks about page signals (unsubmitted input, context-menu link).

Pages that cannot be scripted fall back to the tab title. Exports: `tabContentService`, `ExtractedTabContent` (`ReadingPageContent` plus `isPrivate` and `partial`).

| Method | Description |
| --- | --- |
| `ping(tabId): Promise<boolean>` | Sends `TAB_MESSAGES.ping` with an 800 ms timeout |
| `ensureContentScript(tabId): Promise<boolean>` | Pings the tab. If needed, waits up to 3 s for a loading page, then injects via `scripting.executeScript` and pings again. Resolves `false` for pages that cannot host a content script |
| `extract(tabId): Promise<ExtractedTabContent \| null>` | Title, description, Markdown and reading time. Never throws. Details below |
| `hasDirtyForm(tabId): Promise<boolean>` | Sends `TAB_MESSAGES.queryDirtyForm` (600 ms timeout). An unreachable page counts as clean |
| `getContextLinkText(tabId, linkUrl): Promise<string>` | Text of the link the user right-clicked (`TAB_MESSAGES.contextLink`) |

`extract()` details:

- It sends `TAB_MESSAGES.extractReading` with a 6 s timeout.
- Private pages return only the title and URL, with `isPrivate` set.
- Discarded or unreachable tabs fall back to a one-off metadata script, or to the tab metadata (`partial: true`).

### tab-feedback-service

Shows in-page feedback: undo toasts after "read later & close" or archiving, and budget nudges. The content UI renders them. Pages that cannot host the UI get a badge flash. Runs in the background and is called by read-later-service and tab-budget-service. Export: `tabFeedbackService`.

| Method | Description |
| --- | --- |
| `show(tabId, feedback): Promise<boolean>` | Ensures a content script and sends `TAB_MESSAGES.feedback`. Resolves `false` when the feedback could not be shown |
| `findActiveTab(windowId?): Promise<Tab \| null>` | Active tab of the window, or of the last focused normal window |
| `showInActiveTab(windowId, feedback, fallbackBadge = "✓"): Promise<boolean>` | Shows the feedback on the tab the user is looking at. Falls back to a badge flash |

### tab-lifecycle-background

`registerTabLifecycleBackground()` wires up the lifecycle features in the background. `entrypoints/background.ts` must call it synchronously at start-up, so that MV3 delivers the events that woke the service worker.

On registration it:

- Runs `tabActivityService.initialize()` and `tabLifecycleService.syncAutoArchiveActivation()`.
- Runs the daily tasks (archive retention and Read later expiry) once per browser session. The session key `tl.dailyTasksRan` records the run, because alarms do not catch up while the device is off.
- Schedules a badge refresh and a stats sample.

Alarms (the names are exported as constants):

| Alarm | Period | Runs |
| --- | --- | --- |
| `TAB_LIFECYCLE_SWEEP_ALARM` (`"tab-lifecycle-sweep"`) | 30 min | `tabLifecycleService.runSweep()` and a stats sample |
| `TAB_ARCHIVE_RETENTION_ALARM` (`"tab-archive-retention"`) | 24 h | `tabArchiveService.runRetention()` |
| `READ_LATER_EXPIRY_ALARM` (`"read-later-expiry"`) | 24 h | `readLaterService.runExpiry()` |

Listeners:

| Event | Effect |
| --- | --- |
| `runtime.onStartup` | `tabActivityService.initialize()` |
| `tabs.onCreated` | `handleCreated`, then a budget check (count grew) |
| `tabs.onActivated` | `handleActivated`, then a nudge retry (`tabBudgetService.onPageReady`) |
| `tabs.onUpdated` | `handleUpdated`. A pin change triggers a budget check (count grew when the tab was unpinned). `status: "complete"` triggers `readLaterService.handleTabComplete` and, for the active tab, a nudge retry |
| `tabs.onRemoved` | `handleRemoved`, clears the busy flag, ends the reading session, then a budget check |
| `tabs.onReplaced` | `handleReplaced` |
| `tabs.onAttached` | `handleAttached`, then a budget check (count grew) |
| `tabs.onDetached` | Badge refresh |
| `windows.onFocusChanged` | `handleWindowFocusChanged`, a badge refresh and a stats sample |
| `windows.onRemoved` | `tabActivityService.forgetWindow` |
| `runtime.onMessage` (sender is a tab) | `TAB_MESSAGES.busy` calls `tabSessionStorage.setBusy(tabId, busy, TAB_BUSY_TTL_MS)`. `TAB_MESSAGES.readLaterThisTab` calls `readLaterService.addTab(tabId, { source: "manual" })` |
| `tabLifecycleConfigStorage.watchSettings` | Syncs auto archive activation, then a badge refresh and a stats sample |

A budget check is debounced by 400 ms, so bursts become one `tabBudgetService.evaluate(grew)` call. Each check also schedules a badge refresh and a stats sample. Stats samples are debounced by 2 s.

### tab-lifecycle-service

Orchestrates the tab lifecycle.

- `getSnapshot()` is read-only. It works in the background and in extension pages, which share the IndexedDB origin.
- `runSweep()` runs in the background only.
- Automatic closing starts only after the user turned it on on this device. Turning it on is never retroactive.

Exports: `tabLifecycleService`, `STARTUP_GRACE_MS` (15 min), `SnapshotOptions { dirtyTabIds? }`.

| Method | Description |
| --- | --- |
| `loadNormalTabs(): Promise<{ tabs; focusedWindowId? }>` | Tabs of all normal, non-incognito windows, with one `windows.getAll` call |
| `getSnapshot(options?): Promise<OpenTabsSnapshot>` | Builds the snapshot. Details below |
| `runSweep(now?): Promise<TabLifecycleSweepSummary>` | Auto archive check. Details below |
| `syncAutoArchiveActivation(settings?, now?): Promise<void>` | Tracks when auto archive becomes effective: sets `autoArchiveActive` and the idle-time baseline |
| `setAutoArchiveEnabled(enabled, patch?): Promise<TabLifecycleSettings>` | Called from this device's UI. Turning it on records consent, and idle time counts from now. Turning it off clears pending confirmations |
| `setOverBudgetAction(action): Promise<TabLifecycleSettings>` | `"auto-archive"` records make-room consent |
| `acceptSyncedConsent(kind): Promise<void>` | Accepts on this device a switch that another device turned on |
| `setActivityTracking(enabled): Promise<void>` | Turning it off wipes activity data (`tabActivityService.clearAll`). Turning it on initializes tracking again |
| `completeOnboarding(): Promise<void>` | Sets `onboardingCompletedAt` (only the first time) |
| `confirmPendingArchive(tabIds?): Promise<number>` | Confirm mode: archives the pending tabs (reason `"expired"`, protected tabs skipped) |
| `keepPendingArchive(tabIds?): Promise<void>` | Confirm mode: renews the pending tabs and drops them from the list |
| `dismissBudgetNudge(mode: "today" \| "hour"): Promise<void>` | `"today"`: no nudge for the rest of the day. `"hour"`: snooze for one hour |
| `resumeBudgetNudge(): Promise<void>` | Clears the dismissal and the snooze |
| `focusTab(tabId): Promise<void>` | Activates the tab and focuses its window |

`getSnapshot()` details:

- It reads tabs, groups, settings, state, busy and bulk-opened tabs, pending confirmations and the tab-group rules that protect their tabs.
- It reads activity records only while tracking is on.
- It passes everything to `buildOpenTabsSnapshot`.
- `options.dirtyTabIds` adds the dirty-form protection to those tabs.

`runSweep()` details:

- It stores the summary as `state.lastSweep` and refreshes the badge.
- It skips with a reason: `tracking-off`, `inactive`, `startup-grace` (15 min) or `min-open-tabs`.
- It handles at most 30 expired, unprotected tabs per run. With `protectDirtyForms`, those tabs are re-checked for unsubmitted input.
- In mode `mark-only` it only marks tabs. In `confirm` it stores them as pending confirmations. In `auto` it archives them with reason `"expired"`.

### tab-stats-service

Local tab stats. It samples the open tab count while activity tracking is on, and counts archive, restore and Read later events. Recording never throws into the action it counts. Runs in the background. Export: `tabStatsService`.

| Method | Description |
| --- | --- |
| `sample(now?): Promise<void>` | Records the open tab count (pinned tabs excluded) and whether it is over budget. Writes when something changed, on a new day, or at least every 10 minutes. When tracking is off, it clears `lastSample` |
| `count(counter: TabStatsCounter, delta = 1): void` | Fire and forget: increments today's counter |
| `getWeeklyOverview(now?): Promise<TabWeeklyOverview>` | Overview of the last 7 days (`buildWeeklyOverview`) |

### tab-triage-service

AI tidy-up of open tabs. Runs in extension pages; applying the result goes through the background. It decides which tabs AI may see and which local rules decide, reuses cached answers, asks AI in batches of 40 (2 at a time) and checks the answers. Exports: `tabTriageService`, `TabTriageError` (`code: "not-configured" | "failed"`).

| Method | Description |
| --- | --- |
| `isAvailable(): Promise<boolean>` | Whether an AI agent is configured |
| `suggest(snapshot): Promise<TabTriageResult>` | Builds suggestions for the snapshot. Details below |

`suggest()` details:

- It throws `TabTriageError("not-configured")` when no AI is set up.
- It checks every tab for private content.
- Pinned, protected, private and non-web tabs get local suggestions from the rule-based tidy-up.
- It reuses cached answers for 24 hours, matched by cleaned URL and language.
- The prompt also gets up to 30 workspace names and the bookmark category paths.
- It throws `"failed"` only when every batch failed.
- Fresh answers are merged into the cache.

### tab-undo-records

Undo records behind the in-page Undo buttons. They are kept in `storage.session` (`tl.undo.<token>`), so they survive a service worker restart, and are honoured for 10 minutes. Exports: `UNDO_TTL_MS`, and the types `ArchiveUndoRecord`, `ClosedTabSnapshot`, `ReadLaterUndoRecord` and `TabUndoRecord`.

| Method | Description |
| --- | --- |
| `saveUndoRecord(record): Promise<string>` | Stores the record and returns its token (`nanoid`) |
| `takeUndoRecord(token): Promise<TabUndoRecord \| null>` | Reads and deletes the record. Returns `null` when it is unknown or older than 10 minutes |

### tab-undo-service

Undo for the in-page toasts. Runs in the background (`undoTabAction`). Export: `tabUndoService`.

| Method | Description |
| --- | --- |
| `undo(token): Promise<boolean>` | An archive record restores its batch. A Read later record is reverted with `readLaterService.revert`. Resolves `false` when the token is unknown or expired |

### tab-triage-agent-service (`lib/agent/services`)

One structured agent call per batch of the AI tidy-up. The command is `suggestTabTriage`, with at most 1 iteration, temperature 0.2 and a Chinese or English system prompt, chosen by the configured language. The prompt carries only ids, idle times, tab groups, titles and cleaned URLs, plus the existing workspace names and category paths. It never carries page content. Called by tab-triage-service. Export: `tabTriageAgentService`.

| Method | Description |
| --- | --- |
| `suggest({ items, workspaces, categories }): Promise<{ items: RawTriageItem[]; language }>` | Runs the command with a JSON output schema (destination `keep`, `readLater`, `bookmark`, `workspace` or `close`) and parses the answer with zod. Errors are rethrown with `getAgentErrorMessage(error, "AI 整理失败")` |

### tab-lifecycle-tools (`lib/agent/tools`)

Agent tools for open tabs, the tab archive and Read later. `createGlobalAgentTools` adds them for the global agent, which runs in the background. Services load on first use. The agent can never turn on auto archive or auto make room; those switches only exist in the UI. Exports: `createTabLifecycleTools(): AgentTool[]`, and `isAutoApprovedCall` (re-exported). Approval follows `requiresUserApproval`, which gates every tool with `riskLevel: "high"`.

| Tool | Risk level | Read only | Needs approval | Description |
| --- | --- | --- | --- | --- |
| `list_open_tabs` | low | yes | no | Open tabs with idle days (and whether that is an estimate), protection, idle state, duplicates and tab group. Filters: `minIdleDays`, `duplicatesOnly`, `query`, `limit` (default 50, max 200) |
| `get_tab_lifecycle_status` | low | yes | no | Budget, stats, auto archive status, pending confirmations, tabs auto-archived in the last 24 h, archive size and Read later counts |
| `search_tab_archive` | low | yes | no | Searches the archive by `query`, `domain`, `reason`, `withinDays` and `limit` (default 30) |
| `restore_archived_tabs` | medium | no | no | Reopens archive entries (`entryIds`) |
| `move_tabs_to_read_later` | high | no | yes | `readLaterService.addTabs(tabIds, "agent", { closeTabs: true })` |
| `archive_tabs` | high | no | yes | Archives and closes tabs (reason `"manual"`). Pinned tabs are never closed |
| `list_read_later` | low | yes | no | Items by `status` (default `unread`), newest first. `limit` defaults to 30 |
| `update_read_later_status` | high | no | only for batches | Actions `markRead`, `requeue` or `keep`. `keep` lets AI classify only when there is one item. A call with at most one `bookmarkIds` entry is auto-approved |

### tool-approval-rules (`lib/agent/tools`)

Per-call exceptions to the approval policy. The module imports no storage, so the policy stays light. `createToolApprovalPolicy` uses it in `onAsk`.

| Method | Description |
| --- | --- |
| `isAutoApprovedCall(toolName, input): boolean` | `true` for `update_read_later_status` with at most one `bookmarkIds` entry, so single items run without asking |

### queue-bookmark-embeddings (`lib/embedding`)

Queues embedding generation for bookmarks. Background only. It does nothing when semantic search is off or not configured. Used by read-later-service, tab-bookmark-service and the background service.

| Method | Description |
| --- | --- |
| `queueBookmarkEmbeddings(bookmarkIds, { waitForCompletion? }): Promise<void>` | Adds the existing bookmarks to `embeddingQueue` and starts the queue unless it is already processing. `waitForCompletion` waits for the run to finish |

---

## Storage (tab lifecycle & read later)

Storage modules for Read later and the tab lifecycle. WXT `storage` items and IndexedDB are local to the device unless the table says otherwise.

| Module | Backing store / key | Synced | Exported | Lifetime | Notes |
| --- | --- | --- | --- | --- | --- |
| read-later-storage | `local:readLaterEntries` (`ReadLaterEntryMap` keyed by bookmark ID) | WebDAV file `bookmarks/read-later.json` (last write wins per entry) | Yes, `readLaterEntries` in the JSON export | Until removed. Expiry only changes the status. Leaving the queue is soft (`removedAt`) | Holds queue state only; the bookmark stays in bookmark storage. Writes run one after another |
| tab-lifecycle-db | IndexedDB `HamHomeTabLifecycle` v1: `tabActivity` (key `tabId`), `tabArchive` (key `id`; indexes `closedAt`, `batchId`, `normalizedUrl`), `archiveBatches` (key `id`; index `createdAt`) | No | — | — | Native IndexedDB helpers. Extension pages share the origin with the background. Content scripts must not touch the database |
| tab-activity-storage | IndexedDB `HamHomeTabLifecycle.tabActivity` | No | No | One record per open tab. Deleted when the tab closes, but kept when its window closes (for the next start-up). Wiped when tracking is turned off | One readwrite transaction per write |
| tab-archive-storage | IndexedDB `HamHomeTabLifecycle.tabArchive` and `archiveBatches`, plus the change counter `local:tabArchiveVersion` | No | Only when the user opts in ("include tab archive", `tabArchive` in the JSON) | Retention of 30, 90 or 180 days, or forever (default 90). At most 10,000 entries (daily retention) | Re-archiving a URL merges into its existing entry (`closeCount` + 1). Every write bumps `local:tabArchiveVersion` |
| tab-lifecycle-config-storage | `sync:tabLifecycleSettings` | Browser sync storage, plus WebDAV file `tab-lifecycle-config.json` | Yes, `tabLifecycleSettings` in the JSON export | Persistent | Kept out of `LocalSettings`. Fields from newer clients are preserved. Synced switches still need this device's consent |
| tab-lifecycle-state-storage | `local:tabLifecycleState` | No | No | Persistent on the device. Usage days cover the last 120 days | Usage days, locked URLs, start-up time, consents, onboarding, nudge throttling and the last sweep. The header names the background as the only writer. Updates run one after another |
| tab-session-storage | `storage.session`, keys `tl.*`. Falls back to an in-memory map where `storage.session` is missing | No | No | Browser session: cleared when the browser or extension restarts, kept across service worker restarts | Active tab per window, focused windows, budget episode, bulk-opened and busy tabs, pending confirmations, enrichment and reading tabs, undo records |
| tab-stats-storage | `local:tabLifecycleStats` | No | No | 90 days (pruned when sampling) | Counts only, no titles or URLs. Updates run one after another |
| tab-triage-cache-storage | `local:tabTriageCache` (keyed by cleaned URL) | No | No | 24 hours, at most 500 entries | AI tidy-up answers per URL and language |

### read-later-storage

Export: `readLaterStorage`.

- `getAll()`: copy of all entries (`ReadLaterEntryMap`).
- `get(bookmarkId)`: one entry, or `undefined`.
- `update(bookmarkId, updater)`: read-modify-write of one entry. The updater returns the new entry, `null` to delete or `undefined` to leave it unchanged.
- `updateMany(bookmarkIds, updater)`: same contract for several entries; returns the updated entries.
- `set(entry)` and `setMany(entries)`: write entries.
- `remove(bookmarkIds)`: hard delete, used when the bookmark itself is gone for good.
- `replaceAll(entries)`: replaces the whole map (sync merge).
- `clear()`: deletes all entries.
- `watch(callback)`: subscribes to changes and returns an unwatch function.

### tab-lifecycle-db

- `TAB_LIFECYCLE_DB_NAME` (`"HamHomeTabLifecycle"`), plus the store names `TAB_ACTIVITY_STORE`, `TAB_ARCHIVE_STORE` and `ARCHIVE_BATCH_STORE`.
- `openTabLifecycleDB()`: returns the cached `IDBDatabase`, reset on version change or close.
- `requestToPromise(request)`: wraps an `IDBRequest` in a promise.
- `runTabLifecycleTransaction(storeNames, mode, work)`: runs `work` in one transaction and resolves with its result once the transaction committed. Aborts on error.

### tab-activity-storage

Export: `tabActivityStorage`.

- `getAll()`, `getMap()` (keyed by tab ID) and `get(tabId)`.
- `update(tabId, updater)`: atomic read-modify-write. `null` deletes the record, `undefined` leaves it unchanged.
- `updateMany(tabIds, updater)`: same, in one transaction.
- `put(record)` and `putMany(records)`.
- `delete(tabId)` and `deleteMany(tabIds)`.
- `replaceAll(records)`: replaces every record (reconciliation after a restart).
- `clear()`.

### tab-archive-storage

Export: `tabArchiveStorage`.

- `getAllEntries()`, `getEntries(ids)` and `getEntriesByBatch(batchId)`.
- `getAllBatches()` and `getBatch(id)`.
- `count()`: number of entries.
- `addBatch(batch, entries)`: writes a batch with its entries in one transaction (all or nothing) and returns `{ batch, entries }`. URLs that are already archived are merged (`mergeArchiveEntry`) and leave their old batch.
- `deleteEntries(ids)`: deletes entries. Batches left empty are deleted too.
- `pruneEmptyBatches(olderThan)`: deletes empty batches older than the given time and returns how many.
- `clear()`.
- `bumpVersion()` and `watchVersion(callback)`: change signal for extension pages, which returns an unwatch function. IndexedDB has no change events.

### tab-lifecycle-config-storage

Export: `tabLifecycleConfigStorage`.

- `getSettings()`: normalized settings.
- `getRawSettings()`: the stored value including fields that only newer clients know (for sync).
- `updateSettings(patch)`: applies the patch (writes run one after another), sets `updatedAt` and returns the new settings.
- `importRawSettings(raw)`: applies settings from sync or import as they are, keeping their timestamp.
- `resetSettings()`: restores the defaults with `updatedAt` set to now.
- `watchSettings(callback)`: subscribes to normalized settings and returns an unwatch function.

### tab-lifecycle-state-storage

Export: `tabLifecycleStateStorage`.

- `get()`: normalized state.
- `update(updater)`: read-modify-write; writes run one after another. Returning the same object skips the write.
- `patch(partial)`: merges a partial state.
- `reset()`: restores the default state.
- `watch(callback)`: subscribes to changes and returns an unwatch function.

### tab-session-storage

Exports: `tabSessionStorage`, `BudgetEpisode`.

- `get(key, fallback)`, `set(key, value)` and `remove(key)`: generic access. Other modules also store `tl.reconcilePool` and `tl.dailyTasksRan` this way.
- `claimNewSession()`: `true` the first time it is called in a browser session.
- `getActiveTab(windowId)`, `setActiveTab(windowId, tabId)` and `clearActiveTab(windowId)`.
- `getFocusedWindow()`, `setFocusedWindow(windowId)` (also updates the last focused window) and `getLastFocusedWindow()`.
- `getBudgetEpisode()` and `setBudgetEpisode(episode | null)`.
- `markBulkOpened(tabIds, until)` and `getBulkOpened(now?)`, which returns `{ tabIds, activeUntil }`. A `*` entry suppresses budget actions as a whole.
- `setBusy(tabId, busy, ttlMs)` and `getBusyTabIds(now?)`.
- `getPendingConfirm()` and `setPendingConfirm(items)`.
- `getUndo(token)`, `setUndo(token, value)` and `removeUndo(token)`.
- `setEnrichment(tabId, bookmarkId | null)` and `getEnrichment(tabId)`: links added with "read link later", filled in once their tab finished loading.
- `setReadingTab(tabId, bookmarkId | null)` and `getReadingTab(tabId)`: tabs opened from Read later.

### tab-stats-storage

Export: `tabStatsStorage`.

- `get()`: normalized stats.
- `update(updater)`: read-modify-write; writes run one after another. Returning the same object skips the write.
- `clear()`.

### tab-triage-cache-storage

Export: `tabTriageCacheStorage`.

- `get(now?)`: the cache without expired entries.
- `merge(entries, now?)`: merges new entries, then prunes.
- `clear()`.

---

## Utils (tab lifecycle & read later)

Pure helpers, except where noted: `page-signals` and the two buses keep module-level state in the content script.

### tab-archive.utils

Tab archive helpers: retention, merging re-archived URLs, grouping and search.

- `ARCHIVE_MAX_ENTRIES` (10,000), `ARCHIVE_RETENTION_OPTIONS` (`[30, 90, 180, null]`), `RECENT_AUTO_BATCH_MS` (24 h), `SWEEP_MAX_ARCHIVE` (30), `ARCHIVE_REASONS` (`expired`, `budget`, `manual`, `duplicate`, `triage`).
- `selectArchiveEntriesToPurge(entries, retentionDays, now, maxEntries?)`: IDs past the retention period, then the oldest ones beyond the cap.
- `mergeArchiveEntry(existing, incoming)`: re-archiving a URL updates the existing entry, which moves to the new batch with `closeCount` + 1.
- `ArchiveDateGroup`, `ARCHIVE_DATE_GROUPS` and `getArchiveDateGroup(closedAt, now)`: today, yesterday, week or earlier.
- `buildArchiveSearchText(entry)`: lowercase title and URL.
- `indexArchiveEntries(entries, now)`: sorts newest first and precomputes the search text and date group (`IndexedArchiveEntry`).
- `filterArchiveEntries(indexed, filter)`: filters by reason, domain and date group; every query term must match.
- `listArchiveDomains(entries)`: domains sorted by frequency.
- `summarizeRecentAutoBatches(batches, entries, now)`: automatic batches of the last 24 hours that were not undone and still hold entries.
- `getDomainFromUrl(url)`: hostname, or the protocol for URLs without a host.
- `buildArchiveRows(items, batches)`: `ArchiveListRow[]` with date headers, then batch blocks, then entries.

### tab-budget.utils

Tab budget: counting, badge appearance, nudge throttling and auto make room. Pinned tabs never count.

- `BUDGET_LIMIT_MIN` (5), `BUDGET_LIMIT_MAX` (100), `DEFAULT_BUDGET_LIMIT` (15).
- `NUDGE_COOLDOWN_MS` (15 min), `NUDGE_DWELL_MS` (3 s), `BULK_OPEN_SUPPRESSION_MS` (2 min), `MAKE_ROOM_MIN_IDLE_MS` (1 h), `MAKE_ROOM_MIN_AGE_MS` (10 min).
- `BADGE_COLORS`: colors for `normal`, `warning` and `over`.
- `clampBudgetLimit(limit)`: rounds and clamps to 5–100; returns 15 for a non-finite value.
- `getBudgetLevel(count, limit)`: `normal` below 80%, `warning` from 80%, `over` above the limit.
- `formatBadgeCount(count)`: badge text, capped at `"99+"`.
- `computeBudgetStatus({ enabled, limit, scope, windows, lastFocusedWindowId? })`: `TabBudgetStatus`. In `per-window` scope it counts the focused window, else the last focused one, else the first.
- `getNudgeBlockReason(state, episodeNudged, now)`: `alreadyShown`, `dismissedToday`, `snoozed`, `cooldown` or `null`.
- `selectMakeRoomCandidates(tabs, over, now)`: up to `over` tab IDs, least recently used first. Only unprotected tabs that were not bulk-opened, idle for at least 1 h and first seen at least 10 min ago.

### tab-duplicates.utils

Duplicate tab detection. It uses the bookmark URL normalization (tracking parameters and trailing slash removed, hash kept).

- `normalizeTabUrl(url)`: comparison URL. Blank and new-tab pages are reduced to their lowercase base; returns `null` for an empty URL.
- `buildTabDuplicateGroups(tabs)`: `TabDuplicateGroup[]`. The tab to keep is the current tab, then a pinned tab, then the most recently used one. `redundantTabIds` never contains pinned tabs.

### tab-idle.utils

Idle evaluation. In usage-day mode, a day threshold expires only when both the wall-clock time and the number of usage days reach it. Hour thresholds only use wall-clock time.

- `HOUR_MS`, `DAY_MS`, `IDLE_DISPLAY_MS` (24 h, the "idle" label in the UI), `IDLE_THRESHOLD_OPTIONS` (12 h and 1, 3, 7, 14 or 30 days).
- `thresholdToMs(threshold)` and `isSameThreshold(a, b)`.
- `evaluateIdle({ lastActiveAt, now, threshold, countBy, usageDays })`: `IdleEvaluation` with idle time, usage days since, expired, expiring and remaining time. A timestamp in the future counts as just used.
- `getIdleState(evaluation)`: `expired`, `expiring`, `idle` or `fresh`.
- `estimateExpiryAt(evaluation, now)`: estimated expiry time, assuming daily use.

### tab-lifecycle-settings.utils

Lifecycle settings defaults, normalization and consent checks. Unknown values fall back to the defaults, so a malformed file never turns on anything that closes tabs.

- `DEFAULT_IDLE_THRESHOLD` (7 days), `READ_LATER_EXPIRY_OPTIONS` (`[14, 30, 60, null]`), `MIN_OPEN_TABS_MAX` (50).
- `DEFAULT_TAB_LIFECYCLE_SETTINGS`: activity tracking on; auto archive and budget off; Read later closes the tab on add, expires after 30 days and summarizes `manual-only`.
- `DEFAULT_TAB_LIFECYCLE_STATE`: empty device state, without any consent.
- `normalizeTabLifecycleSettings(raw)` and `normalizeTabLifecycleState(raw)`: tolerant parsing.
- `applyTabLifecycleSettingsPatch(current, patch, now)`: merges the nested sections, normalizes and sets `updatedAt`.
- `isAutoArchiveEffective(settings, state)`: tracking on, auto archive on and this device consented.
- `isAutoMakeRoomEffective(settings, state)`: tracking on, budget on, action `auto-archive` and this device consented.
- `getPendingConsents(settings, state)`: switches that are on in the settings but not consented on this device.
- `shouldShowBadgeCount(settings)`: `budget.enabled || budget.showBadge`.
- `preserveUnknownSettingFields(raw, normalized)`: keeps fields from newer clients next to the normalized ones.

### tab-messages

Message types between the background and content scripts for the lifecycle features, kept in one place so both sides agree on the names.

- `TAB_MESSAGES`, background to content:
  - `ping` (`HAMHOME_PING`)
  - `extractReading` (`EXTRACT_READING_CONTENT`)
  - `feedback` (`HAMHOME_TAB_FEEDBACK`)
  - `queryDirtyForm` (`HAMHOME_QUERY_DIRTY_FORM`)
  - `contextLink` (`HAMHOME_GET_CONTEXT_LINK`)
  - `readingSession` (`HAMHOME_READING_SESSION`)
- `TAB_MESSAGES`, content to background:
  - `busy` (`HAMHOME_TAB_BUSY`)
  - `readLaterThisTab` (`HAMHOME_READ_LATER_THIS_TAB`)
- `TAB_BUSY_TTL_MS` (15 min): how long a save overlay left open keeps its tab protected; renewed while it stays open.

### tab-onboarding.utils

First-run guidance helpers: protected domain recommendations and the tabs preselected by "tidy up now".

- `WEB_APP_DOMAINS`: mail, chat and other web apps people keep open on purpose.
- `recommendProtectedDomains(tabs, alreadyProtected?)`: domains of pinned tabs and known web apps among the open tabs, minus the protected ones, sorted.
- `selectTidyNowTabIds(snapshot)`: unprotected redundant duplicates and stale tabs.
- `estimatedShare(snapshot)`: share of tabs whose idle time is only an estimate.

### tab-protection.utils

Protection rules. A protected tab is never closed automatically.

- `AUDIBLE_PROTECTION_MS` (10 min).
- `ALWAYS_ON_PROTECTIONS`: `pinned`, `active`, `locked` and `saving`, which cannot be turned off.
- `getProtectionReasons(input, options)`: `TabProtectionReason[]` (adds `audible`, `protectedDomain`, `grouped` and `dirtyForm` depending on the options).
- `normalizeProtectedDomain(input)`: accepts `example.com`, `*.example.com`, a URL or a host with a path. Strips `www.` and returns `null` for an invalid domain.
- `matchesProtectedDomain(hostname, domains)`: matches the domain or any of its subdomains, ignoring `www.`.

### tab-reconcile.utils

Reconciles activity records after a browser restart, when tab IDs change. Records are matched by normalized URL and window position, in this order:

1. Same tab ID.
2. Same window position.
3. Same window, closest index.
4. Anywhere.

- `ReconcileTab`: `{ tabId, windowId, index, url }`.
- `createActivityRecord(tab, now, { estimated?, locked? })`: a new record.
- `reconcileActivityRecords(previous, current, now, lockedUrls?)`: one record per current tab. Unmatched tabs start from now, marked estimated.
- `reconcileActivityRecordsDetailed(...)`: same, and also returns the `unclaimed` records.
- `collectLockedUrls(records)`: sorted URLs of locked records.

### tab-snapshot.utils

Builds the open tabs snapshot shared by the tab center, the popup card, the budget and the sweep. Every input is passed in, so the module stays pure and unit-testable.

- `RawTab`, `RawTabGroup` and `SnapshotInput` types.
- `normalizeGroupTitle(title)`: trimmed, lowercase group title.
- `getTabUrl(tab)`: `url`, or `pendingUrl`.
- `getTabGroupId(tab)`: group ID, or `undefined` for ungrouped tabs.
- `buildOpenTabsSnapshot(input)`: `OpenTabsSnapshot` with per-tab protection, idle state, archive time and duplicates, plus windows, budget, stats, auto archive status and pending confirmations. `tab.lastAccessed` only affects the displayed idle time; it is never used to decide on automatic archiving.
- `selectSweepCandidates(snapshot, settings, max)`: expired, unprotected tabs, least recently used first. At most `max`, and never below `minOpenTabs`.
- `sortTabsByLeastRecentlyUsed(tabs)`: least recently used first, with the current tab of each window last.

### tab-stats.utils

Local tab stats: daily peak and time-weighted average of open tabs, time over budget and event counters. Counts only; kept for 90 days.

- `STATS_MAX_STEP_MS` (35 min, the longest gap that is counted), `STATS_RETENTION_DAYS` (90), `EMPTY_TAB_STATS`.
- `createEmptyDay(date)`: empty `TabDailyStats`.
- `shiftLocalDateKey(timestamp, offset)`: local date key `offset` days away (DST safe).
- `recordOpenSample(stats, sample)`: credits the previous count up to now, split at midnight, and updates the day's peak.
- `isSampleWorthWriting(stats, sample, minIntervalMs)`: `true` when the count or over-budget flag changed, on a new day, or after the interval.
- `incrementStatsCounter(stats, counter, delta, now)`: increments today's counter.
- `pruneStats(stats, now, keepDays?)`: drops days older than the retention period.
- `normalizeTabStats(raw)`: tolerant parsing.
- `buildWeeklyOverview(stats, now, samplingEnabled)`: `TabWeeklyOverview` for the last 7 days against the 7 days before.
- `getAverageChangePercent(overview)`: week-over-week change of the average, rounded, or `null`.

### tab-tidy.utils

Rule-based tidy-up suggestions without AI. Every unprotected tab gets at most one suggestion, in this order:

1. Duplicates.
2. Low-value pages.
3. Read later.
4. Archive.
5. Fold into a workspace.

- `TidySuggestionKind`, `TidyWorkspaceGroup` and `TidySuggestions` types.
- `WORKSPACE_SUGGESTION_MIN_TABS` (5).
- `isLowValueTab(tab)`: blank tabs, search result pages and sign-in or verification paths.
- `isArticleLikeTab(tab)`: blog, article, news or post signals in the title or URL.
- `buildTidySuggestions(snapshot, now)`:
  - `readLater`: article-like tabs idle for a day or more.
  - `archive`: stale tabs, or tabs that are expired or expiring.
  - `workspaces`: 5 or more idle tabs from one tab group or one domain.
- `countTidySuggestions(suggestions)`: total number of suggested tabs.

### tab-triage.utils

The parts of AI tidy-up that need no AI: which tabs go to AI, what is sent, checking the answer and the 24-hour cache.

- `TRIAGE_DESTINATIONS`, `TRIAGE_MAX_TABS` (120), `TRIAGE_BATCH_SIZE` (40), `TRIAGE_CACHE_TTL_MS` (24 h), `TRIAGE_CACHE_MAX_ENTRIES` (500).
- `sanitizeTriageUrl(url)`: normalized URL without hash, credentials or sensitive parameters, truncated to 200 characters. Also used as the cache key.
- `formatIdleForPrompt(ms)`: `"3d"`, `"5h"` or `"20m"`.
- `partitionTriageTabs(tabs, privateTabIds, maxTabs?)`: returns `aiTabs` (most idle first, capped), `localTabs` (pinned, protected, private or non-web) and `skippedCount`.
- `buildLocalTriageSuggestions(localTabs, tidy)`: pinned and protected tabs are kept. Other local tabs follow the rule-based tidy-up, otherwise they are kept.
- `buildTriagePromptItems(batch, now)`: prompt rows with a 1-based `id`, cleaned title and URL, domain, idle time and group.
- `buildCategoryOptions(categories, limit?)`: category paths such as `"Parent / Child"`, at most 80.
- `matchCategoryOption(name, options)`: matches the full path, or the last name when that is unambiguous.
- `normalizeTriageItems(raw, batch, categories)`: drops unknown tabs and destinations, keeps at most one suggestion per tab, resolves categories and fills in a workspace name.
- `pickCachedSuggestions(tabs, cache, now, language, categories)`: returns `{ cached, misses }`.
- `toCacheEntries(suggestions, tabs, now, language)`: cache entries from the AI suggestions (local suggestions are not cached).
- `pruneTriageCache(cache, now, maxEntries?)`: drops expired entries and keeps the newest.
- `groupTriageSuggestions(suggestions)`: `TriageGroup[]` per destination, in a fixed order. Workspace items are sorted by name.
- `getDefaultTriageSelection(suggestions)`: everything except what local rules keep.
- `chunk(items, size)`: splits an array into batches.

### tab-view.utils

Open tabs list of the tab center: grouping, sorting, filters and search, flattened into rows for the virtual list.

- `OpenTabsGroupBy` (`window`, `group`, `domain`), `OpenTabsSort` (`position`, `recent`, `idle`), `OpenTabsFilter` (`idle`, `expiring`, `duplicates`, `protected`), plus `OpenTabsViewOptions`, `OpenTabsGroupLabel` and `OpenTabsRow`.
- `matchesOpenTabFilter(tab, filter, now)`: whether a tab matches one filter.
- `filterOpenTabs(tabs, { filters, query, now })`: every search term must match, and the tab must match any selected filter.
- `buildOpenTabsRows(snapshot, options)`: a header row per group, followed by its tab rows. Domain groups are sorted by size.

### usage-days.utils

Usage days: local dates on which the user actually used the browser. Day-based idle thresholds count these instead of calendar days.

- `USAGE_DAY_RETENTION_DAYS` (120).
- `toLocalDateKey(timestamp)`: local date as `YYYY-MM-DD`, which sorts chronologically.
- `getUsageDayCutoffKey(now, retentionDays?)`: oldest date key still kept.
- `pruneUsageDays(days, now, retentionDays?)`: sorted, de-duplicated days within the retention period.
- `addUsageDay(days, now, retentionDays?)`: records today. Returns the same array when today is already recorded, so callers can skip the write.
- `countUsageDaysAfter(days, afterKey, upToKey)`: usage days after `afterKey`, up to and including `upToKey`.

### read-later.utils (`lib/read-later`)

Read later state machine and queue helpers. Any entry can be kept in the library or deleted. The states change as follows:

- `unread` becomes `reading` when opened, and `reading` becomes `read` when marked read.
- `unread` and `reading` become `expired` after the expiry period.
- `read` and `expired` become `unread` again when added again.

- `EXPIRING_SOON_DAYS` (3), `COMPLETION_WINDOW_DAYS` (30).
- `estimateReadingMinutes(text)`: local estimate (400 CJK characters or 230 words per minute), at least 1. `undefined` when there is nothing to read.
- `isEntryActive(entry)`: the entry exists and has no `removedAt`.
- `isEntryPending(entry)`: active and `unread` or `reading`.
- `getEntryView(entry)`: `unread`, `read`, `expired` or `null`.
- `getEntryExpiresAt(entry, expireAfterDays)` and `getEntryDaysLeft(entry, expireAfterDays, now)`: expiry time, and whole days left (0 means today).
- `createReadLaterEntry(input)`: a new `unread` entry.
- `requeueEntry(entry, now, patch?)`: back to `unread` with a new `addedAt`; read, expired, opened and removed times are cleared.
- `markEntryReading(entry, now)`: status `reading` (stays `expired` or `read`) and sets `openedAt`.
- `markEntryRead(entry, now)`: status `read`.
- `keepEntryInLibrary(entry, now)`: `queueOnly: false`.
- `removeEntryFromQueue(entry, now)`: sets `removedAt` (soft removal).
- `collectExpiredEntries(entries, expireAfterDays, now)`: pending entries past the expiry period, returned with status `expired`.
- `countExpiringSoon(entries, expireAfterDays, now, withinDays?)`: pending entries that expire within the window.
- `computeCompletionRate(entries, now, windowDays?)`: `{ read, expired, rate }`. `rate` is `null` when there is nothing yet.
- `getQueueOnlyIds(entries)` and `filterLibraryBookmarks(bookmarks, entries)`: library views never show queue-only items.
- `ReadLaterItem`, `getItemDomain(url)` (hostname without `www.`) and `buildReadLaterItems(entries, bookmarks)`: joins active entries with their live bookmarks.
- `sortReadLaterItems(items, sort)`: `newest`, `oldest`, `shortest` (by `estimatedMinutes`) or `expiring` (oldest `addedAt` first).
- `buildQuickList(entries, bookmarks, limit)`: newest unread items and the total unread count.
- `matchesReadLaterQuery(item, query)`: every term must match the title, URL, description or note.
- `mergeReadLaterEntries(local, remote)`: last-write-wins merge by bookmark ID; also returns `localChanged` and `remoteChanged`.
- `reconcileEntriesWithBookmarks(entries, bookmarks, tombstones, now)`: drops entries of purged bookmarks. When sync merged duplicate bookmarks, the entry moves to the surviving one.
- `normalizeReadLaterEntry(raw)`: validates an imported entry; `null` when it cannot be used.

### page-signals (`utils`)

Page signals the content script collects for the tab lifecycle. Not pure: it installs document listeners and keeps module-level state. Only booleans and the clicked link's own text ever leave the page.

- `installPageSignals()`: installs capture listeners once, for `input`, `change`, `submit` and `contextmenu`.
- `hasDirtyForm()`: whether an edited text field, select or contenteditable element still holds its edits. Submitted forms and search fields do not count.
- `getContextLinkText(href)`: text of the link the context menu was opened on, when it matches `href`.

### reading-session-bus (`utils`)

Passes the "opened from Read later" signal from the content script message listener to the React UI. It keeps one listener and one pending value while the UI is still mounting.

- `readingSessionBus.emit(session)`: delivers to the listener, or keeps the value as pending.
- `readingSessionBus.subscribe(listener)`: sets the listener, delivers a pending value in a microtask and returns an unsubscribe function.

### tab-feedback-bus (`utils`)

Passes in-page feedback (undo toasts, budget nudges) from the content script message listener to the React UI. It keeps one message while the UI is still mounting, so feedback sent right after injection is not lost.

- `tabFeedbackBus.emit(feedback)`: delivers to the listener, or keeps the message as pending.
- `tabFeedbackBus.subscribe(listener)`: sets the listener, delivers a pending message in a microtask and returns an unsubscribe function.

### tab-time-format (`utils`)

Locale-aware time labels for the tab center, built on `Intl`.

- `formatIdleDuration(ms, locale)`: the largest whole unit, such as "8 days", "3 hours" or "12 minutes" (at least 1 minute).
- `formatArchiveTime(timestamp, locale, now?)`: only the time for today; date and time otherwise.
- `formatDurationMinutes(minutes, locale)`: such as "3 hours 20 minutes", or only minutes under an hour.
- `formatWeekdayShort(dateKey, locale)`: short weekday of a `YYYY-MM-DD` key.

---

## ImportExportPage

导入导出页面组件，支持书签、分类、工作空间和 Tab 分组配置的导入导出功能。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

### 导出功能

- **JSON 格式**：导出完整数据（书签、分类、工作空间、工作空间分类、Tab 分组规则、Tab 自动分组设置），适合插件间迁移
- **HTML 格式**：导出标准浏览器书签格式，可导入到其他浏览器

### 导入功能

支持两种文件格式：

1. **JSON 格式**（插件导出的数据）
   - 自动建立分类 ID 映射表，确保导入后关联关系正确
   - 按层级顺序处理分类，先创建父分类再创建子分类
   - 书签的 `categoryId` 自动转换为新系统中的对应 ID
   - 工作空间分类会建立独立 ID 映射，工作空间的 `categoryId` 会同步转换
   - Tab 分组规则按原始 ID 导入，已存在规则会被更新，自动分组设置会一并恢复

2. **HTML 格式**（浏览器书签）
   - 支持保留目录结构选项
   - 支持 AI 分析选项（与保留目录互斥）
   - 自动去重（检查 URL 是否已存在）

**导入选项：**

| 选项             | 说明                             |
| ---------------- | -------------------------------- |
| 保留目录结构     | 将浏览器文件夹转换为插件分类     |
| AI 分析          | 使用 AI 自动分类和打标签         |
| 获取页面内容     | AI 分析时抓取页面内容提高准确性  |

**行为说明：**

- JSON 导入时，分类 ID 会被重新生成，通过映射表维护书签与分类的关联关系
- JSON 导入时，工作空间、工作空间分类和 Tab 分组配置会随备份一起恢复
- 同名同父级的分类不会重复创建，直接复用已有分类
- HTML 导入时会基于书签域名通过 Cravatar favicon API 补全站点图标
- 导入进度实时显示，支持大量书签的批量导入

**Tab lifecycle & read later:**

- JSON exports include queue-only read later items, every bookmark's read later state and the lifecycle settings; HTML exports only contain library bookmarks.
- The tab archive is left out by default. An "Include tab archive" checkbox adds it, with a warning that it may contain sign-in links or one-time tokens.
- JSON imports restore read later state, lifecycle settings and, when present, archive entries (`importLifecycleData`). Imported settings never turn on auto archive or making room on this device without consent.

---

## pageShell

管理页与设置页的页面级壳层行为说明。

### OptionsPage

扩展设置页面组件，负责 AI、通用设置与存储管理。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

**用法示例：**

```tsx
<OptionsPage />
```

**行为说明：**

- 与产品介绍相关的信息已拆分到独立的 `AboutPage`

### AboutPage

关于 HamHome 的独立菜单页，集中展示产品定位、版本信息与外部入口。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 无 props    |

**用法示例：**

```tsx
<AboutPage />
```

**行为说明：**

- 展示“AI 驱动的浏览器工作空间”定位、当前扩展版本、官网地址、GitHub 仓库地址和 GitHub Star 引导
- 官网与仓库入口使用新标签页打开，避免打断当前扩展管理流程

### App 页面顶部工具栏

管理页面顶部工具栏，承载常用全局操作入口。

| Prop | Type | Required | Default | Description |
| ---- | ---- | -------- | ------- | ----------- |
| -    | -    | -        | -       | 页面内部结构，无独立 props |

**用法示例：**

```tsx
<header className="flex h-16 shrink-0 items-center gap-2 border-b">...</header>
```

**行为说明：**

- 左侧侧边栏新增“关于”独立菜单项，对应 `AboutPage`
- 右上角在语言切换按钮左侧新增 GitHub 仓库快捷入口
- GitHub 按钮通过 Tooltip 提示用途，并在新标签页打开项目仓库

## OptionsPage

设置页面主容器，整合 AI 配置、通用设置和存储管理。采用标签页结构，业务逻辑通过 `useOptionsPage` 钩子管理。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| - | - | - | - | 页面组件通过 `useOptionsPage` 自行加载和管理状态 |

**用法示例：**

```tsx
<OptionsPage />
```

**行为说明：**

- 页面分为 "AI"、"通用" 和 "存储" 三个主要标签页。
- 状态和逻辑完全由 `useOptionsPage` Hook 提供，组件本身作为布局外壳。
- 使用 `Tabs` 组件进行导航，支持 URL hash 同步（由路由层处理）。

---

### AITab

AI 配置标签页，负责大模型服务商配置、模型选择、高级参数调整及语义搜索（Embedding）索引维护。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| aiConfig | `AIConfig` | ✓ | - | AI 基础配置 |
| embeddingConfig | `EmbeddingConfig` | ✓ | - | 语义搜索配置 |
| ... | ... | ... | ... | 详见源代码 props 定义 |

**行为说明：**

- 支持多种 AI 提供商（OpenAI, Anthropic, Google 等）及其自定义镜像。
- 提供模型拉取（Fetch Models）功能，自动发现可用模型。
- 包含语义搜索开关及向量索引统计信息展示。
- 支持增量/全量索引重建及向量数据清理。
- Incremental rebuild re-embeds bookmarks whose text changed or whose vector came from another embedding model or dimensions, so switching models does not need a full rebuild.
- The embedding card shows `EmbeddingDimensionsField` only for models that accept a custom vector size; switching to a fixed-size model clears the stored size.
- 高级设置中提供 temperature、请求版本（仅 OpenAI）以及「图片剪藏 AI 分析」开关（默认开启）：关闭后保存图片剪藏不会把图片发送给模型；隐私页面无论开关状态都不会发送。

---

### EmbeddingDimensionsField

Vector size picker in the embedding settings card. It renders nothing when the selected model has a fixed size, so the setting only appears for models that support it (OpenAI `text-embedding-3-*`, Google `text-embedding-004` / `gemini-embedding-001`, Zhipu `embedding-3`, Qwen3 embedding, DashScope `text-embedding-v3/v4`; see `getEmbeddingDimensionSpec` in `lib/agent/provider-config.ts`).

| Prop     | Type                                       | Required | Default | Description |
| -------- | ------------------------------------------ | -------- | ------- | ----------- |
| spec     | `EmbeddingDimensionSpec \| null`           | ✓        | -       | Native size and selectable sizes of the current model; `null` hides the field |
| value    | `number`                                   | -        | -       | Effective size; `undefined` selects the model's native size |
| onChange | `(dimensions: number \| undefined) => void` | ✓        | -       | Called with the picked size, or `undefined` for the native size |

**用法示例：**

```tsx
<EmbeddingDimensionsField
  spec={getEmbeddingDimensionSpec(embeddingConfig.provider, embeddingConfig.model)}
  value={resolveEmbeddingDimensions(embeddingConfig)}
  onChange={(dimensions) => updateEmbeddingConfig({ dimensions })}
/>
```

**行为说明：**

- The first option is the model's native size (stored as `undefined`); other options come from the model's spec
- After changing the size, run an incremental rebuild so existing bookmarks get vectors of the new size
- "Test connection" reports the vector size the provider actually returned

---

### GeneralTab

通用设置标签页，包含语言、主题、快捷键预览及自定义筛选器管理。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| language | `string` | ✓ | - | 当前语言代码 |
| appSettings | `AppSettings` | ✓ | - | 应用全局设置 |
| ... | ... | ... | ... | 详见源代码 props 定义 |

**行为说明：**

- 语言和主题变更即时生效。
- 展示当前浏览器已配置的扩展快捷键，并提供跳转管理页面链接。
- 提供自定义筛选器（Custom Filters）的增删改查入口。

---

### StorageTab

数据存储与同步标签页，负责查看存储统计、导出数据、危险区清理操作及 WebDAV 同步配置。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| storageInfo | `any` | ✓ | - | 基础数据统计 |
| syncConfig | `SyncConfig` | ✓ | - | WebDAV 同步配置 |
| ... | ... | ... | ... | 详见源代码 props 定义 |

**行为说明：**

- 展示书签、分类、快照及向量数据的数量和占用空间。
- 支持 JSON/HTML 格式的书签导出。
- 提供分项清理（书签、快照、远端同步数据）及全量数据重置入口。
- WebDAV 同步用户设置和 AI 自动分组设置时按 `updatedAt` 合并；本地刚修改的配置会优先上传，远端更新时才下载覆盖本地。
- WebDAV 同步支持端到端加密（E2E）。

---

### OptionsDialogs

设置页面弹窗组合组件，集中管理所有确认对话框。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| t | `any` | ✓ | - | 翻译函数 |
| ... | ... | ... | ... | 详见源代码 props 定义 |

**行为说明：**

- 包含数据清理、索引重建、远端数据清除、自定义筛选器编辑/删除等所有二次确认弹窗。
- 统一处理 loading 状态展示。

---

## ContentTypeFilterDropdown

内容类型下拉筛选组件，用于在「我的收藏」列表顶部工具栏筛选不同内容形式的收藏（所有、书签、图片、文本）。

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| value | `BookmarkContentType` | ✓ | - | 当前选中的内容类型（`"all"` \| `"bookmark"` \| `"image"` \| `"text"`） |
| onChange | `(value: BookmarkContentType) => void` | ✓ | - | 内容类型切换回调 |
| className | `string` | - | - | 外层容器样式类名 |
| triggerClassName | `string` | - | - | 下拉触发按钮样式类名 |

**用法示例：**

```tsx
<ContentTypeFilterDropdown
  value={contentType}
  onChange={setContentType}
/>
```

**行为说明：**

- 提供四种类型选项：所有（`"all"`，默认）、书签（`"bookmark"`）、图片（`"image"`）、文本（`"text"`）。
- 每个选项配有对应图标，选中后直接在触发器中展示图标与文字。
- 与 `useBookmarkSearch` 协同工作，选择后实时过滤书签列表并在下方显示活动筛选徽章。
