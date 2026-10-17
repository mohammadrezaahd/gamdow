# Gamdow public landing page — implementation and design plan

## Proposed experience

Create a highly art-directed public home page for Gamdow that introduces the game archive, explains what players can do, highlights Steam and Epic connections, and gives clear sign-up and log-in paths. Preserve the existing authenticated dashboard at `/`; an active session must continue directly into the current `GamdowApp` without an intervening marketing page.

## Design direction

Three intentionally unusual concepts, each sampled from a low-probability tail:

- **Independent play archive / editorial brutalism** — p=0.06. Chosen: art-book typography, archival annotations, dark museum-like stages, and one bright chartreuse signal color.
- **Neon esports broadcast** — p=0.04. High-energy ticker treatments, scoreboard framing and electric color, but less suited to a personal long-term archive.
- **Dreamlike pastel game journal** — p=0.03. Soft colors and memory-book motifs, but too gentle for Gamdow's existing dark identity.

### Chosen style expansion

- **Design Movement:** Contemporary editorial brutalism crossed with a private game-archive exhibition.
- **Core Principles:** Make the archive feel personal, make the features instantly scannable, use motion to reveal rather than distract, and keep a strong contrast between quiet dark surfaces and a single chartreuse accent.
- **Color Philosophy:** Preserve Gamdow's charcoal/forest base and ownable acid chartreuse `#d3fc72`; use muted olive fog, warm off-white typography and restrained peach/steel details so 3D artifacts feel collected rather than neon-advertised.
- **Layout Paradigm:** An asymmetric, full-bleed hero with copy on the left and a sculptural 3D archive object on the right; alternate editorial split sections with a horizontal capability rail and a wide integration field. At narrow widths, convert these into deliberate vertical scenes without overflow.
- **Signature Elements:** A glass-and-metal archive orb with orbiting play relics; thin archival index rules and numbered section labels; floating miniature game-memory cards.
- **Interaction Philosophy:** Clear, direct entry points (`Start your archive`, `Log in`); hover tilt is subtle and optional; scroll reveals expose one section at a time without blocking reading or navigation.
- **Animation:** Use lightweight CSS transforms/keyframes and IntersectionObserver-triggered reveals; gentle parallax and slow object rotation only, no continuous fast movement. Disable decorative motion for `prefers-reduced-motion`, maintain readable content before animation, and keep CTAs fully usable without animation.
- **Typography System:** Existing Space Grotesk for strong editorial headlines and DM Sans for product explanation, supported by the existing monospace/overline archive labels.
- **Brand Essence:** A personal archive for the games you play, finish, revisit and remember. Personality: curious, thoughtful, quietly bold.
- **Brand Voice:** Headlines speak like an invitation to keep a record; supporting copy is concise and specific. Examples: “Every game leaves a trace.” “Keep the worlds you played in, not just the ones you finished.”
- **Wordmark & Logo:** Reuse the existing Gamdow lowercase wordmark and acid index mark; do not invent an unrelated logo.
- **Signature Brand Color:** Gamdow acid chartreuse `#d3fc72`.

## Implementation approach

- Keep the existing Next.js App Router, TypeScript, MUI theme, and auth flow; add no animation dependency.
- Change `app/page.tsx` so an active session renders the existing archive exactly as it does now and an unauthenticated visitor sees the new public landing component instead of a redirect.
- Add a focused `features/landing/landing-page.tsx` client component for reveal/scroll interactions and semantic CTA links, and a companion stylesheet or scoped landing styles so existing authenticated screens are not restyled.
- Add one custom wide 3D hero artwork and a coordinated supporting artifact visual under `public/images/`; layer CSS orbit lines and floating UI-like archive cards over the art for depth and motion.
- Include concise sections for library/play tracking, progress journal, reviews and spoiler-aware gallery, collections/planning, and Steam/Epic connectivity. Use only capabilities actually present in this codebase; never imply that an integration action has already synced data.
- Link visitors to the existing `/register` and `/login` routes. Preserve mobile safe-area behavior, reduced-motion accessibility, and a full keyboard-accessible CTA/header.

## Project structure

- `app/page.tsx`: server-side session gate; authenticated archive versus public landing.
- `features/landing/landing-page.tsx`: public content, responsive layout, and scroll-reveal client behavior.
- `features/landing/landing-page.css` (or equivalent scoped style file): custom hero composition, 3D layers, motion and responsive rules.
- `public/images/`: original, page-specific visual assets.
- `app/globals.css`: keep global styles unchanged except for truly global requirements.

## Existing-project facts and constraints

- Root route is dynamic and currently redirects visitors without a session to `/login`.
- The authenticated archive is rendered with `GamdowApp`; preserve this exact signed-in behavior.
- The product already includes Steam and Epic connection flows, custom library tracking, daily journal, reviews, gallery, collections and planner.
- The project uses Next.js 16, React 19, TypeScript, MUI and local DM Sans/Space Grotesk fonts; no motion or Three.js dependency is currently installed.
- Use the existing GitHub repository on `main`; do not create a duplicate WebDev project or modify unrelated account/data behavior.
