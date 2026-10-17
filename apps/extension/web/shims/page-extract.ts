/**
 * Replaces `@/utils/page-extract` in the web build.
 *
 * Extraction reads the page the content script runs in, which the web app never has. Keeping the
 * real module would also pull its readability and HTML-to-Markdown parsers (about 270 KB) into a
 * bundle that cannot call them.
 */
import type { PageContent } from "@/types";
import { UnsupportedOnWebError } from "./unsupported";

export async function extractPageContent(): Promise<PageContent | null> {
  throw new UnsupportedOnWebError("extractPageContent");
}

export function extractCleanHtml(): string {
  throw new UnsupportedOnWebError("extractCleanHtml");
}
