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

1. Probe authentication, recover any server lock journaled by an earlier version, and acquire the
   `sys.json` marker. A recent `locked` marker from any client blocks the run; an expired marker can
   be replaced after 10 minutes. The engine writes a unique owner and reads it back before continuing.
2. `deletions.json` is merged and written **first**, so an interrupted run never leaves module files without
   the items while other devices still lack the deletion.
3. Settings, categories, workspaces, tab-group config, lifecycle settings, bookmarks (pull, then push), clips, and read-later state.
4. Deletion records cancelled during the run (item edited after the delete) are removed; the marker is
   cleared only if it still belongs to this run. Local success is published only after that write succeeds.
   A failed sync clears its marker without advancing the last successful sync time/version.

The marker is a best-effort coordination mechanism, as in v1.4.4: reading, writing and confirming it
are separate requests. Two devices can still acquire it at the same time, and a sync lasting more than
10 minutes can overlap a later run. On providers without reliable server locks, use manual sync and
wait for one device to finish before starting another. The marker is not a server-enforced lock.

## Lock lifecycle and recovery

Mutations (`PUT`, `MKCOL`, `DELETE`) share one local serial queue; reads can still run concurrently.
This queue only coordinates requests in this extension background, not other devices. A rejected
request does not block subsequent cleanup or future syncs.

Sync reads send `Cache-Control: no-cache` so browser-cached `sys.json` and metadata are
revalidated before merging. Data transfers allow up to 120 seconds, including response-body
download, so a slow cloud metadata response is not cancelled at the former 30-second cutoff.
Adapter errors include the HTTP method and relative sync path
(for example `PUT /HamHomeSync/sys.json`), including SDK-thrown errors. A 404/405 after marker
acquisition can be a failed file write and must be diagnosed separately from contention.

All manual sync, automatic sync, remote clearing, lock inspection and recovery run through the same
background `SyncEngine`. The settings page no longer runs its own engine; closing it does not cancel
the background transfer. In-memory busy guards serialize these operations on this device.

Earlier versions stored server locks in `local:webdavLockJournal`, scoped by URL, username and sync root.
`webdav-lock.ts` retains the recovery code so the next sync can release a lock journaled by those versions;
normal sync does not request a new server lock. The journal stores a unique owner and any returned token.
Passwords are not included. A header token is saved before parsing the response body, so malformed
XML or a failed body read can still be cleaned up. If the LOCK response is lost entirely, recovery
queries `DAV:lockdiscovery` and only matches the saved unique owner. An unresolved acquisition retains
its recovery record. The next sync attempts to release only its own recorded leftover lock before using
the marker. Ordinary contention never causes another device's lock to be released automatically.

The retained server-lock implementation requests 600 seconds and uses the returned timeout for its lease;
its refresh and expiration logic is not used by normal marker-based sync. Requests carry AbortSignal and
have bounded timeouts (20s for lock recovery, 120s for transfers). Directory creation walks explicitly
because the SDK's recursive MKCOL does not forward the signal to its internal PROPFIND requests.

Recovery retries temporary network and 5xx UNLOCK failures once. 404/409 mean the old token is already
gone; other failures retain the journal and stop the run. Worker/browser termination can prevent cleanup;
the durable journal allows recovery on the next run rather than relying only on server expiration.

**Settings → Storage → WebDAV → Check & unlock** queries root `DAV:lockdiscovery`, falling back to a
saved local token when discovery is unsupported. After the user confirms other clients have stopped,
the background rechecks and releases only the exact reviewed tokens. A replacement lock is not
released. The `sys.json` marker is then reset, preserving bookmarks, content, last successful sync time
and version. The marker reset is not atomic with other devices, which is why users must first stop other
syncs. A stale persisted `syncing` status does not disable inspection; a genuinely busy background engine
rejects it.

Servers may hide lock tokens or reject discovery. An old lock without a locally saved token can then
require provider support (including existing Koofr locks created before this recovery journal). No
token-free force-unlock endpoint is assumed. The marker's `lock_owner` is not a WebDAV token. Both
`urn:hamhome:` markers from server-lock versions and ownerless markers from older clients retain the
same 10-minute grace period.

References: [UNLOCK](https://www.rfc-editor.org/rfc/rfc4918.html#section-9.11),
[LOCK refresh](https://www.rfc-editor.org/rfc/rfc4918.html#section-9.10.2),
[lockdiscovery](https://www.rfc-editor.org/rfc/rfc4918.html#section-15.8),
[Koofr lock confirmation and held-token handling](https://github.com/koofr/go-webdav-redis-ls/blob/master/lock_lua.go).

### Recovery verification

- `pnpm exec vitest run lib/sync` covers token persistence, lost/malformed LOCK responses, failed
  cleanup, restart recovery, renewal/expiration, stalled requests, manual recovery races, serialized
  HTTP mutations, fresh marker reads and success timestamps.
- Jianguoyun live WebDAV smoke (2026-11-14): the actual `SyncEngine` and `WebDAVAdapter` synced a
  bookmark and its content between two in-memory device fixtures using an isolated nested directory.
  Clearing that nested sync root succeeded, and the test directory was removed and verified as 404.
  This does not verify deletion of a top-level Jianguoyun folder or a browser-to-provider sync.
- Chromium extension smoke (2026-11-14): manual sync and marker recovery succeeded against a local
  WebDAV test server that rejects directory LOCK; no LOCK request was sent. The recovered marker retained
  its previous sync version and timestamp.
- Edge + Koofr verification of the previous server-lock implementation (2026-11-13): under one root lock, three concurrent temporary-file PUTs
  returned 201/412/412; sequential PUTs all returned 201. UNLOCK returned 204; all three test files
  were deleted (204) and confirmed absent (HEAD 404). The installed 1.4.6 client also aborted a
  metadata response at 30 seconds. This verifies provider behavior; full sync with the rebuilt
  extension still needs verification after the installed extension is updated.
- Chrome / Firefox / Edge: use a dedicated WebDAV test directory. Create a leftover lock, open
  Check & unlock, confirm the button stays disabled until the checkbox is selected, recover it and sync.
  Verify remote bookmarks/content survive and the last sync time does not advance merely by unlocking.
- Close the settings tab during manual sync and verify background completion and marker release. Simulate
  a failed marker release or terminate/restart the worker, then check marker recovery. For a journaled lock
  from an older version, verify UNLOCK recovery. Check unsupported
  discovery, changed credentials/accounts, Chinese/English, light/dark themes and a narrow viewport.

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
