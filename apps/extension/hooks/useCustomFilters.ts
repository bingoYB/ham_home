import { useState, useEffect, useCallback } from "react";
import { configStorage } from "@/lib/storage/config-storage";
import type { CustomFilter, FilterCondition } from "@/types";

export interface UseCustomFiltersReturn {
  customFilters: CustomFilter[];
  filterDialogOpen: boolean;
  editingFilter: CustomFilter | null;
  deleteFilterTarget: CustomFilter | null;
  setFilterDialogOpen: (val: boolean) => void;
  setEditingFilter: (val: CustomFilter | null) => void;
  setDeleteFilterTarget: (val: CustomFilter | null) => void;
  onAddFilter: () => void;
  onEditFilter: (filter: CustomFilter) => void;
  onSaveFilter: (name: string, conditions: FilterCondition[]) => Promise<void>;
  onDeleteFilter: () => Promise<void>;
}

export function useCustomFilters(): UseCustomFiltersReturn {
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | null>(null);
  const [deleteFilterTarget, setDeleteFilterTarget] =
    useState<CustomFilter | null>(null);

  useEffect(() => {
    const loadCustomFilters = async () => {
      try {
        const filters = await configStorage.getCustomFilters();
        setCustomFilters(filters);
      } catch (error) {
        console.error("[useCustomFilters] Failed to load custom filters:", error);
      }
    };
    loadCustomFilters();
  }, []);

  const handleAddFilter = () => {
    setEditingFilter(null);
    setFilterDialogOpen(true);
  };

  const handleEditFilter = (filter: CustomFilter) => {
    setEditingFilter(filter);
    setFilterDialogOpen(true);
  };

  const handleSaveFilter = async (
    name: string,
    conditions: FilterCondition[],
  ) => {
    try {
      if (editingFilter) {
        await configStorage.updateCustomFilter(editingFilter.id, {
          name,
          conditions,
        });
        setCustomFilters((prev) =>
          prev.map((f) =>
            f.id === editingFilter.id
              ? { ...f, name, conditions, updatedAt: Date.now() }
              : f,
          ),
        );
      } else {
        const newFilter: CustomFilter = {
          id: `filter_${Date.now()}`,
          name,
          conditions,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await configStorage.addCustomFilter(newFilter);
        setCustomFilters((prev) => [...prev, newFilter]);
      }
      setFilterDialogOpen(false);
      setEditingFilter(null);
    } catch (error) {
      console.error("[useCustomFilters] Failed to save custom filter:", error);
    }
  };

  const handleDeleteFilter = async () => {
    if (!deleteFilterTarget) return;
    try {
      await configStorage.deleteCustomFilter(deleteFilterTarget.id);
      setCustomFilters((prev) =>
        prev.filter((f) => f.id !== deleteFilterTarget.id),
      );
      setDeleteFilterTarget(null);
    } catch (error) {
      console.error("[useCustomFilters] Failed to delete custom filter:", error);
    }
  };

  return {
    customFilters,
    filterDialogOpen,
    editingFilter,
    deleteFilterTarget,
    setFilterDialogOpen,
    setEditingFilter,
    setDeleteFilterTarget,
    onAddFilter: handleAddFilter,
    onEditFilter: handleEditFilter,
    onSaveFilter: handleSaveFilter,
    onDeleteFilter: handleDeleteFilter,
  };
}