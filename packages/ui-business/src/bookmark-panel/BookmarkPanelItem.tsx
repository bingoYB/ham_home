import { ExternalLink, Link2 } from "lucide-react";
import {
  HoverCard,
  HoverCardPrimitive,
  HoverCardTrigger,
  buttonVariants,
  cn,
} from "@hamhome/ui";
import type { BookmarkPanelBookmarkData } from "./types";

export interface BookmarkPanelItemProps<TBookmark extends BookmarkPanelBookmarkData> {
  bookmark: TBookmark;
  faviconSrc?: string | null;
  isHighlighted?: boolean;
  portalContainer?: HTMLElement;
}

export function BookmarkPanelItem<TBookmark extends BookmarkPanelBookmarkData>({
  bookmark,
  faviconSrc,
  isHighlighted = false,
  portalContainer,
}: BookmarkPanelItemProps<TBookmark>) {
  const resolvedFavicon = faviconSrc ?? bookmark.favicon;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "group flex items-center gap-3 px-3 py-2.5 w-full justify-start border-0 shadow-none overflow-hidden",
            isHighlighted &&
              "ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20 animate-pulse rounded-lg",
          )}
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0">
            {resolvedFavicon ? (
              <img
                src={resolvedFavicon}
                alt=""
                className="w-5 h-5 rounded"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h4 className="text-sm font-medium truncate leading-tight">
              {bookmark.title}
            </h4>
          </div>
          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
        </a>
      </HoverCardTrigger>
      <HoverCardPrimitive.Portal container={portalContainer}>
        <HoverCardPrimitive.Content
          side="right"
          align="start"
          sideOffset={4}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden max-w-xs"
        >
          <div className="space-y-1">
            <div className="font-medium text-sm truncate">{bookmark.title}</div>
            {bookmark.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {bookmark.description}
              </div>
            )}
            <div className="text-xs text-muted-foreground break-all">
              {bookmark.url}
            </div>
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );
}
