import { describe, expect, it } from "vitest";
import { applyDeletions, mergeByIdLww } from "../lww-merge";

type Item = { id: string; name: string; t: number };
const item = (id: string, name: string, t: number): Item => ({ id, name, t });
const merge = (local: Item[], remote: Item[]) =>
  mergeByIdLww(local, remote, (x) => x.t, (a, b) => a.name === b.name);

describe("mergeByIdLww", () => {
  it("uploads newer local versions", () => {
    const r = merge([item("1", "local", 2)], [item("1", "remote", 1)]);
    expect(r.merged).toEqual([item("1", "local", 2)]);
    expect(r.applyToLocal).toEqual([]);
    expect(r.remoteChanged).toBe(true);
  });

  it("applies newer remote versions locally", () => {
    const r = merge([item("1", "local", 1)], [item("1", "remote", 2)]);
    expect(r.merged).toEqual([item("1", "remote", 2)]);
    expect(r.applyToLocal).toEqual([item("1", "remote", 2)]);
    expect(r.remoteChanged).toBe(false);
  });

  it("converges on the remote version when timestamps tie but content differs", () => {
    const r = merge([item("1", "local", 1)], [item("1", "remote", 1)]);
    expect(r.merged).toEqual([item("1", "remote", 1)]);
    expect(r.applyToLocal).toEqual([item("1", "remote", 1)]);
  });

  it("leaves identical items alone and reports one-sided items", () => {
    const r = merge([item("1", "same", 1), item("2", "local only", 1)], [item("1", "same", 1), item("3", "remote only", 1)]);
    expect(r.applyToLocal).toEqual([item("3", "remote only", 1)]);
    expect(r.localOnly).toEqual([item("2", "local only", 1)]);
    expect(r.remoteChanged).toBe(false);
  });
});

describe("applyDeletions", () => {
  it("drops deleted items and revives the ones edited after the delete", () => {
    const deletions = new Map([["1", 10], ["2", 10]]);
    const r = applyDeletions([item("1", "old", 5), item("2", "edited later", 20), item("3", "untouched", 1)], deletions, (x) => x.t);
    expect(r.deleted.map((x) => x.id)).toEqual(["1"]);
    expect(r.kept.map((x) => x.id)).toEqual(["2", "3"]);
    expect(r.revivedIds).toEqual(["2"]);
  });
});
