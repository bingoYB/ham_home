/**
 * TabFeedbackLayer - renders lifecycle feedback sent by the background:
 * read later undo toast, "moved to archive" undo toast and the budget nudge.
 */
import { useTranslation } from "react-i18next";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@hamhome/ui";
import { useTabFeedback } from "@/hooks/useTabFeedback";
import type { PanelPosition } from "@/types";
import { BudgetNudge } from "./BudgetNudge";
import { FeedbackCard } from "./FeedbackCard";
import { ReadLaterToast } from "./ReadLaterToast";

interface TabFeedbackLayerProps {
  /** Side of the edge panel; feedback goes to the other bottom corner */
  panelPosition: PanelPosition;
}

export function TabFeedbackLayer({ panelPosition }: TabFeedbackLayerProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const state = useTabFeedback();
  const { feedback } = state;
  if (!feedback) return null;

  const side = panelPosition === "right" ? "left" : "right";
  const closeLabel = t("common:common.close");

  if (feedback.kind === "budgetNudge") {
    return (
      <FeedbackCard
        key={state.feedbackId}
        side={side}
        role="region"
        label={t("bookmark:tabFeedback.nudge.label")}
        closeLabel={closeLabel}
        testId="budget-nudge"
        onClose={state.dismiss}
        onHoldChange={state.hold}
      >
        <BudgetNudge
          openCount={feedback.openCount}
          over={feedback.over}
          candidates={feedback.candidates}
          hideTitles={feedback.hideTitles}
          handledTabIds={state.handledTabIds}
          status={state.status}
          onReadLater={(tabId) => void state.readLaterTab(tabId)}
          onArchive={(tabId) => void state.archiveTab(tabId)}
          onReviewAll={state.openTabCenter}
          onNotToday={() => void state.dismissToday()}
          onSnooze={() => void state.snoozeHour()}
        />
      </FeedbackCard>
    );
  }

  if (feedback.kind === "readLater") {
    return (
      <FeedbackCard
        key={state.feedbackId}
        side={side}
        role="status"
        label={t("bookmark:tabFeedback.readLater.added")}
        closeLabel={closeLabel}
        testId="read-later"
        onClose={state.dismiss}
        onHoldChange={state.hold}
      >
        <ReadLaterToast
          title={feedback.title}
          alreadyQueued={feedback.alreadyQueued}
          addedAt={feedback.addedAt}
          canUndo={!!feedback.undoToken}
          noteEditable={feedback.noteEditable}
          status={state.status}
          onUndo={() => void state.undo()}
          onRenew={() => void state.renew()}
          onSaveNote={(note) => void state.saveNote(note)}
          onHoldChange={state.hold}
        />
      </FeedbackCard>
    );
  }

  const message =
    state.status === "undone"
      ? t("bookmark:tabFeedback.undone")
      : state.status === "failed"
        ? t("bookmark:tabFeedback.failed")
        : feedback.count === 1 && feedback.titles[0]
          ? t("bookmark:tabFeedback.archived.single", { title: feedback.titles[0] })
          : t("bookmark:tabFeedback.archived.multiple", { count: feedback.count });

  return (
    <FeedbackCard
      key={state.feedbackId}
      side={side}
      role="status"
      label={t("bookmark:tabFeedback.archived.label")}
      closeLabel={closeLabel}
      testId="archived"
      onClose={state.dismiss}
      onHoldChange={state.hold}
    >
      <div className="flex items-center gap-2">
        <Archive className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm text-foreground" title={message}>
          {message}
        </p>
        {feedback.undoToken && state.status !== "undone" && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 px-2.5 text-xs"
            disabled={state.status === "working"}
            onClick={() => void state.undo()}
          >
            {state.status === "working" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {t("bookmark:tabFeedback.undo")}
          </Button>
        )}
      </div>
    </FeedbackCard>
  );
}

export default TabFeedbackLayer;
