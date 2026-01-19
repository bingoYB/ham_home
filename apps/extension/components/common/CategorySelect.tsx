/**
 * 分类选择组件
 * 支持树形展示、搜索、AI推荐分类匹配
 * 基于通用 TreeSelect 组件封装
 */
import * as React from 'react';
import { useMemo, useEffect } from 'react';
import { ChevronDown, FolderOpen, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@hamhome/ui';
import type { LocalCategory } from '@/types';
import {
  type CategoryTreeNode,
  buildCategoryTree,
  flattenTree,
  filterCategoryTree,
  matchCategoryByPath,
} from './CategoryTree';
import { TreeSelect, type PrependOption, type TriggerRenderParams } from './TreeSelect';

interface CategorySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  categories: LocalCategory[];
  /** AI 推荐的分类（可能是层级格式如 "工具/抠图"） */
  aiRecommendedCategory?: string | null;
  /** 应用 AI 推荐分类回调 */
  onApplyAICategory?: () => void;
  placeholder?: string;
  className?: string;
}

/** 未分类的特殊 ID */
const UNCATEGORIZED_ID = '__uncategorized__';

export function CategorySelect({
  value,
  onChange,
  categories,
  aiRecommendedCategory,
  onApplyAICategory,
  placeholder,
  className,
}: CategorySelectProps) {
  const { t } = useTranslation();

  // 构建树形结构
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  // 当前选中的分类
  const selectedCategory = useMemo(() => {
    if (!value) return null;
    return flatCategories.find((c) => c.id === value) || null;
  }, [value, flatCategories]);

  // AI 推荐分类匹配结果
  const matchedAICategory = useMemo(() => {
    if (!aiRecommendedCategory) return null;
    return matchCategoryByPath(aiRecommendedCategory, flatCategories);
  }, [aiRecommendedCategory, flatCategories]);

  // 是否显示 AI 推荐提示（匹配不到时显示）
  const showAIRecommendation = aiRecommendedCategory && !matchedAICategory && !value;

  // 如果 AI 推荐匹配到了，自动选中
  useEffect(() => {
    if (matchedAICategory && !value) {
      onChange(matchedAICategory.id);
    }
  }, [matchedAICategory, value, onChange]);

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
              "w-full h-10 justify-between font-normal hover:text-card-foreground",
              open && "border-ring ring-ring/50 ring-[3px]"
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
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        )}
        renderNodeIcon={() => (
          <FolderOpen className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
        popoverWidth="var(--radix-popover-trigger-width)"
        popoverAlign="start"
        maxHeight={240}
      />

      {/* AI 推荐分类（不在已有分类中时显示） */}
      {showAIRecommendation && (
        <div className="flex items-center justify-between py-1.5 px-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {t('bookmark:savePanel.aiRecommendedCategory')}
              <span className="font-medium">{aiRecommendedCategory}</span>
            </span>
          </div>
          {onApplyAICategory && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={onApplyAICategory}
            >
              {t('bookmark:savePanel.apply')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
