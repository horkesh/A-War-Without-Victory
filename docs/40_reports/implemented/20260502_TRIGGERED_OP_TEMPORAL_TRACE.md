# LANE-2026-05-02-TRIGGERED-OP-TEMPORAL-TRACE — Codex P2 Disproves Predecessor's Queued-Order Predicate Hypothesis

**Date:** 2026-05-02
**Status:** RESOLVED — predecessor lane's named successor blocker (extend `isCommittedInTransitTo` to accept queued `brigade_movement_orders` before `in_transit` conversion) is **structurally impossible** under current pipeline ordering. Codex review P2 is correct. No engine code changed. Docs/test/diagnostic only.
**Predecessor:** `8dec8f58` IN-TRANSIT-COMBAT-POWER-CONTEXT (PARTIAL) — its closeout hypothesis is superseded by this lane's evidence.
**Verification commit:** *(this commit)*

## Lane summary

The IN-TRANSIT-COMBAT-POWER-CONTEXT lane (commit `8dec8f58`) closed PARTIAL with this named successor handoff:

> "at trigger-turn, the `prestageBrigadesForTriggeredOp` helper from `98446604` writes column-march orders, but `estimateForceRatio` runs in the same preparation sub-phase loop **before** `apply-brigade-movement` converts orders to `in_transit` state. The predicate `isCommittedInTransitTo` (status===`in_transit`) is too strict for trigger-turn evaluation — it should also accept brigades with `brigade_movement_orders[id].destination_sids` pointing at relevance set even before status transition."

Codex review P2 disputed the temporal premise: `war_phases.ts` actually orders `apply-brigade-movement` BEFORE `advance-sector-offensives` and `check-triggered-operations` AFTER, which would invert the claim and disprove the predicate-extension hypothesis.

This lane proves Codex P2 correct from turn-local pipeline evidence and explicitly retires the queued-order predicate hypothesis. The real Krivaja-95 blocker is upstream of `combat_math.ts` and upstream of `operation_preparation.ts` predicate semantics — it is brigade-roster lifecycle (destruction, deactivation, post-Stupčanica routing), not queued-order visibility at the predictor.

## Phase 1 — three-investigator audit (parallel)

### `/gameplay-programmer` — pipeline order in `src/sim/turn_phases/war_phases.ts`

| Step | Line | Reads / writes | Note |
|---|---|---|---|
| `osid-column-movement` | 618 | column-march progression | pre-conversion bookkeeping |
| **`apply-brigade-movement`** | **641** | reads `state.military.brigade_movement_orders`; writes `state.military.brigade_movement_state[bid].status='in_transit'` | converts queued orders → in_transit |
| `partition-corps-front-sectors` | 665 | rebuilds sector map | — |
| `assign-brigades-to-subsegments` | 681 | sub-segment assignment | — |
| `process-brigade-movement` | 829 | secondary movement processing (operational-data guard at 832) | skipped in operational-data runs |
| **`advance-sector-offensives`** | **875** | invokes `advanceSectorOffensives()` → per-op `tickPreparation()` (`sector_offensive.ts:674`) → **`estimateForceRatio()`** (`operation_preparation.ts:640`) | reads ops in `'planning'`; computes force-ratio gate |
| `inject-queued-operations` | 946 | injects pre-planned slot-0 ops | — |
| **`check-triggered-operations`** | **964** | invokes `checkTriggeredOperations()` (`triggered_operations.ts:717`); after acceptance calls `prestageBrigadesForTriggeredOp` (`triggered_operations.ts:793`) which writes `state.military.brigade_movement_orders[bid] = {destination_sids:[staging], stance:'column'}` (`triggered_operations.ts:705-708`); then pushes `result.op` into `primaryCmd.active_operations` (`triggered_operations.ts:797`); one-shot via `triggered_operations_accepted` set at `triggered_operations.ts:803` | acceptance + prestage + insertion happen LAST in the turn |

**Canonical same-turn order (relevant range):** `apply-brigade-movement` (L641) → `advance-sector-offensives` (L875) → `inject-queued-operations` (L946) → `check-triggered-operations` (L964).

### `/operations-expert` — trigger-turn trace for Krivaja-95 (t179)

On the trigger-fire turn, the op did not exist in `active_operations` prior to that turn. The push at `triggered_operations.ts:797` is the FIRST insertion. Therefore on t179:

- `apply-brigade-movement` (L641) runs: nothing related to Krivaja participants in `brigade_movement_orders` yet.
- `advance-sector-offensives` (L875) runs: Krivaja op is NOT in any `corps_command[*].active_operations`, so `tickPreparation` cannot iterate it. `estimateForceRatio` is never called for Krivaja on t179.
- `check-triggered-operations` (L964) runs at end-of-turn: prestage writes `brigade_movement_orders[participant]` for each named participant, then op is pushed into `active_operations`.

**First turn `estimateForceRatio` can read Krivaja: t180.** On t180, `apply-brigade-movement` (L641) runs FIRST and converts the t179-end prestage orders into `mv_state='in_transit'`. Only then does `advance-sector-offensives` (L875) run — by which time participants are already in_transit (or further along), never in raw queued-order state.

**Therefore `estimateForceRatio` will never observe a Krivaja participant in raw `brigade_movement_orders` queued state.** The predecessor's queued-order predicate hypothesis is structurally impossible to fire.

Final-save evidence at t188 (n1619, hash `4ba56cfd4fae9824`) — Krivaja roster lifecycle:

| Brigade | location_osid | mv_state / mv_order | personnel | Notes |
|---|---|---|---|---|
| `rs_1st_zvornik` | `op:zvornik:krizevici` | INACTIVE | 0 | Roster collapse pre-t179 |
| `rs_1st_bratunac` | `op:srebrenica:osmace_2` | INACTIVE | 0 | Roster collapse pre-t179 |
| `rs_skelani_battalion` | `op:srebrenica:mala_daljegosta_2` | INACTIVE | 0 | Roster collapse pre-t179 |
| `rs_1st_milii` | `op:sekovici:sekovici_2` | none / none | 2000 | Active but not at Krivaja staging `op:bratunac:bratunac_2` |
| `rs_5th_podrinje` | `op:vlasenica:sebiocina` | none / none | 1336 | Degraded by Stupčanica cascade; not at staging |

3 of 5 Krivaja participants are INACTIVE/0-personnel before Krivaja's trigger turn. The 2 surviving active participants are at non-staging OSIDs with no live movement order in the final save.

### `/scenario-harness-engineer` — deterministic diagnostic + structural test

**Available run artifacts** (`runs/apr1992_definitive_188w__210e69404d054959__w188_n1619/`):
- `weekly_report.jsonl` — per-turn aggregate counters: `column_movement` (column_starts/arrivals/blocked/advances), `movement_report` (moves_applied), `operation_diagnostics` (per-op `operation_phase`, `eligible_attacker_count`, `movement_order_count`, `attack_attempt_count`, `participating_brigades`).
- `operation_aars.json` — terminal AAR per op with `started_turn`, `ended_turn`, `outcome`, `recovery_reason`, `force_ratio_estimate`, `weekly_log[]`.
- `initial_save.json` + `final_save.json` — state snapshots only at run start and end.

**Per-turn brigade-keyed snapshots are NOT preserved.** Per-brigade temporal trace would require new write-only emission (out of scope per lane brief).

**New diagnostic:** `tools/diagnostics/triggered_op_temporal_trace.cjs <run_dir>` — read-only, deterministic (strictCompare ordering, no Math.random / Date.now / new Date / locale sort). Recovers what IS available: AAR.started_turn, AAR.ended_turn, recovery_reason, force_ratio_estimate, per-turn `column_movement` and `operation_diagnostics` rows, eligible_attacker_count trajectory.

**Sample diagnostic output (n1619):**

| Op | t_inject | t_aar_end | recovery_reason | force_ratio | planning turns | execution turns | recovery turns |
|---|---|---|---|---|---|---|---|
| Krivaja-95 | 179 | 186 | `planning_invalidated` | 0.094 | 6 | 0 | 1 |
| Stupčanica-95 | 172 | 179 | `max_failures` | 0.831 | 3 | 2 | 2 |

The two ops fail by different paths. Krivaja never enters execution; Stupčanica enters but loses 2 attacks. Krivaja's 6 consecutive planning turns at `eligible_attacker_count=0` confirm: not a queued-order visibility problem; it is a participant-counting problem driven by roster lifecycle (3 INACTIVE) and the 2 active participants drifting away from Krivaja relevance OSIDs after Stupčanica cascade.

**New structural test:** `tests/triggered_op_temporal_contract.test.ts` (5/5 GREEN) — pure synchronous assertions over the live `warPhases` export.

Asserts:
1. Required steps present in `warPhases` (`apply-brigade-movement`, `advance-sector-offensives`, `check-triggered-operations`).
2. Index of `apply-brigade-movement` < index of `advance-sector-offensives`.
3. Index of `advance-sector-offensives` < index of `check-triggered-operations`.
4. Index of `apply-brigade-movement` < index of `check-triggered-operations`.
5. Combined ordering invariant.

Test would go RED only if someone reorders the pipeline — protecting future Claude/Codex from re-positing the same superseded hypothesis. Read-only structural assertion; no synthetic GameState construction (sharper, more deterministic than state-driven simulation for this contract).

## Phase 2 — synthesis

The predecessor lane's queued-order predicate hypothesis is **structurally impossible** under current pipeline ordering. Per the lane brief: do not implement; patch report/ledger/napkin to mark the hypothesis superseded; name the evidence-backed blocker.

**Evidence-backed binding blocker for Krivaja-95:** **brigade-roster lifecycle**. Three of five named Krivaja participants are INACTIVE/0-personnel before t179. The two surviving active participants drift away from Krivaja relevance OSIDs after the Stupčanica cascade. `eligible_attacker_count=0` for 6 consecutive planning turns confirms the participant-counting failure is a roster-availability problem, not a predicate-semantics problem.

**Evidence-backed binding blocker for Stupčanica-95:** **defender combat-math stack compounding on a degraded participant pool**, already named as next-lane handoff (Phase 4d) by `docs/40_reports/implemented/20260502_DRINA_LATE_WAR_ENCLAVE_PARTIAL.md`. force_ratio 0.831, 2 attacks, max_failures. Out of this lane's scope.

**No predicate change is implementable from this evidence.** Extending `isCommittedInTransitTo` to read queued `brigade_movement_orders` would have zero effect — `estimateForceRatio` cannot observe queued orders for triggered ops within the same turn. Even the "next-turn early-window" framing fails because by then `apply-brigade-movement` has already converted the orders to `in_transit`, which is the state the existing predicate already accepts.

## Stop-gate compliance

| # | Gate | Status |
|---|---|---|
| 1 | NO `enclave_resilience.ts` | ✓ |
| 2 | NO `rupture_consequences.ts` | ✓ |
| 3 | NO `combat_math.ts` outcome formula changes | ✓ — no engine code touched |
| 4 | NO `operation_preparation.ts` predicate semantic changes | ✓ — predicate UNCHANGED |
| 5 | NO OOB JSON | ✓ |
| 6 | NO UI/Codex files | ✓ |
| 7 | NO hardcoded controller flips / painted-target reads | ✓ |
| 8 | NO `Math.random` / `Date.now` / `new Date(` / `performance.now(` | ✓ — diagnostic + test verified |
| 9 | NO faction-specific hardcode | ✓ — diagnostic accepts arbitrary `<run_dir>` and ops list is data-driven |
| 10 | NO state mutation, no movement reset | ✓ — read-only diagnostic; structural test |
| 11 | NO FORAWWV touch | ✓ |
| 12 | Determinism preserved (strictCompare, stable ordering) | ✓ |

## Sensitive-history compliance

- **No Ring 3 surface.** Read-only docs/tests/diagnostic; no engine behavior change; no rupture/enclave/OOB touch.
- **No § 6 sign-off chain required.** Lane explicitly retires a hypothesis without implementing any historical-behavior-shifting code.
- **§ 8.3 distinction (a) preserved.** This lane corrects a non-empirical claim in the predecessor's closeout; it does not lane-tune any specific historical outcome. Krivaja/Stupčanica acceptance metrics are untouched (no run executed).

`tools/diagnostics/sensitive_history_status.cjs` not re-run because no scenario was executed in this lane. Last sensitive-history verdict (n1619, predecessor): OPEN_P0 — Srebrenica capital RBiH, rupture not fired, Krivaja force_ratio 0.094 / planning_invalidated, Stupčanica force_ratio 0.831 / max_failures. **No movement attributable to this lane** — by construction, since no engine code changed.

## Hash drift class

**No hash drift.** Engine code and scenario data unchanged. Diagnostic + test are off-pipeline read-only artifacts.

## Files changed

- NEW: `tools/diagnostics/triggered_op_temporal_trace.cjs` (read-only diagnostic, ~9.5 KB)
- NEW: `tests/triggered_op_temporal_contract.test.ts` (structural test, ~8.6 KB, 5/5 GREEN)
- NEW: `docs/40_reports/implemented/20260502_TRIGGERED_OP_TEMPORAL_TRACE.md` (this report)
- PATCH: `docs/40_reports/implemented/20260502_IN_TRANSIT_COMBAT_POWER_CONTEXT.md` (mark closeout's queued-order predicate hypothesis superseded; cite this lane)
- PATCH: `docs/PROJECT_LEDGER.md` (append entry; do not rewrite predecessor entries)
- PATCH: `.claude/napkin.md` (prepend Current State; do not clobber concurrent UI lane)

## Successor handoffs (named, evidence-backed)

1. **Krivaja-95 brigade-roster repair lane** (Phase 4c per `20260502_DRINA_LATE_WAR_ENCLAVE_PARTIAL.md`). Owner: /historian + /game-designer (Sensitive-History Design Gate § 6 sign-off chain — Krivaja participant rosters are ICTY-grounded). Investigate why `rs_1st_zvornik`, `rs_1st_bratunac`, `rs_skelani_battalion` are INACTIVE/0-personnel before t179 — combat losses, dissolution, deactivation lifecycle, or model gap.
2. **Stupčanica-95 defender combat-math stack honesty lane** (Phase 4d per same predecessor). Owner: /technical-architect + /game-designer + /war-or-game. Compounding entrench × enclave × urban × forest × posture × home on degraded 275-personnel defender vs ICTY 22:1 historical dominance — own combat_math.ts ownership proof, scope spec definition (god-mode vs commander-mode).
3. **Per-turn brigade-keyed snapshot emission** (deferred by /scenario-harness-engineer this lane). Owner: /scenario-harness-engineer. If future lanes need brigade-per-turn temporal evidence, add a write-only emit (append per-turn participant snapshots to `weekly_report.jsonl` or a new `brigade_temporal_log.jsonl`) gated behind a diagnostic flag. Out of scope until a future lane proves it necessary.

## Verification

- `tests/triggered_op_temporal_contract.test.ts` 5/5 GREEN.
- `npx tsc --noEmit -p tsconfig.json` clean.
- No scenario run (no engine code changed → expected null result confirmed).
- Diagnostic output verified against n1619 AARs (Krivaja `planning_invalidated`/0.094, Stupčanica `max_failures`/0.831 match `runs/apr1992_definitive_188w__210e69404d054959__w188_n1619/operation_aars.json`).

## Cross-lane attribution

- Pipeline-order audit: /gameplay-programmer.
- Trigger-turn trace + final-save evidence: /operations-expert.
- Diagnostic + structural test design: /scenario-harness-engineer.
- Synthesis + Codex P2 verdict: /orchestrator (this lane).
