export async function fetchPageContentForAI(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
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
    throw new Error(
      error instanceof Error ? error.message : "页面内容抓取失败",
    );
  }
}
