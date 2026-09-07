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
