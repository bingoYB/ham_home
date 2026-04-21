import { Briefcase, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { WorkspaceCard } from "@/components/workspaces/WorkspaceCard";
import { WorkspaceDetail } from "@/components/workspaces/WorkspaceDetail";
import { WorkspaceSaveDialog } from "@/components/workspaces/WorkspaceSaveDialog";
import { useWorkspacesPage } from "@/components/workspaces/useWorkspacesPage";
import { ALL_CATEGORIES, UNCATEGORIZED } from "@/components/workspaces/workspace-ui";

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
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.searchQuery}
            onChange={(event) => state.setSearchQuery(event.target.value)}
            placeholder={t("workspace.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={state.categoryFilter}
          onValueChange={state.setCategoryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>
              {t("workspace.allCategories")}
            </SelectItem>
            <SelectItem value={UNCATEGORIZED}>
              {t("bookmark.uncategorized")}
            </SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={state.sortBy}
          onValueChange={(value) =>
            state.setSortBy(value as "createdAt" | "restoredAt")
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">
              {t("workspace.sortCreatedAt")}
            </SelectItem>
            <SelectItem value="restoredAt">
              {t("workspace.sortRestoredAt")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
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
          selectedPageIds={state.selectedPageIds}
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
    </div>
  );
}
