/**
 * CustomFilterDialog - 自定义筛选器弹窗组件
 * 支持创建和编辑自定义筛选器，包含多个条件（AND 关系）
 */
import { useState, useCallback } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';
import type { FilterCondition, FilterField, FilterOperator } from '@/types';

export interface CustomFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, conditions: FilterCondition[]) => void;
}

// 字段选项
const FIELD_OPTIONS: { value: FilterField; label: string }[] = [
  { value: 'title', label: '标题' },
  { value: 'url', label: 'URL' },
  { value: 'description', label: '描述' },
  { value: 'tags', label: '标签' },
  { value: 'createdAt', label: '创建时间' },
];

// 操作符选项（根据字段类型动态显示）
const OPERATOR_OPTIONS: { value: FilterOperator; label: string; fields: FilterField[] }[] = [
  { value: 'equals', label: '等于', fields: ['title', 'url', 'description', 'tags', 'createdAt'] },
  { value: 'contains', label: '包含', fields: ['title', 'url', 'description', 'tags'] },
  { value: 'notEquals', label: '不等于', fields: ['title', 'url', 'description', 'tags', 'createdAt'] },
  { value: 'notContains', label: '不包含', fields: ['title', 'url', 'description', 'tags'] },
  { value: 'startsWith', label: '开头是', fields: ['title', 'url', 'description'] },
  { value: 'endsWith', label: '结尾是', fields: ['title', 'url', 'description'] },
  { value: 'greaterThan', label: '大于', fields: ['createdAt'] },
  { value: 'lessThan', label: '小于', fields: ['createdAt'] },
];

/**
 * 获取字段可用的操作符
 */
function getOperatorsForField(field: FilterField): FilterOperator[] {
  return OPERATOR_OPTIONS.filter((op) => op.fields.includes(field)).map((op) => op.value);
}

/**
 * 获取操作符的标签
 */
function getOperatorLabel(operator: FilterOperator): string {
  return OPERATOR_OPTIONS.find((op) => op.value === operator)?.label || operator;
}

export function CustomFilterDialog({
  open,
  onOpenChange,
  onSave,
}: CustomFilterDialogProps) {
  const { container: portalContainer } = useContentUI();
  const [filterName, setFilterName] = useState('');
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: 'title', operator: 'contains', value: '' },
  ]);

  // 添加条件
  const handleAddCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { field: 'title', operator: 'contains', value: '' },
    ]);
  }, []);

  // 删除条件
  const handleRemoveCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 更新条件
  const handleUpdateCondition = useCallback(
    (index: number, updates: Partial<FilterCondition>) => {
      setConditions((prev) => {
        const newConditions = [...prev];
        const condition = { ...newConditions[index], ...updates };
        
        // 如果字段改变，需要重置操作符为第一个可用操作符
        if (updates.field && updates.field !== prev[index].field) {
          const availableOperators = getOperatorsForField(updates.field);
          condition.operator = availableOperators[0] || 'equals';
        }
        
        newConditions[index] = condition;
        return newConditions;
      });
    },
    []
  );

  // 保存筛选器
  const handleSave = useCallback(() => {
    if (!filterName.trim()) return;
    if (conditions.length === 0) return;
    if (conditions.some((c) => !c.value.trim())) return;

    onSave(filterName.trim(), conditions);
    // 重置表单
    setFilterName('');
    setConditions([{ field: 'title', operator: 'contains', value: '' }]);
    onOpenChange(false);
  }, [filterName, conditions, onSave, onOpenChange]);

  // 取消
  const handleCancel = useCallback(() => {
    setFilterName('');
    setConditions([{ field: 'title', operator: 'contains', value: '' }]);
    onOpenChange(false);
  }, [onOpenChange]);

  const canSave = filterName.trim() && conditions.length > 0 && conditions.every((c) => c.value.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent container={portalContainer} className="sm:max-w-[480px] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">添加自定义筛选器</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* 筛选器名称 */}
          <div className="space-y-2">
            <Label className="text-sm">筛选器名称</Label>
            <Input
              placeholder="给这个筛选器起个名字"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* 筛选条件 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">筛选条件 (多个条件时需要同时满足)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddCondition}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加条件
              </Button>
            </div>

            <div className="space-y-2">
              {conditions.map((condition, index) => {
                const availableOperators = getOperatorsForField(condition.field);
                const isDateField = condition.field === 'createdAt';

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-md bg-muted/30"
                  >
                    {/* 字段选择 */}
                    <Select
                      value={condition.field}
                      onValueChange={(value: FilterField) =>
                        handleUpdateCondition(index, { field: value })
                      }
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent container={portalContainer}>
                        {FIELD_OPTIONS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 操作符选择 */}
                    <Select
                      value={condition.operator}
                      onValueChange={(value: FilterOperator) =>
                        handleUpdateCondition(index, { operator: value })
                      }
                    >
                      <SelectTrigger className="w-[90px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent container={portalContainer}>
                        {availableOperators.map((op) => (
                          <SelectItem key={op} value={op}>
                            {getOperatorLabel(op)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* 值输入 */}
                    <Input
                      type={isDateField ? 'date' : 'text'}
                      placeholder="输入条件值"
                      value={condition.value}
                      onChange={(e) =>
                        handleUpdateCondition(index, { value: e.target.value })
                      }
                      className="flex-1 h-8 text-xs"
                    />

                    {/* 删除按钮 */}
                    {conditions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
