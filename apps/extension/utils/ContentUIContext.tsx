/**
 * ContentUI Context
 * 提供 React Root 实例和容器元素给子组件使用
 */
import React, { createContext, useContext } from 'react';
import type { Root } from 'react-dom/client';

interface ContentUIContextValue {
  root: Root;
  container: HTMLElement;
}

export const ContentUIContext = createContext<ContentUIContextValue | null>(null);

interface ContentUIProviderProps {
  root: Root;
  container: HTMLElement;
  children: React.ReactNode;
}

export function ContentUIProvider({ root, container, children }: ContentUIProviderProps) {
  return (
    <ContentUIContext.Provider value={{ root, container }}>
      {children}
    </ContentUIContext.Provider>
  );
}

export function useContentUI() {
  const context = useContext(ContentUIContext);
  if (!context) {
    throw new Error('useContentUI must be used within ContentUIProvider');
  }
  return context;
}
