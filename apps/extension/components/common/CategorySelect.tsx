/**
 * 分类选择组件
 * 支持树形展示、搜索、AI推荐分类匹配
 * 基于通用 TreeSelect 组件封装
 */
import { useMemo } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@hamhome/ui';
import type { LocalCategory } from '@/types';
import {
  type CategoryTreeNode,
  buildCategoryTree,
  flattenTree,
  filterCategoryTree,
} from './CategoryTree';
import { TreeSelect, type TriggerRenderParams } from './TreeSelect';
import { CategoryRecommendation } from './CategoryRecommendation';

interface CategorySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: LocalCategory[];
  /** AI 推荐的分类（可能是层级格式如 "工具/抠图"） */
  aiRecommendedCategory?: string | null;
  /** 应用 AI 推荐分类回调 */
  onApplyAICategory?: () => void;
  applyingCategory?: boolean;
  categoryError?: string | null;
  placeholder?: string;
  className?: string;
  /** Popover portal 容器（在 shadow root 中渲染时必须传入） */
  portalContainer?: HTMLElement;
}

/** 未分类的特殊 ID */
const UNCATEGORIZED_ID = '__uncategorized__';

export function CategorySelect({
  value,
  onChange,
  categories,
  aiRecommendedCategory,
  onApplyAICategory,
  applyingCategory,
  categoryError,
  placeholder,
  className,
  portalContainer,
}: CategorySelectProps) {
  const { t } = useTranslation();

  // 构建树形结构
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  // 分类匹配由业务层完成；推荐仍存在时始终允许应用，避免旧选项遮住操作入口。
  const showAIRecommendation = aiRecommendedCategory && !value;

  // 处理选择：将内部 ID 转换为外部 value
  const handleChange = (id: string | null) => {
    if (id === UNCATEGORIZED_ID) {
      onChange(null);
    } else {
      onChange(id);
    }
  };

  // 将外部 value 转换为内部 ID
  const internalValue = value === null ? UNCATEGORIZED_ID : value;

  return (
    <div className={cn('space-y-2', className)}>
      <TreeSelect<CategoryTreeNode>
        nodes={categoryTree}
        flatNodes={flatCategories}
        value={internalValue}
        onChange={handleChange}
        searchPlaceholder={t('bookmark:savePanel.searchCategory')}
        emptyText={t('bookmark:savePanel.noCategoryFound')}
        filterFn={filterCategoryTree}
        prependOptions={[
          {
            id: UNCATEGORIZED_ID,
            label: t('bookmark:bookmark.uncategorized'),
            icon: <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />,
          },
        ]}
        renderTrigger={({ selectedNode, selectedOption, open }: TriggerRenderParams<CategoryTreeNode>) => (
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full h-10 justify-between font-normal transition-colors hover:bg-muted/50 hover:text-foreground",
              open && "border-primary/60 bg-muted/40"
            )}
          >
            {selectedNode ? (
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">
                  {selectedNode.level > 0 ? selectedNode.path : selectedNode.name}
                </span>
              </div>
            ) : selectedOption ? (
              <div className="flex items-center gap-2 truncate">
                {selectedOption.icon}
                <span className="truncate">{selectedOption.label}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {placeholder || t('bookmark:savePanel.selectCategory')}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </Button>
        )}
        renderNodeIcon={() => (
          <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
        popoverWidth="var(--radix-popover-trigger-width)"
        popoverAlign="start"
        maxHeight={240}
        portalContainer={portalContainer}
      />

      {/* AI 推荐分类（不在已有分类中时显示） */}
      {showAIRecommendation && (
        <CategoryRecommendation
          category={aiRecommendedCategory}
          applying={applyingCategory}
          error={categoryError}
          onApply={onApplyAICategory}
        />
      )}
    </div>
  );
}
