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
  enabled?: boolean;
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
}: UseEdgeTriggerOptions = {}): UseEdgeTriggerResult {
  const [isNearEdge, setIsNearEdge] = useState(false);
  const [isTriggerVisible, setIsTriggerVisible] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 检测鼠标是否在边缘区域
  const checkEdgeProximity = useCallback(
    (mouseX: number) => {
      if (!enabled) return false;

      const windowWidth = window.innerWidth;
      if (position === 'left') {
        return mouseX <= triggerZoneWidth;
      } else {
        return mouseX >= windowWidth - triggerZoneWidth;
      }
    },
    [position, triggerZoneWidth, enabled]
  );

  // 鼠标移动处理
  useEffect(() => {
    if (!enabled) return;

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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, [enabled, checkEdgeProximity, isPanelOpen, isTriggerVisible, hoverDelay]);

  // 打开面板
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    setIsTriggerVisible(false);
  }, []);

  // 关闭面板
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // 切换面板
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => {
      if (!prev) {
        setIsTriggerVisible(false);
      }
      return !prev;
    });
  }, []);

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
