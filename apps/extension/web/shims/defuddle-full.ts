/**
 * Replaces `defuddle/full` in the web build (about 750 KB of HTML-to-Markdown conversion).
 *
 * The converter only ever gets HTML captured from a live page. The web build has no page to
 * capture and edits already-saved Markdown, so the only valid input is an empty string.
 */
import { UnsupportedOnWebError } from "./unsupported";

export function createMarkdownContent(html: string, _url?: string): string {
  if (html) throw new UnsupportedOnWebError("defuddle.createMarkdownContent");
  return "";
}
