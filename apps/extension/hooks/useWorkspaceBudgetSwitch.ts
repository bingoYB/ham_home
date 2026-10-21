/**
 * useWorkspaceBudgetSwitch - before restoring a workspace that would push the open
 * tabs over the tab budget, offer to fold the current window into a workspace first
 * ("context switch"), open anyway, or cancel.
 */
import { useCallback, useRef, useState } from "react";
import { tabBadgeService } from "@/lib/services/tab-badge-service";
import { workspaceService } from "@/lib/services/workspace-service";
import type { Workspace } from "@/types";

export type BudgetSwitchChoice = "switch" | "open" | "cancel";

export interface BudgetSwitchPrompt {
  name: string;
  pageCount: number;
  over: number;
}

export interface UseWorkspaceBudgetSwitchResult {
  prompt: BudgetSwitchPrompt | null;
  answer: (choice: BudgetSwitchChoice) => void;
  /** Resolves false when the restore should not happen */
  beforeRestore: (workspace: Workspace, pageCount: number) => Promise<boolean>;
}

export function useWorkspaceBudgetSwitch(): UseWorkspaceBudgetSwitchResult {
  const [prompt, setPrompt] = useState<BudgetSwitchPrompt | null>(null);
  const resolverRef = useRef<((choice: BudgetSwitchChoice) => void) | null>(null);

  const answer = useCallback((choice: BudgetSwitchChoice) => {
    resolverRef.current?.(choice);
    resolverRef.current = null;
    setPrompt(null);
  }, []);

  const beforeRestore = useCallback(async (workspace: Workspace, pageCount: number) => {
    const status = await tabBadgeService.getBudgetStatus().catch(() => null);
    if (!status?.enabled) return true;
    const over = status.count + pageCount - status.limit;
    if (over <= 0) return true;

    const choice = await new Promise<BudgetSwitchChoice>((resolve) => {
      resolverRef.current = resolve;
      setPrompt({ name: workspace.name, pageCount, over });
    });
    if (choice === "cancel") return false;
    if (choice === "switch") {
      // Save the current window as a workspace, then close the saved tabs
      const preview = await workspaceService.previewCurrentWindow(false);
      if (preview.pages.length > 0) {
        await workspaceService.saveCurrentWindow({
          name: preview.name,
          pages: preview.pages,
          tabGroups: preview.tabGroups,
        });
        await workspaceService.closeSavedPageTabs(preview.pages);
      }
    }
    return true;
  }, []);

  return { prompt, answer, beforeRestore };
}
