import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import { workspaceBookmarkService } from "@/lib/services/workspace-bookmark-service";
import {
  workspaceService,
  type WorkspacePreview,
} from "@/lib/services/workspace-service";
import type {
  LocalCategory,
  Workspace,
  WorkspaceBookmarkRecommendation,
  WorkspacePageBookmarkStatus,
  WorkspaceRestoreMode,
  WorkspaceTabPage,
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
  const [domainFilter, setDomainFilter] = useState(ALL_CATEGORIES);
  const [bookmarkStatusFilter, setBookmarkStatusFilter] = useState<
    WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES
  >(ALL_CATEGORIES);
  const [aiCategoryFilter, setAiCategoryFilter] = useState(ALL_CATEGORIES);
  const [pageStatusById, setPageStatusById] = useState<
    Record<string, WorkspacePageBookmarkStatus>
  >({});
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertPageIds, setConvertPageIds] = useState<string[]>([]);
  const [convertCategoryId, setConvertCategoryId] = useState<string | null>(
    null,
  );
  const [convertTags, setConvertTags] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);
  const [aiCommand, setAiCommand] = useState("");
  const [aiRecommendation, setAiRecommendation] =
    useState<WorkspaceBookmarkRecommendation | null>(null);

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
      setPageStatusById({});
      return;
    }

    setSelectedWorkspaceId(selectedWorkspace.id);
    setSelectedPageIds(new Set(selectedWorkspace.pages.map((page) => page.id)));
    workspaceBookmarkService
      .getPageBookmarkStatuses(selectedWorkspace)
      .then(setPageStatusById)
      .catch(console.error);
  }, [selectedWorkspace?.id, selectedWorkspace?.updatedAt]);

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

  const filteredWorkspacePages = useMemo(() => {
    if (!selectedWorkspace) return [];
    return selectedWorkspace.pages.filter((page) =>
      matchesPageFilters(page, {
        domainFilter,
        aiCategoryFilter,
        bookmarkStatusFilter,
        pageStatusById,
      }),
    );
  }, [
    aiCategoryFilter,
    bookmarkStatusFilter,
    domainFilter,
    pageStatusById,
    selectedWorkspace,
  ]);

  const convertPages = useMemo(() => {
    if (!selectedWorkspace) return [];
    const pageIds = new Set(convertPageIds);
    return selectedWorkspace.pages.filter((page) => pageIds.has(page.id));
  }, [convertPageIds, selectedWorkspace]);

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
    const filteredIds = filteredWorkspacePages.map((page) => page.id);
    const allFilteredSelected = filteredIds.every((id) =>
      selectedPageIds.has(id),
    );
    setSelectedPageIds((prev) =>
      allFilteredSelected
        ? new Set()
        : new Set([...Array.from(prev), ...filteredIds]),
    );
  }, [filteredWorkspacePages, selectedPageIds, selectedWorkspace]);

  const openConvertDialog = useCallback(
    (pageIds: string[]) => {
      if (!selectedWorkspace || pageIds.length === 0) {
        toast.error(t("workspace.noSelectedPages"));
        return;
      }
      setConvertPageIds(pageIds);
      setConvertCategoryId(selectedWorkspace.categoryId);
      setConvertTags(selectedWorkspace.tags);
      setConvertDialogOpen(true);
    },
    [selectedWorkspace, t],
  );

  const convertSelectedPages = useCallback(async () => {
    if (!selectedWorkspace) return;
    setConverting(true);
    try {
      const result = await workspaceBookmarkService.convertPagesToBookmarks({
        workspaceId: selectedWorkspace.id,
        pageIds: convertPageIds,
        categoryId: convertCategoryId,
        tags: convertTags,
      });
      setConvertDialogOpen(false);
      toast.success(
        t("workspace.convertSuccess", {
          created: result.created,
          skipped: result.skippedExisting,
          failed: result.failed,
        }),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, t("workspace.convertFailed")));
    } finally {
      setConverting(false);
    }
  }, [convertCategoryId, convertPageIds, convertTags, selectedWorkspace, t]);

  const runAiRecommendation = useCallback(() => {
    if (!selectedWorkspace) return;
    if (!aiCommand.trim()) {
      toast.error(t("workspace.aiCommandRequired"));
      return;
    }
    const recommendation =
      workspaceBookmarkService.recommendPagesForBookmarkConversion(
        selectedWorkspace,
        aiCommand,
        categories,
      );
    setAiRecommendation(recommendation);
    setSelectedPageIds(new Set(recommendation.pageIds));
    if (recommendation.recommendedCategoryId) {
      setConvertCategoryId(recommendation.recommendedCategoryId);
    }
    if (recommendation.recommendedTags.length > 0) {
      setConvertTags(recommendation.recommendedTags);
    }
    toast.success(
      t("workspace.aiRecommendSuccess", {
        count: recommendation.pageIds.length,
      }),
    );
  }, [aiCommand, categories, selectedWorkspace, t]);

  return {
    workspaces,
    filteredWorkspaces,
    searchQuery,
    categoryFilter,
    sortBy,
    selectedWorkspace,
    selectedPageIds,
    filteredWorkspacePages,
    pageStatusById,
    saveDialogOpen,
    preview,
    saving,
    domainFilter,
    bookmarkStatusFilter,
    aiCategoryFilter,
    convertDialogOpen,
    convertPages,
    convertCategoryId,
    convertTags,
    converting,
    aiCommand,
    aiRecommendation,
    workspaceName,
    workspaceDescription,
    workspaceCategoryId,
    workspaceTags,
    categoryNameById,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    setSelectedWorkspaceId,
    setDomainFilter,
    setBookmarkStatusFilter,
    setAiCategoryFilter,
    setSaveDialogOpen,
    setWorkspaceName,
    setWorkspaceDescription,
    setWorkspaceCategoryId,
    setWorkspaceTags,
    setConvertDialogOpen,
    setConvertCategoryId,
    setConvertTags,
    setAiCommand,
    openSaveDialog,
    saveWorkspace,
    restoreWorkspace,
    restoreSelectedPages,
    deleteWorkspace,
    togglePage,
    toggleAllPages,
    openConvertDialog,
    convertSelectedPages,
    runAiRecommendation,
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

function matchesPageFilters(
  page: WorkspaceTabPage,
  filters: {
    domainFilter: string;
    aiCategoryFilter: string;
    bookmarkStatusFilter: WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES;
    pageStatusById: Record<string, WorkspacePageBookmarkStatus>;
  },
) {
  const status = filters.pageStatusById[page.id] ?? "not_bookmarked";
  return (
    (filters.domainFilter === ALL_CATEGORIES ||
      page.domain === filters.domainFilter) &&
    (filters.aiCategoryFilter === ALL_CATEGORIES ||
      (page.aiCategory ?? "") === filters.aiCategoryFilter) &&
    (filters.bookmarkStatusFilter === ALL_CATEGORIES ||
      status === filters.bookmarkStatusFilter)
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
