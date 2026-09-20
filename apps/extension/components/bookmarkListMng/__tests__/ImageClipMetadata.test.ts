import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ImageClipMetadata } from "../ImageClipMetadata";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "subject.imageInfo": "图片信息",
        "subject.dimensions": "尺寸",
        "subject.fileSize": "文件大小",
        "subject.format": "格式",
        "subject.unknown": "未知",
      })[key] ?? key,
  }),
}));

describe("ImageClipMetadata", () => {
  it("renders the palette and original image facts", () => {
    const html = renderToStaticMarkup(
      createElement(ImageClipMetadata, {
        metadata: {
          colors: ["#102A18", "#C7AA5B"],
          width: 1280,
          height: 1280,
          size: 247_070,
          format: "PNG",
          mimeType: "image/png",
        },
      }),
    );

    expect(html).toContain('aria-label="图片信息"');
    expect(html).toContain('aria-label="#102A18"');
    expect(html).toContain('aria-label="#C7AA5B"');
    expect(html).toContain("1280 × 1280");
    expect(html).toContain("241 KB");
    expect(html).toContain("PNG");
  });

  it("renders nothing when historical clips have no metadata", () => {
    expect(
      renderToStaticMarkup(createElement(ImageClipMetadata, {})),
    ).toBe("");
  });
});
