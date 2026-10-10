/**
 * Undo for in-page toasts: reopens archived tabs, or reverts a read later add.
 */
import { tabArchiveService } from "./tab-archive-service";
import { readLaterService } from "./read-later-service";
import { takeUndoRecord } from "./tab-undo-records";

class TabUndoService {
  /** False when the token is unknown or expired */
  async undo(token: string): Promise<boolean> {
    const record = await takeUndoRecord(token);
    if (!record) return false;
    if (record.kind === "archive") {
      await tabArchiveService.restoreBatches([record.batchId]);
    } else {
      await readLaterService.revert(record);
    }
    return true;
  }
}

export const tabUndoService = new TabUndoService();
