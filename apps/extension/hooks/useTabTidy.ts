/**
 * useTabTidy - rule-based tidy-up: suggestions for the current snapshot, which tabs
 * are selected, and applying them. Every close goes through the archive with the
 * reason "triage".
 */
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { getBackgroundService } from "@/lib/services";
import { buildTidySuggestions, type TidySuggestions } from "@/lib/tabs/tab-tidy.utils";
import type { OpenTabsSnapshot } from "@/types";
import { useAddToWorkspace } from "./useAddToWorkspace";

function allTabIds(suggestions: TidySuggestions): number[] {
  return [
    ...suggestions.duplicates,
    ...suggestions.lowValue,
    ...suggestions.readLater,
    ...suggestions.archive,
    ...suggestions.workspaces.flatMap((group) => group.tabIds),
  ];
}

export interface UseTabTidyResult {
  suggestions: TidySuggestions;
  selected: ReadonlySet<number>;
  toggle: (tabIds: number[], selected: boolean) => void;
  reset: () => void;
  applying: boolean;
  apply: () => Promise<boolean>;
}

export function useTabTidy(snapshot: OpenTabsSnapshot | null): UseTabTidyResult {
  const { t } = useTranslation("bookmark");
  const { addPages } = useAddToWorkspace();
  const suggestions = useMemo(
    () =>
      snapshot
        ? buildTidySuggestions(snapshot, snapshot.generatedAt)
        : { duplicates: [], lowValue: [], readLater: [], archive: [], workspaces: [] },
    [snapshot],
  );
  const [deselected, setDeselected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  const selected = useMemo(
    () => new Set(allTabIds(suggestions).filter((id) => !deselected.has(id))),
    [deselected, suggestions],
  );

  const toggle = useCallback((tabIds: number[], isSelected: boolean) => {
    setDeselected((current) => {
      const next = new Set(current);
      for (const id of tabIds) {
        if (isSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setDeselected(new Set()), []);

  const apply = useCallback(async () => {
    const pick = (ids: number[]) => ids.filter((id) => selected.has(id));
    const service = getBackgroundService();
    const tabsById = new Map(snapshot?.tabs.map((tab) => [tab.tabId, tab]) ?? []);
    setApplying(true);
    try {
      let archived = 0;
      let queued = 0;
      for (const group of suggestions.workspaces) {
        const ids = pick(group.tabIds);
        if (ids.length === 0) continue;
        await addPages(
          { name: group.name },
          ids.map((id) => tabsById.get(id)).filter(Boolean).map((tab) => ({
            title: tab!.title,
            url: tab!.url,
            favicon: tab!.favicon,
          })),
        );
        archived += (await service.archiveTabs(ids, "triage")).archived;
      }
      const readLaterIds = pick(suggestions.readLater);
      if (readLaterIds.length > 0) {
        const result = await service.readLaterTabs(readLaterIds, "triage", { closeTabs: true });
        queued += result.added + result.alreadyQueued;
      }
      const archiveIds = pick([...suggestions.duplicates, ...suggestions.lowValue, ...suggestions.archive]);
      if (archiveIds.length > 0) {
        archived += (await service.archiveTabs(archiveIds, "triage")).archived;
      }
      toast.success(t("tabCenter.tidyUp.applied", { archived, queued }));
      setDeselected(new Set());
      return true;
    } catch (error) {
      console.error("[useTabTidy] apply failed:", error);
      toast.error(t("tabCenter.actionFailed"));
      return false;
    } finally {
      setApplying(false);
    }
  }, [addPages, selected, snapshot, suggestions, t]);

  return { suggestions, selected, toggle, reset, applying, apply };
}
