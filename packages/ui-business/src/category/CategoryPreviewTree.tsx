import { ChevronDown, Folder } from "lucide-react";

export interface HierarchicalCategoryData {
  id?: string;
  name: string;
  icon?: string;
  children?: HierarchicalCategoryData[];
}

export interface CategoryPreviewTreeProps {
  categories: HierarchicalCategoryData[];
  level?: number;
  generated?: boolean;
}

export function CategoryPreviewTree({
  categories,
  level = 0,
  generated = false,
}: CategoryPreviewTreeProps) {
  return (
    <div className={level > 0 ? "ml-4 border-l border-muted-foreground/20 pl-3" : ""}>
      {categories.map((category, index) => {
        const hasChildren = Boolean(category.children?.length);
        const key = category.id ?? `${category.name}-${index}`;

        return (
          <div key={key} className="py-1">
            <div className="flex items-center gap-2 text-sm">
              {hasChildren ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <div className="w-3" />
              )}
              {generated ? (
                <Folder className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <span className="text-base">{category.icon}</span>
              )}
              <span className={level === 0 ? "font-medium" : ""}>
                {category.name}
              </span>
            </div>
            {hasChildren && (
              <CategoryPreviewTree
                categories={category.children!}
                level={level + 1}
                generated={generated}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
