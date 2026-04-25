/**
 * 工作空间存储模块
 * 工作空间包含浏览器标签页列表，数据量可能随页面数量增长，因此使用 local 存储。
 */
import { nanoid } from "nanoid";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceCategory,
  WorkspaceQuery,
} from "@/types";

const workspacesItem = storage.defineItem<Workspace[]>("local:workspaces", {
  fallback: [],
});

const workspaceCategoriesItem = storage.defineItem<WorkspaceCategory[]>(
  "local:workspaceCategories",
  {
    fallback: [],
  },
);

const normalizeText = (value: string) => value.trim().toLowerCase();

class WorkspaceStorage {
  async getWorkspaces(query?: WorkspaceQuery): Promise<Workspace[]> {
    let workspaces = await workspacesItem.getValue();

    if (query?.categoryId !== undefined) {
      workspaces = workspaces.filter(
        (workspace) => workspace.categoryId === query.categoryId,
      );
    }

    if (query?.tags?.length) {
      const tagSet = new Set(query.tags.map(normalizeText));
      workspaces = workspaces.filter((workspace) =>
        workspace.tags.some((tag) => tagSet.has(normalizeText(tag))),
      );
    }

    if (query?.search) {
      const search = normalizeText(query.search);
      workspaces = workspaces.filter((workspace) =>
        this.matchesSearch(workspace, search),
      );
    }

    const sortBy = query?.sortBy ?? "createdAt";
    const sortOrder = query?.sortOrder ?? "desc";
    workspaces = [...workspaces].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "desc"
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      }

      const aValue = a[sortBy] ?? 0;
      const bValue = b[sortBy] ?? 0;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

    if (query?.offset) {
      workspaces = workspaces.slice(query.offset);
    }

    if (query?.limit) {
      workspaces = workspaces.slice(0, query.limit);
    }

    return workspaces;
  }

  async getWorkspaceById(id: string): Promise<Workspace | null> {
    const workspaces = await workspacesItem.getValue();
    return workspaces.find((workspace) => workspace.id === id) ?? null;
  }

  async createWorkspace(data: CreateWorkspaceInput): Promise<Workspace> {
    const workspaces = await workspacesItem.getValue();
    const now = Date.now();
    const workspace: Workspace = {
      ...data,
      id: nanoid(),
      isRestored: false,
      convertedToBookmarks: false,
      createdAt: now,
      updatedAt: now,
    };

    await workspacesItem.setValue([workspace, ...workspaces]);
    return workspace;
  }

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    const workspaces = await workspacesItem.getValue();
    const index = workspaces.findIndex((workspace) => workspace.id === id);
    if (index === -1) {
      throw new Error("工作空间不存在");
    }

    const updated: Workspace = {
      ...workspaces[index],
      ...data,
      updatedAt: Date.now(),
    };
    workspaces[index] = updated;
    await workspacesItem.setValue(workspaces);
    return updated;
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await workspacesItem.getValue();
    await workspacesItem.setValue(
      workspaces.filter((workspace) => workspace.id !== id),
    );
  }

  async searchWorkspaces(search: string, limit = 5): Promise<Workspace[]> {
    return this.getWorkspaces({ search, limit, sortBy: "createdAt" });
  }

  watchWorkspaces(callback: (workspaces: Workspace[]) => void): () => void {
    return workspacesItem.watch(callback);
  }

  async getCategories(): Promise<WorkspaceCategory[]> {
    return workspaceCategoriesItem.getValue();
  }

  async createCategory(
    name: string,
    parentId: string | null = null,
    icon?: string,
  ): Promise<WorkspaceCategory> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("分类名称不能为空");
    }

    const categories = await workspaceCategoriesItem.getValue();
    if (
      categories.some(
        (category) =>
          normalizeText(category.name) === normalizeText(normalizedName),
      )
    ) {
      throw new Error("工作空间分类已存在");
    }

    const category: WorkspaceCategory = {
      id: nanoid(),
      name: normalizedName,
      icon,
      parentId,
      order: categories.length,
      createdAt: Date.now(),
    };
    await workspaceCategoriesItem.setValue([...categories, category]);
    return category;
  }

  async updateCategory(
    id: string,
    data: Partial<Omit<WorkspaceCategory, "id" | "createdAt">>,
  ): Promise<WorkspaceCategory> {
    const categories = await workspaceCategoriesItem.getValue();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("分类不存在");
    }

    const updated = {
      ...categories[index],
      ...data,
    };
    categories[index] = updated;
    await workspaceCategoriesItem.setValue([...categories]);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = await workspaceCategoriesItem.getValue();
    await workspaceCategoriesItem.setValue(
      categories.filter((c) => c.id !== id),
    );

    // 清除引用该分类的工作空间
    const workspaces = await workspacesItem.getValue();
    let changed = false;
    const updatedWorkspaces = workspaces.map((w) => {
      if (w.categoryId === id) {
        changed = true;
        return { ...w, categoryId: null };
      }
      return w;
    });

    if (changed) {
      await workspacesItem.setValue(updatedWorkspaces);
    }
  }

  watchCategories(
    callback: (categories: WorkspaceCategory[]) => void,
  ): () => void {
    return workspaceCategoriesItem.watch(callback);
  }

  async reorderWorkspaces(orderedIds: string[]): Promise<void> {
    const workspaces = await workspacesItem.getValue();
    const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));
    const reordered: Workspace[] = [];
    for (const id of orderedIds) {
      const ws = workspaceMap.get(id);
      if (ws) {
        reordered.push(ws);
        workspaceMap.delete(id);
      }
    }
    for (const ws of workspaceMap.values()) {
      reordered.push(ws);
    }
    await workspacesItem.setValue(reordered);
  }

  private matchesSearch(workspace: Workspace, search: string): boolean {
    if (!search) return true;

    return (
      normalizeText(workspace.name).includes(search) ||
      normalizeText(workspace.description).includes(search) ||
      (workspace.tags ?? []).some((tag) => normalizeText(tag).includes(search)) ||
      (workspace.pages ?? []).some(
        (page) =>
          normalizeText(page.title).includes(search) ||
          normalizeText(page.url).includes(search) ||
          normalizeText(page.domain).includes(search),
      )
    );
  }
}

export const workspaceStorage = new WorkspaceStorage();
