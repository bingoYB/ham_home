import { useState, useEffect } from "react";

export interface UseOptionsTabReturn {
  activeTab: string;
  handleTabChange: (value: string) => void;
}

export function useOptionsTab(): UseOptionsTabReturn {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash;
    if (hash.includes("?")) {
      const qs = hash.split("?")[1];
      const tab = new URLSearchParams(qs).get("tab");
      if (tab && (tab === "ai" || tab === "general" || tab === "storage")) {
        return tab;
      }
    }
    return "ai";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes("?")) {
        const qs = hash.split("?")[1];
        const tab = new URLSearchParams(qs).get("tab");
        if (tab && (tab === "ai" || tab === "general" || tab === "storage")) {
          setActiveTab(tab);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const hashBase = window.location.hash.split("?")[0] || "#settings";
    window.location.hash = `${hashBase}?tab=${value}`;
  };

  return {
    activeTab,
    handleTabChange,
  };
}