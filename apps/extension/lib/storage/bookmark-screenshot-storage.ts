import type {
  BookmarkScreenshotAsset,
  BookmarkScreenshotMetadata,
} from "@/types";

const DB_NAME = "hamhome-assets";
const DB_VERSION = 1;
const IMAGE_STORE_NAME = "screenshotImages";
const THUMBNAIL_STORE_NAME = "screenshotThumbnails";

type ScreenshotIndex = Record<string, BookmarkScreenshotMetadata>;

const screenshotIndexItem = storage.defineItem<ScreenshotIndex>(
  "local:bookmarkScreenshotIndex",
  { fallback: {} },
);

function toMetadata(
  asset: BookmarkScreenshotAsset,
): BookmarkScreenshotMetadata {
  const { image: _image, thumbnail, ...metadata } = asset;
  return { ...metadata, thumbnailSize: thumbnail.size };
}

class BookmarkScreenshotStorage {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve(request.result);
      };
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          db.createObjectStore(IMAGE_STORE_NAME, { keyPath: "bookmarkId" });
        }
        if (!db.objectStoreNames.contains(THUMBNAIL_STORE_NAME)) {
          db.createObjectStore(THUMBNAIL_STORE_NAME, { keyPath: "bookmarkId" });
        }
      };
    });
  }

  async save(input: {
    bookmarkId: string;
    sourceUrl: string;
    image: Blob;
    thumbnail: Blob;
    mimeType: string;
    width: number;
    height: number;
  }): Promise<BookmarkScreenshotMetadata> {
    const db = await this.getDB();
    const index = await screenshotIndexItem.getValue();
    const existing = index[input.bookmarkId];
    const now = Date.now();
    const asset: BookmarkScreenshotAsset = {
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      size: input.image.size,
      capturedAt: now,
      updatedAt: now,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [IMAGE_STORE_NAME, THUMBNAIL_STORE_NAME],
        "readwrite",
      );
      tx.objectStore(IMAGE_STORE_NAME).put({
        bookmarkId: input.bookmarkId,
        blob: input.image,
      });
      tx.objectStore(THUMBNAIL_STORE_NAME).put({
        bookmarkId: input.bookmarkId,
        blob: input.thumbnail,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const metadata = toMetadata(asset);
    await screenshotIndexItem.setValue({ ...index, [input.bookmarkId]: metadata });
    return metadata;
  }

  async getAsset(bookmarkId: string): Promise<BookmarkScreenshotAsset | null> {
    const [metadata, image, thumbnail] = await Promise.all([
      this.getMetadata(bookmarkId),
      this.getImage(bookmarkId),
      this.getThumbnail(bookmarkId),
    ]);
    if (!metadata || !image || !thumbnail) return null;
    const { thumbnailSize: _thumbnailSize, ...assetMetadata } = metadata;
    return { ...assetMetadata, image, thumbnail };
  }

  async getMetadata(
    bookmarkId: string,
  ): Promise<BookmarkScreenshotMetadata | null> {
    const index = await screenshotIndexItem.getValue();
    return index[bookmarkId] ?? null;
  }

  async getIndex(): Promise<ScreenshotIndex> {
    return screenshotIndexItem.getValue();
  }

  async getThumbnail(bookmarkId: string): Promise<Blob | null> {
    return this.getBlob(THUMBNAIL_STORE_NAME, bookmarkId);
  }

  async getImage(bookmarkId: string): Promise<Blob | null> {
    return this.getBlob(IMAGE_STORE_NAME, bookmarkId);
  }

  private async getBlob(
    storeName: string,
    bookmarkId: string,
  ): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).get(bookmarkId);
      request.onsuccess = () => resolve(request.result?.blob ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(bookmarkId: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [IMAGE_STORE_NAME, THUMBNAIL_STORE_NAME],
        "readwrite",
      );
      tx.objectStore(IMAGE_STORE_NAME).delete(bookmarkId);
      tx.objectStore(THUMBNAIL_STORE_NAME).delete(bookmarkId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const index = await screenshotIndexItem.getValue();
    const next = { ...index };
    delete next[bookmarkId];
    await screenshotIndexItem.setValue(next);
  }

  async deleteMany(bookmarkIds: string[]): Promise<void> {
    for (const id of bookmarkIds) await this.delete(id);
  }

  async getStorageUsage(): Promise<{ count: number; totalSize: number }> {
    const index = await screenshotIndexItem.getValue();
    const metadata = Object.values(index);
    return {
      count: metadata.length,
      totalSize: metadata.reduce(
        (total, item) => total + item.size + item.thumbnailSize,
        0,
      ),
    };
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [IMAGE_STORE_NAME, THUMBNAIL_STORE_NAME],
        "readwrite",
      );
      tx.objectStore(IMAGE_STORE_NAME).clear();
      tx.objectStore(THUMBNAIL_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    await screenshotIndexItem.setValue({});
  }

  watchIndex(callback: (index: ScreenshotIndex) => void): () => void {
    return screenshotIndexItem.watch((value) => callback(value ?? {}));
  }
}

export const bookmarkScreenshotStorage = new BookmarkScreenshotStorage();
