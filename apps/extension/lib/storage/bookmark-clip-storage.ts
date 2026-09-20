import { nanoid } from "nanoid";
import type {
  BookmarkClip,
  CreateBookmarkClipInput,
  ImageClipMetadata,
} from "@/types";

const clipsItem = storage.defineItem<BookmarkClip[]>("local:bookmarkClips", {
  fallback: [],
});

class BookmarkClipStorage {
  async getAllClips(): Promise<BookmarkClip[]> {
    return clipsItem.getValue();
  }

  async getClipsByBookmark(bookmarkId: string): Promise<BookmarkClip[]> {
    const clips = await clipsItem.getValue();
    return clips
      .filter((clip) => clip.bookmarkId === bookmarkId && !clip.isDeleted)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async addClip(
    bookmarkId: string,
    input: CreateBookmarkClipInput,
  ): Promise<BookmarkClip> {
    const clips = await clipsItem.getValue();
    const now = Date.now();
    const clip: BookmarkClip = {
      ...input,
      id: nanoid(),
      bookmarkId,
      createdAt: now,
      updatedAt: now,
    };
    await clipsItem.setValue([...clips, clip]);
    return clip;
  }

  async updateClip(
    id: string,
    updates: Partial<Pick<BookmarkClip, "text" | "note" | "targetUrl">>,
  ): Promise<BookmarkClip> {
    const clips = await clipsItem.getValue();
    const index = clips.findIndex((clip) => clip.id === id);
    if (index < 0) throw new Error("剪藏不存在");

    const updated = { ...clips[index], ...updates, updatedAt: Date.now() };
    const next = [...clips];
    next[index] = updated;
    await clipsItem.setValue(next);
    return updated;
  }

  async deleteClip(id: string): Promise<void> {
    const clips = await clipsItem.getValue();
    await clipsItem.setValue(
      clips.map((clip) =>
        clip.id === id
          ? { ...clip, isDeleted: true, updatedAt: Date.now() }
          : clip,
      ),
    );
  }

  async deleteByBookmark(bookmarkId: string): Promise<void> {
    const clips = await clipsItem.getValue();
    await clipsItem.setValue(
      clips.filter((clip) => clip.bookmarkId !== bookmarkId),
    );
  }

  async deleteByBookmarks(bookmarkIds: string[]): Promise<void> {
    if (bookmarkIds.length === 0) return;
    const idSet = new Set(bookmarkIds);
    const clips = await clipsItem.getValue();
    await clipsItem.setValue(
      clips.filter((clip) => !idSet.has(clip.bookmarkId)),
    );
  }

  async importRawClip(clip: BookmarkClip): Promise<void> {
    const clips = await clipsItem.getValue();
    const index = clips.findIndex((item) => item.id === clip.id);
    const next = [...clips];
    if (index >= 0) next[index] = clip;
    else next.push(clip);
    await clipsItem.setValue(next);
  }

  async importRawClips(clips: BookmarkClip[]): Promise<void> {
    await clipsItem.setValue(clips);
  }

  watch(callback: (clips: BookmarkClip[]) => void): () => void {
    return clipsItem.watch((value) => callback(value ?? []));
  }

  /** bookmarkId -> 主体型剪藏，供书签列表以剪藏内容本身作为主体展示 */
  async getSubjectIndex(): Promise<BookmarkClipSubjectIndex> {
    return buildSubjectIndex(await clipsItem.getValue());
  }

  watchSubjectIndex(
    callback: (index: BookmarkClipSubjectIndex) => void,
  ): () => void {
    return clipsItem.watch((value) => callback(buildSubjectIndex(value ?? [])));
  }
}

/** 书签列表以剪藏内容本身作为主体展示时需要的最小信息 */
export interface BookmarkClipSubject {
  clipId: string;
  type: "image" | "text";
  /** 图片主体的图片地址 */
  imageSrc?: string;
  /** 文字主体的选中原文 */
  text?: string;
  note?: string;
  sourceUrl: string;
  sourceTitle?: string;
  createdAt: number;
  imageMetadata?: ImageClipMetadata;
}

export type BookmarkClipSubjectIndex = Record<string, BookmarkClipSubject>;

/** 同一书签有多条主体型剪藏时取最新的一条 */
function buildSubjectIndex(clips: BookmarkClip[]): BookmarkClipSubjectIndex {
  const latest = new Map<string, BookmarkClip>();
  for (const clip of clips) {
    if (clip.isDeleted) continue;
    // data: / blob: 图片无法长期访问，退回按普通书签展示
    const isImage =
      clip.type === "image" &&
      !!clip.imageSourceUrl &&
      /^https?:\/\//i.test(clip.imageSourceUrl);
    const isText = clip.type === "highlight" && !!clip.text?.trim();
    if (!isImage && !isText) continue;

    const current = latest.get(clip.bookmarkId);
    if (!current || clip.createdAt > current.createdAt) {
      latest.set(clip.bookmarkId, clip);
    }
  }

  const index: BookmarkClipSubjectIndex = {};
  for (const [bookmarkId, clip] of latest) {
    index[bookmarkId] =
      clip.type === "image"
        ? {
            clipId: clip.id,
            type: "image",
            imageSrc: clip.imageSourceUrl,
            note: clip.note,
            sourceUrl: clip.sourceUrl,
            sourceTitle: clip.sourceTitle,
            createdAt: clip.createdAt,
            imageMetadata: clip.imageMetadata,
          }
        : {
            clipId: clip.id,
            type: "text",
            text: clip.text,
            note: clip.note,
            sourceUrl: clip.sourceUrl,
            sourceTitle: clip.sourceTitle,
            createdAt: clip.createdAt,
          };
  }
  return index;
}

export const bookmarkClipStorage = new BookmarkClipStorage();
