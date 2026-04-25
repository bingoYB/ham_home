import type { WorkspaceTabGroup, WorkspaceTabPage } from "@/types";

export const ALL_CATEGORIES = "__all__";
export const UNCATEGORIZED = "__uncategorized__";
export const MANY_PAGES_THRESHOLD = 8;

export function getWorkspaceTabGroupKey(group: WorkspaceTabGroup): string {
  return `${group.windowId ?? -1}:${group.id}`;
}

export function getWorkspacePageGroupKey(page: WorkspaceTabPage): string | null {
  if (page.tabGroupId == null) return null;
  return `${page.windowId ?? -1}:${page.tabGroupId}`;
}

export function filterWorkspaceTabGroups(
  tabGroups: WorkspaceTabGroup[] | undefined,
  pages: WorkspaceTabPage[],
): WorkspaceTabGroup[] | undefined {
  if (!tabGroups?.length) return undefined;
  const groupKeys = new Set(
    pages
      .map(getWorkspacePageGroupKey)
      .filter((key): key is string => key != null),
  );
  const filtered = tabGroups.filter((group) =>
    groupKeys.has(getWorkspaceTabGroupKey(group)),
  );
  return filtered.length ? filtered : undefined;
}

export function formatWorkspaceDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function formatWorkspaceDateTime(timestamp?: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
