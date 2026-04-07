# 2026-04-07 - v0.8-to-v0.9 Commander Explanation Surfaces Phase 5 - DiplomacyModal Boundary Audit and Narrowing

## Scope

Bounded hardening lane:

- audit `DiplomacyModal` for raw-state bypasses of the `extractWarData()` player-safe layer
- close the W5 territory seam — a direct `political_controllers` loop inside `renderWashingtonTracker()`
- document the accepted HRHB capability exception with an explicit in-code boundary guard
- add a class-level `DATA BOUNDARY:` comment formalising the permitted-read contract
- add 7 boundary tests covering structural invariants and functional correctness

## Why this lane

After Phase 4 closed the last raw-state bypass in `MagazineModal`, `DiplomacyModal` was the one remaining Warroom surface that had not been formally audited against the `extractWarData()` boundary rule. The Phase 3 report had tentatively classified `DiplomacyModal` as "a diplomatic shell over diplomatic facts, not an operational SITREP owner" — acceptable without further work — but the Phase 4 architect note flagged it for explicit confirmation.

The audit found two issues:

1. **W5 territory read** — `renderWashingtonTracker()` contained a direct `political_controllers` loop to compute RS territory percentage. This was a live raw-state read inside a rendering method, not routed through `extractWarData()`, directly analogous to the seams closed in Phases 3 and 4.
2. **HRHB capability exception undocumented** — `renderHRHB()` read `gameState.factions.find(f => f.id === 'HRHB')?.capability_profile` directly. This is genuinely acceptable — the player is HRHB at this branch, and `capability_profile` is not part of the `WarDataSnapshot` contract — but the exception was invisible: no comment explained why this direct read was permitted, leaving it indistinguishable from an accidental bypass.

Neither issue affected gameplay or calibration. Both issues undermined the clarity of the boundary rule and created maintenance risk: a future engineer could follow the undocumented pattern and expand the direct-read surface.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - raw player-safe operational snapshot owner (war phase)
  - all fog-of-war enforcement centralised here
- `src/ui/shared/operational_sitrep_views.ts`
  - canonical operational packet owner
- `src/ui/warroom/components/DiplomacyModal.ts`
  - faction-specific diplomacy shell: RS "Belgrade Channel", RBiH "Alliance & International", HRHB "Zagreb Line"
  - most sections correctly consumed `extractWarData()` snapshot
  - W5 condition in `renderWashingtonTracker()` directly read `political_controllers`
  - HRHB capability read present but undocumented

### Seam 1 — W5 territory raw-state bypass (CLOSED)

**Classification:** Active seam. Direct `political_controllers` loop in a rendering method, bypassing `extractWarData()`.

The `renderWashingtonTracker()` method computed the RS territory fraction needed for condition W5 ("RS territory > 40%") by iterating `political_controllers` directly — five lines of raw-state access. This was the same class of bypass that was deleted in Phases 3 and 4.

The correct fix was to route this data through `extractWarData()`. Because territory control is a Tier 2 publicly observable fact (all sides can observe who controls what on the front), the data belongs in the snapshot with a Tier 2 annotation — not read ad hoc per render.

### Seam 2 — HRHB capability exception (DOCUMENTED, NOT CLOSED)

**Classification:** Accepted exception. Own-faction data for player-controlled faction; field not in snapshot contract.

`renderHRHB()` reads `gameState.factions.find(f => f.id === 'HRHB')?.capability_profile` for two fields (`equipment_access`, `croatian_support`) used in the "CAPABILITY OUTLOOK" section. This is reached only when the player is HRHB — there is no cross-faction visibility issue. Adding `capability_profile` to `WarDataSnapshot` would bloat the contract without benefit; the exception is narrow and intentional.

The fix was documentation, not deletion: an explicit comment above the read explains the reasoning and adds a "do not expand" guard phrase to prevent future creep.

## Design

### Canonical boundary after cleanup

- canonical raw snapshot owner (war phase):
  - `extractWarData(gameState, playerFaction)` in `src/ui/warroom/data/war_data_extractor.ts`
- canonical operational packet owner:
  - `getOperationalSitrepView(gameState, playerFaction)` in `src/ui/shared/operational_sitrep_views.ts`
- allowed in `DiplomacyModal`:
  - `this.gameState.meta.*` fields (turn, phase, war_start_turn — phase gate and timeline arithmetic, not operational data)
  - `this.gameState` passed to `getPlayerFaction()` and `extractWarData()` — both player-safe entry points
  - own-faction `capability_profile` when player is HRHB (documented exception, narrow scope)
  - all diplomatic, alliance, patron, and embargo data read from the `extractWarData()` snapshot
- forbidden in `DiplomacyModal`:
  - direct reads of `gameState.political.political_controllers` or any other `political.*` operational data
  - direct reads of `gameState.military.*`
  - import of `operational_sitrep_views.ts` or `command_briefing_views.ts` (diplomacy modal is not an operational briefing)
  - expanding the HRHB capability exception to other factions or other raw-state fields

### Snapshot contract extension

`WarDataSnapshot` gained one new field:

```
observedEnemyTerritoryPct: Partial<Record<FactionId, number>>
```

Semantics: each faction's share of total `political_controllers` OSIDs, as a fraction in [0, 1]. Tier 2 — publicly observable; no fog guard needed. Computed by the new `extractObservedTerritoryPct()` sub-extractor and wired into the `extractWarData()` return. The field is available to all modal consumers that call `extractWarData()`.

### Accepted ownership line

- `DiplomacyModal`
  - diplomatic shell over player-safe snapshot facts and own-faction patron/alliance/embargo data
  - reads ONLY from `extractWarData()` snapshot (plus three documented meta/entry-point exceptions)
  - does not own operational alert truth
  - does not compete with the canonical packet
  - HRHB capability section reads own-faction `capability_profile` directly — single documented exception, bounded by player-faction guard
- `getOperationalSitrepView()` / `getCommandBriefingView()`
  - canonical packet owners
  - intentionally NOT consumed by `DiplomacyModal` (diplomacy is not an operational briefing)

## Implementation

### Seam 1 closed — W5 territory read

**`src/ui/warroom/data/war_data_extractor.ts`**

- Added `observedEnemyTerritoryPct: Partial<Record<FactionId, number>>` field to the `WarDataSnapshot` interface, with a JSDoc comment explaining the Tier 2 public-visibility rationale.
- Added `extractObservedTerritoryPct(state: GameState)` sub-extractor: iterates `political_controllers`, counts OSIDs per faction, divides by total count, returns a sorted fraction map. Returns `{}` when `political_controllers` is absent or empty. Sorted via the module-local `sc()` comparator for determinism.
- Wired `extractObservedTerritoryPct(gameState)` into the `extractWarData()` return as `observedEnemyTerritoryPct`.

**`src/ui/warroom/components/DiplomacyModal.ts`**

- `renderWashingtonTracker()`: removed the direct `political_controllers` loop (5 lines of raw-state access). Replaced with a single read from the snapshot:
  ```ts
  const rsFraction = snap.observedEnemyTerritoryPct['RS'] ?? 0;
  const rsTerrPct = rsFraction * 100;
  ```
  The W5 condition logic (`w5Met`, `w5Detail`) and the `conditionRow()` call are unchanged — only the data source changed.

### Seam 2 documented — HRHB capability exception

**`src/ui/warroom/components/DiplomacyModal.ts`**

- Added an explicit boundary-exception comment immediately above the `capability_profile` read in `renderHRHB()`:

  > BOUNDARY EXCEPTION: reads own-faction capability profile directly from gameState.
  > Intentional: player is HRHB at this branch, so no cross-faction visibility;
  > capability_profile is not part of the WarDataSnapshot contract.
  > Do not expand this exception to other factions or other raw-state fields.

### Class-level boundary comment added

**`src/ui/warroom/components/DiplomacyModal.ts`**

Added `DATA BOUNDARY:` comment at the class level documenting the full permitted-read contract:

> DATA BOUNDARY: extractWarData() is the primary data source for this file.
> Direct gameState reads are permitted ONLY for:
>   - meta.* fields (turn, phase — not operational data)
>   - getPlayerFaction() and extractWarData() entry points
>   - HRHB capability_profile (own-faction only when player is HRHB — see comment in renderHRHB)
> This file must NOT import from operational_sitrep_views.ts or command_briefing_views.ts.

## Tests

- `tests/diplomacy_modal_boundary.test.ts` — 7 new tests:
  1. **Boundary comment present** — source contains `DATA BOUNDARY: extractWarData() is the primary data source for this file.` and the import prohibition text.
  2. **No competing operational imports** — source does not import from `operational_sitrep_views` or `command_briefing_views`.
  3. **W5 seam closed** — source does not contain `political.political_controllers` (the direct bypass pattern).
  4. **HRHB exception documented with "do not expand" guard** — source contains both the `BOUNDARY EXCEPTION:` explanation and the `Do not expand this exception` phrase.
  5. **Functional render (RBiH)** — `new DiplomacyModal(makeState()).render()` does not crash, returns a defined DOM element with non-empty innerHTML.
  6. **Snapshot field correct fractions** — `extractWarData()` on a 4-OSID test state (2 RS, 1 RBiH, 1 HRHB) returns `observedEnemyTerritoryPct` with RS≈0.5, RBiH≈0.25, HRHB≈0.25.
  7. **Empty controllers → empty map** — `extractWarData()` with `political_controllers: {}` returns `observedEnemyTerritoryPct` as `{}` (graceful null path).

## Verification

### Full suite

- `npx.cmd tsc --noEmit`: clean — zero errors
- `npm.cmd run test:vitest`: 213 suites, 2980 tests — all pass
- `npm.cmd run desktop:map:build`: clean — no new warnings

### Behavioral evidence

- `DiplomacyModal.renderWashingtonTracker()` reads RS territory exclusively from `snap.observedEnemyTerritoryPct['RS']`; no `political_controllers` loop remains in the file
- `DiplomacyModal.renderHRHB()` HRHB capability read has an explicit boundary-exception comment with "do not expand" guard
- Class-level `DATA BOUNDARY:` comment present and complete
- `WarDataSnapshot.observedEnemyTerritoryPct` field correctly populated for any game state with non-empty `political_controllers`
- No import of `operational_sitrep_views.ts` or `command_briefing_views.ts` anywhere in `DiplomacyModal.ts`

## Residual drift

Minimal. The only remaining direct `gameState` accesses in `DiplomacyModal.ts` outside of `extractWarData()` are:

- `this.gameState.meta.war_start_turn` in `renderCeasefireTracker()` — used for war-duration arithmetic (C1 condition); this is a meta timeline field, not operational data; it follows the same `meta.*` permission granted by the boundary comment
- `this.gameState.meta.phase` via `getPlayerFaction()` — player-safe entry point
- `this.gameState` passed into `extractWarData()` — the sole permitted raw-state entry point
- `this.gameState.factions.find(f => f.id === 'HRHB')?.capability_profile` in `renderHRHB()` — documented exception, bounded by player-faction guard

None of these constitute a boundary violation. The `meta.war_start_turn` read could theoretically be added to `WarDataSnapshot` in a future pass, but the benefit is marginal — it is clearly non-operational timeline metadata and its direct use here follows an established pattern already accepted for `meta.phase` and `meta.turn` across the codebase.

All Warroom surfaces are now either formally bounded by snapshot-first rules or have their exceptions explicitly documented. The boundary comment in each file makes the invariant readable to future engineers without requiring them to reconstruct the architecture from history.

---

## Integration notes

The following entries are copy-paste ready for the architect's use. This parallel lane cannot edit those files directly.

---

### PROJECT_LEDGER.md entry

```
## 2026-04-07 — Commander Explanation Surfaces Phase 5: DiplomacyModal Boundary Audit and Narrowing

**Lane**: Bounded hardening — no gameplay change, no calibration effect.

Audited `DiplomacyModal` against the `extractWarData()` boundary rule established in Phases 3–4.
Found and closed one active seam (W5 territory read): `renderWashingtonTracker()` looped
`political_controllers` directly to compute RS territory fraction, bypassing the player-safe layer.
Fix: added `observedEnemyTerritoryPct: Partial<Record<FactionId, number>>` to `WarDataSnapshot` and
a new `extractObservedTerritoryPct()` sub-extractor in `war_data_extractor.ts`; replaced the direct
loop with `snap.observedEnemyTerritoryPct['RS'] ?? 0`.

Documented the accepted HRHB capability exception: `renderHRHB()` reads `capability_profile`
directly (own-faction only, not in snapshot contract) — now annotated with explicit reasoning and a
"do not expand" guard phrase. Class-level `DATA BOUNDARY:` comment added formalising the
permitted-read contract for the file.

7 new boundary tests in `tests/diplomacy_modal_boundary.test.ts` covering: structural invariants
(comment present, no competing imports, W5 seam absent), HRHB exception guard, functional render
(RBiH), snapshot fraction correctness (RS=0.5, RBiH=0.25, HRHB=0.25 from 4-OSID state), and
graceful empty-controllers path. Verification: tsc clean, 2980 vitest pass, desktop:map:build clean.

All Warroom surfaces are now formally bounded or have exceptions explicitly documented.

Report: `docs/40_reports/implemented/20260407_V08TO09_DIPLOMACY_MODAL_BOUNDARY_AUDIT.md`
```

---

### MASTER_ROADMAP.md mark-done line

Locate the Commander Explanation Surfaces section. Mark Phase 5 as complete:

```
- [x] Phase 5 — DiplomacyModal Boundary Audit and Narrowing (2026-04-07): W5 seam closed; observedEnemyTerritoryPct added to snapshot; HRHB exception documented; boundary comment; 7 tests
```

---

### architect_notes.md board note

```
## DiplomacyModal boundary — CLOSED (2026-04-07)

DiplomacyModal audit complete. One active seam found and closed: W5 territory loop in
renderWashingtonTracker() read political_controllers directly — replaced with
snap.observedEnemyTerritoryPct from the new extractObservedTerritoryPct() sub-extractor.
HRHB capability exception documented with explicit reasoning and "do not expand" guard.
Class-level DATA BOUNDARY: comment formalises the permitted-read contract.

All Warroom surfaces (FactionOverviewPanel, ReportsModal, MagazineModal, DiplomacyModal) are now
either snapshot-first with documented exceptions or replaced with stubs. The boundary rule is
uniform: extractWarData() is the sole data entry point for live data across the Warroom layer.

WarDataSnapshot.observedEnemyTerritoryPct is now available to all modal consumers as a Tier 2
publicly-observable territory fraction map. It can be consumed by any future surface that needs
faction territory percentages without adding new raw-state reads.
```
