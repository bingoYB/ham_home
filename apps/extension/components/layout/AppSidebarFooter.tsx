/**
 * AppSidebarFooter - storage / sync summary and the user menu at the bottom of
 * the app sidebar. When the sidebar collapses to its icon rail the summary
 * card turns into two icon buttons and the user menu keeps only the avatar.
 */
import { useTranslation } from "react-i18next";
import { Database, Download, Settings, type LucideIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hamhome/ui";

export interface SidebarSyncIndicator {
  label: string;
  Icon: LucideIcon;
  iconClassName: string;
}

interface AppSidebarFooterProps {
  bookmarkCount: number;
  storageSize: string;
  sync: SidebarSyncIndicator;
  onNavigate: (view: string) => void;
}

const SYNC_SETTINGS_VIEW = "settings?tab=storage";

export function AppSidebarFooter({
  bookmarkCount,
  storageSize,
  sync,
  onNavigate,
}: AppSidebarFooterProps) {
  const { t } = useTranslation(["common", "bookmark", "settings"]);
  const { Icon: SyncIcon } = sync;

  return (
    <div className="space-y-3 p-2 group-data-[collapsible=icon]:p-0">
      {/* Expanded: storage + sync summary card */}
      <div className="space-y-2 rounded-lg bg-muted/50 px-3 py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" />
            <span className="text-xs font-medium text-foreground">
              {t("common:common.storage")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{storageSize}</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="mt-2 flex cursor-pointer items-center justify-between border-t border-border/50 pt-2 transition-opacity hover:opacity-80"
              onClick={() => onNavigate(SYNC_SETTINGS_VIEW)}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <SyncIcon className={sync.iconClassName} />
                <span className="text-xs font-medium text-foreground">
                  {t("settings:settings.sync.widget.title")}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {sync.label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="text-sm font-medium">
              {t("settings:settings.sync.widget.tooltipTitle")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("settings:settings.sync.widget.tooltipDesc")}
            </p>
            <p
              className="mt-2 flex items-center gap-1 text-xs text-primary"
              onClick={() => onNavigate(SYNC_SETTINGS_VIEW)}
            >
              <Settings className="h-3 w-3" />{" "}
              {t("settings:settings.sync.widget.goConfig")}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Collapsed: the same two facts as icon buttons */}
      <div className="hidden flex-col items-center gap-1 group-data-[collapsible=icon]:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("common:common.storage")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => onNavigate(SYNC_SETTINGS_VIEW)}
            >
              <Database className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t("common:common.storage")} · {storageSize}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("settings:settings.sync.widget.title")}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent"
              onClick={() => onNavigate(SYNC_SETTINGS_VIEW)}
            >
              <SyncIcon className={sync.iconClassName} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t("settings:settings.sync.widget.title")} · {sync.label}
          </TooltipContent>
        </Tooltip>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src="https://api.dicebear.com/7.x/thumbs/svg?seed=HamHome" />
              <AvatarFallback>🐹</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-foreground">HamHome</p>
              <p className="text-xs text-muted-foreground">
                {t("bookmark:bookmark.count", { count: bookmarkCount })}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <DropdownMenuItem onClick={() => onNavigate("settings")}>
            <Settings className="mr-2 h-4 w-4" />
            {t("settings:settings.title")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onNavigate("import-export")}>
            <Download className="mr-2 h-4 w-4" />
            {t("settings:settings.importExport.title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
