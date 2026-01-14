/**
 * ImportExportPage 导入导出页面
 */
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, FileJson, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import type { LocalBookmark, LocalCategory } from '@/types';

export function ImportExportPage() {
  const { t } = useTranslation(['common', 'settings']);
  const { bookmarks, categories, exportData, refreshBookmarks, refreshCategories } = useBookmarks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

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

  // 从 HTML 导入（浏览器书签格式）
  const importFromHTML = async (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const links = doc.querySelectorAll('a');
    
    let imported = 0;
    let skipped = 0;

    for (const link of links) {
      const url = link.getAttribute('href');
      const title = link.textContent?.trim();
      
      if (url && title && url.startsWith('http')) {
        try {
          await bookmarkStorage.createBookmark({
            url,
            title,
            description: '',
            categoryId: null,
            tags: [],
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">{t('settings.importExport.title', { ns: 'settings' })}</h1>
        <p className="text-muted-foreground">{t('settings.importExport.description', { ns: 'settings' })}</p>
      </div>

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

          <button
            onClick={triggerFileInput}
            disabled={importing}
            className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <span className="text-muted-foreground">{t('settings.importExport.import.importing', { ns: 'settings' })}</span>
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

