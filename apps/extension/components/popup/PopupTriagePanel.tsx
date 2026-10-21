/**
 * PopupTriagePanel - the "Tidy up" panel inside the popup: least recently used tabs
 * with read later / bookmark / archive buttons; "View all" opens the tab center.
 */
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, BookmarkPlus } from "lucide-react";
import { Button } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import type { OpenTabInfo } from "@/types";

const PANEL_LIMIT = 8;

interface PopupTriagePanelProps {
  tabs: OpenTabInfo[];
  onReadLater: (tabId: number) => void;
  onBookmark: (tabId: number) => void;
  onArchive: (tabId: number) => void;
  onViewAll: () => void;
}

export function PopupTriagePanel({ tabs, onReadLater, onBookmark, onArchive, onViewAll }: PopupTriagePanelProps) {
  const { t } = useTranslation("bookmark");
  const visible = tabs.slice(0, PANEL_LIMIT);

  return (
    <section className="space-y-1 rounded-xl border bg-card p-1" data-testid="popup-triage-panel">
      {visible.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">{t("popup.triage.empty")}</p>
      ) : (
        <ul className="space-y-0.5">
          {visible.map((tab) => (
            <TriageRow
              key={tab.tabId}
              tab={tab}
              onReadLater={() => onReadLater(tab.tabId)}
              onBookmark={() => onBookmark(tab.tabId)}
              onArchive={() => onArchive(tab.tabId)}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onViewAll}
        className="w-full rounded-lg px-2 py-1.5 text-center text-xs font-medium text-primary hover:bg-muted"
      >
        {t("popup.triage.viewAll", { count: tabs.length })}
      </button>
    </section>
  );
}

interface TriageRowProps {
  tab: OpenTabInfo;
  onReadLater: () => void;
  onBookmark: () => void;
  onArchive: () => void;
}

function TriageRow({ tab, onReadLater, onBookmark, onArchive }: TriageRowProps) {
  const { t } = useTranslation("bookmark");
  const favicon = useSafeFavicon(tab.url, tab.favicon);
  const idle = useRelativeTime(tab.displayLastActiveAt);
  return (
    <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
      {favicon ? <img src={favicon} alt="" className="h-4 w-4 shrink-0 rounded" /> : <span className="h-4 w-4 shrink-0 rounded bg-muted" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]" title={tab.title}>{tab.title}</p>
        <p className="text-[11px] text-muted-foreground">{idle}</p>
      </div>
      <IconButton label={t("tabCenter.actions.readLater")} onClick={onReadLater} icon={<BookOpen className="h-3.5 w-3.5" />} />
      <IconButton label={t("tabCenter.actions.bookmark")} onClick={onBookmark} icon={<BookmarkPlus className="h-3.5 w-3.5" />} />
      <IconButton label={t("tabCenter.actions.archive")} onClick={onArchive} icon={<Archive className="h-3.5 w-3.5" />} />
    </li>
  );
}

function IconButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClick} title={label} aria-label={label}>
      {icon}
    </Button>
  );
}

export default PopupTriagePanel;
