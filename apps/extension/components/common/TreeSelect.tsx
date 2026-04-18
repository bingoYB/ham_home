/**
 * 通用树形选择器组件
 * 提供树形结构的搜索、展开/收起、选中功能
 * 业务无关，通过 props 注入差异
 */
import * as React from "react";
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useId,
} from "react";
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

interface VisibleItem<T extends BaseTreeNode> {
  id: string;
  type: "option" | "node";
  node?: T;
  option?: PrependOption;
  hasChildren?: boolean;
  isExpanded?: boolean;
}

function flattenVisibleTree<T extends BaseTreeNode>(
  nodes: T[],
  expandedIds: Set<string>,
  isSearching: boolean
): VisibleItem<T>[] {
  const result: VisibleItem<T>[] = [];

  const traverse = (items: T[]) => {
    items.forEach((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = isSearching || expandedIds.has(node.id);

      result.push({
        id: node.id,
        type: "node",
        node,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded) {
        traverse(node.children as T[]);
      }
    });
  };

  traverse(nodes);
  return result;
}

function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void
) {
  return (event: E) => {
    theirHandler?.(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

// ============ 内部组件 ============

interface TreeNodeItemProps<T extends BaseTreeNode> {
  node: T;
  selectedId: string | null;
  activeId: string | null;
  expandedIds: Set<string>;
  isSearching: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onHover: (id: string) => void;
  setItemRef: (id: string, element: HTMLButtonElement | null) => void;
  renderNodeIcon?: (node: T, isSelected: boolean) => React.ReactNode;
}

/** 树节点项组件 */
function TreeNodeItem<T extends BaseTreeNode>({
  node,
  selectedId,
  activeId,
  expandedIds,
  isSearching,
  onSelect,
  onToggleExpand,
  onHover,
  setItemRef,
  renderNodeIcon,
}: TreeNodeItemProps<T>) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id) || isSearching;
  const isSelected = selectedId === node.id;
  const isActive = activeId === node.id;

  return (
    <div>
      <button
        type="button"
        ref={(element) => setItemRef(node.id, element)}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => onHover(node.id)}
        onFocus={() => onHover(node.id)}
        tabIndex={-1}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "flex items-center gap-2 w-full py-1.5 rounded-md text-sm text-left hover:bg-muted",
          isActive && "bg-accent",
          isSelected && "bg-muted",
          isActive && isSelected && "bg-accent"
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
              activeId={activeId}
              expandedIds={expandedIds}
              isSearching={isSearching}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onHover={onHover}
              setItemRef={setItemRef}
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
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const listboxId = useId();
  const triggerId = useId();
  const isSearching = search.trim().length > 0;

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

  const visibleItems = useMemo(() => {
    return [
      ...prependOptions.map<VisibleItem<T>>((option) => ({
        id: option.id,
        type: "option",
        option,
      })),
      ...flattenVisibleTree(filteredNodes, expandedIds, isSearching),
    ];
  }, [prependOptions, filteredNodes, expandedIds, isSearching]);

  const getInitialHighlightedId = useCallback(() => {
    if (value && visibleItems.some((item) => item.id === value)) {
      return value;
    }
    return visibleItems[0]?.id ?? null;
  }, [value, visibleItems]);

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

  const setItemRef = useCallback((id: string, element: HTMLButtonElement | null) => {
    if (element) {
      itemRefs.current.set(id, element);
      return;
    }
    itemRefs.current.delete(id);
  }, []);

  // 选择处理
  const handleSelect = useCallback(
    (id: string | null) => {
      onChange(id);
      setOpen(false);
      setSearch("");
      setHighlightedId(null);
    },
    [onChange]
  );

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (visibleItems.length === 0) return;

      setHighlightedId((prev) => {
        const currentIndex = prev
          ? visibleItems.findIndex((item) => item.id === prev)
          : -1;

        if (currentIndex === -1) {
          return direction > 0
            ? visibleItems[0]?.id ?? null
            : visibleItems[visibleItems.length - 1]?.id ?? null;
        }

        const nextIndex = Math.min(
          visibleItems.length - 1,
          Math.max(0, currentIndex + direction)
        );
        return visibleItems[nextIndex]?.id ?? null;
      });
    },
    [visibleItems]
  );

  const closePopover = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlightedId(null);
  }, []);

  const openPopover = useCallback(
    (nextHighlightedId?: string | null) => {
      if (disabled) return;
      setOpen(true);
      setHighlightedId(nextHighlightedId ?? getInitialHighlightedId());
    },
    [disabled, getInitialHighlightedId]
  );

  const highlightedItem = useMemo(
    () => visibleItems.find((item) => item.id === highlightedId) ?? null,
    [visibleItems, highlightedId]
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveHighlight(1);
          return;
        case "ArrowUp":
          event.preventDefault();
          moveHighlight(-1);
          return;
        case "Home":
          event.preventDefault();
          setHighlightedId(visibleItems[0]?.id ?? null);
          return;
        case "End":
          event.preventDefault();
          setHighlightedId(visibleItems[visibleItems.length - 1]?.id ?? null);
          return;
        case "Enter":
          if (highlightedItem) {
            event.preventDefault();
            handleSelect(highlightedItem.id);
          }
          return;
        case "Escape":
          event.preventDefault();
          closePopover();
          return;
        case "Tab":
          closePopover();
          return;
        case "ArrowRight":
          if (
            !isSearching &&
            highlightedItem?.type === "node" &&
            highlightedItem.hasChildren &&
            !highlightedItem.isExpanded
          ) {
            event.preventDefault();
            setExpandedIds((prev) => new Set(prev).add(highlightedItem.id));
          }
          return;
        case "ArrowLeft":
          if (
            !isSearching &&
            highlightedItem?.type === "node" &&
            highlightedItem.hasChildren &&
            highlightedItem.isExpanded
          ) {
            event.preventDefault();
            setExpandedIds((prev) => {
              const next = new Set(prev);
              next.delete(highlightedItem.id);
              return next;
            });
          }
          return;
        default:
          return;
      }
    },
    [
      open,
      moveHighlight,
      visibleItems,
      highlightedItem,
      handleSelect,
      closePopover,
      isSearching,
    ]
  );

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) {
          const currentIndex = value
            ? visibleItems.findIndex((item) => item.id === value)
            : -1;
          const nextId =
            currentIndex >= 0
              ? visibleItems[Math.min(currentIndex + 1, visibleItems.length - 1)]
                  ?.id ?? null
              : visibleItems[0]?.id ?? null;
          openPopover(nextId);
        } else {
          moveHighlight(1);
        }
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          const currentIndex = value
            ? visibleItems.findIndex((item) => item.id === value)
            : -1;
          const nextId =
            currentIndex >= 0
              ? visibleItems[Math.max(currentIndex - 1, 0)]?.id ?? null
              : visibleItems[visibleItems.length - 1]?.id ?? null;
          openPopover(nextId);
        } else {
          moveHighlight(-1);
        }
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!open) {
          openPopover();
        }
        return;
      }

      const isPrintableKey =
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey;

      if (!open && isPrintableKey) {
        event.preventDefault();
        setSearch(event.key);
        openPopover();
      }
    },
    [disabled, open, value, visibleItems, openPopover, moveHighlight]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        openPopover();
      } else {
        closePopover();
      }
    },
    [openPopover, closePopover]
  );

  useEffect(() => {
    if (!open) return;

    const frameId = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      itemRefs.current.get(highlightedId ?? "")?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [open, highlightedId]);

  useEffect(() => {
    if (!open) return;

    setHighlightedId((prev) => {
      if (isSearching) {
        return visibleItems[0]?.id ?? null;
      }

      if (prev && visibleItems.some((item) => item.id === prev)) {
        return prev;
      }

      return getInitialHighlightedId();
    });
  }, [open, isSearching, visibleItems, getInitialHighlightedId]);

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

  const triggerNode = renderTrigger
    ? renderTrigger({ selectedNode, selectedOption, open, disabled })
    : defaultTrigger;

  const trigger = React.isValidElement(triggerNode)
    ? React.cloneElement(
        triggerNode as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
        {
          id: triggerId,
          role: "combobox",
          "aria-expanded": open,
          "aria-controls": open ? listboxId : undefined,
          "aria-haspopup": "listbox",
          onKeyDown: composeEventHandlers(
            (
              triggerNode as React.ReactElement<
                React.HTMLAttributes<HTMLElement>
              >
            ).props.onKeyDown,
            handleTriggerKeyDown
          ),
        }
      )
    : triggerNode;

  const popoverStyle: React.CSSProperties = popoverWidth
    ? {
        width:
          typeof popoverWidth === "number" ? `${popoverWidth}px` : popoverWidth,
      }
    : {};

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* 列表 */}
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="p-1"
          >
            {/* 前置选项 */}
            {prependOptions.map((option) => {
              const isSelected = value === option.id;
              const isActive = highlightedId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  ref={(element) => setItemRef(option.id, element)}
                  onClick={() => handleSelect(option.id)}
                  onMouseEnter={() => setHighlightedId(option.id)}
                  onFocus={() => setHighlightedId(option.id)}
                  tabIndex={-1}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted",
                    isActive && "bg-accent",
                    isSelected && "bg-muted",
                    isActive && isSelected && "bg-accent"
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
                  activeId={highlightedId}
                  expandedIds={expandedIds}
                  isSearching={isSearching}
                  onSelect={handleSelect}
                  onToggleExpand={toggleExpand}
                  onHover={setHighlightedId}
                  setItemRef={setItemRef}
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
