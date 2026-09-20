# Activity tracking and Statistics

Gamdow keeps a per-user append-only activity read model. The activity is no
longer shown as a per-game Timeline tab; the Statistics page is the single
archive-wide view for status changes, playtime changes and provider activity.

## Data flow

- `lib/game-activity.ts` owns date invariants and provider status/playtime rules.
- `server/library-storage.ts` derives manual events while committing the archive.
- The same MongoDB account update stores those events in `timelineOutbox`.
- `server/game-activity/timeline.ts` idempotently projects the outbox into
  `game_activity_events`.
- `server/statistics.ts` joins the read model with the current library and
  returns daily and monthly playtime/progress aggregates for the chart.
- `server/steam/playtime-sync.ts` is the provider adapter. Imports and later
  refreshes use the same reconciliation path, so Steam changes are recorded
  consistently.

The old game activity endpoint remains available as an internal/read-compatible
API for existing data and backups, but it is not linked from game detail. No
destructive migration is required. A legacy game receives a baseline event when
that compatibility endpoint is read for the first time.

## Activity rules

- Every status change, manual playtime change and manual progress change is
  recorded as an event. Progress events keep the previous value, new value and
  percentage-point delta.
- Steam playtime is authoritative for linked Steam games. A changed Steam total
  updates `hoursPlayed` in the archive and creates a playtime activity record.
- A Steam game with verified zero playtime becomes `Not started`.
- A Steam game with playtime and no recorded Steam session for at least 21 days
  becomes `On hold`.
- A positive Steam playtime signal can set a game to `Playing` when it is not
  stale. Steam never fabricates story completion.
- Omitted Steam playtime remains unknown; it is not treated as zero, which
  preserves hidden-profile data instead of resetting it.

Statistics uses the event's `occurredAt` for daily/monthly grouping and keeps
`recordedAt` in the complete activity table, so a delayed Steam refresh remains
traceable.

## Backup behavior

Activity events are included in the portable archive. Event IDs are remapped on
restore, while game IDs remain attached to the restored library. Provider
credentials, external account identities, billing and subscription data are not
part of the manifest.
