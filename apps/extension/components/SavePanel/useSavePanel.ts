/**
 * useSavePanel Hook
 * 保存面板的业务逻辑层
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  bookmarkStorage,
  configStorage,
  aiCacheStorage,
} from "@/lib/storage";
import {
  bookmarkAnalysisService,
  matchCategoryByName,
  translationService,
} from "@/lib/agent";
import { getBackgroundService } from "@/lib/services";
import { createMarkdownContent } from "defuddle/full";
import type {
  DefaultSnapshotType,
  PageContent,
  LocalBookmark,
  LocalCategory,
} from "@/types";
import type { AIStatusType } from "./AIStatus";
import { parseCategoryPath } from "../common/CategoryTree";

export type SavePanelSnapshotStatus =
  | "idle"
  | "savingBookmark"
  | "savingSnapshot"
  | "bookmarkSaved"
  | "skipped"
  | "saved"
  | "failed";

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
  saveSnapshot: boolean;
  defaultSnapshotType: DefaultSnapshotType;
  snapshotStatus: SavePanelSnapshotStatus;
  snapshotError: string | null;

  // 表单操作
  setUrl: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setTags: (value: string[]) => void;
  setSaveSnapshot: (value: boolean) => void;
  setDefaultSnapshotType: (value: DefaultSnapshotType) => void;

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
  // 将 content.ts 传来的 HTML 正文转为 Markdown
  // 提升性能，仅在 UI 层按需处理
  const markdown = useMemo(() => {
    if (!pageContent.content) return "";
    return createMarkdownContent(pageContent.htmlContent, pageContent.url);
  }, [pageContent.content, pageContent.htmlContent, pageContent.url]);

  // 表单状态
  const [url, setUrl] = useState(pageContent.url);
  const [title, setTitle] = useState(pageContent.title);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // 选项数据
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // AI 状态
  const [aiStatus, setAIStatus] = useState<AIStatusType>("idle");
  const [aiError, setAIError] = useState<string | null>(null);

  // AI 推荐的新分类（不在用户已有分类中）
  const [aiRecommendedCategory, setAiRecommendedCategory] = useState<
    string | null
  >(null);

  // 操作状态
  const [saving, setSaving] = useState(false);
  const [saveSnapshot, setSaveSnapshotState] = useState(false);
  const [defaultSnapshotType, setDefaultSnapshotTypeState] =
    useState<DefaultSnapshotType>("auto");
  const [snapshotStatus, setSnapshotStatus] =
    useState<SavePanelSnapshotStatus>("idle");
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // 加载分类和标签列表
  useEffect(() => {
    const loadData = async () => {
      const [cats, existingTags, settings] = await Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
        configStorage.getSettings(),
      ]);
      const snapshotType = normalizeDefaultSnapshotType(
        settings.defaultSnapshotType,
      );
      setCategories(cats);
      setAllTags(existingTags);
      setDefaultSnapshotTypeState(snapshotType);
      setSaveSnapshotState(
        settings.autoSaveSnapshot && snapshotType !== "none",
      );
      setDataLoaded(true);
    };
    loadData();
  }, []);

  const setSaveSnapshot = useCallback(
    (value: boolean) => {
      setSaveSnapshotState(value);
      setSnapshotStatus("idle");
      setSnapshotError(null);
      if (value && defaultSnapshotType === "none") {
        setDefaultSnapshotTypeState("auto");
      }
    },
    [defaultSnapshotType],
  );

  const setDefaultSnapshotType = useCallback((value: DefaultSnapshotType) => {
    const snapshotType = normalizeDefaultSnapshotType(value);
    setDefaultSnapshotTypeState(snapshotType);
    setSnapshotStatus("idle");
    setSnapshotError(null);
    setSaveSnapshotState(snapshotType !== "none");
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
    if (!existingBookmark && (markdown || pageContent.textContent)) {
      runAIAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded]);

  /**
   * 执行 AI 分析的公共逻辑
   * @param skipCache 是否跳过缓存检查
   */
  const performAIAnalysis = useCallback(
    async (skipCache: boolean = false) => {
      const config = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();

      // 检查 AI 是否已配置
      const isAIConfigured =
        config.provider === "ollama" ? !!config.baseUrl : !!config.apiKey;

      if (!isAIConfigured) {
        setAIStatus("disabled");
        return;
      }

      setAIStatus("loading");
      setAIError(null);

      try {
        // 1. 检查缓存（如果未跳过）
        if (!skipCache) {
          const cachedResult = await aiCacheStorage.getCachedAnalysis(
            pageContent.url,
          );
          if (cachedResult) {
            console.log("[useSavePanel] Using cached AI analysis result");
            await applyAnalysisResultWithSetters(
              cachedResult,
              config,
              categories,
              setTitle,
              setDescription,
              setTags,
              setCategoryId,
              setAiRecommendedCategory,
              existingBookmark,
              settings.language,
            );
            setAIStatus("success");
            return;
          }
        }

        // 2. 执行分析（传递已有标签避免生成语义相近的重复标签）
        const existingTags = await bookmarkStorage.getAllTags();
        const result = await bookmarkAnalysisService.analyzeBookmark({
          pageContent: { ...pageContent, content: markdown },
          userCategories: categories,
          existingTags,
        });

        // 4. 将结果保存到缓存
        await aiCacheStorage.cacheAnalysis(
          { ...pageContent, content: markdown },
          result,
        );

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
          existingBookmark,
          settings.language,
        );

        setAIStatus("success");
      } catch (err: unknown) {
        setAIStatus("error");
        setAIError(err instanceof Error ? err.message : "分析失败");
      }
    },
    [pageContent, categories, existingBookmark],
  );

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
          (c) =>
            c.name.toLowerCase() === trimmedName.toLowerCase() &&
            c.parentId === parentId,
        );

        if (existing) {
          parentId = existing.id;
          finalCategory = existing;
        } else {
          // 创建新分类
          const newCat = await bookmarkStorage.createCategory(
            trimmedName,
            parentId,
          );
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
      console.error(
        "[useSavePanel] Failed to apply AI recommended category:",
        err,
      );
    }
  }, [aiRecommendedCategory]);

  /**
   * 保存书签
   */
  const save = useCallback(async () => {
    if (!title?.trim() || !url.trim()) return;

    setSaving(true);
    setSnapshotStatus("savingBookmark");
    setSnapshotError(null);

    try {
      const data = {
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        content: markdown,
        categoryId,
        tags,
        favicon: pageContent.favicon,
        hasSnapshot: existingBookmark?.hasSnapshot ?? false,
      };

      let bookmark: LocalBookmark;

      if (existingBookmark) {
        // 更新现有书签
        bookmark = await bookmarkStorage.updateBookmark(
          existingBookmark.id,
          data,
        );
      } else {
        // 创建新书签
        bookmark = await bookmarkStorage.createBookmark(data);
      }
      setSnapshotStatus("bookmarkSaved");

      // 添加 embedding 生成任务（在 background 中执行）
      try {
        const backgroundService = getBackgroundService();
        await backgroundService.queueBookmarkEmbedding(bookmark.id);
      } catch (e) {
        console.warn("[useSavePanel] Failed to queue embedding:", e);
      }

      if (saveSnapshot) {
        setSnapshotStatus("savingSnapshot");
        try {
          const backgroundService = getBackgroundService();
          const snapshotMarkdown = shouldUseMarkdownSnapshot(
            defaultSnapshotType,
            pageContent,
            markdown,
          )
            ? markdown
            : undefined;

          const result = await backgroundService.saveSnapshotBackground(
            bookmark.id,
            {
              markdown: snapshotMarkdown,
              mode: defaultSnapshotType,
            },
          );

          if (!result.ok) {
            setSnapshotStatus("failed");
            setSnapshotError(result.error ?? "快照保存失败，可稍后重试");
            return;
          }

          setSnapshotStatus(result.skipped ? "skipped" : "saved");
        } catch (e) {
          console.warn(
            "[useSavePanel] Failed to save snapshot asynchronously:",
            e,
          );
          setSnapshotStatus("failed");
          setSnapshotError(
            e instanceof Error ? e.message : "快照保存失败，可稍后重试",
          );
          return;
        }
      } else {
        setSnapshotStatus("skipped");
      }

      onSaved?.();
    } catch (err: unknown) {
      console.error("[useSavePanel] Save failed:", err);
      setSnapshotStatus("failed");
      alert(err instanceof Error ? err.message : "保存失败");
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
    markdown,
    existingBookmark,
    saveSnapshot,
    defaultSnapshotType,
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
      console.error("[useSavePanel] Delete failed:", err);
      alert(err instanceof Error ? err.message : "删除失败");
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
    saveSnapshot,
    defaultSnapshotType,
    snapshotStatus,
    snapshotError,
    setUrl,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    setSaveSnapshot,
    setDefaultSnapshotType,
    runAIAnalysis,
    retryAnalysis,
    applyAIRecommendedCategory,
    aiRecommendedCategory,
    save,
    deleteBookmark,
  };
}

// ========== 辅助函数 ==========

function normalizeDefaultSnapshotType(
  value?: DefaultSnapshotType,
): DefaultSnapshotType {
  if (
    value === "auto" ||
    value === "markdown" ||
    value === "html" ||
    value === "none"
  ) {
    return value;
  }
  return "auto";
}

function shouldUseMarkdownSnapshot(
  type: DefaultSnapshotType,
  pageContent: PageContent,
  markdown: string,
): boolean {
  if (!markdown) return false;
  if (type === "markdown") return true;
  return type === "auto" && !!pageContent.isReaderable;
}

/**
 * 简单匹配分类名称（精确 + 模糊）
 * 优先匹配叶子节点（子分类），避免只匹配到父节点
 */
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
  existingBookmark: any,
  targetLang: "zh" | "en" = "zh",
): Promise<void> {
  // 更新表单（仅非空值）
  if (result.title && !existingBookmark) {
    setTitle(result.title);
  }

  // 处理描述（翻译功能）
  if (result.summary) {
    if (config.enableTranslation) {
      const translatedSummary = await translationService.translate(
        result.summary,
        targetLang,
      );
      setDescription(translatedSummary);
    } else {
      setDescription(result.summary);
    }
  }

  // 处理标签（仅在启用标签推荐时）
  if (config.enableTagSuggestion && result.tags.length > 0) {
    if (config.enableTranslation) {
      const translatedTags = await Promise.all(
        result.tags.map((tag: string) =>
          translationService.translate(tag, targetLang),
        ),
      );
      setTags(translatedTags);
    } else {
      setTags(result.tags);
    }
  }

  // 查找匹配的分类（仅在启用智能分类时）
  if (config.enableSmartCategory && result.category) {
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
