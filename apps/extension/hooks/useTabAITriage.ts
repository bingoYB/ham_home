/**
 * useTabAITriage - AI tidy-up: ask for suggestions on the current snapshot, keep
 * track of the selected tabs and apply them. Kept tabs restart their idle time;
 * everything that closes goes through the archive with the reason "triage".
 */
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { getBackgroundService } from "@/lib/services";
import { TabTriageError, tabTriageService } from "@/lib/services/tab-triage-service";
import {
  getDefaultTriageSelection,
  groupTriageSuggestions,
  type TriageGroup,
} from "@/lib/tabs/tab-triage.utils";
import type {
  OpenTabInfo,
  OpenTabsSnapshot,
  TabTriageDestination,
  TabTriageResult,
} from "@/types";
import { useAddToWorkspace } from "./useAddToWorkspace";

export type TabTriageStatus = "idle" | "loading" | "ready" | "notConfigured" | "error";

export interface UseTabAITriageResult {
  status: TabTriageStatus;
  error: string | null;
  result: TabTriageResult | null;
  groups: TriageGroup[];
  selected: ReadonlySet<number>;
  toggle: (tabIds: number[], selected: boolean) => void;
  run: () => Promise<void>;
  applying: boolean;
  apply: () => Promise<boolean>;
}

export function useTabAITriage(snapshot: OpenTabsSnapshot | null): UseTabAITriageResult {
  const { t } = useTranslation("bookmark");
  const { workspaces, addPages } = useAddToWorkspace();
  const [status, setStatus] = useState<TabTriageStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TabTriageResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  const groups = useMemo(
    () => (result ? groupTriageSuggestions(result.suggestions) : []),
    [result],
  );

  const run = useCallback(async () => {
    if (!snapshot) return;
    setStatus("loading");
    setError(null);
    try {
      const next = await tabTriageService.suggest(snapshot);
      setResult(next);
      setSelected(getDefaultTriageSelection(next.suggestions));
      setStatus("ready");
    } catch (cause) {
      if (cause instanceof TabTriageError && cause.code === "not-configured") {
        setStatus("notConfigured");
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }, [snapshot]);

  const toggle = useCallback((tabIds: number[], isSelected: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of tabIds) {
        if (isSelected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const apply = useCallback(async () => {
    if (!result) return false;
    const service = getBackgroundService();
    const tabsById = new Map(snapshot?.tabs.map((tab) => [tab.tabId, tab]) ?? []);
    const pick = (destination: TabTriageDestination) =>
      result.suggestions.filter(
        (item) => item.destination === destination && selected.has(item.tabId),
      );
    setApplying(true);
    try {
      const counts = { kept: 0, queued: 0, bookmarked: 0, archived: 0 };

      // Still relevant: restart their idle time, so auto archive leaves them alone
      const keepIds = pick("keep").filter((item) => !item.local).map((item) => item.tabId);
      if (keepIds.length > 0) {
        await service.renewTabs(keepIds);
        counts.kept = keepIds.length;
      }

      const bookmarks = pick("bookmark");
      if (bookmarks.length > 0) {
        const ids = bookmarks.map((item) => item.tabId);
        const categoryByTabId = Object.fromEntries(
          bookmarks.flatMap((item) => (item.categoryId ? [[item.tabId, item.categoryId]] : [])),
        );
        const saved = await service.bookmarkTabs(ids, { categoryByTabId });
        counts.bookmarked = saved.created + saved.existing;
        counts.archived += (await service.archiveTabs(ids, "triage")).archived;
      }

      const byWorkspace = new Map<string, number[]>();
      for (const item of pick("workspace")) {
        const name = item.workspaceName?.trim() || "";
        byWorkspace.set(name, [...(byWorkspace.get(name) ?? []), item.tabId]);
      }
      for (const [name, ids] of byWorkspace) {
        const pages = ids
          .map((id) => tabsById.get(id))
          .filter((tab): tab is OpenTabInfo => !!tab)
          .map((tab) => ({ title: tab.title, url: tab.url, favicon: tab.favicon }));
        if (!name || pages.length === 0) continue;
        const existing = workspaces.find(
          (workspace) => workspace.name.trim().toLowerCase() === name.toLowerCase(),
        );
        await addPages(existing ? { workspaceId: existing.id } : { name }, pages);
        counts.archived += (await service.archiveTabs(ids, "triage")).archived;
      }

      const readLaterIds = pick("readLater").map((item) => item.tabId);
      if (readLaterIds.length > 0) {
        const queued = await service.readLaterTabs(readLaterIds, "triage", { closeTabs: true });
        counts.queued = queued.added + queued.alreadyQueued;
      }

      const closeIds = pick("close").map((item) => item.tabId);
      if (closeIds.length > 0) {
        counts.archived += (await service.archiveTabs(closeIds, "triage")).archived;
      }

      toast.success(t("tabCenter.aiTriage.applied", counts));
      setResult(null);
      setStatus("idle");
      return true;
    } catch (cause) {
      console.error("[useTabAITriage] apply failed:", cause);
      toast.error(t("tabCenter.actionFailed"));
      return false;
    } finally {
      setApplying(false);
    }
  }, [addPages, result, selected, snapshot, t, workspaces]);

  return { status, error, result, groups, selected, toggle, run, applying, apply };
}
