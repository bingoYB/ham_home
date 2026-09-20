/**
 * 保存流程的 Popup 回退标记
 *
 * 保存书签默认走页内浮窗；当页面无法注入 content script 时，background 会打开 Popup，
 * 并写入该标记，Popup 读到新鲜标记后直接进入保存表单而不是快捷操作面板。
 */
import type { SaveFlowTrigger } from "@/types";

interface SavePopupFallbackState extends SaveFlowTrigger {
  createdAt: number;
}

/** 标记有效期，超过则认为是过期残留 */
const FALLBACK_TTL = 10_000;

const savePopupFallbackItem = storage.defineItem<SavePopupFallbackState | null>(
  "local:savePopupFallback",
  { fallback: null },
);

class SavePopupFallbackStorage {
  async markPending(trigger: SaveFlowTrigger): Promise<void> {
    await savePopupFallbackItem.setValue({ ...trigger, createdAt: Date.now() });
  }

  /** 读取并清除标记，返回是否应直接进入保存模式 */
  async consumePending(): Promise<SaveFlowTrigger | null> {
    const state = await savePopupFallbackItem.getValue();
    if (!state) return null;

    await this.clear();
    if (Date.now() - state.createdAt > FALLBACK_TTL) return null;
    return { source: state.source, clip: state.clip };
  }

  async clear(): Promise<void> {
    await savePopupFallbackItem.setValue(null);
  }
}

export const savePopupFallbackStorage = new SavePopupFallbackStorage();
