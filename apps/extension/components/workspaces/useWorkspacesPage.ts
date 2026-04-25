import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import { workspaceAnalysisService } from "@/lib/services/workspace-analysis-service";
import {
  workspaceService,
  type WorkspacePreview,
} from "@/lib/services/workspace-service";
import type {
  Workspace,
  WorkspaceCategory,
  WorkspaceRestoreMode,
  WorkspaceTabPage,
} from "@/types";
import {
  ALL_CATEGORIES,
  filterWorkspaceTabGroups,
  MANY_PAGES_THRESHOLD,
  UNCATEGORIZED,
} from "./workspace-ui";

interface UseWorkspacesPageOptions { }

export function useWorkspacesPage({ }: UseWorkspacesPageOptions) {
  const { t } = useTranslation("bookmark");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceCategories, setWorkspaceCategories] = useState<
    WorkspaceCategory[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState<"createdAt" | "restoredAt" | "manual">(
    "manual",
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<WorkspacePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingWorkspace, setUpdatingWorkspace] = useState(false);
  const [currentWindowPreview, setCurrentWindowPreview] =
    useState<WorkspacePreview | null>(null);
  const [currentWindowLoading, setCurrentWindowLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceCategoryId, setWorkspaceCategoryId] = useState<string | null>(
    null,
  );
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);
  const [newWorkspaceCategoryName, setNewWorkspaceCategoryName] = useState("");
  const [creatingWorkspaceCategory, setCreatingWorkspaceCategory] =
    useState(false);
  const [keepDuplicatePages, setKeepDuplicatePages] = useState(false);
  const [editingPage, setEditingPage] = useState<WorkspaceTabPage | null>(null);
  const [editingPageWorkspaceId, setEditingPageWorkspaceId] = useState<string | null>(null);
  const [editPageDialogOpen, setEditPageDialogOpen] = useState(false);
  const [pageName, setPageName] = useState("");
  const [pageUrl, setPageUrl] = useState("");


  useEffect(() => {
    workspaceStorage.getWorkspaces().then(setWorkspaces).catch(console.error);
    return workspaceStorage.watchWorkspaces(setWorkspaces);
  }, []);

  useEffect(() => {
    workspaceStorage
      .getCategories()
      .then(setWorkspaceCategories)
      .catch(console.error);
    return workspaceStorage.watchCategories(setWorkspaceCategories);
  }, []);

  const refreshCurrentWindowPreview = useCallback(async () => {
    setCurrentWindowLoading(true);
    try {
      const nextPreview = await workspaceService.previewCurrentWindow();
      setCurrentWindowPreview(nextPreview);
    } catch (error) {
      console.error("[WorkspacesPage] Failed to preview current window:", error);
      setCurrentWindowPreview(null);
    } finally {
      setCurrentWindowLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentWindowPreview();
  }, [refreshCurrentWindowPreview]);

  const categoryById = useMemo(() => {
    return new Map(
      workspaceCategories.map((category) => [category.id, category]),
    );
  }, [workspaceCategories]);

  const categoryNameById = useMemo(() => {
    return new Map(
      workspaceCategories.map((category) => [category.id, category.name]),
    );
  }, [workspaceCategories]);

  const workspaceTagSuggestions = useMemo(() => {
    return Array.from(new Set(workspaces.flatMap((workspace) => workspace.tags)));
  }, [workspaces]);



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

    if (sortBy === "manual") return filtered;

    return filtered.sort((a, b) => {
      const aValue = a[sortBy] ?? 0;
      const bValue = b[sortBy] ?? 0;
      return bValue - aValue;
    });
  }, [categoryFilter, searchQuery, sortBy, workspaces]);



  const openSaveDialog = useCallback(async (customPreview?: WorkspacePreview) => {
    try {
      const nextPreview = customPreview ?? await workspaceService.previewCurrentWindow(true);
      if (nextPreview.pages.length === 0) {
        toast.error(t("workspace.noPagesToSave"));
        return;
      }
      setCurrentWindowPreview(nextPreview);
      setPreview(nextPreview);
      setWorkspaceName(nextPreview.name);
      setWorkspaceDescription("");
      setWorkspaceCategoryId(null);
      setWorkspaceTags([]);
      setNewWorkspaceCategoryName("");
      setKeepDuplicatePages(false);
      setSaveDialogOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.saveFailed")));
    }
  }, [t]);

  const saveWorkspace = useCallback(async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const pages = keepDuplicatePages
        ? preview.pages
        : workspaceAnalysisService.getUniquePages(preview.pages);
      const workspace = await workspaceStorage.createWorkspace({
        name: workspaceName.trim() || preview.name,
        description: workspaceDescription.trim(),
        categoryId: workspaceCategoryId,
        tags: workspaceTags,
        pages,
        tabGroups: filterWorkspaceTabGroups(preview.tabGroups, pages),
      });
      await workspaceAnalysisService.analyzeWorkspace(workspace);
      await workspaceService.closeSavedPageTabs(preview.pages);
      setSaveDialogOpen(false);
      void refreshCurrentWindowPreview();
      toast.success(t("workspace.saveSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.saveFailed")));
    } finally {
      setSaving(false);
    }
  }, [
    preview,
    keepDuplicatePages,
    t,
    workspaceCategoryId,
    workspaceDescription,
    workspaceName,
    workspaceTags,
    refreshCurrentWindowPreview,
  ]);

  const createWorkspaceCategory = useCallback(async () => {
    const name = newWorkspaceCategoryName.trim();
    if (!name) return;
    setCreatingWorkspaceCategory(true);
    try {
      const category = await workspaceStorage.createCategory(name);
      setWorkspaceCategoryId(category.id);
      setNewWorkspaceCategoryName("");
      toast.success(t("workspace.categoryCreateSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.categoryCreateFailed")));
    } finally {
      setCreatingWorkspaceCategory(false);
    }
  }, [newWorkspaceCategoryName, t]);

  const openEditDialog = useCallback((workspace: Workspace) => {
    setEditingWorkspaceId(workspace.id);
    setWorkspaceName(workspace.name || "");
    setWorkspaceDescription(workspace.description || "");
    setWorkspaceCategoryId(workspace.categoryId || null);
    setWorkspaceTags(workspace.tags || []);
    setNewWorkspaceCategoryName("");
    setEditDialogOpen(true);
  }, []);

  const updateWorkspace = useCallback(async () => {
    if (!editingWorkspaceId) return;
    setUpdatingWorkspace(true);
    try {
      await workspaceStorage.updateWorkspace(editingWorkspaceId, {
        name: workspaceName.trim() || t("workspace.untitled"),
        description: workspaceDescription.trim(),
        categoryId: workspaceCategoryId,
        tags: workspaceTags,
      });
      setEditDialogOpen(false);
      toast.success(t("workspace.updateSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.updateFailed")));
    } finally {
      setUpdatingWorkspace(false);
    }
  }, [
    editingWorkspaceId,
    t,
    workspaceCategoryId,
    workspaceDescription,
    workspaceName,
    workspaceTags,
  ]);

  const updateWorkspaceName = useCallback(
    async (workspaceId: string, newName: string) => {
      const name = newName.trim();
      if (!name) return;
      try {
        await workspaceStorage.updateWorkspace(workspaceId, { name });
      } catch (error) {
        toast.error(getErrorMessage(error, t("workspace.updateFailed")));
      }
    },
    [t],
  );

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



  const [savingBookmarkPage, setSavingBookmarkPage] = useState<WorkspaceTabPage | null>(null);

  const openSaveBookmarkDialog = useCallback((page: WorkspaceTabPage) => {
    setSavingBookmarkPage(page);
  }, []);

  const reorderWorkspaces = useCallback(
    async (activeId: string, overId: string) => {
      const oldIndex = filteredWorkspaces.findIndex((w) => w.id === activeId);
      const newIndex = filteredWorkspaces.findIndex((w) => w.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = [...filteredWorkspaces];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Optimistic update
      setWorkspaces((prev) => {
        const idSet = new Set(reordered.map((w) => w.id));
        const rest = prev.filter((w) => !idSet.has(w.id));
        return [...reordered, ...rest];
      });

      await workspaceStorage.reorderWorkspaces(
        reordered.map((w) => w.id),
      );
    },
    [filteredWorkspaces],
  );

  const addPageToWorkspace = useCallback(
    async (workspaceId: string, page: WorkspaceTabPage, insertIndex?: number) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      // Deduplicate by URL
      if (workspace.pages.some((p) => p.url === page.url)) {
        toast.info(t("workspace.pageAlreadyExists"));
        return;
      }

      const updatedPages = [...workspace.pages];
      if (insertIndex != null && insertIndex >= 0 && insertIndex <= updatedPages.length) {
        updatedPages.splice(insertIndex, 0, page);
      } else {
        updatedPages.push(page);
      }
      await workspaceStorage.updateWorkspace(workspaceId, { pages: updatedPages });
      toast.success(t("workspace.pageAdded"));
    },
    [workspaces, t],
  );

  const reorderPagesInWorkspace = useCallback(
    async (workspaceId: string, activePageId: string, overPageId: string) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      const pages = [...workspace.pages];
      const oldIndex = pages.findIndex((p) => p.id === activePageId);
      const newIndex = pages.findIndex((p) => p.id === overPageId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const overPage = pages[newIndex];
      const [moved] = pages.splice(oldIndex, 1);
      // Auto-inherit tab group from the target position
      const updated =
        moved.tabGroupId !== overPage.tabGroupId
          ? { ...moved, tabGroupId: overPage.tabGroupId, windowId: overPage.windowId }
          : moved;
      pages.splice(newIndex, 0, updated);

      // Optimistic update
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, pages } : w)),
      );

      await workspaceStorage.updateWorkspace(workspaceId, { pages });
    },
    [workspaces],
  );

  const movePageBetweenWorkspaces = useCallback(
    async (
      srcWorkspaceId: string,
      pageId: string,
      dstWorkspaceId: string,
      insertIndex?: number,
    ) => {
      const srcWorkspace = workspaces.find((w) => w.id === srcWorkspaceId);
      const dstWorkspace = workspaces.find((w) => w.id === dstWorkspaceId);
      if (!srcWorkspace || !dstWorkspace) return;

      const page = srcWorkspace.pages.find((p) => p.id === pageId);
      if (!page) return;

      // Deduplicate by URL
      if (dstWorkspace.pages.some((p) => p.url === page.url)) {
        toast.info(t("workspace.pageAlreadyExists"));
        return;
      }

      const srcPages = srcWorkspace.pages.filter((p) => p.id !== pageId);
      const dstPages = [...dstWorkspace.pages];
      if (insertIndex != null && insertIndex >= 0 && insertIndex <= dstPages.length) {
        dstPages.splice(insertIndex, 0, page);
      } else {
        dstPages.push(page);
      }

      // Optimistic update
      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id === srcWorkspaceId) return { ...w, pages: srcPages };
          if (w.id === dstWorkspaceId) return { ...w, pages: dstPages };
          return w;
        }),
      );

      await workspaceStorage.updateWorkspace(srcWorkspaceId, { pages: srcPages });
      await workspaceStorage.updateWorkspace(dstWorkspaceId, { pages: dstPages });
      toast.success(t("workspace.pageMoved"));
    },
    [workspaces, t],
  );

  const movePageToTabGroup = useCallback(
    async (
      workspaceId: string,
      pageId: string,
      tabGroupId: number,
      windowId?: number,
    ) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      const updatedPages = workspace.pages.map((p) =>
        p.id === pageId ? { ...p, tabGroupId, windowId: windowId ?? p.windowId } : p,
      );

      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? { ...w, pages: updatedPages } : w)),
      );

      await workspaceStorage.updateWorkspace(workspaceId, { pages: updatedPages });
    },
    [workspaces],
  );

  const deletePageFromWorkspace = useCallback(
    async (workspaceId: string, pageId: string) => {
      const workspace = workspaces.find((w) => {
        return w.pages.some((p) => p.id === pageId);
      });
      const targetWorkspaceId = workspaceId || workspace?.id;
      if (!targetWorkspaceId) return;

      const targetWorkspace = workspaces.find(w => w.id === targetWorkspaceId);
      if (!targetWorkspace) return;

      const page = targetWorkspace.pages.find(p => p.id === pageId);
      if (!page) return;

      if (!window.confirm(t("workspace.deletePageConfirm", { title: page.title }))) {
        return;
      }

      const updatedPages = targetWorkspace.pages.filter((p) => p.id !== pageId);
      await workspaceStorage.updateWorkspace(targetWorkspaceId, { pages: updatedPages });
      toast.success(t("workspace.pageDeleted"));
    },
    [workspaces, t],
  );

  const openEditPageDialog = useCallback((workspaceId: string, page: WorkspaceTabPage) => {
    setEditingPageWorkspaceId(workspaceId);
    setEditingPage(page);
    setPageName(page.title);
    setPageUrl(page.url);
    setEditPageDialogOpen(true);
  }, []);

  const updatePageInWorkspace = useCallback(async () => {
    if (!editingPage || !editingPageWorkspaceId) return;
    
    const workspace = workspaces.find(w => w.id === editingPageWorkspaceId);
    if (!workspace) return;

    const updatedPages = workspace.pages.map(p => 
      p.id === editingPage.id ? { ...p, title: pageName, url: pageUrl } : p
    );

    try {
      await workspaceStorage.updateWorkspace(editingPageWorkspaceId, { pages: updatedPages });
      setEditPageDialogOpen(false);
      toast.success(t("workspace.updateSuccess"));
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.updateFailed")));
    }
  }, [editingPage, editingPageWorkspaceId, pageName, pageUrl, workspaces, t]);

  return {
    workspaces,
    workspaceCategories,
    workspaceTagSuggestions,
    filteredWorkspaces,
    searchQuery,
    categoryFilter,
    sortBy,
    saveDialogOpen,
    editDialogOpen,
    preview,
    saving,
    updatingWorkspace,
    currentWindowPreview,
    currentWindowLoading,
    workspaceName,
    workspaceDescription,
    workspaceCategoryId,
    workspaceTags,
    newWorkspaceCategoryName,
    creatingWorkspaceCategory,
    keepDuplicatePages,
    categoryNameById,
    categoryById,
    savingBookmarkPage,
    editingPage,
    editPageDialogOpen,
    pageName,
    pageUrl,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    setSaveDialogOpen,
    setEditDialogOpen,
    setWorkspaceName,
    setWorkspaceDescription,
    setWorkspaceCategoryId,
    setWorkspaceTags,
    setNewWorkspaceCategoryName,
    setKeepDuplicatePages,
    setSavingBookmarkPage,
    setEditPageDialogOpen,
    setPageName,
    setPageUrl,
    refreshCurrentWindowPreview,
    openSaveDialog,
    saveWorkspace,
    createWorkspaceCategory,
    openEditDialog,
    updateWorkspace,
    updateWorkspaceName,
    restoreWorkspace,
    deleteWorkspace,
    openSaveBookmarkDialog,
    reorderWorkspaces,
    addPageToWorkspace,
    reorderPagesInWorkspace,
    movePageBetweenWorkspaces,
    movePageToTabGroup,
    deletePageFromWorkspace,
    openEditPageDialog,
    updatePageInWorkspace,
  };
}

function workspaceMatchesSearch(workspace: Workspace, query: string) {
  return (
    workspace.name.toLowerCase().includes(query) ||
    workspace.description.toLowerCase().includes(query) ||
    (workspace.tags ?? []).some((tag) => tag.toLowerCase().includes(query)) ||
    (workspace.pages ?? []).some(
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
