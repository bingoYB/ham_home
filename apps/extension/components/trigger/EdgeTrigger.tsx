/**
 * EdgeTrigger - 边缘触发器组件
 * 在屏幕边缘显示一个触发区域，点击后展开书签面板
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@hamhome/ui';
import { useWebsiteTheme } from '@/hooks/useWebsiteTheme';
import type { PanelPosition } from '@/types';
import './edge-trigger.css';

export interface EdgeTriggerProps {
  position: PanelPosition;
  visible: boolean;
  onClick: () => void;
}

export function EdgeTrigger({ position, visible, onClick }: EdgeTriggerProps) {
  const { t } = useTranslation('bookmark');
  const { websiteTheme } = useWebsiteTheme(visible, position);
  const label = t('bookmark:contentPanel.openPanel');

  return (
    <button
      type="button"
      dir="ltr"
      title={label}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      data-position={position}
      data-website-theme={websiteTheme}
      // 内联 transform：Tailwind 的 translate 工具类依赖 document 级 @property 注册的
      // --tw-translate-*，被页面移除后整条声明失效（issue #13）
      style={{
        transform: visible
          ? 'translate(0, -50%)'
          : position === 'left'
            ? 'translate(-100%, -50%)'
            : 'translate(100%, -50%)',
      }}
      className={cn(
        'hamhome-edge-trigger fixed top-1/2 z-[99998] flex h-[64px] w-[44px] cursor-pointer items-center border-0 bg-transparent p-0',
        'transition-[transform,opacity,visibility] duration-200 ease-out motion-reduce:transition-none',
        position === 'left' ? 'left-0 justify-start' : 'right-0 justify-end',
        visible
          ? 'visible pointer-events-auto opacity-100'
          : 'invisible pointer-events-none opacity-0'
      )}
    >
      <span className="hamhome-edge-dock" aria-hidden="true">
        <span className="hamhome-edge-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12.5 4.5H6.75A1.75 1.75 0 0 0 5 6.25v13.1a.6.6 0 0 0 .93.5L11 16.5l5.07 3.35a.6.6 0 0 0 .93-.5V12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="m17.5 2 1.42 3.58L22.5 7l-3.58 1.42L17.5 12l-1.42-3.58L12.5 7l3.58-1.42Z" fill="currentColor" />
          </svg>
        </span>
      </span>
    </button>
  );
}
