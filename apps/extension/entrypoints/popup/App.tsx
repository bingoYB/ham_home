/**
 * Popup App - 主入口
 * 参考 NewBookmarkModal 设计风格优化
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Toaster } from "@hamhome/ui";
import { SavePanel } from "@/components/SavePanel";
import { QuickActions } from "@/components/common/QuickActions";
import { useCurrentPage } from "@/hooks/useCurrentPage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import type { LocalBookmark } from "@/types";
import "../../style.css";

export function App() {
  const { t } = useTranslation(["common", "bookmark"]);
  const { shortcuts } = useShortcuts();
  const [existingBookmark, setExistingBookmark] =
    useState<LocalBookmark | null>(null);
  const { pageContent, loading, error } = useCurrentPage();

  // 获取保存书签的快捷键（使用格式化后的显示）
  const saveShortcutInfo = shortcuts.find((s) => s.name === "save-bookmark");
  const saveShortcut = saveShortcutInfo?.formattedShortcut || saveShortcutInfo?.shortcut || "⌘/Ctrl + Shift + E";

  // 检查当前页面是否已收藏
  useEffect(() => {
    if (pageContent?.url) {
      bookmarkStorage
        .getBookmarkByUrl(pageContent.url)
        .then(setExistingBookmark);
    }
  }, [pageContent?.url]);

  // 刷新书签状态
  const refreshBookmarkStatus = async () => {
    if (pageContent?.url) {
      const bookmark = await bookmarkStorage.getBookmarkByUrl(pageContent.url);
      setExistingBookmark(bookmark);
    }
  };

  return (
    <div className="w-[420px] min-h-[400px] max-h-[1200px] flex flex-col bg-background text-foreground">
      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : pageContent ? (
          <SavePanel
            pageContent={pageContent}
            existingBookmark={existingBookmark}
            onSaved={() => {
              refreshBookmarkStatus();
              // 保存成功后关闭 popup
              window.close();
            }}
            onClose={() => window.close()}
            onDelete={() => window.close()}
          />
        ) : null}
      </main>

      {/* 底部状态栏 */}
      <footer className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center justify-between">
          <span>{t("bookmark:popup.shortcut")}: {saveShortcut}</span>
          <QuickActions size="sm" showTooltip />
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

// 加载状态
function LoadingState() {
  const { t } = useTranslation("bookmark");
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">{t("popup.loadingPage")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("popup.pleaseWait")}
        </p>
      </div>
    </div>
  );
}

// 错误状态
interface ErrorStateProps {
  error: string;
}

function ErrorState({ error }: ErrorStateProps) {
  const { t } = useTranslation("bookmark");
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
        <span className="text-4xl">😅</span>
      </div>
      <div>
        <p className="font-medium text-foreground mb-1">
          {t("popup.cannotGetPage")}
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );
}
