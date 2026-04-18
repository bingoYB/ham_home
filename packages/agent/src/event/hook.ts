import type { EventDispatcher, HookHandler, Unsubscribe } from "./types";

/**
 * 轻量的异步 Hook/Event 总线。
 * 所有监听器会按注册顺序串行执行，便于 before/after 场景里安全地修改上下文。
 */
export class HookManager<TEvents extends object>
  implements EventDispatcher<TEvents>
{
  private listeners = new Map<keyof TEvents, Set<HookHandler<unknown>>>();

  on<TKey extends keyof TEvents>(
    event: TKey,
    handler: HookHandler<TEvents[TKey]>,
  ): Unsubscribe {
    const current = this.listeners.get(event) ?? new Set<HookHandler<unknown>>();
    current.add(handler as HookHandler<unknown>);
    this.listeners.set(event, current);

    return () => this.off(event, handler);
  }

  once<TKey extends keyof TEvents>(
    event: TKey,
    handler: HookHandler<TEvents[TKey]>,
  ): Unsubscribe {
    let unsubscribe: Unsubscribe = () => {};

    const wrapped: HookHandler<TEvents[TKey]> = async (payload) => {
      unsubscribe();
      await handler(payload);
    };

    unsubscribe = this.on(event, wrapped);
    return unsubscribe;
  }

  off<TKey extends keyof TEvents>(
    event: TKey,
    handler: HookHandler<TEvents[TKey]>,
  ): void {
    const current = this.listeners.get(event);
    if (!current) {
      return;
    }

    current.delete(handler as HookHandler<unknown>);

    if (current.size === 0) {
      this.listeners.delete(event);
    }
  }

  clear(event?: keyof TEvents): void {
    if (event) {
      this.listeners.delete(event);
      return;
    }

    this.listeners.clear();
  }

  listenerCount(event: keyof TEvents): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  async emit<TKey extends keyof TEvents>(
    event: TKey,
    payload: TEvents[TKey],
  ): Promise<TEvents[TKey]> {
    const current = this.listeners.get(event);

    if (!current || current.size === 0) {
      return payload;
    }

    for (const handler of current) {
      await handler(payload);
    }

    return payload;
  }
}
