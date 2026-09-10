# API and persistence

All responses containing account data use `Cache-Control: no-store`. All writes require a same-origin `Origin` header. No owner/user ID from the client authorizes an operation; the session is authoritative.

| Method | Path | Input | Result |
|---|---|---|---|
| POST | `/api/auth/register` | `RegisterInput` | `AuthSession`, 201 + session cookie |
| POST | `/api/auth/login` | `LoginInput` | `AuthSession` + session cookie |
| POST | `/api/auth/logout` | `{}` | session deletion + expired cookie |
| GET | `/api/auth/session` | — | `AuthSession` or null |
| GET | `/api/library` | — | `{ snapshot, revision }` |
| PUT | `/api/library` | `{ snapshot, revision, mutationId }` | `{ revision }` |
| POST | `/api/media` | raw JPEG/PNG/WebP body; matching Content-Type | `{ id, src, width, height }`, 201 |
| GET | `/api/media/[id]` | — | private JPEG after ownership check |

Errors: `{ error, code }`. Typical statuses: 400 invalid data/references, 401 missing/expired session, 403 wrong origin, 409 duplicate account or revision/account conflict, 413 oversized request, 415 wrong media type, 429 rate limit, 500 operational failure. No credential, connection URI or stack trace is returned.

## Accounts and sessions

`accounts`: `_id` UUID, normalized unique email, scrypt password hash (N=32768/r=8/p=3 with a fresh salt), creation date, `snapshot`, integer `revision`, `lastMutationId`.

`sessions`: SHA-256 of a cryptographically random opaque token, owner ID, absolute expiration Date. TTL index removes old records; authorization checks expiration immediately even before TTL cleanup. Normal sessions expire after one day and use a browser-session cookie. Remember-me sessions last 30 days. Cookies are HttpOnly, SameSite=Lax, path `/`, and Secure with `__Host-` prefix on Vercel/HTTPS. Login rotates the current cookie/session; logout revokes it in MongoDB.

`rate_limits`: atomic per-window counters with TTL; authentication is limited by email and Vercel-provided IP. Local development uses one local address bucket. Uploads are limited per account. Public self-hosting behind another proxy requires adapting trusted IP extraction.

`media`: UUID, owner ID, private storage path/adapter, dimensions, byte size, creation Date. Ownership is checked both on read and when attaching references to an archive. Images are decoded and re-encoded server-side. The database holds references, never base64 images.

## Aggregate persistence and concurrency

The current frontend already edits an aggregate archive. One MongoDB document per account makes collection/game/gallery changes atomic without requiring multi-document transactions or a replica set locally. All schema and game references are validated before compare-and-swap against the caller's revision. Game status and play intention remain independent. Taxonomy IDs remain stable; free text tags are normalized and searchable by the existing client search function.

The client serializes saves and coalesces changes made while a previous save runs. A mutation UUID makes retrying a lost response idempotent while it remains the account's last write. A stale revision returns 409; it never silently overwrites the newer archive. Changes remain in memory after an error, with retry and metadata export available. Reload explicitly discards pending edits. Logout is disabled while changes are pending; page unload prompts the browser when possible. This is an online app, not an offline queue: do not close the tab before `All changes saved`.

Schema validation is in `lib/library-schema.ts`. The aggregate is bounded to 3 MiB per write to fit Vercel request/response and MongoDB document limits. The UI has no artificial tag-count cap. For a larger library, split into independently paginated domain collections and preserve these interfaces. Profile updates currently use the same revisioned library endpoint to avoid two competing writers to the aggregate.

## Deployment and access

`/` verifies the database-backed session in a Server Component. Every API independently checks authorization; hiding client pages is not relied upon. `/login` and `/register` redirect authenticated users to the dashboard. MongoDB uses one cached client per process and small connection pools suitable for serverless instances. Index initialization is idempotent, resettable after failure, and occurs at runtime so builds require no database connection.

## Session renewal and Epic identity

- `POST /api/auth/session`: same-origin, authenticated sliding renewal. Returns the existing AuthSession DTO; never creates a session for an expired/missing token.
- `GET /api/epic/connection`: authenticated EpicConnection DTO with configuration, verified identity and explicit capability flags.
- `POST /api/epic/connect`: same-origin, authenticated, rate limited. Returns an Epic authorization URL bound to the current session/browser.
- `GET /api/epic/callback`: consumes the one-use flow and exchanges the code server-side, then redirects to Profile with a fixed result code.
- `DELETE /api/epic/connection`: same-origin, authenticated. Cancels pending links and removes only the Epic association.

Epic capabilities currently report `libraryImport: false`, `playtime: false`, `achievements: false`. There is no cross-game Epic sync endpoint; official EAS identity linking does not grant that capability.

Steam game details additionally return `ownership.state`: `owned`, `not_owned`, or `unknown`, with `checkedAt` when known. This is based on a fresh, successful Owned Games snapshot for the connected account; absent/private/stale responses remain unknown. This is a library membership indication, not a payment receipt or a security entitlement. The UI offers `steam://run/<AppId>` for owned games and an external store purchase link for absent, paid games. Manual playtime adjustments use the existing revision-checked library save path and never update Steam playtime or story progress.
