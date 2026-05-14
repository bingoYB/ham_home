export interface BookmarkItemData {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  tags: string[];
  favicon?: string | null;
  hasSnapshot?: boolean;
}

export type BookmarkLabelResolver = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface BookmarkActionProps {
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewSnapshot?: () => void;
  onSaveSnapshot?: () => void;
  onDeleteSnapshot?: () => void;
  onSyncToObsidian?: () => void;
  onTogglePin?: () => void;
  onReanalyzeAI?: () => void;
  isPinned?: boolean;
  isProcessingAI?: boolean;
  t: BookmarkLabelResolver;
}

export interface BookmarkDisplayProps extends BookmarkActionProps {
  bookmark: BookmarkItemData;
  categoryName: string;
  formattedDate: string;
  isSelected: boolean;
  isHighlighted?: boolean;
  faviconSrc?: string | null;
  onToggleSelect: () => void;
}
