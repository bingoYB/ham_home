import type { EventBus } from "../core/events";
import type { AgentTool, PageDefinition } from "../core/types";
import type { ToolRegistry } from "../tools/tools";

/**
 * Manages page-scoped tools and page-specific system prompt updates.
 *
 * Example:
 * ```ts
 * agent.pages.register({ pageId: "checkout", tools: [readCartTool] });
 * await agent.pages.switchTo("checkout");
 * ```
 */
export class PageToolManager {
  private readonly pages = new Map<string, PageDefinition>();
  private unregisterCurrent?: () => void;
  currentPageId?: string;
  currentSystemPrompt?: string;

  constructor(
    private readonly tools: ToolRegistry,
    private readonly events: Pick<EventBus, "emit">,
  ) {}

  register(page: PageDefinition): () => void {
    if (this.pages.has(page.pageId)) {
      throw new Error(`Page "${page.pageId}" is already registered.`);
    }

    this.pages.set(page.pageId, page);
    return () => this.unregister(page.pageId);
  }

  registerMany(pages: PageDefinition[]): () => void {
    const unregisters = pages.map((page) => this.register(page));
    return () => unregisters.forEach((unregister) => unregister());
  }

  unregister(pageId: string): boolean {
    if (this.currentPageId === pageId) {
      this.unregisterCurrent?.();
      this.currentPageId = undefined;
      this.currentSystemPrompt = undefined;
    }
    return this.pages.delete(pageId);
  }

  list(): PageDefinition[] {
    return [...this.pages.values()];
  }

  async switchTo(target: string | URL | Location): Promise<PageDefinition> {
    const page = this.resolvePage(target);
    const previousPageId = this.currentPageId;

    this.unregisterCurrent?.();
    this.unregisterCurrent = this.tools.registerMany(page.tools.map((tool) => withPageScope(tool, page.pageId)), {
      onConflict: "replace",
    });

    this.currentPageId = page.pageId;
    this.currentSystemPrompt = page.systemPrompt;
    this.events.emit({ type: "page.changed", pageId: page.pageId, previousPageId });
    return page;
  }

  private resolvePage(target: string | URL | Location): PageDefinition {
    if (typeof target === "string" && this.pages.has(target)) {
      return this.pages.get(target) as PageDefinition;
    }

    const url = target instanceof URL ? target : new URL(String(target), "https://local.invalid");
    const page = this.list().find((candidate) => candidate.match?.(url));
    if (!page) {
      throw new Error(`No page matched "${url.toString()}".`);
    }

    return page;
  }
}

function withPageScope(tool: AgentTool, pageId: string): AgentTool {
  return {
    ...tool,
    scope: tool.scope ?? { type: "page", pageId },
  };
}
