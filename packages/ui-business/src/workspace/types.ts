/**
 * @hamhome/ui-business - Workspace 共享展示类型
 * 只包含展示组件需要的字段，避免引入 extension 特有字段
 */

// ============ Workspace 展示类型 ============

export interface WorkspaceTabPageData {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon?: string;
  pinned?: boolean;
  windowId?: number;
  index: number;
  tabGroupId?: number;
}

export type WorkspaceTabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

export interface WorkspaceTabGroupData {
  id: number;
  title: string;
  color: WorkspaceTabGroupColor;
  collapsed?: boolean;
  windowId?: number;
}

export interface WorkspaceData {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  pages: WorkspaceTabPageData[];
  tabGroups?: WorkspaceTabGroupData[];
  isRestored: boolean;
  restoredAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceRestoreMode = "newWindow" | "currentWindow";

export interface WorkspaceCategoryData {
  id: string;
  name: string;
  icon?: string;
}

export type WorkspaceSortBy = "createdAt" | "restoredAt" | "manual";

export interface WorkspacePreviewData {
  pages: WorkspaceTabPageData[];
  tabGroups?: WorkspaceTabGroupData[];
  currentWindowId?: number;
}
