/**
 * ContentTypeFilterDropdown - 内容类型下拉筛选组件
 * 支持筛选所有、书签、图片、文本
 */
import { useTranslation } from "react-i18next";
import {
  Bookmark,
  Highlighter,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@hamhome/ui";
import type { BookmarkContentType } from "@/hooks/useBookmarkSearch";

export interface ContentTypeFilterDropdownProps {
  value: BookmarkContentType;
  onChange: (value: BookmarkContentType) => void;
  className?: string;
  triggerClassName?: string;
}

export function ContentTypeFilterDropdown({
  value,
  onChange,
  className,
  triggerClassName,
}: ContentTypeFilterDropdownProps) {
  const { t } = useTranslation(["bookmark"]);

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as BookmarkContentType)}
      >
        <SelectTrigger
          className={cn(
            "w-[125px] h-9 gap-2 text-sm font-normal",
            triggerClassName,
          )}
          aria-label={t("bookmark:bookmark.filter.contentType")}
        >
          <SelectValue placeholder={t("bookmark:bookmark.filter.typeAll")} />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{t("bookmark:bookmark.filter.typeAll")}</span>
            </div>
          </SelectItem>
          <SelectItem value="bookmark">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 shrink-0 text-blue-500" />
              <span>{t("bookmark:bookmark.filter.typeBookmark")}</span>
            </div>
          </SelectItem>
          <SelectItem value="image">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 shrink-0 text-amber-500" />
              <span>{t("bookmark:bookmark.filter.typeImage")}</span>
            </div>
          </SelectItem>
          <SelectItem value="text">
            <div className="flex items-center gap-2">
              <Highlighter className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{t("bookmark:bookmark.filter.typeText")}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
