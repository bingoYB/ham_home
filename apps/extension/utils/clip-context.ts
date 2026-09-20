import type {
  PageContent,
  SaveFlowClipContext,
  TextQuoteSelector,
} from "@/types";

function getElementPath(node: Node | null): string | undefined {
  const element =
    node instanceof Element ? node : node?.parentElement ?? undefined;
  if (!element) return undefined;

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body && parts.length < 8) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }
    const parentElement: Element | null = current.parentElement;
    if (parentElement) {
      const siblings: Element[] = Array.from(parentElement.children).filter(
        (child) => child.tagName === current?.tagName,
      );
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parentElement;
  }
  return parts.join(" > ") || undefined;
}

function createTextQuoteSelector(exact: string): TextQuoteSelector {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const bodyText = document.body?.innerText ?? "";
  const index = bodyText.indexOf(exact);
  return {
    exact,
    prefix: index >= 0 ? bodyText.slice(Math.max(0, index - 64), index) : undefined,
    suffix:
      index >= 0 ? bodyText.slice(index + exact.length, index + exact.length + 64) : undefined,
    domPath: getElementPath(range?.startContainer ?? null),
  };
}

export function enrichClipContext(
  clip?: SaveFlowClipContext,
): SaveFlowClipContext | undefined {
  if (!clip) return undefined;
  const text = clip.text?.trim() || window.getSelection()?.toString().trim();
  return {
    ...clip,
    ...(clip.type === "image" ? collectImageContext(clip.imageSourceUrl) : {}),
    text: text || undefined,
    sourceUrl: clip.sourceUrl || window.location.href,
    sourceTitle: clip.sourceTitle || document.title,
    selector:
      clip.type === "highlight" && text
        ? createTextQuoteSelector(text)
        : clip.selector,
  };
}

/** 图片说明的最大采集长度，超出部分对 AI 判断已无增量信息 */
const IMAGE_CAPTION_MAX_LENGTH = 500;

/**
 * 采集图片的 alt / title / 说明文字。
 * 右键菜单只能拿到图片地址，这些 DOM 信息必须在页内补齐，
 * 它们会与图片一起发送给多模态模型作为辅助描述。
 */
function collectImageContext(
  imageSourceUrl?: string,
): Pick<
  SaveFlowClipContext,
  "imageAlt" | "imageTitle" | "caption" | "imageWidth" | "imageHeight"
> {
  if (!imageSourceUrl) return {};

  const image = findImageElement(imageSourceUrl);
  if (!image) return {};

  return {
    imageAlt: image.alt?.trim() || undefined,
    imageTitle: image.title?.trim() || undefined,
    caption: findImageCaption(image),
    imageWidth: image.naturalWidth || image.width || undefined,
    imageHeight: image.naturalHeight || image.height || undefined,
  };
}

/** currentSrc 反映浏览器最终选中的候选图（srcset / picture），优先按它匹配 */
function findImageElement(imageSourceUrl: string): HTMLImageElement | null {
  const images = Array.from(document.images);
  return (
    images.find((image) => image.currentSrc === imageSourceUrl) ??
    images.find((image) => image.src === imageSourceUrl) ??
    null
  );
}

/** figcaption 优先，其次是紧邻图片的说明性文字 */
function findImageCaption(image: HTMLImageElement): string | undefined {
  const figure = image.closest("figure");
  const figcaption = figure?.querySelector("figcaption")?.textContent?.trim();
  if (figcaption) return truncateCaption(figcaption);

  const ariaLabel = image.getAttribute("aria-label")?.trim();
  if (ariaLabel) return truncateCaption(ariaLabel);

  const sibling = image.parentElement?.nextElementSibling;
  const siblingText = sibling?.textContent?.replace(/\s+/g, " ").trim();
  // 过长的相邻块通常是正文而非图注，不作为图片说明
  if (siblingText && siblingText.length <= IMAGE_CAPTION_MAX_LENGTH) {
    return siblingText || undefined;
  }

  return undefined;
}

function truncateCaption(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.slice(0, IMAGE_CAPTION_MAX_LENGTH);
}

/**
 * 图片剪藏保存图片本身，文字剪藏保存选中片段，来源页只保存在 clip 上。
 */
export function applyClipTargetToPageContent(
  pageContent: PageContent,
  clip?: SaveFlowClipContext,
): PageContent {
  // 图片剪藏以图片自身地址作为书签地址，同一页面下的多张图片各成一条记录；
  // 页面正文保留下来仅用于 AI 分析上下文，不会写入图片书签。
  const imageBookmarkUrl = getClipImageBookmarkUrl(clip);
  if (imageBookmarkUrl) {
    return { ...pageContent, url: imageBookmarkUrl };
  }

  // 文字剪藏以「来源页 + 选中片段」作为书签地址，同一页面的不同选段各成一条记录
  const highlightBookmarkUrl = getClipHighlightBookmarkUrl(
    clip,
    pageContent.url,
  );
  if (highlightBookmarkUrl) {
    return { ...pageContent, url: highlightBookmarkUrl };
  }

  return pageContent;
}

/**
 * 主体型剪藏：保存的主体是内容本身（图片 / 选中文字），
 * 页面标题、链接与来源站点只是附属信息。
 * 保存的不是整页，因此不需要备注、页面截图与快照。
 */
export function isSubjectClip(clip?: SaveFlowClipContext): boolean {
  return clip?.type === "image" || clip?.type === "highlight";
}

/** 选中文字剪藏没有独立标题，用正文首句兜底，保证书签可检索。 */
export function deriveHighlightTitle(text?: string): string {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized;
}

/**
 * 图片剪藏用作书签地址的图片链接。
 * data: / blob: 等无法长期访问的地址不适合当书签，退回按来源页保存。
 */
export function getClipImageBookmarkUrl(
  clip?: SaveFlowClipContext,
): string | undefined {
  if (clip?.type !== "image" || !clip.imageSourceUrl) return undefined;
  return /^https?:\/\//i.test(clip.imageSourceUrl)
    ? clip.imageSourceUrl
    : undefined;
}

/** 选段过长时只取首尾片段拼 Text Fragment，避免书签地址无限增长 */
const HIGHLIGHT_FRAGMENT_MAX_LENGTH = 150;
const HIGHLIGHT_FRAGMENT_EDGE_LENGTH = 60;

/** Text Fragment 中 `-` `,` `&` 有语法含义，必须转义 */
function encodeFragmentTerm(text: string): string {
  return encodeURIComponent(text).replace(/-/g, "%2D");
}

function buildTextFragment(text: string): string {
  if (text.length <= HIGHLIGHT_FRAGMENT_MAX_LENGTH) {
    return `text=${encodeFragmentTerm(text)}`;
  }
  const start = text.slice(0, HIGHLIGHT_FRAGMENT_EDGE_LENGTH).trim();
  const end = text.slice(-HIGHLIGHT_FRAGMENT_EDGE_LENGTH).trim();
  return `text=${encodeFragmentTerm(start)},${encodeFragmentTerm(end)}`;
}

/**
 * 文字剪藏用作书签地址的链接：在来源页地址上追加 Text Fragment（#:~:text=）。
 * 同一页面的不同选段因此各自成为独立书签，打开书签时浏览器还会定位并高亮原文。
 * 已带 Text Fragment 的地址会被替换而不是叠加，保证重复保存同一选段仍是同一条书签。
 */
export function getClipHighlightBookmarkUrl(
  clip: SaveFlowClipContext | undefined,
  baseUrl: string,
): string | undefined {
  if (clip?.type !== "highlight") return undefined;
  const text = clip.text?.replace(/\s+/g, " ").trim();
  if (!text) return undefined;

  try {
    const parsed = new URL(baseUrl);
    const hash = parsed.hash.replace(/^#/, "").split(":~:")[0];
    parsed.hash = `${hash}:~:${buildTextFragment(text)}`;
    return parsed.toString();
  } catch {
    // 地址无法解析时退回按来源页保存
    return undefined;
  }
}
