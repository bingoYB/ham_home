/**
 * useTabWeeklyOverview - local stats of the last 7 days, loaded while `active`
 * (the overview dialog is open).
 */
import { useEffect, useState } from "react";
import { getBackgroundService } from "@/lib/services";
import type { TabWeeklyOverview } from "@/types";

export interface UseTabWeeklyOverviewResult {
  overview: TabWeeklyOverview | null;
  loading: boolean;
}

export function useTabWeeklyOverview(active: boolean): UseTabWeeklyOverviewResult {
  const [overview, setOverview] = useState<TabWeeklyOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    getBackgroundService()
      .getTabWeeklyOverview()
      .then((value) => {
        if (!cancelled) setOverview(value);
      })
      .catch((error) => console.warn("[TabCenter] Failed to load weekly overview:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return { overview, loading };
}
