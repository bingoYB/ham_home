/**
 * 批量选择工具栏
 * 左侧全选与已选数量，右侧由调用方决定放哪些批量操作
 */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox, cn } from "@hamhome/ui";

interface BatchSelectionToolbarProps {
  /** 当前可见列表的全部 ID，全选只作用于可见项 */
  visibleIds: string[];
  selectedCount: number;
  onToggleSelectAll: (ids: string[]) => void;
  /** 右侧批量操作按钮 */
  children?: ReactNode;
}

export function BatchSelectionToolbar({
  visibleIds,
  selectedCount,
  onToggleSelectAll,
  children,
}: BatchSelectionToolbarProps) {
  const { t } = useTranslation("bookmark");
  const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2.5 text-sm">
        <Checkbox
          aria-label={t("bookmark.batch.selectAll")}
          checked={allSelected}
          disabled={visibleIds.length === 0}
          onCheckedChange={() => onToggleSelectAll(visibleIds)}
        />
        <span className={cn(selectedCount === 0 && "text-muted-foreground")}>
          {selectedCount > 0
            ? t("bookmark.batch.selected", { count: selectedCount })
            : t("bookmark.batch.selectAll")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default BatchSelectionToolbar;
