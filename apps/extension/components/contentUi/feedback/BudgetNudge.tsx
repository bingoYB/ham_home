/**
 * BudgetNudge - gentle in-page hint when the tab budget is exceeded:
 * the least recently used tabs with "read later" / "archive" buttons, plus
 * "review all", "not today" and "pause for an hour". Never blocks anything.
 */
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, Check, Layers } from "lucide-react";
import { Button, cn } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { TabFeedbackStatus } from "@/hooks/useTabFeedback";

export interface BudgetNudgeCandidate {
  tabId: number;
  title: string;
  lastActiveAt: number;
}

interface BudgetNudgeProps {
  openCount: number;
  over: number;
  candidates: BudgetNudgeCandidate[];
  hideTitles: boolean;
  handledTabIds: ReadonlySet<number>;
  status: TabFeedbackStatus;
  onReadLater: (tabId: number) => void;
  onArchive: (tabId: number) => void;
  onReviewAll: () => void;
  onNotToday: () => void;
  onSnooze: () => void;
}

export function BudgetNudge({
  openCount,
  over,
  candidates,
  hideTitles,
  handledTabIds,
  status,
  onReadLater,
  onArchive,
  onReviewAll,
  onNotToday,
  onSnooze,
}: BudgetNudgeProps) {
  const { t } = useTranslation("bookmark");
  const working = status === "working";

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm font-medium text-foreground">
          {t("tabFeedback.nudge.title", { count: openCount, over })}
        </p>
      </div>

      {candidates.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">{t("tabFeedback.nudge.oldest")}</p>
          <ul className="space-y-1">
            {candidates.map((candidate, index) => (
              <NudgeRow
                key={candidate.tabId}
                title={
                  hideTitles || !candidate.title
                    ? t("tabFeedback.nudge.hiddenTitle", { index: index + 1 })
                    : candidate.title
                }
                lastActiveAt={candidate.lastActiveAt}
                handled={handledTabIds.has(candidate.tabId)}
                disabled={working}
                onReadLater={() => onReadLater(candidate.tabId)}
                onArchive={() => onArchive(candidate.tabId)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <Button size="sm" className="h-7 px-2.5 text-xs" onClick={onReviewAll}>
          {t("tabFeedback.nudge.reviewAll")}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onSnooze}>
          {t("tabFeedback.nudge.snoozeHour")}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onNotToday}>
          {t("tabFeedback.nudge.notToday")}
        </Button>
      </div>
    </div>
  );
}

interface NudgeRowProps {
  title: string;
  lastActiveAt: number;
  handled: boolean;
  disabled: boolean;
  onReadLater: () => void;
  onArchive: () => void;
}

function NudgeRow({ title, lastActiveAt, handled, disabled, onReadLater, onArchive }: NudgeRowProps) {
  const { t } = useTranslation("bookmark");
  const idle = useRelativeTime(lastActiveAt);
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5",
        handled && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-foreground" title={title}>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground">{idle}</p>
      </div>
      {handled ? (
        <span className="flex items-center gap-1 text-[11px] text-emerald-600">
          <Check className="h-3 w-3" />
          {t("tabFeedback.nudge.handled")}
        </span>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={disabled}
            onClick={onReadLater}
            title={t("tabFeedback.nudge.readLater")}
            aria-label={t("tabFeedback.nudge.readLater")}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={disabled}
            onClick={onArchive}
            title={t("tabFeedback.nudge.archive")}
            aria-label={t("tabFeedback.nudge.archive")}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

export default BudgetNudge;
