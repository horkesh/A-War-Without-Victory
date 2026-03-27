# Production bundle live-map verification (no dev chrome leak)

**Date:** 2026-03-27  
**Scope:** Validate `dist/tactical-map` (output of `npm run desktop:map:build`) outside the Vite dev server — same concern as dev-map `?live=1`: dev-only toolbar/strip must not appear in live-style sessions.

## Method

1. `npm run desktop:map:build` (Vite production build → `dist/tactical-map/`).
2. Static serve: `npx serve dist/tactical-map -l 3010` (no Vite middleware).
3. Browser: `http://localhost:3010/?live=1` — forces `isDevMode()` off via `gameStore.ts` (`?live=1` branch before `import.meta.env.DEV`).
4. Selected faction **RS / VRS** and inspected accessibility tree + full-page screenshot.

## Result: PASS (dev chrome)

- **No** `DEV` badge, **no** secondary dev strip (LOAD / LATEST / RUN_ID / SYNC / SAVE) in the post-selection UI.
- Accessibility snapshot after faction select lists normal chrome only (CHRONICLE, date/turn, ADVANCE TURN, VRS HQ, command accordion, map mode tabs, LAYERS) — **no** dev-tool entries.

**Screenshot:** `20260327_prod_bundle_live_map.png` (same folder) — VRS selected, live URL; no dev strip.

## Notes

- **Static file server** does not replicate Vite’s `/data` middleware; the map viewport may look empty or incomplete compared to `npm run dev:map`. This check targeted **dev UI leakage**, not full map data loading from a file:// or plain static host.
- **Side picker** still exposes “Load Save from Disk” / “Continue (Last Run)” in `SidePickerOverlay.tsx`; those are **not** gated by `devMode` today — they are separate from the dev toolbar/strip the user asked to exclude in live play.

## Code reference

`isDevMode()` in `src/ui/map/store/gameStore.ts`: `?live=1` → `false`; in production `import.meta.env.DEV` is `false`, so dev tools require `?dev=1`.
