# Personal storage and portable backups

Each account receives 1 GiB (1,073,741,824 bytes, labelled GB in the UI) free. The limit is free capacity plus one-time storage grants. There is no recurring billing or expiry. The existing `media.size` records are the source of usage, so old uploads count automatically without resetting data. Uploaded JPEG/PNG/WebP files are normalized to JPEG within 1600 × 1600 at quality 88, retaining aspect ratio. Stored image size is limited to 3 MiB. Avatar, covers, backgrounds and gallery files count. References to the same file count once.

Files stay in a **private Vercel Blob** store (or local filesystem in development). MongoDB stores ownership, path, size and lifecycle state, not image bytes. Steam CDN links are uncharged. Saving official artwork downloads only server-selected Steam metadata URLs on approved Valve HTTPS hosts, disallows redirects, bounds download size/time and creates a charged personal copy. Screenshots copied into the gallery are marked as spoilers. Removing a saved cover/background restores remote artwork. Unlinking Steam retains personal copies as manual artwork. Epic currently supports identity linking, not an official cross-game library/media API; the Epic filter also covers manually managed games marked with that storefront.

## Quota and deletion

`storage_locks` serialize quota reservations and library reference changes across instances. Pending uploads, ZIP reservations and files awaiting physical deletion all count toward quota. A failed physical deletion never falsely releases bytes. Normal uploads are reserved before storage writes. Authenticated media reads require ownership and ready state.

Library writes use revision comparison and share the storage lease. Files detached from their last active reference are queued for deletion after a successful archive commit. Deletion removes the physical file first and the Mongo record second. Shared files (for example, a cover also used in a gallery) remain until their last reference is removed. Direct DELETE rejects still-referenced files and active import slots. Removing a game cascades its gallery references but never removes Steam ownership or shared catalog metadata.

Cleanup is bounded: a commit/Settings cleanup request drains up to 20 files; the existing protected daily catalog cron also runs a bounded cleanup pass. Temporary failures retry on subsequent passes. Detached uploads expire after 24 hours. Pending imports reserve space for 24 hours and can be cancelled in Settings after a reload; expired jobs cannot commit. `backup_jobs` retain recovery metadata for seven additional days and then expire. The live archive, not legacy migration snapshots, determines active file references. No account data is reset by this release.

## Storage purchases (optional configuration)

1. In Stripe create **one-time** prices for +1 GB, +5 GB and +20 GB. Set the amount/currency you intend to charge. Do not use recurring prices.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STORAGE_1GB_PRICE_ID`, `STRIPE_STORAGE_5GB_PRICE_ID`, `STRIPE_STORAGE_20GB_PRICE_ID` in the server environment. Blank keys leave the pack comparison visible with checkout disabled. `APP_URL` must be the canonical application origin.
3. Add webhook `<APP_URL>/api/storage/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Use the webhook's signing secret, not an API key. Match test/live modes and deploy after setting variables.
4. Checkout uses `mode=payment` and server-configured price IDs. Prices displayed come from Stripe. The signature is verified using Stripe's SDK; fulfillment fetches the session and checks paid state, mode, account, pack, price and quantity. A unique Checkout session ID creates exactly one `storage_grants` document, including on webhook retries. Returning to the site alone never grants capacity. Storage refreshes every 30 seconds and on focus, so delayed webhooks can take a moment to appear.

Refunds and disputes require operator review; this release does not automatically reduce capacity or delete customer files after refunds. Granting or correcting a pack is a privileged operational action. Never put Stripe secrets or price administration in client code. No checkout was charged during development verification; verify your configured test-mode webhook before enabling live prices.

## ZIP format and restore

A ZIP contains `manifest.json` (`format: gamdow-archive`, version 1) and `media/<UUID>.jpg`. The manifest explicitly includes only games, collections, genre/series taxonomies and gallery. It includes personal **game** notes/reviews/status/progress/tags, but excludes profile/avatar-only files, preferences, email/password/session, Steam/Epic account identity, owned-library caches, achievement/playtime integration caches, billing records and grants. Steam App IDs describe games, not account identity. Official remote artwork remains a URL until saved. A shared avatar image still appears if it is independently used by a game/gallery.

ZIP export fetches saved metadata, then images one at a time and adds SHA-256 checksums. Supported desktop browsers stream the ZIP to a user-selected file. Browsers without Save File support use a Blob download limited to 256 MiB of images to prevent large mobile memory allocations; larger exports request a supported desktop browser. No entire ZIP is posted to Vercel. Individual transfer requests stay below 3 MiB, under Vercel's function payload limit.

Import validates paths, duplicates, entry count (10,001 including manifest), encryption, bounded decompression, checksums, JPEG decoding/dimensions and references. The server validates the manifest and **reserves all image bytes before transfer**. Each slot belongs to the authenticated user/job, receives a new UUID, and is retry-safe. Images are uploaded sequentially. On final commit all slots must be ready, the job must still be active, and the archive revision must match. One atomic archive update replaces the collection while preserving the target profile/preferences. Image references including original manual metadata are remapped; imports never reuse another account's private URLs. Existing Steam entries must reference this deployment's internal game catalog; missing catalog entries return a clear error rather than silently importing invalid games.

Old data stays intact until commit. Staging requires room for **both old and incoming images**. Insufficient space returns `STORAGE_QUOTA_EXCEEDED` before transferring images. Cancellation deletes only unreferenced staged files. An interrupted commit can be retried without replacing twice; the mutation ID recovers a lost response. A changed library revision prevents overwriting edits from another tab. ZIPs are backups of saved data; resolve pending save errors before exporting. This replaces the former account-bound JSON backup UI; legacy JSON is not a portable image backup and is not silently accepted as ZIP.

## Routes

- `GET /api/storage`: usage, reserved bytes and quota.
- `POST /api/storage`: retry bounded cleanup and return usage.
- `DELETE /api/media/[id]`: remove an owned, detached file.
- `POST /api/storage/official`: copy selected Steam cover/background/screenshot.
- `GET /api/storage/plans`, `POST /api/storage/checkout`: pack comparison and hosted checkout.
- `POST /api/storage/webhook`: signed payment events.
- `GET /api/backups/export`: portable manifest for the saved archive.
- `GET /api/backups/import`: unfinished import ID.
- `POST /api/backups/import`: validate and reserve image slots.
- `POST /api/backups/[id]/files/[mediaId]`: upload one reserved image.
- `POST /api/backups/[id]/commit`: atomic final restore.
- `DELETE /api/backups/[id]`: cancel and release unreferenced staged files.

All user routes authenticate ownership; mutations require same-origin requests. Webhooks use signed raw bodies; the existing catalog/cleanup scheduler requires `CRON_SECRET`. No new cron secret or Blob configuration is needed.
