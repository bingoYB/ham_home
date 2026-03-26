/**
 * SnapshotViewer 快照查看器组件
 * 在弹窗中展示保存的网页快照
 */
import { useState, useEffect } from "react";
import { X, ExternalLink, Download, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@hamhome/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useContentUI } from "@/utils/ContentUIContext";

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
  // 获取 Shadow Root 容器，确保 DialogPortal 挂载在 Shadow DOM 内
  // 避免 Portal 到 document.body 后脱离 Shadow DOM 样式作用域
  const { container } = useContentUI();
  const [content, setContent] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (snapshotUrl) {
      setLoadingContent(true);
      fetch(snapshotUrl)
        .then((res) => {
          const type = res.headers.get("content-type");
          if (type && type.includes("markdown")) {
            if (isMounted) setIsMarkdown(true);
            return res.text();
          }
          if (isMounted) setIsMarkdown(false);
          return null;
        })
        .then((text) => {
          if (isMounted) setContent(text);
        })
        .catch((err) => {
          console.error("[SnapshotViewer] Failed to fetch snapshot:", err);
        })
        .finally(() => {
          if (isMounted) setLoadingContent(false);
        });
    } else {
      setContent(null);
      setIsMarkdown(false);
    }
    return () => {
      isMounted = false;
    };
  }, [snapshotUrl]);

  const handleOpenInNewTab = () => {
    if (snapshotUrl) {
      window.open(snapshotUrl, "_blank");
      onOpenInNewTab?.();
    }
  };

  const handleDownload = () => {
    if (snapshotUrl) {
      const link = document.createElement("a");
      link.href = snapshotUrl;
      const extension = isMarkdown ? "md" : "html";
      link.download = `${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}_snapshot.${extension}`;
      link.click();
      onDownload?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        container={container}
        className="w-[96vw]! max-w-[96vw]! sm:max-w-[96vw]! h-[96vh] p-0 flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium truncate max-w-[600px]">
              {t("bookmark:bookmark.snapshot.title")}: {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                disabled={!snapshotUrl}
                title={t("bookmark:bookmark.snapshot.openInNewTab")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!snapshotUrl}
                title={t("bookmark:bookmark.snapshot.download")}
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
                  title={t("bookmark:bookmark.snapshot.delete")}
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
          {loading || loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>{t("bookmark:bookmark.snapshot.loading")}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={onClose}>
                  {t("common:common.close")}
                </Button>
              </div>
            </div>
          ) : isMarkdown && content ? (
            <div className="w-full h-full overflow-y-auto p-4 md:p-8 bg-background">
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-4xl mx-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const { children, className, node, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <SyntaxHighlighter
                          PreTag="div"
                          language={match[1]}
                          style={vscDarkPlus}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code {...rest} className={className}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          ) : snapshotUrl ? (
            <iframe
              src={snapshotUrl}
              className="w-full h-full border-0"
              title={`Snapshot: ${title}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {t("bookmark:bookmark.snapshot.notFound")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
