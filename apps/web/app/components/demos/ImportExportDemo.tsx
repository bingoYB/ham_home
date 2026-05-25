'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImportExportDemoPanel } from '@hamhome/ui-business/import-export';
import type { Bookmark, Category } from '@/data/mock-bookmarks';

interface ImportExportDemoProps {
  bookmarks: Bookmark[];
  categories: Category[];
  isEn: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  details: string;
}

export function ImportExportDemo({ bookmarks, categories, isEn }: ImportExportDemoProps) {
  const [preserveFolders, setPreserveFolders] = useState(true);
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(false);
  const [fetchPageContent, setFetchPageContent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const texts = {
    title: isEn ? 'Import / Export' : '导入 / 导出',
    description: isEn
      ? 'Sync browser bookmarks, preserve folder hierarchy, or run AI analysis during import.'
      : '支持浏览器书签导入、目录结构保留与导入时 AI 分析。',
    exportTitle: isEn ? 'Export bookmarks' : '导出数据',
    exportDesc: isEn
      ? 'Create JSON/HTML backups for migration and recovery.'
      : '导出 JSON/HTML 备份，便于迁移和恢复。',
    importTitle: isEn ? 'Import bookmarks' : '导入数据',
    importDesc: isEn
      ? 'Import from file or directly read current browser bookmarks.'
      : '可从文件导入，或直接读取当前浏览器书签。',
    stats: isEn
      ? `${bookmarks.length} bookmarks · ${categories.length} categories`
      : `${bookmarks.length} 个书签 · ${categories.length} 个分类`,
    exportJSON: isEn ? 'Export JSON' : '导出 JSON',
    exportHTML: isEn ? 'Export HTML' : '导出 HTML',
    preserveFolders: isEn ? 'Preserve folder structure' : '保留目录结构',
    preserveFoldersDesc: isEn
      ? 'Convert folders to categories while keeping hierarchy.'
      : '将文件夹转换为分类并保留层级关系。',
    enableAIAnalysis: isEn ? 'Use AI auto categorization' : '使用 AI 自动分类打标',
    enableAIAnalysisDesc: isEn
      ? 'Generate summary, category and tags during import.'
      : '导入时自动生成摘要、分类和标签。',
    fetchPageContent: isEn ? 'Fetch page content for analysis' : '获取页面内容进行分析',
    fetchPageContentDesc: isEn
      ? 'Improve analysis quality with real page content (slower).'
      : '抓取页面正文提升分析准确度（更慢）。',
    importFile: isEn ? 'Import from file' : '选择文件导入',
    importBrowser: isEn ? 'Import from browser' : '从浏览器导入',
    browserCount: isEn
      ? `${bookmarks.length + 18} bookmarks detected in browser`
      : `检测到浏览器中约 ${bookmarks.length + 18} 个书签`,
    importing: isEn ? 'Importing...' : '导入中...',
    progress: isEn ? 'Import progress' : '导入进度',
    successTitle: isEn ? 'Import completed' : '导入完成',
    fromFile: isEn ? 'File import' : '文件导入',
    fromBrowser: isEn ? 'Browser import' : '浏览器导入',
  };

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => () => clearProgressTimer(), []);

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

  const importSummary = useMemo(() => {
    const imported = Math.max(8, Math.round(bookmarks.length * 0.75));
    const categoriesCreated = preserveFolders ? Math.max(2, Math.round(categories.length * 0.35)) : 0;
    const aiProcessed = enableAIAnalysis ? imported : 0;

    if (enableAIAnalysis && categoriesCreated > 0) {
      return isEn
        ? `Imported ${imported}, AI processed ${aiProcessed}, created ${categoriesCreated} categories.`
        : `成功导入 ${imported} 个，AI 处理 ${aiProcessed} 个，创建 ${categoriesCreated} 个分类。`;
    }

    if (enableAIAnalysis) {
      return isEn
        ? `Imported ${imported}, AI processed ${aiProcessed}.`
        : `成功导入 ${imported} 个，AI 处理 ${aiProcessed} 个。`;
    }

    if (categoriesCreated > 0) {
      return isEn
        ? `Imported ${imported}, created ${categoriesCreated} categories.`
        : `成功导入 ${imported} 个，创建 ${categoriesCreated} 个分类。`;
    }

    return isEn ? `Imported ${imported} bookmarks.` : `成功导入 ${imported} 个书签。`;
  }, [bookmarks.length, categories.length, enableAIAnalysis, isEn, preserveFolders]);

  const startImport = (source: 'file' | 'browser') => {
    if (importing) return;

    clearProgressTimer();
    setResult(null);
    setProgress(0);
    setImporting(true);

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 18, 100);
        if (next >= 100) {
          clearProgressTimer();
          setImporting(false);
          setResult({
            success: true,
            message: `${texts.successTitle} · ${source === 'browser' ? texts.fromBrowser : texts.fromFile}`,
            details: importSummary,
          });
        }
        return next;
      });
    }, 240);
  };

  return (
    <ImportExportDemoPanel
      texts={texts}
      preserveFolders={preserveFolders}
      enableAIAnalysis={enableAIAnalysis}
      fetchPageContent={fetchPageContent}
      importing={importing}
      progress={progress}
      result={result}
      onPreserveFoldersChange={handlePreserveFoldersChange}
      onEnableAIAnalysisChange={handleEnableAIAnalysisChange}
      onFetchPageContentChange={setFetchPageContent}
      onImportFile={() => startImport('file')}
      onImportBrowser={() => startImport('browser')}
    />
  );
}
