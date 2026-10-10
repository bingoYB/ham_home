/**
 * useTabLifecycleSettings - lifecycle settings and this device's lifecycle state.
 *
 * Plain options are written directly; switches that let HamHome close tabs on its
 * own (auto archive, auto make room) go through the background, which records this
 * device's consent and makes enabling non-retroactive.
 */
import { useCallback, useEffect, useState } from "react";
import { getBackgroundService } from "@/lib/services";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabLifecycleStateStorage } from "@/lib/storage/tab-lifecycle-state-storage";
import {
  DEFAULT_TAB_LIFECYCLE_SETTINGS,
  DEFAULT_TAB_LIFECYCLE_STATE,
  getPendingConsents,
  isAutoArchiveEffective,
  isAutoMakeRoomEffective,
} from "@/lib/tabs/tab-lifecycle-settings.utils";
import { normalizeProtectedDomain } from "@/lib/tabs/tab-protection.utils";
import type {
  TabAutoArchiveSettings,
  TabBudgetOverAction,
  TabLifecycleLocalState,
  TabLifecycleSettings,
  TabLifecycleSettingsPatch,
} from "@/types";

export interface UseTabLifecycleSettingsResult {
  settings: TabLifecycleSettings;
  state: TabLifecycleLocalState;
  loading: boolean;
  autoArchiveActive: boolean;
  autoMakeRoomActive: boolean;
  pendingConsents: { autoArchive: boolean; autoMakeRoom: boolean };
  update: (patch: TabLifecycleSettingsPatch) => Promise<void>;
  setAutoArchiveEnabled: (
    enabled: boolean,
    patch?: Partial<TabAutoArchiveSettings>,
  ) => Promise<void>;
  setOverBudgetAction: (action: TabBudgetOverAction) => Promise<void>;
  setActivityTracking: (enabled: boolean) => Promise<void>;
  acceptConsent: (kind: "autoArchive" | "autoMakeRoom") => Promise<void>;
  completeOnboarding: () => Promise<void>;
  /** Returns false when the input is not a valid domain */
  addProtectedDomain: (input: string) => Promise<boolean>;
  removeProtectedDomain: (domain: string) => Promise<void>;
}

export function useTabLifecycleSettings(): UseTabLifecycleSettingsResult {
  const [settings, setSettings] = useState<TabLifecycleSettings>(DEFAULT_TAB_LIFECYCLE_SETTINGS);
  const [state, setState] = useState<TabLifecycleLocalState>(DEFAULT_TAB_LIFECYCLE_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      tabLifecycleStateStorage.get(),
    ]).then(([nextSettings, nextState]) => {
      if (cancelled) return;
      setSettings(nextSettings);
      setState(nextState);
      setLoading(false);
    });
    const unwatchSettings = tabLifecycleConfigStorage.watchSettings(setSettings);
    const unwatchState = tabLifecycleStateStorage.watch(setState);
    return () => {
      cancelled = true;
      unwatchSettings();
      unwatchState();
    };
  }, []);

  const update = useCallback(async (patch: TabLifecycleSettingsPatch) => {
    setSettings(await tabLifecycleConfigStorage.updateSettings(patch));
  }, []);

  const setAutoArchiveEnabled = useCallback(
    async (enabled: boolean, patch?: Partial<TabAutoArchiveSettings>) => {
      setSettings(await getBackgroundService().setAutoArchiveEnabled(enabled, patch));
    },
    [],
  );

  const setOverBudgetAction = useCallback(async (action: TabBudgetOverAction) => {
    setSettings(await getBackgroundService().setOverBudgetAction(action));
  }, []);

  const setActivityTracking = useCallback(async (enabled: boolean) => {
    await getBackgroundService().setTabActivityTracking(enabled);
  }, []);

  const acceptConsent = useCallback(async (kind: "autoArchive" | "autoMakeRoom") => {
    await getBackgroundService().acceptSyncedTabConsent(kind);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await getBackgroundService().completeTabCenterOnboarding();
  }, []);

  const addProtectedDomain = useCallback(
    async (input: string) => {
      const domain = normalizeProtectedDomain(input);
      if (!domain) return false;
      const current = settings.autoArchive.protectedDomains;
      if (!current.includes(domain)) {
        await update({ autoArchive: { protectedDomains: [...current, domain] } });
      }
      return true;
    },
    [settings.autoArchive.protectedDomains, update],
  );

  const removeProtectedDomain = useCallback(
    async (domain: string) => {
      await update({
        autoArchive: {
          protectedDomains: settings.autoArchive.protectedDomains.filter((item) => item !== domain),
        },
      });
    },
    [settings.autoArchive.protectedDomains, update],
  );

  return {
    settings,
    state,
    loading,
    autoArchiveActive: isAutoArchiveEffective(settings, state),
    autoMakeRoomActive: isAutoMakeRoomEffective(settings, state),
    pendingConsents: getPendingConsents(settings, state),
    update,
    setAutoArchiveEnabled,
    setOverBudgetAction,
    setActivityTracking,
    acceptConsent,
    completeOnboarding,
    addProtectedDomain,
    removeProtectedDomain,
  };
}
