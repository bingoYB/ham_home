/**
 * PopupRecentSection - "Recent saves | Read later (12)" in the popup.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Bookmark, BookmarkX, ChevronRight } from "lucide-react";
import { cn } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ReadLaterItem } from "@/lib/read-later/read-later.utils";
import type { LocalBookmark } from "@/types";

type RecentTab = "saves" | "readLater";

interface PopupRecentSectionProps {
  recentBookmarks: LocalBookmark[];
  readLaterItems: ReadLaterItem[];
  readLaterCount: number;
  onOpenBookmark: (bookmark: LocalBookmark) => void;
  onOpenReadLater: (item: ReadLaterItem) => void;
  onViewAll: (tab: RecentTab) => void;
}

export function PopupRecentSection({
  recentBookmarks,
  readLaterItems,
  readLaterCount,
  onOpenBookmark,
  onOpenReadLater,
  onViewAll,
}: PopupRecentSectionProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const [tab, setTab] = useState<RecentTab>("saves");
  const empty = tab === "saves" ? recentBookmarks.length === 0 : readLaterItems.length === 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1" role="tablist">
          <TabButton active={tab === "saves"} onClick={() => setTab("saves")}>
            {t("bookmark:popup.recentSaves")}
          </TabButton>
          <TabButton active={tab === "readLater"} onClick={() => setTab("readLater")} testId="popup-read-later-tab">
            {t("bookmark:popup.readLaterTab", { count: readLaterCount })}
          </TabButton>
        </div>
        <button
          type="button"
          className="flex items-center text-xs text-primary transition-opacity hover:opacity-80"
          onClick={() => onViewAll(tab)}
        >
          {t("common:common.viewAll")}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-0.5 rounded-xl border border-dashed bg-card px-3 py-4 text-center">
          <BookmarkX className="mb-1 h-5 w-5 text-muted-foreground/40" />
          <p className="text-[13px] text-muted-foreground">
            {tab === "saves" ? t("bookmark:popup.noRecentSaves") : t("bookmark:popup.noReadLater")}
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            {tab === "saves" ? t("bookmark:popup.noRecentSavesHint") : t("bookmark:popup.noReadLaterHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-0.5 rounded-xl border bg-card p-1">
          {tab === "saves"
            ? recentBookmarks.map((bookmark) => (
                <RecentRow
                  key={bookmark.id}
                  title={bookmark.title}
                  favicon={bookmark.favicon}
                  time={bookmark.createdAt}
                  icon={<Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  onOpen={() => onOpenBookmark(bookmark)}
                />
              ))
            : readLaterItems.map((item) => (
                <RecentRow
                  key={item.entry.bookmarkId}
                  title={item.bookmark.title}
                  favicon={item.bookmark.favicon}
                  time={item.entry.addedAt}
                  icon={<BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  onOpen={() => onOpenReadLater(item)}
                />
              ))}
        </ul>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-0.5 text-sm transition-colors",
        active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

interface RecentRowProps {
  title: string;
  favicon?: string;
  time: number;
  icon: React.ReactNode;
  onOpen: () => void;
}

function RecentRow({ title, favicon, time, icon, onOpen }: RecentRowProps) {
  const relativeTime = useRelativeTime(time);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
      >
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="h-4 w-4 shrink-0 rounded"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          icon
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime}</span>
      </button>
    </li>
  );
}

export default PopupRecentSection;
