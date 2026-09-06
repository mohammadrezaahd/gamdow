# gamdow

A personal game library, planner, gallery and review journal built with Next.js, TypeScript and MUI.

## Run

```bash
npm ci
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

## Structure

- `app/` — Next.js entry point and MUI provider
- `theme/gamdow-theme.ts` — shared glass surfaces, palette, typography and component defaults
- `components/` — responsive shell, image fallback, cards, grids and shared dialogs
- `features/gamdow/pages/` — dashboard, library, planner, browse, reviews, gallery, statistics and settings
- `features/gamdow/forms/` — typed game, review, collection and screenshot forms
- `features/gamdow/game-detail.tsx` — overview, review, gallery and journal
- `features/gamdow/library-context.tsx` — shared state and domain actions
- `types/game.ts` — entities, game input and repository contracts
- `data/fake-data.ts` — initial sample data
- `services/library-repository.ts` — browser persistence adapter and backup validation

## Current behavior

The interface supports game creation/editing/removal, independent status and play plans, scores from 0–10, review category scores, spoiler controls, journal entries, multi-image uploads, gallery navigation, collection membership and order, genre/series browsing, library search/filter/sort and grid/list views, planner groups and order, profile preferences, and backup export/restore. Statistics use recorded values; missing ratings, hours and finish dates are not treated as zero.

Desktop content uses the available width with a floating sidebar and header. Mobile has a floating bottom dock with safe-area spacing and a More menu for every remaining page. Glass styling is centralized, and motion respects reduced-motion preferences.

Page selection, game links and library filters use query parameters and browser history, e.g. `/?page=library&status=Playing`. The existing single App Router entry point is retained; feature views can become independent routes later.

## Connecting a backend

The UI does not call browser storage directly. `LibraryRepository` exposes asynchronous `load` and `save` methods, and the current adapter stores a versioned `LibrarySnapshot` under `gamdow.library.v1`. Replace this adapter with an HTTP implementation for a snapshot API, or evolve the domain actions into resource endpoints (`games`, `collections`, `gallery`, `preferences`) without moving mutation logic into page components. `GameInput` excludes server-owned identity and timestamps.

Recommended resource semantics:

- Deleting a game also removes its screenshots and collection memberships.
- Status and planning remain independent fields.
- A review belongs to a game; its overall score is independent of category scores.
- Collection membership and planner order are explicit.
- Backup restoration validates before replacing the current snapshot.

This is still a frontend with sample data, without an API, authentication or cross-device sync. Image files are currently stored as data URLs (2 MB per batch); remote image URLs are also supported. For a backend, upload files to object storage and return stable URLs. Browser quota failures show an actionable warning; invalid existing storage is preserved. Export a backup before changing devices or clearing browser data.

No test/spec files or test dependencies are included in the repository.
