/**
 * useSavePanel Hook
 * 保存面板的业务逻辑层
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  bookmarkClipStorage,
  bookmarkStorage,
  configStorage,
} from "@/lib/storage";
import {
  matchCategoryByName,
} from "@/lib/agent";
// 直接引用错误码模块，避免把 background 专用的剪藏分析服务打进 content script
import { resolveClipAnalysisErrorCode } from "@/lib/agent/clip-analysis-errors";
import { getBackgroundService } from "@/lib/services";
import { obsidianSyncService } from "@/lib/services/obsidian-sync-service";
import { createMarkdownContent } from "defuddle/full";
import {
  deriveHighlightTitle,
  getClipImageBookmarkUrl,
  isSubjectClip,
} from "@/utils/clip-context";
import type {
  PageContent,
  ImageClipMetadata,
  LocalBookmark,
  LocalCategory,
  SaveFlowClipContext,
} from "@/types";
import type { AIStatusType } from "./AIStatus";
import {
  buildCategoryTree,
  flattenTree,
  matchCategoryByPath,
  parseCategoryPath,
} from "../common/CategoryTree";

export type SavePanelSnapshotStatus =
  | "idle"
  | "savingBookmark"
  | "savingSnapshot"
  | "bookmarkSaved"
  | "skipped"
  | "saved"
  | "failed";

/** 保存/删除失败信息，展示在面板内而不是使用浏览器原生弹窗 */
export interface SavePanelActionError {
  type: "save" | "delete";
  /** 原始错误信息，缺失时由展示层回退到通用文案 */
  message?: string;
}

export type SavePanelObsidianStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "skipped"
  | "failed";

export type SavePanelAssetStatus =
  | "idle"
  | "saving"
  | "skipped"
  | "saved"
  | "failed";

interface UseSavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved?: () => void;
  initialSaveSnapshot?: boolean;
  initialSaveScreenshot?: boolean;
  initialClip?: SaveFlowClipContext;
  /**
   * 首次加载（含自动 AI 分析）结束时触发，无论是否真的执行了 AI 分析。
   * 页内保存流程用它决定何时把「分析中」浮窗切换成保存表单。
   */
  onInitialLoadSettled?: () => void;
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
  snapshotStatus: SavePanelSnapshotStatus;
  snapshotError: string | null;
  saveScreenshot: boolean;
  screenshotStatus: SavePanelAssetStatus;
  screenshotError: string | null;
  clipNote: string;
  clipStatus: SavePanelAssetStatus;
  clipError: string | null;
  syncToObsidian: boolean;
  obsidianStatus: SavePanelObsidianStatus;
  obsidianError: string | null;
  actionError: SavePanelActionError | null;

  // 表单操作
  setUrl: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setTags: (value: string[]) => void;
  setSaveSnapshot: (value: boolean) => void;
  setSaveScreenshot: (value: boolean) => void;
  setClipNote: (value: string) => void;
  setSyncToObsidian: (value: boolean) => void;

  // 业务操作
  runAIAnalysis: () => Promise<void>;
  retryAnalysis: () => Promise<void>;
  applyAIRecommendedCategory: () => Promise<void>;
  save: () => Promise<void>;
  /** 删除书签，返回是否删除成功（确认交互由展示层负责） */
  deleteBookmark: () => Promise<boolean>;
  clearActionError: () => void;
}

interface SavePanelFormState {
  url: string;
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
}

function createInitialFormState(
  pageContent: PageContent,
  existingBookmark: LocalBookmark | null,
  initialClip?: SaveFlowClipContext,
): SavePanelFormState {
  if (existingBookmark) {
    return {
      url: existingBookmark.url,
      title: existingBookmark.title,
      description: existingBookmark.description,
      categoryId: existingBookmark.categoryId,
      tags: existingBookmark.tags,
    };
  }

  return {
    url: pageContent.url,
    // 文字剪藏在面板上没有标题输入，用选中内容首句兜底，保证书签可检索
    title: isTextClip(initialClip)
      ? deriveHighlightTitle(initialClip?.text) || pageContent.title
      : pageContent.title,
    description: "",
    categoryId: null,
    tags: [],
  };
}

/** 文字剪藏的展示主体就是选中内容，标题与摘要都不参与保存面板 */
function isTextClip(clip?: SaveFlowClipContext): boolean {
  return clip?.type === "highlight" && !!clip.text?.trim();
}

/**
 * 需要按剪藏主体（而非整页）分析的类型。
 * 返回 null 表示走普通的整页书签分析。
 */
function getClipAnalysisKind(
  clip?: SaveFlowClipContext,
): "image" | "highlight" | null {
  if (clip?.type === "image" && clip.imageSourceUrl) return "image";
  if (isTextClip(clip)) return "highlight";
  return null;
}

function createInitialImageMetadata(
  clip?: SaveFlowClipContext,
): ImageClipMetadata | undefined {
  if (clip?.type !== "image") return undefined;
  const metadata = {
    width: clip.imageWidth,
    height: clip.imageHeight,
  };
  return metadata.width || metadata.height ? metadata : undefined;
}

function mergeImageMetadata(
  current?: ImageClipMetadata,
  inspected?: ImageClipMetadata,
): ImageClipMetadata | undefined {
  if (!current && !inspected) return undefined;
  return {
    ...inspected,
    ...current,
    colors: current?.colors,
  };
}

function hasTechnicalImageMetadata(metadata?: ImageClipMetadata): boolean {
  return !!(
    metadata?.width &&
    metadata.height &&
    metadata.size != null &&
    metadata.format
  );
}

export function useSavePanel({
  pageContent,
  existingBookmark,
  onSaved,
  initialSaveSnapshot,
  initialSaveScreenshot,
  initialClip,
  onInitialLoadSettled,
}: UseSavePanelProps): UseSavePanelResult {
  const { t } = useTranslation();

  // 用 ref 持有回调，避免回调身份变化触发重复的初始化 effect
  const onInitialLoadSettledRef = useRef(onInitialLoadSettled);
  onInitialLoadSettledRef.current = onInitialLoadSettled;
  const initialLoadSettledRef = useRef(false);

  // 剪藏按其主体（图片 / 选中文字）分析，与整页书签走不同的提示词
  const clipAnalysisKind = getClipAnalysisKind(initialClip);

  // 图片书签的地址是图片本身，正文仍属于来源页，按来源页地址解析相对链接
  const imageBookmarkUrl = getClipImageBookmarkUrl(initialClip);
  const contentBaseUrl = imageBookmarkUrl
    ? (initialClip?.sourceUrl ?? pageContent.url)
    : pageContent.url;

  // 将 content.ts 传来的 HTML 正文转为 Markdown
  // 提升性能，仅在 UI 层按需处理
  const markdown = useMemo(() => {
    if (!pageContent.content) return "";
    return createMarkdownContent(pageContent.htmlContent, contentBaseUrl);
  }, [pageContent.content, pageContent.htmlContent, contentBaseUrl]);

  // 表单状态
  const initialFormState = useMemo(
    () => createInitialFormState(pageContent, existingBookmark, initialClip),
    [pageContent, existingBookmark, initialClip],
  );
  const [url, setUrl] = useState(initialFormState.url);
  const [title, setTitle] = useState(initialFormState.title);
  const [description, setDescription] = useState(initialFormState.description);
  const [categoryId, setCategoryId] = useState<string | null>(
    initialFormState.categoryId,
  );
  const [tags, setTags] = useState<string[]>(initialFormState.tags);

  // 选项数据
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const categoriesRef = useRef<LocalCategory[]>([]);

  // AI 状态
  const [aiStatus, setAIStatus] = useState<AIStatusType>("idle");
  const [aiError, setAIError] = useState<string | null>(null);
  const [imageClipMetadata, setImageClipMetadata] = useState<
    ImageClipMetadata | undefined
  >(() => createInitialImageMetadata(initialClip));

  // AI 推荐的新分类（不在用户已有分类中）
  const [aiRecommendedCategory, setAiRecommendedCategory] = useState<
    string | null
  >(null);

  // 操作状态
  const [saving, setSaving] = useState(false);
  const [saveSnapshot, setSaveSnapshotState] = useState(false);
  const [snapshotStatus, setSnapshotStatus] =
    useState<SavePanelSnapshotStatus>("idle");
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [saveScreenshot, setSaveScreenshotState] = useState(false);
  const [screenshotStatus, setScreenshotStatus] =
    useState<SavePanelAssetStatus>("idle");
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [clipNote, setClipNote] = useState("");
  const [clipStatus, setClipStatus] = useState<SavePanelAssetStatus>("idle");
  const [clipError, setClipError] = useState<string | null>(null);
  const [syncToObsidian, setSyncToObsidian] = useState(false);
  const [obsidianStatus, setObsidianStatus] =
    useState<SavePanelObsidianStatus>("idle");
  const [obsidianError, setObsidianError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<SavePanelActionError | null>(
    null,
  );

  const setSaveSnapshot = useCallback((value: boolean) => {
    setSaveSnapshotState(value);
    setSnapshotStatus("idle");
    setSnapshotError(null);
    setObsidianStatus("idle");
    setObsidianError(null);
    if (!value) {
      setSyncToObsidian(false);
    }
  }, []);

  const setSaveScreenshot = useCallback((value: boolean) => {
    setSaveScreenshotState(value);
    setScreenshotStatus("idle");
    setScreenshotError(null);
  }, []);

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

      // 图片剪藏会把原图发送给模型，用户关闭该开关时不做分析
      if (clipAnalysisKind === "image" && config.enableImageAnalysis === false) {
        setAIStatus("disabled");
        return;
      }

      setAIStatus("loading");
      setAIError(null);

      try {
        // 执行分析（传递已有标签避免生成语义相近的重复标签）
        // 缓存读写由 background 统一处理，保证 popup / content script 共用同一份缓存
        const backgroundService = getBackgroundService();
        const existingTags = await bookmarkStorage.getAllTags();
        const result =
          clipAnalysisKind && initialClip
            ? await backgroundService.analyzeClip({
                clip: initialClip,
                // 剪藏书签地址（图片地址 / 带 Text Fragment 的来源页地址）天然唯一，直接作缓存键
                cacheKey: pageContent.url,
                source: {
                  url: initialClip.sourceUrl ?? contentBaseUrl,
                  title: initialClip.sourceTitle ?? pageContent.title,
                  excerpt: pageContent.excerpt,
                },
                userCategories: categoriesRef.current,
                existingTags,
                skipCache,
              })
            : await backgroundService.analyzeBookmark({
                pageContent: { ...pageContent, content: markdown },
                userCategories: categoriesRef.current,
                existingTags,
                skipCache,
              });

        if (result.imageMetadata) {
          setImageClipMetadata((current) =>
            mergeImageMetadata(result.imageMetadata, current),
          );
        }

        // 应用分析结果
        // 文字剪藏的分析结果不含标题与摘要，这里会自动跳过对应字段
        await applyAnalysisResultWithSetters(
          result,
          config,
          categoriesRef.current,
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
        setAIError(resolveAnalysisErrorMessage(err, t));
      }
    },
    [
      pageContent,
      existingBookmark,
      markdown,
      initialClip,
      clipAnalysisKind,
      contentBaseUrl,
      t,
    ],
  );

  // 加载分类和标签列表，并在数据可用后直接触发新书签 AI 分析
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const [cats, existingTags, settings] = await Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
        configStorage.getSettings(),
      ]);

      if (cancelled) return;

      categoriesRef.current = cats;
      setCategories(cats);
      setAllTags(existingTags);

      // 主体型剪藏（图片 / 选中文字）保存的不是整页，不需要截图与快照
      if (isSubjectClip(initialClip)) {
        setSaveSnapshotState(false);
        setSaveScreenshotState(false);
      } else {
        if (initialSaveSnapshot !== undefined) {
          setSaveSnapshotState(initialSaveSnapshot);
        } else {
          setSaveSnapshotState(settings.autoSaveSnapshot);
        }

        const screenshotAllowed =
          !pageContent.isPrivate ||
          settings.screenshotPrivatePagePolicy === "ask";
        setSaveScreenshotState(
          screenshotAllowed
            ? (initialSaveScreenshot ?? settings.autoSaveScreenshot)
            : false,
        );
      }

      // 剪藏的分析主体是图片或选中文字，与来源页是否有正文无关；
      // 隐私页面上的内容一律不发送给 AI
      const hasAnalyzableSubject = clipAnalysisKind
        ? true
        : !!(markdown || pageContent.textContent);

      if (!existingBookmark && !pageContent.isPrivate && hasAnalyzableSubject) {
        await performAIAnalysis(false);
      }

      if (cancelled || initialLoadSettledRef.current) return;
      initialLoadSettledRef.current = true;
      onInitialLoadSettledRef.current?.();
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    clipAnalysisKind,
    existingBookmark,
    initialClip,
    initialSaveSnapshot,
    initialSaveScreenshot,
    markdown,
    pageContent.isPrivate,
    pageContent.textContent,
    performAIAnalysis,
  ]);

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
          setCategories((prev) => {
            const next = [...prev, ...newCategories];
            categoriesRef.current = next;
            return next;
          });
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
    setScreenshotStatus("idle");
    setScreenshotError(null);
    setClipStatus("idle");
    setClipError(null);
    setActionError(null);
    setObsidianStatus("idle");
    setObsidianError(null);

    try {
      const data = {
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        // 主体型剪藏不重复保存来源页正文（同页多条剪藏会各存一份）：
        // 图片书签的主体是图片本身，文字书签的主体是选中片段
        content: imageBookmarkUrl
          ? ""
          : isTextClip(initialClip)
            ? (initialClip?.text?.trim() ?? "")
            : markdown,
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

      const independentAssets: Promise<void>[] = [];

      if (saveScreenshot) {
        setScreenshotStatus("saving");
        independentAssets.push(
          (async () => {
            try {
              const result = await getBackgroundService().saveScreenshotBackground(
                bookmark.id,
                { expectedUrl: pageContent.url },
              );
              if (!result.ok) {
                setScreenshotStatus("failed");
                setScreenshotError(result.error ?? "页面截图保存失败，可稍后重试");
                return;
              }
              setScreenshotStatus(result.skipped ? "skipped" : "saved");
            } catch (error) {
              setScreenshotStatus("failed");
              setScreenshotError(
                error instanceof Error ? error.message : "页面截图保存失败，可稍后重试",
              );
            }
          })(),
        );
      } else {
        setScreenshotStatus("skipped");
      }

      if (initialClip) {
        setClipStatus("saving");
        independentAssets.push(
          (async () => {
            try {
              let persistedImageMetadata = imageClipMetadata;
              if (
                initialClip.type === "image" &&
                initialClip.imageSourceUrl &&
                !hasTechnicalImageMetadata(persistedImageMetadata)
              ) {
                try {
                  const inspected = await getBackgroundService().inspectClipImage(
                    initialClip.imageSourceUrl,
                  );
                  persistedImageMetadata = mergeImageMetadata(
                    persistedImageMetadata,
                    inspected,
                  );
                } catch (error) {
                  // 技术信息采集失败不回滚书签与剪藏；保留 DOM / AI 已取得的字段。
                  console.warn(
                    "[useSavePanel] Failed to inspect clipped image:",
                    error,
                  );
                }
              }

              await bookmarkClipStorage.addClip(bookmark.id, {
                type: initialClip.type,
                text: initialClip.text,
                note: clipNote.trim() || undefined,
                targetUrl: initialClip.targetUrl,
                imageSourceUrl: initialClip.imageSourceUrl,
                sourceUrl: initialClip.sourceUrl || pageContent.url,
                sourceTitle: initialClip.sourceTitle || pageContent.title,
                selector: initialClip.selector,
                imageMetadata: persistedImageMetadata,
              });
              setClipStatus("saved");
            } catch (error) {
              setClipStatus("failed");
              setClipError(
                error instanceof Error ? error.message : "剪藏保存失败，可稍后重试",
              );
            }
          })(),
        );
      }

      await Promise.all(independentAssets);

      if (saveSnapshot) {
        setSnapshotStatus("savingSnapshot");
        try {
          const backgroundService = getBackgroundService();
          const snapshotMarkdown = shouldUseMarkdownSnapshot(
            pageContent,
            markdown,
          )
            ? markdown
            : undefined;

          const result = await backgroundService.saveSnapshotBackground(
            bookmark.id,
            {
              markdown: snapshotMarkdown,
              mode: "auto",
            },
          );

          if (!result.ok) {
            setSnapshotStatus("failed");
            setSnapshotError(result.error ?? "快照保存失败，可稍后重试");
            return;
          }

          setSnapshotStatus(result.skipped ? "skipped" : "saved");

          if (!result.skipped && syncToObsidian) {
            setObsidianStatus("syncing");
            const obsidianResult = await obsidianSyncService.syncBookmark(
              bookmark.id,
              {
                skipUnchanged: false,
                markdown,
                sourceUpdatedAt: bookmark.updatedAt,
              },
            );
            if (obsidianResult.status === "failed") {
              setObsidianStatus("failed");
              setObsidianError(obsidianResult.error ?? "同步到 Obsidian 失败");
            } else {
              setObsidianStatus(
                obsidianResult.status === "success" ? "synced" : "skipped",
              );
            }
          }
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
      setActionError({
        type: "save",
        message: err instanceof Error ? err.message : undefined,
      });
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
    imageBookmarkUrl,
    existingBookmark,
    saveSnapshot,
    saveScreenshot,
    syncToObsidian,
    initialClip,
    imageClipMetadata,
    clipNote,
    onSaved,
  ]);

  /**
   * 删除书签
   */
  const deleteBookmark = useCallback(async (): Promise<boolean> => {
    if (!existingBookmark) return false;

    setSaving(true);
    setActionError(null);

    try {
      // 软删除书签
      await bookmarkStorage.deleteBookmark(existingBookmark.id);

      // 通知外层组件已删除
      onSaved?.();
      return true;
    } catch (err: unknown) {
      console.error("[useSavePanel] Delete failed:", err);
      setActionError({
        type: "delete",
        message: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [existingBookmark, onSaved]);

  const clearActionError = useCallback(() => setActionError(null), []);

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
    snapshotStatus,
    snapshotError,
    saveScreenshot,
    screenshotStatus,
    screenshotError,
    clipNote,
    clipStatus,
    clipError,
    syncToObsidian,
    obsidianStatus,
    obsidianError,
    actionError,
    setUrl,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    setSaveSnapshot,
    setSaveScreenshot,
    setClipNote,
    setSyncToObsidian,
    runAIAnalysis,
    retryAnalysis,
    applyAIRecommendedCategory,
    aiRecommendedCategory,
    save,
    deleteBookmark,
    clearActionError,
  };
}

/**
 * 剪藏分析的失败原因需要给出可操作的提示（例如模型不支持图片），
 * 其余错误沿用模型返回的原始信息。
 */
function resolveAnalysisErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = resolveClipAnalysisErrorCode(error);
  if (code) {
    return t(`ai:clipAnalysis.errors.${code}`);
  }

  return error instanceof Error ? error.message : "分析失败";
}

function shouldUseMarkdownSnapshot(
  pageContent: PageContent,
  markdown: string,
): boolean {
  if (!markdown) return false;
  return !!pageContent.isReaderable;
}

function findExistingCategoryId(
  categoryName: string,
  categories: LocalCategory[],
): string | null {
  const pathMatch = matchCategoryByPath(
    categoryName,
    flattenTree(buildCategoryTree(categories)),
  );
  if (pathMatch) return pathMatch.id;

  const nameMatch = matchCategoryByName(categoryName, categories);
  return nameMatch.matched ? nameMatch.categoryId : null;
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
      const backgroundService = getBackgroundService();
      const translatedSummary = await backgroundService.translate(
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
      const backgroundService = getBackgroundService();
      const translatedTags = await Promise.all(
        result.tags.map((tag: string) =>
          backgroundService.translate(tag, targetLang),
        ),
      );
      setTags(translatedTags);
    } else {
      setTags(result.tags);
    }
  }

  // 查找匹配的分类（仅在启用智能分类时）
  if (config.enableSmartCategory && result.category) {
    const matchedCategoryId = findExistingCategoryId(result.category, categories);
    if (matchedCategoryId) {
      setCategoryId(matchedCategoryId);
      setAiRecommendedCategory(null);
    } else {
      // 分类不在用户已有分类中，设为未分类，并记录推荐分类
      setCategoryId(null);
      setAiRecommendedCategory(result.category);
    }
  }
}
