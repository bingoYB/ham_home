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
export * from "./components/toast";
export * from "./components/toaster";

// Hooks 导出
export { useDebounce } from "./hooks/useDebounce";

// 工具函数导出
export { cn } from "./lib/utils";

export const UI_VERSION = "1.0.0";
