/**
 * OpenTabRow - one open tab in the tab center: idle time, status badges and quick
 * actions (lock, read later, archive). Clicking the title switches to the tab.
 */
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, Lock, LockOpen } from "lucide-react";
import { Button, Checkbox, cn } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import type { OpenTabInfo, TabArchiveMode, TabIdleUnit } from "@/types";
import { TabStatusBadges } from "./TabStatusBadges";

interface OpenTabRowProps {
  tab: OpenTabInfo;
  selected: boolean;
  archiveMode: TabArchiveMode;
  thresholdUnit: TabIdleUnit;
  pendingConfirm: boolean;
  onToggleSelect: (tabId: number) => void;
  onFocus: (tabId: number) => void;
  onLockToggle: (tab: OpenTabInfo) => void;
  onReadLater: (tabId: number) => void;
  onArchive: (tabId: number) => void;
}

function OpenTabRowComponent({
  tab,
  selected,
  archiveMode,
  thresholdUnit,
  pendingConfirm,
  onToggleSelect,
  onFocus,
  onLockToggle,
  onReadLater,
  onArchive,
}: OpenTabRowProps) {
  const { t } = useTranslation("bookmark");
  const favicon = useSafeFavicon(tab.url, tab.favicon);
  const idle = useRelativeTime(tab.displayLastActiveAt);
  const idleLabel = tab.active
    ? t("tabCenter.current")
    : tab.activityEstimated
      ? t("tabCenter.approxIdle", { time: idle })
      : idle;

  return (
    <div
      data-testid="open-tab-row"
      data-tab-id={tab.tabId}
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(tab.tabId)}
        aria-label={tab.title}
      />
      {favicon ? (
        <img src={favicon} alt="" className="h-4 w-4 shrink-0 rounded" />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onFocus(tab.tabId)}
          className="block max-w-full truncate text-left text-sm text-foreground hover:text-primary hover:underline"
          title={tab.url}
        >
          {tab.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="max-w-[220px] truncate text-[11px] text-muted-foreground">{tab.domain}</span>
          <TabStatusBadges
            tab={tab}
            archiveMode={archiveMode}
            thresholdUnit={thresholdUnit}
            pendingConfirm={pendingConfirm}
          />
        </div>
      </div>
      <span
        className={cn("shrink-0 text-xs text-muted-foreground", tab.active && "font-medium text-primary")}
        title={tab.activityEstimated ? t("tabCenter.estimatedHint") : undefined}
      >
        {idleLabel}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onLockToggle(tab)}
          title={tab.locked ? t("tabCenter.actions.unlock") : t("tabCenter.actions.lock")}
          aria-label={tab.locked ? t("tabCenter.actions.unlock") : t("tabCenter.actions.lock")}
        >
          {tab.locked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReadLater(tab.tabId)}
          title={t("tabCenter.actions.readLater")}
          aria-label={t("tabCenter.actions.readLater")}
        >
          <BookOpen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={tab.pinned}
          onClick={() => onArchive(tab.tabId)}
          title={t("tabCenter.actions.archive")}
          aria-label={t("tabCenter.actions.archive")}
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export const OpenTabRow = memo(OpenTabRowComponent);
export default OpenTabRow;
