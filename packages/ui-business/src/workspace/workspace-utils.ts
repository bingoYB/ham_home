/**
 * workspace-utils - 工作空间 UI 工具函数（纯函数，无平台依赖）
 */
import type { WorkspaceTabGroupData, WorkspaceTabPageData } from "./types";

export const MANY_PAGES_THRESHOLD = 8;

export function getWorkspaceTabGroupKey(group: WorkspaceTabGroupData): string {
  return `${group.windowId ?? -1}:${group.id}`;
}

export function getWorkspacePageGroupKey(
  page: WorkspaceTabPageData,
): string | null {
  if (page.tabGroupId == null) return null;
  return `${page.windowId ?? -1}:${page.tabGroupId}`;
}

export function filterWorkspaceTabGroups(
  tabGroups: WorkspaceTabGroupData[] | undefined,
  pages: WorkspaceTabPageData[],
): WorkspaceTabGroupData[] | undefined {
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
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
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

/** Category badge color classes */
export const CATEGORY_COLOR =
  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
