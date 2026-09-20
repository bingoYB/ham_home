/**
 * PopupSaveView - Popup 内的保存表单
 *
 * 默认保存流程在页面内完成；用户在设置中选择「在扩展弹窗中保存」，
 * 或页面无法注入 content script（浏览器内部页、应用商店、PDF 阅读器等）时走这里。
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@hamhome/ui";
import { SavePanel } from "@/components/SavePanel";
import { useCurrentPage } from "@/hooks/useCurrentPage";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import type { LocalBookmark, SaveFlowClipContext } from "@/types";
import {
  applyClipTargetToPageContent,
  isSubjectClip,
} from "@/utils/clip-context";

interface PopupSaveViewProps {
  /** 返回快捷面板 */
  onBack: () => void;
  initialClip?: SaveFlowClipContext;
}

export function PopupSaveView({ onBack, initialClip }: PopupSaveViewProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const { pageContent, loading, error } = useCurrentPage();
  const [existingBookmark, setExistingBookmark] =
    useState<LocalBookmark | null>(null);
  const effectivePageContent = pageContent
    ? applyClipTargetToPageContent(pageContent, initialClip)
    : null;

  useEffect(() => {
    if (!effectivePageContent?.url) return;
    bookmarkStorage
      .getBookmarkByUrl(effectivePageContent.url)
      .then(setExistingBookmark);
  }, [effectivePageContent?.url]);

  return (
    <div className="flex w-full min-h-[400px] max-h-[600px] flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onBack}
          title={t("common:common.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {t("bookmark:popup.saveCurrentPage")}
        </span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : effectivePageContent ? (
          <SavePanel
            key={`${effectivePageContent.url}:${existingBookmark?.id ?? "new"}`}
            pageContent={effectivePageContent}
            existingBookmark={existingBookmark}
            initialClip={initialClip}
            hideSnapshotOptions={isSubjectClip(initialClip)}
            onSaved={() => window.close()}
            onClose={() => window.close()}
            onDelete={() => window.close()}
          />
        ) : null}
      </main>
    </div>
  );
}

function LoadingState() {
  const { t } = useTranslation("bookmark");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">{t("popup.loadingPage")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("popup.pleaseWait")}
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  const { t } = useTranslation("bookmark");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
        <span className="text-4xl">😅</span>
      </div>
      <div>
        <p className="mb-1 font-medium text-foreground">
          {t("popup.cannotGetPage")}
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    </div>
  );
}
