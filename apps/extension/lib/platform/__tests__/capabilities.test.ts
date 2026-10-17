import { afterEach, describe, expect, it, vi } from "vitest";
import { isViewAvailable, type PlatformCapabilities } from "../capabilities";

type Flags = PlatformCapabilities;

/** Loads flags.ts fresh, as the bundle would see it for the given build target. */
async function loadFlags(target?: string): Promise<Flags> {
  vi.resetModules();
  if (target !== undefined) vi.stubGlobal("__HAMHOME_TARGET__", target);
  return { ...(await import("../flags")) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("flags", () => {
  it("enables every extension feature when no target is injected", async () => {
    expect(await loadFlags()).toEqual({
      browserTabs: true,
      browserBookmarkImport: true,
      browserIntegration: true,
      ai: true,
      semanticSearch: true,
      snapshots: true,
      screenshots: true,
      bookmarkHealth: true,
      manualBookmarkEntry: false,
    });
  });

  it("keeps only what works on a plain web page in the web build", async () => {
    expect(await loadFlags("web")).toEqual({
      browserTabs: false,
      browserBookmarkImport: false,
      browserIntegration: false,
      ai: false,
      semanticSearch: false,
      snapshots: false,
      screenshots: false,
      bookmarkHealth: false,
      manualBookmarkEntry: true,
    });
  });

  it("treats an unknown target as the extension", async () => {
    expect((await loadFlags("something-else")).ai).toBe(true);
  });
});

describe("isViewAvailable", () => {
  it("hides views whose capability is missing", async () => {
    const web = await loadFlags("web");

    expect(isViewAvailable("health", web)).toBe(false);
    expect(isViewAvailable("workspaces", web)).toBe(false);
    expect(isViewAvailable("tab-groups", web)).toBe(false);
  });

  it("keeps views without requirements, including unknown ones", async () => {
    const web = await loadFlags("web");

    for (const view of ["all", "categories", "tags", "trash", "settings", "import-export", "about", "nope"]) {
      expect(isViewAvailable(view, web)).toBe(true);
    }
  });

  it("shows every view in the extension build", async () => {
    const extension = await loadFlags();

    for (const view of ["health", "workspaces", "tab-groups", "all"]) {
      expect(isViewAvailable(view, extension)).toBe(true);
    }
  });
});
