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

export function buildDuplicateIssueMap(
  bookmarks: LocalBookmark[],
): Map<string, string[]> {
  const groups = new Map<string, LocalBookmark[]>();
  for (const bookmark of bookmarks) {
    const normalized = normalizeHealthUrl(bookmark.url);
    if (!normalized) continue;
    const group = groups.get(normalized) ?? [];
    group.push(bookmark);
    groups.set(normalized, group);
  }

  const result = new Map<string, string[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => a.createdAt - b.createdAt);
    const canonicalId = ordered[0].id;
    for (const bookmark of ordered) {
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
