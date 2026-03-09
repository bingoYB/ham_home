import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Loader2, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Button,
  cn,
} from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { syncConfigStorage } from "@/lib/sync/sync-config-storage";
import { getBackgroundService } from "@/lib/services";
import type { WebDAVConfig, SyncStatus } from "@/types";

export interface SyncStatusWidgetProps {
  className?: string;
  portalContainer?: HTMLElement;
}

export function SyncStatusWidget({
  className,
  portalContainer,
}: SyncStatusWidgetProps) {
  const { t } = useTranslation(["settings"]);
  const [config, setConfig] = useState<WebDAVConfig | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    // 初始获取
    const init = async () => {
      const currentConfig = await syncConfigStorage.getConfig();
      const currentStatus = await syncConfigStorage.getStatus();
      setConfig(currentConfig);
      setStatus(currentStatus);
    };
    init();

    // 监听变化
    const unwatchConfig = syncConfigStorage.watchConfig((newConfig) => {
      setConfig(newConfig);
    });
    const unwatchStatus = syncConfigStorage.watchStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unwatchConfig();
      unwatchStatus();
    };
  }, []);

  const relativeSyncTime = useRelativeTime(status?.lastSyncTime || undefined);

  if (!config?.enabled) {
    // 未开启同步时，显示灰色的云作为入口
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground/50 hover:text-muted-foreground",
                className,
              )}
              onClick={() =>
                getBackgroundService().openOptionsPage("settings?tab=storage")
              }
            >
              <Cloud className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="z-9999"
            container={portalContainer}
          >
            <p>{t("settings:settings.sync.widget.tooltipTitle")}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
              {t("settings:settings.sync.widget.tooltipDesc")}
            </p>
            <p
              className="text-xs mt-2 font-medium text-primary"
              onClick={() =>
                getBackgroundService().openOptionsPage("settings?tab=storage")
              }
            >
              {t("settings:settings.sync.widget.goConfig")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 开启同步时的显示状态
  const isSyncing = status?.status === "syncing";
  const isError = status?.status === "error";

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isSyncing
                ? "text-blue-500"
                : isError
                  ? "text-destructive"
                  : "text-green-600",
              className,
            )}
            onClick={() =>
              getBackgroundService().openOptionsPage("settings?tab=storage")
            }
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isError ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="p-3 z-[9999]"
          container={portalContainer}
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {isSyncing
                ? t("settings:settings.sync.config.statusSyncing")
                : isError
                  ? t("settings:settings.sync.config.statusError")
                  : t("settings:settings.sync.config.statusIdle")}
            </span>
            <span className="text-xs text-muted-foreground">
              {status?.lastSyncTime && status.lastSyncTime > 0
                ? `${t("settings:settings.sync.config.lastSyncLabel")} ${relativeSyncTime}`
                : t("settings:settings.sync.config.neverSynced")}
            </span>
            <span
              onClick={() =>
                getBackgroundService().openOptionsPage("settings?tab=storage")
              }
              className="text-xs text-primary mt-1 border-t border-border/50 pt-1"
            >
              {t("settings:settings.sync.widget.goConfig")}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
