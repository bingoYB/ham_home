/**
 * useSavePanel Hook
 * 保存面板的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { aiClient } from '@/lib/ai/client';
import { bookmarkStorage, snapshotStorage, configStorage } from '@/lib/storage';
import { PRESET_CATEGORIES } from '@/lib/preset-categories';
import type {
  PageContent,
  LocalBookmark,
  LocalCategory,
  TagSuggestion,
  CategorySuggestion,
} from '@/types';
import type { AIStatusType } from '@/components/SavePanel/AIStatus';

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

  // 智能推荐
  tagSuggestions: TagSuggestion[];
  categorySuggestions: CategorySuggestion[];
  showSuggestions: boolean;
  loadingSuggestions: boolean;

  // 操作状态
  saving: boolean;

  // 表单操作
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setTags: (value: string[]) => void;

  // 业务操作
  runAIAnalysis: () => Promise<void>;
  applyTagSuggestion: (tag: string) => void;
  applyCategorySuggestion: (suggestion: CategorySuggestion) => void;
  save: () => Promise<void>;
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

  // 智能推荐
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<
    CategorySuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
   */
  const runAIAnalysis = useCallback(async () => {
    const config = await configStorage.getAIConfig();

    if (!config.enabled) {
      setAIStatus('disabled');
      return;
    }

    setAIStatus('loading');
    setAIError(null);

    try {
      await aiClient.loadConfig();

      if (!aiClient.isConfigured()) {
        setAIStatus('disabled');
        return;
      }

      // 使用增强的一次性分析方法
      const result = await aiClient.analyzeComplete({
        pageContent,
        userCategories: categories,
        existingTags: allTags,
      });

      // 更新表单（仅非空值）
      if (result.title && !existingBookmark) {
        setTitle(result.title);
      }

      // 处理描述（翻译功能）
      if (result.summary) {
        if (config.enableTranslation) {
          const translatedSummary = await aiClient.translate(
            result.summary,
            'zh'
          );
          setDescription(translatedSummary);
        } else {
          setDescription(result.summary);
        }
      }

      // 处理标签（翻译功能）
      if (result.tags.length > 0) {
        if (config.enableTranslation) {
          const translatedTags = await Promise.all(
            result.tags.map((tag) => aiClient.translate(tag, 'zh'))
          );
          setTags(translatedTags);
        } else {
          setTags(result.tags);
        }
      }

      // 查找匹配的分类
      if (result.category) {
        await matchAndSetCategory(result.category, categories, setCategories, setCategoryId);
      }

      setAIStatus('success');

      // 清除智能推荐（因为已经在一次调用中完成）
      setTagSuggestions([]);
      setCategorySuggestions([]);
      setShowSuggestions(false);
    } catch (err: unknown) {
      setAIStatus('error');
      setAIError(err instanceof Error ? err.message : '分析失败');
    }
  }, [pageContent, categories, allTags, existingBookmark]);

  /**
   * 应用推荐的标签
   */
  const applyTagSuggestion = useCallback(
    (tag: string) => {
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      // 从推荐列表中移除已应用的标签
      setTagSuggestions((prev) => prev.filter((s) => s.tag !== tag));
    },
    [tags]
  );

  /**
   * 应用推荐的分类
   */
  const applyCategorySuggestion = useCallback(
    (suggestion: CategorySuggestion) => {
      // 查找分类
      const category = categories.find((c) => c.id === suggestion.categoryId);
      if (category) {
        setCategoryId(category.id);
      } else {
        // 如果是预设分类，需要先创建
        const presetCat = PRESET_CATEGORIES.find(
          (c) => c.id === suggestion.categoryId
        );
        if (presetCat) {
          bookmarkStorage.createCategory(presetCat.name).then((newCat) => {
            setCategoryId(newCat.id);
            setCategories((prev) => [...prev, newCat]);
          });
        }
      }
      // 清除分类推荐
      setCategorySuggestions([]);
    },
    [categories]
  );

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

  return {
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    tagSuggestions,
    categorySuggestions,
    showSuggestions,
    loadingSuggestions,
    saving,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    runAIAnalysis,
    applyTagSuggestion,
    applyCategorySuggestion,
    save,
  };
}

// ========== 辅助函数 ==========

/**
 * 匹配并设置分类
 */
async function matchAndSetCategory(
  categoryName: string,
  categories: LocalCategory[],
  setCategories: React.Dispatch<React.SetStateAction<LocalCategory[]>>,
  setCategoryId: React.Dispatch<React.SetStateAction<string | null>>
) {
  // 先在用户分类中查找
  const matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (matchedCategory) {
    setCategoryId(matchedCategory.id);
    return;
  }

  // 在预设分类中查找
  const presetCat = PRESET_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (presetCat) {
    // 创建预设分类并设置
    const newCat = await bookmarkStorage.createCategory(presetCat.name);
    setCategoryId(newCat.id);
    setCategories((prev) => [...prev, newCat]);
  }
}

