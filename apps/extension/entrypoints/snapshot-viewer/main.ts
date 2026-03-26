import { snapshotStorage } from "@/lib/storage/snapshot-storage";

function renderStatus(message: string): void {
  document.body.innerHTML =
    `<div class="snapshot-viewer-status"><pre>${message}</pre></div>`;
}

async function bootstrap(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const bookmarkId = params.get("bookmarkId");

  if (!bookmarkId) {
    renderStatus("未找到可用的快照数据。");
    return;
  }

  try {
    const snapshot = await snapshotStorage.getSnapshot(bookmarkId);
    if (!snapshot) {
      renderStatus("快照不存在或已被删除。");
      return;
    }

    const text = await snapshot.html.text();

    document.open();
    document.write(text);
    document.close();
  } catch (error) {
    console.error("[SnapshotViewerPage] Failed to load snapshot:", error);
    renderStatus(
      error instanceof Error
        ? `快照加载失败：${error.message}`
        : "快照加载失败。",
    );
  }
}

void bootstrap();
