/**
 * 页内保存流程事件总线
 *
 * content script 入口收到 START_SAVE_FLOW 消息后通过它通知 React UI。
 * UI 挂载是异步的，所以在没有订阅者时会缓存一次触发，等 UI 就绪后立即消费，
 * 避免用户点击后因为 UI 尚未挂载而丢失触发。
 */

import type { SaveFlowTrigger } from "@/types";
export type { SaveFlowTrigger } from "@/types";

type SaveFlowListener = (trigger: SaveFlowTrigger) => void;

let listener: SaveFlowListener | null = null;
let pendingTrigger: SaveFlowTrigger | null = null;

export const saveFlowBus = {
  /** 触发一次页内保存流程 */
  emit(trigger: SaveFlowTrigger): void {
    if (listener) {
      listener(trigger);
      return;
    }
    pendingTrigger = trigger;
  },

  /** 订阅触发事件，若存在缓存的触发则立即消费 */
  subscribe(next: SaveFlowListener): () => void {
    listener = next;

    if (pendingTrigger) {
      const trigger = pendingTrigger;
      pendingTrigger = null;
      // 异步派发，避免在订阅副作用执行期间同步更新 React 状态；
      // 若订阅者已被替换（如 StrictMode 的双次挂载），把触发还给下一个订阅者
      queueMicrotask(() => {
        if (listener) {
          listener(trigger);
        } else {
          pendingTrigger = trigger;
        }
      });
    }

    return () => {
      if (listener === next) {
        listener = null;
      }
    };
  },
};
