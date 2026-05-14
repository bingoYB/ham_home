export const BOOKMARK_CATEGORY_COLOR =
  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";

export function getBookmarkHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
