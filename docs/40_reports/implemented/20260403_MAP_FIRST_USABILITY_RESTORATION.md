# Map-First Usability Restoration

**Date:** 2026-04-03
**Scope:** Tactical Map affordance routing (App.tsx only)

## What was over-centralized

Two high-frequency player interactions were routed through Army HQ when map-local surfaces already existed:

1. **OPS toolbar button** (`PresidentialToolbar` OPS) opened Army HQ Records/Ops tab via `openArmyHQRecords('ops')`. This forced the full Army HQ modal for a quick ops glance.
2. **S keyboard shortcut** always opened Army HQ Summary tab, even when the player was on the tactical map and the `WarSummaryModal` overlay was available.

Both were introduced during the 2026-04-02 shell ownership canonicalization pass, which correctly established Army HQ as the deep-review owner but over-applied the routing.

## What was restored to the map

1. **OPS toolbar button** now opens the map-local `OperationsPanel` via `useGameStore.getState().setIsOperationsPanelOpen(true)`. The OperationsPanel already has an "HQ Review" handoff button for players who want the deep drill-down.
2. **S shortcut** now opens `WarSummaryModal` (via `setSummaryOpen(true)`) when Army HQ is not already open. When Army HQ IS open, S still switches to the Summary tab (existing behavior preserved).

## What stays in Army HQ and why

- **RECORDS toolbar button** stays routed to Army HQ Records (AAR is canonically Army HQ per UI_OWNERSHIP_MATRIX.md)
- **H shortcut** stays as Army HQ toggle (canonical deep-review entry point)
- **Full operation history, AAR, personnel, briefing drill-down** stay in Army HQ (deep review surfaces)
- **HQ Review handoff** in OperationsPanel stays (bridge from map summary to deep review)

## Files changed

- `src/ui/map/App.tsx` (line ~646: OPS routing, lines ~542-547: S shortcut routing)

## Design principle

High-frequency affordances belong on the tactical map as summaries. Army HQ is for deep review. When a map-local surface exists for a concept, toolbar/shortcut affordances should open that surface first, with an explicit handoff to Army HQ for deeper investigation.

## Verification

### Static verification

- `npx tsc --noEmit` — clean (no errors)
- `npm run test:vitest` — 1862 passed (20 pre-existing failures unrelated to UI)
- `vite build --config src/ui/map/vite.config.ts` — built in 7.23s

### Live Playwright verification (2026-04-03)

All 5 checks performed against the running Vite dev server with a loaded VRS save (Turn 40, 6 Jan 1993). Playwright 1.59.1 + system Chromium.

| Check | Behavior | Result | Screenshot |
|-------|----------|--------|------------|
| 1 | OPS toolbar button opens OperationsPanel (map-local), NOT Army HQ | **PASS** | `screenshots/map_first_check1_ops.png` |
| 2 | S shortcut opens WarSummaryModal when Army HQ is closed | **PASS** | `screenshots/map_first_check2_s_summary.png` |
| 3 | S shortcut switches to Summary tab when Army HQ is already open | **PASS** | `screenshots/map_first_check3_s_in_hq.png` |
| 4 | RECORDS toolbar button routes to Army HQ Records tab | **PASS** | `screenshots/map_first_check4_records.png` |
| 5 | H shortcut opens Army HQ Briefing tab | **PASS** | `screenshots/map_first_check5_h_briefing.png` |

**Evidence details:**
- Check 1: "Field Ops Snapshot" panel visible in bottom-right rail. No `z-[1000]` Army HQ modal present. Map remains primary surface.
- Check 2: WarSummaryModal overlay visible with OVERVIEW/OP/FRONTS/LOGISTICS tabs. Map dimmed behind overlay. No Army HQ modal.
- Check 3: Army HQ open (via H), then S pressed. SUMMARY tab shows `amber-400` active styling.
- Check 4: Army HQ modal opens with RECORDS tab amber-active.
- Check 5: Army HQ modal opens with BRIEFING tab amber-active (default entry point).

**Testing notes:**
- Two blocking overlays (Vance-Owen Peace Plan modal, Command Briefing layer) required dismissal before toolbar interactions.
- Verification script: `scripts/playwright_map_first_verify.mjs`

### Post-Playwright Codex review fix (2026-04-03)

Codex review [P2] caught that the `S` shortcut called `setSummaryOpen(true)` directly instead of the `openSummary()` helper. This skipped the `summaryFocus` reset (defaulting to `'overview'`) and the `setEventLogOpen(false)` cleanup. If a previous command-briefing interaction had set a focused section (e.g. `casualties`), pressing `S` would reopen that stale subsection instead of the default overview, and any open EventLogPanel would remain visible underneath.

**Fix:** Changed line 547 from `setSummaryOpen(true)` to `openSummary()`. The `openSummary()` helper (line 523) resets `summaryFocus` to `'overview'` and closes the event log — matching the SUMMARY toolbar button behavior.

**Closure safety:** The useEffect has `[]` deps. `openSummary` captures only React `useState` setters (`setSummaryFocus`, `setSummaryOpen`, `setEventLogOpen`) which are stable references. Same pattern as the existing `setEventLogOpen` call on line 550.

**Typecheck:** `npx tsc --noEmit` — clean after fix.
