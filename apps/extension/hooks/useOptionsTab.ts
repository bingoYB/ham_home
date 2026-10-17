import { useState, useEffect } from "react";
import { capabilities } from "@/lib/platform";

export interface UseOptionsTabReturn {
  activeTab: string;
  handleTabChange: (value: string) => void;
}

/** The AI tab only exists in builds that can run AI features */
const DEFAULT_TAB = capabilities.ai ? "ai" : "general";

function isAvailableTab(tab: string | null): tab is string {
  return (tab === "ai" && capabilities.ai) || tab === "general" || tab === "storage";
}

/** Reads `?tab=` from the URL hash, returning null for missing or unavailable tabs */
function readTabFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.includes("?")) return null;
  const tab = new URLSearchParams(hash.split("?")[1]).get("tab");
  return isAvailableTab(tab) ? tab : null;
}

export function useOptionsTab(): UseOptionsTabReturn {
  const [activeTab, setActiveTab] = useState(() => readTabFromHash() ?? DEFAULT_TAB);

  useEffect(() => {
    const handleHashChange = () => {
      const tab = readTabFromHash();
      if (tab) setActiveTab(tab);
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
