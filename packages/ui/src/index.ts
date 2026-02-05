/**
 * @hamhome/ui - HamHome 共享 UI 组件库 (基于 shadcn/ui)
 */

// 组件导出
export * from "./components/button";
export * from "./components/input";
export * from "./components/card";
export * from "./components/label";
export * from "./components/badge";
export * from "./components/separator";
export * from "./components/select";
export * from "./components/switch";
export * from "./components/textarea";
export * from "./components/dialog";
export * from "./components/progress";
export * from "./components/avatar";
export * from "./components/dropdown-menu";
export * from "./components/tabs";
export * from "./components/collapsible";
export * from "./components/alert-dialog";
export * from "./components/scroll-area";
export * from "./components/checkbox";
export * from "./components/command";
export * from "./components/popover";
export * from "./components/hover-card";
export * from "./components/tooltip";
export * from "./components/sidebar";
export * from "./components/app-sidebar";
export * from "./components/breadcrumb";
export { default as Masonry } from "./components/masonry";
export type { MasonryRef } from "./components/masonry";
export { Toaster, toast } from "./components/sonner";

// Hooks 导出
export { useDebounce } from "./hooks/useDebounce";
export {
  useForceUpdate,
  usePositioner,
  useResizeObserver,
  useScroller,
  useContainerPosition,
  createResizeObserver,
  type UsePositionerOptions,
  type ResizeObserverInstance,
  type ScrollerResult,
  type ContainerPosition,
} from "./hooks/useMasonry";

// 工具函数导出
export { cn } from "./lib/utils";
export { masonryCompute, MasonryComputeMode } from "./lib/masonryCompute";
export { createIntervalTree, type IIntervalTree } from "./lib/interval-tree";
export { createPositioner, type IPositioner, type PositionerItem } from "./lib/positioner";

// 示例导出
export * from "./example";

export const UI_VERSION = "1.0.0";
