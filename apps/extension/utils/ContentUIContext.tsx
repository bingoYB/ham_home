/**
 * ContentUI Context
 * 提供 React Root 实例和容器元素给子组件使用
 */
import React, { createContext, useContext, useEffect } from "react";
import { installContentUIKeyboardEventGuard } from "@/utils/content-ui-keyboard-guard";
import type { Root } from "react-dom/client";

interface ContentUIContextValue {
  root: Root;
  container: HTMLElement;
}

export const ContentUIContext = createContext<ContentUIContextValue | null>(
  null,
);

interface ContentUIProviderProps {
  root: Root;
  container: HTMLElement;
  children: React.ReactNode;
}

export function ContentUIProvider({
  root,
  container,
  children,
}: ContentUIProviderProps) {
  useEffect(
    () => installContentUIKeyboardEventGuard(container),
    [container],
  );

  return (
    <ContentUIContext.Provider value={{ root, container }}>
      {children}
    </ContentUIContext.Provider>
  );
}

export function useContentUI() {
  const context = useContext(ContentUIContext);
  if (!context) {
    console.warn("useContentUI must be used within ContentUIProvider");
    // throw new Error('useContentUI must be used within ContentUIProvider');
    return {
      container: document.body,
    };
  }
  return context;
}
