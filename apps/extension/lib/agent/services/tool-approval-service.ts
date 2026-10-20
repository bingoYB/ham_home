import type { AgentTool, SecurityPolicy } from "@hamhome/agent";
import { generateId } from "@hamhome/utils";
import {
  bookmarkStorage,
  configStorage,
  tabGroupRulesStorage,
} from "@/lib/storage";
import type { AgentToolApprovalRequest, Language, LocalCategory } from "@/types";
import { getToolDisplayName } from "../tools/tool-display-names";
import { isAutoApprovedCall } from "../tools/tool-approval-rules";

/**
 * Unanswered approvals are rejected after this delay, so a closed panel never
 * blocks a turn and the turn stays well inside the MV3 5-minute event limit.
 */
export const TOOL_APPROVAL_TIMEOUT_MS = 2 * 60 * 1000;

type ApprovalDescription = Pick<AgentToolApprovalRequest, "title" | "target" | "detail">;

interface PendingApproval {
  turnId: string;
  request: AgentToolApprovalRequest;
  settle: (approved: boolean) => void;
}

/**
 * Holds tool calls waiting for a user decision. The UI polls by turn id (which
 * also keeps the service worker alive) and answers by approval id.
 *
 * Example:
 * ```ts
 * const approved = await broker.waitForDecision(turnId, request);
 * broker.resolve(request.id, true); // from the UI
 * ```
 */
export class ToolApprovalBroker {
  private readonly pending = new Map<string, PendingApproval>();

  waitForDecision(turnId: string, request: AgentToolApprovalRequest): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => this.resolve(request.id, false),
        Math.max(0, request.expiresAt - Date.now()),
      );
      this.pending.set(request.id, {
        turnId,
        request,
        settle: (approved) => {
          clearTimeout(timer);
          this.pending.delete(request.id);
          resolve(approved);
        },
      });
    });
  }

  getPending(turnId: string): AgentToolApprovalRequest | null {
    for (const item of this.pending.values()) {
      if (item.turnId === turnId) {
        return item.request;
      }
    }
    return null;
  }

  /** Returns false when the approval was already settled or expired. */
  resolve(approvalId: string, approved: boolean): boolean {
    const item = this.pending.get(approvalId);
    item?.settle(approved);
    return Boolean(item);
  }
}

/**
 * High-risk tools (deletes) need the user's approval before they run.
 */
export function requiresUserApproval(tool: AgentTool): boolean {
  return tool.metadata?.riskLevel === "high";
}

/**
 * Build the SDK security policy that asks before running high-risk tools.
 */
export function createToolApprovalPolicy(options: {
  tools: AgentTool[];
  language: Language;
  requestApproval: (request: AgentToolApprovalRequest) => Promise<boolean>;
}): SecurityPolicy {
  const gatedToolNames = new Set(
    options.tools.filter(requiresUserApproval).map((tool) => tool.name),
  );

  return {
    getToolPermission: (toolName) => ({
      mode: gatedToolNames.has(toolName) ? "ask" : "allow",
    }),
    onAsk: async (toolName, input) => {
      // Some tools only need approval for batches; single items run directly
      if (isAutoApprovedCall(toolName, isRecord(input) ? input : {})) return true;
      const description = await describeToolCall(
        toolName,
        isRecord(input) ? input : {},
        options.language,
      );
      return options.requestApproval({
        id: generateId(),
        toolName,
        ...description,
        expiresAt: Date.now() + TOOL_APPROVAL_TIMEOUT_MS,
      });
    },
  };
}

/**
 * Turn raw tool input (ids) into something the user can judge.
 */
async function describeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  language: Language,
): Promise<ApprovalDescription> {
  const isZh = language === "zh";
  const id = typeof input.id === "string" ? input.id : "";
  const title = getToolDisplayName(toolName, language);

  switch (toolName) {
    case "delete_bookmark": {
      const bookmark = id ? await bookmarkStorage.getBookmarkById(id) : null;
      const permanentDetail = isZh
        ? "永久删除，无法恢复。"
        : "Deletes it permanently. This cannot be undone.";
      const trashDetail = isZh
        ? "移入回收站，可在回收站恢复。"
        : "Moves it to the trash, where it can be restored.";
      return {
        title,
        target: bookmark?.title || bookmark?.url || id,
        detail: input.permanent === true ? permanentDetail : trashDetail,
      };
    }
    case "delete_category": {
      const categories = await bookmarkStorage.getCategories();
      const descendantCount = countDescendants(categories, id);
      const subcategories = isZh
        ? `会同时删除 ${descendantCount} 个子分类，`
        : `Also deletes ${descendantCount} subcategories. `;
      return {
        title,
        target: categories.find((category) => category.id === id)?.name || id,
        detail:
          (descendantCount > 0 ? subcategories : "") +
          (isZh ? "其中的书签会移到「未分类」。" : "Its bookmarks move to Uncategorized."),
      };
    }
    case "delete_custom_filter": {
      const filters = await configStorage.getCustomFilters();
      return { title, target: filters.find((filter) => filter.id === id)?.name || id };
    }
    case "delete_tab_group_rule": {
      const rules = await tabGroupRulesStorage.getRules();
      return { title, target: rules.find((rule) => rule.id === id)?.name || id };
    }
    case "move_tabs_to_read_later":
    case "archive_tabs": {
      const tabIds = Array.isArray(input.tabIds) ? input.tabIds.map(Number) : [];
      const titles = await describeTabs(tabIds);
      return {
        title,
        target: titles,
        detail:
          toolName === "archive_tabs"
            ? isZh
              ? `关闭 ${tabIds.length} 个标签页，可在“标签页 → 归档”中找回。`
              : `Closes ${tabIds.length} tabs; they can be found under Tabs → Archive.`
            : isZh
              ? `加入稍后读并关闭 ${tabIds.length} 个标签页。`
              : `Adds ${tabIds.length} tabs to Read later and closes them.`,
      };
    }
    case "update_read_later_status": {
      const ids = Array.isArray(input.bookmarkIds) ? input.bookmarkIds.length : 0;
      return {
        title,
        detail: isZh ? `更新 ${ids} 个稍后读条目。` : `Updates ${ids} Read later items.`,
      };
    }
    default:
      return { title, detail: JSON.stringify(input).slice(0, 200) };
  }
}

async function describeTabs(tabIds: number[]): Promise<string> {
  const { browser } = await import("wxt/browser");
  const titles = await Promise.all(
    tabIds.slice(0, 5).map(async (tabId) => {
      const tab = await browser.tabs.get(tabId).catch(() => null);
      return tab?.title || tab?.url || String(tabId);
    }),
  );
  return titles.join("、") + (tabIds.length > 5 ? ` …(${tabIds.length})` : "");
}

function countDescendants(categories: LocalCategory[], parentId: string): number {
  if (!parentId) {
    return 0;
  }

  return categories
    .filter((category) => category.parentId === parentId)
    .reduce((count, child) => count + 1 + countDescendants(categories, child.id), 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
