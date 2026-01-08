/**
 * 分类数据结构
 */
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: Date;
}

/**
 * 创建分类输入
 */
export type NewCategory = Omit<Category, 'id' | 'createdAt'>;

