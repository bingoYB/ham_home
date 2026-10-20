/**
 * Protection rules: a protected tab is never closed automatically, whatever its
 * idle state. Pinned tabs, the current tab of every window, locked tabs and tabs
 * in the middle of a HamHome save flow are always protected; the rest are options.
 */
import type { TabProtectionReason } from "@/types";

/** Tabs that played sound within this window stay protected */
export const AUDIBLE_PROTECTION_MS = 10 * 60 * 1000;

/** Rules that cannot be turned off */
export const ALWAYS_ON_PROTECTIONS: readonly TabProtectionReason[] = [
  "pinned",
  "active",
  "locked",
  "saving",
];

export interface TabProtectionInput {
  pinned: boolean;
  /** Current tab of its window (focused or not) */
  active: boolean;
  locked: boolean;
  /** HamHome save overlay open, or a snapshot / screenshot being captured */
  saving: boolean;
  audible: boolean;
  lastAudibleAt?: number;
  grouped: boolean;
  /** Its group comes from a Tab grouping rule that protects its tabs */
  protectedGroup?: boolean;
  dirtyForm?: boolean;
  hostname: string;
}

export interface TabProtectionOptions {
  protectAudible: boolean;
  protectGrouped: boolean;
  protectDirtyForms: boolean;
  protectedDomains: readonly string[];
  now: number;
}

export function getProtectionReasons(
  input: TabProtectionInput,
  options: TabProtectionOptions,
): TabProtectionReason[] {
  const reasons: TabProtectionReason[] = [];
  if (input.pinned) reasons.push("pinned");
  if (input.active) reasons.push("active");
  if (input.locked) reasons.push("locked");
  if (input.saving) reasons.push("saving");

  if (options.protectAudible) {
    const recentlyAudible =
      input.lastAudibleAt != null &&
      options.now - input.lastAudibleAt < AUDIBLE_PROTECTION_MS;
    if (input.audible || recentlyAudible) reasons.push("audible");
  }

  if (matchesProtectedDomain(input.hostname, options.protectedDomains)) {
    reasons.push("protectedDomain");
  }
  if (input.grouped && (options.protectGrouped || input.protectedGroup)) reasons.push("grouped");
  if (options.protectDirtyForms && input.dirtyForm) reasons.push("dirtyForm");
  return reasons;
}

/**
 * Normalize user input into a protected domain entry.
 * Accepts "example.com", "*.example.com", a full URL or a host with a path.
 */
export function normalizeProtectedDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith("*.")) value = value.slice(2);

  if (/^[a-z][a-z0-9+.-]*:\/\//.test(value)) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  } else {
    value = value.split(/[/?#]/)[0].split(":")[0];
  }

  value = value.replace(/^www\./, "").replace(/\.$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$|^localhost$/.test(value) ? value : null;
}

/** hostname equals the domain or is one of its subdomains ("www." is ignored) */
export function matchesProtectedDomain(
  hostname: string,
  domains: readonly string[],
): boolean {
  if (!hostname || domains.length === 0) return false;
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return domains.some((raw) => {
    const domain = raw.toLowerCase().replace(/^\*\./, "").replace(/^www\./, "");
    return !!domain && (host === domain || host.endsWith(`.${domain}`));
  });
}
