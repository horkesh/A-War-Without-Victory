# 2026-04-07 - v0.8-to-v0.9 Commander Explanation Surfaces Phase 4 - MagazineModal Narrative Narrowing

## Scope

Bounded hardening lane:

- remove Phase 0 raw-state access in `MagazineModal`
- close the last known bypass of the `extractWarData()` player-safe layer inside Warroom surfaces
- replace Phase 0 path with a minimal stub that returns no political data

## Why this lane

After Phase 3 narrowed `FactionOverviewPanel` to consume only the shared canonical packet, `MagazineModal` remained the last Warroom surface with a direct `gameState.political.*` read path. It was tolerated in Phase 3 because it did not own a competing alert model, but the raw-state seam was still real:

- five functions read directly into `gameState.political.municipalities` and `gameState.political.political_controllers`; a sixth (`renderPhase0`) orchestrated them all
- the Phase 0 entry point bypassed `extractWarData()` entirely
- helper utilities (`strictCompare`, `hasFactionPresence`, stability constants) imported from modules outside the MagazineModal data contract supported this bypass

This created an asymmetry: the war phase read only from `extractWarData()`, but the Phase 0 branch read raw state directly. Closing it makes the boundary rule uniform — `extractWarData()` is the sole data source for any live data path in `MagazineModal`.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - raw player-safe operational snapshot owner (war phase)
- `src/ui/shared/operational_sitrep_views.ts`
  - canonical operational packet owner
- `src/ui/warroom/components/MagazineModal.ts`
  - war-phase path: correctly consumed `extractWarData()`
  - Phase 0 path: directly read `gameState.political.*` through five data-reading functions, orchestrated by `renderPhase0()`

### Deprecated functions that constituted the seam

- `generateContent()` — top-level Phase 0 orchestrator; called all four data-reading functions below and read `gameState.factions` directly
- `countInvestedMunicipalities(factionId)` — read `gameState.political.municipalities`, `gameState.political.political_controllers`
- `countControlledMunicipalities(factionId)` — read `gameState.political.political_controllers`
- `computeAvgStability(factionId)` — read `gameState.political.municipalities`, `gameState.political.political_controllers`
- `countByControlStatus(factionId)` — read `gameState.political.municipalities`, `gameState.political.political_controllers`

None of these had any consumer outside Phase 0. All five were deleted.

- `renderPhase0()` — previously orchestrated all of the above into HTML output; **retained with body replaced** by a minimal not-available stub (no data reads of any kind)

### Additional dead code removed alongside the seam

- `createProgressBar()` — rendering helper used only by `renderPhase0()`
- `createStatBox()` — rendering helper used only by `renderPhase0()`
- `MagazineContent` interface — type used only by `generateContent()`
- `getPrewarCapital()` function — stub with no callers
- `PREWAR_CAPITAL_INITIAL` constant — stub with no callers

### Imports removed

- `strictCompare` from `validateGameState.js` — used only inside removed functions
- `hasFactionPresence` from `warroom_utils.js` — used only inside removed functions
- `STABILITY_CONTESTED_MIN` from `warroom_utils.js` — used only inside removed functions
- `STABILITY_SECURE_MIN` from `warroom_utils.js` — used only inside removed functions

## Design

### Canonical boundary after cleanup

- canonical raw snapshot owner (war phase):
  - `extractWarData(gameState, playerFaction)`
- canonical operational packet owner:
  - `getOperationalSitrepView(gameState, playerFaction)` in `src/ui/shared/operational_sitrep_views.ts`
- allowed in `MagazineModal`:
  - `this.gameState.meta.phase` — phase gate, not operational data
  - `this.gameState` passed to `getPlayerFaction()` and `extractWarData()` — both player-safe entry points
  - flavor prose authored over the `extractWarData()` snapshot (war phase)
- forbidden in `MagazineModal`:
  - direct reads of `gameState.political.*`
  - import of `operational_sitrep_views.ts` or `command_briefing_views.ts` (magazine is not an operational briefing)

### Phase 0 stub rule

Phase 0 path in `render()` returns a minimal HTML shell: "Field reports are not available before the war." No `gameState.political.*` access of any kind. This is intentional: Phase 0 is pre-war and the magazine surface has no meaningful pre-war operational data to surface.

### Accepted ownership line

- `MagazineModal` war phase
  - remains a flavor wrapper over player-safe snapshot facts
  - reads ONLY from `extractWarData()` snapshot
  - does not own operational alert truth
  - does not compete with the canonical packet
- `MagazineModal` Phase 0
  - minimal not-available stub
  - no raw-state access of any kind
- `getOperationalSitrepView()` / `getCommandBriefingView()`
  - canonical packet owners
  - intentionally NOT consumed by `MagazineModal` (magazine is not an operational briefing)

## Implementation

### Seam removal

- `src/ui/warroom/components/MagazineModal.ts`
  - removed: `generateContent()`, `countInvestedMunicipalities()`, `countControlledMunicipalities()`, `computeAvgStability()`, `countByControlStatus()`
  - removed: `createProgressBar()`, `createStatBox()`, `MagazineContent` interface, `getPrewarCapital()`, `PREWAR_CAPITAL_INITIAL`
  - removed imports: `strictCompare`, `hasFactionPresence`, `STABILITY_CONTESTED_MIN`, `STABILITY_SECURE_MIN`
  - `renderPhase0()` body replaced with minimal HTML stub — function retained as Phase 0 entry point, all data-reading logic removed
  - canonical boundary comment added at file top

### Canonical boundary comment

Added at the top of `MagazineModal.ts`:

> DATA BOUNDARY: `extractWarData()` is the sole data source for this file (war phase).
> Direct `gameState` reads are forbidden except `meta.phase` (phase gate) and passing `gameState`
> to `getPlayerFaction()` or `extractWarData()`. This file must NOT import from
> `operational_sitrep_views.ts` or `command_briefing_views.ts` — magazine is not an operational
> briefing.

## Tests

- `tests/magazine_modal_boundary.test.ts` — 4 new tests:
  1. Phase 0 renders a DOM element with stub text; no political data appears in rendered output
  2. Source file contains no import from `operational_sitrep_views` or `command_briefing_views`
  3. Source file contains no direct `political.municipalities`, `political.political_controllers`, or `stability_score` reads
  4. Canonical boundary comment is present in source file

## Verification

### Full suite

- `npx.cmd tsc --noEmit`: clean — zero errors
- `npm.cmd run test:vitest`: 212 files, 2973 tests — all pass
- `npm.cmd run build`: clean — pre-existing chunk size warning only, unrelated to this change

### Behavioral evidence

- `MagazineModal` Phase 0 renders stub text with no political data in output
- `MagazineModal` war phase reads exclusively from `extractWarData()` snapshot
- no remaining `gameState.political.municipalities` or `gameState.political.political_controllers` reads in the file
- no import of `operational_sitrep_views.ts` or `command_briefing_views.ts`
- canonical boundary comment present and readable in source

## Residual drift

None. The only remaining `gameState` accesses in `MagazineModal.ts` are:

- `this.gameState.meta.phase` — phase gate only; carries no operational data
- `this.gameState` passed into `getPlayerFaction()` — player-safe lookup
- `this.gameState` passed into `extractWarData()` — the sole permitted raw-state entry point

All five functions that directly read political state are gone, and `renderPhase0()` now contains only a stub with no data reads. The import list no longer references any module that existed only to support those functions. The Phase 0 path cannot leak political data because it never calls any data-reading function.

The broader Warroom data surface is now uniformly bounded: every surface that reads live game data does so through `extractWarData()` or the canonical packet.

---

## Integration notes

The following entries are copy-paste ready for the architect's use. This parallel lane cannot edit those files directly.

---

### PROJECT_LEDGER.md entry

```
## 2026-04-07 — Commander Explanation Surfaces Phase 4: MagazineModal Narrative Narrowing

**Lane**: Bounded hardening — no gameplay change, no calibration effect.

Closed the last raw-state bypass in Warroom surfaces. Five functions in `MagazineModal.ts`
(`generateContent`, `countInvestedMunicipalities`, `countControlledMunicipalities`,
`computeAvgStability`, `countByControlStatus`) read `gameState.political.*` directly, bypassing the
`extractWarData()` player-safe layer — all five deleted. `renderPhase0()` retained as Phase 0 entry
point but its body replaced with a minimal "not available" stub (no data reads of any kind). Dead code also removed: `createProgressBar`, `createStatBox`,
`MagazineContent` interface, `getPrewarCapital`, `PREWAR_CAPITAL_INITIAL`. Four supporting imports
dropped. Canonical boundary comment added at file top.

Boundary rule is now uniform across all Warroom surfaces: `extractWarData()` is the sole data entry
point for live data; `gameState.political.*` is forbidden outside that function. `MagazineModal` war
phase remains an intentional flavor wrapper; Phase 0 is a stub.

4 new boundary tests in `tests/magazine_modal_boundary.test.ts`. Verification: tsc clean, 2973 vitest
pass, build clean.

Report: `docs/40_reports/implemented/20260407_V08TO09_MAGAZINE_MODAL_NARRATIVE_NARROWING.md`
```

---

### MASTER_ROADMAP.md mark-done line

Locate the Commander Explanation Surfaces section. Mark Phase 4 as complete:

```
- [x] Phase 4 — MagazineModal Narrative Narrowing (2026-04-07): closed last raw-state bypass in Warroom surfaces; Phase 0 stub; boundary comment; 4 tests
```

---

### architect_notes.md board note

```
## MagazineModal boundary — CLOSED (2026-04-07)

MagazineModal was the last Warroom surface with a direct `gameState.political.*` read path.
Six functions removed. Phase 0 replaced with a stub. Boundary comment documents the invariant.
All Warroom surfaces now uniformly enter live data only through `extractWarData()`.

Next surface to audit if hardening continues: `DiplomacyModal` (currently accepted as diplomatic
shell; confirm it does not own a competing operational model).
```
