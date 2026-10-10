/**
 * useReadingDoneBar - "Finished reading?" for pages opened from Read later
 * (content script only). Appears once, when the reader gets near the end of the
 * page or is about to leave it (pointer leaving through the top of the window).
 * Other pages never talk to the background for this.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import { getBackgroundService } from "@/lib/services";
import { readingSessionBus } from "@/utils/reading-session-bus";
import type { ReadingSession } from "@/types";

const NEAR_END_RATIO = 0.85;
const DONE_VISIBLE_MS = 2500;

export type ReadingDoneState = "idle" | "working" | "read" | "kept" | "failed";

export interface UseReadingDoneBarResult {
  session: ReadingSession | null;
  visible: boolean;
  state: ReadingDoneState;
  markRead: () => Promise<void>;
  keep: () => Promise<void>;
  dismiss: () => void;
}

function stillOnArticle(session: ReadingSession): boolean {
  return normalizeBookmarkUrl(window.location.href) === normalizeBookmarkUrl(session.url);
}

export function useReadingDoneBar(): UseReadingDoneBarResult {
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<ReadingDoneState>("idle");
  const shownRef = useRef(false);

  // The background tells pages opened from Read later once they finished loading
  useEffect(() => readingSessionBus.subscribe(setSession), []);

  useEffect(() => {
    if (!session) return;
    const reveal = () => {
      if (shownRef.current || !stillOnArticle(session)) return;
      shownRef.current = true;
      setVisible(true);
    };
    const onScroll = () => {
      const element = document.scrollingElement ?? document.documentElement;
      const max = element.scrollHeight - window.innerHeight;
      if (max > 0 && element.scrollTop / max >= NEAR_END_RATIO) reveal();
    };
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget && event.clientY <= 0) reveal();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [session]);

  // Confirmation disappears on its own
  useEffect(() => {
    if (state !== "read" && state !== "kept") return;
    const timer = window.setTimeout(() => setVisible(false), DONE_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const run = useCallback(async (action: () => Promise<unknown>, done: ReadingDoneState) => {
    setState("working");
    try {
      await action();
      setState(done);
    } catch {
      setState("failed");
    }
  }, []);

  const markRead = useCallback(async () => {
    if (!session) return;
    await run(() => getBackgroundService().readLaterMarkRead([session.bookmarkId]), "read");
  }, [run, session]);

  const keep = useCallback(async () => {
    if (!session) return;
    await run(async () => {
      const service = getBackgroundService();
      await service.readLaterKeep([session.bookmarkId], true);
      await service.readLaterMarkRead([session.bookmarkId]);
    }, "kept");
  }, [run, session]);

  const dismiss = useCallback(() => setVisible(false), []);

  return { session, visible, state, markRead, keep, dismiss };
}
