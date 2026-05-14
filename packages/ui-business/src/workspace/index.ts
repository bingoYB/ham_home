/**
 * @hamhome/ui-business/workspace - Workspace 共享展示组件
 */

// Types
export type {
  WorkspaceTabPageData,
  WorkspaceTabGroupData,
  WorkspaceTabGroupColor,
  WorkspaceData,
  WorkspaceRestoreMode,
  WorkspaceCategoryData,
  WorkspaceSortBy,
  WorkspacePreviewData,
} from "./types";

export * from "./constants";

// Context
export {
  WorkspaceLabelsProvider,
  useWorkspaceLabels,
  type WorkspaceLabels,
  type WorkspaceLabelsProviderProps,
} from "./WorkspaceLabelsContext";

// Components
export { FaviconIcon, type FaviconIconProps } from "./FaviconIcon";
export { WorkspacePageTile, type WorkspacePageTileProps } from "./WorkspacePageTile";
export { WorkspaceSectionHeader, type WorkspaceSectionHeaderProps } from "./WorkspaceSectionHeader";
export { WorkspaceTabGroupList, type WorkspaceTabGroupListProps } from "./WorkspaceTabGroupList";
export { WorkspaceSearchBar, type WorkspaceSearchBarProps } from "./WorkspaceSearchBar";
export { WorkspaceCurrentTabsPanel, type WorkspaceCurrentTabsPanelProps } from "./WorkspaceCurrentTabsPanel";

// Utils
export {
  getWorkspaceTabGroupKey,
  getWorkspacePageGroupKey,
  filterWorkspaceTabGroups,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  CATEGORY_COLOR,
  MANY_PAGES_THRESHOLD,
} from "./workspace-utils";
