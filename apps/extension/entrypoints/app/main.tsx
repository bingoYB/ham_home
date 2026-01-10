import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initTheme } from '@/hooks/useTheme';

// 立即初始化主题，避免闪烁
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
