# RBiH-HRHB Phase B Status Delta

Date: 2026-05-17
Lane: RBiH-HRHB Alliance Breakdown Phases B/C independent implementation

## Task 0 Delta

| Sub-task | Legacy plan scope | Status | Evidence | Remaining |
|---|---|---|---|---|
| B1 refugee pressure | New formula term, mixed-municipality list, ratio scaling | Shipped | `src/sim/early_war/alliance_update.ts:38` defines `REFUGEE_PRESSURE_MUNICIPALITIES`; `src/sim/early_war/alliance_update.ts:264` calls `computeRefugeePressure`; `src/sim/early_war/alliance_update.ts:324` implements it. | Verification only: pressure should affect alliance updates before earliest-turn floor. |
| B2 territorial incidents | Detect bilateral capture or mixed-municipality recapture from RS and add `TERRITORIAL_INCIDENT_PENALTY` | Missing | `rg territorial_incident src tests docs` finds only the legacy plan and current Phase B/C plan. `AllianceUpdateReport.drivers` has `incident_penalty` and `refugee_pressure`, but no territorial penalty. | Implement B2 in `alliance_update.ts`, phase wiring, state schema, and focused tests. |
| B3 Phase II flip count | Phase-II bilateral flip count step | Shipped | `src/sim/turn_phases/war_phases.ts:1996` invokes `countBilateralFlips`; `src/sim/turn_phases/early_war_phases.ts:267` invokes the same counter for the early-war path. | Verification only. |
| B4 Phase 0 handoff | Map `phase0_relationships.rbih_hrhb` into the initial war alliance value | Partial / missing transition consumer | `src/state/game_state.ts:2241` defines `phase0_relationships`; `src/state/game_state.ts:2223` defines current `political.war_alliance_rbih_hrhb`. Grep shows legacy `phase_i_alliance_rbih_hrhb` only in archived/generated fixture data. `src/sim/turn_pipeline.ts:39-41` currently rejects non-`war` phases, so the old Phase 0 to Phase I transition site is not present in the live war runner. | Add the mapping helper and a narrowly gated handoff on first war tick when `phase0_relationships.rbih_hrhb` exists and the live alliance value is still unset/default. |

## Field Drift

The legacy plan's `phase_i_alliance_rbih_hrhb` field has migrated. Live state uses `political.war_alliance_rbih_hrhb`; old `phase_i_alliance_rbih_hrhb` references are archived or generated historical fixtures, not the active schema.

## Stop Gate Assessment

Task 0 does not reveal Phase B as more shipped than the plan assumes: B2 remains absent, and B4 has no active consumer for `phase0_relationships.rbih_hrhb`. Proceeding to Task 1 and Task 2 is authorized by the 2026-05-17 handoff, with sensitive-history gates still active for later scenario probes.

## Task 1-2 Implementation Delta

Task 1 B2 territorial competition incidents:
- Added `TERRITORIAL_INCIDENT_PENALTY = 0.02` and `MIXED_MUN_RS_RECAPTURE_PARTIAL = 0.5` in `src/sim/early_war/alliance_update.ts`.
- Added deterministic `countTerritorialIncidents(...)`, sorting by municipality/from/to and recording weighted `rbih_hrhb_state.territorial_incidents_this_turn`.
- Extended `AllianceUpdateReport.drivers` with `territorial_penalty` and applied it with the same one-turn delay as bilateral flip penalties.
- Wired the tally next to existing bilateral flip counters in `src/sim/turn_phases/early_war_phases.ts` and `src/sim/turn_phases/war_phases.ts`.

Task 2 B4 Phase 0 handoff:
- Added `mapPhase0RelationshipToAlliance(...)` with the plan formula and clamps.
- `ensureRbihHrhbState(...)` now derives the initial `political.war_alliance_rbih_hrhb` from `phase0_relationships.rbih_hrhb` only when no live alliance value already exists. Existing Apr 1992 starts without Phase 0 relationship data keep `DEFAULT_INIT_ALLIANCE`.

Task 6 C1 bilateral front edges:
- Added verification coverage for canonical and OSID front-edge generation. Current code already emits RBiH-HRHB front edges when alliance is at or below `ALLIED_THRESHOLD` after `rbih_hrhb_war_earliest_turn`, including the mobilization interval; no production change was required.

## Verification

Commands run:
- `npx.cmd vitest run tests\alliance_territorial_incidents.test.ts tests\alliance_phase0_handoff.test.ts` — PASS, 10/10 tests.
- `npx.cmd vitest run tests\alliance_lifecycle.test.ts tests\alliance_mobilization.test.ts` — PASS, 52/52 tests.
- `npx.cmd vitest run tests\alliance_territorial_incidents.test.ts tests\alliance_phase0_handoff.test.ts tests\bilateral_front_edges.test.ts` — PASS, 14/14 tests.
- `git diff --check` — PASS for whitespace; Git emitted CRLF conversion warnings only.

Blocked verification:
- `npm.cmd run typecheck` — BLOCKED by unrelated existing errors outside this lane:
  - `src/sim/combat/corps_operation_readiness.ts:482`: `Cannot find name 'factionPoolPressure'`.
  - `tests/bot_supply_awareness_target_scoring.test.ts`: missing exports `computeEnemySupplyTargetScoreMultiplier` and `computeOwnSupplyDefensePriorityMultiplier` from `bot_corps_directives.js`.
- `npm.cmd run sim:scenario:run:40w` — BLOCKED by the same unrelated readiness error. Run directory: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1857`; failure: `ReferenceError: factionPoolPressure is not defined` at `src/sim/combat/corps_operation_readiness.ts:482`.

## Hashes And Stop Gates

- Focused tests do not produce scenario hashes.
- 40w scenario hash was not produced because the run failed before completion on an unrelated readiness reference error.
- 188w probe was not run because the 40w/typecheck blocker is shared and outside this lane.
- Sensitive-history gate did not trip in focused tests. No Ahmici, Stupni Do, Grabovica, or Uzdol outcome evidence changed because scenario probes did not complete.
