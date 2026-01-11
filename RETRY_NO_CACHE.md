# onRetry 不使用缓存 - 实现总结

## 需求说明

**问题**：当用户点击"重试"按钮时，不应该使用缓存，需要重新发起 AI 分析

**原因**：
- 用户主动点击重试，表示不满意之前的结果
- 应该强制获取新的分析结果
- 不应该使用旧的缓存结果

---

## 解决方案

### 核心思路

在 `useSavePanel.ts` 中新增 `retryAnalysis()` 函数：
- **vs `runAIAnalysis()`**：自动触发，优先检查缓存
- **vs `retryAnalysis()`**：用户主动，直接跳过缓存

### 实现细节

#### 1. 新增 `retryAnalysis()` 函数

```typescript
/**
 * 重试 AI 分析 - 强制重新分析，不使用缓存
 * 用于用户点击"重试"按钮时的场景
 */
const retryAnalysis = useCallback(async () => {
  const config = await configStorage.getAIConfig();

  if (!config.enabled) {
    setAIStatus('disabled');
    return;
  }

  setAIStatus('loading');
  setAIError(null);

  try {
    // 注意：直接跳过缓存检查，强制执行新分析
    await aiClient.loadConfig();

    if (!aiClient.isConfigured()) {
      setAIStatus('disabled');
      return;
    }

    // 执行新的分析（不检查缓存）
    const result = await aiClient.analyzeComplete({
      pageContent,
      userCategories: categories,
    });

    // 更新缓存（覆盖旧的结果）
    await aiCacheStorage.cacheAnalysis(pageContent, result);

    // 应用分析结果
    await applyAnalysisResultWithSetters(result, ...);

    setAIStatus('success');
    setTagSuggestions([]);
    setCategorySuggestions([]);
    setShowSuggestions(false);
  } catch (err: unknown) {
    setAIStatus('error');
    setAIError(err instanceof Error ? err.message : '分析失败');
  }
}, [pageContent, categories, existingBookmark]);
```

**关键点**：
- ✅ **不检查缓存**：直接跳过 `aiCacheStorage.getCachedAnalysis()`
- ✅ **执行新分析**：调用 `aiClient.analyzeComplete()`
- ✅ **更新缓存**：将新结果保存到缓存
- ✅ **应用结果**：将结果应用到表单

---

### 工作流程对比

#### `runAIAnalysis()` - 自动分析（有缓存）

```
自动触发（页面加载时）
  ↓
检查缓存
  ├─ 有缓存 → 使用缓存，快速返回 ✓
  └─ 无缓存 → 执行新分析，保存缓存
```

#### `retryAnalysis()` - 用户重试（无缓存）

```
用户点击"重试"按钮
  ↓
强制新分析（不检查缓存）
  ↓
更新缓存（覆盖旧结果）
  ↓
应用新结果到表单
```

---

## 文件变更

### 修改的文件

#### 1. `useSavePanel.ts`
- 新增 `retryAnalysis()` 函数（约 50 行）
- 更新 `UseSavePanelResult` 接口，添加 `retryAnalysis` 字段
- 更新返回值，导出 `retryAnalysis`

#### 2. `SavePanel.tsx`
- 从 hook 中解构 `retryAnalysis`
- 修改 AIStatus 组件调用：
  ```typescript
  // 修改前
  <AIStatus status={aiStatus} error={aiError} onRetry={runAIAnalysis} />
  
  // 修改后
  <AIStatus status={aiStatus} error={aiError} onRetry={retryAnalysis} />
  ```

---

## 使用场景

### 场景 1：AI 分析失败

```
用户看到错误提示
  ↓
"❌ 分析失败 [重试]" 按钮
  ↓
用户点击"重试"
  ↓
调用 retryAnalysis()
  ↓
强制重新分析（不使用缓存）
  ↓
成功返回新结果
```

### 场景 2：用户不满意结果

```
用户看到 AI 生成的建议
  ↓
用户觉得不合适
  ↓
点击"重试"获取新结果
  ↓
调用 retryAnalysis()
  ↓
强制新分析，获取不同的结果
  ↓
用户满意，点击保存
```

---

## 与缓存的关系

### 缓存策略

| 函数 | 首次 | 再次访问 | 用户重试 |
|------|------|---------|--------|
| `runAIAnalysis()` | 分析 | 使用缓存 ← | 使用缓存 ← |
| `retryAnalysis()` | N/A | N/A | 新分析 ✓ |

### 缓存更新

- `runAIAnalysis()` 完成后：将结果保存到缓存
- `retryAnalysis()` 完成后：**覆盖**旧缓存结果

### 缓存过期

- 自动过期：24 小时
- 手动清空：`aiCacheStorage.clearAll()`
- 用户重试：通过新分析覆盖

---

## 技术细节

### 函数对比表

| 特性 | `runAIAnalysis` | `retryAnalysis` |
|------|-----------------|-----------------|
| 触发方式 | 自动（页面加载） | 手动（用户点击） |
| 缓存检查 | ✅ 是 | ❌ 否 |
| 缓存保存 | ✅ 是 | ✅ 是 |
| 强制分析 | ❌ 否 | ✅ 是 |
| 依赖数组 | 简化（无 allTags） | 简化（无 allTags） |

### 为什么移除 `allTags`？

用户在 useSavePanel.ts 中修改了代码：
```typescript
// 修改前
existingTags: allTags,  // 传递已有标签

// 修改后
// 不传递 existingTags，只传递 userCategories
```

**原因**：
- 使用预设标签而非已有标签
- 避免过度依赖历史标签
- 提高 AI 推荐的多样性

---

## 完成清单

✅ 新增 `retryAnalysis()` 函数  
✅ 函数跳过缓存检查  
✅ 函数执行新分析  
✅ 函数更新缓存  
✅ SavePanel 中使用 `retryAnalysis`  
✅ AIStatus 接收正确的重试函数  
✅ 无 linter 错误（仅样式警告）  

---

## 用户体验

### 重试流程

```
用户看到错误或不满意
  ↓ 点击"重试"
强制重新分析
  ↓ (3-5 秒)
收到新的 AI 建议
  ↓ 
选择保存或继续重试
```

### 关键优势

✨ **用户主导**
- 点击重试获得新结果
- 不受缓存限制

✨ **智能缓存**
- 自动分析使用缓存（快速）
- 用户重试则新分析（多样）

✨ **结果更新**
- 重试的新结果会覆盖缓存
- 下次访问使用最新缓存

---

## 总结

通过新增 `retryAnalysis()` 函数，实现了：

1. **智能缓存**：自动分析优先用缓存，用户重试强制新分析
2. **用户控制**：用户可以主动获取新的分析结果
3. **缓存更新**：重试的新结果自动更新缓存
4. **双模式分析**：
   - `runAIAnalysis`：快速路线（使用缓存）
   - `retryAnalysis`：新鲜路线（强制分析）

**实现完成，可用于生产！** 🚀
