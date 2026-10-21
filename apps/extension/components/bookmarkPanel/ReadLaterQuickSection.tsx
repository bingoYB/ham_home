/**
 * ReadLaterQuickSection - "Read later" quick list of the in-page edge panel: the
 * newest unread items; opening one marks it as reading.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@hamhome/ui";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { getItemDomain } from "@/lib/read-later/read-later.utils";
import type { ReadLaterQuickItem } from "@/types";

const COLLAPSED_COUNT = 3;

interface ReadLaterQuickSectionProps {
  items: ReadLaterQuickItem[];
  unreadCount: number;
  onOpen: (bookmarkId: string) => void;
  onViewAll: () => void;
}

export function ReadLaterQuickSection({
  items,
  unreadCount,
  onOpen,
  onViewAll,
}: ReadLaterQuickSectionProps) {
  const { t } = useTranslation("bookmark");
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const canToggle = items.length > COLLAPSED_COUNT;

  return (
    <section className="border-b bg-muted/20 px-2 py-2" data-testid="panel-read-later">
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          {t("contentPanel.readLater.title", { count: unreadCount })}
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-primary"
            onClick={onViewAll}
          >
            {t("contentPanel.readLater.viewAll")}
          </Button>
          {canToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded((value) => !value)}
              title={
                expanded
                  ? t("contentPanel.readLater.collapse")
                  : t("contentPanel.readLater.expand")
              }
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {visibleItems.map((item) => (
          <QuickRow key={item.bookmarkId} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

interface QuickRowProps {
  item: ReadLaterQuickItem;
  onOpen: (bookmarkId: string) => void;
}

function QuickRow({ item, onOpen }: QuickRowProps) {
  const { t } = useTranslation("bookmark");
  const favicon = useSafeFavicon(item.url, item.favicon);
  const meta = [
    item.reading ? t("readLater.status.reading") : null,
    item.estimatedMinutes ? t("readLater.minutes", { count: item.estimatedMinutes }) : null,
    getItemDomain(item.url),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-background"
      onClick={() => onOpen(item.bookmarkId)}
      title={item.title}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background">
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4 rounded" />
        ) : (
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{item.title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{meta}</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
