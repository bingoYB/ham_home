/**
 * Hands the "opened from Read later" signal from the content script message
 * listener to the React UI (one pending value while the UI mounts).
 */
import type { ReadingSession } from "@/types";

type Listener = (session: ReadingSession) => void;

let listener: Listener | null = null;
let pending: ReadingSession | null = null;

export const readingSessionBus = {
  emit(session: ReadingSession): void {
    if (listener) listener(session);
    else pending = session;
  },

  subscribe(next: Listener): () => void {
    listener = next;
    if (pending) {
      const session = pending;
      pending = null;
      queueMicrotask(() => listener?.(session));
    }
    return () => {
      if (listener === next) listener = null;
    };
  },
};
