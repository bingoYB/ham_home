import { ChevronDown, FolderOpen, Loader2, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hamhome/ui";
import type { BookmarkOrganizeMode } from "@/lib/agent/services/bookmark-analysis-service";

interface BatchAIOrganizeButtonProps {
  isProcessing: boolean;
  onOrganize: (mode: BookmarkOrganizeMode) => void;
}

export function BatchAIOrganizeButton({
  isProcessing,
  onOrganize,
}: BatchAIOrganizeButtonProps) {
  const { t } = useTranslation("ai");

  return (
    <div className="inline-flex items-center">
      <Button
        variant="secondary"
        size="sm"
        className="rounded-r-none"
        disabled={isProcessing}
        onClick={() => onOrganize("all")}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        {t("batchOrganize")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-l-none border-l border-border px-2"
            disabled={isProcessing}
            aria-label={t("batchOrganizeMenu")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onOrganize("category")}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {t("batchRecategorize")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onOrganize("tags")}>
            <Tag className="h-4 w-4 mr-2" />
            {t("batchRetag")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onOrganize("all")}>
            <Sparkles className="h-4 w-4 mr-2" />
            {t("batchOrganizeAll")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
