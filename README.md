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
- `theme/gamdow-theme.ts` — archive palette, typography, glass surfaces and component defaults
- `components/` — responsive shell, image fallback, cards, grids and shared dialogs
- `components/ui/` — shared fields, dropdowns, autocomplete, calendar, switches, sliders, buttons, crop upload and sortable board
- `lib/` — fixed crop presets/image processing and pure ordering operations
- `features/gamdow/pages/` — dashboard, library, planner, browse, reviews, gallery, statistics and settings
- `features/gamdow/forms/` — typed game, review, collection and screenshot forms
- `features/gamdow/game-detail.tsx` — overview, review, gallery and journal
- `features/gamdow/library-context.tsx` — shared state and domain actions
- `types/game.ts` — entities, game input and repository contracts
- `data/fake-data.ts` — initial sample data
- `services/library-repository.ts` — browser persistence adapter and backup validation

## Current behavior

The interface supports game creation/editing/removal, independent status and play plans, scores from 0–10, review category scores, spoiler controls, journal entries, multi-image uploads, gallery navigation, collection membership and order, genre/series browsing, library search/filter/sort and grid/list views, planner groups and order, profile preferences, and backup export/restore. Statistics use recorded values; missing ratings, hours and finish dates are not treated as zero.

The visual identity uses an ink background, acid-green accents, numbered navigation, editorial typography and portrait covers. Desktop content uses the available width. Mobile has a floating bottom dock with safe-area spacing and a More menu for every remaining page. Glass styling is centralized, and motion respects reduced-motion preferences.

Page selection, game links and library filters use query parameters and browser history, e.g. `/?page=library&status=Playing`. The existing single App Router entry point is retained; feature views can become independent routes later.

## Connecting a backend

The UI does not call browser storage directly. `LibraryRepository` exposes asynchronous `load` and `save` methods. The adapter stores a versioned `LibrarySnapshot` in IndexedDB (`gamdow-archive`). Existing `gamdow.library.v1` localStorage data is imported on first load; the legacy copy is preserved. Replace this adapter with an HTTP implementation for a snapshot API, or evolve the domain actions into resource endpoints (`games`, `collections`, `gallery`, `preferences`) without moving mutation logic into page components. `GameInput` excludes server-owned identity and timestamps.

Recommended resource semantics:

- Deleting a game also removes its screenshots and collection memberships.
- Status and planning remain independent fields.
- A review belongs to a game; its overall score is independent of category scores.
- Collection membership and planner order are explicit.
- Backup restoration validates before replacing the current snapshot.

This is still a frontend with sample data, without an API, authentication or cross-device sync. New images use file upload only (JPEG/PNG/WebP, up to 20 MB each and 12 screenshots per batch). A shared cropper fixes covers to 2:3 (600×900), and banners/screenshots to 16:9 (1600×900). Users can reposition and zoom before saving a compressed JPEG. Legacy remote image references still render. For a backend, upload the cropped image to object storage and return stable URLs. Browser quota failures show an actionable warning; invalid existing storage is preserved. Export a backup before changing devices or clearing browser data.

Planner and collection order use a shared drag-and-drop board with mouse, touch and keyboard sensors. Grab the grip, or use Space and arrow keys; Escape cancels. The planner supports drops into empty groups. Collection reordering is available in the unfiltered collection order view.

The root layout includes both `AppRouterCacheProvider` (Next 16 entry point) and the application `Providers`; removing the latter would revert MUI to its default theme. Global CSS establishes a dark initial background before hydration.

DM Sans and Space Grotesk are bundled locally with their SIL Open Font Licenses in `public/fonts/`.

No test/spec files or test dependencies are included in the repository.

## In-progress carousel and category management

Overview displays the games with `Playing` status in a stacked-image carousel. Navigation supports buttons, direct indicators, keyboard arrows and horizontal touch swipes. It does not auto-advance. One game hides unnecessary controls; no active games shows a prompt to open the library.

Manage genres and series from **Collections → Manage categories** or **Settings → Manage genres & series**. Create categories before assigning games, edit their descriptions, rename them or remove them. Renames preserve category IDs and update linked game display names; deleting a category removes its assignments without deleting games. Names are unique within each kind, ignoring case and surrounding whitespace.

`types/taxonomy.ts` defines `Genre`, `GameSeries`, `TaxonomyInput`, `TaxonomyMutation` and the future resource-level `TaxonomyRepository` contract. `LibrarySnapshot` contains independent genre and series registries. `Game.genreIds` / `Game.seriesId` are populated links; `genres` / `series` retain display names for compatibility with the existing UI. The current mock adapter normalizes name-based input into registry IDs on save; a future resource API can accept IDs directly.

Old v1 backups and stored archives are migrated by `normalizeTaxonomies` in `lib/taxonomy.ts`. Existing names become registry records, and empty categories remain saved. New categories are immediately available in game form autocomplete suggestions.
