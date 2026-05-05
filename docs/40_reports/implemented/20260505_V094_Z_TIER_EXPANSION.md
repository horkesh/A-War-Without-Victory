# LANE-V094-Z-TIER-EXPANSION — Canonical Z-tier expansion + CSS bare-literal closure

**Date:** 2026-05-05
**Lane:** LANE-V094-Z-TIER-EXPANSION
**Predecessor:** `94744b89` (LANE-V094-CSS-ZINDEX-CLEANUP)
**Ring:** 1 (UI surface only)
**Section 6:** none
**Faction-agnostic:** yes
**Determinism:** safe (no Math.random / Date.now / new Date)

## Summary

Predecessor lane `94744b89` annotated 15 of 31 z-index literals in 8 CSS / HTML / debug-viewer files with canonical `Z` tokens, but found 14 bare literals (one site at `z-index: 0` documented as implicit-flow baseline; 14 actionable values: `1`, `2`, `5`, `20`, `999`, `1001`, `1500`, `2000`) with no matching tier in `src/ui/shared/zIndex.ts`. Those bare literals were allowlisted in `tests/css_z_index_canonical.test.ts` via `KNOWN_NON_SHELL_TIER_VALUES`.

This lane closes that gap by:

1. Extending the canonical `Z` table with eight new tiers — one per previously-bare value — with semantically-aligned names and JSDoc explaining the typical use case for each.
2. Re-annotating the 14 bare-literal sites in the 7 files that had actionable values with the new `canonical: Z.<TIER> = <N>` inline comments (the 8th file `src/ui/map/painter.html` had no bare literals — already fully annotated by predecessor).
3. Reducing the predecessor allowlist from 9 entries to 1 (only `0` remains — implicit-flow baseline, no semantic shell-tier meaning).
4. Extending `tests/z_index_canonical.test.ts` (T1 expected-keys, T2 numeric-values, T3 monotonic-ordering, T4c shell-tier-numbers) so the new tiers are pinned against regressions.

## New tiers (8 added)

| Tier name           | Value | Use case                                                                  |
|---------------------|-------|---------------------------------------------------------------------------|
| `BACKDROP_GRAIN`    | 1     | Decorative noise / stripe overlay backdrops                               |
| `MAP_HUD_LOW`       | 2     | Map HUD chrome over canvas (legend, zoom, frame)                          |
| `MAP_HUD_BUTTON`    | 5     | Map HUD interactive buttons (close, return on phase-0 prep map)           |
| `HOVER_LABEL`       | 20    | Hover-state corps / unit title label                                      |
| `WARROOM_TICKER`    | 999   | Warroom news ticker (just below MODAL)                                    |
| `MODAL_CLOSE`       | 1001  | Modal close button (just above MODAL)                                     |
| `MODAL_RAISED_3`    | 1500  | Warroom settlement info side panel (between MODAL_RAISED_2 and PAUSE_MENU)|
| `WARROOM_OVERLAY`   | 2000  | Warroom legacy loading overlay / tooltip (above modal stack, below PAUSE) |

**Tier count:** 28 (predecessor) → 36 (this lane).

**Monotonic ordering (preserved + extended):**
```
BACKDROP_GRAIN (1)        < MAP_HUD_LOW (2)       < MAP_HUD_BUTTON (5)
                          < MAP_OVERLAY (10)      < ORDER_QUEUE (15)
                          < HOVER_LABEL (20)      < CORPS_CARD_LABEL (30)
... (existing 30..900 chain unchanged) ...
                          < CODEX (900)           < WARROOM_TICKER (999)
                          < MODAL (1000)          < MODAL_CLOSE (1001)
                          < MODAL_RAISED (1100)   < MODAL_RAISED_2 (1200)
                          < MODAL_RAISED_3 (1500) < WARROOM_OVERLAY (2000)
                          < PAUSE_MENU (8000)
... (existing 8000+ chain unchanged) ...
```

All pre-existing tier values are preserved byte-stable (no value mutated, no tier renamed, no tier removed).

## Site re-annotation (14 sites)

| File                                              | Line  | Value | Canonical token       |
|---------------------------------------------------|-------|-------|-----------------------|
| `src/ui/map/styles/globals.css`                   | 148   | 1     | `Z.BACKDROP_GRAIN`    |
| `src/ui/map/styles/globals.css`                   | 293   | 1     | `Z.BACKDROP_GRAIN`    |
| `src/ui/warroom/index.html`                       | 145   | 2000  | `Z.WARROOM_OVERLAY`   |
| `src/ui/warroom/map_viewer_standalone.html`       | 23    | 2     | `Z.MAP_HUD_LOW`       |
| `src/ui/warroom/map_viewer_standalone.html`       | 28    | 2     | `Z.MAP_HUD_LOW`       |
| `src/ui/warroom/styles/modals.css`                | 89    | 1001  | `Z.MODAL_CLOSE`       |
| `src/ui/warroom/styles/modals.css`                | 116   | 2000  | `Z.WARROOM_OVERLAY`   |
| `src/ui/warroom/styles/modals.css`                | 1313  | 1500  | `Z.MODAL_RAISED_3`    |
| `src/ui/warroom/styles/ticker.css`                | 12    | 999   | `Z.WARROOM_TICKER`    |
| `src/ui/warroom/styles/ticker.css`                | 71    | 1001  | `Z.MODAL_CLOSE`       |
| `src/ui/warroom/styles/war-planning-map.css`      | 57    | 2     | `Z.MAP_HUD_LOW`       |
| `src/ui/warroom/styles/war-planning-map.css`      | 425   | 20    | `Z.HOVER_LABEL`       |
| `src/ui/warroom/styles/war-planning-map.css`      | 956   | 5     | `Z.MAP_HUD_BUTTON`    |
| `src/ui/warroom/styles/war-planning-map.css`      | 976   | 5     | `Z.MAP_HUD_BUTTON`    |

The 8th file `src/ui/map/painter.html` had its single literal (`z-index: 10`) already annotated by the predecessor — no change.

`src/ui/warroom/map_viewer_app.ts:470` (`zIndex: '9999'`) was already annotated as `Z.TOOLTIP` by the predecessor — no change.

## Holdout

- **`src/ui/warroom/styles/war-planning-map.css:29` (`z-index: 0`)** — left bare. The value `0` represents the implicit document-flow baseline (e.g., `#map-scene` background canvas). It carries no semantic shell-tier meaning; introducing a `Z.STACK_BASE = 0` tier would obscure that this is the implicit default rather than a deliberate stacking choice. Documented in `KNOWN_NON_SHELL_TIER_VALUES` with an updated comment block.

## Allowlist

| Phase    | Allowlisted bare values                       | Count |
|----------|-----------------------------------------------|-------|
| Before   | `0, 1, 2, 5, 20, 999, 1001, 1500, 2000`       | 9     |
| After    | `0`                                            | 1     |

## Verification

| Check                                                             | Status |
|-------------------------------------------------------------------|--------|
| `npx vitest run tests/z_index_canonical.test.ts`                  | green  |
| `npx vitest run tests/css_z_index_canonical.test.ts`              | green  |
| `npx vitest run tests/modal_wrapper.test.ts`                      | green  |
| `npx vitest run tests/modal_migration.test.ts`                    | green  |
| `npx vitest run tests/modal_migration_2.test.ts`                  | green  |
| `npx tsc --noEmit -p tsconfig.json`                               | clean  |
| `npm run desktop:map:build`                                       | clean  |
| Pre-existing 41 React-shell consumers untouched                   | yes    |
| All pre-existing tier values byte-stable                          | yes    |
| Only declared files touched (verified via `git show --stat HEAD`) | yes    |

## Sensitive-history compliance

- **Ring:** 1 (UI shell surface only — z-index taxonomy + CSS annotations). No simulation surface entered.
- **§6:** none. No `political_controllers`, OOB, paint anchor, rupture wiring, or `enclave_resilience.ts` touched.
- **Faction-agnostic:** yes. Z table mechanism is faction-symmetric; no faction-specific branching introduced.
- **Determinism:** safe. Pure constants, no `Math.random` / `Date.now` / `new Date`.
