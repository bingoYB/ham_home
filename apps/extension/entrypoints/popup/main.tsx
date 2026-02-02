import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { initTheme } from '@/hooks/useTheme';
import i18n from '@/lib/i18n/config';
import { BookmarkProvider } from '@/contexts/BookmarkContext';

// 立即初始化主题，避免闪烁
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BookmarkProvider>
        <App />
      </BookmarkProvider>
    </I18nextProvider>
  </React.StrictMode>
);
