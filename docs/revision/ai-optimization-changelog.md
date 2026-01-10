# HamHome AI 智能分析优化记录

> 优化日期：2025-01-08  
> 参考项目：SmartBookmark (https://github.com/howoii/SmartBookmark)

---

## 一、优化背景

### 原有问题

1. **内容提取不完整**：只提取了基础的 title、content、excerpt，缺少 metadata（keywords、description 等）
2. **AI 调用次数过多**：分类、标签、描述分成三次对话调用，增加延迟和成本
3. **提示词设计简单**：传递给 AI 的内容格式不够结构化，缺少约束条件
4. **缺少降级策略**：AI 失败时没有备选方案

### 优化目标

- 参考 SmartBookmark 的实现，改进内容提取和 AI 调用流程
- 合并多次 AI 调用为一次
- 优化提示词设计，提高生成质量

---

## 二、修改文件列表

| 文件路径 | 修改内容 |
|---------|---------|
| `apps/extension/types/index.ts` | 新增 `PageMetadata` 类型，扩展 `PageContent` |
| `apps/extension/entrypoints/content.ts` | 增强内容提取，添加完整 metadata |
| `packages/ai/src/types.ts` | 扩展 `AnalyzeBookmarkInput`，添加 metadata 和上下文字段 |
| `packages/ai/src/client.ts` | 优化提示词设计，添加降级策略 |
| `apps/extension/lib/ai/client.ts` | 新增 `analyzeComplete` 方法，整合一次调用 |
| `apps/extension/components/SavePanel/SavePanel.tsx` | 简化 AI 调用逻辑 |

---

## 三、详细修改说明

### 3.1 PageContent 类型扩展

新增 `PageMetadata` 接口：

```typescript
export interface PageMetadata {
  description?: string;       // meta description
  keywords?: string;          // meta keywords
  author?: string;            // 作者
  siteName?: string;          // 网站名称
  publishDate?: string;       // 发布日期
  ogTitle?: string;           // Open Graph 标题
  ogDescription?: string;     // Open Graph 描述
  ogImage?: string;           // Open Graph 图片
}

export interface PageContent {
  // ...原有字段
  metadata?: PageMetadata;    // 新增：页面元数据
  isReaderable?: boolean;     // 新增：是否可读
}
```

### 3.2 Content Script 内容提取增强

新增功能：

1. **extractMetadata()** - 提取完整的页面元数据
   - meta description、keywords、author
   - Open Graph 标签（og:title、og:description、og:image、og:site_name）
   - 发布日期（支持多种格式）

2. **smartTruncate()** - 智能文本截断
   - 中文：在标点处截断
   - 英文：在空格处截断

3. **isProbablyReaderable** - 页面可读性判断

### 3.3 AI 调用整合

**Before（三次调用）：**

```
1. analyzeBookmark() → 标题、摘要、分类、标签
2. suggestTags() → 额外标签推荐
3. suggestCategory() → 额外分类推荐
```

**After（一次调用）：**

```
analyzeComplete() → 一次性返回标题、摘要、分类、标签
```

### 3.4 提示词优化

**System Prompt：**

```
你是一个专业的网页内容分析专家，擅长提取文章的核心主题并生成准确的元数据。
```

**User Prompt 结构化设计：**

```
请分析以下网页内容，生成书签元数据：

网页信息：
title: {标题}
url: {清理后的URL}
excerpt: {摘要，截断到300字}
keywords: {meta keywords}
content: {正文内容，截断到500字}
site: {网站名称}

用户已有分类: {分类列表}
预设分类选项: {预设分类}
用户已有标签: {标签列表}

要求：
1. title: 优化标题，简洁明了，保留核心信息，不超过50字
2. summary: 一句话摘要，客观描述核心内容，使用中文，不超过200字
3. category: 推荐一个最合适的分类
   - 优先从用户已有分类中选择
   - 如果不合适，可以推荐预设分类或新分类名称
4. tags: 生成3-5个关键词标签
   - 简洁：中文2-5字，英文不超过2个单词
   - 准确：反映网页核心主题
   - 多样：涵盖网站/领域/具体内容
   - 避免与已有标签重复
```

### 3.5 降级策略

当 AI 调用失败时，使用备选方案：

```typescript
function getFallbackResult(pageContent: PageContent): AnalysisResult {
  const tags: string[] = [];
  
  // 1. 从 keywords 提取
  if (pageContent.metadata?.keywords) {
    const keywordTags = keywords.split(/[,，;；]/).slice(0, 3);
    tags.push(...keywordTags);
  }
  
  // 2. 从标题提取（过滤停用词）
  if (tags.length < 3 && pageContent.title) {
    const titleWords = title.split(/[\s\-\_]+/).filter(...);
    tags.push(...titleWords);
  }
  
  // 3. 从 URL 提取域名
  // ...
  
  return {
    title: pageContent.title,
    summary: pageContent.excerpt || metadata.description,
    category: '',
    tags: [...new Set(tags)].slice(0, 5),
  };
}
```

---

## 四、对比：优化前后

| 方面 | 优化前 | 优化后 |
|-----|-------|-------|
| 传递给 AI 的信息 | url、title、content | url、title、content、excerpt、keywords、siteName、上下文 |
| AI 调用次数 | 最多 3 次 | 1 次 |
| 提示词结构 | 简单文本 | 结构化格式 + 约束条件 |
| 降级策略 | 无 | 有（keywords → 标题分词 → URL 域名） |
| 标签质量 | 一般 | 更精准（有上下文、有约束） |
| 分类推荐 | 需要额外调用 | 一次返回 |

---

## 五、使用说明

### 5.1 SavePanel 调用方式

```tsx
// 自动触发 AI 分析
useEffect(() => {
  if (!existingBookmark && pageContent.content) {
    runAIAnalysis();
  }
}, []);

const runAIAnalysis = async () => {
  // 使用增强的一次性分析方法
  const result = await aiClient.analyzeComplete({
    pageContent,           // 完整的页面内容
    userCategories: categories,  // 用户已有分类
    existingTags: allTags,       // 用户已有标签
  });
  
  // 更新表单
  setTitle(result.title);
  setDescription(result.summary);
  setTags(result.tags);
  // ...
};
```

### 5.2 兼容旧接口

保留了旧的 `analyze()` 方法以保持兼容性：

```typescript
// 旧接口（仍可使用）
await aiClient.analyze({
  url: pageContent.url,
  title: pageContent.title,
  content: pageContent.content,
});

// 新接口（推荐）
await aiClient.analyzeComplete({
  pageContent,
  userCategories,
  existingTags,
});
```

---

## 六、后续优化建议

1. **向量嵌入**：参考 SmartBookmark 添加 embedding 功能，支持语义搜索
2. **缓存机制**：对相同 URL 的标签生成结果进行缓存
3. **自定义提示词**：允许用户自定义提示词模板
4. **多语言支持**：根据页面语言自动调整提示词

