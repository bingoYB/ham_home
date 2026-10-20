import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  importRawSettings: vi.fn(),
}));

vi.mock("@/lib/storage/bookmark-storage", () => ({ bookmarkStorage: {} }));
vi.mock("@/lib/storage/read-later-storage", () => ({ readLaterStorage: {} }));
vi.mock("@/lib/storage/tab-archive-storage", () => ({ tabArchiveStorage: {} }));
vi.mock("@/lib/storage/tab-lifecycle-config-storage", () => ({
  tabLifecycleConfigStorage: {
    getSettings: mocks.getSettings,
    importRawSettings: mocks.importRawSettings,
  },
}));

import { DEFAULT_TAB_LIFECYCLE_SETTINGS } from "@/lib/tabs/tab-lifecycle-settings.utils";
import { importLifecycleData } from "../read-later-import-service";

describe("importLifecycleData settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ ...DEFAULT_TAB_LIFECYCLE_SETTINGS, activityTracking: false });
  });

  it("restores the backup's settings but never turns activity tracking back on", async () => {
    const backup = {
      ...DEFAULT_TAB_LIFECYCLE_SETTINGS,
      activityTracking: true,
      autoArchive: { ...DEFAULT_TAB_LIFECYCLE_SETTINGS.autoArchive, enabled: true },
    };

    const result = await importLifecycleData({ tabLifecycleSettings: backup }, new Set());

    expect(result.settings).toBe(true);
    expect(mocks.importRawSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activityTracking: false,
        autoArchive: expect.objectContaining({ enabled: true }),
      }),
    );
  });
});
