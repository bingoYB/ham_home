import { Folder } from "lucide-react";
import { Badge } from "@hamhome/ui";
import { BOOKMARK_CATEGORY_COLOR } from "./bookmark-utils";

interface BookmarkCategoryBadgeProps {
  categoryName: string;
}

export function BookmarkCategoryBadge({
  categoryName,
}: BookmarkCategoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={`text-xs px-2 py-0.5 gap-1 max-w-full ${BOOKMARK_CATEGORY_COLOR}`}
      title={categoryName}
    >
      <Folder className="h-3 w-3 shrink-0" />
      <span className="truncate">{categoryName}</span>
    </Badge>
  );
}
