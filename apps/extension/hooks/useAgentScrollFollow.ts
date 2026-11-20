import { useLayoutEffect, useRef } from "react";

const BOTTOM_THRESHOLD_PX = 16;

export function useAgentScrollFollow(isOpen: boolean, sessionId: string | null) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!isOpen || !viewport || !content) return;

    let following = true;
    let lastScrollTop = viewport.scrollTop;

    const updateFollowing = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      if (scrollTop === lastScrollTop) return;
      lastScrollTop = scrollTop;
      const distance = scrollHeight - clientHeight - scrollTop;
      following = distance <= BOTTOM_THRESHOLD_PX;
    };

    const followLatest = () => {
      if (following) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
        lastScrollTop = viewport.scrollTop;
      }
    };

    viewport.addEventListener("scroll", updateFollowing, { passive: true });
    // Use the last scroll position's intent when content grows, before the new
    // height makes someone who was at the bottom appear to have scrolled away.
    const observer = new ResizeObserver(followLatest);
    observer.observe(content);
    observer.observe(viewport);
    followLatest();

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateFollowing);
    };
  }, [isOpen, sessionId]);

  return { viewportRef, contentRef };
}
