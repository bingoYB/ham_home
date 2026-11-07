import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPageContentForAI } from "../fetch-page-content";

describe("fetchPageContentForAI", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aborts an in-flight page fetch when analysis is cancelled", async () => {
    const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const pending = fetchPageContentForAI("https://example.com", controller.signal);

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(true);
  });

  it("does not fetch when already cancelled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(fetchPageContentForAI("https://example.com", controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
