/**
 * useAddToWorkspace - put pages (open tabs or archived tabs) into an existing
 * workspace or a new one. URLs already in the workspace are skipped.
 */
import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { getFavicon } from "@hamhome/utils";
import { workspaceStorage } from "@/lib/storage/workspace-storage";
import { getDomainFromUrl } from "@/lib/tabs/tab-archive.utils";
import type { Workspace, WorkspaceTabPage } from "@/types";

export interface WorkspacePageInput {
  title: string;
  url: string;
  favicon?: string;
}

export type WorkspaceTarget = { workspaceId: string } | { name: string };

export interface UseAddToWorkspaceResult {
  workspaces: Workspace[];
  /** Resolves with the number of pages added */
  addPages: (target: WorkspaceTarget, pages: WorkspacePageInput[]) => Promise<number>;
}

function toPage(input: WorkspacePageInput, index: number): WorkspaceTabPage {
  return {
    id: nanoid(),
    title: input.title || input.url,
    url: input.url,
    domain: getDomainFromUrl(input.url),
    favicon: input.favicon || getFavicon(input.url),
    index,
  };
}

export function useAddToWorkspace(): UseAddToWorkspaceResult {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    void workspaceStorage.getWorkspaces().then(setWorkspaces);
    return workspaceStorage.watchWorkspaces(setWorkspaces);
  }, []);

  const addPages = useCallback(async (target: WorkspaceTarget, pages: WorkspacePageInput[]) => {
    if ("name" in target) {
      const unique = Array.from(new Map(pages.map((page) => [page.url, page])).values());
      await workspaceStorage.createWorkspace({
        name: target.name.trim(),
        description: "",
        categoryId: null,
        tags: [],
        pages: unique.map(toPage),
      });
      return unique.length;
    }

    const workspace = await workspaceStorage.getWorkspaceById(target.workspaceId);
    if (!workspace) throw new Error("workspace-missing");
    const existingUrls = new Set(workspace.pages.map((page) => page.url));
    const fresh = pages.filter((page) => {
      if (existingUrls.has(page.url)) return false;
      existingUrls.add(page.url);
      return true;
    });
    if (fresh.length === 0) return 0;
    const start = workspace.pages.length;
    await workspaceStorage.updateWorkspace(workspace.id, {
      pages: [...workspace.pages, ...fresh.map((page, offset) => toPage(page, start + offset))],
    });
    return fresh.length;
  }, []);

  return { workspaces, addPages };
}
