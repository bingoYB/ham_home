/**
 * ImportExportPage 导入导出页面
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileJson, FileText, Check, AlertCircle, Loader2, FolderTree, Sparkles, Globe } from 'lucide-react';
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
import { aiClient } from '@/lib/ai/client';
import { parseCategoryPath } from './common/CategoryTree';
import type { LocalCategory } from '@/types';

export function ImportExportPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { bookmarks, categories, exportData, refreshBookmarks, refreshCategories } = useBookmarks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // 处理文件导入
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      
      if (file.name.endsWith('.json')) {
        await importFromJSON(content);
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        await importFromHTML(content);
      } else {
        throw new Error(t('settings.importExport.errors.unsupportedFormat', { ns: 'settings' }));
      }

      await refreshBookmarks();
      await refreshCategories();
      
    } catch (error) {
      setImportResult({
        success: false,
        message: t('settings.importExport.importFailed', { ns: 'settings' }),
        details: error instanceof Error ? error.message : t('settings.importExport.errors.unknown', { ns: 'settings' }),
      });
    } finally {
      setImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 从 JSON 导入
  const importFromJSON = async (content: string) => {
    const data = JSON.parse(content);
    
    let imported = 0;
    let skipped = 0;

    // 导入分类
    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        try {
          await bookmarkStorage.createCategory(cat.name, cat.parentId);
        } catch {
          // 分类可能已存在，跳过
        }
      }
    }

    // 导入书签
    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      for (const bm of data.bookmarks) {
        try {
          await bookmarkStorage.createBookmark({
            url: bm.url,
            title: bm.title,
            description: bm.description || bm.summary || '',
            categoryId: bm.categoryId || null,
            tags: bm.tags || [],
            favicon: bm.favicon || '',
            hasSnapshot: false,
          });
          imported++;
        } catch {
          skipped++;
        }
      }
    }

    setImportResult({
      success: true,
      message: t('settings.importExport.importSuccess', { ns: 'settings' }),
      details: t('settings.importExport.importDetails', { imported, skipped, ns: 'settings' }),
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
        } else {
          // 创建新分类
          const newCat = await bookmarkStorage.createCategory(trimmedName, parentId);
          newCategories.push(newCat);
          parentId = newCat.id;
          finalCategory = newCat;
          allCategories = [...allCategories, newCat];
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
    currentCategories: LocalCategory[]
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
      if (fetchPageContent) {
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

  // 从 HTML 导入（浏览器书签格式）
  const importFromHTML = async (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    let imported = 0;
    let skipped = 0;
    let duplicateSkipped = 0; // 区分重复跳过
    let categoriesCreated = 0;
    let aiProcessed = 0;
    
    // 分类名称到 ID 的映射（用于处理重复名称）
    const categoryMap = new Map<string, string>();
    
    // 跟踪本次导入中已处理的 URL（规范化后）
    const importedUrls = new Set<string>();
    
    // 获取现有分类
    let allCategories = await bookmarkStorage.getCategories();
    for (const cat of allCategories) {
      const key = `${cat.parentId || 'root'}|${cat.name}`;
      categoryMap.set(key, cat.id);
    }

    // 收集所有书签（用于进度显示和 AI 批量处理）
    interface BookmarkToImport {
      url: string;
      title: string;
      parentCategoryId: string | null;
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
        
        if (child.tagName === 'DT') {
          const h3 = child.querySelector(':scope > H3');
          const nestedDl = child.querySelector(':scope > DL');
          
          if (h3 && nestedDl && preserveFolders) {
            // 文件夹处理
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
                const existing = allCategories.find(c => c.name === folderName && c.parentId === parentCategoryId);
                if (existing) {
                  categoryId = existing.id;
                  categoryMap.set(mapKey, categoryId);
                }
              }
            }
            
            await collectBookmarks(nestedDl, categoryId || null);
          } else {
            const link = child.querySelector(':scope > A');
            if (link) {
              const url = link.getAttribute('href');
              const title = link.textContent?.trim();
              
              if (url && title && url.startsWith('http')) {
                bookmarksToImport.push({
                  url,
                  title,
                  parentCategoryId: preserveFolders ? parentCategoryId : null,
                });
              }
            }
            
            if (!preserveFolders && nestedDl) {
              await collectBookmarks(nestedDl, null);
            }
          }
        }
      }
    };

    // 收集书签
    const rootDl = doc.querySelector('DL');
    if (rootDl) {
      await collectBookmarks(rootDl, null);
    }

    // 设置进度
    const total = bookmarksToImport.length;
    setImportProgress({ current: 0, total });

    // 导入书签
    for (let i = 0; i < bookmarksToImport.length; i++) {
      const bm = bookmarksToImport[i];
      setImportProgress({ current: i + 1, total });

      try {
        // 规范化 URL 用于去重检查
        const normalizedUrl = bm.url.replace(/\/$/, '').toLowerCase();
        
        // 检查是否在本次导入中已处理过
        if (importedUrls.has(normalizedUrl)) {
          duplicateSkipped++;
          continue;
        }

        // 检查 URL 是否已存在于存储中
        const existingBookmark = await bookmarkStorage.getBookmarkByUrl(bm.url);
        if (existingBookmark) {
          duplicateSkipped++;
          importedUrls.add(normalizedUrl); // 标记为已处理
          continue;
        }

        let description = '';
        let categoryId = bm.parentCategoryId;
        let tags: string[] = [];

        // AI 分析（如果启用且不保留目录）
        if (enableAIAnalysis && !preserveFolders) {
          const aiResult = await analyzeBookmarkWithAI(bm.url, bm.title, allCategories);
          description = aiResult.description;
          categoryId = aiResult.categoryId;
          tags = aiResult.tags;
          
          // 如果 AI 创建了新分类，更新分类列表和计数
          if (aiResult.newCategories.length > 0) {
            allCategories = [...allCategories, ...aiResult.newCategories];
            categoriesCreated += aiResult.newCategories.length;
          }
          
          aiProcessed++;

          // 限速：每个请求间隔 500ms，避免 API 限流
          if (i < bookmarksToImport.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // 安全获取 hostname，避免无效 URL 导致异常
        const hostname = safeGetHostname(bm.url);
        const favicon = hostname 
          ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
          : '';

        await bookmarkStorage.createBookmark({
          url: bm.url,
          title: bm.title,
          description,
          categoryId,
          tags,
          favicon,
          hasSnapshot: false,
        });
        imported++;
        importedUrls.add(normalizedUrl); // 标记为已导入
      } catch (err) {
        // 区分重复错误和其他错误
        if (err instanceof Error && err.message.includes('已收藏')) {
          duplicateSkipped++;
        } else {
          console.error('[ImportExport] Failed to import bookmark:', bm.url, err);
          skipped++;
        }
      }
    }

    setImportProgress(null);

    // 合并跳过计数用于显示
    const totalSkipped = skipped + duplicateSkipped;
    
    // 构建结果详情
    let details: string;
    if (preserveFolders && categoriesCreated > 0) {
      details = t('settings.importExport.importDetailsWithCategories', { imported, skipped: totalSkipped, categoriesCreated, ns: 'settings' });
    } else if (enableAIAnalysis && aiProcessed > 0) {
      // AI 分析模式，显示处理数量和创建的分类数量
      if (categoriesCreated > 0) {
        details = t('settings.importExport.importDetailsWithAIAndCategories', { imported, skipped: totalSkipped, aiProcessed, categoriesCreated, ns: 'settings' });
      } else {
        details = t('settings.importExport.importDetailsWithAI', { imported, skipped: totalSkipped, aiProcessed, ns: 'settings' });
      }
    } else {
      details = t('settings.importExport.importDetails', { imported, skipped: totalSkipped, ns: 'settings' });
    }
    
    // 如果有错误跳过，添加提示
    if (skipped > 0) {
      details += ` (${t('settings.importExport.importErrorSkipped', { count: skipped, ns: 'settings' })})`;
    }

    setImportResult({
      success: true,
      message: t('settings.importExport.importSuccess', { ns: 'settings' }),
      details,
    });
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

          <button
            onClick={triggerFileInput}
            disabled={importing}
            className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <span className="text-muted-foreground">{t('settings.importExport.import.importing', { ns: 'settings' })}</span>
                {importProgress && (
                  <div className="w-full max-w-xs space-y-2">
                    <Progress value={(importProgress.current / importProgress.total) * 100} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {t('settings.importExport.import.progress', { 
                        current: importProgress.current, 
                        total: importProgress.total,
                        ns: 'settings' 
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-foreground">{t('settings.importExport.import.selectFile', { ns: 'settings' })}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('settings.importExport.import.supportedFormats', { ns: 'settings' })}
                  </p>
                </div>
              </div>
            )}
          </button>

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

