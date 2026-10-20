import { beforeEach, describe, expect, it, vi } from "vitest";

const alarms = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
}));

vi.mock("wxt/browser", () => ({ browser: { alarms } }));

import { ensurePeriodicAlarm } from "../browser-api";

describe("ensurePeriodicAlarm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leaves an existing alarm alone, so a worker restart does not restart its countdown", async () => {
    alarms.get.mockResolvedValue({ name: "sweep", periodInMinutes: 30, scheduledTime: 1 });

    await ensurePeriodicAlarm("sweep", 30);

    expect(alarms.create).not.toHaveBeenCalled();
  });

  it("creates a missing alarm", async () => {
    alarms.get.mockResolvedValue(undefined);

    await ensurePeriodicAlarm("sweep", 30);

    expect(alarms.create).toHaveBeenCalledWith("sweep", { periodInMinutes: 30 });
  });

  it("re-creates an alarm whose period changed", async () => {
    alarms.get.mockResolvedValue({ name: "sweep", periodInMinutes: 60, scheduledTime: 1 });

    await ensurePeriodicAlarm("sweep", 30);

    expect(alarms.create).toHaveBeenCalledWith("sweep", { periodInMinutes: 30 });
  });
});
