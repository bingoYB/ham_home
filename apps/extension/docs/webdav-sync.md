# WebDAV sync: remote format and merge rules

Implementation: `lib/sync/sync-engine.ts` (orchestration), `sync-schema.ts` (remote shapes),
`sync-codec.ts` (content chunks), `remote-parse.ts` (tolerant parsing), `lww-merge.ts` (merge helpers),
`sync-tombstones.ts` + `lib/storage/sync-tombstone-storage.ts` (deletion records).

## Automatic sync strategies

Configure these independently in **Settings → Storage → WebDAV → Sync strategy**. Values are saved
automatically in `local:webdavConfig` and apply only to this device; they are not uploaded to WebDAV.

| Strategy | Default | Allowed values | Trigger |
| --- | --- | --- | --- |
| Real-time sync | On, 300 seconds | 1–3600 whole seconds | Debounced changes to bookmarks, content, clips, deletions, categories, workspaces, settings, tab-group rules/settings, read-later entries and tab lifecycle settings |
| Startup sync | On, 5 seconds | 1–3600 whole seconds | Browser startup, extension installation/update, or enabling startup sync / completing an enabled configuration |
| Periodic sync | On, 30 minutes | 1–1440 whole minutes | Two-way sync even without local changes, to receive other devices' updates |

Existing configurations without these fields retain the previous 5-minute local-change delay and
30-minute interval. Disable all three strategies for manual-only sync; **Sync Now** remains available.
Disabling WebDAV cancels all pending automatic work. A sync that has already started is allowed to finish.

`lib/sync/sync-scheduler.ts` owns background scheduling and registers listeners synchronously. Worker
wakeups preserve periodic deadlines and do not count as browser startup. One-shot deadlines are stored
in `local:webdavSyncPending` so they can be restored if the browser loses an alarm. Short delays also use
a timer while the worker is awake, with an alarm as fallback. Browser throttling / device sleep may delay
execution. Changes during an active sync remain queued; identical storage writes and sync status changes
are ignored to prevent sync loops. A remote data update may cause one extra convergence pass.

The controls follow [Sync Engine's independent startup / periodic / change triggers](https://github.com/hesprs/sync-engine).
Scheduling accounts for [browser alarm timing and persistence limits](https://developer.chrome.com/docs/extensions/reference/api/alarms).

### Verification

- Unit tests: from `apps/extension`, run `./node_modules/.bin/vitest run lib/sync`.
- Chrome / Firefox / Edge: enable WebDAV with a dedicated test server, set a short real-time delay,
  change a bookmark/category/workspace and verify sync. Disable each strategy and verify no corresponding
  alarm remains; disable all and confirm manual sync still works.
- Restart the browser with startup sync enabled / disabled; check the configured interval and delay.
- Enter empty, negative, fractional and out-of-range values; verify they are rejected. Reload the settings
  page to verify persistence, and check Chinese / English plus light / dark layouts.

## Remote layout (`/HamHomeSync`)

| File | Content |
| --- | --- |
| `sys.json` | `{ version, sync_version, last_sync_time, lock_status, lock_timestamp, lock_owner? }` |
| `deletions.json` | Deletion records `{ id, deletedAt }[]` for `categories`, `workspaces`, `workspaceCategories`, `tabGroupRules` |
| `settings.json` | `LocalSettings` |
| `categories.json` | `LocalCategory[]` (with `icon`, `updatedAt`) |
| `workspaces.json` | `{ workspaces, categories }` |
| `tab-group-config.json` | `{ rules, autoGroupSettings }` |
| `bookmarks/meta.json` | `{ bookmarks: RemoteBookmarkMeta[], deletions: { id, deletedAt }[] }`; each bookmark may carry `contentHash` |
| `bookmarks/clips.json` | `{ clips }` |
| `bookmarks/read-later.json` | Read-later queue state |
| `tab-lifecycle-config.json` | Tab lifecycle settings |
| `bookmarks/chunks/{id}.gz.txt` | `{ data: base64(gzip(JSON.stringify({ content }))) }` |

## Order of one sync

1. Auth probe, acquire an exclusive depth-infinity WebDAV `LOCK` on the sync root, then write the legacy `sys.json` marker. Mutations carry the lock token; servers without LOCK stop safely.
2. `deletions.json` is merged and written **first**, so an interrupted run never leaves module files without
   the items while other devices still lack the deletion.
3. Settings, categories, workspaces, tab-group config, lifecycle settings, bookmarks (pull, then push), clips, and read-later state.
4. Deletion records cancelled during the run (item edited after the delete) are removed; lock released.

## Merge rules

- **Last-Write-Wins** by `updatedAt` for every entity. Categories and workspace categories without
  `updatedAt` (older data) use `createdAt`; on a tie with different content the remote version wins and is
  written locally, so devices converge.
- **Deletions** win over older copies on both sides; an item edited after `deletedAt` is revived and the
  record is dropped. Records expire after 90 days (same as bookmark tombstones).
- **Bookmark identity** also converges by normalized URL (see `bookmark-dedup.ts`).
- **Content** moves only when it changed: `contentHash` (length + FNV-1a) in the meta decides whether a
  chunk is uploaded or downloaded. A missing or corrupt chunk never overwrites local content.
- **Device-local fields** are never taken from the remote copy: `hasSnapshot` reflects this device's
  snapshot store.
- **Unreadable remote data** is never overwritten: list items that fail validation are written back as they
  were; a file that is not valid JSON or has an unexpected structure stops the sync with
  `invalidRemoteData`; unreadable `settings.json` is skipped. Item schemas are `loose()`, so fields added by
  newer versions survive a round trip through this version.
- **Clips** of bookmarks deleted for good are dropped remotely instead of being re-imported.

## One-time content repair

Versions before this fix decoded gzip chunks with `unzipSync` and stored every pulled bookmark with empty
content. After upgrading, each sync re-downloads up to 200 such bookmarks whose content is missing locally
(`syncConfigStorage.getContentRepairState`) until none are left.

## Compatibility with older clients

Older versions read the same files, but until every device is upgraded:

- they strip `contentHash`, category `icon`/`updatedAt` and unknown fields when they rewrite a file
  (the next upgraded device restores what it knows);
- they ignore `deletions.json` and may push deleted categories, workspaces or rules back; upgraded devices
  delete them again on their next sync;
- they still cannot read content chunks.

Upgrade all devices to get consistent results.

See [data consistency](./data-consistency.md) for local write serialization, export snapshots and WebDAV server compatibility.
