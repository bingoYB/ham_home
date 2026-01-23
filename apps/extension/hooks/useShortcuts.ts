/**
 * useShortcuts - 获取扩展快捷键配置
 * 使用 chrome.commands.getAll() API 读取当前配置
 */
import { useState, useEffect, useCallback } from 'react';

export interface ShortcutInfo {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 当前快捷键 (可能为空) */
  shortcut: string;
  /** 格式化后的快捷键显示 */
  formattedShortcut: string;
}

/**
 * 格式化快捷键为更易读的格式
 * 例如: "⇧⌘U" -> "⌘ Shift U"
 */
function formatShortcut(shortcut: string): string {
  if (!shortcut) return '';
  
  // 检测是否是 Mac 平台
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  
  // 标准化快捷键格式
  let formatted = shortcut
    // 处理 Mac 符号
    .replace(/⌘/g, isMac ? '⌘' : 'Ctrl')
    .replace(/⇧/g, 'Shift')
    .replace(/⌥/g, isMac ? 'Option' : 'Alt')
    .replace(/⌃/g, 'Ctrl')
    // 处理文字格式
    .replace(/Command/gi, isMac ? '⌘' : 'Ctrl')
    .replace(/Ctrl/gi, isMac ? '⌃' : 'Ctrl')
    .replace(/Alt/gi, isMac ? 'Option' : 'Alt');
  
  // 用 + 分隔各个键
  const parts = formatted.split(/(?=[A-Z⌘⌃⌥])|(?<=[\+\s])/g)
    .map(p => p.trim())
    .filter(p => p && p !== '+');
  
  return parts.join(' + ');
}

interface UseShortcutsReturn {
  /** 快捷键列表 */
  shortcuts: ShortcutInfo[];
  /** 是否加载中 */
  isLoading: boolean;
  /** 刷新快捷键配置 */
  refresh: () => Promise<void>;
}

/**
 * 获取扩展快捷键配置的 Hook
 * 
 * @example
 * ```tsx
 * const { shortcuts, isLoading, refresh } = useShortcuts();
 * 
 * // 显示快捷键列表
 * shortcuts.map(s => (
 *   <div key={s.name}>
 *     {s.description}: {s.shortcut || '未设置'}
 *   </div>
 * ))
 * ```
 */
export function useShortcuts(): UseShortcutsReturn {
  const [shortcuts, setShortcuts] = useState<ShortcutInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShortcuts = useCallback(async () => {
    try {
      // 检查 API 是否可用
      if (!chrome?.commands?.getAll) {
        console.warn('[useShortcuts] chrome.commands.getAll not available');
        setShortcuts([]);
        return;
      }

      const commands = await chrome.commands.getAll();
      
      // 过滤条件：排除内置命令和开发用命令
      const excludeCommands = ['_execute_action', '_execute_browser_action', 'reload'];
      
      const result: ShortcutInfo[] = commands
        .filter((cmd) => {
          if (!cmd.name) return false;
          // 过滤掉内置命令和开发用命令
          if (excludeCommands.some(exc => cmd.name!.toLowerCase().includes(exc))) return false;
          return true;
        })
        .map((cmd) => ({
          name: cmd.name || '',
          description: cmd.description || '',
          shortcut: cmd.shortcut || '',
          formattedShortcut: formatShortcut(cmd.shortcut || ''),
        }));

      setShortcuts(result);
    } catch (error) {
      console.error('[useShortcuts] Failed to get shortcuts:', error);
      setShortcuts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchShortcuts();
  }, [fetchShortcuts]);

  // 监听窗口焦点变化，用户可能从浏览器设置页返回
  useEffect(() => {
    const handleFocus = () => {
      fetchShortcuts();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchShortcuts]);

  // 监听页面可见性变化，从其他标签页切换回来时刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchShortcuts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchShortcuts]);

  return {
    shortcuts,
    isLoading,
    refresh: fetchShortcuts,
  };
}
