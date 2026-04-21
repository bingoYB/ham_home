import { CheckSquare, Globe, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, cn } from "@hamhome/ui";
import type { WorkspacePageBookmarkStatus, WorkspaceTabPage } from "@/types";

interface WorkspacePageRowProps {
  page: WorkspaceTabPage;
  checked: boolean;
  status: WorkspacePageBookmarkStatus;
  onToggle: (pageId: string) => void;
}

export function WorkspacePageRow({
  page,
  checked,
  status,
  onToggle,
}: WorkspacePageRowProps) {
  const { t } = useTranslation("bookmark");

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent",
        checked && "border-primary bg-primary/5",
      )}
      onClick={() => onToggle(page.id)}
    >
      {checked ? (
        <CheckSquare className="mt-0.5 h-4 w-4 text-primary" />
      ) : (
        <Square className="mt-0.5 h-4 w-4 text-muted-foreground" />
      )}
      {page.favicon ? (
        <img src={page.favicon} alt="" className="mt-0.5 h-4 w-4 rounded-sm" />
      ) : (
        <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {page.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {page.url}
        </span>
      </span>
      {status !== "not_bookmarked" ? (
        <Badge variant="secondary" className="shrink-0">
          {t(`workspace.pageStatus.${status}`)}
        </Badge>
      ) : null}
    </button>
  );
}
