import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Folder,
  Link2,
  Pin,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button, cn } from "@hamhome/ui";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { pinStorage } from "@/lib/storage";
import type { LocalBookmark, LocalCategory, PinnedItem } from "@/types";

interface PinnedSectionProps {
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  onOpenBookmark: (url: string) => void;
  onSelectCategory: (categoryId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

interface ResolvedPinnedItem {
  item: PinnedItem;
  title: string;
  subtitle: string;
  icon?: string;
  bookmark?: LocalBookmark;
  category?: LocalCategory;
}

export function PinnedSection({
  bookmarks,
  categories,
  onOpenBookmark,
  onSelectCategory,
  t,
}: PinnedSectionProps) {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    pinStorage.getPinnedItems().then(setPinnedItems);
    return pinStorage.watch(setPinnedItems);
  }, []);

  const resolvedItems = useMemo(() => {
    const bookmarkMap = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return pinnedItems
      .map<ResolvedPinnedItem | null>((item) => {
        if (item.type === "bookmark") {
          const bookmark = bookmarkMap.get(item.targetId);
          if (!bookmark) return null;
          return {
            item,
            bookmark,
            title: bookmark.title,
            subtitle: getHostname(bookmark.url),
          };
        }

        const category = categoryMap.get(item.targetId);
        if (!category) return null;
        const count = bookmarks.filter(
          (bookmark) => bookmark.categoryId === category.id,
        ).length;
        return {
          item,
          category,
          title: category.name,
          subtitle: t("bookmark:contentPanel.pinned.categoryCount", { count }),
          icon: category.icon,
        };
      })
      .filter(Boolean) as ResolvedPinnedItem[];
  }, [bookmarks, categories, pinnedItems, t]);

  if (resolvedItems.length === 0) return null;

  const visibleItems = expanded ? resolvedItems : resolvedItems.slice(0, 5);
  const canToggle = resolvedItems.length > 5;

  return (
    <section className="border-b bg-muted/20 px-2 py-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Pin className="h-3.5 w-3.5" />
          {t("bookmark:contentPanel.pinned.title")}
        </div>
        {canToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded((value) => !value)}
            title={
              expanded
                ? t("bookmark:contentPanel.pinned.collapse")
                : t("bookmark:contentPanel.pinned.expand")
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

      <div className="space-y-1">
        {visibleItems.map((resolvedItem, index) => (
          <PinnedRow
            key={resolvedItem.item.id}
            resolvedItem={resolvedItem}
            isFirst={index === 0}
            isLast={index === resolvedItems.length - 1}
            onOpenBookmark={onOpenBookmark}
            onSelectCategory={onSelectCategory}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

interface PinnedRowProps {
  resolvedItem: ResolvedPinnedItem;
  isFirst: boolean;
  isLast: boolean;
  onOpenBookmark: (url: string) => void;
  onSelectCategory: (categoryId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function PinnedRow({
  resolvedItem,
  isFirst,
  isLast,
  onOpenBookmark,
  onSelectCategory,
  t,
}: PinnedRowProps) {
  const { item, bookmark, category, title, subtitle, icon } = resolvedItem;
  const safeFavicon = useSafeFavicon(bookmark?.url ?? "", bookmark?.favicon);
  const isBookmark = item.type === "bookmark";

  const handleOpen = () => {
    if (bookmark) onOpenBookmark(bookmark.url);
    if (category) onSelectCategory(category.id);
  };

  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={handleOpen}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background">
          {isBookmark && safeFavicon ? (
            <img src={safeFavicon} alt="" className="h-4 w-4 rounded" />
          ) : icon ? (
            <span className="text-sm leading-none">{icon}</span>
          ) : isBookmark ? (
            <Link2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{title}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {subtitle}
          </div>
        </div>
        {isBookmark && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
      </button>

      <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", isFirst && "invisible")}
          onClick={() => pinStorage.move(item.type, item.targetId, "up")}
          title={t("bookmark:contentPanel.pinned.moveUp")}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6", isLast && "invisible")}
          onClick={() => pinStorage.move(item.type, item.targetId, "down")}
          title={t("bookmark:contentPanel.pinned.moveDown")}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
