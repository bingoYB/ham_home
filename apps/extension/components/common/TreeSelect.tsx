/**
 * 通用树形选择器组件
 * 提供树形结构的搜索、展开/收起、选中功能
 * 业务无关，通过 props 注入差异
 */
import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, Check, Search } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  cn,
} from "@hamhome/ui";

// ============ 类型定义 ============

/** 树节点基础约束 */
export interface BaseTreeNode {
  id: string;
  name: string;
  level: number;
  children: BaseTreeNode[];
  /** 父节点 ID（可选，用于默认过滤逻辑） */
  parentId?: string | null;
}

/** 前置选项配置 */
export interface PrependOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

/** 触发器渲染参数 */
export interface TriggerRenderParams<T> {
  selectedNode: T | null;
  selectedOption: PrependOption | null;
  open: boolean;
  disabled?: boolean;
}

/** TreeSelect 组件 Props */
export interface TreeSelectProps<T extends BaseTreeNode> {
  /** 树形数据 */
  nodes: T[];
  /** 展平后的节点列表（用于搜索和查找） */
  flatNodes: T[];
  /** 当前选中值 */
  value: string | null;
  /** 选中回调 */
  onChange: (value: string | null) => void;

  // === 搜索配置 ===
  /** 搜索框占位符 */
  searchPlaceholder?: string;
  /** 自定义过滤函数 */
  filterFn?: (nodes: T[], flatNodes: T[], search: string) => T[];
  /** 无结果时的提示文案 */
  emptyText?: string;

  // === 前置选项 ===
  /** 前置特殊选项（如"全部"、"未分类"） */
  prependOptions?: PrependOption[];

  // === 渲染定制 ===
  /** 自定义触发器渲染 */
  renderTrigger?: (params: TriggerRenderParams<T>) => React.ReactNode;
  /** 自定义节点图标 */
  renderNodeIcon?: (node: T, isSelected: boolean) => React.ReactNode;
  /** 自定义前置选项图标（未指定时使用 option.icon） */
  renderOptionIcon?: (
    option: PrependOption,
    isSelected: boolean
  ) => React.ReactNode;

  // === 样式配置 ===
  /** Popover 宽度 */
  popoverWidth?: string | number;
  /** Popover 对齐方式 */
  popoverAlign?: "start" | "end" | "center";
  /** Popover 碰撞内边距（防止超出视口） */
  collisionPadding?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
  /** 列表最大高度 */
  maxHeight?: number;
  /** 触发器类名 */
  triggerClassName?: string;

  // === 状态 ===
  /** 是否禁用 */
  disabled?: boolean;
}

// ============ 内部组件 ============

interface TreeNodeItemProps<T extends BaseTreeNode> {
  node: T;
  selectedId: string | null;
  expandedIds: Set<string>;
  isSearching: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  renderNodeIcon?: (node: T, isSelected: boolean) => React.ReactNode;
}

/** 树节点项组件 */
function TreeNodeItem<T extends BaseTreeNode>({
  node,
  selectedId,
  expandedIds,
  isSearching,
  onSelect,
  onToggleExpand,
  renderNodeIcon,
}: TreeNodeItemProps<T>) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id) || isSearching;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex items-center gap-2 w-full py-1.5 rounded-md text-sm text-left hover:bg-muted",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <div
            onClick={(e) => onToggleExpand(node.id, e)}
            className="p-0.5 hover:bg-accent rounded shrink-0 cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {renderNodeIcon ? (
          renderNodeIcon(node, isSelected)
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1 truncate">{node.name}</span>
        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
      </button>
      {hasChildren && isExpanded && (
        <div>
          {(node.children as T[]).map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              isSearching={isSearching}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              renderNodeIcon={renderNodeIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============

export function TreeSelect<T extends BaseTreeNode>({
  nodes,
  flatNodes,
  value,
  onChange,
  searchPlaceholder = "搜索...",
  filterFn,
  emptyText = "无匹配结果",
  prependOptions = [],
  renderTrigger,
  renderNodeIcon,
  renderOptionIcon,
  popoverWidth,
  popoverAlign = "start",
  collisionPadding = 8,
  maxHeight = 256,
  triggerClassName,
  disabled = false,
}: TreeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 过滤后的树
  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodes;
    if (filterFn) return filterFn(nodes, flatNodes, search);
    // 默认过滤逻辑：名称匹配
    const searchLower = search.toLowerCase();
    const matchedIds = new Set<string>();
    flatNodes.forEach((node) => {
      if (node.name.toLowerCase().includes(searchLower)) {
        matchedIds.add(node.id);
        // 添加所有父节点
        let current = node;
        while (current.parentId && typeof current.parentId === "string") {
          matchedIds.add(current.parentId);
          const parent = flatNodes.find((n) => n.id === current.parentId);
          if (!parent) break;
          current = parent;
        }
      }
    });
    const filter = (items: T[]): T[] =>
      items
        .filter((n) => matchedIds.has(n.id))
        .map((n) => ({ ...n, children: filter(n.children as T[]) }));
    return filter(nodes);
  }, [nodes, flatNodes, search, filterFn]);

  // 当前选中的节点
  const selectedNode = useMemo(() => {
    if (!value) return null;
    // 检查是否是前置选项
    if (prependOptions.some((opt) => opt.id === value)) return null;
    return flatNodes.find((n) => n.id === value) || null;
  }, [value, flatNodes, prependOptions]);

  // 当前选中的前置选项
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return prependOptions.find((opt) => opt.id === value) || null;
  }, [value, prependOptions]);

  // 展开/收起
  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 选择处理
  const handleSelect = useCallback(
    (id: string | null) => {
      onChange(id);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // 默认触发器
  const defaultTrigger = (
    <Button
      variant="outline"
      disabled={disabled}
      className={cn(
        "w-full justify-between hover:text-card-foreground",
        open && "border-ring ring-ring/50 ring-[3px]",
        triggerClassName
      )}
    >
      <span className="truncate">
        {selectedOption?.label || selectedNode?.name || searchPlaceholder}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
    </Button>
  );

  const popoverStyle: React.CSSProperties = popoverWidth
    ? {
        width:
          typeof popoverWidth === "number" ? `${popoverWidth}px` : popoverWidth,
      }
    : {};

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger
          ? renderTrigger({ selectedNode, selectedOption, open, disabled })
          : defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align={popoverAlign}
        style={popoverStyle}
        sideOffset={4}
        collisionPadding={collisionPadding}
      >
        <ScrollArea style={{ maxHeight: maxHeight, overflow: "auto" }}>
          {/* 搜索框 */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* 列表 */}
          <div className="p-1">
            {/* 前置选项 */}
            {prependOptions.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted",
                    isSelected && "bg-muted"
                  )}
                >
                  <span className="w-4 shrink-0" />
                  {renderOptionIcon
                    ? renderOptionIcon(option, isSelected)
                    : option.icon || <span className="h-4 w-4 shrink-0" />}
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}

            {/* 树节点 */}
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  selectedId={value}
                  expandedIds={expandedIds}
                  isSearching={search.trim().length > 0}
                  onSelect={handleSelect}
                  onToggleExpand={toggleExpand}
                  renderNodeIcon={renderNodeIcon}
                />
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
