import { describe, expect, it } from "vitest";
import { gzipSync, strToU8, unzipSync } from "fflate";
import { contentFingerprint, decodeContentChunk, encodeContentChunk } from "../sync-codec";

/** Exactly what earlier versions uploaded (SyncEngine.compressStr). */
function legacyChunk(content: string): { data: string } {
  const zipped = gzipSync(strToU8(JSON.stringify({ content })));
  let binary = "";
  for (let i = 0; i < zipped.length; i++) binary += String.fromCharCode(zipped[i]);
  return { data: btoa(binary) };
}

describe("sync codec", () => {
  it("round-trips content, including non-ASCII text and large bodies", () => {
    const content = "# 标题\n\n正文 with emoji 🐹 " + "x".repeat(200_000);
    expect(decodeContentChunk(encodeContentChunk(content))).toBe(content);
  });

  it("reads chunks uploaded by earlier versions", () => {
    const chunk = legacyChunk("legacy body");
    // The old decoder used unzipSync on gzip data, which can never succeed:
    expect(() => unzipSync(Uint8Array.from(atob(chunk.data), (c) => c.charCodeAt(0)))).toThrow();
    expect(decodeContentChunk(chunk)).toBe("legacy body");
  });

  it("throws on malformed chunks instead of returning empty content", () => {
    expect(() => decodeContentChunk(null)).toThrow();
    expect(() => decodeContentChunk({ data: "" })).toThrow();
    expect(() => decodeContentChunk({ data: btoa("not gzip") })).toThrow();
  });

  it("fingerprints content", () => {
    expect(contentFingerprint(undefined)).toBeUndefined();
    expect(contentFingerprint("")).toBeUndefined();
    expect(contentFingerprint("abc")).toBe(contentFingerprint("abc"));
    expect(contentFingerprint("abc")).not.toBe(contentFingerprint("abd"));
    expect(contentFingerprint("abc")).not.toBe(contentFingerprint("abcd"));
  });
});
