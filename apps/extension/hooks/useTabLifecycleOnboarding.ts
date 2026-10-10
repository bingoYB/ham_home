/**
 * useTabLifecycleOnboarding - first-run guidance: current state, recommended plan,
 * how to treat existing tabs (count from today, or tidy up now) and protections.
 * Finishing turns auto archive on for this device (never retroactively).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOnboardingPatch,
  estimatedShare,
  recommendProtectedDomains,
  selectTidyNowTabIds,
} from "@/lib/tabs/tab-onboarding.utils";
import type { OpenTabsSnapshot } from "@/types";
import type { UseTabLifecycleSettingsResult } from "./useTabLifecycleSettings";

export type OnboardingPlan = "recommended" | "custom";
export type OnboardingExistingTabs = "fromToday" | "tidyNow";
export type OnboardingStep = 0 | 1 | 2;

export interface OnboardingOutcome {
  /** Tabs to pre-select in the open tabs view ("tidy up now") */
  tidyTabIds: number[];
  /** Custom plan: continue in the rules view */
  openRules: boolean;
}

export interface UseTabLifecycleOnboardingResult {
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  plan: OnboardingPlan;
  setPlan: (plan: OnboardingPlan) => void;
  existingTabs: OnboardingExistingTabs;
  setExistingTabs: (value: OnboardingExistingTabs) => void;
  recommendedDomains: string[];
  selectedDomains: ReadonlySet<string>;
  toggleDomain: (domain: string) => void;
  summary: { tabs: number; windows: number; stale: number; duplicateGroups: number; estimated: boolean };
  saving: boolean;
  finish: () => Promise<OnboardingOutcome>;
  skip: () => Promise<void>;
}

export function useTabLifecycleOnboarding(
  snapshot: OpenTabsSnapshot | null,
  lifecycle: UseTabLifecycleSettingsResult,
  open: boolean,
): UseTabLifecycleOnboardingResult {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [plan, setPlan] = useState<OnboardingPlan>("recommended");
  const [existingTabs, setExistingTabs] = useState<OnboardingExistingTabs>("fromToday");
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [domainsTouched, setDomainsTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const protectedDomains = lifecycle.settings.autoArchive.protectedDomains;

  const recommendedDomains = useMemo(
    () => recommendProtectedDomains(snapshot?.tabs ?? [], protectedDomains),
    [protectedDomains, snapshot?.tabs],
  );

  // Every opening starts from the first step
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPlan("recommended");
    setExistingTabs("fromToday");
    setDomainsTouched(false);
  }, [open]);

  // All recommendations stay checked until the user changes the selection, also when
  // the open tabs load after the dialog opened
  useEffect(() => {
    if (open && !domainsTouched) setSelectedDomains(new Set(recommendedDomains));
  }, [domainsTouched, open, recommendedDomains]);

  const toggleDomain = useCallback((domain: string) => {
    setDomainsTouched(true);
    setSelectedDomains((current) => {
      const next = new Set(current);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const summary = useMemo(
    () => ({
      tabs: snapshot?.stats.total ?? 0,
      windows: snapshot?.windows.length ?? 0,
      stale: snapshot?.stats.stale ?? 0,
      duplicateGroups: snapshot?.stats.duplicateGroups ?? 0,
      estimated: snapshot ? estimatedShare(snapshot) > 0.5 : false,
    }),
    [snapshot],
  );

  const finish = useCallback(async (): Promise<OnboardingOutcome> => {
    setSaving(true);
    try {
      const patch = buildOnboardingPatch(
        plan === "recommended",
        lifecycle.settings,
        Array.from(new Set([...protectedDomains, ...selectedDomains])),
      );
      await lifecycle.setAutoArchiveEnabled(true, patch.autoArchive);
      if (patch.budget) await lifecycle.update({ budget: patch.budget });
      await lifecycle.completeOnboarding();
      return {
        tidyTabIds: existingTabs === "tidyNow" && snapshot ? selectTidyNowTabIds(snapshot) : [],
        openRules: plan === "custom",
      };
    } finally {
      setSaving(false);
    }
  }, [existingTabs, lifecycle, plan, protectedDomains, selectedDomains, snapshot]);

  const skip = useCallback(async () => {
    await lifecycle.completeOnboarding();
  }, [lifecycle]);

  return {
    step,
    setStep,
    plan,
    setPlan,
    existingTabs,
    setExistingTabs,
    recommendedDomains,
    selectedDomains,
    toggleDomain,
    summary,
    saving,
    finish,
    skip,
  };
}
