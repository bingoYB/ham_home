/**
 * useOpenTabsList - view state of the tab center's open tabs list: search, grouping,
 * sorting, filters, rows for the virtual list and the selection (tab IDs).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOpenTabsRows,
  type OpenTabsFilter,
  type OpenTabsGroupBy,
  type OpenTabsRow,
  type OpenTabsSort,
} from "@/lib/tabs/tab-view.utils";
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";

export interface UseOpenTabsListResult {
  query: string;
  setQuery: (query: string) => void;
  groupBy: OpenTabsGroupBy;
  setGroupBy: (groupBy: OpenTabsGroupBy) => void;
  sort: OpenTabsSort;
  setSort: (sort: OpenTabsSort) => void;
  filters: ReadonlySet<OpenTabsFilter>;
  toggleFilter: (filter: OpenTabsFilter) => void;
  setFilters: (filters: OpenTabsFilter[]) => void;
  rows: OpenTabsRow[];
  visibleTabIds: number[];
  selected: ReadonlySet<number>;
  toggleSelect: (tabId: number) => void;
  setSelected: (tabIds: number[], selected: boolean) => void;
  selectOnly: (tabIds: number[]) => void;
  clearSelection: () => void;
  selectedTabs: OpenTabInfo[];
}

export function useOpenTabsList(snapshot: OpenTabsSnapshot | null): UseOpenTabsListResult {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<OpenTabsGroupBy>("window");
  const [sort, setSort] = useState<OpenTabsSort>("position");
  const [filters, setFilterSet] = useState<Set<OpenTabsFilter>>(new Set());
  const [selected, setSelectedSet] = useState<Set<number>>(new Set());

  const rows = useMemo(
    () =>
      snapshot
        ? buildOpenTabsRows(snapshot, { groupBy, sort, filters, query, now: snapshot.generatedAt })
        : [],
    [filters, groupBy, query, snapshot, sort],
  );

  const visibleTabIds = useMemo(
    () => rows.flatMap((row) => (row.type === "tab" ? [row.tab.tabId] : [])),
    [rows],
  );

  // Closed tabs drop out of the selection
  useEffect(() => {
    if (!snapshot) return;
    const open = new Set(snapshot.tabs.map((tab) => tab.tabId));
    setSelectedSet((current) => {
      const next = new Set(Array.from(current).filter((id) => open.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [snapshot]);

  const toggleFilter = useCallback((filter: OpenTabsFilter) => {
    setFilterSet((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }, []);

  const setFilters = useCallback((next: OpenTabsFilter[]) => setFilterSet(new Set(next)), []);

  const toggleSelect = useCallback((tabId: number) => {
    setSelectedSet((current) => {
      const next = new Set(current);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  }, []);

  const setSelected = useCallback((tabIds: number[], isSelected: boolean) => {
    setSelectedSet((current) => {
      const next = new Set(current);
      for (const id of tabIds) {
        if (isSelected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const selectOnly = useCallback((tabIds: number[]) => setSelectedSet(new Set(tabIds)), []);
  const clearSelection = useCallback(() => setSelectedSet(new Set()), []);

  const selectedTabs = useMemo(
    () => (snapshot?.tabs ?? []).filter((tab) => selected.has(tab.tabId)),
    [selected, snapshot],
  );

  return {
    query,
    setQuery,
    groupBy,
    setGroupBy,
    sort,
    setSort,
    filters,
    toggleFilter,
    setFilters,
    rows,
    visibleTabIds,
    selected,
    toggleSelect,
    setSelected,
    selectOnly,
    clearSelection,
    selectedTabs,
  };
}
