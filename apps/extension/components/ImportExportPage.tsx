/**
 * ImportExportPage 导入导出页面
 */
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileJson, FileText, Check, AlertCircle, Loader2, FolderTree, Sparkles, Globe, BookmarkIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Progress,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { importTaskStorage } from '@/lib/storage/import-task-storage';
import { getBackgroundService } from '@/lib/services';
import { aiClient } from '@/lib/ai/client';
import { parseCategoryPath } from './common/CategoryTree';
import { useChromeBookmarks } from '@/hooks/useChromeBookmarks';
import type { LocalCategory } from '@/types';
import type { BookmarkToImport, HtmlImportTask, ImportTaskOptions } from '@/lib/storage/import-task-storage';

const MAX_IMPORT_CONCURRENCY = 5;

export function ImportExportPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { bookmarks, categories, exportData, refreshBookmarks, refreshCategories, pauseWatchers, resumeWatchers } = useBookmarks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getBookmarks: getChromeBookmarks, loading: loadingBrowserBookmarks } = useChromeBookmarks();
  
  const [importing, setImporting] = useState(false);
  const [preserveFolders, setPreserveFolders] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(false);
  const [fetchPageContent, setFetchPageContent] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{
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

  // 导出 JSON
  const handleExportJSON = () => {
    exportData('json');
  };

  // 导出 HTML
  const handleExportHTML = () => {
    exportData('html');
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

      if (task.progress.status === 'failed') {
        await importTaskStorage.clearHtmlTask();
        return;
      }

      if (task.progress.status !== 'running') {
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
        const errorMessage = error instanceof Error
          ? error.message
          : t('settings.importExport.errors.unknown', { ns: 'settings' });

        await importTaskStorage.markHtmlTaskFailed(errorMessage);
        setImportResult({
          success: false,
          message: t('settings.importExport.importFailed', { ns: 'settings' }),
          details: errorMessage,
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
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    // 暂停 watcher，避免每条写入都触发全量刷新
    pauseWatchers();

    try {
      const content = await file.text();

      if (file.name.endsWith('.json')) {
        await importFromJSON(content);
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        await importFromHTML(content, 'file');
      } else {
        throw new Error(t('settings.importExport.errors.unsupportedFormat', { ns: 'settings' }));
      }

    } catch (error) {
      setImportResult({
        success: false,
        message: t('settings.importExport.importFailed', { ns: 'settings' }),
        details: error instanceof Error ? error.message : t('settings.importExport.errors.unknown', { ns: 'settings' }),
      });
    } finally {
      // 恢复 watcher 并统一刷新一次
      resumeWatchers();
      await refreshBookmarks();
      await refreshCategories();
      setImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
      await importFromHTML(html, 'browser');

    } catch (error) {
      setImportResult({
        success: false,
        message: t('settings.importExport.importFailed', { ns: 'settings' }),
        details: error instanceof Error ? error.message : t('settings.importExport.errors.unknown', { ns: 'settings' }),
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
            const newParentId = cat.parentId ? (categoryIdMap.get(cat.parentId) ?? null) : null;

            if (cat.parentId && !categoryIdMap.has(cat.parentId)) {
              stillPending.push(cat);
              continue;
            }

            // 使用内存中的 allCategories 检查，不再每次读取存储
            const existing = allCategories.find(
              c => c.name === cat.name && c.parentId === newParentId
            );

            if (existing) {
              categoryIdMap.set(cat.id, existing.id);
            } else {
              const newCategory = await bookmarkStorage.createCategory(cat.name, newParentId);
              categoryIdMap.set(cat.id, newCategory.id);
              allCategories = [...allCategories, newCategory];
              categoriesCreated++;
            }
          } catch {
            // 创建失败，刷新分类缓存后重试查找
            allCategories = await bookmarkStorage.getCategories();
            const newParentId = cat.parentId ? (categoryIdMap.get(cat.parentId) ?? null) : null;
            const existing = allCategories.find(
              c => c.name === cat.name && c.parentId === newParentId
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
      const bookmarkInputs = data.bookmarks.map((bm: { url: string; title: string; description?: string; summary?: string; categoryId?: string; tags?: string[]; favicon?: string }) => {
        const newCategoryId = bm.categoryId ? (categoryIdMap.get(bm.categoryId) ?? null) : null;
        return {
          url: bm.url,
          title: bm.title,
          description: bm.description || bm.summary || '',
          categoryId: newCategoryId,
          tags: bm.tags || [],
          favicon: bm.favicon || '',
          hasSnapshot: false,
        };
      });

      const created = await bookmarkStorage.createBookmarks(bookmarkInputs);
      imported = created.length;
      skipped = data.bookmarks.length - created.length;
      importedBookmarkIds.push(...created.map(b => b.id));
    }

    // 批量添加 embedding 任务（在 background 中执行）
    if (importedBookmarkIds.length > 0) {
      try {
        const bgService = getBackgroundService();
        await bgService.queueBookmarksEmbedding(importedBookmarkIds);
      } catch (e) {
        console.warn('[ImportExport] Failed to queue embeddings:', e);
      }
    }

    // 构建结果详情
    let details = t('settings.importExport.importDetails', { imported, skipped, ns: 'settings' });
    if (categoriesCreated > 0) {
      details = t('settings.importExport.importDetailsWithCategories', { imported, skipped, categoriesCreated, ns: 'settings' });
    }

    setImportResult({
      success: true,
      message: t('settings.importExport.importSuccess', { ns: 'settings' }),
      details,
    });
  };

  // 获取页面内容用于 AI 分析
  const fetchPageContentForAI = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'text/html' },
        signal: AbortSignal.timeout(10000), // 10秒超时
      });
      if (!response.ok) return '';
      const html = await response.text();
      // 简单提取文本内容
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // 移除 script 和 style
      doc.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
      const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
      return text.slice(0, 5000); // 限制长度
    } catch {
      return '';
    }
  };

  // 匹配分类（精确 + 模糊，优先叶子节点）
  const matchCategoryByName = (
    categoryName: string,
    categories: LocalCategory[]
  ): { matched: boolean; categoryId: string | null } => {
    const searchName = categoryName.toLowerCase();
    
    // 判断是否为叶子节点（没有子分类）
    const parentIds = new Set(categories.map(c => c.parentId).filter(Boolean));
    const isLeaf = (c: LocalCategory) => !parentIds.has(c.id);
    
    // 精确匹配 - 优先叶子节点
    const exactMatches = categories.filter(c => c.name.toLowerCase() === searchName);
    if (exactMatches.length > 0) {
      const leafMatch = exactMatches.find(isLeaf);
      return { matched: true, categoryId: (leafMatch || exactMatches[0]).id };
    }

    // 模糊匹配 - 优先叶子节点
    const fuzzyMatches = categories.filter(
      c => c.name.toLowerCase().includes(searchName) || searchName.includes(c.name.toLowerCase())
    );
    if (fuzzyMatches.length > 0) {
      const leafMatch = fuzzyMatches.find(isLeaf);
      return { matched: true, categoryId: (leafMatch || fuzzyMatches[0]).id };
    }

    return { matched: false, categoryId: null };
  };

  // 创建 AI 推荐的分类（支持层级路径如 "技术 > 前端"）
  const createAIRecommendedCategory = async (
    categoryPath: string,
    currentCategories: LocalCategory[]
  ): Promise<{ categoryId: string | null; newCategories: LocalCategory[] }> => {
    try {
      const parts = parseCategoryPath(categoryPath);
      if (parts.length === 0) {
        return { categoryId: null, newCategories: [] };
      }

      let allCategories = [...currentCategories];
      let parentId: string | null = null;
      let finalCategory: LocalCategory | null = null;
      const newCategories: LocalCategory[] = [];

      // 逐层查找或创建分类
      for (const partName of parts) {
        const trimmedName = partName.trim();
        if (!trimmedName) continue;

        // 在当前层级查找是否已存在
        const existing = allCategories.find(
          c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.parentId === parentId
        );

        if (existing) {
          parentId = existing.id;
          finalCategory = existing;
          continue;
        }

        // 创建新分类（并发导入时可能有竞态，失败后尝试回读）
        try {
          const newCat = await bookmarkStorage.createCategory(trimmedName, parentId);
          newCategories.push(newCat);
          parentId = newCat.id;
          finalCategory = newCat;
          allCategories = [...allCategories, newCat];
        } catch {
          const latestCategories = await bookmarkStorage.getCategories();
          const fallback = latestCategories.find(
            c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.parentId === parentId
          );

          if (!fallback) {
            throw new Error(`Failed to create or resolve category: ${trimmedName}`);
          }

          parentId = fallback.id;
          finalCategory = fallback;
          allCategories = latestCategories;
        }
      }

      return {
        categoryId: finalCategory?.id || null,
        newCategories,
      };
    } catch (err) {
      console.error('[ImportExport] Failed to create category:', err);
      return { categoryId: null, newCategories: [] };
    }
  };

  // AI 分析书签
  const analyzeBookmarkWithAI = async (
    url: string,
    title: string,
    currentCategories: LocalCategory[],
    existingTags: string[] = [],
    shouldFetchPageContent = false
  ): Promise<{ 
    description: string; 
    categoryId: string | null; 
    tags: string[]; 
    newCategories: LocalCategory[];
  }> => {
    try {
      await aiClient.loadConfig();
      if (!aiClient.isConfigured()) {
        return { description: '', categoryId: null, tags: [], newCategories: [] };
      }

      // 构建页面内容
      let content = '';
      if (shouldFetchPageContent) {
        content = await fetchPageContentForAI(url);
      }

      const result = await aiClient.analyzeComplete({
        pageContent: {
          url,
          title,
          content,
          textContent: content,
          excerpt: '',
          metadata: {},
          isReaderable: !!content,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
        },
        userCategories: currentCategories,
        existingTags,
      });

      // 匹配或创建分类
      let categoryId: string | null = null;
      let newCategories: LocalCategory[] = [];
      
      if (result.category) {
        // 先尝试匹配现有分类
        const matchResult = matchCategoryByName(result.category, currentCategories);
        if (matchResult.matched) {
          categoryId = matchResult.categoryId;
        } else {
          // 如果没有匹配到，创建新分类
          const createResult = await createAIRecommendedCategory(result.category, currentCategories);
          categoryId = createResult.categoryId;
          newCategories = createResult.newCategories;
        }
      }

      return {
        description: result.summary || '',
        categoryId,
        tags: result.tags || [],
        newCategories,
      };
    } catch (err) {
      console.error('[ImportExport] AI analysis failed:', err);
      return { description: '', categoryId: null, tags: [], newCategories: [] };
    }
  };

  // 安全获取 hostname
  const safeGetHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  const buildHTMLImportDetails = (stats: {
    imported: number;
    skipped: number;
    duplicateSkipped: number;
    categoriesCreated: number;
    aiProcessed: number;
  }, options: ImportTaskOptions) => {
    const totalSkipped = stats.skipped + stats.duplicateSkipped;

    let details: string;
    if (options.preserveFolders && stats.categoriesCreated > 0) {
      details = t('settings.importExport.importDetailsWithCategories', {
        imported: stats.imported,
        skipped: totalSkipped,
        categoriesCreated: stats.categoriesCreated,
        ns: 'settings',
      });
    } else if (options.enableAIAnalysis && stats.aiProcessed > 0) {
      if (stats.categoriesCreated > 0) {
        details = t('settings.importExport.importDetailsWithAIAndCategories', {
          imported: stats.imported,
          skipped: totalSkipped,
          aiProcessed: stats.aiProcessed,
          categoriesCreated: stats.categoriesCreated,
          ns: 'settings',
        });
      } else {
        details = t('settings.importExport.importDetailsWithAI', {
          imported: stats.imported,
          skipped: totalSkipped,
          aiProcessed: stats.aiProcessed,
          ns: 'settings',
        });
      }
    } else {
      details = t('settings.importExport.importDetails', {
        imported: stats.imported,
        skipped: totalSkipped,
        ns: 'settings',
      });
    }

    if (stats.skipped > 0) {
      details += ` (${t('settings.importExport.importErrorSkipped', { count: stats.skipped, ns: 'settings' })})`;
    }

    return details;
  };

  const collectHTMLBookmarks = async (
    doc: Document,
    options: ImportTaskOptions
  ): Promise<{ bookmarksToImport: BookmarkToImport[]; categoriesCreated: number }> => {
    let categoriesCreated = 0;
    let allCategories = await bookmarkStorage.getCategories();

    // 分类名称到 ID 的映射（用于处理重复名称）
    const categoryMap = new Map<string, string>();
    for (const cat of allCategories) {
      const key = `${cat.parentId || 'root'}|${cat.name}`;
      categoryMap.set(key, cat.id);
    }

    const bookmarksToImport: BookmarkToImport[] = [];

    // 递归解析 DL 结构，收集书签
    const collectBookmarks = async (
      dl: Element,
      parentCategoryId: string | null
    ): Promise<void> => {
      const children = dl.children;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.tagName !== 'DT') {
          continue;
        }

        const h3 = child.querySelector(':scope > H3');
        const nestedDl = child.querySelector(':scope > DL');

        if (h3 && nestedDl && options.preserveFolders) {
          const folderName = h3.textContent?.trim() || '未命名文件夹';
          const mapKey = `${parentCategoryId || 'root'}|${folderName}`;

          let categoryId = categoryMap.get(mapKey);

          if (!categoryId) {
            try {
              const newCategory = await bookmarkStorage.createCategory(folderName, parentCategoryId);
              categoryId = newCategory.id;
              categoryMap.set(mapKey, categoryId);
              categoriesCreated++;
              allCategories = [...allCategories, newCategory];
            } catch {
              const existing = allCategories.find((c) => c.name === folderName && c.parentId === parentCategoryId);
              if (existing) {
                categoryId = existing.id;
                categoryMap.set(mapKey, categoryId);
              }
            }
          }

          await collectBookmarks(nestedDl, categoryId || null);
          continue;
        }

        const link = child.querySelector(':scope > A');
        if (link) {
          const url = link.getAttribute('href');
          const title = link.textContent?.trim();

          if (url && title && url.startsWith('http')) {
            bookmarksToImport.push({
              url,
              title,
              parentCategoryId: options.preserveFolders ? parentCategoryId : null,
            });
          }
        }

        if (!options.preserveFolders && nestedDl) {
          await collectBookmarks(nestedDl, null);
        }
      }
    };

    const rootDl = doc.querySelector('DL');
    if (rootDl) {
      await collectBookmarks(rootDl, null);
    }

    return { bookmarksToImport, categoriesCreated };
  };

  const runHtmlImportTask = async (task: HtmlImportTask) => {
    const options = task.payload.options;
    const total = task.payload.total;

    let currentIndex = task.progress.currentIndex;
    let imported = task.progress.imported;
    let skipped = task.progress.skipped;
    let duplicateSkipped = task.progress.duplicateSkipped;
    let categoriesCreated = task.progress.categoriesCreated;
    let aiProcessed = task.progress.aiProcessed;
    const importedBookmarkIds = [...task.progress.importedBookmarkIds];

    let allCategories = await bookmarkStorage.getCategories();
    let existingTags = await bookmarkStorage.getAllTags();

    // 预加载已有 normalized URL 集合，避免每条书签都调用 getBookmarkByUrl 读取全量数据
    const existingNormalizedUrls = await bookmarkStorage.getExistingUrls();

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
        }));
      } catch (error) {
        console.warn('[ImportExport] Failed to persist import progress:', error);
      }
    };

    // 使用较大的批次进行批量写入，避免并发 createBookmark 导致写覆盖丢数据
    const BATCH_SIZE = options.enableAIAnalysis ? MAX_IMPORT_CONCURRENCY : 200;

    for (let batchStart = currentIndex; batchStart < task.payload.bookmarksToImport.length; batchStart += BATCH_SIZE) {
      const batch = task.payload.bookmarksToImport.slice(batchStart, batchStart + BATCH_SIZE);
      const categoriesSnapshot = [...allCategories];
      const tagsSnapshot = [...existingTags];

      // 第一步：预处理每条书签（AI 分析可并发，但不写存储）
      type PreprocessedBookmark = {
        bm: BookmarkToImport;
        status: 'ready' | 'duplicate';
        description: string;
        categoryId: string | null;
        tags: string[];
        aiProcessed: number;
        newCategories: LocalCategory[];
        error?: unknown;
      };

      const preprocessOne = async (bm: BookmarkToImport): Promise<PreprocessedBookmark> => {
        // 用 normalized URL 去重
        const normalizedUrl = bookmarkStorage.normalizeUrlPublic(bm.url);
        if (existingNormalizedUrls.has(normalizedUrl)) {
          return { bm, status: 'duplicate', description: '', categoryId: null, tags: [], aiProcessed: 0, newCategories: [] };
        }

        let description = '';
        let categoryId = bm.parentCategoryId;
        let tags: string[] = [];
        let aiProcessedCount = 0;
        let newCategories: LocalCategory[] = [];

        if (options.enableAIAnalysis && !options.preserveFolders) {
          try {
            const aiResult = await analyzeBookmarkWithAI(
              bm.url, bm.title, categoriesSnapshot, tagsSnapshot, options.fetchPageContent
            );
            description = aiResult.description;
            categoryId = aiResult.categoryId;
            tags = aiResult.tags;
            newCategories = aiResult.newCategories;
            aiProcessedCount = 1;
          } catch {
            // AI 分析失败不阻断导入
          }
        }

        return { bm, status: 'ready', description, categoryId, tags, aiProcessed: aiProcessedCount, newCategories };
      };

      // AI 模式下并发预处理，非 AI 模式下直接同步准备
      let preprocessed: PreprocessedBookmark[];
      if (options.enableAIAnalysis && !options.preserveFolders) {
        preprocessed = await Promise.all(batch.map(preprocessOne));
      } else {
        preprocessed = batch.map((bm) => {
          const normalizedUrl = bookmarkStorage.normalizeUrlPublic(bm.url);
          if (existingNormalizedUrls.has(normalizedUrl)) {
            return { bm, status: 'duplicate' as const, description: '', categoryId: null, tags: [], aiProcessed: 0, newCategories: [] };
          }
          return { bm, status: 'ready' as const, description: '', categoryId: bm.parentCategoryId, tags: [], aiProcessed: 0, newCategories: [] };
        });
      }

      // 第二步：收集需要写入的书签，一次性批量创建
      const readyItems = preprocessed.filter((p) => p.status === 'ready');
      const bookmarkInputs = readyItems.map((p) => {
        const hostname = safeGetHostname(p.bm.url);
        const favicon = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32` : '';
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

      const created = await bookmarkStorage.createBookmarks(bookmarkInputs);

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

        if (p.status === 'duplicate') {
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

      await persistProgress();
    }

    setImportProgress(null);

    // 批量添加 embedding 任务（在 background 中执行）
    if (importedBookmarkIds.length > 0) {
      try {
        const bgService = getBackgroundService();
        await bgService.queueBookmarksEmbedding(importedBookmarkIds);
      } catch (e) {
        console.warn('[ImportExport] Failed to queue embeddings:', e);
      }
    }

    await importTaskStorage.clearHtmlTask();

    setImportResult({
      success: true,
      message: t('settings.importExport.importSuccess', { ns: 'settings' }),
      details: buildHTMLImportDetails(
        { imported, skipped, duplicateSkipped, categoriesCreated, aiProcessed },
        options
      ),
    });
  };

  // 从 HTML 导入（浏览器书签格式）
  const importFromHTML = async (content: string, source: 'file' | 'browser') => {
    const options: ImportTaskOptions = {
      preserveFolders,
      enableAIAnalysis,
      fetchPageContent,
    };

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const { bookmarksToImport, categoriesCreated } = await collectHTMLBookmarks(doc, options);

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
      const errorMessage = error instanceof Error
        ? error.message
        : t('settings.importExport.errors.unknown', { ns: 'settings' });
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
            <CardTitle className="text-lg">{t('settings.importExport.export.title', { ns: 'settings' })}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.importExport.export.description', { ns: 'settings' })}
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
                    {t('settings.importExport.export.jsonFormat', { ns: 'settings' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.importExport.export.jsonSubtitle', { ns: 'settings' })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.importExport.export.jsonDesc', { ns: 'settings' })}
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
                    {t('settings.importExport.export.htmlFormat', { ns: 'settings' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.importExport.export.htmlSubtitle', { ns: 'settings' })}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.importExport.export.htmlDesc', { ns: 'settings' })}
              </p>
            </button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            {t('settings.importExport.export.currentStats', { 
              bookmarkCount: bookmarks.length, 
              categoryCount: categories.length,
              ns: 'settings'
            })}
          </div>
        </CardContent>
      </Card>

      {/* 导入 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.importExport.import.title', { ns: 'settings' })}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.importExport.import.description', { ns: 'settings' })}
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
                  onCheckedChange={(checked) => handlePreserveFoldersChange(checked === true)}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="preserve-folders" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    {t('settings.importExport.import.preserveFolders', { ns: 'settings' })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.importExport.import.preserveFoldersDesc', { ns: 'settings' })}
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
                  onCheckedChange={(checked) => handleEnableAIAnalysisChange(checked === true)}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="enable-ai-analysis" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {t('settings.importExport.import.enableAIAnalysis', { ns: 'settings' })}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.importExport.import.enableAIAnalysisDesc', { ns: 'settings' })}
                  </p>
                  
                  {/* 子配置：获取页面内容 */}
                  {enableAIAnalysis && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="fetch-page-content"
                          checked={fetchPageContent}
                          onCheckedChange={(checked) => setFetchPageContent(checked === true)}
                        />
                        <div>
                          <Label 
                            htmlFor="fetch-page-content" 
                            className="text-sm cursor-pointer flex items-center gap-2"
                          >
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {t('settings.importExport.import.fetchPageContent', { ns: 'settings' })}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('settings.importExport.import.fetchPageContentDesc', { ns: 'settings' })}
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
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t('settings.importExport.import.selectFile', { ns: 'settings' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.importExport.import.supportedFormats', { ns: 'settings' })}
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
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <BookmarkIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {t('settings.importExport.import.fromBrowser', { ns: 'settings' })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.importExport.import.fromBrowserDesc', { ns: 'settings' })}
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
                <span className="text-sm font-medium">{t('settings.importExport.import.importing', { ns: 'settings' })}</span>
              </div>
              <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t('settings.importExport.import.progress', { 
                  current: importProgress.current, 
                  total: importProgress.total,
                  ns: 'settings' 
                })}
              </p>
            </div>
          )}

          {/* 仅加载状态（无导入进度时） */}
          {importing && !importProgress && (
            <div className="p-4 rounded-lg bg-muted flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">{t('settings.importExport.import.importing', { ns: 'settings' })}</span>
            </div>
          )}

          {/* 导入结果 */}
          {importResult && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              importResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200'
            }`}>
              {importResult.success ? (
                <Check className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{importResult.message}</p>
                {importResult.details && (
                  <p className="text-sm opacity-80 mt-1">{importResult.details}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            <strong className="text-foreground">{t('settings.importExport.import.formatLabel', { ns: 'settings' })}</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>{t('settings.importExport.import.formatJSON', { ns: 'settings' })}</li>
              <li>{t('settings.importExport.import.formatHTML', { ns: 'settings' })}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
