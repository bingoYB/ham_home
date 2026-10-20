/**
 * useTabBusySignal - tells the background that a HamHome save flow is open in this
 * tab, so auto archive and auto make room never close it mid-save.
 * Content script only; the signal is renewed while the flow stays open.
 */
import { useEffect } from "react";
import { contentTabSignalService } from "@/lib/services/content-tab-signal-service";
import { TAB_BUSY_TTL_MS } from "@/lib/tabs/tab-messages";

const RENEW_INTERVAL_MS = TAB_BUSY_TTL_MS / 2;

export function useTabBusySignal(busy: boolean): void {
  useEffect(() => {
    if (!busy) return;
    contentTabSignalService.setBusy(true);
    const timer = window.setInterval(() => contentTabSignalService.setBusy(true), RENEW_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      contentTabSignalService.setBusy(false);
    };
  }, [busy]);
}
