# Logistics Priority Wire-or-Remove Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the partially-wired Logistics Priority lever into a deterministic, capped, end-to-end command surface that visibly biases formation supply consumers (fatigue, attack resolution, combat predictor) without introducing a global multiplier or shifting calibration when the player leaves it at default.

**Architecture:** The lever is *already* canonically defined on `MilitaryState.logistics_priority` and partially read by `formation_fatigue.ts`. The bug is split across (a) an IPC handler that writes to the wrong path (top-level `state.logistics_priority`, dropping the value on serialization), (b) two combat consumers (`attack_resolution_osid.getSupplyMult`, `combat_predictor.getSupplyMult` → both delegate to `combat_math.getSupplyMult`) that ignore the lever entirely, and (c) a stale IPC contract doc. Fix the write path first, then thread the lever through a shared deterministic helper with cap `[0.5, 1.5]`, default `1.0`. Removal is rejected — the lever is a documented player command surface.

**Tech Stack:** TypeScript simulation core, Vitest, Electron IPC (`src/desktop/electron-main.cjs`), scenario runner artifacts.

---

## Scope

This supersedes the deleted logistics-priority sim-wiring stub. Resolve the active 40w calibration baseline at execution time from `docs/plans/MASTER_ROADMAP.md` and `docs/40_reports/CALIBRATION_MASTER.md`.

In scope:
- Red test proving zero-effect today via wrong IPC path.
- IPC handler write target correction to canonical `state.military.logistics_priority`.
- Extension of the lever into `attack_resolution_osid.getSupplyMult` and `combat_predictor.getSupplyMult` (both call `combat_math.getSupplyMult`) via one shared deterministic helper.
- Cap clamp `[0.5, 1.5]` enforced in the helper; default `1.0` byte-stable.
- Determinism guard: 40w hash stability when no priority is staged.
- UI feedback: Decision Room tooltip reflects the effective clamp.
- IPC contract reconciliation in `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` (lines 96–99).
- Schema JSDoc for `MilitaryState.logistics_priority` (`src/state/game_state.ts:1866`).
- Coordination note (not implementation) for save-migration default promotion.

Out of scope:
- Embargo modeling (separate plan).
- Full supply spec gap closure — see `docs/plans/2026-05-17-supply-design-completion-plan.md`.
- Dev tooling write sites in `tools/dev_runner/server.ts` and `tools/dev_viewer/viewer.js` — flagged in stop gate, deferred.
- Any change to the `adequate`/`strained`/`critical` supply state ladder constants (`1.0` / `0.75` / `0.45–0.5`) — lever multiplies AFTER those.
- Adding new priority "modes" beyond the existing `Record<FactionId, Record<edgeId, number>>` shape.

## Task 1: Red Test — Prove Zero-Effect Today

**Files:**
- Create: `tests/logistics_priority_wiring_red.test.ts`
- Inspect: `src/sim/combat/combat_math.ts` (lines 845–875 — `getSupplyMult`)
- Inspect: `src/state/formation_fatigue.ts` (lines 200–245)

**Steps:**
1. Construct a minimal GameState fixture with one ARBiH formation assigned to a single edge and `supplyStateByOsid` declaring `adequate` for its OSID (so `getSupplyMult` returns `1.0` before any priority lever).
2. Assertion A: write priority `1.5` to **top-level** `state.logistics_priority[faction][edgeId]` (current IPC behavior). Call `attack_resolution_osid.getSupplyMult` (via `combat_math.getSupplyMult`). Expect `1.0` — proves dropped-on-the-floor bug.
3. Assertion B: write priority `1.5` to canonical `state.military.logistics_priority[faction][edgeId]`. Call the same. Expect `1.0` today — proves combat consumers ignore the lever entirely.
4. Assertion C: same canonical write, call `getFormationSupplyMultiplier` in `formation_fatigue.ts`. Expect `1.5` — proves the existing partial wiring still works.
5. Run `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts` and confirm the three assertions land as documented (B will flip GREEN in Task 3).

**Acceptance:** All three assertions match the documented expected-today values. The test file remains in the suite as a regression contract; Assertion B's expected value updates in Task 3.

## Task 2: Fix IPC Write Path

**Files:**
- Modify: `src/desktop/electron-main.cjs` (lines 2012–2035 — `stage-logistics-priority` handler)
- Test: `tests/logistics_priority_ipc_path.test.ts` (new)

**Steps:**
1. Add a focused IPC-shape test that round-trips a `stage-logistics-priority` payload `{ faction, sectorId, priority }` through serialize → deserialize and asserts the value lands at `state.military.logistics_priority[faction][edgeId]` for every `sector.edge_ids` entry.
2. Edit the handler: replace every `state.logistics_priority` reference with `state.military.logistics_priority`. Preserve the existing initialization guards (`if (!state.military.logistics_priority) state.military.logistics_priority = {};`).
3. Do NOT change the payload shape — that requires UI coordination and is handled by Task 7's contract doc reconciliation.
4. Rerun the focused test.

**Acceptance:** IPC handler writes only to canonical path; round-trip test passes. No top-level `state.logistics_priority` writes remain in `src/desktop/`.

## Task 3: Thread Lever Through Combat Consumers

**Files:**
- Modify: `src/sim/combat/combat_math.ts` (lines 845–875 — `getSupplyMult`)
- Create: shared helper `applyLogisticsPriorityClamp(base: number, state: GameState, formation: FormationState): number` co-located in `combat_math.ts` (no new file — keep ownership co-located with the consumer).
- Inspect: `src/sim/combat/attack_resolution_osid.ts` (line 84 — re-exports `getSupplyMult`)
- Inspect: `src/sim/combat/combat_predictor.ts` (calls flow through `computeAttackerPower` → `combat_math.getSupplyMult`)
- Test: extend `tests/logistics_priority_wiring_red.test.ts` Assertion B → expect `1.5` after wiring.

**Steps:**
1. Add `applyLogisticsPriorityClamp` to `combat_math.ts`. Read `state.military.logistics_priority?.[factionId]`. Derive the edge-or-region key from the formation's `assignment` exactly the way `formation_fatigue.ts:214–240` already does. **Singular ownership rule**: extract the lookup into one exported helper (`lookupLogisticsPriority(state, formation, frontRegions)` co-located in `combat_math.ts`) and refactor `formation_fatigue.getFormationSupplyMultiplier` to consume that helper so there is exactly one reader of the canonical path. Do not duplicate the `edge`/`region`/min-priority branches across two files.
2. Clamp the looked-up value to `[0.5, 1.5]` using `Math.max(0.5, Math.min(1.5, value))`. If the value is absent or `<= 0`, return `1.0` (default).
3. In `getSupplyMult`, multiply the existing return value (`1.0`, `0.75`, `0.45`, `0.5`, `0.4`) by the clamped priority **at the end** — after the supply-state branch and after the `last_supplied_turn` fallback branch. Apply to both `attack` and `defend` modes.
4. Verify both consumers automatically pick up the change because they import `getSupplyMult` from `combat_math` directly. Confirm via Grep that no consumer reaches into the helper internals.
5. Rerun Task 1's red test; Assertion B flips to `1.5`. Assertion C remains `1.5` (no regression in `formation_fatigue.ts`).
6. Add a clamp-edge test: priority `0.1` clamps to `0.5`; priority `5.0` clamps to `1.5`; priority `1.0` (default) returns `base` unchanged byte-stable.

**Acceptance:** `getSupplyMult` returns `base × clamp(priority, 0.5, 1.5)` for all four code paths. Clamp edge test passes. No new global multiplier — effect is keyed per-faction-per-edge.

## Task 4: Determinism Guard — 40w Hash Stability at Default

**Files:**
- Verification only — no source edits expected.
- Run: `npm.cmd run sim:scenario:run:40w` against current HEAD.

**Steps:**
1. Capture the pre-change 40w hash from the active baseline recorded in `MASTER_ROADMAP.md` / `CALIBRATION_MASTER.md` at execution time.
2. After Task 3 lands, rerun `npm.cmd run sim:scenario:run:40w`. Default priority is `1.0` everywhere (lever never staged in calibration scenario) → clamp returns `1.0` → multiplication is identity.
3. Assert the new hash equals the captured pre-change active baseline byte-for-byte. If it does not, debug rounding or branch ordering in Task 3 before proceeding.
4. Manual deterministic-shift sanity: in a separate disposable run (not committed), stage `1.5` for one faction-edge and confirm the hash *changes* and the anchor table shifts in a defensible direction.

**Acceptance:** Default-priority 40w hash byte-identical to the captured active baseline. Any non-default value produces a deterministic hash delta. If hash drifts at default, STOP and escalate per stop gate.

## Task 5: UI Feedback — Decision Room Tooltip

**Files:**
- Inspect: `src/ui/map/components/CorpsFrontPanel.tsx`
- Modify: tooltip/label text for the logistics priority control to reflect the clamp `[0.5, 1.5]` and a one-line "what it does" string ("biases per-edge supply between `0.5×` starvation and `1.5×` saturation; default `1.0` neutral").
- Inspect: `src/ui/map/data/GameStateAdapter.ts` and `src/ui/map/data/types.ts` to confirm the adapter already reads from the canonical path; if not, add the read.

**Steps:**
1. Audit the adapter: if it currently reads from a stale top-level path, update to `state.military.logistics_priority`. (Likely already correct — verify before editing.)
2. Update tooltip copy with clamp range and effect description.
3. No new component, no new modal — tooltip and label only (per UI/UX rule: mandatory consultation before any new component, not just copy updates).

**Acceptance:** Tooltip shows current effective clamp; staging `1.5` displays the new effective multiplier; default shows `1.0× (neutral)`.

## Task 6: Save Migration Coordination Note

**Files:**
- Inspect: existing save migration registry (locate via Grep for `registerMigration`).
- Modify: comment-only addition pointing at the sibling save-migration plan; do NOT add a migration here.

**Steps:**
1. Confirm `MilitaryState.logistics_priority` is already optional (it is — see schema line 1866).
2. Old saves with no field, or saves that have the now-orphaned top-level `state.logistics_priority`, must be handled by the sibling save-migration plan. Coordinate by leaving a single line in the migration plan's "incoming items" section referencing this plan.
3. Do not touch the migration registry in this lane.

**Acceptance:** No migration code added here; sibling plan acknowledges the orphan top-level field.

## Task 7: IPC Contract Doc Reconciliation

**Files:**
- Modify: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` (lines 96–99)

**Steps:**
1. Replace the stale `{ corpsId, priority: 'balanced' | 'sustain_operations' | … }` documentation with the actual payload shape `{ faction: FactionId, sectorId: string, priority: number }` and document the clamp.
2. Document the canonical write target: `state.military.logistics_priority[faction][edgeId]` for every edge in `corps_front_sectors[sectorId].edge_ids`.
3. Add a one-line note that priority is clamped to `[0.5, 1.5]` and that `1.0` is byte-stable default.

**Acceptance:** Contract doc matches handler implementation byte-for-byte on payload shape, write target, and clamp.

## Task 8: Schema JSDoc Hygiene

**Files:**
- Modify: `src/state/game_state.ts` (line 1866)

**Steps:**
1. Add canonical JSDoc above `logistics_priority`:
   - What it is (per-faction-per-edge supply bias).
   - Range and default (`[0.5, 1.5]`, default `1.0`).
   - Who writes (Decision Room IPC `stage-logistics-priority`).
   - Who reads (`formation_fatigue.getFormationSupplyMultiplier`, `combat_math.getSupplyMult` via `applyLogisticsPriorityClamp`).
2. Match the style of neighboring fields (lines 1860–1865).

**Acceptance:** Field has parity with neighbors. Grep confirms exactly one definition.

## Verification

Run, in order:

- `npx.cmd tsc --noEmit`
- `npx.cmd vitest run tests\logistics_priority_wiring_red.test.ts tests\logistics_priority_ipc_path.test.ts`
- `npm.cmd run test:vitest`
- `npm.cmd run sim:scenario:run:40w`
- Compare new 40w hash to the captured pre-change active baseline — must match byte-for-byte at default priority.
- `npm.cmd run desktop:map:build`

Acceptance table per task: `task | files_touched | tests_passing | hash_delta_at_default | hash_delta_at_priority_1.5`.

## Docs and Ledger

Update on landing (not in this lane — separate finishing-a-development-branch step):
- `docs/40_reports/implemented/YYYYMMDD_LOGISTICS_PRIORITY_WIRED.md` (new)
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` (Task 7)
- `docs/plans/MASTER_ROADMAP.md` (lever now WIRED, not partially)
- `docs/PROJECT_LEDGER.md` (behavioral change: combat consumers now see lever)
- Do NOT touch `docs/10_canon/FORAWWV.md` — flag for manual review if any wording change is needed there.

## Determinism Statement

This lane is byte-stable at default priority (clamp returns `1.0`, multiplication is identity). Any 40w hash drift at default priority indicates a rounding-order regression in `getSupplyMult` and is a hard stop. Non-default priority produces a deterministic, edge-keyed hash delta — never a global multiplier. No `Math.random`, no `Date.now`, no unsorted iteration introduced. The `applyLogisticsPriorityClamp` helper reads `state.military.logistics_priority` only — never the orphan top-level path.

## Stop Gates And Closeout

- **Stop after Task 4** if the 40w hash drifts from the captured active baseline at default priority. Diagnose the rounding/branch-ordering bug before any further task.
- **Stop after Task 3** if a non-default-priority run shifts a 40w anchor by `> 0.5pp` area-weighted, flips any of the 25 anchor classifications, or breaks any of the 6 benchmarks — escalate for sign-off; the cap range may need re-debate.
- **Stop and flag** the dev tooling write sites (`tools/dev_runner/server.ts`, `tools/dev_viewer/viewer.js`) as a follow-up — they likely write to the orphan top-level path. Out of scope here.
- **Stop and flag** any discovery that the lever's UI surface (Decision Room control) is not actually reachable from the live build — coordinate with `ui-ux-developer` before adding new surface.
- Stage only: combat_math.ts, electron-main.cjs, game_state.ts, CorpsFrontPanel.tsx (tooltip only), DESKTOP_GUI_IPC_CONTRACT.md, the two new test files, and the implemented-report doc when the lane closes. Do not bundle unrelated tasks.
