# gamdow

A personal game collection, play planner, gallery and review journal.

## Stack

- Next.js (App Router) + TypeScript
- MUI with a central theme in `theme/gamdow-theme.ts`
- Typed domain models in `types/game.ts`
- API-ready fake data in `data/fake-data.ts`

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

- `app/` — Next.js routes and application providers
- `components/` — reusable shell, cards and grids
- `features/gamdow/` — interactive application views
- `data/` and `types/` — typed fake data ready to be replaced by API calls
- `theme/` — MUI design tokens and component defaults

No test files are included, as requested.
