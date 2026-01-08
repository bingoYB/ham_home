/**
 * 书签数据结构
 */
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  content?: string;
  categoryId: string | null;
  tags: string[];
  favicon?: string;
  snapshotKey?: string;
  waybackUrl?: string;
  vectorId?: string;
  hasSnapshot?: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建书签输入
 */
export type NewBookmark = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 书签查询参数
 */
export interface BookmarkQuery {
  categoryId?: string;
  tags?: string[];
  isDeleted?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

