interface WorkspaceRestoreSuppressionState {
  urls: Record<string, number>;
  tabIds: Record<string, number>;
}

const RESTORE_SUPPRESSION_TTL_MS = 10 * 60 * 1000;

const workspaceRestoreSuppressionItem =
  storage.defineItem<WorkspaceRestoreSuppressionState>(
    "local:workspaceRestoreAutoGroupSuppression",
    {
      fallback: {
        urls: {},
        tabIds: {},
      },
    },
  );

function getExpiresAt(): number {
  return Date.now() + RESTORE_SUPPRESSION_TTL_MS;
}

function normalizeUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function pruneExpired(
  state: WorkspaceRestoreSuppressionState,
): WorkspaceRestoreSuppressionState {
  const now = Date.now();
  return {
    urls: Object.fromEntries(
      Object.entries(state.urls).filter(([, expiresAt]) => expiresAt > now),
    ),
    tabIds: Object.fromEntries(
      Object.entries(state.tabIds).filter(([, expiresAt]) => expiresAt > now),
    ),
  };
}

class WorkspaceRestoreSuppressionStorage {
  async suppressUrls(urls: string[]): Promise<void> {
    const state = pruneExpired(await workspaceRestoreSuppressionItem.getValue());
    const expiresAt = getExpiresAt();
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      if (normalized) {
        state.urls[normalized] = expiresAt;
      }
    }
    await workspaceRestoreSuppressionItem.setValue(state);
  }

  async suppressTabIds(tabIds: number[]): Promise<void> {
    const state = pruneExpired(await workspaceRestoreSuppressionItem.getValue());
    const expiresAt = getExpiresAt();
    for (const tabId of tabIds) {
      state.tabIds[String(tabId)] = expiresAt;
    }
    await workspaceRestoreSuppressionItem.setValue(state);
  }

  async shouldSuppress(input: {
    tabId?: number;
    url?: string;
    pendingUrl?: string;
  }): Promise<boolean> {
    const state = pruneExpired(await workspaceRestoreSuppressionItem.getValue());
    const tabIdKey = input.tabId == null ? null : String(input.tabId);
    const url = normalizeUrl(input.url || input.pendingUrl);
    const shouldSuppress =
      (tabIdKey != null && state.tabIds[tabIdKey] != null) ||
      (url != null && state.urls[url] != null);

    await workspaceRestoreSuppressionItem.setValue(state);
    return shouldSuppress;
  }
}

export const workspaceRestoreSuppressionStorage =
  new WorkspaceRestoreSuppressionStorage();
