/**
 * Message types exchanged between the background and content scripts for the tab
 * lifecycle features. Kept in one place so both sides agree on the names.
 */
export const TAB_MESSAGES = {
  /** background -> content: is a live content script there? replies { ok: true } */
  ping: "HAMHOME_PING",
  /** background -> content: extract ReadingPageContent */
  extractReading: "EXTRACT_READING_CONTENT",
  /** background -> content: show a toast or a budget nudge, replies { ok } */
  feedback: "HAMHOME_TAB_FEEDBACK",
  /** background -> content: does the page hold unsubmitted input? replies { dirty } */
  queryDirtyForm: "HAMHOME_QUERY_DIRTY_FORM",
  /** background -> content: text of the link the context menu was opened on */
  contextLink: "HAMHOME_GET_CONTEXT_LINK",
  /** content -> background: a HamHome save flow started or ended in this tab */
  busy: "HAMHOME_TAB_BUSY",
  /** content -> background: read this tab later (from the in-page save overlay) */
  readLaterThisTab: "HAMHOME_READ_LATER_THIS_TAB",
  /** background -> content: this page was opened from Read later (ReadingSession) */
  readingSession: "HAMHOME_READING_SESSION",
} as const;

/** A save overlay left open keeps the tab protected for this long, renewed while open */
export const TAB_BUSY_TTL_MS = 15 * 60 * 1000;
