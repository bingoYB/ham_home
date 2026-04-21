import type { PinnedItem, PinnedTargetType } from "@/types";

const pinnedItemsItem = storage.defineItem<PinnedItem[]>("sync:pinnedItems", {
  fallback: [],
});

class PinStorage {
  async getPinnedItems(): Promise<PinnedItem[]> {
    const items = await pinnedItemsItem.getValue();
    return sortPinnedItems(items);
  }

  async isPinned(type: PinnedTargetType, targetId: string): Promise<boolean> {
    const items = await pinnedItemsItem.getValue();
    return items.some((item) => item.type === type && item.targetId === targetId);
  }

  async pin(type: PinnedTargetType, targetId: string): Promise<PinnedItem> {
    const items = await pinnedItemsItem.getValue();
    const now = Date.now();
    const existing = items.find(
      (item) => item.type === type && item.targetId === targetId,
    );

    let pinnedItem: PinnedItem;
    if (existing) {
      pinnedItem = { ...existing, pinnedAt: now, order: now };
      await pinnedItemsItem.setValue(
        items.map((item) => (item.id === existing.id ? pinnedItem : item)),
      );
      return pinnedItem;
    }

    pinnedItem = {
      id: `${type}_${targetId}`,
      type,
      targetId,
      pinnedAt: now,
      order: now,
    };
    await pinnedItemsItem.setValue([...items, pinnedItem]);
    return pinnedItem;
  }

  async unpin(type: PinnedTargetType, targetId: string): Promise<void> {
    const items = await pinnedItemsItem.getValue();
    await pinnedItemsItem.setValue(
      items.filter((item) => !(item.type === type && item.targetId === targetId)),
    );
  }

  async togglePin(
    type: PinnedTargetType,
    targetId: string,
  ): Promise<PinnedItem | null> {
    const pinned = await this.isPinned(type, targetId);
    if (pinned) {
      await this.unpin(type, targetId);
      return null;
    }
    return this.pin(type, targetId);
  }

  async move(type: PinnedTargetType, targetId: string, direction: "up" | "down") {
    const items = sortPinnedItems(await pinnedItemsItem.getValue());
    const index = items.findIndex(
      (item) => item.type === type && item.targetId === targetId,
    );
    if (index === -1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const current = items[index];
    const target = items[swapIndex];
    const reordered = items.map((item) => {
      if (item.id === current.id) return { ...item, order: target.order };
      if (item.id === target.id) return { ...item, order: current.order };
      return item;
    });

    await pinnedItemsItem.setValue(reordered);
  }

  watch(callback: (items: PinnedItem[]) => void): () => void {
    return pinnedItemsItem.watch((newValue) => {
      callback(sortPinnedItems(newValue ?? []));
    });
  }
}

function sortPinnedItems(items: PinnedItem[]): PinnedItem[] {
  return [...items].sort((a, b) => b.order - a.order || b.pinnedAt - a.pinnedAt);
}

export const pinStorage = new PinStorage();
