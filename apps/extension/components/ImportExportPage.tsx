/**
 * ImportExportPage 导入导出页面
 */
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Upload,
  FileJson,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  FolderTree,
  Sparkles,
  Globe,
  BookmarkIcon,
  RefreshCw,
  Filter,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Progress,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@hamhome/ui";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { importTaskStorage } from "@/lib/storage/import-task-storage";
import { getBackgroundService } from "@/lib/services";
import { bookmarkAnalysisService } from "@/lib/agent";
import {
  useChromeBookmarks,
  ChromeBookmarkError,
} from "@/hooks/useChromeBookmarks";
import type { LocalCategory } from "@/types";
import type {
  BookmarkToImport,
  HtmlImportTask,
  ImportTaskOptions,
} from "@/lib/storage/import-task-storage";

const MAX_IMPORT_CONCURRENCY = 5;

export function ImportExportPage() {
  const { t } = useTranslation(["common", "settings"]);
  const {
    bookmarks,
    categories,
    exportData,
    refreshBookmarks,
    refreshCategories,
    pauseWatchers,
    resumeWatchers,
  } = useBookmarks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    getBookmarks: getChromeBookmarks,
    loading: loadingBrowserBookmarks,
    syncToBrowser,
    syncing: syncingToBrowser,
  } = useChromeBookmarks();

  const [importing, setImporting] = useState(false);
  const [preserveFolders, setPreserveFolders] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(false);
  const [fetchPageContent, setFetchPageContent] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    aiError?: { message: string };
  } | null>(null);

  // 同步到浏览器状态 & 选项
  const [syncUseRootFolder, setSyncUseRootFolder] = useState(true);
  const [syncClearFirst, setSyncClearFirst] = useState(false);
  const [syncSkipGlobalDuplicates, setSyncSkipGlobalDuplicates] =
    useState(true);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // 互斥处理：保留目录 vs AI 分析
  const handlePreserveFoldersChange = (checked: boolean) => {
    setPreserveFolders(checked);
    if (checked) {
      setEnableAIAnalysis(false);
      setFetchPageContent(false);
    }
  };

  const handleEnableAIAnalysisChange = (checked: boolean) => {
    setEnableAIAnalysis(checked);
    if (checked) {
      setPreserveFolders(false);
    } else {
      setFetchPageContent(false);
    }
  };

  // 将 ChromeBookmarkError code 映射到 i18n 字符串
  const resolveBookmarkError = (error: unknown): string => {
    if (error instanceof ChromeBookmarkError) {
      // 模块内定义的语义化错误 code -> i18n key
      const codeKeyMap: Record<string, string> = {
        bookmarksApiNotSupported:
          "settings.importExport.errors.bookmarksApiNotSupported",
      };
      const key = codeKeyMap[error.code];
      if (key) return t(key, { ns: "settings" });
    }
    if (error instanceof Error && error.message) return error.message;
    return t("settings.importExport.errors.unknown", { ns: "settings" });
  };

  // 同步到浏览器书签栏
  const handleSyncToBrowser = async () => {
    setSyncResult(null);
    setSyncProgress(null);

    try {
      const result = await syncToBrowser({
        categories,
        bookmarks,
        useRootFolder: syncUseRootFolder,
        clearFirst: syncClearFirst,
        skipGlobalDuplicates: syncSkipGlobalDuplicates,
        onProgress: (current, total) => {
          setSyncProgress(total > 0 ? { current, total } : null);
        },
      });

      setSyncResult({
        success: true,
        message: t("settings.importExport.syncBrowser.syncSuccess", {
          ns: "settings",
        }),
        details: t("settings.importExport.syncBrowser.syncDetails", {
          created: result.created,
          skipped: result.skipped,
          ns: "settings",
        }),
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: t("settings.importExport.syncBrowser.syncFailed", {
          ns: "settings",
        }),
        details: resolveBookmarkError(error),
      });
    } finally {
      setSyncProgress(null);
    }
  };

  // 导出 JSON
  const handleExportJSON = () => {
    exportData("json");
  };

  // 导出 HTML
  const handleExportHTML = () => {
    exportData("html");
  };

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 页面刷新后自动恢复未完成的 HTML 导入任务
  useEffect(() => {
    const resumePendingTask = async () => {
      const task = await importTaskStorage.getHtmlTask();
      if (!task) {
        return;
      }

      if (task.progress.status === "failed") {
        await importTaskStorage.clearHtmlTask();
        return;
      }

      if (task.progress.status !== "running") {
        return;
      }

      // 同步 UI 选项到任务快照，避免续跑时选项漂移
      setPreserveFolders(task.payload.options.preserveFolders);
      setEnableAIAnalysis(task.payload.options.enableAIAnalysis);
      setFetchPageContent(task.payload.options.fetchPageContent);

      setImporting(true);
      setImportResult(null);

      // 暂停 watcher，避免每条写入都触发全量刷新
      pauseWatchers();

      try {
        await runHtmlImportTask(task);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : t("settings.importExport.errors.unknown", { ns: "settings" });

        await importTaskStorage.markHtmlTaskFailed(errorMessage);
        setImportResult({
          success: false,
          message: t("settings.importExport.importFailed", { ns: "settings" }),
          details: errorMessage,
          aiError: task.progress.aiError
            ? { message: task.progress.aiError }
            : undefined,
        });
      } finally {
        // 恢复 watcher 并统一刷新一次
        resumeWatchers();
        await refreshBookmarks();
        await refreshCategories();
        setImporting(false);
      }
    };

    void resumePendingTask();
  }, []);

  // 处理文件导入
  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    // 暂停 watcher，避免每条写入都触发全量刷新
    pauseWatchers();

    try {
      const content = await file.text();

      if (file.name.endsWith(".json")) {
        await importFromJSON(content);
      } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        await importFromHTML(content, "file");
      } else {
        throw new Error(
          t("settings.importExport.errors.unsupportedFormat", {
            ns: "settings",
          }),
        );
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: t("settings.importExport.importFailed", { ns: "settings" }),
        details: resolveBookmarkError(error),
      });
    } finally {
      // 恢复 watcher 并统一刷新一次
      resumeWatchers();
      await refreshBookmarks();
      await refreshCategories();
      setImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 从浏览器导入
  const handleBrowserImport = async () => {
    setImporting(true);
    setImportResult(null);

    // 暂停 watcher，避免每条写入都触发全量刷新
    pauseWatchers();

    try {
      const { html } = await getChromeBookmarks();

      // 使用现有的 HTML 导入逻辑
      await importFromHTML(html, "browser");
    } catch (error) {
      setImportResult({
        success: false,
        message: t("settings.importExport.importFailed", { ns: "settings" }),
        details:
          error instanceof Error
            ? error.message
            : t("settings.importExport.errors.unknown", { ns: "settings" }),
      });
    } finally {
      // 恢复 watcher 并统一刷新一次
      resumeWatchers();
      await refreshBookmarks();
      await refreshCategories();
      setImporting(false);
    }
  };

  // 从 JSON 导入
  const importFromJSON = async (content: string) => {
    const data = JSON.parse(content);

    let categoriesCreated = 0;

    // 原始 ID -> 新 ID 的映射表
    const categoryIdMap = new Map<string, string>();

    // 获取现有分类（只读一次，后续用内存缓存）
    let allCategories = await bookmarkStorage.getCategories();
    for (const cat of allCategories) {
      categoryIdMap.set(cat.id, cat.id);
    }

    // 导入分类（需要按层级顺序处理，先处理根分类再处理子分类）
    if (data.categories && Array.isArray(data.categories)) {
      const sortedCategories = [...data.categories].sort((a, b) => {
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        return 0;
      });

      const pending = [...sortedCategories];
      const maxRounds = 10;
      let round = 0;

      while (pending.length > 0 && round < maxRounds) {
        round++;
        const stillPending: typeof pending = [];

        for (const cat of pending) {
          try {
            const newParentId = cat.parentId
              ? (categoryIdMap.get(cat.parentId) ?? null)
              : null;

            if (cat.parentId && !categoryIdMap.has(cat.parentId)) {
              stillPending.push(cat);
              continue;
            }

            // 使用内存中的 allCategories 检查，不再每次读取存储
            const existing = allCategories.find(
              (c) => c.name === cat.name && c.parentId === newParentId,
            );

            if (existing) {
              categoryIdMap.set(cat.id, existing.id);
            } else {
              const newCategory = await bookmarkStorage.createCategory(
                cat.name,
                newParentId,
              );
              categoryIdMap.set(cat.id, newCategory.id);
              allCategories = [...allCategories, newCategory];
              categoriesCreated++;
            }
          } catch {
            // 创建失败，刷新分类缓存后重试查找
            allCategories = await bookmarkStorage.getCategories();
            const newParentId = cat.parentId
              ? (categoryIdMap.get(cat.parentId) ?? null)
              : null;
            const existing = allCategories.find(
              (c) => c.name === cat.name && c.parentId === newParentId,
            );
            if (existing) {
              categoryIdMap.set(cat.id, existing.id);
            }
          }
        }

        pending.length = 0;
        pending.push(...stillPending);
      }
    }

    // 使用批量 API 导入书签（一次性读写，避免 O(N²)）
    let imported = 0;
    let skipped = 0;
    const importedBookmarkIds: string[] = [];

    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      const bookmarkInputs = data.bookmarks.map(
        (bm: {
          url: string;
          title: string;
          description?: string;
          summary?: string;
          categoryId?: string;
          tags?: string[];
          favicon?: string;
        }) => {
          const newCategoryId = bm.categoryId
            ? (categoryIdMap.get(bm.categoryId) ?? null)
            : null;
          return {
            url: bm.url,
            title: bm.title,
            description: bm.description || bm.summary || "",
            categoryId: newCategoryId,
            tags: bm.tags || [],
            favicon: bm.favicon || "",
            hasSnapshot: false,
          };
        },
      );

      const created = await bookmarkStorage.createBookmarks(bookmarkInputs);
      imported = created.length;
      skipped = data.bookmarks.length - created.length;
      importedBookmarkIds.push(...created.map((b) => b.id));
    }

    // 批量添加 embedding 任务（在 background 中执行）
    if (importedBookmarkIds.length > 0) {
      try {
        const bgService = getBackgroundService();
        await bgService.queueBookmarksEmbedding(importedBookmarkIds);
      } catch (e) {
        console.warn("[ImportExport] Failed to queue embeddings:", e);
      }
    }

    // 构建结果详情
    let details = t("settings.importExport.importDetails", {
      imported,
      skipped,
      ns: "settings",
    });
    if (categoriesCreated > 0) {
      details = t("settings.importExport.importDetailsWithCategories", {
        imported,
        skipped,
        categoriesCreated,
        ns: "settings",
      });
    }

    setImportResult({
      success: true,
      message: t("settings.importExport.importSuccess", { ns: "settings" }),
      details,
    });
  };

  // AI 分析书签
  const analyzeBookmarkWithAI = async (
    url: string,
    title: string,
    currentCategories: LocalCategory[],
    existingTags: string[] = [],
    shouldFetchPageContent = false,
  ): Promise<{
    description: string;
    categoryId: string | null;
    tags: string[];
    newCategories: LocalCategory[];
  }> => {
    const aiStart = performance.now();
    try {
      const result = await bookmarkAnalysisService.analyzeBookmarkForLibrary({
        url,
        title,
        currentCategories,
        existingTags,
        shouldFetchPageContent,
      });

      console.log(
        `[ImportExport][Perf] analyzeBookmarkWithAI total(${url}): ${(performance.now() - aiStart).toFixed(1)}ms`,
      );
      return result;
    } catch (err) {
      console.error("[ImportExport] AI analysis failed:", err);
      console.log(
        `[ImportExport][Perf] analyzeBookmarkWithAI FAILED(${url}): ${(performance.now() - aiStart).toFixed(1)}ms`,
      );
      // 重新抛出，让 runHtmlImportTask 捕获
      throw err;
    }
  };

  // 安全获取 hostname
  const safeGetHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  };

  const buildHTMLImportDetails = (
    stats: {
      imported: number;
      skipped: number;
      duplicateSkipped: number;
      categoriesCreated: number;
      aiProcessed: number;
    },
    options: ImportTaskOptions,
  ) => {
    const totalSkipped = stats.skipped + stats.duplicateSkipped;

    let details: string;
    if (options.preserveFolders && stats.categoriesCreated > 0) {
      details = t("settings.importExport.importDetailsWithCategories", {
        imported: stats.imported,
        skipped: totalSkipped,
        categoriesCreated: stats.categoriesCreated,
        ns: "settings",
      });
    } else if (options.enableAIAnalysis && stats.aiProcessed > 0) {
      if (stats.categoriesCreated > 0) {
        details = t("settings.importExport.importDetailsWithAIAndCategories", {
          imported: stats.imported,
          skipped: totalSkipped,
          aiProcessed: stats.aiProcessed,
          categoriesCreated: stats.categoriesCreated,
          ns: "settings",
        });
      } else {
        details = t("settings.importExport.importDetailsWithAI", {
          imported: stats.imported,
          skipped: totalSkipped,
          aiProcessed: stats.aiProcessed,
          ns: "settings",
        });
      }
    } else {
      details = t("settings.importExport.importDetails", {
        imported: stats.imported,
        skipped: totalSkipped,
        ns: "settings",
      });
    }

    if (stats.skipped > 0) {
      details += ` (${t("settings.importExport.importErrorSkipped", { count: stats.skipped, ns: "settings" })})`;
    }

    return details;
  };

  const collectHTMLBookmarks = async (
    doc: Document,
    options: ImportTaskOptions,
  ): Promise<{
    bookmarksToImport: BookmarkToImport[];
    categoriesCreated: number;
  }> => {
    let categoriesCreated = 0;
    let allCategories = await bookmarkStorage.getCategories();

    // 分类名称到 ID 的映射（用于处理重复名称）
    const categoryMap = new Map<string, string>();
    for (const cat of allCategories) {
      const key = `${cat.parentId || "root"}|${cat.name}`;
      categoryMap.set(key, cat.id);
    }

    const bookmarksToImport: BookmarkToImport[] = [];

    // 递归解析 DL 结构，收集书签
    const collectBookmarks = async (
      dl: Element,
      parentCategoryId: string | null,
    ): Promise<void> => {
      const children = dl.children;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.tagName !== "DT") {
          continue;
        }

        const h3 = child.querySelector(":scope > H3");
        const nestedDl = child.querySelector(":scope > DL");

        if (h3 && nestedDl && options.preserveFolders) {
          const folderName = h3.textContent?.trim() || "未命名文件夹";
          const mapKey = `${parentCategoryId || "root"}|${folderName}`;

          let categoryId = categoryMap.get(mapKey);

          if (!categoryId) {
            try {
              const newCategory = await bookmarkStorage.createCategory(
                folderName,
                parentCategoryId,
              );
              categoryId = newCategory.id;
              categoryMap.set(mapKey, categoryId);
              categoriesCreated++;
              allCategories = [...allCategories, newCategory];
            } catch {
              const existing = allCategories.find(
                (c) => c.name === folderName && c.parentId === parentCategoryId,
              );
              if (existing) {
                categoryId = existing.id;
                categoryMap.set(mapKey, categoryId);
              }
            }
          }

          await collectBookmarks(nestedDl, categoryId || null);
          continue;
        }

        const link = child.querySelector(":scope > A");
        if (link) {
          const url = link.getAttribute("href");
          const title = link.textContent?.trim();

          if (url && title && url.startsWith("http")) {
            bookmarksToImport.push({
              url,
              title,
              parentCategoryId: options.preserveFolders
                ? parentCategoryId
                : null,
            });
          }
        }

        if (!options.preserveFolders && nestedDl) {
          await collectBookmarks(nestedDl, null);
        }
      }
    };

    const rootDl = doc.querySelector("DL");
    if (rootDl) {
      await collectBookmarks(rootDl, null);
    }

    return { bookmarksToImport, categoriesCreated };
  };

  const runHtmlImportTask = async (task: HtmlImportTask) => {
    const taskStart = performance.now();
    console.log(
      `[ImportExport][Perf] === Import task started === total: ${task.payload.total}, options:`,
      task.payload.options,
    );

    const options = task.payload.options;
    const total = task.payload.total;

    let currentIndex = task.progress.currentIndex;
    let imported = task.progress.imported;
    let skipped = task.progress.skipped;
    let duplicateSkipped = task.progress.duplicateSkipped;
    let categoriesCreated = task.progress.categoriesCreated;
    let aiProcessed = task.progress.aiProcessed;
    const importedBookmarkIds = [...task.progress.importedBookmarkIds];
    let firstAiError: string | null = null;

    let tInit = performance.now();
    let allCategories = await bookmarkStorage.getCategories();
    console.log(
      `[ImportExport][Perf] getCategories: ${(performance.now() - tInit).toFixed(1)}ms, count=${allCategories.length}`,
    );

    tInit = performance.now();
    let existingTags = await bookmarkStorage.getAllTags();
    console.log(
      `[ImportExport][Perf] getAllTags: ${(performance.now() - tInit).toFixed(1)}ms, count=${existingTags.length}`,
    );

    // 预加载已有 normalized URL 集合，避免每条书签都调用 getBookmarkByUrl 读取全量数据
    tInit = performance.now();
    const existingNormalizedUrls = await bookmarkStorage.getExistingUrls();
    console.log(
      `[ImportExport][Perf] getExistingUrls: ${(performance.now() - tInit).toFixed(1)}ms, count=${existingNormalizedUrls.size}`,
    );

    if (total > 0) {
      setImportProgress({ current: currentIndex, total });
    } else {
      setImportProgress(null);
    }

    const persistProgress = async () => {
      try {
        await importTaskStorage.updateHtmlProgress((progress) => ({
          ...progress,
          currentIndex,
          imported,
          skipped,
          duplicateSkipped,
          categoriesCreated,
          aiProcessed,
          importedBookmarkIds: [...importedBookmarkIds],
          aiError: firstAiError || undefined,
        }));
      } catch (error) {
        console.warn(
          "[ImportExport] Failed to persist import progress:",
          error,
        );
      }
    };

    // 使用较大的批次进行批量写入，避免并发 createBookmark 导致写覆盖丢数据
    const BATCH_SIZE = options.enableAIAnalysis ? MAX_IMPORT_CONCURRENCY : 200;

    let batchIndex = 0;
    for (
      let batchStart = currentIndex;
      batchStart < task.payload.bookmarksToImport.length;
      batchStart += BATCH_SIZE
    ) {
      batchIndex++;
      const batchLoopStart = performance.now();
      const batch = task.payload.bookmarksToImport.slice(
        batchStart,
        batchStart + BATCH_SIZE,
      );
      const tagsSnapshot = [...existingTags];

      // 第一步：预处理每条书签
      type PreprocessedBookmark = {
        bm: BookmarkToImport;
        status: "ready" | "duplicate";
        description: string;
        categoryId: string | null;
        tags: string[];
        aiProcessed: number;
        newCategories: LocalCategory[];
        error?: unknown;
      };

      // AI 模式下串行预处理：每处理一条书签后立即将新分类合并回 allCategories，
      // 确保下一条书签的 AI 分析能感知到已创建的分类，避免并发竞态导致重复
      // 创建失败后 categoryId=null 的问题。
      let preprocessed: PreprocessedBookmark[];
      const preprocessStart = performance.now();
      if (options.enableAIAnalysis && !options.preserveFolders) {
        preprocessed = [];
        for (const bm of batch) {
          // 用 normalized URL 去重
          const normalizedUrl = bookmarkStorage.normalizeUrlPublic(bm.url);
          if (existingNormalizedUrls.has(normalizedUrl)) {
            preprocessed.push({
              bm,
              status: "duplicate",
              description: "",
              categoryId: null,
              tags: [],
              aiProcessed: 0,
              newCategories: [],
            });
            continue;
          }

          let description = "";
          let categoryId: string | null = bm.parentCategoryId;
          let tags: string[] = [];
          let aiProcessedCount = 0;
          let newCategories: LocalCategory[] = [];

          try {
            // 传入当前最新的 allCategories，确保能感知到本批次已创建的分类
            const aiResult = await analyzeBookmarkWithAI(
              bm.url,
              bm.title,
              allCategories,
              tagsSnapshot,
              options.fetchPageContent,
            );
            description = aiResult.description;
            categoryId = aiResult.categoryId;
            tags = aiResult.tags;
            newCategories = aiResult.newCategories;
            aiProcessedCount = 1;

            // 立即将新分类合并，供后续书签的 AI 分析使用
            if (newCategories.length > 0) {
              const knownIds = new Set(allCategories.map((c) => c.id));
              for (const cat of newCategories) {
                if (!knownIds.has(cat.id)) {
                  allCategories = [...allCategories, cat];
                }
              }
            }
          } catch (err) {
            // AI 分析失败记录一次错误原因，但不阻断导入
            if (!firstAiError) {
              firstAiError = err instanceof Error ? err.message : String(err);
            }
          }

          preprocessed.push({
            bm,
            status: "ready",
            description,
            categoryId,
            tags,
            aiProcessed: aiProcessedCount,
            newCategories,
          });
        }
      } else {
        preprocessed = batch.map((bm) => {
          const normalizedUrl = bookmarkStorage.normalizeUrlPublic(bm.url);
          if (existingNormalizedUrls.has(normalizedUrl)) {
            return {
              bm,
              status: "duplicate" as const,
              description: "",
              categoryId: null,
              tags: [],
              aiProcessed: 0,
              newCategories: [],
            };
          }
          return {
            bm,
            status: "ready" as const,
            description: "",
            categoryId: bm.parentCategoryId,
            tags: [],
            aiProcessed: 0,
            newCategories: [],
          };
        });
      }
      const preprocessTime = performance.now() - preprocessStart;
      const readyCount = preprocessed.filter(
        (p) => p.status === "ready",
      ).length;
      const dupCount = preprocessed.filter(
        (p) => p.status === "duplicate",
      ).length;
      console.log(
        `[ImportExport][Perf] Batch#${batchIndex} preprocess: ${preprocessTime.toFixed(1)}ms, ready=${readyCount}, duplicate=${dupCount}`,
      );

      // 第二步：收集需要写入的书签，一次性批量创建
      const readyItems = preprocessed.filter((p) => p.status === "ready");
      const bookmarkInputs = readyItems.map((p) => {
        const hostname = safeGetHostname(p.bm.url);
        const favicon = hostname
          ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
          : "";
        return {
          url: p.bm.url,
          title: p.bm.title,
          description: p.description,
          categoryId: p.categoryId,
          tags: p.tags,
          favicon,
          hasSnapshot: false,
        };
      });

      const tWrite = performance.now();
      const created = await bookmarkStorage.createBookmarks(bookmarkInputs);
      console.log(
        `[ImportExport][Perf] Batch#${batchIndex} createBookmarks: ${(performance.now() - tWrite).toFixed(1)}ms, input=${bookmarkInputs.length}, created=${created.length}`,
      );

      // 第三步：统计结果
      const knownCategoryIds = new Set(allCategories.map((c) => c.id));
      const knownTags = new Set(existingTags);

      // 将已创建的 URL 加入去重集合（使用 normalized URL）
      for (const bm of created) {
        existingNormalizedUrls.add(bookmarkStorage.normalizeUrlPublic(bm.url));
        importedBookmarkIds.push(bm.id);
      }
      imported += created.length;
      // readyItems 中未成功创建的（被 createBookmarks 的内部去重跳过）
      skipped += readyItems.length - created.length;

      for (const p of preprocessed) {
        aiProcessed += p.aiProcessed;

        if (p.status === "duplicate") {
          duplicateSkipped++;
        }

        for (const category of p.newCategories) {
          if (!knownCategoryIds.has(category.id)) {
            knownCategoryIds.add(category.id);
            allCategories = [...allCategories, category];
            categoriesCreated++;
          }
        }

        for (const tag of p.tags) {
          knownTags.add(tag);
        }
      }

      existingTags = Array.from(knownTags);
      currentIndex = batchStart + batch.length;
      setImportProgress({ current: currentIndex, total });

      const tPersist = performance.now();
      await persistProgress();
      console.log(
        `[ImportExport][Perf] Batch#${batchIndex} persistProgress: ${(performance.now() - tPersist).toFixed(1)}ms`,
      );
      console.log(
        `[ImportExport][Perf] Batch#${batchIndex} total: ${(performance.now() - batchLoopStart).toFixed(1)}ms`,
      );
    }

    setImportProgress(null);

    // 批量添加 embedding 任务（在 background 中执行）
    if (importedBookmarkIds.length > 0) {
      try {
        const tEmbed = performance.now();
        const bgService = getBackgroundService();
        await bgService.queueBookmarksEmbedding(importedBookmarkIds);
        console.log(
          `[ImportExport][Perf] queueBookmarksEmbedding: ${(performance.now() - tEmbed).toFixed(1)}ms, count=${importedBookmarkIds.length}`,
        );
      } catch (e) {
        console.warn("[ImportExport] Failed to queue embeddings:", e);
      }
    }

    const tClear = performance.now();
    await importTaskStorage.clearHtmlTask();
    console.log(
      `[ImportExport][Perf] clearHtmlTask: ${(performance.now() - tClear).toFixed(1)}ms`,
    );
    console.log(
      `[ImportExport][Perf] === Import task completed === total time: ${(performance.now() - taskStart).toFixed(1)}ms, imported=${imported}, skipped=${skipped}, duplicateSkipped=${duplicateSkipped}`,
    );

    setImportResult({
      success: true,
      message: t("settings.importExport.importSuccess", { ns: "settings" }),
      details: buildHTMLImportDetails(
        { imported, skipped, duplicateSkipped, categoriesCreated, aiProcessed },
        options,
      ),
      aiError: firstAiError ? { message: firstAiError } : undefined,
    });
  };

  // 从 HTML 导入（浏览器书签格式）
  const importFromHTML = async (
    content: string,
    source: "file" | "browser",
  ) => {
    const options: ImportTaskOptions = {
      preserveFolders,
      enableAIAnalysis,
      fetchPageContent,
    };

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const { bookmarksToImport, categoriesCreated } = await collectHTMLBookmarks(
      doc,
      options,
    );

    // 新任务开始前清理旧任务，避免跨任务污染
    await importTaskStorage.clearHtmlTask();
    const task = await importTaskStorage.createHtmlTask({
      source,
      options,
      bookmarksToImport,
      categoriesCreated,
    });

    try {
      await runHtmlImportTask(task);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("settings.importExport.errors.unknown", { ns: "settings" });
      await importTaskStorage.markHtmlTaskFailed(errorMessage);
      throw error;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* 导出 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t("settings.importExport.export.title", { ns: "settings" })}
            </CardTitle>
          </div>
          <CardDescription>
            {t("settings.importExport.export.description", { ns: "settings" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportJSON}
              className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileJson className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t("settings.importExport.export.jsonFormat", {
                      ns: "settings",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.importExport.export.jsonSubtitle", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("settings.importExport.export.jsonDesc", { ns: "settings" })}
              </p>
            </button>

            <button
              onClick={handleExportHTML}
              className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t("settings.importExport.export.htmlFormat", {
                      ns: "settings",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.importExport.export.htmlSubtitle", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("settings.importExport.export.htmlDesc", { ns: "settings" })}
              </p>
            </button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            {t("settings.importExport.export.currentStats", {
              bookmarkCount: bookmarks.length,
              categoryCount: categories.length,
              ns: "settings",
            })}
          </div>
        </CardContent>
      </Card>

      {/* 导入 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t("settings.importExport.import.title", { ns: "settings" })}
            </CardTitle>
          </div>
          <CardDescription>
            {t("settings.importExport.import.description", { ns: "settings" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.html,.htm"
            onChange={handleFileImport}
            className="hidden"
          />

          {/* 导入选项 */}
          <div className="mb-4 space-y-3">
            {/* 保留目录结构选项 */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="preserve-folders"
                  checked={preserveFolders}
                  onCheckedChange={(checked) =>
                    handlePreserveFoldersChange(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="preserve-folders"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    {t("settings.importExport.import.preserveFolders", {
                      ns: "settings",
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.importExport.import.preserveFoldersDesc", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* AI 分类打标选项 */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="enable-ai-analysis"
                  checked={enableAIAnalysis}
                  onCheckedChange={(checked) =>
                    handleEnableAIAnalysisChange(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="enable-ai-analysis"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {t("settings.importExport.import.enableAIAnalysis", {
                      ns: "settings",
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.importExport.import.enableAIAnalysisDesc", {
                      ns: "settings",
                    })}
                  </p>

                  {/* 子配置：获取页面内容 */}
                  {enableAIAnalysis && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="fetch-page-content"
                          checked={fetchPageContent}
                          onCheckedChange={(checked) =>
                            setFetchPageContent(checked === true)
                          }
                        />
                        <div>
                          <Label
                            htmlFor="fetch-page-content"
                            className="text-sm cursor-pointer flex items-center gap-2"
                          >
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {t(
                              "settings.importExport.import.fetchPageContent",
                              { ns: "settings" },
                            )}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(
                              "settings.importExport.import.fetchPageContentDesc",
                              { ns: "settings" },
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 导入来源选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 从文件导入 */}
            <button
              onClick={triggerFileInput}
              disabled={importing}
              className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t("settings.importExport.import.selectFile", {
                      ns: "settings",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.importExport.import.supportedFormats", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </button>

            {/* 从浏览器导入 */}
            <button
              onClick={handleBrowserImport}
              disabled={importing || loadingBrowserBookmarks}
              className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <BookmarkIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t("settings.importExport.import.fromBrowser", {
                      ns: "settings",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.importExport.import.fromBrowserDesc", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* 导入进度 */}
          {importing && importProgress && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm font-medium">
                  {t("settings.importExport.import.importing", {
                    ns: "settings",
                  })}
                </span>
              </div>
              <Progress
                value={(importProgress.current / importProgress.total) * 100}
                className="h-2"
              />
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t("settings.importExport.import.progress", {
                  current: importProgress.current,
                  total: importProgress.total,
                  ns: "settings",
                })}
              </p>
            </div>
          )}

          {/* 仅加载状态（无导入进度时） */}
          {importing && !importProgress && (
            <div className="p-4 rounded-lg bg-muted flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                {t("settings.importExport.import.importing", {
                  ns: "settings",
                })}
              </span>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                importResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200"
                  : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
              }`}
            >
              {importResult.success ? (
                <Check className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{importResult.message}</p>
                {importResult.details && (
                  <p className="text-sm opacity-80 mt-1">
                    {importResult.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* AI 错误提示 */}
          {importResult && importResult.aiError && (
            <div className="mt-4 p-4 rounded-lg flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50">
              <Sparkles className="h-5 w-5 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">
                  {t("settings.importExport.aiErrorTitle", { ns: "settings" })}
                </p>
                <p className="text-xs opacity-90 mt-1 break-all">
                  {importResult.aiError.message}
                </p>
                <p className="text-[10px] opacity-70 mt-2 italic">
                  {t("settings.importExport.aiErrorDesc", { ns: "settings" })}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <strong className="text-foreground">
              {t("settings.importExport.import.formatLabel", {
                ns: "settings",
              })}
            </strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                {t("settings.importExport.import.formatJSON", {
                  ns: "settings",
                })}
              </li>
              <li>
                {t("settings.importExport.import.formatHTML", {
                  ns: "settings",
                })}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      {/* 同步到浏览器书签栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t("settings.importExport.syncBrowser.title", { ns: "settings" })}
            </CardTitle>
          </div>
          <CardDescription>
            {t("settings.importExport.syncBrowser.description", {
              ns: "settings",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 同步选项 */}
          <div className="mb-4 space-y-3">
            {/* 选项1：是否使用顶层 HamHome 目录 */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sync-use-root-folder"
                  checked={syncUseRootFolder}
                  onCheckedChange={(checked) =>
                    setSyncUseRootFolder(checked === true)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="sync-use-root-folder"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      {t("settings.importExport.syncBrowser.useRootFolder", {
                        ns: "settings",
                      })}
                    </Label>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </HoverCardTrigger>
                      <HoverCardContent
                        align="start"
                        sideOffset={8}
                        className="w-[300px] p-0"
                      >
                        {/* hover 示例说明 */}
                        <div className="p-3 bg-muted/90 text-xs text-muted-foreground font-mono leading-relaxed max-w-none">
                          {syncUseRootFolder ? (
                            <span>
                              📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleBarLabel",
                                { ns: "settings" },
                              )}
                              <br />
                              &nbsp;&nbsp;└📁 HamHome
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleCat1",
                                {
                                  ns: "settings",
                                },
                              )}
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;└🔖 ...
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleCat2",
                                {
                                  ns: "settings",
                                },
                              )}
                            </span>
                          ) : (
                            <span>
                              📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleBarLabel",
                                { ns: "settings" },
                              )}
                              <br />
                              &nbsp;&nbsp;├📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleCat1",
                                {
                                  ns: "settings",
                                },
                              )}
                              <br />
                              &nbsp;&nbsp;│&nbsp;&nbsp;└🔖 ...
                              <br />
                              &nbsp;&nbsp;└📁{" "}
                              {t(
                                "settings.importExport.syncBrowser.exampleCat2",
                                {
                                  ns: "settings",
                                },
                              )}
                            </span>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.importExport.syncBrowser.useRootFolderDesc", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* 选项2：是否清空原有书签覆盖 */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sync-clear-first"
                  checked={syncClearFirst}
                  onCheckedChange={(checked) =>
                    setSyncClearFirst(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="sync-clear-first"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    {t("settings.importExport.syncBrowser.clearFirst", {
                      ns: "settings",
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.importExport.syncBrowser.clearFirstDesc", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* 选项3：全局去重（自动跳过重复书签） */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sync-skip-duplicates"
                  checked={syncSkipGlobalDuplicates}
                  onCheckedChange={(checked) =>
                    setSyncSkipGlobalDuplicates(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="sync-skip-duplicates"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4 text-emerald-500" />
                    {t("settings.importExport.syncBrowser.skipDuplicates", {
                      ns: "settings",
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.importExport.syncBrowser.skipDuplicatesDesc", {
                      ns: "settings",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSyncToBrowser}
            disabled={syncingToBrowser || bookmarks.length === 0}
            className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                {syncingToBrowser ? (
                  <Loader2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                ) : (
                  <RefreshCw className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {syncingToBrowser
                    ? t("settings.importExport.syncBrowser.syncing", {
                        ns: "settings",
                      })
                    : t("settings.importExport.syncBrowser.action", {
                        ns: "settings",
                      })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("settings.importExport.syncBrowser.subtitle", {
                    bookmarkCount: bookmarks.length,
                    categoryCount: categories.length,
                    ns: "settings",
                  })}
                </p>
              </div>
            </div>
          </button>

          {/* 同步进度 */}
          {syncingToBrowser && syncProgress && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm font-medium">
                  {t("settings.importExport.syncBrowser.syncing", {
                    ns: "settings",
                  })}
                </span>
              </div>
              <Progress
                value={(syncProgress.current / syncProgress.total) * 100}
                className="h-2"
              />
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t("settings.importExport.import.progress", {
                  current: syncProgress.current,
                  total: syncProgress.total,
                  ns: "settings",
                })}
              </p>
            </div>
          )}

          {/* 同步结果 */}
          {syncResult && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                syncResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200"
                  : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
              }`}
            >
              {syncResult.success ? (
                <Check className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{syncResult.message}</p>
                {syncResult.details && (
                  <p className="text-sm opacity-80 mt-1">
                    {syncResult.details}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
