import { describe, expect, it } from "vitest";
import {
  applyClipTargetToPageContent,
  deriveHighlightTitle,
  getClipHighlightBookmarkUrl,
  getClipImageBookmarkUrl,
  isSubjectClip,
} from "../clip-context";
import type { PageContent, SaveFlowClipContext } from "@/types";

const pageContent: PageContent = {
  url: "https://example.com/article",
  title: "Article",
  content: "body",
  htmlContent: "<p>body</p>",
  textContent: "body",
  excerpt: "body",
  favicon: "https://example.com/favicon.ico",
  isPrivate: false,
};

function imageClip(imageSourceUrl: string): SaveFlowClipContext {
  return {
    type: "image",
    imageSourceUrl,
    sourceUrl: pageContent.url,
    sourceTitle: pageContent.title,
  };
}

describe("applyClipTargetToPageContent", () => {
  it("每张图片按自身地址成为独立书签", () => {
    const first = applyClipTargetToPageContent(
      pageContent,
      imageClip("https://cdn.example.com/a.png"),
    );
    const second = applyClipTargetToPageContent(
      pageContent,
      imageClip("https://cdn.example.com/b.png"),
    );

    expect(first.url).toBe("https://cdn.example.com/a.png");
    expect(second.url).toBe("https://cdn.example.com/b.png");
    // 页面正文保留给 AI 分析使用
    expect(first.content).toBe(pageContent.content);
  });

  it("data: 图片无法长期访问，仍按来源页保存", () => {
    const result = applyClipTargetToPageContent(
      pageContent,
      imageClip("data:image/png;base64,AAAA"),
    );
    expect(result.url).toBe(pageContent.url);
    expect(getClipImageBookmarkUrl(imageClip("data:image/png;base64,AAAA"))).toBeUndefined();
  });

  it("同一页面的不同选段各成一条记录", () => {
    const first = applyClipTargetToPageContent(pageContent, {
      type: "highlight",
      text: "first quote",
      sourceUrl: pageContent.url,
    });
    const second = applyClipTargetToPageContent(pageContent, {
      type: "highlight",
      text: "second quote",
      sourceUrl: pageContent.url,
    });

    expect(first.url).toBe(
      "https://example.com/article#:~:text=first%20quote",
    );
    expect(second.url).toBe(
      "https://example.com/article#:~:text=second%20quote",
    );
  });

  it("重复保存同一选段仍指向同一条书签", () => {
    const once = applyClipTargetToPageContent(pageContent, {
      type: "highlight",
      text: "same quote",
    });
    // 面板里拿到的已是带 Text Fragment 的地址，再次保存不应叠加片段
    const twice = applyClipTargetToPageContent(once, {
      type: "highlight",
      text: "same quote",
    });
    expect(twice.url).toBe(once.url);
  });

  it("没有选中文字时按来源页保存", () => {
    const result = applyClipTargetToPageContent(pageContent, {
      type: "highlight",
      text: "   ",
      sourceUrl: pageContent.url,
    });
    expect(result).toBe(pageContent);
  });

  it("无剪藏时原样返回", () => {
    expect(applyClipTargetToPageContent(pageContent)).toBe(pageContent);
  });
});

describe("clip 类型判定", () => {
  it("图片与选中文字属于主体型剪藏，跳过页面截图与快照", () => {
    expect(isSubjectClip({ type: "image" })).toBe(true);
    expect(isSubjectClip({ type: "highlight" })).toBe(true);
    expect(isSubjectClip({ type: "note" })).toBe(false);
    expect(isSubjectClip()).toBe(false);
  });
});

describe("deriveHighlightTitle", () => {
  it("压缩空白并保留完整短文本", () => {
    expect(deriveHighlightTitle("  hello \n world  ")).toBe("hello world");
  });

  it("超长文本截断到 80 字并加省略号", () => {
    const title = deriveHighlightTitle("a".repeat(200));
    expect(title).toHaveLength(81);
    expect(title.endsWith("…")).toBe(true);
  });

  it("空白文本没有标题", () => {
    expect(deriveHighlightTitle("   ")).toBe("");
    expect(deriveHighlightTitle()).toBe("");
  });
});

describe("getClipHighlightBookmarkUrl", () => {
  it("转义 Text Fragment 语法字符并压缩空白", () => {
    const url = getClipHighlightBookmarkUrl(
      { type: "highlight", text: "a-b,  c & d" },
      "https://example.com/p",
    );
    expect(url).toBe(
      "https://example.com/p#:~:text=a%2Db%2C%20c%20%26%20d",
    );
  });

  it("超长选段只取首尾片段", () => {
    const text = `${"a".repeat(100)} ${"b".repeat(100)}`;
    const url = getClipHighlightBookmarkUrl(
      { type: "highlight", text },
      "https://example.com/p",
    );
    expect(url).toBe(
      `https://example.com/p#:~:text=${"a".repeat(60)},${"b".repeat(60)}`,
    );
  });

  it("保留来源页原有的锚点", () => {
    const url = getClipHighlightBookmarkUrl(
      { type: "highlight", text: "quote" },
      "https://example.com/p#section-2",
    );
    expect(url).toBe("https://example.com/p#section-2:~:text=quote");
  });
});
