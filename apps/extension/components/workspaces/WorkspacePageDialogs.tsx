
import { WorkspaceEditDialog } from "@/components/workspaces/WorkspaceEditDialog";
import { WorkspacePageEditDialog } from "@/components/workspaces/WorkspacePageEditDialog";
import { WorkspaceSaveDialog } from "@/components/workspaces/WorkspaceSaveDialog";
import type { useWorkspacesPage } from "@/components/workspaces/useWorkspacesPage";

interface WorkspacePageDialogsProps {
  state: ReturnType<typeof useWorkspacesPage>;
}

export function WorkspacePageDialogs({
  state,
}: WorkspacePageDialogsProps) {
  return (
    <>
      <WorkspaceSaveDialog
        open={state.saveDialogOpen}
        preview={state.preview}
        saving={state.saving}
        name={state.workspaceName}
        description={state.workspaceDescription}
        categoryId={state.workspaceCategoryId}
        keepDuplicatePages={state.keepDuplicatePages}
        categories={state.workspaceCategories}
        newCategoryName={state.newWorkspaceCategoryName}
        creatingCategory={state.creatingWorkspaceCategory}
        onOpenChange={state.setSaveDialogOpen}
        onNameChange={state.setWorkspaceName}
        onDescriptionChange={state.setWorkspaceDescription}
        onCategoryChange={state.setWorkspaceCategoryId}
        onNewCategoryNameChange={state.setNewWorkspaceCategoryName}
        onCreateCategory={state.createWorkspaceCategory}
        onKeepDuplicatePagesChange={state.setKeepDuplicatePages}
        onSave={state.saveWorkspace}
      />
      <WorkspaceEditDialog
        open={state.editDialogOpen}
        saving={state.updatingWorkspace}
        name={state.workspaceName}
        description={state.workspaceDescription}
        categoryId={state.workspaceCategoryId}
        categories={state.workspaceCategories}
        newCategoryName={state.newWorkspaceCategoryName}
        creatingCategory={state.creatingWorkspaceCategory}
        onOpenChange={state.setEditDialogOpen}
        onNameChange={state.setWorkspaceName}
        onDescriptionChange={state.setWorkspaceDescription}
        onCategoryChange={state.setWorkspaceCategoryId}
        onNewCategoryNameChange={state.setNewWorkspaceCategoryName}
        onCreateCategory={state.createWorkspaceCategory}
        onSave={state.updateWorkspace}
      />
      <WorkspacePageEditDialog
        open={state.editPageDialogOpen}
        name={state.pageName}
        url={state.pageUrl}
        onOpenChange={state.setEditPageDialogOpen}
        onNameChange={state.setPageName}
        onUrlChange={state.setPageUrl}
        onSave={state.updatePageInWorkspace}
      />
    </>
  );
}
