import { describe, expect, it } from "vitest";
import type { OpenTabInfo } from "@/types";
import { DEFAULT_TAB_LIFECYCLE_SETTINGS } from "../tab-lifecycle-settings.utils";
import {
  buildOnboardingPatch,
  recommendProtectedDomains,
  selectTidyNowTabIds,
} from "../tab-onboarding.utils";

function tab(tabId: number, patch: Partial<OpenTabInfo>): OpenTabInfo {
  return {
    tabId,
    windowId: 1,
    index: tabId,
    title: "",
    url: "https://example.com",
    normalizedUrl: "https://example.com",
    domain: "example.com",
    pinned: false,
    active: false,
    audible: false,
    discarded: false,
    loading: false,
    firstSeenAt: 0,
    lastActiveAt: 0,
    displayLastActiveAt: 0,
    activityEstimated: false,
    locked: false,
    protection: [],
    idleState: "idle",
    stale: false,
    redundantDuplicate: false,
    bulkOpened: false,
    ...patch,
  };
}

describe("onboarding recommendations", () => {
  it("recommends pinned domains and known web apps once", () => {
    expect(
      recommendProtectedDomains(
        [
          tab(1, { url: "https://www.figma.com/file/x", pinned: true }),
          tab(2, { url: "https://mail.google.com/mail/u/0" }),
          tab(3, { url: "https://mail.google.com/mail/u/1" }),
          tab(4, { url: "https://news.example.com" }),
          tab(5, { url: "https://acme.slack.com/x" }),
        ],
        ["slack.com"],
      ),
    ).toEqual(["figma.com", "mail.google.com"]);
  });

  it("pre-selects duplicates and stale tabs that are not protected", () => {
    expect(
      selectTidyNowTabIds({
        tabs: [
          tab(1, { stale: true }),
          tab(2, { redundantDuplicate: true }),
          tab(3, { stale: true, protection: ["pinned"] }),
          tab(4, {}),
        ],
      }),
    ).toEqual([1, 2]);
  });
});

describe("onboarding plan", () => {
  const firstSetUp = DEFAULT_TAB_LIFECYCLE_SETTINGS;

  it("applies the recommended plan to a first set-up", () => {
    expect(buildOnboardingPatch(true, firstSetUp, ["mail.google.com"])).toEqual({
      autoArchive: {
        protectedDomains: ["mail.google.com"],
        idleThreshold: { value: 7, unit: "day" },
        countBy: "usage-days",
        mode: "auto",
      },
      budget: { enabled: true, limit: 15, overBudgetAction: "nudge" },
    });
  });

  it("keeps auto archive and budget settings synced from another device", () => {
    const synced = {
      ...firstSetUp,
      autoArchive: { ...firstSetUp.autoArchive, enabled: true, mode: "confirm" as const },
      budget: { ...firstSetUp.budget, enabled: true, limit: 40, overBudgetAction: "auto-archive" as const },
    };
    expect(buildOnboardingPatch(true, synced, ["mail.google.com"])).toEqual({
      autoArchive: { protectedDomains: ["mail.google.com"] },
      budget: undefined,
    });
  });

  it("only merges protected domains with the custom plan", () => {
    expect(buildOnboardingPatch(false, firstSetUp, [])).toEqual({
      autoArchive: { protectedDomains: [] },
      budget: undefined,
    });
  });
});
