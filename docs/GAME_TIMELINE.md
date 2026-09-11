# Game activity timeline

The timeline is a per-user append-only read model. It does not mix public game
metadata with personal progress.

## Data flow

- `lib/game-activity.ts` owns pure date/status invariants and provider inference.
- `server/library-storage.ts` derives manual events while committing the archive.
- The same MongoDB account update stores those events in `timelineOutbox`.
- `server/game-activity/timeline.ts` idempotently projects the outbox into
  `game_activity_events`; an interrupted projection is retried on the next read.
- `server/steam/playtime-sync.ts` is the provider adapter. Both initial import
  and later activity refresh use it, so playtime inference is not duplicated.
- `GameTimeline` is a presentational component. The panel/repository supply its
  serializable DTOs and callbacks.

No destructive migration is required. A legacy game receives one baseline
event the first time its timeline is read.

## Status rules

- First explicit `Playing` status or first increase in manual playtime sets
  `startedAt` when it is empty.
- `Completed` sets `completedAt`; changing to any other status clears it.
- A positive Steam playtime delta can move `Not started` or `On hold` to
  `Playing` and can infer the first start date.
- Inactivity can only create an `On hold` suggestion for the user to approve.
- Steam playtime and achievements never imply story completion. `Completed`
  remains an explicit user decision.

Steam and Epic activity implement the shared `ExternalGameActivity` contract.
Epic identity is currently supported, but Epic does not expose the equivalent
cross-library playtime feed used by the Steam adapter, so no activity is
fabricated.

## Backup behavior

Timeline events are included in the portable archive. Event IDs are remapped on
restore, while game IDs remain attached to the restored library. Provider
credentials, external account identities, billing and subscription data are
not part of the manifest.
