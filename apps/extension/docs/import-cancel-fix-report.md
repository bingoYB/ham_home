# 修复报告：导入 AI 分类打标无法手动停止

**修复日期：** 2026-06-23  
**严重等级：** 中（数据量大时用户无法中断，体验阻塞）

---

## 问题描述

导入 HTML 书签并勾选「使用 AI 自动分类打标」后，点击开始导入即进入无法退出的锁定状态：

- 导入按钮被 `disabled`，无法重新操作
- 进度区域没有停止按钮
- 刷新页面会被 `resumePendingTask` 自动续跑
- AI 调用串行执行且无中断机制，数千条书签需等待数小时

---

## 根本原因

`runHtmlImportTask`（`ImportExportPage.tsx` L762）的批次 `for` 循环内部没有任何取消检查点，`analyzeBookmarkWithAI` 是普通 `await`，整个任务只能等自然结束或异常才会退出。

---

## 修复方案

采用「**组件内 `useRef` cancel flag + 存储层 `cancelled` 状态**」的轻量方案：

```
cancelledRef (useRef<boolean>)
       │ handleCancelImport() 置 true
       │ importTaskStorage.cancelHtmlTask() 写入 localStorage
       ▼
runHtmlImportTask 每批次开头检查 cancelledRef.current
       │ true → break，设置「已停止」结果，提前 return
       ▼
resumePendingTask 检查 status === 'cancelled'
       │ → clearHtmlTask()，不再续跑
```

---

## 变更文件清单

### 1. `lib/storage/import-task-storage.ts`

| 变更 | 说明 |
|------|------|
| `HtmlImportTaskProgress.status` 新增 `'cancelled'` | 持久化取消状态，防止刷新后续跑 |
| 新增 `cancelHtmlTask()` 方法 | 将进度状态写为 `cancelled`，供 `handleCancelImport` 调用 |

```diff
- status: 'running' | 'failed';
+ status: 'running' | 'failed' | 'cancelled';

+ async cancelHtmlTask(): Promise<void> {
+   await this.updateHtmlProgress((progress) => ({
+     ...progress,
+     status: 'cancelled',
+   }));
+ }
```

---

### 2. `components/ImportExportPage.tsx`

#### ① 新增 `cancelledRef`（L72）

```typescript
const cancelledRef = useRef(false);
```

#### ② 每次新导入前重置 flag（L267, L309）

```typescript
// handleFileImport
cancelledRef.current = false;
setImporting(true);

// handleBrowserImport
cancelledRef.current = false;
setImporting(true);
```

#### ③ 新增 `handleCancelImport` 函数（L192）

```typescript
const handleCancelImport = async () => {
  cancelledRef.current = true;
  await importTaskStorage.cancelHtmlTask();
};
```

#### ④ `runHtmlImportTask` 批次循环加取消检查（L843）

```typescript
for (let batchStart = currentIndex; ...) {
+ // 每批次开始前检查取消信号
+ if (cancelledRef.current) {
+   break;
+ }
  batchIndex++;
  ...
}
```

#### ⑤ 循环结束后处理取消状态（L1058）

```typescript
setImportProgress(null);

+ if (cancelledRef.current) {
+   await importTaskStorage.clearHtmlTask();
+   setImportResult({
+     success: false,
+     cancelled: true,
+     message: t("settings.importExport.import.importCancelled", { ns: "settings" }),
+     details: buildHTMLImportDetails(...),  // 展示已处理数量
+   });
+   return;
+ }
```

#### ⑥ `resumePendingTask` 处理 `cancelled` 状态（L212）

```typescript
- if (task.progress.status === "failed") {
+ if (task.progress.status === "failed" || task.progress.status === "cancelled") {
    await importTaskStorage.clearHtmlTask();
    return;
  }
```

#### ⑦ 进度区域加「停止导入」按钮（JSX L1371）

仅在 `enableAIAnalysis === true` 时显示，避免对普通导入造成干扰：

```tsx
{enableAIAnalysis && (
  <Button variant="outline" size="sm" onClick={handleCancelImport} className="h-7 text-xs">
    {t("settings.importExport.import.cancelImport", { ns: "settings" })}
  </Button>
)}
```

#### ⑧ 进度区域布局调整

进度头部从 `flex items-center gap-3` 改为 `flex items-center justify-between`，让停止按钮靠右对齐。

#### ⑨ `importResult` 类型加 `cancelled?: boolean` 字段

取消结果用琥珀色（`bg-amber-50`）区别于红色失败提示，正常失败/成功结果通过 `!importResult.cancelled` 过滤。

#### ⑩ 从 `@hamhome/ui` import 中补充 `Button`

```diff
 import {
+  Button,
   Card,
   ...
 } from "@hamhome/ui";
```

---

### 3. `locales/zh/settings.json`

```diff
  "browserBookmarkCount": "浏览器中共有 {{count}} 个书签",
+ "cancelImport": "停止导入",
+ "importCancelled": "导入已停止"
```

### 4. `locales/en/settings.json`

```diff
  "browserBookmarkCount": "Total {{count}} bookmarks in browser",
+ "cancelImport": "Stop Import",
+ "importCancelled": "Import stopped"
```

---

## 行为变化对比

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| AI 导入进行中 | 只有转圈动画，无法操作 | 进度条右侧显示「停止导入」按钮 |
| 点击停止 | — | 当前 AI 调用完成后（≤1条）即停止，不再处理后续书签 |
| 停止后显示 | — | 琥珀色提示框，显示已导入数量 |
| 刷新页面（导入中） | 自动续跑未完成任务 | `cancelled` 状态被识别，清除任务，不再续跑 |
| 普通导入（不含 AI） | 无取消按钮 | 无变化（停止按钮仅在 AI 模式下显示） |
| 已导入的书签 | — | 停止前已写入的书签保留，数据不丢失 |

> **注意：** 停止信号在每个 **批次** 开始前生效（AI 模式下批次大小为 5），最多会多处理完当前批次内剩余的书签（<5条）。单条 AI 请求发出后无法中断（这是 `await` 的固有限制），但最多等待一个请求完成即可停下。

---

## 未涉及范围（有意不改）

- `importFromJSON`：不使用 AI，无需取消
- `useBatchAITask`：已有独立 `cancelTask`，不受影响
- `analyzeBookmarkWithAI` 内部未加 `AbortController`：本次最小改动不涉及，如需进一步缩短等待时间可后续优化
