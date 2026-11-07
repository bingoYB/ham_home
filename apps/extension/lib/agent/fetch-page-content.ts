export async function fetchPageContentForAI(url: string, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`页面抓取失败 (${response.status})`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc
      .querySelectorAll("script, style, nav, footer, header")
      .forEach((element) => element.remove());

    return (doc.body?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch (error) {
    signal?.throwIfAborted();
    throw new Error(
      error instanceof Error ? error.message : "页面内容抓取失败",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
