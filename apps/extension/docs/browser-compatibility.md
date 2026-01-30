# 浏览器兼容性检查清单

本文档列出 HamHome 浏览器扩展在不同浏览器（Chrome、Edge、Firefox）中需要处理的兼容性问题。

## WXT 框架兼容性支持

WXT 框架已提供以下兼容性支持：

1. **API Polyfill**：WXT 在 Firefox 构建时自动添加 `chrome.*` API polyfill
2. **编译时浏览器检测**：通过 `import.meta.env.FIREFOX`、`import.meta.env.CHROME` 等环境变量
3. **Manifest V2/V3 处理**：WXT 根据目标浏览器自动生成正确的 manifest

## 已处理的兼容性问题

### 1. 浏览器 API 兼容层 ✅

- **位置**：`utils/browser-api.ts`
- **功能**：
  - `getBrowserType()` - 获取当前浏览器类型
  - `isFirefox()` - 浏览器类型检测
  - `getBrowserSpecificURL()` - 获取浏览器特定 URL
  - `safeOpenPopup()` - 安全打开 Popup（处理 Firefox 不支持的情况）
  - `safeCreateTab()` - 安全创建标签页
  - `getExtensionURL()` - 获取扩展内部页面 URL
  - `safeSendMessageToTab()` - 安全发送消息到 Tab
  - `safeBroadcastToTabs()` - 安全广播消息到所有 Tab
  - `getExtensionShortcuts()` - 获取扩展快捷键配置（自动判断环境：extension page 直接调用，content script 通过 background service）

### 2. 快捷键设置页面 URL ✅

- **问题**：不同浏览器的快捷键设置页面 URL 不同
- **解决方案**：使用 `getBrowserSpecificURL('shortcuts')`
  - Chrome/Edge: `chrome://extensions/shortcuts`
  - Firefox: `about:addons`
- **已更新文件**：`components/OptionsPage.tsx`

### 3. action.openPopup() API ✅

- **问题**：Firefox 在某些情况下不支持 `chrome.action.openPopup()`
- **解决方案**：使用 `safeOpenPopup()` 包装，静默处理错误
- **已更新文件**：`entrypoints/background.ts`

### 4. 扩展内部页面跳转 ✅

- **问题**：需要统一处理 `chrome.tabs.create` 和 `chrome.runtime.getURL`
- **解决方案**：使用 `safeCreateTab()` 和 `getExtensionURL()` 组合
- **已更新文件**：
  - `components/SavePanel/AIStatus.tsx`
  - `entrypoints/popup/App.tsx`
  - `components/OptionsPage.tsx`

## 无需替换的 API 调用

以下 API 由 WXT 框架自动处理 polyfill，无需额外替换：

### 存储 API (WXT Storage)

已迁移至 WXT Storage API，自动处理跨浏览器兼容：

- `lib/storage/bookmark-storage.ts` - 使用 `storage.defineItem`
- `lib/storage/config-storage.ts` - 使用 `storage.defineItem`
- `lib/contentUi/index.tsx` - 使用 `configStorage.watchSettings`
- `lib/i18n/config.ts` - 使用 `configStorage.getSettings`
- `hooks/useLanguage.ts` - 使用 `configStorage.watchSettings`
- `contexts/BookmarkContext.tsx` - 使用 `bookmarkStorage.watchBookmarks/Categories`

### Runtime API (`chrome.runtime`)

- `entrypoints/background.ts`
- `entrypoints/content.ts`
- `lib/contentUi/App.tsx`
- `components/bookmarkPanel/BookmarkHeader.tsx`
- `components/SavePanel/useSavePanel.ts`

### Tabs API (`chrome.tabs`)

- `entrypoints/background.ts`
- `hooks/useCurrentPage.ts`

### Scripting API (`chrome.scripting`)

- `entrypoints/background.ts`

### Commands API (`chrome.commands`)

- `entrypoints/background.ts`

### Downloads API (`chrome.downloads`)

- `contexts/BookmarkContext.tsx`

## Manifest 配置差异

### 当前配置检查

检查 `wxt.config.ts` 中的 manifest 配置：

1. **permissions** ✅
   - `storage` - 所有浏览器支持
   - `activeTab` - 所有浏览器支持
   - `scripting` - Manifest V3，所有浏览器支持
   - `downloads` - 所有浏览器支持

2. **host_permissions** ✅
   - `<all_urls>` - 所有浏览器支持

3. **commands** ✅
   - 快捷键定义 - 所有浏览器支持

4. **icons** ✅
   - 图标路径 - 所有浏览器支持

### 5. Firefox 特定配置 ✅

- **已添加**：`browser_specific_settings.gecko` 配置
- **位置**：`wxt.config.ts`
- **配置**：
  - `id`: 扩展唯一标识符
  - `strict_min_version`: Firefox 最低版本 109.0

## 构建脚本

已添加多浏览器构建脚本到 `package.json`：

```bash
# 开发
pnpm dev           # Chrome
pnpm dev:firefox   # Firefox
pnpm dev:edge      # Edge

# 构建
pnpm build         # Chrome
pnpm build:firefox # Firefox
pnpm build:edge    # Edge
pnpm build:all     # 构建所有浏览器

# 打包 zip
pnpm zip           # Chrome
pnpm zip:firefox   # Firefox
pnpm zip:edge      # Edge
pnpm zip:all       # 打包所有浏览器
```

## 异步 API 处理

### Promise vs Callback

- **Chrome (Manifest V2)**：使用回调函数
- **Chrome (Manifest V3)**：支持 Promise
- **Firefox**：原生支持 Promise
- **Edge**：支持 Promise

**解决方案**：兼容层已统一使用 Promise，自动处理回调转换。

## 特殊功能兼容性

### 1. `action.openPopup()`

- **问题**：Firefox 在某些情况下不支持 `openPopup()`
- **处理**：兼容层已添加错误处理，静默失败

### 2. Service Worker vs Background Page

- **Chrome/Edge (Manifest V3)**：使用 Service Worker
- **Firefox**：可能仍使用 Background Page
- **状态**：WXT 框架已处理此差异

### 3. Content Script 执行上下文

- **Firefox**：使用 Xray 视觉
- **Chrome/Edge**：使用隔离世界
- **状态**：当前实现应兼容两种方式

## 测试清单

### Chrome/Edge 测试

- [ ] 存储操作（读取/写入）
- [ ] 标签页操作（查询/创建）
- [ ] 消息传递（runtime.sendMessage）
- [ ] 快捷键功能
- [ ] 下载功能
- [ ] Content Script 注入
- [ ] Popup 打开

### Firefox 测试

- [ ] 存储操作（读取/写入）
- [ ] 标签页操作（查询/创建）
- [ ] 消息传递（runtime.sendMessage）
- [ ] 快捷键功能
- [ ] 下载功能
- [ ] Content Script 注入
- [ ] Popup 打开（可能不支持 openPopup）
- [ ] Manifest V2/V3 兼容性

## 下一步行动

1. **测试验证**
   - 在 Chrome、Edge、Firefox 中分别测试
   - 验证所有功能正常工作

2. **文档更新**
   - 更新开发文档，说明浏览器兼容性处理
   - 添加浏览器特定的注意事项

## 参考资源

- [MDN: 构建跨浏览器扩展](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [MDN: Chrome 不兼容情况](https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)
- [WXT 文档](https://wxt.dev/)
