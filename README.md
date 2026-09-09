# gamdow — server branch

Personal game archive built with Next.js App Router, TypeScript, MUI, MongoDB and private Vercel Blob. Functional components and the existing dark theme are preserved. New accounts start empty; there is no seeded user, fake game data or browser database.

## Run locally

Requires Node.js 22 or 24 and MongoDB Community Server (or an Atlas connection). MongoDB Compass is a viewer; it does not run the database server.

```sh
npm ci
```

Copy `.env.local.example` to `.env.local`, then:

```sh
npm run dev
```

If you use Docker instead of a locally installed MongoDB service:

```sh
docker compose up -d
```

Open `http://localhost:3000`, register your own account, and add a game. In Compass connect to `mongodb://127.0.0.1:27017` and open `gamdow_local`. Uploaded images are in `.data/uploads`; their metadata and ownership are in MongoDB. Both the database volume and this folder must be backed up.

## Vercel / GitHub

Use branch **`server`**. `main` retains the frontend prototype. Read [the Persian setup guide](docs/SETUP.fa.md) before configuring Vercel. The standard Vercel build is `npm run build`, with Node.js 22.x or 24.x, and no static-export setting.

Create an Atlas database/user and a **private** Vercel Blob store. Add the values from `.env.prod.example` to Vercel Environment Variables. Real `.env.local` and `.env.prod` are ignored by Git. No real credentials are included.

Next.js does not automatically load `.env.prod`. For a local production-mode check, copy `.env.prod.example` to `.env.prod` and fill it in, using `APP_URL=http://localhost:3000` if testing through localhost, then run:

```sh
npm run build:prod
npm run start:prod
```

These scripts use Node's `--env-file` support and work in Windows shells. Vercel uses its dashboard environment variables instead. See [environment reference](docs/SETUP.fa.md).

## Architecture

- `app/api/`: small Node.js route handlers; `app/page.tsx` enforces login server-side.
- `server/`: MongoDB connection pool/indexes, session/password handling, rate limits, media storage and bounded request parsing. Server-only modules cannot enter the client bundle.
- `lib/library-schema.ts`: runtime validation and referential checks shared by backup import and the server.
- `types/`: interfaces for domain data, API payloads and authentication.
- `services/`: typed HTTP adapters. The client never receives a MongoDB or Blob credential.
- `features/gamdow/use-cloud-library.ts`: serial, revisioned autosave with retry/idempotency, visible sync status and protection against overwriting another tab's changes.
- `components/ui/`: shared controls, fixed-aspect crop/upload, tag input and drag-and-drop.

All current UI actions persist through the authenticated library API: games, status/plan/reorder, reviews/scores, journal, gallery, collections, genres/series, tags, preferences and profile. Media uploads are separate binary requests; snapshots contain only owned media references.

See [API and data model](docs/API.md) and [verification notes](docs/VERIFICATION.md). No test files or test dependencies are committed.

## Steam integration

Steam metadata, manual games, verified Steam account connection, resumable library sync,
playtime and achievements are supported on the `steam` branch. See
[Steam setup and architecture (فارسی)](docs/STEAM.fa.md) before deployment, including
initial catalog import, migration compatibility and the required server-only environment variables.
