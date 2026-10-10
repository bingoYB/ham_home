/**
 * ReadingDoneBar - "Finished reading?" on pages opened from Read later:
 * mark as read, keep in the library (and mark read), or not yet.
 */
import { useTranslation } from "react-i18next";
import { BookCheck, Loader2 } from "lucide-react";
import { Button } from "@hamhome/ui";
import { useReadingDoneBar } from "@/hooks/useReadingDoneBar";
import type { PanelPosition } from "@/types";
import { FeedbackCard } from "./FeedbackCard";

interface ReadingDoneBarProps {
  panelPosition: PanelPosition;
}

export function ReadingDoneBar({ panelPosition }: ReadingDoneBarProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const bar = useReadingDoneBar();
  if (!bar.session || !bar.visible) return null;
  const working = bar.state === "working";
  const message =
    bar.state === "read"
      ? t("bookmark:readingBar.markedRead")
      : bar.state === "kept"
        ? t("bookmark:readingBar.kept")
        : bar.state === "failed"
          ? t("bookmark:tabFeedback.failed")
          : t("bookmark:readingBar.question");

  return (
    <FeedbackCard
      side={panelPosition === "right" ? "left" : "right"}
      role="region"
      label={t("bookmark:readingBar.question")}
      closeLabel={t("common:common.close")}
      testId="reading-done"
      onClose={bar.dismiss}
      onHoldChange={() => undefined}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <BookCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{message}</p>
            <p className="truncate text-xs text-muted-foreground" title={bar.session.title}>
              {bar.session.title}
            </p>
          </div>
        </div>
        {(bar.state === "idle" || working || bar.state === "failed") && (
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" className="h-7 px-2.5 text-xs" disabled={working} onClick={() => void bar.markRead()}>
              {working && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {t("bookmark:readingBar.markRead")}
            </Button>
            {bar.session.queueOnly && (
              <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs" disabled={working} onClick={() => void bar.keep()}>
                {t("bookmark:readingBar.keep")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={bar.dismiss}>
              {t("bookmark:readingBar.notYet")}
            </Button>
          </div>
        )}
      </div>
    </FeedbackCard>
  );
}

export default ReadingDoneBar;
