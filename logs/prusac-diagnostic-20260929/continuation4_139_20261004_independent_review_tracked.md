# Continuation 4 n40 independent review

Date: 2026-10-04
Reviewer: independent Codex review (canon, determinism, and scenario-harness lenses)
Source: clean `fe828b9e0222a80238dbe60c22391fae53c48039`
Run: `runs/apr1992_definitive_188w__0b1f040ff4abe835__w139_n40`

## Verdict

**GO for the bounded measurement and STOP diagnosis only.** The retained n40 artifacts establish the 737th's ordinary dispatcher eligibility and first handled branch at completed weeks 137, 138, and 139. They support stopping without a route-selector correction or another run.

**NO-GO for broader causality or acceptance claims.** This evidence does not establish the original dirty n37 cause, the historical target-loss cause, the 517th cause, same-turn authorship of the later Udurlije movement order, whole-state/debug neutrality, full-state equivalence, 188-week calibration acceptance, baseline adoption, merge, or release readiness.

The original literal prelaunch criterion requiring the full 31-row 188-week manifest/digest and an explicit `initial_save.meta.player_faction: null` remains **failed as written**. The source-backed protocol audit explains why that criterion was inapplicable to a 139-week horizon; it does not waive, silently rewrite, or claim satisfaction of the recorded criterion.

## Findings

### 1. The measured dispatcher branch is complete and internally consistent

- Runner exit: `0`; strict coverage exit: `0`; protocol audit exit: `0`; corrected temporal-alignment audit exit: `0`.
- The strict consumer found 900 serialized ordinary-pass dispatcher receipts, the requested 737th at all three boundaries 137/138/139, and zero receipt inconsistencies. See `continuation4_139_20261004_coverage.stdout.log` and `.exit.txt`.
- At each completed boundary, `arbih_737th_muslim_light` is an active RBiH brigade at `op:busovaca:gornja_rovna`, in balanced `arbih_3rd_corps`, eligible for the ordinary `bot_dispatcher` pass, with no assigned sector role, active operation/axis/objective, preexisting or persistent movement destination, or transit state. Its first handler is `offensive`; pre-cap, final generated, and serialized snapshot outputs all contain `dig_in` and no attack, movement, or column destination.
- Source agrees with that narrow interpretation. The dispatcher evaluates `offensive` before `front_coverage` and `interior_movement` (`src/sim/combat/bot_brigade_ai_osid.ts:828-843`). `evaluateOffensive` returns true for an offensive/balanced non-operation brigade with at least one adjacent enemy and emits `dig_in` when cohesion is at least 40 (`src/sim/combat/bot_brigade_eval_attack.ts:849-872`). Therefore the generic interior-routing evaluator was not reached in the measured ordinary pass. The adjacent-enemy and cohesion conditions are inferred from the sole source branch that can produce this receipt; their identifiers and raw values were not serialized.
- `final_generated_output` is captured after per-corps generation/capping (`src/sim/combat/bot_brigade_ai_osid.ts:995-1011`), while `snapshot_output` is projected from the later state/report snapshot (`src/scenario/combat_causality.ts:188-204`). This review does not elevate `final_generated_output` into a claim about every later aggregate or reconciliation writer.

### 2. The later Udurlije movement state is observed, but its writer is not identified

- Correct temporal alignment shows post-turn movement destinations of null at completed 137 and `op:bugojno:udurlije` at completed 138 and 139, while the ordinary dispatcher snapshot remains no-movement at all three boundaries.
- A later writer is plausible: the production pipeline runs reconciliation after the main war steps (`src/sim/turn_phases/war_phases.ts:4347`), and `final-distribute-brigades-to-front` can issue column orders (`src/sim/turn_phases/war_phase_reconciliation_steps.ts:170-180`; `src/sim/combat/brigade_front_distribution.ts:943-951`). The evidence does not capture the exact emitting branch or its inputs, so this is a bounded source hypothesis, not an attribution.
- The observation closes the stated missing-branch question: the 737th did not fall through to ordinary interior routing at 137-139. It does not explain the historical loss of Varošluk or establish the original n37 selector predicate.

### 3. Prefix control and reached-checkpoint evidence is stable within its declared scope

- The retained comparison reports 173 ordered control events with zero differences; all 139 weekly control-count/controller maps and reconstructed territory states also have zero differences.
- Reached checkpoints only are compared: week 39 and week 104 both remain 707/712, with identical matching-OSID sets and zero controller differences on the 712 reference OSIDs. Protected controls through week 104 have zero differences.
- The n40 run summary reports 24 anomalies: 0 critical, 3 warning, and 21 informational. The runner stderr separately contains two `UNRESOLVED hrhb_travnik_brigade` assignment lines; these are preserved diagnostics and are not equivalent to critical simulation anomalies.
- This is a prefix comparison. Weeks 156 and 188 were not reached, and the n40 terminal April 1995 reference is not compared to n39's terminal October 1995 score. No calibration-acceptance conclusion follows.

### 4. The original broad audit exit 1 is preserved and correctly diagnosed

- `continuation4_139_20261004_audit.stdout.json` and `.exit.txt` remain the immutable first audit result (exit `1`, SHA-256 recorded by the supplemental artifact). Its sole missing-data finding incorrectly treated temporal `week_index` as the completed boundary.
- Source shows the runner passes the zero-based loop index into the temporal emitter, which separately records post-turn `state.meta.turn`; the weekly report records that same post-turn turn as its `week_index` (`src/scenario/scenario_runner.ts:2615,3144`; `src/scenario/brigade_temporal_emit.ts:171,198`; `src/scenario/scenario_reporting.ts:257`).
- `continuation4_139_20261004_audit_corrected.stdout.json` records `PASS_TARGETED_TEMPORAL_ALIGNMENT_CORRECTION`, binds the unchanged weekly and temporal artifact hashes, aligns raw loop 136/137/138 to completed 137/138/139, and exits `0`. It reuses the raw audit's zero-difference comparisons; it does not rerun or replace the original audit.

### 5. The protocol diagnosis is source-supported, while the recorded literal criterion remains unmet

- The original provenance guard exits `1` and records its hardcoded `input_count: 31`; it also expected an explicit neutral-player property. Preserve that failure in `continuation4_139_20261004_provenance.json` and `.exit.txt`.
- Production provenance derives painted-control inputs from the checkpoints actually reached and the effective terminal scoring reference (`src/scenario/run_provenance.ts:17-30,418-438`; `src/scenario/scenario_runner.ts:757-762,2288-2299`). At 139 weeks, the actual set contains 30 rows: the common 30 normalized hashes match n39/current source, the recomputed digest equals `ed7fa30986392451f797708a5a0fe9d3ac83f284692be04e199305c533a1f0b6`, and only the unreached `painted_control_oct1995.json` row is absent relative to the full 188-week set.
- The initial-save SHA-256 is `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`, equal to n39. Both initial and final state intentionally omit `player_faction` while setting `headless_scenario_auto_control: true`; the harness source explicitly preserves undefined as the faction-neutral default and consumers use the nullish predicate (`src/scenario/scenario_runner.ts:1640-1664`).
- These facts establish normalized source consistency for the actual 139-week run. They do not satisfy the literal full-31-row/full-188 digest criterion recorded in `continuation4_139_20261004_started.json`, and they do not prove the provenance set complete beyond its documented scope.

## Canon and determinism disposition

- No gameplay, data, save-schema, launcher, consumer, test, campaign, replay, help, process, or Git change is proposed by this review.
- The observed `offensive` handler matches the ops-only attack doctrine: the brigade emits a defensive posture and no independent attack. This is consistent with Engine Invariants §6.3 and the code-facing canonical pipeline identified in `docs/20_engineering/CODE_CANON.md`.
- Receipt arrays, manifest paths, and comparison outputs use deterministic source ordering and stable hashes. No timestamp, random input, unstable iteration, or serialized-derived-state change was introduced. This is consistent with `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` and the determinism contract in `docs/20_engineering/CODE_CANON.md`.
- Output-format change: none in this review. The reviewed dispatcher field remains opt-in diagnostic evidence prepared and validated before n40.

## Residual gates

The following remain open and are not retired by this review:

- original dirty n37 cause and exact historical selector/launch predicate;
- exact later writer and predicates for the 737th's Udurlije column destination;
- original 517th cause;
- full-state/default-campaign neutrality and replay equivalence;
- all post-139 operation, protected-control, town, belt, Jajce, lost-match, Farz, and 188-week acceptance results;
- full-suite, baseline adoption, merge, release, or another campaign authorization.

No additional run or correction is warranted by the bounded evidence reviewed here.
