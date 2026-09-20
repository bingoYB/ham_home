import type { AgentEvent, EventHandler } from "./types";

/**
 * Small synchronous event bus for observing agent, tool, page and command activity.
 *
 * Example:
 * ```ts
 * const off = events.on(event => console.log(event.type));
 * off();
 * ```
 */
export class EventBus {
  private readonly handlers = new Set<EventHandler>();

  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: AgentEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
