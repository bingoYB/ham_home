/**
 * useOpenTabsList - view state of the tab center's open tabs list: search, grouping,
 * sorting, filters, rows for the virtual list and the selection (tab IDs).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOpenTabsRows,
  getSelectedVisibleTabs,
  type OpenTabsFilter,
  type OpenTabsGroupBy,
  type OpenTabsRow,
  type OpenTabsSort,
} from "@/lib/tabs/tab-view.utils";
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";
import { retainVisibleSelection, toggleAllVisible } from "@/utils/bookmark-selection.utils";

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
  /** Selects every given (visible) tab, or clears when they are all selected already */
  toggleSelectAll: (tabIds: readonly number[]) => void;
  clearSelection: () => void;
  /** Selected tabs that are currently visible, in list order: the target of batch actions */
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

  // Tabs that are closed or hidden by the search / filters drop out of the selection,
  // so the selection never covers tabs the user cannot see
  useEffect(() => {
    setSelectedSet((current) => retainVisibleSelection(current, visibleTabIds));
  }, [visibleTabIds]);

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

  const toggleSelectAll = useCallback((tabIds: readonly number[]) => {
    setSelectedSet((current) => toggleAllVisible(current, tabIds));
  }, []);

  const selectedTabs = useMemo(() => getSelectedVisibleTabs(rows, selected), [rows, selected]);

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
    toggleSelectAll,
    clearSelection,
    selectedTabs,
  };
}
