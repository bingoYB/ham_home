/**
 * Popup App - 主入口
 *
 * 默认展示快捷面板（保存当前页、书签面板、最近保存、常用设置等）。
 * 保存书签的 AI 分析与表单已移到页面内完成，只有页面无法注入 content script、
 * 或用户在设置中选择在扩展弹窗中保存时，才在 Popup 内展示保存表单。
 */
import { useEffect, useState } from "react";
import { Toaster } from "@hamhome/ui";
import { QuickPanel } from "@/components/popup/QuickPanel";
import { PopupSaveView } from "@/components/popup/PopupSaveView";
import { configStorage, savePopupFallbackStorage } from "@/lib/storage";
import { useBookmarks } from "@/contexts";
import type { SaveFlowTrigger } from "@/types";
import "../../style.css";

type PopupMode = "quick" | "save";

export function App() {
  const { appSettings } = useBookmarks();
  const [mode, setMode] = useState<PopupMode>("quick");
  const [pendingTrigger, setPendingTrigger] = useState<SaveFlowTrigger | null>(null);

  // 两种情况直接进入保存模式：background 在页内保存不可用时打开 Popup 并留下标记；
  // 用户在设置中选择在扩展弹窗中保存，此时点击扩展图标也应直接打开保存表单
  useEffect(() => {
    Promise.all([
      savePopupFallbackStorage.consumePending(),
      configStorage.getSettings(),
    ])
      .then(([trigger, settings]) => {
        setPendingTrigger(trigger);
        if (trigger || settings.usePopupSavePanel) setMode("save");
      })
      .catch((error: unknown) => {
        console.warn("[Popup] Failed to read save mode:", error);
      });
  }, []);

  // 宽度固定在始终挂载的外层容器上：Popup 原生窗口只会随内容变宽、不会再收窄，
  // 两个视图各自声明不同宽度会让返回时右侧残留空白
  return (
    <div className="w-[420px]">
      {mode === "save" ? (
        <PopupSaveView
          onBack={() => setMode("quick")}
          initialClip={pendingTrigger?.clip}
        />
      ) : (
        <QuickPanel onFallbackToSaveView={() => setMode("save")} />
      )}

      <Toaster theme={appSettings.theme} />
    </div>
  );
}
