/**
 * Hands in-page feedback (undo toasts, budget nudges) from the content script message
 * listener to the React UI. Like the save flow bus, one message is kept while the UI
 * is still mounting, so feedback sent right after injection is not lost.
 */
import type { TabFeedbackMessage } from "@/types";

type FeedbackListener = (feedback: TabFeedbackMessage) => void;

let listener: FeedbackListener | null = null;
let pending: TabFeedbackMessage | null = null;

export const tabFeedbackBus = {
  emit(feedback: TabFeedbackMessage): void {
    if (listener) {
      listener(feedback);
      return;
    }
    pending = feedback;
  },

  subscribe(next: FeedbackListener): () => void {
    listener = next;
    if (pending) {
      const feedback = pending;
      pending = null;
      queueMicrotask(() => {
        if (listener) listener(feedback);
        else pending = feedback;
      });
    }
    return () => {
      if (listener === next) listener = null;
    };
  },
};
