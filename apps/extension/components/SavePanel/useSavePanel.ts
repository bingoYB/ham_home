/**
 * useSavePanel Hook
 * 保存面板的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { aiClient } from '@/lib/ai/client';
import { bookmarkStorage, snapshotStorage, configStorage, aiCacheStorage } from '@/lib/storage';
import type {
  PageContent,
  LocalBookmark,
  LocalCategory,
} from '@/types';
import type { AIStatusType } from './AIStatus';
import { parseCategoryPath } from '../common/CategoryTree';

interface UseSavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved?: () => void;
}

interface UseSavePanelResult {
  // 表单状态
  url: string;
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];

  // AI 状态
  aiStatus: AIStatusType;
  aiError: string | null;

  // AI 推荐的新分类（不在用户已有分类中）
  aiRecommendedCategory: string | null;

  // 操作状态
  saving: boolean;

  // 表单操作
  setUrl: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setTags: (value: string[]) => void;

  // 业务操作
  runAIAnalysis: () => Promise<void>;
  retryAnalysis: () => Promise<void>;
  applyAIRecommendedCategory: () => Promise<void>;
  save: () => Promise<void>;
  deleteBookmark: () => Promise<void>;
}

export function useSavePanel({
  pageContent,
  existingBookmark,
  onSaved,
}: UseSavePanelProps): UseSavePanelResult {
  // 表单状态
  const [url, setUrl] = useState(pageContent.url);
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // 选项数据
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // AI 状态
  const [aiStatus, setAIStatus] = useState<AIStatusType>('idle');
  const [aiError, setAIError] = useState<string | null>(null);

  // AI 推荐的新分类（不在用户已有分类中）
  const [aiRecommendedCategory, setAiRecommendedCategory] = useState<string | null>(null);

  // 操作状态
  const [saving, setSaving] = useState(false);

  // 加载分类和标签列表
  useEffect(() => {
    const loadData = async () => {
      const [cats, existingTags] = await Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
      ]);
      setCategories(cats);
      setAllTags(existingTags);
      setDataLoaded(true);
    };
    loadData();
  }, []);

  // 如果已存在书签，填充现有数据
  useEffect(() => {
    if (existingBookmark) {
      setUrl(existingBookmark.url);
      setTitle(existingBookmark.title);
      setDescription(existingBookmark.description);
      setCategoryId(existingBookmark.categoryId);
      setTags(existingBookmark.tags);
    }
  }, [existingBookmark]);

  // 自动触发 AI 分析（仅新书签）
  // 等待数据加载完成后再执行
  useEffect(() => {
    if (!dataLoaded) {
      return;
    }
    if (!existingBookmark && (pageContent.content || pageContent.textContent)) {
      runAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  /**
   * 执行 AI 分析的公共逻辑
   * @param skipCache 是否跳过缓存检查
   */
  const performAIAnalysis = useCallback(async (skipCache: boolean = false) => {
    const config = await configStorage.getAIConfig();

    // 检查 AI 是否已配置
    const isAIConfigured = config.provider === 'ollama' 
      ? !!config.baseUrl 
      : !!config.apiKey;
    
    if (!isAIConfigured) {
      setAIStatus('disabled');
      return;
    }

    setAIStatus('loading');
    setAIError(null);

    try {
      // 1. 检查缓存（如果未跳过）
      if (!skipCache) {
        const cachedResult = await aiCacheStorage.getCachedAnalysis(pageContent.url);
        if (cachedResult) {
          console.log('[useSavePanel] Using cached AI analysis result');
          await applyAnalysisResultWithSetters(
            cachedResult,
            config,
            categories,
            setTitle,
            setDescription,
            setTags,
            setCategoryId,
            setAiRecommendedCategory,
            existingBookmark
          );
          setAIStatus('success');
          return;
        }
      }

      // 2. 加载配置并检查
      await aiClient.loadConfig();
      if (!aiClient.isConfigured()) {
        setAIStatus('disabled');
        return;
      }

      // 3. 执行新的分析
      const result = await aiClient.analyzeComplete({
        pageContent,
        userCategories: categories,
      });

      // 4. 将结果保存到缓存
      await aiCacheStorage.cacheAnalysis(pageContent, result);

      // 5. 应用分析结果
      await applyAnalysisResultWithSetters(
        result,
        config,
        categories,
        setTitle,
        setDescription,
        setTags,
        setCategoryId,
        setAiRecommendedCategory,
        existingBookmark
      );

      setAIStatus('success');
    } catch (err: unknown) {
      setAIStatus('error');
      setAIError(err instanceof Error ? err.message : '分析失败');
    }
  }, [pageContent, categories, existingBookmark]);

  /**
   * AI 分析 - 一次调用完成标题、摘要、分类、标签生成
   * 优化：
   * 1. 优先检查缓存中是否有分析结果
   * 2. 新的分析结果完成后，保存到缓存
   */
  const runAIAnalysis = useCallback(async () => {
    await performAIAnalysis(false);
  }, [performAIAnalysis]);

  /**
   * 重试 AI 分析 - 强制重新分析，不使用缓存
   * 用于用户点击"重试"按钮时的场景
   */
  const retryAnalysis = useCallback(async () => {
    await performAIAnalysis(true);
  }, [performAIAnalysis]);

  /**
   * 应用 AI 推荐的新分类（创建并设置）
   * 支持多层级格式：如 "设计 > 灵感素材 > 图片资源"
   */
  const applyAIRecommendedCategory = useCallback(async () => {
    if (!aiRecommendedCategory) return;
    
    try {
      // 解析层级路径（支持 " > " 分隔符）
      const parts = parseCategoryPath(aiRecommendedCategory);
      
      // 获取最新分类列表
      let allCategories = await bookmarkStorage.getCategories();
      let parentId: string | null = null;
      let finalCategory: LocalCategory | null = null;
      const newCategories: LocalCategory[] = [];

      // 逐层查找或创建分类
      for (const partName of parts) {
        const trimmedName = partName.trim();
        if (!trimmedName) continue;

        // 在当前层级查找是否已存在
        const existing = allCategories.find(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.parentId === parentId
        );

        if (existing) {
          parentId = existing.id;
          finalCategory = existing;
        } else {
          // 创建新分类
          const newCat = await bookmarkStorage.createCategory(trimmedName, parentId);
          newCategories.push(newCat);
          parentId = newCat.id;
          finalCategory = newCat;
          // 更新分类列表
          allCategories = [...allCategories, newCat];
        }
      }

      if (finalCategory) {
        setCategoryId(finalCategory.id);
        if (newCategories.length > 0) {
          setCategories((prev) => [...prev, ...newCategories]);
        }
        setAiRecommendedCategory(null);
      }
    } catch (err) {
      console.error('[useSavePanel] Failed to apply AI recommended category:', err);
    }
  }, [aiRecommendedCategory]);

  /**
   * 保存书签
   */
  const save = useCallback(async () => {
    if (!title.trim() || !url.trim()) return;

    setSaving(true);

    try {
      const settings = await configStorage.getSettings();

      const data = {
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        content: pageContent.content,
        categoryId,
        tags,
        favicon: pageContent.favicon,
        hasSnapshot: false,
      };

      let bookmark: LocalBookmark;

      if (existingBookmark) {
        // 更新现有书签
        bookmark = await bookmarkStorage.updateBookmark(
          existingBookmark.id,
          data
        );
      } else {
        // 创建新书签
        bookmark = await bookmarkStorage.createBookmark(data);
      }

      // 自动保存快照
      if (settings.autoSaveSnapshot && pageContent.content) {
        try {
          // 获取页面 HTML (通过 background script)
          const html = await chrome.runtime.sendMessage({
            type: 'GET_PAGE_HTML',
          });
          if (html) {
            await snapshotStorage.saveSnapshot(bookmark.id, html);
            await bookmarkStorage.updateBookmark(bookmark.id, {
              hasSnapshot: true,
            });
          }
        } catch (e) {
          console.warn('[useSavePanel] Failed to save snapshot:', e);
        }
      }

      onSaved?.();
    } catch (err: unknown) {
      console.error('[useSavePanel] Save failed:', err);
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [
    url,
    title,
    description,
    categoryId,
    tags,
    pageContent,
    existingBookmark,
    onSaved,
  ]);

  /**
   * 删除书签
   */
  const deleteBookmark = useCallback(async () => {
    if (!existingBookmark) return;

    // 确认删除
    if (!confirm(`确定要删除书签《${existingBookmark.title}》吗？`)) {
      return;
    }

    setSaving(true);

    try {
      // 软删除书签
      await bookmarkStorage.deleteBookmark(existingBookmark.id);
      
      // 通知外层组件已删除
      onSaved?.();
    } catch (err: unknown) {
      console.error('[useSavePanel] Delete failed:', err);
      alert(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSaving(false);
    }
  }, [existingBookmark, onSaved]);

  return {
    url,
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    saving,
    setUrl,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    runAIAnalysis,
    retryAnalysis,
    applyAIRecommendedCategory,
    aiRecommendedCategory,
    save,
    deleteBookmark,
  };
}

// ========== 辅助函数 ==========

/**
 * 简单匹配分类名称（精确 + 模糊）
 * 优先匹配叶子节点（子分类），避免只匹配到父节点
 */
function matchCategoryByName(
  categoryName: string,
  categories: LocalCategory[]
): { matched: boolean; categoryId: string | null } {
  const searchName = categoryName.toLowerCase();
  
  // 判断是否为叶子节点（没有子分类）
  const parentIds = new Set(categories.map(c => c.parentId).filter(Boolean));
  const isLeaf = (c: LocalCategory) => !parentIds.has(c.id);
  
  // 精确匹配 - 优先叶子节点
  const exactMatches = categories.filter(
    (c) => c.name.toLowerCase() === searchName
  );
  if (exactMatches.length > 0) {
    const leafMatch = exactMatches.find(isLeaf);
    return { matched: true, categoryId: (leafMatch || exactMatches[0]).id };
  }

  // 模糊匹配 - 优先叶子节点
  const fuzzyMatches = categories.filter(
    (c) => c.name.toLowerCase().includes(searchName) ||
           searchName.includes(c.name.toLowerCase())
  );
  if (fuzzyMatches.length > 0) {
    const leafMatch = fuzzyMatches.find(isLeaf);
    return { matched: true, categoryId: (leafMatch || fuzzyMatches[0]).id };
  }

  return { matched: false, categoryId: null };
}

/**
 * 应用分析结果到表单（带有 setter 函数）
 * 返回 AI 推荐的新分类名称（如果不在用户已有分类中）
 */
async function applyAnalysisResultWithSetters(
  result: any,
  config: any,
  categories: LocalCategory[],
  setTitle: (v: string) => void,
  setDescription: (v: string) => void,
  setTags: (v: string[]) => void,
  setCategoryId: React.Dispatch<React.SetStateAction<string | null>>,
  setAiRecommendedCategory: React.Dispatch<React.SetStateAction<string | null>>,
  existingBookmark: any
): Promise<void> {
  // 更新表单（仅非空值）
  if (result.title && !existingBookmark) {
    setTitle(result.title);
  }

  // 处理描述（翻译功能）
  if (result.summary) {
    if (config.enableTranslation) {
      const translatedSummary = await aiClient.translate(result.summary, 'zh');
      setDescription(translatedSummary);
    } else {
      setDescription(result.summary);
    }
  }

  // 处理标签（翻译功能）
  if (result.tags.length > 0) {
    if (config.enableTranslation) {
      const translatedTags = await Promise.all(
        result.tags.map((tag: string) => aiClient.translate(tag, 'zh'))
      );
      setTags(translatedTags);
    } else {
      setTags(result.tags);
    }
  }

  // 查找匹配的分类
  if (result.category) {
    const matchResult = matchCategoryByName(result.category, categories);
    if (matchResult.matched) {
      setCategoryId(matchResult.categoryId);
      setAiRecommendedCategory(null);
    } else {
      // 分类不在用户已有分类中，设为未分类，并记录推荐分类
      setCategoryId(null);
      setAiRecommendedCategory(result.category);
    }
  }
}


