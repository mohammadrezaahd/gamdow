# Verification

Validated during implementation:

- Next.js production build and TypeScript compilation.
- Real route-handler execution with isolated in-memory database/cookie adapters: registration, login, logout, password hashing, hashed session tokens, expiry, throttling, same-origin enforcement and two-account isolation.
- Full archive save/read/update/removal, normalized tags, category relationships, profile changes, invalid-reference rejection, cross-account media rejection, revision conflicts, concurrent save winners and idempotent replay.
- React autosave hook: serial requests, coalesced changes, lost-response retry identity, correct ordering after retry, correction after validation errors, and unload protection.
- Local JPEG upload, server decode/re-encode and private read; malformed/SVG/oversized upload rejection. Private Blob SDK contract exercised with a network stub.

Limits of the verification:

- Starting the temporary MongoDB binary was blocked by this execution environment (`open: Operation not permitted`). Real MongoDB driver/network/index behavior was not integration-tested here.
- No Atlas URI or private Blob credentials were supplied. No actual Vercel/Atlas/Blob deployment or remote storage upload was performed.
- Live browser visual inspection remains unavailable due the previously saved browser access restriction.

The isolated verification scripts/dependencies live outside the repository. No test/spec files or test dependencies are shipped.

## Deployment smoke check

After setting environment variables and deploying the `server` branch:

1. Visit `/` signed out; verify the login redirect. Register two separate accounts in separate browser profiles.
2. Account A starts empty. Add a game with aliases, a category, a collection, a review and journal entry. Reorder the plan. Wait for `All changes saved`, refresh, and verify them.
3. Upload/crop a cover, screenshot and avatar. Refresh and verify the private images still load. Account B must not be able to fetch A's `/api/media/<id>` URL.
4. Change the same archive from two tabs. Confirm the second stale save displays a conflict rather than overwriting the first. Export pending changes before choosing Reload.
5. Export/import the same account's metadata backup. Verify profile and game relationships. This export does not contain image binaries.
6. Log out, verify protected pages/media reject access, then log back in and verify persistence.
7. Check the Atlas `accounts`, `sessions`, `media` and `rate_limits` collections in Compass and verify the files in the connected private Blob store.

## Steam branch verification

The Steam implementation was checked with 28 executable service/route regression groups
and 4 React autosave/coordination groups using temporary scripts outside the repository.
These execute the real application code with controlled Steam responses and an isolated
Mongo collection adapter; they are not live Steam or MongoDB integration tests.

Covered: non-mutating legacy reads; lossless v1 → v2 writes; manual editing; metadata
normalization, caching and stale fallback; DLC rejection; linking/unlinking with personal
history and original uploaded artwork retained in backups; App-ID idempotency; media
validation/ownership; CAS conflicts and retries; empty versus private libraries; catalog
flags, pagination and watermark; local search and discovery cache; OpenID session binding,
assertion fields, verification request and replay rejection; bounded resumable library sync;
playtime updates without changing scores/progress/order; separate achievement definitions
and unlocks; privacy handling; distributed leases; retained associations after metadata
removal; disconnect cleanup; scheduler and CSRF rejection; server-only credentials.

The hook checks serial/coalesced autosaves, blocking Steam mutations while dirty, reloading
snapshot/revision after successful or partially failed operations, and cooperative pause.
Actual local image decode/re-encode and authenticated reads were exercised with Sharp.
Next.js production build and TypeScript compilation pass. An initial Turbopack persistence
cache panic was resolved by discarding the old generated cache and rebuilding cleanly.

No live Steam key/account callback, actual MongoDB index/concurrency behavior, Vercel
scheduler or Blob network upload was exercised in this turn. Browser visual QA was not
performed. Configure the destination environment and complete these deployment checks:

1. Bootstrap the catalog with `npm run steam:catalog:prod`; run again and inspect that
   incremental requests use the saved watermark rather than importing metadata for every app.
2. Connect a real Steam account from Profile. Cancel one sign-in, then complete another.
   Verify that disconnecting removes personal Steam cache and preserves manual/user data.
3. Sync a public library, pause/resume, then sync again after cooldown. Verify no duplicate
   App IDs and no changed reviews, scores, tags, collection memberships or manual progress.
4. Check a private profile/game-details account and a game without achievements; verify
   meaningful unavailable/unsupported states instead of invented zero progress.
5. Link a manual game containing an uploaded cover, gallery, review and journal entry;
   export its backup, unlink and verify that its original metadata and personal history remain.
6. Confirm official Steam images use CDN URLs and do not create Blob objects, while
   cropped user uploads still use the existing private media flow.
7. Verify the server collections/indexes with Compass, the scheduled catalog route with
   `CRON_SECRET`, and the appearance on desktop and mobile in the deployed application.

## Selective Steam import (`steam-import`)

This change passed 20 executable service/route regression groups, 8 React interaction/hook
regression groups, the existing personal-write serialization regression, TypeScript, and
`npm run build`. Scripts and tooling remain outside the repository.

Service/route checks execute the actual Steam client/services, Mongo lease logic, storage
projection/CAS code and handlers against an isolated in-memory collection adapter and
controlled upstream responses. Covered: preview without import; cached reads and refresh
cooldown; pagination/search/imported flags; all-matching selection with exclusions; selected
import; request replay; wrong snapshot/revision/generation and forged App IDs; active job
conflicts/cancel; ownership and CSRF; sync-only behavior; preservation of manual data,
reviews/scores/tags/notes/dates/ordering/collections; per-app failures and DLC exclusion;
private versus empty libraries; separate achievement schemas/unlocks; unsupported/private
achievement outcomes; two-detail/40-association limits; one achievement game per invocation;
local and upstream HTTP 429 pause; CAS conflict recovery; lost-checkpoint replay; explicit
manual link/unlink; disconnect cleanup; and not resurrecting entries deleted during sync.

The manual unlink check exposed and fixed a bug where absent optional fields in the saved
manual metadata could leave Steam's banner/year on the restored manual game. The upstream
429 check also verifies that throttling is not converted to a permanent per-game failure or
written into the negative metadata cache.

React checks exercise the actual import component and shared sync hook with host-control
and repository adapters: selection across pages, exclusions, search, Select None, individual
import, explicit Import All confirmation, manual link confirmation, revision invalidation,
private/disconnected states, the existing query-based Profile URL, and achievement-phase
progress. These are behavior checks, not visual MUI/browser testing.

Live Steam sign-in/library visibility, actual MongoDB indexes/concurrency, Vercel deployment
and visual browser inspection were not performed for this change. Existing auth/upload/
crop/DnD implementations were retained; they were not all re-executed against live services.

Before promoting the branch, verify on its Vercel Preview with the destination environment:

1. Connect via Profile → Steam; preview the owned list without changing Collection.
2. Select games on multiple pages, exclude one, import, pause/resume and check result counts.
3. Try Import All under a search filter and verify the explicit confirmation explains its scope.
4. Run Sync imported games after cooldown; newly purchased or removed entries must not be added.
5. Confirm actual playtime/achievement visibility, private/unsupported states, and unchanged
   personal scores, reviews, notes, gallery, manual progress and order.
6. Link/unlink a manual game with an uploaded cover and no original banner; confirm the
   original artwork returns and no Steam CDN image becomes a manual-upload reference.
7. Inspect the new `steam_owned_libraries` TTL index in Compass; disconnect must remove
   this account's preview and Steam stats while retaining its personal archive.

## Social login, automatic activity refresh and artwork

The follow-up passed the production build/TypeScript, 12 new server regression groups,
20 existing Steam import/service groups, 8 existing import UI/hook groups, an artwork
fallback interaction check and an automatic-refresh lifecycle check (42 groups total).
No verification code or test dependencies are committed. `jose` is a runtime dependency
for validating Google's signed ID tokens.

New checks execute actual OAuth/session/Steam services with controlled Google token/JWKS
and Steam OpenID responses. Google tokens are genuinely signed with a temporary test RSA
key and verified by jose: wrong audience, expiry, nonce, signature and unverified email are
rejected. The checks cover browser-bound single-use callbacks, session-bound Google linking,
no automatic email-based account linking, preservation of password/archive, reuse of a
connected Steam account, first Steam login, disconnect/re-login, and invalid Steam assertions.

Activity checks cover imported-only bulk playtime updates, caching, preservation of manual
progress/reviews/snapshot and private-library rejection. Profile aggregation is executed by
an isolated Mongo-compatible query engine against fixture collections; removed achievement
definitions, private results and other-user records do not inflate the totals. React checks
cover initial/focus/visibility refresh, request coalescing, hidden-tab suppression, cleanup,
and high-resolution artwork fallback/source changes without altering manual upload URLs.

This does not constitute live Google/Steam account testing or real Mongo index/concurrency
verification. Google credentials and callback registration must be configured as described in
SOCIAL_LOGIN.fa.md. Visual mobile/browser QA was not performed because browser access remains
restricted; responsive changes were reviewed in source and compiled. Verify real redirects,
playtime after a Steam session, private visibility, artwork availability and 320–430px layouts
on the deployed site.
