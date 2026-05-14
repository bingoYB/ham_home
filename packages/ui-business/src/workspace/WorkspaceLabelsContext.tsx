/**
 * Workspace 业务组件 Label Context
 * 通过 Context Provider 注入文本，解耦 i18n
 */
import { createContext, useContext, type ReactNode } from "react";

export interface WorkspaceLabels {
  /** e.g. "5 个标签页" */
  pageCount: (count: number) => string;
  /** e.g. "恢复时间" */
  restoredAt: string;
  /** e.g. "从不" */
  neverRestored: string;
  /** e.g. "编辑工作空间" */
  editWorkspace: string;
  /** e.g. "新窗口恢复" */
  restoreNewWindow: string;
  /** e.g. "当前窗口恢复" */
  restoreCurrentWindow: string;
  /** e.g. "删除工作空间" */
  deleteWorkspace: string;
  /** e.g. "点击编辑名称" */
  clickToEdit: string;
  /** e.g. "更多操作" */
  moreActions: string;
  /** e.g. "编辑" */
  edit: string;
  /** e.g. "打开页面" */
  openPage: string;
  /** e.g. "复制链接" */
  copyUrl: string;
  /** e.g. "保存为书签" */
  saveToBookmark: string;
  /** e.g. "删除页面" */
  deletePage: string;
  /** e.g. "搜索工作空间..." */
  searchPlaceholder: string;
  /** e.g. "所有分类" */
  allCategories: string;
  /** e.g. "未分类" */
  uncategorized: string;
  /** e.g. "未知分类" */
  unknownCategory: string;
  /** e.g. "手动排序" */
  sortManual: string;
  /** e.g. "按创建时间" */
  sortCreatedAt: string;
  /** e.g. "按最近恢复" */
  sortRestoredAt: string;
  /** e.g. "当前标签页" */
  currentTabs: string;
  /** e.g. "保存当前窗口" */
  saveCurrentWindow: string;
  /** e.g. "保存此窗口" */
  saveThisWindow: string;
  /** e.g. "刷新当前状态" */
  refreshCurrentTabs: string;
  /** e.g. "正在获取当前标签页..." */
  currentTabsLoading: string;
  /** e.g. "当前窗口没有打开的标签页" */
  currentTabsEmpty: string;
  /** e.g. "当前窗口" */
  currentWindowLabel: string;
  /** e.g. "窗口 1" */
  windowLabel: (index: number) => string;
}

const defaultLabels: WorkspaceLabels = {
  pageCount: (count) => `${count} 个标签页`,
  restoredAt: "恢复时间",
  neverRestored: "从不",
  editWorkspace: "编辑工作空间",
  restoreNewWindow: "新窗口恢复",
  restoreCurrentWindow: "当前窗口恢复",
  deleteWorkspace: "删除工作空间",
  clickToEdit: "点击编辑名称",
  moreActions: "更多操作",
  edit: "编辑",
  openPage: "打开页面",
  copyUrl: "复制链接",
  saveToBookmark: "保存为书签",
  deletePage: "删除页面",
  searchPlaceholder: "搜索工作空间...",
  allCategories: "所有分类",
  uncategorized: "未分类",
  unknownCategory: "未知分类",
  sortManual: "手动排序",
  sortCreatedAt: "按创建时间",
  sortRestoredAt: "按最近恢复",
  currentTabs: "当前标签页",
  saveCurrentWindow: "保存当前窗口",
  saveThisWindow: "保存此窗口",
  refreshCurrentTabs: "刷新当前状态",
  currentTabsLoading: "正在获取当前标签页...",
  currentTabsEmpty: "当前窗口没有打开的标签页",
  currentWindowLabel: "当前窗口",
  windowLabel: (index: number) => `窗口 ${index}`,
};

const WorkspaceLabelsContext = createContext<WorkspaceLabels>(defaultLabels);

export interface WorkspaceLabelsProviderProps {
  labels: WorkspaceLabels;
  children: ReactNode;
}

export function WorkspaceLabelsProvider({
  labels,
  children,
}: WorkspaceLabelsProviderProps) {
  return (
    <WorkspaceLabelsContext.Provider value={labels}>
      {children}
    </WorkspaceLabelsContext.Provider>
  );
}

export function useWorkspaceLabels(): WorkspaceLabels {
  return useContext(WorkspaceLabelsContext);
}
