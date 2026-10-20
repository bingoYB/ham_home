/**
 * OpenTabsGroupHeader - "Window 1 (23)" / tab group / domain header of the open tabs
 * list, with a checkbox selecting the whole group.
 */
import { useTranslation } from "react-i18next";
import { Checkbox } from "@hamhome/ui";
import type { OpenTabsGroupLabel } from "@/lib/tabs/tab-view.utils";

interface OpenTabsGroupHeaderProps {
  label: OpenTabsGroupLabel;
  count: number;
  selectedCount: number;
  onToggleAll: (selected: boolean) => void;
}

export function OpenTabsGroupHeader({ label, count, selectedCount, onToggleAll }: OpenTabsGroupHeaderProps) {
  const { t } = useTranslation("bookmark");
  const text =
    label.kind === "window"
      ? t("tabCenter.groupHeader.window", { index: label.order })
      : label.kind === "group"
        ? label.title || t("tabCenter.groupHeader.untitledGroup")
        : label.kind === "ungrouped"
          ? t("tabCenter.groupHeader.ungrouped")
          : label.domain || t("tabCenter.groupHeader.noDomain");
  const checked = selectedCount === 0 ? false : selectedCount === count ? true : "indeterminate";

  return (
    <div className="flex items-center gap-2 px-1 pb-1 pt-3 text-xs font-medium text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onToggleAll(value === true)} aria-label={text} />
      {label.kind === "group" && label.color && (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: groupColor(label.color) }} />
      )}
      <span className="text-foreground">{text}</span>
      <span>({count})</span>
      {label.kind === "window" && label.focused && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
          {t("tabCenter.groupHeader.currentWindow")}
        </span>
      )}
    </div>
  );
}

const GROUP_COLORS: Record<string, string> = {
  grey: "#5f6368",
  blue: "#1a73e8",
  red: "#d93025",
  yellow: "#f9ab00",
  green: "#188038",
  pink: "#d01884",
  purple: "#a142f4",
  cyan: "#007b83",
  orange: "#fa903e",
};

function groupColor(color: string): string {
  return GROUP_COLORS[color] ?? GROUP_COLORS.grey;
}

export default OpenTabsGroupHeader;
