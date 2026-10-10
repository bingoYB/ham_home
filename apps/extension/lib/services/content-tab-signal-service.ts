/**
 * Messages a content script sends about its own tab. The background resolves the tab
 * from the sender, so the page never needs to know its tab ID.
 * Content script only.
 */
import { browser } from "wxt/browser";
import { TAB_MESSAGES } from "@/lib/tabs/tab-messages";

function send(message: Record<string, unknown>): void {
  void browser.runtime.sendMessage(message).catch(() => undefined);
}

export const contentTabSignalService = {
  /** A HamHome save flow is open (true) or closed (false) in this tab */
  setBusy(busy: boolean): void {
    send({ type: TAB_MESSAGES.busy, busy });
  },

  /** Put this tab in Read later; it closes as configured and shows the usual toast */
  readLaterThisTab(): void {
    send({ type: TAB_MESSAGES.readLaterThisTab });
  },
};
