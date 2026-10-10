/**
 * Queue embedding generation for bookmarks (background only).
 * No-op when semantic search is off or not configured.
 */
import { bookmarkStorage, configStorage } from "@/lib/storage";
import { embeddingClient } from "./embedding-client";
import { embeddingQueue } from "./embedding-queue";

export async function queueBookmarkEmbeddings(
  bookmarkIds: readonly string[],
  options: { waitForCompletion?: boolean } = {},
): Promise<void> {
  if (bookmarkIds.length === 0) return;

  const config = await configStorage.getEmbeddingConfig();
  if (!config.enabled) return;

  await embeddingClient.loadConfig();
  if (!embeddingClient.isEnabled()) return;

  for (const id of bookmarkIds) {
    const bookmark = await bookmarkStorage.getBookmarkById(id);
    if (bookmark) await embeddingQueue.addBookmark(bookmark);
  }

  if (embeddingQueue.getStatus().isProcessing) return;
  const started = embeddingQueue.start();
  if (options.waitForCompletion) await started;
  else void started.catch(() => undefined);
}
