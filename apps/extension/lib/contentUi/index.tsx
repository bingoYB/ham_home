/**
 * Content Script React 入口
 * 创建 React root 并渲染 App 组件
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ContentUIProvider } from '../../utils/ContentUIContext';

export function mountContentUI(container: HTMLElement): () => void {
  const root = ReactDOM.createRoot(container);

  root.render(
    <React.StrictMode>
      <ContentUIProvider root={root} container={container}>
        <App />
      </ContentUIProvider>
    </React.StrictMode>
  );

  return () => {
    root.unmount();
  };
}
