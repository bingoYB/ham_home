/**
 * 存储管理标签页
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
import { useRef } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hamhome/ui';
import { Loader2, Download, Trash2 } from 'lucide-react';
import {
  useStorageManagement,
  useImportBookmarks,
  formatSize,
} from '@/hooks/useStorageManagement';

export function StorageManagementTab() {
  const {
    snapshotUsage,
    bookmarkCount,
    loading,
    clearing,
    exporting,
    loadStats,
    clearSnapshots,
    exportJSON,
    exportHTML,
  } = useStorageManagement();

  return (
    <div className="space-y-6">
      {/* 存储统计 */}
      <StorageStatsCard
        loading={loading}
        bookmarkCount={bookmarkCount}
        snapshotCount={snapshotUsage?.count || 0}
      />

      {/* 快照管理 */}
      <SnapshotManagementCard
        snapshotSize={snapshotUsage?.totalSize || 0}
        snapshotCount={snapshotUsage?.count || 0}
        clearing={clearing}
        onClear={clearSnapshots}
      />

      {/* 数据导出 */}
      <ExportCard
        exporting={exporting}
        onExportJSON={exportJSON}
        onExportHTML={exportHTML}
      />

      {/* 数据导入 */}
      <ImportCard onImported={loadStats} />
    </div>
  );
}

// ========== 子组件 ==========

interface StorageStatsCardProps {
  loading: boolean;
  bookmarkCount: number;
  snapshotCount: number;
}

function StorageStatsCard({
  loading,
  bookmarkCount,
  snapshotCount,
}: StorageStatsCardProps) {
  return (
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
              <div className="text-2xl font-bold">{snapshotCount}</div>
              <div className="text-sm text-muted-foreground">快照数量</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SnapshotManagementCardProps {
  snapshotSize: number;
  snapshotCount: number;
  clearing: boolean;
  onClear: () => void;
}

function SnapshotManagementCard({
  snapshotSize,
  snapshotCount,
  clearing,
  onClear,
}: SnapshotManagementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">快照管理</CardTitle>
        <CardDescription>
          快照占用空间：{formatSize(snapshotSize)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={onClear}
          disabled={clearing || !snapshotCount}
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
  );
}

interface ExportCardProps {
  exporting: 'json' | 'html' | null;
  onExportJSON: () => void;
  onExportHTML: () => void;
}

function ExportCard({ exporting, onExportJSON, onExportHTML }: ExportCardProps) {
  return (
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
            onClick={onExportJSON}
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
            onClick={onExportHTML}
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
  );
}

interface ImportCardProps {
  onImported: () => void;
}

function ImportCard({ onImported }: ImportCardProps) {
  const { importing, result, importFromFile } = useImportBookmarks(onImported);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await importFromFile(file);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">数据导入</CardTitle>
        <CardDescription>从浏览器书签文件导入</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <input
              ref={fileInputRef}
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

          {result && <ImportResultDisplay result={result} />}
        </div>
      </CardContent>
    </Card>
  );
}

interface ImportResultDisplayProps {
  result: {
    imported: number;
    skipped: number;
    failed: number;
  };
}

function ImportResultDisplay({ result }: ImportResultDisplayProps) {
  return (
    <div className="p-3 bg-muted rounded-md text-sm">
      <p>导入完成：</p>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        <li>✅ 成功导入：{result.imported} 条</li>
        {result.skipped > 0 && (
          <li>⏭️ 跳过（已存在）：{result.skipped} 条</li>
        )}
        {result.failed > 0 && <li>❌ 失败：{result.failed} 条</li>}
      </ul>
    </div>
  );
}
