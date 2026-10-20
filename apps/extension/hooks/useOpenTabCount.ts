/**
 * useOpenTabCount - number of tabs open in normal windows, for the sidebar badge.
 * Cheap on purpose: one tabs.query per (debounced) tab event.
 */
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

export function useOpenTabCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let timer: number | null = null;
    let cancelled = false;
    const load = async () => {
      try {
        const tabs = await browser.tabs.query({ windowType: "normal" });
        if (!cancelled) setCount(tabs.filter((tab) => !tab.incognito).length);
      } catch {
        // tabs API unavailable in this context
      }
    };
    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 300);
    };

    void load();
    browser.tabs.onCreated.addListener(schedule);
    browser.tabs.onRemoved.addListener(schedule);
    browser.tabs.onAttached.addListener(schedule);
    browser.tabs.onDetached.addListener(schedule);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      browser.tabs.onCreated.removeListener(schedule);
      browser.tabs.onRemoved.removeListener(schedule);
      browser.tabs.onAttached.removeListener(schedule);
      browser.tabs.onDetached.removeListener(schedule);
    };
  }, []);

  return count;
}
