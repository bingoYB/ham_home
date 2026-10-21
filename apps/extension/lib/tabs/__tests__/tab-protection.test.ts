import { describe, expect, it } from "vitest";
import {
  AUDIBLE_PROTECTION_MS,
  getProtectionReasons,
  matchesProtectedDomain,
  normalizeProtectedDomain,
  type TabProtectionInput,
  type TabProtectionOptions,
} from "../tab-protection.utils";

const NOW = 1_800_000_000_000;

const baseTab: TabProtectionInput = {
  pinned: false,
  active: false,
  locked: false,
  saving: false,
  audible: false,
  grouped: false,
  dirtyForm: false,
  hostname: "example.com",
};

const allOff: TabProtectionOptions = {
  protectAudible: false,
  protectGrouped: false,
  protectDirtyForms: false,
  protectedDomains: [],
  now: NOW,
};

describe("getProtectionReasons", () => {
  it("leaves an ordinary tab unprotected", () => {
    expect(getProtectionReasons(baseTab, allOff)).toEqual([]);
  });

  it.each([
    ["pinned", { pinned: true }],
    ["active", { active: true }],
    ["locked", { locked: true }],
    ["saving", { saving: true }],
  ] as const)("always protects %s tabs, even with every option off", (reason, patch) => {
    expect(getProtectionReasons({ ...baseTab, ...patch }, allOff)).toEqual([reason]);
  });

  it("protects tabs playing sound or played within 10 minutes", () => {
    const options = { ...allOff, protectAudible: true };
    expect(getProtectionReasons({ ...baseTab, audible: true }, options)).toEqual(["audible"]);
    expect(
      getProtectionReasons(
        { ...baseTab, lastAudibleAt: NOW - AUDIBLE_PROTECTION_MS + 1000 },
        options,
      ),
    ).toEqual(["audible"]);
    expect(
      getProtectionReasons(
        { ...baseTab, lastAudibleAt: NOW - AUDIBLE_PROTECTION_MS - 1000 },
        options,
      ),
    ).toEqual([]);
    expect(getProtectionReasons({ ...baseTab, audible: true }, allOff)).toEqual([]);
  });

  it("applies optional rules only when they are on", () => {
    const tab = { ...baseTab, grouped: true, dirtyForm: true, hostname: "mail.google.com" };
    expect(getProtectionReasons(tab, allOff)).toEqual([]);
    expect(
      getProtectionReasons(tab, {
        ...allOff,
        protectGrouped: true,
        protectDirtyForms: true,
        protectedDomains: ["google.com"],
      }),
    ).toEqual(["protectedDomain", "grouped", "dirtyForm"]);
  });

  it("protects tabs of a protected grouping rule even with the global switch off", () => {
    expect(getProtectionReasons({ ...baseTab, grouped: true, protectedGroup: true }, allOff)).toEqual([
      "grouped",
    ]);
    // Only tabs that are really in the group
    expect(getProtectionReasons({ ...baseTab, grouped: false, protectedGroup: true }, allOff)).toEqual([]);
  });

  it("reports every matching reason for a combination", () => {
    const reasons = getProtectionReasons(
      { ...baseTab, pinned: true, active: true, locked: true, audible: true },
      { ...allOff, protectAudible: true },
    );
    expect(reasons).toEqual(["pinned", "active", "locked", "audible"]);
  });
});

describe("protected domains", () => {
  it("normalizes user input", () => {
    expect(normalizeProtectedDomain(" Mail.Google.com ")).toBe("mail.google.com");
    expect(normalizeProtectedDomain("*.slack.com")).toBe("slack.com");
    expect(normalizeProtectedDomain("https://www.notion.so/workspace?x=1")).toBe("notion.so");
    expect(normalizeProtectedDomain("github.com/org/repo")).toBe("github.com");
    expect(normalizeProtectedDomain("localhost:3000")).toBe("localhost");
    expect(normalizeProtectedDomain("not a domain")).toBeNull();
    expect(normalizeProtectedDomain("")).toBeNull();
  });

  it("matches the domain and its subdomains only", () => {
    expect(matchesProtectedDomain("app.slack.com", ["slack.com"])).toBe(true);
    expect(matchesProtectedDomain("www.notion.so", ["notion.so"])).toBe(true);
    expect(matchesProtectedDomain("slack.com", ["*.slack.com"])).toBe(true);
    expect(matchesProtectedDomain("notslack.com", ["slack.com"])).toBe(false);
    expect(matchesProtectedDomain("example.com", [])).toBe(false);
  });
});
