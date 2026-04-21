import { useTranslation } from "react-i18next";
import {
  Clock,
  ExternalLink,
  Folder,
  Globe,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@hamhome/ui";
import type { Workspace, WorkspaceRestoreMode } from "@/types";
import { formatWorkspaceDate, getMainDomains } from "./workspace-ui";

interface WorkspaceCardProps {
  workspace: Workspace;
  selected: boolean;
  categoryName: string;
  onSelect: (workspace: Workspace) => void;
  onRestore: (workspace: Workspace, mode: WorkspaceRestoreMode) => void;
  onDelete: (workspace: Workspace) => void;
}

export function WorkspaceCard({
  workspace,
  selected,
  categoryName,
  onSelect,
  onRestore,
  onDelete,
}: WorkspaceCardProps) {
  const { t } = useTranslation("bookmark");
  const domains = getMainDomains(workspace);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary bg-primary/5",
      )}
      onClick={() => onSelect(workspace)}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base">
              {workspace.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {workspace.description || t("workspace.noDescription")}
            </CardDescription>
          </div>
          <Badge variant={workspace.isRestored ? "secondary" : "outline"}>
            {workspace.isRestored
              ? t("workspace.restored")
              : t("workspace.saved")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {t("workspace.pageCount", { count: workspace.pages.length })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Folder className="h-3.5 w-3.5" />
            {categoryName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatWorkspaceDate(workspace.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {domains.map((domain) => (
            <Badge key={domain} variant="outline" className="max-w-[160px]">
              <span className="truncate">{domain}</span>
            </Badge>
          ))}
          {workspace.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="max-w-[140px]">
              <Tag className="mr-1 h-3 w-3" />
              <span className="truncate">{tag}</span>
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onRestore(workspace, "newWindow");
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("workspace.restoreNewWindow")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onRestore(workspace, "currentWindow");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("workspace.restoreCurrentWindow")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(workspace);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
