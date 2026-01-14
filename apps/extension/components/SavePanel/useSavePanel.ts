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

interface UseSavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved?: () => void;
}

interface UseSavePanelResult {
  // 表单状态
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
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // 选项数据
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

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
    };
    loadData();
  }, []);

  // 如果已存在书签，填充现有数据
  useEffect(() => {
    if (existingBookmark) {
      setTitle(existingBookmark.title);
      setDescription(existingBookmark.description);
      setCategoryId(existingBookmark.categoryId);
      setTags(existingBookmark.tags);
    }
  }, [existingBookmark]);

  // 自动触发 AI 分析（仅新书签）
  useEffect(() => {
    if (!existingBookmark && (pageContent.content || pageContent.textContent)) {
      runAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * AI 分析 - 一次调用完成标题、摘要、分类、标签生成
   * 优化：
   * 1. 优先检查缓存中是否有分析结果
   * 2. 新的分析结果完成后，保存到缓存
   */
  const runAIAnalysis = useCallback(async () => {
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
      // 1. 优先检查缓存
      const cachedResult = await aiCacheStorage.getCachedAnalysis(pageContent.url);
      if (cachedResult) {
        console.log('[useSavePanel] Using cached AI analysis result');
        // 使用缓存结果，应用到表单
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

      await aiClient.loadConfig();

      if (!aiClient.isConfigured()) {
        setAIStatus('disabled');
        return;
      }

      // 2. 执行新的分析（传递预设标签而非已有标签）
      const result = await aiClient.analyzeComplete({
        pageContent,
        userCategories: categories,
      });

      // 3. 将结果保存到缓存
      await aiCacheStorage.cacheAnalysis(pageContent, result);

      // 应用分析结果
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
   * 重试 AI 分析 - 强制重新分析，不使用缓存
   * 用于用户点击"重试"按钮时的场景
   */
  const retryAnalysis = useCallback(async () => {
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
   * 应用 AI 推荐的新分类（创建并设置）
   * 支持多层级格式：如 "设计 > 灵感素材 > 图片资源" 或 "设计/灵感素材/图片资源"
   */
  const applyAIRecommendedCategory = useCallback(async () => {
    if (!aiRecommendedCategory) return;
    
    try {
      // 解析层级路径（支持 " > " 和 "/" 分隔符）
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
    if (!title.trim()) return;

    setSaving(true);

    try {
      const settings = await configStorage.getSettings();

      const data = {
        url: pageContent.url,
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
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    saving,
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
    const matchResult = matchCategory(result.category, categories);
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

/**
 * 解析分类路径
 * 支持 " > " 和 "/" 分隔符
 * 如 "设计 > 灵感素材 > 图片资源" 或 "设计/灵感素材/图片资源"
 */
function parseCategoryPath(path: string): string[] {
  // 优先使用 " > " 分隔符
  if (path.includes(' > ')) {
    return path.split(' > ').map((s) => s.trim()).filter(Boolean);
  }
  // 其次使用 "/" 分隔符
  if (path.includes('/')) {
    return path.split('/').map((s) => s.trim()).filter(Boolean);
  }
  // 无分隔符，返回单个元素
  return [path.trim()].filter(Boolean);
}

/**
 * 匹配分类（不自动创建）
 * 返回匹配结果
 */
function matchCategory(
  categoryName: string,
  categories: LocalCategory[]
): { matched: boolean; categoryId: string | null } {
  // 先在用户分类中查找（精确匹配）
  const exactMatch = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (exactMatch) {
    return { matched: true, categoryId: exactMatch.id };
  }

  // 尝试模糊匹配（包含关系）
  const fuzzyMatch = categories.find(
    (c) => c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
           categoryName.toLowerCase().includes(c.name.toLowerCase())
  );
  if (fuzzyMatch) {
    return { matched: true, categoryId: fuzzyMatch.id };
  }

  return { matched: false, categoryId: null };
}

