/**
 * SnapshotViewer 快照查看器组件
 * 在弹窗中展示保存的网页快照
 */
import { X, ExternalLink, Download, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@hamhome/ui';

export interface SnapshotViewerProps {
  /** 是否显示 */
  open: boolean;
  /** 快照 URL (Blob URL) */
  snapshotUrl: string | null;
  /** 书签标题 */
  title: string;
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 新标签页打开 */
  onOpenInNewTab?: () => void;
  /** 下载快照 */
  onDownload?: () => void;
  /** 删除快照 */
  onDelete?: () => void;
  /** 翻译函数 */
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function SnapshotViewer({
  open,
  snapshotUrl,
  title,
  loading,
  error,
  onClose,
  onOpenInNewTab,
  onDownload,
  onDelete,
  t,
}: SnapshotViewerProps) {
  const handleOpenInNewTab = () => {
    if (snapshotUrl) {
      window.open(snapshotUrl, '_blank');
      onOpenInNewTab?.();
    }
  };

  const handleDownload = () => {
    if (snapshotUrl) {
      const link = document.createElement('a');
      link.href = snapshotUrl;
      link.download = `${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_snapshot.html`;
      link.click();
      onDownload?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] h-[85vh] p-0 flex flex-col" showCloseButton={false}>
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium truncate max-w-[600px]">
              {t('bookmark:bookmark.snapshot.title')}: {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                disabled={!snapshotUrl}
                title={t('bookmark:bookmark.snapshot.openInNewTab')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!snapshotUrl}
                title={t('bookmark:bookmark.snapshot.download')}
              >
                <Download className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={!snapshotUrl}
                  className="text-destructive hover:text-destructive"
                  title={t('bookmark:bookmark.snapshot.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>{t('bookmark:bookmark.snapshot.loading')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t('common:common.close')}
                </Button>
              </div>
            </div>
          ) : snapshotUrl ? (
            <iframe
              src={snapshotUrl}
              className="w-full h-full border-0"
              title={`Snapshot: ${title}`}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {t('bookmark:bookmark.snapshot.notFound')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
