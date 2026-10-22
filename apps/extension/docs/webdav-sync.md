# WebDAV sync strategies

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
