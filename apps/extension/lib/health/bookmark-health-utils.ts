import {
  buildDuplicateGroups,
  type DuplicateGroup,
} from "@/lib/bookmarks/bookmark-dedup";
import type {
  BookmarkHealthRecord,
  BookmarkHealthStatus,
  LocalBookmark,
} from "@/types";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "ref",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

/**
 * 健康中心只处理普通书签收藏。
 * 图片 / 选中文字剪藏会以 LocalBookmark 承载，但它们是内容收藏，
 * 不应进入链接健康、重复项、统计或定期扫描。
 */
export function filterBookmarkHealthTargets(
  bookmarks: LocalBookmark[],
  subjectIndex: Readonly<Record<string, unknown>>,
): LocalBookmark[] {
  return bookmarks.filter((bookmark) =>
    !Object.prototype.hasOwnProperty.call(subjectIndex, bookmark.id),
  );
}

export function normalizeHealthUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function classifyHttpStatus(
  httpStatus: number,
  redirected: boolean,
): BookmarkHealthStatus {
  if (httpStatus >= 200 && httpStatus < 400) {
    return redirected ? "redirected" : "healthy";
  }
  if (httpStatus === 401 || httpStatus === 403) return "auth_required";
  if (httpStatus === 404 || httpStatus === 410) return "broken";
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus >= 500) return "server_error";
  return "unsupported";
}

/**
 * 体检中心的重复分组
 *
 * 比同步更宽松（忽略 hash、参数顺序），命中后由用户确认再清理，
 * 所以允许把 #section 这类变体也算作重复。
 */
export function buildHealthDuplicateGroups(
  bookmarks: LocalBookmark[],
): DuplicateGroup<LocalBookmark>[] {
  return buildDuplicateGroups(bookmarks, normalizeHealthUrl);
}

export function buildDuplicateIssueMap(
  bookmarks: LocalBookmark[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const group of buildHealthDuplicateGroups(bookmarks)) {
    const canonicalId = group.canonical.id;
    for (const bookmark of [group.canonical, ...group.duplicates]) {
      result.set(bookmark.id, [`duplicate_url:${canonicalId}`]);
    }
  }
  return result;
}

export function appendLocalIssueCodes(
  record: BookmarkHealthRecord,
  bookmark: LocalBookmark,
  duplicateIssues: Map<string, string[]>,
): BookmarkHealthRecord {
  const issues = new Set(record.issueCodes);
  if (!bookmark.title.trim()) issues.add("missing_title");
  if (!bookmark.description.trim()) issues.add("missing_description");
  for (const issue of duplicateIssues.get(bookmark.id) ?? []) issues.add(issue);
  return { ...record, issueCodes: Array.from(issues) };
}
