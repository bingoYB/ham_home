/**
 * useTabFeedback - state of the in-page lifecycle feedback (content script only).
 *
 * Receives undo toasts and budget nudges from the background, closes them after
 * 8 seconds unless the user is interacting, and runs their actions through the
 * background service. Never moves focus into the page.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getBackgroundService } from "@/lib/services";
import { tabFeedbackBus } from "@/utils/tab-feedback-bus";
import type { TabFeedbackMessage } from "@/types";

export const TAB_FEEDBACK_DURATION_MS = 8000;

export type TabFeedbackStatus = "idle" | "working" | "undone" | "done" | "failed";

export interface UseTabFeedbackResult {
  feedback: TabFeedbackMessage | null;
  /** Bumped for every new message, used as React key */
  feedbackId: number;
  status: TabFeedbackStatus;
  /** Tab IDs from a nudge that were handled already */
  handledTabIds: ReadonlySet<number>;
  dismiss: () => void;
  /** Stop / restart the auto close timer (hover, focus, typing a note) */
  hold: (held: boolean) => void;
  undo: () => Promise<void>;
  renew: () => Promise<void>;
  saveNote: (note: string) => Promise<void>;
  readLaterTab: (tabId: number) => Promise<void>;
  archiveTab: (tabId: number) => Promise<void>;
  openTabCenter: () => void;
  dismissToday: () => Promise<void>;
  snoozeHour: () => Promise<void>;
}

export function useTabFeedback(): UseTabFeedbackResult {
  const [feedback, setFeedback] = useState<TabFeedbackMessage | null>(null);
  const [feedbackId, setFeedbackId] = useState(0);
  const [status, setStatus] = useState<TabFeedbackStatus>("idle");
  const [handledTabIds, setHandledTabIds] = useState<Set<number>>(new Set());
  const [held, setHeld] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setFeedback(null);
    setStatus("idle");
    setHandledTabIds(new Set());
    setHeld(false);
  }, [clearTimer]);

  useEffect(
    () =>
      tabFeedbackBus.subscribe((next) => {
        setFeedback(next);
        setFeedbackId((id) => id + 1);
        setStatus("idle");
        setHandledTabIds(new Set());
        setHeld(false);
      }),
    [],
  );

  // Auto close, unless the user is hovering, focused inside or typing
  useEffect(() => {
    clearTimer();
    if (!feedback || held || status === "working") return;
    timerRef.current = window.setTimeout(dismiss, TAB_FEEDBACK_DURATION_MS);
    return clearTimer;
  }, [feedback, feedbackId, held, status, dismiss, clearTimer]);

  // Esc closes without swallowing the key from the page
  useEffect(() => {
    if (!feedback) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [feedback, dismiss]);

  const runAction = useCallback(
    async (action: () => Promise<unknown>, after: TabFeedbackStatus = "done") => {
      setStatus("working");
      try {
        await action();
        setStatus(after);
      } catch (error) {
        console.warn("[HamHome] Tab feedback action failed:", error);
        setStatus("failed");
      }
    },
    [],
  );

  const undo = useCallback(async () => {
    const token = feedback && "undoToken" in feedback ? feedback.undoToken : undefined;
    if (!token) return;
    await runAction(async () => {
      const ok = await getBackgroundService().undoTabAction(token);
      if (!ok) throw new Error("undo-expired");
    }, "undone");
  }, [feedback, runAction]);

  const renew = useCallback(async () => {
    if (feedback?.kind !== "readLater") return;
    await runAction(() => getBackgroundService().readLaterRequeue([feedback.bookmarkId]));
  }, [feedback, runAction]);

  const saveNote = useCallback(
    async (note: string) => {
      if (feedback?.kind !== "readLater") return;
      await runAction(() =>
        getBackgroundService().readLaterUpdateNote(feedback.bookmarkId, note),
      );
    },
    [feedback, runAction],
  );

  const markHandled = useCallback((tabId: number) => {
    setHandledTabIds((current) => new Set(current).add(tabId));
  }, []);

  const readLaterTab = useCallback(
    async (tabId: number) => {
      await runAction(async () => {
        await getBackgroundService().readLaterTabs([tabId], "triage", { closeTabs: true });
        markHandled(tabId);
      }, "idle");
    },
    [markHandled, runAction],
  );

  const archiveTab = useCallback(
    async (tabId: number) => {
      await runAction(async () => {
        await getBackgroundService().archiveTabs([tabId], "budget");
        markHandled(tabId);
      }, "idle");
    },
    [markHandled, runAction],
  );

  const openTabCenter = useCallback(() => {
    void getBackgroundService().openOptionsPage("tabs");
    dismiss();
  }, [dismiss]);

  const dismissToday = useCallback(async () => {
    await getBackgroundService().dismissBudgetNudge("today").catch(() => undefined);
    dismiss();
  }, [dismiss]);

  const snoozeHour = useCallback(async () => {
    await getBackgroundService().dismissBudgetNudge("hour").catch(() => undefined);
    dismiss();
  }, [dismiss]);

  return {
    feedback,
    feedbackId,
    status,
    handledTabIds,
    dismiss,
    hold: setHeld,
    undo,
    renew,
    saveNote,
    readLaterTab,
    archiveTab,
    openTabCenter,
    dismissToday,
    snoozeHour,
  };
}
