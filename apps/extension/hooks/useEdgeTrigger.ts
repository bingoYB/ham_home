/**
 * useEdgeTrigger - 边缘触发 Hook
 * 检测鼠标是否靠近屏幕边缘，控制触发区显示
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export type PanelPosition = 'left' | 'right';

export interface UseEdgeTriggerOptions {
  position?: PanelPosition;
  triggerZoneWidth?: number; // 触发区宽度
  hoverDelay?: number; // 悬停延迟（毫秒）
  /** 侧边栏功能总开关，关闭时重置所有状态 */
  enabled?: boolean;
  /**
   * 是否响应鼠标边缘悬停探测。
   * 页面失焦（如打开扩展 Popup）时应暂停被动探测，
   * 但不能连带屏蔽 Popup / 快捷键这类显式的开关面板指令。
   */
  hoverEnabled?: boolean;
}

export interface UseEdgeTriggerResult {
  isNearEdge: boolean; // 鼠标是否靠近边缘
  isTriggerVisible: boolean; // 触发区是否显示
  isPanelOpen: boolean; // 面板是否展开
  position: PanelPosition;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const DEFAULT_TRIGGER_ZONE_WIDTH = 20;
const DEFAULT_HOVER_DELAY = 100;

export function useEdgeTrigger({
  position = 'left',
  triggerZoneWidth = DEFAULT_TRIGGER_ZONE_WIDTH,
  hoverDelay = DEFAULT_HOVER_DELAY,
  enabled = true,
  hoverEnabled = true,
}: UseEdgeTriggerOptions = {}): UseEdgeTriggerResult {
  const hoverActive = enabled && hoverEnabled;

  const [isNearEdge, setIsNearEdge] = useState(false);
  const [isTriggerVisible, setIsTriggerVisible] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  // 检测鼠标是否在边缘区域
  const checkEdgeProximity = useCallback(
    (mouseX: number) => {
      if (!hoverActive) return false;

      const windowWidth = window.innerWidth;
      // 触发器显示后保留缓冲区，避免指针移向按钮时意外收起。
      const effectiveZoneWidth = isTriggerVisible ? Math.max(triggerZoneWidth, 60) : triggerZoneWidth;

      if (position === 'left') {
        return mouseX <= effectiveZoneWidth;
      } else {
        return mouseX >= windowWidth - effectiveZoneWidth;
      }
    },
    [position, triggerZoneWidth, hoverActive, isTriggerVisible]
  );

  // 侧边栏功能被关闭时重置面板状态
  useEffect(() => {
    if (!enabled) {
      setIsPanelOpen(false);
    }
  }, [enabled]);

  // 鼠标移动处理
  useEffect(() => {
    if (!hoverActive) {
      clearTimers();
      setIsNearEdge(false);
      setIsTriggerVisible(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const nearEdge = checkEdgeProximity(e.clientX);
      setIsNearEdge(nearEdge);

      if (nearEdge && !isPanelOpen) {
        // 清除离开计时器
        if (leaveTimerRef.current) {
          clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }

        // 延迟显示触发区
        if (!hoverTimerRef.current && !isTriggerVisible) {
          hoverTimerRef.current = setTimeout(() => {
            setIsTriggerVisible(true);
            hoverTimerRef.current = null;
          }, hoverDelay);
        }
      } else if (!nearEdge && !isPanelOpen) {
        // 清除悬停计时器
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }

        // 延迟隐藏触发区
        if (!leaveTimerRef.current && isTriggerVisible) {
          leaveTimerRef.current = setTimeout(() => {
            setIsTriggerVisible(false);
            leaveTimerRef.current = null;
          }, 300);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimers();
    };
  }, [hoverActive, checkEdgeProximity, isPanelOpen, isTriggerVisible, hoverDelay, clearTimers]);

  // 打开面板
  const openPanel = useCallback(() => {
    if (!enabled) return;
    setIsPanelOpen(true);
    setIsTriggerVisible(false);
  }, [enabled]);

  // 关闭面板
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // 切换面板
  const togglePanel = useCallback(() => {
    if (!enabled) return;
    setIsPanelOpen((prev) => {
      if (!prev) {
        setIsTriggerVisible(false);
      }
      return !prev;
    });
  }, [enabled]);

  return {
    isNearEdge,
    isTriggerVisible,
    isPanelOpen,
    position,
    openPanel,
    closePanel,
    togglePanel,
  };
}
