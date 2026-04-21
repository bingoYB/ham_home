import { Briefcase, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, ScrollArea } from "@hamhome/ui";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { WorkspaceCard } from "@/components/workspaces/WorkspaceCard";
import { WorkspaceBookmarkControls } from "@/components/workspaces/WorkspaceBookmarkControls";
import { WorkspaceConvertDialog } from "@/components/workspaces/WorkspaceConvertDialog";
import { WorkspaceDetail } from "@/components/workspaces/WorkspaceDetail";
import { WorkspaceSaveDialog } from "@/components/workspaces/WorkspaceSaveDialog";
import { WorkspaceSearchBar } from "@/components/workspaces/WorkspaceSearchBar";
import { useWorkspacesPage } from "@/components/workspaces/useWorkspacesPage";

export function WorkspacesPage() {
  const { t } = useTranslation("bookmark");
  const { categories, allTags } = useBookmarks();
  const state = useWorkspacesPage({ categories });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Briefcase className="h-5 w-5 text-primary" />
            {t("workspace.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("workspace.description")}
          </p>
        </div>
        <Button onClick={state.openSaveDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t("workspace.saveCurrentWindow")}
        </Button>
      </div>
      <WorkspaceSearchBar
        searchQuery={state.searchQuery}
        categoryFilter={state.categoryFilter}
        sortBy={state.sortBy}
        categories={categories}
        onSearchChange={state.setSearchQuery}
        onCategoryFilterChange={state.setCategoryFilter}
        onSortByChange={state.setSortBy}
      />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ScrollArea className="min-h-0">
          <div className="space-y-3 pr-3">
            {state.filteredWorkspaces.length > 0 ? (
              state.filteredWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  selected={workspace.id === state.selectedWorkspace?.id}
                  categoryName={
                    workspace.categoryId
                      ? state.categoryNameById.get(workspace.categoryId) ??
                        t("workspace.unknownCategory")
                      : t("bookmark.uncategorized")
                  }
                  onSelect={(item) => state.setSelectedWorkspaceId(item.id)}
                  onRestore={state.restoreWorkspace}
                  onDelete={state.deleteWorkspace}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                {state.workspaces.length === 0
                  ? t("workspace.empty")
                  : t("workspace.emptyFilter")}
              </div>
            )}
          </div>
        </ScrollArea>
        <WorkspaceDetail
          workspace={state.selectedWorkspace}
          pages={state.filteredWorkspacePages}
          statusById={state.pageStatusById}
          selectedPageIds={state.selectedPageIds}
          toolbar={
            state.selectedWorkspace ? (
              <WorkspaceBookmarkControls
                workspace={state.selectedWorkspace}
                pages={state.filteredWorkspacePages}
                selectedPageIds={state.selectedPageIds}
                domainFilter={state.domainFilter}
                bookmarkStatusFilter={state.bookmarkStatusFilter}
                aiCategoryFilter={state.aiCategoryFilter}
                aiCommand={state.aiCommand}
                onDomainFilterChange={state.setDomainFilter}
                onBookmarkStatusFilterChange={state.setBookmarkStatusFilter}
                onAiCategoryFilterChange={state.setAiCategoryFilter}
                onAiCommandChange={state.setAiCommand}
                onAiRecommend={state.runAiRecommendation}
                onConvertPages={state.openConvertDialog}
              />
            ) : null
          }
          onTogglePage={state.togglePage}
          onToggleAllPages={state.toggleAllPages}
          onRestoreSelected={state.restoreSelectedPages}
        />
      </div>
      <WorkspaceSaveDialog
        open={state.saveDialogOpen}
        preview={state.preview}
        saving={state.saving}
        name={state.workspaceName}
        description={state.workspaceDescription}
        categoryId={state.workspaceCategoryId}
        tags={state.workspaceTags}
        categories={categories}
        allTags={allTags}
        onOpenChange={state.setSaveDialogOpen}
        onNameChange={state.setWorkspaceName}
        onDescriptionChange={state.setWorkspaceDescription}
        onCategoryChange={state.setWorkspaceCategoryId}
        onTagsChange={state.setWorkspaceTags}
        onSave={state.saveWorkspace}
      />
      <WorkspaceConvertDialog
        open={state.convertDialogOpen}
        pages={state.convertPages}
        statusById={state.pageStatusById}
        categoryId={state.convertCategoryId}
        tags={state.convertTags}
        categories={categories}
        allTags={allTags}
        converting={state.converting}
        onOpenChange={state.setConvertDialogOpen}
        onCategoryChange={state.setConvertCategoryId}
        onTagsChange={state.setConvertTags}
        onConfirm={state.convertSelectedPages}
      />
    </div>
  );
}
