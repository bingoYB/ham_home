import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebStorage, type WebStorage } from "../storage";

let counter = 0;
const opened: WebStorage[] = [];

/** Each call gets its own database and channel; pass names to share them between "tabs". */
function open(names = { dbName: `db-${++counter}`, channelName: `channel-${counter}` }) {
  const storage = createWebStorage(names);
  opened.push(storage);
  return { storage, names };
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((storage) => storage.close()));
});

describe("web storage shim", () => {
  it("returns the fallback for a missing key, as a copy callers may mutate", async () => {
    const { storage } = open();
    const item = storage.defineItem<string[]>("local:list", { fallback: [] });

    const first = await item.getValue();
    first.push("leaked");

    expect(await item.getValue()).toEqual([]);
  });

  it("round-trips values through JSON like chrome.storage", async () => {
    const { storage } = open();
    const item = storage.defineItem<{ a: number; b?: string }>("local:obj", { fallback: { a: 0 } });

    await item.setValue({ a: 1, b: undefined });

    expect(await item.getValue()).toEqual({ a: 1 });
    const read = await item.getValue();
    read.a = 99;
    expect((await item.getValue()).a).toBe(1);
  });

  it("applies operations in call order without awaiting each one", async () => {
    const { storage } = open();
    const item = storage.defineItem<number>("local:n", { fallback: 0 });

    void item.setValue(1);
    void item.setValue(2);

    expect(await item.getValue()).toBe(2);
  });

  it("persists across storage instances that share the database", async () => {
    const { storage, names } = open();
    await storage.defineItem<string>("sync:name", { fallback: "" }).setValue("ham");

    const { storage: reopened } = open(names);

    expect(await reopened.defineItem<string>("sync:name", { fallback: "" }).getValue()).toBe("ham");
  });

  it("calls watchers with new and old value, only when the value changed", async () => {
    const { storage } = open();
    const item = storage.defineItem<number>("local:n", { fallback: 0 });
    const watcher = vi.fn();
    const unwatch = item.watch(watcher);

    await item.setValue(1);
    await item.setValue(1);
    await item.setValue(2);
    unwatch();
    await item.setValue(3);

    expect(watcher.mock.calls).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  it("treats removeItem and null like a delete and hands watchers the fallback", async () => {
    const { storage } = open();
    const item = storage.defineItem<string>("local:s", { fallback: "none" });
    await item.setValue("value");
    const watcher = vi.fn();
    item.watch(watcher);

    await storage.removeItem("local:s");

    expect(await item.getValue()).toBe("none");
    expect(watcher).toHaveBeenCalledWith("none", "value");
  });

  it("propagates changes to other tabs and lets them read the new value", async () => {
    const { storage: tabA, names } = open();
    const { storage: tabB } = open(names);
    const itemA = tabA.defineItem<number>("local:n", { fallback: 0 });
    const itemB = tabB.defineItem<number>("local:n", { fallback: 0 });
    expect(await itemB.getValue()).toBe(0);
    const watcher = vi.fn();
    itemB.watch(watcher);

    await itemA.setValue(5);

    await vi.waitFor(() => expect(watcher).toHaveBeenCalledWith(5, 0));
    expect(await itemB.getValue()).toBe(5);
  });

  it("never serves stale data when another tab's broadcast is missed", async () => {
    const { storage: tabA, names } = open();
    // Same database, different channel: tab A will never hear about tab B's writes
    const { storage: tabB } = open({ dbName: names.dbName, channelName: "unreachable-channel" });
    const itemA = tabA.defineItem<string[]>("local:list", { fallback: [] });
    const itemB = tabB.defineItem<string[]>("local:list", { fallback: [] });
    await itemA.setValue(["a"]);
    expect(await itemA.getValue()).toEqual(["a"]);

    await itemB.setValue(["a", "b"]);

    // A read-modify-write in tab A must build on B's data instead of overwriting it
    await itemA.setValue([...(await itemA.getValue()), "c"]);
    expect(await itemB.getValue()).toEqual(["a", "b", "c"]);
  });

  it("writes a value that differs from the database even if this tab never read it", async () => {
    const { storage: tabA, names } = open();
    const { storage: tabB } = open({ dbName: names.dbName, channelName: "unreachable-channel" });
    const itemA = tabA.defineItem<number>("local:n", { fallback: 0 });
    const itemB = tabB.defineItem<number>("local:n", { fallback: 0 });
    await itemA.setValue(1);
    await itemB.setValue(2);

    await itemA.setValue(1);

    expect(await itemB.getValue()).toBe(1);
  });

  it("hands watchers the value the database held before the write", async () => {
    const { storage: tabA, names } = open();
    const { storage: tabB } = open({ dbName: names.dbName, channelName: "unreachable-channel" });
    const itemA = tabA.defineItem<number>("local:n", { fallback: 0 });
    const itemB = tabB.defineItem<number>("local:n", { fallback: 0 });
    await itemA.setValue(1);
    const watcher = vi.fn();
    itemB.watch(watcher);

    await itemB.setValue(2);

    expect(watcher).toHaveBeenCalledWith(2, 1);
  });

  it("rejects options the app does not use instead of ignoring them", () => {
    const { storage } = open();

    expect(() => storage.defineItem("local:v", { version: 2 })).toThrow(/not supported/);
  });
});
