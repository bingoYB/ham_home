import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import {
  workspaceService,
  type WorkspacePreview,
} from "@/lib/services/workspace-service";
import type {
  LocalCategory,
  Workspace,
  WorkspaceRestoreMode,
} from "@/types";
import {
  ALL_CATEGORIES,
  MANY_PAGES_THRESHOLD,
  UNCATEGORIZED,
} from "./workspace-ui";

interface UseWorkspacesPageOptions {
  categories: LocalCategory[];
}

export function useWorkspacesPage({ categories }: UseWorkspacesPageOptions) {
  const { t } = useTranslation("bookmark");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState<"createdAt" | "restoredAt">(
    "createdAt",
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [preview, setPreview] = useState<WorkspacePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceCategoryId, setWorkspaceCategoryId] = useState<string | null>(
    null,
  );
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);

  useEffect(() => {
    workspaceStorage.getWorkspaces().then(setWorkspaces).catch(console.error);
    return workspaceStorage.watchWorkspaces(setWorkspaces);
  }, []);

  const categoryNameById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const selectedWorkspace = useMemo(() => {
    return (
      workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
      workspaces[0] ??
      null
    );
  }, [selectedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setSelectedWorkspaceId(null);
      setSelectedPageIds(new Set());
      return;
    }

    setSelectedWorkspaceId(selectedWorkspace.id);
    setSelectedPageIds(new Set(selectedWorkspace.pages.map((page) => page.id)));
  }, [selectedWorkspace?.id]);

  const filteredWorkspaces = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = workspaces.filter((workspace) => {
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES ||
        (categoryFilter === UNCATEGORIZED
          ? workspace.categoryId === null
          : workspace.categoryId === categoryFilter);
      if (!matchesCategory) return false;
      if (!query) return true;
      return workspaceMatchesSearch(workspace, query);
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortBy] ?? 0;
      const bValue = b[sortBy] ?? 0;
      return bValue - aValue;
    });
  }, [categoryFilter, searchQuery, sortBy, workspaces]);

  const openSaveDialog = useCallback(async () => {
    try {
      const nextPreview = await workspaceService.previewCurrentWindow();
      if (nextPreview.pages.length === 0) {
        toast.error(t("workspace.noPagesToSave"));
        return;
      }
      setPreview(nextPreview);
      setWorkspaceName(nextPreview.name);
      setWorkspaceDescription("");
      setWorkspaceCategoryId(null);
      setWorkspaceTags([]);
      setSaveDialogOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.saveFailed")));
    }
  }, [t]);

  const saveWorkspace = useCallback(async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const workspace = await workspaceStorage.createWorkspace({
        name: workspaceName.trim() || preview.name,
        description: workspaceDescription.trim(),
        categoryId: workspaceCategoryId,
        tags: workspaceTags,
        pages: preview.pages,
      });
      setSelectedWorkspaceId(workspace.id);
      setSaveDialogOpen(false);
      toast.success(t("workspace.saveSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.saveFailed")));
    } finally {
      setSaving(false);
    }
  }, [
    preview,
    t,
    workspaceCategoryId,
    workspaceDescription,
    workspaceName,
    workspaceTags,
  ]);

  const confirmRestore = useCallback(
    (pageCount: number) => {
      if (pageCount <= MANY_PAGES_THRESHOLD) return true;
      return window.confirm(
        t("workspace.confirmRestoreMany", { count: pageCount }),
      );
    },
    [t],
  );

  const restoreWorkspace = useCallback(
    async (workspace: Workspace, mode: WorkspaceRestoreMode) => {
      await runRestore(workspace, mode, undefined, confirmRestore, t);
    },
    [confirmRestore, t],
  );

  const restoreSelectedPages = useCallback(
    async (mode: WorkspaceRestoreMode) => {
      if (!selectedWorkspace || selectedPageIds.size === 0) {
        toast.error(t("workspace.noSelectedPages"));
        return;
      }
      await runRestore(
        selectedWorkspace,
        mode,
        Array.from(selectedPageIds),
        confirmRestore,
        t,
      );
    },
    [confirmRestore, selectedPageIds, selectedWorkspace, t],
  );

  const deleteWorkspace = useCallback(
    async (workspace: Workspace) => {
      if (
        !window.confirm(t("workspace.deleteConfirm", { name: workspace.name }))
      ) {
        return;
      }
      await workspaceStorage.deleteWorkspace(workspace.id);
      toast.success(t("workspace.deleteSuccess"));
    },
    [t],
  );

  const togglePage = useCallback((pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  const toggleAllPages = useCallback(() => {
    if (!selectedWorkspace) return;
    setSelectedPageIds((prev) =>
      prev.size === selectedWorkspace.pages.length
        ? new Set()
        : new Set(selectedWorkspace.pages.map((page) => page.id)),
    );
  }, [selectedWorkspace]);

  return {
    workspaces,
    filteredWorkspaces,
    searchQuery,
    categoryFilter,
    sortBy,
    selectedWorkspace,
    selectedPageIds,
    saveDialogOpen,
    preview,
    saving,
    workspaceName,
    workspaceDescription,
    workspaceCategoryId,
    workspaceTags,
    categoryNameById,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    setSelectedWorkspaceId,
    setSaveDialogOpen,
    setWorkspaceName,
    setWorkspaceDescription,
    setWorkspaceCategoryId,
    setWorkspaceTags,
    openSaveDialog,
    saveWorkspace,
    restoreWorkspace,
    restoreSelectedPages,
    deleteWorkspace,
    togglePage,
    toggleAllPages,
  };
}

function workspaceMatchesSearch(workspace: Workspace, query: string) {
  return (
    workspace.name.toLowerCase().includes(query) ||
    workspace.description.toLowerCase().includes(query) ||
    workspace.tags.some((tag) => tag.toLowerCase().includes(query)) ||
    workspace.pages.some(
      (page) =>
        page.title.toLowerCase().includes(query) ||
        page.url.toLowerCase().includes(query) ||
        page.domain.toLowerCase().includes(query),
    )
  );
}

async function runRestore(
  workspace: Workspace,
  mode: WorkspaceRestoreMode,
  pageIds: string[] | undefined,
  confirmRestore: (pageCount: number) => boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const pageCount = pageIds?.length ?? workspace.pages.length;
  if (!confirmRestore(pageCount)) return;
  try {
    const result = await workspaceService.restoreWorkspace(workspace, {
      mode,
      pageIds,
      skipDuplicateUrls: true,
    });
    toast.success(
      t("workspace.restoreSuccess", {
        count: result.restoredCount,
        skipped: result.skippedDuplicateCount,
      }),
    );
  } catch (error) {
    toast.error(getErrorMessage(error, t("workspace.restoreFailed")));
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
