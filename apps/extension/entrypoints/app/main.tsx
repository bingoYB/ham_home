import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { initTheme } from '@/hooks/useTheme';
import i18n from '@/lib/i18n/config';
import '../../style.css';

// 立即初始化主题，避免闪烁
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>
);
