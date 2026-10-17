# Gamdow Statistics / activity archive implementation plan

## Requested outcome

Treat Statistics as an internal analytics/support page, not a final-player dashboard surface yet. Keep it visible in desktop navigation and the mobile More menu until the user explicitly asks for removal. Present ordered, clean charts and separate tables for playtime, story progress, monthly/daily periods, weekdays, games, genres, platforms, sources, and status. Consolidate retained game-event history into a dedicated **Log** section.

## Data semantics and completeness

- Current library playtime/game counts are current-state, all-time totals; event-derived charts, tables, active days, and weekday groups are scoped to an explicit viewer-local date interval of up to 366 calendar days. Users can inspect any historical interval with the date controls; every calendar day/month in the selected interval receives a table row, including zero-activity periods.
- The complete Log is independent of the selected date interval, includes retained events for removed games where available, and uses keyset pagination. The exact count is acquired once per filter/refresh, not on every cursor page.
- Legacy games with no activity history receive idempotent baseline snapshot entries in writes of at most 100 per batch. Baselines appear in the Log/counts but are not counted as play sessions or active activity days. Initialization work is coalesced and briefly cached per account.
- Steam exposes aggregate playtime and a provider-reported last-played timestamp, not complete session history. Playtime deltas are dated by when Gamdow records/observes them; show Steam last-played separately and do not label sync-day buckets as actual session dates.
- Status distribution reflects current game counts. Status-event metrics count only explicit status transitions into a status; progress, playtime, and baseline snapshots are not mislabeled as status transitions.
- User/account isolation is enforced by authenticated routes and account-scoped event queries. Local calendar boundaries use the validated IANA time zone.

## Information architecture and visual rules

1. Report header, library filters, and a local-date window with 30/90/365-day shortcuts and custom dates.
2. Coverage summary distinguishing current all-time totals, all-time Log records, synthetic baselines, and selected-window activity.
3. Monthly, daily, and weekday playtime/progress visuals with complete, separate tables.
4. Current library breakdowns by genre, game, platform, source, and status, each with a chart and separate table.
5. Dedicated **Log** with full retained event details, filters, and bounded cursor navigation.
6. Clearly separate Steam account/cache metrics (not mixed into game-event Log records).

Use the existing Gamdow theme, concise headings, accessible responsive charts and semantic data tables. Fit bounded period charts to their containers with sparse date labels; table overflow stays contained rather than expanding the document. Preserve the existing authenticated route and keep Statistics visible for now.
