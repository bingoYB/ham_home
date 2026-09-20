/**
 * InPageSaveFlow - 页内保存浮窗
 *
 * 触发保存后先在页面右下角展示轻量的分析浮窗，AI 分析完成后再展开保存表单。
 * 整个过程都在当前页面内完成，用户可以随意操作页面而不会中断流程。
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import { Button, cn } from "@hamhome/ui";
import { SavePanel } from "./SavePanel";
import { useInPageSave } from "@/hooks/useInPageSave";
import { useContentUI } from "@/utils/ContentUIContext";
import { isSubjectClip } from "@/utils/clip-context";

/** 浮窗统一定位在右下角 */
const FLOATING_POSITION = "fixed bottom-4 right-4 z-[100000] pointer-events-auto";

export function InPageSaveFlow() {
  const { t } = useTranslation(["bookmark", "common"]);
  const { container } = useContentUI();
  const {
    phase,
    pageContent,
    existingBookmark,
    clipContext,
    error,
    showFormNow,
    handleInitialLoadSettled,
    handleSaved,
    close,
  } = useInPageSave();

  const isOpen = phase !== "idle";

  // Esc 关闭浮窗（捕获阶段监听，避免被页面自身的处理拦截）
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // 分类下拉等 Popover 打开时，Esc 只关闭下拉，不关闭整个浮窗
      const hasOpenPopover = container.querySelector(
        '[data-slot="popover-content"][data-state="open"]',
      );
      if (hasOpenPopover) return;

      close();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, close, container]);

  if (!isOpen) return null;

  // 无法保存的提示
  if (phase === "error") {
    return (
      <FloatingCard testId="error" className="max-w-[320px]">
        <div className="flex items-start gap-2.5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 text-sm text-foreground">
            {t(`bookmark:inPageSave.errors.${error ?? "extractFailed"}`)}
          </div>
          <CloseButton onClick={close} label={t("common:common.close")} />
        </div>
      </FloatingCard>
    );
  }

  // 保存成功提示
  if (phase === "saved") {
    return (
      <FloatingCard testId="saved" className="max-w-[320px]">
        <div className="flex items-center gap-2.5 p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex-1 text-sm font-medium text-foreground">
            {t("bookmark:inPageSave.saved")}
          </div>
        </div>
      </FloatingCard>
    );
  }

  const isLoadingPhase = phase === "preparing" || phase === "analyzing";

  return (
    <>
      {isLoadingPhase && (
        <FloatingCard testId="loading" className="max-w-[320px]">
          <div className="flex items-center gap-2.5 p-3">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {phase === "preparing"
                  ? t("bookmark:inPageSave.preparing")
                  : t("bookmark:inPageSave.analyzing")}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {pageContent?.title || document.title}
              </div>
            </div>
            {phase === "analyzing" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={showFormNow}
              >
                {t("bookmark:inPageSave.editNow")}
              </Button>
            )}
            <CloseButton onClick={close} label={t("common:common.close")} />
          </div>
        </FloatingCard>
      )}

      {/* AI 分析期间表单已挂载但不展示，分析完成后直接呈现结果，避免二次等待 */}
      {pageContent && (
        <FloatingCard
          testId="panel"
          className={cn(
            "flex max-h-[80vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col",
            isLoadingPhase && "hidden",
          )}
        >
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <Bookmark className="h-4 w-4 text-primary" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {existingBookmark
                ? t("bookmark:inPageSave.updateTitle")
                : t("bookmark:inPageSave.title")}
            </span>
            <CloseButton onClick={close} label={t("common:common.close")} />
          </div>

          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <SavePanel
              key={`${pageContent.url}:${existingBookmark?.id ?? "new"}`}
              pageContent={pageContent}
              existingBookmark={existingBookmark}
              initialClip={clipContext ?? undefined}
              hideSnapshotOptions={isSubjectClip(clipContext ?? undefined)}
              portalContainer={container}
              onInitialLoadSettled={handleInitialLoadSettled}
              onSaved={handleSaved}
              onClose={close}
              onDelete={close}
            />
          </div>
        </FloatingCard>
      )}
    </>
  );
}

interface FloatingCardProps {
  className?: string;
  /** 供自动化测试 / 截图定位浮窗 */
  testId?: string;
  children: React.ReactNode;
}

function FloatingCard({ className, testId, children }: FloatingCardProps) {
  return (
    <div
      data-hamhome-save-flow={testId}
      className={cn(
        FLOATING_POSITION,
        "overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CloseButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      title={label}
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
