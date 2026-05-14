import { Badge, Checkbox } from "@hamhome/ui";
import { BookmarkActionsMenu } from "./BookmarkActionsMenu";
import { BookmarkFavicon } from "./BookmarkFavicon";
import { getBookmarkHostname } from "./bookmark-utils";
import type { BookmarkDisplayProps } from "./types";

export type BookmarkListItemProps = BookmarkDisplayProps;

export function BookmarkListItem({
  bookmark,
  categoryName,
  formattedDate,
  isSelected,
  isHighlighted = false,
  faviconSrc,
  onToggleSelect,
  ...actionProps
}: BookmarkListItemProps) {
  const hostname = getBookmarkHostname(bookmark.url);
  const resolvedFavicon = faviconSrc ?? bookmark.favicon;

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
        isHighlighted
          ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20 animate-pulse"
          : isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </div>

      <BookmarkFavicon src={resolvedFavicon} size="sm" />

      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-0 grow min-w-0"
      >
        <h3
          className="font-medium text-foreground truncate"
          title={bookmark.title}
        >
          {bookmark.title}
        </h3>
        {bookmark.description && (
          <p
            className="text-xs text-muted-foreground truncate mt-1"
            title={bookmark.description}
          >
            {bookmark.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate max-w-[200px]">{hostname}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 truncate max-w-[100px]">
            {categoryName}
          </span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 whitespace-nowrap">{formattedDate}</span>
        </div>
      </a>

      {bookmark.tags.length > 0 && (
        <div className="hidden lg:flex flex-wrap items-center gap-1.5 max-w-[240px] max-h-[52px] overflow-hidden">
          {bookmark.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="shrink-0">
        <BookmarkActionsMenu bookmark={bookmark} {...actionProps} />
      </div>
    </div>
  );
}
