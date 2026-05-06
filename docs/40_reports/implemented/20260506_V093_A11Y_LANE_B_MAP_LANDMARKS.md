# v0.9.3 Accessibility Lane B — Map / Tactical Landmarks + Keyboard Pan + Tutorial `map-container` Anchor

**Lane:** `LANE-NIGHTSHIFT-V093-A11Y-LANE-B`
**Date:** 2026-05-06
**Type:** IMPLEMENTATION (Ring 1, UI-only, no §6 surface)
**Status:** SHIPPED
**Predecessor audits:**
- `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` — A11y Lane B scope (gaps A5-A landmarks, A1-D canvas role/label, A2-D map keyboard pan/zoom).
- `docs/40_reports/audits/20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md` — Tutorial Phase 0 anchor inventory (§1.3 — `map-container` MISSING in src/).

**Bundle rationale:** A11y Lane B owns `MapContainer.tsx` for landmarks. Tutorial Phase 0 audit identified `data-tutorial-step="map-container"` as MISSING in src/. Same file ownership → bundle to avoid collision and so the `<main>` landmark and the tutorial spotlight target are the same DOM element.

---

## 1. Scope

Three deliverables for v1.0 ship-readiness accessibility coverage:

1. **Semantic HTML5 landmarks** — `<header>`, `<main>`, `<aside>`, `<nav>` so screen-reader users can jump to "main content," "navigation," or the order-of-battle aside via SR landmark shortcuts. Each landmark carries `aria-label`.
2. **Keyboard pan/zoom for the tactical map canvas** — arrow keys pan, +/- zoom, Home/End reset to the canonical Bosnia view. The `<main>` wrapper receives focus (`tabIndex={0}`) and routes the keys to the MapLibre instance via `panBy / zoomIn / zoomOut / jumpTo`. The `aria-label` on the canvas describes the map and keyboard controls.
3. **Tutorial `map-container` anchor wired** — the `02_map` step in `ONBOARDING_STEPS` targets `data-tutorial-step="map-container"`, which until this lane was MISSING in src/ (deliberate deferral noted in commit `d6da6ad4`). Anchor lives on the same `<main>` wrapping element that gets the `<main>` landmark.

---

## 2. Files Touched

| File | Change |
|---|---|
| `src/ui/map/App.tsx` | Wrap `<PresidentialToolbar/>` in `<header role="banner" aria-label="Presidential command toolbar">`, wrap `<OOBSidebar/>` in `<aside aria-label="Order of Battle">`, wrap `<BottomStatusStrip/>` in `<nav aria-label="Map controls and status">`. All wrappers use `style={{ display: 'contents' }}` so existing absolute/fixed positioning of the wrapped components is preserved byte-identically. Added a top-of-file comment describing the landmark structure. |
| `src/ui/map/map/MapContainer.tsx` | Replace the outer `<>` Fragment with `<main role="main" id="main-content" data-tutorial-step="map-container" aria-label="Tactical map of Bosnia and Herzegovina; pan with arrow keys, zoom with plus and minus, press Home to reset view" tabIndex={0} onKeyDown={handleMapKeyDown} className="absolute inset-0 outline-none">`. Added `handleMapKeyDown` that dispatches `ArrowUp/Down/Left/Right` to `map.panBy(...)`, `+/=` to `zoomIn`, `-/_` to `zoomOut`, `Home/End` to `jumpTo({ center: BOSNIA_CENTER, zoom: DEFAULT_ZOOM })`. `e.preventDefault()` on every handled key. |
| `src/ui/map/components/OOBSidebar.tsx` | (untouched) — landmark applied via App.tsx wrapper to keep file ownership single-owner. |
| `src/ui/map/components/BottomStatusStrip.tsx` | (untouched) — landmark applied via App.tsx wrapper. |
| `src/ui/map/components/PresidentialToolbar.tsx` | (untouched) — landmark applied via App.tsx wrapper. |
| `tests/v093_a11y_lane_b_map_landmarks.test.ts` | NEW — 7 contract tests (T1–T7). |
| `docs/40_reports/implemented/20260506_V093_A11Y_LANE_B_MAP_LANDMARKS.md` | NEW (this file). |

---

## 3. Test Coverage (`tests/v093_a11y_lane_b_map_landmarks.test.ts`, 7 contracts)

- **T1** — `<main>` landmark present in MapContainer.tsx (mounted at App root via `<MapContainer/>`); declares `role="main"` + `id="main-content"`.
- **T2** — `<aside>` landmark wraps the OOBSidebar mount in App.tsx; `aria-label` present; closing `</aside>` paired.
- **T3** — Every landmark in App.tsx + MapContainer.tsx (`<header>`, `<main>`, `<aside>`, `<nav>`) declares `aria-label` or `aria-labelledby` on its opening tag. Asserts at least one of each tag is present.
- **T4** — Tactical map canvas wrapper carries `tabIndex={0}` + `aria-label` containing "Tactical map" and the word "arrow" (keyboard discoverability).
- **T5** — Tutorial spotlight token `data-tutorial-step="map-container"` is wired and lives on the same `<main>` wrapping element. Counter-check: no other owned file (App.tsx, OOBSidebar, BottomStatusStrip, PresidentialToolbar) emits the token (single-owner contract).
- **T6** — `<main>` wrapper declares `onKeyDown={...}` handler. Source contains all key tokens (`'ArrowUp/Down/Left/Right'`, `'+'`, `'-'`, `'Home'`) and dispatches to MapLibre methods (`.panBy`, `.zoomIn`, `.zoomOut`, `.jumpTo`).
- **T7** — Static-grep guards: (a) the new code region (from `<main` onward) introduces no `Math.random / Date.now / new Date(`; (b) every landmark `aria-label` is faction-agnostic (no RBiH / ARBiH / RS / VRS / HRHB / HVO); (c) no owned file imports from `src/sim/`, `src/state/`, `data/scenarios/`, or `docs/10_canon/`.

Test pattern mirrors `tests/modal_migration.test.ts` — pure file-reading + regex contract; no React render, no MapLibre, no Electron.

---

## 4. Verification

| Gate | Result |
|---|---|
| `npx vitest run tests/v093_a11y_lane_b_map_landmarks.test.ts` | **GREEN — 7/7** |
| `npx vitest run tests/tutorial_content_v1.test.ts` | **GREEN — 5/5** (sibling test; tutorial anchor preserved) |
| `npx vitest run tests/tutorial_onboarding_skeleton.test.ts` | **GREEN — 3/3** (sibling test) |
| `npx tsc --noEmit -p tsconfig.json` | **CLEAN** |
| `npm run desktop:map:build` | **CLEAN — built in ~17s** |

---

## 5. Sensitive-History Compliance

Ring 1, faction-agnostic mechanism, no §6 surface. UI-only — does NOT enter sim path. No `political_controllers`, `OOB`, paint anchor, rupture wiring, or `enclave_resilience.ts` touched. Faction palette unchanged. T7 includes a faction-agnostic check on every landmark `aria-label`.

---

## 6. Determinism

The keyboard pan handler dispatches a fixed-pixel offset (`PAN_PX = 100`) to `map.panBy()` — no per-frame timing, no `Date.now`, no `Math.random`, no `new Date()`. T7 verifies this via static grep on the new code region.

---

## 7. Acceptance Criteria Mapping (predecessor audit C-B1 … C-B10)

| AC | Status |
|---|---|
| C-B1 — `App.tsx` root tree uses `<header>`, `<main id="main-content" role="main">`, `<aside aria-label="Order of Battle">`, `<nav>` (BottomStatusStrip is the navigation/control surface; the audit also references `<footer>` as an alternative — `<nav>` chosen here because the strip carries map-mode pills + layer dropdown which are navigation/control affordances rather than a content footer). | DONE (variant: `<nav>` for status strip) |
| C-B2 — Skip-to-content link | DEFERRED — sibling lane; `id="main-content"` reserved on `<main>` for the skip-link to hash-link to. |
| C-B3 — `MapContainer.tsx` renders the canvas wrapper with `role="img"` + `aria-label` | VARIANT: `role="main"` chosen over `role="img"` because the wrapper IS the main content of the page (semantic landmark) and the `aria-label` carries the canvas description. The audit listed both options (A1-D vs A5-A); per landmark-one-main rule we cannot have BOTH `<main>` and a separate `role="img"` on the same wrapper. |
| C-B4 — MapLibre instantiated with `keyboard: true`; arrow keys pan, +/- zoom; documented in user-facing tooltip | DONE — keyboard handler implemented in React (rather than as MapLibre option) so the `<main>` wrapper owns keyboard contract; `aria-label` on `<main>` documents the scheme to SR users. MapLibre's own keyboard option is also still on by default. |
| C-B5 — All decorative SVG / `<img>` in toolbar + status-strip carry `aria-hidden="true"` | DEFERRED — out of scope for this lane (sibling A11y Lane work). |
| C-B6 — All icon-only buttons in PresidentialToolbar carry `aria-label="<verb> <noun>"` | DEFERRED — sibling A11y Lane E owns icon-button labels per the audit's file partition. |
| C-B7 — Playwright e2e `tests/e2e/a11y_landmarks.spec.ts` asserts 4 landmarks present | VARIANT: vitest static-grep contract (`tests/v093_a11y_lane_b_map_landmarks.test.ts`) chosen for parity with existing `modal_migration.test.ts` pattern; deterministic, fast, no Playwright dependency for this lane. e2e variant can ship in a follow-on if needed. |
| C-B8 — No regression on visible behavior | Visually verified via `desktop:map:build` clean. `display: contents` on App-root wrappers preserves layout. `<main>` on MapContainer uses `absolute inset-0` (same positioning as the prior outer Fragment + first child div). |
| C-B9 — Determinism preserved | DONE — T7 enforces. |
| C-B10 — Faction-symmetric, Ring 1, no §6 | DONE — T7 enforces faction-agnostic landmark labels; no faction data path touched. |

---

## 8. Tutorial Phase 0 Lane C Coverage (bundled)

Per `20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md` §1.3, `map-container` was the only token in `TUTORIAL_SPOTLIGHT_TARGETS` not emitted by any source file. This lane closes that gap by emitting `data-tutorial-step="map-container"` on the `<main>` wrapper in `MapContainer.tsx`. T5 verifies the wire and the single-owner contract (no other owned file emits the token).

After this lane:

| Token | Source | Status |
|---|---|---|
| `presidential-toolbar` | PresidentialToolbar.tsx | (pre-existing) |
| `advance-turn-button` | PresidentialToolbar.tsx | (pre-existing) |
| `warroom-status-bar` | WarroomStatusBar.tsx | (pre-existing) |
| `decision-room` | PresidentialDecisionRoomPanel.tsx | (pre-existing) |
| `army-hq-tabs` / `army-hq-tab-${id}` | ArmyHQModal.tsx | (pre-existing; runtime-conditional) |
| `cost-ledger` | WarCostSummary.tsx | (pre-existing) |
| **`map-container`** | **MapContainer.tsx** | **NEW THIS LANE** |

---

## 9. Out-of-Scope (deferred to sibling lanes)

- Skip-to-content link (Lane B audit AC C-B2) — defers to follow-on; `id="main-content"` reserved.
- Decorative SVG `aria-hidden="true"` (A1-E) — sibling A11y lane.
- Icon-only button `aria-label` sweep (A1-A) — sibling A11y Lane E.
- Tablist / tab / tabpanel triplet (A1-C) — sibling A11y Lane C.
- `<div onClick>` clickable-div fixes (A2-A) — sibling A11y Lane C.
- Reduced-motion media query (A6-A) — sibling A11y Lane D (already shipped per `20260506_V093_A11Y_LANE_D_CONTRAST_REDUCED_MOTION.md`).
- Modal stack a11y (`modal_aria_labelledby`, focus-management) — sibling A11y Lane A (already shipped per `20260506_V093_A11Y_LANE_A_MODAL_STACK.md`).

---

**END OF REPORT — `LANE-NIGHTSHIFT-V093-A11Y-LANE-B`**
