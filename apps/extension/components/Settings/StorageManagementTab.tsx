/**
 * 存储管理标签页
 */
import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hamhome/ui';
import { Loader2, Download, Trash2, Upload } from 'lucide-react';
import { snapshotStorage, bookmarkStorage } from '@/lib/storage';
import { exportAsJSON, exportAsHTML } from '@/lib/export';

export function StorageManagementTab() {
  const [snapshotUsage, setSnapshotUsage] = useState<{
    count: number;
    totalSize: number;
  } | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'html' | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [usage, bookmarks] = await Promise.all([
        snapshotStorage.getStorageUsage(),
        bookmarkStorage.getBookmarks(),
      ]);
      setSnapshotUsage(usage);
      setBookmarkCount(bookmarks.length);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleClearSnapshots = async () => {
    if (!confirm('确定要清除所有快照吗？此操作不可撤销。')) return;

    setClearing(true);
    try {
      await snapshotStorage.clearAllSnapshots();
      
      // 更新所有书签的 hasSnapshot 状态
      const bookmarks = await bookmarkStorage.getBookmarks();
      await Promise.all(
        bookmarks
          .filter((b) => b.hasSnapshot)
          .map((b) => bookmarkStorage.updateBookmark(b.id, { hasSnapshot: false }))
      );

      setSnapshotUsage({ count: 0, totalSize: 0 });
      alert('快照已清除');
    } catch (err) {
      console.error('[StorageManagementTab] Clear error:', err);
      alert('清除失败');
    } finally {
      setClearing(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting('json');
    try {
      await exportAsJSON();
    } catch (err) {
      console.error('[StorageManagementTab] Export JSON error:', err);
      alert('导出失败');
    } finally {
      setExporting(null);
    }
  };

  const handleExportHTML = async () => {
    setExporting('html');
    try {
      await exportAsHTML();
    } catch (err) {
      console.error('[StorageManagementTab] Export HTML error:', err);
      alert('导出失败');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 存储统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">存储统计</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">{bookmarkCount}</div>
                <div className="text-sm text-muted-foreground">书签总数</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold">
                  {snapshotUsage?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">快照数量</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快照管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">快照管理</CardTitle>
          <CardDescription>
            快照占用空间：{snapshotUsage ? formatSize(snapshotUsage.totalSize) : '-'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleClearSnapshots}
            disabled={clearing || !snapshotUsage?.count}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            清除所有快照
          </Button>
        </CardContent>
      </Card>

      {/* 数据导出 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据导出</CardTitle>
          <CardDescription>
            导出所有书签数据，可用于备份或迁移到其他工具
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleExportJSON}
              disabled={exporting !== null}
            >
              {exporting === 'json' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出 JSON
            </Button>
            <Button
              variant="outline"
              onClick={handleExportHTML}
              disabled={exporting !== null}
            >
              {exporting === 'html' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出 HTML
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            JSON 格式包含完整数据，适合备份；HTML 格式可导入到其他浏览器
          </p>
        </CardContent>
      </Card>

      {/* 数据导入 - 预留区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据导入</CardTitle>
          <CardDescription>
            从浏览器书签文件导入
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportBookmarks onImported={loadStats} />
        </CardContent>
      </Card>
    </div>
  );
}

// 导入组件（内联定义）
function ImportBookmarks({ onImported }: { onImported: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const content = await file.text();
      const importResult = await importFromHTML(content);
      setResult(importResult);
      onImported();
    } catch (err) {
      console.error('[ImportBookmarks] Error:', err);
      alert('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
      // 重置 input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          type="file"
          accept=".html,.htm"
          onChange={handleFileSelect}
          disabled={importing}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
        />
        <p className="text-xs text-muted-foreground mt-1">
          支持 Netscape 书签格式 HTML 文件
        </p>
      </div>

      {importing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在导入...
        </div>
      )}

      {result && (
        <div className="p-3 bg-muted rounded-md text-sm">
          <p>导入完成：</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            <li>✅ 成功导入：{result.imported} 条</li>
            {result.skipped > 0 && (
              <li>⏭️ 跳过（已存在）：{result.skipped} 条</li>
            )}
            {result.failed > 0 && (
              <li>❌ 失败：{result.failed} 条</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// 导入函数
async function importFromHTML(content: string): Promise<{
  imported: number;
  skipped: number;
  failed: number;
}> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const links = doc.querySelectorAll('a');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const link of links) {
    const url = link.getAttribute('href');
    const title = link.textContent?.trim();

    if (!url || !title) {
      failed++;
      continue;
    }

    // 跳过非 http(s) 链接
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      skipped++;
      continue;
    }

    try {
      // 检查是否已存在
      const existing = await bookmarkStorage.getBookmarkByUrl(url);
      if (existing) {
        skipped++;
        continue;
      }

      // 解析时间戳
      const addDate = link.getAttribute('add_date');
      const createdAt = addDate ? parseInt(addDate) * 1000 : Date.now();

      await bookmarkStorage.createBookmark({
        url,
        title,
        description: '',
        categoryId: null,
        tags: [],
        hasSnapshot: false,
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, skipped, failed };
}

