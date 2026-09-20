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

/**
 * 剪藏主体内容：保存下来的图片或选中文字本身。
 * 有主体内容的书签以内容为展示主体，标题、站点等只是附属信息。
 */
export type BookmarkSubjectContent =
  | { type: "image"; imageSrc: string }
  | { type: "text"; text: string };

export interface BookmarkActionProps {
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** 查看保存时截取的界面截图，仅在该书签有截图时提供 */
  onViewScreenshot?: () => void;
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
  /** 剪藏主体内容，存在时以内容本身作为展示主体而不是标题摘要 */
  subject?: BookmarkSubjectContent | null;
  /** 点击主体内容，打开完整内容弹窗 */
  onOpenSubject?: () => void;
  onToggleSelect: () => void;
}
