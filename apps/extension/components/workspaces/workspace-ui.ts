import type { Workspace } from "@/types";

export const ALL_CATEGORIES = "__all__";
export const UNCATEGORIZED = "__uncategorized__";
export const MANY_PAGES_THRESHOLD = 8;

export function formatWorkspaceDate(timestamp?: number): string {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function getMainDomains(workspace: Workspace): string[] {
  return Array.from(
    new Set(workspace.pages.map((page) => page.domain).filter(Boolean)),
  ).slice(0, 4);
}
