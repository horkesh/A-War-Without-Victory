# HV 1995 Engine Resolution and Evidence Harness

**Date:** 2026-08-22

**Branch:** `codex/hv-1995-timing-mobility`

**Final clean run:** `apr1992_definitive_188w__9e902ad68783fbe7__w188_n266`

**Result:** 628/712 matched OSIDs, 31/31 anchors, final hash `68fb8b09c4fd7260`; combat-calibration valid

## Summary

- The six `spawn_turn: 174` edits and both live `hv_phantom` movement admissions remain in the same tree. No movement-only tree was created or promoted.
- The engine now carries the wave through spawn and movement, resolves authored OOB aliases, admits the necessary main-staff/loaned participants, preserves authored objective order and staged axes, and lets an approved historical opportunity preempt disposable probe commitments.
- All known double-commitment paths found in this investigation are guarded: operation birth, elite-loan tick/deployment, and casualty replacement during execution.
- The permanent diagnostics make spawn, movement, roster, objective-filter, operation, battle, dependency, reference-integrity, and commitment claims falsifiable with positive controls.
- The baseline manifest was not regenerated or edited. The tracked latest-run save was restored after every 188-week run.

## Root Causes and Fixes

### Atomic timing and movement

Commit `c2333a900` couples the required turn-174 timing with admission of `hv_phantom` to the two live definitive-scenario movement executors. The earlier handoff's fallback-movement claim was corrected: the definitive OSID path uses column movement and application of brigade movement orders.

### Operation and roster truth

- Accepted reserve deployment no longer leaves stale `dig_in` state that makes the movement executor reject its order.
- A shared deterministic formation resolver prefers an exact live key and otherwise accepts exactly one `oob:<authored id>` alias; ambiguity is rejected.
- Opportunity, triggered, pre-planned, and validation paths use the same authored-ID resolution.
- Main-staff formations and valid elite loans can enter authored opportunities without becoming unloaned free riders.
- Triggered operations explicitly marked `preserve_objective_sequence` keep their authored sequence; `is_pre_planned` alone does not disable prefix pruning. Separately, mixed/staged sibling axes survive planning reconciliation.
- An approved authored opportunity may preempt participants from a live `probe`, but not from another planning/execution operation. Empty probes enter canonical recovery.

### Commitment invariants

- Operation selection and per-turn elite-loan attachment reject brigades committed to another live operation.
- `evaluateOperationProgress` formerly selected a healthy casualty replacement by excluding only the current operation's participants. A deterministic reproducer showed it selecting a brigade already committed to a second planning operation and creating `operation.participant_double_committed`. The selector now excludes every brigade returned by `findBrigadeLiveOperationAnywhere`.
- Independent review then reproduced a second path: two damaged participants could reuse the same uncommitted replacement in one pass. The selector now reserves IDs already placed in `updatedParticipants`.
- The strengthened replacement test proves the initial state is lifecycle-clean, makes the committed candidate sort first, damages two participants, expects the sole uncommitted replacement exactly once, and proves the resulting state remains lifecycle-clean.

### Permanent evidence harness

- `npm run diagnose:hv1995 -- <run-dir> --write` emits `hv_1995_lifecycle_diagnostic.json`.
- `npm run diagnose:operation-commitments -- <run-dir>` audits every weekly planning/execution membership and injects a deliberate collision as its positive control.
- `AWWV_DEBUG_REASON_CODES=objective_filter` exposes friendly-objective rejection rows only when requested. The payload is validated and deterministically sorted; the focused test proves a friendly rejection is recorded while an enemy objective remains as the positive control.
- The readiness trace persists the immutable opening objective it evaluated. The launch/order audit derives the brigade candidates whose direct or concentrated prediction meets the recorded launch threshold, then requires at least one of those launch-sufficient candidates to have a valid order in the same execution turn and phase. A direct attack's downstream objective and issued target must both equal the launch objective. Its injected control combines a launch-sufficient brigade refusal, unrelated current movement, and stale planning movement, so an axis-level or stale-row matcher cannot report a false pass.
- Default runs do not serialize the optional objective/roster debug payloads.

## CI and Manifest Anomaly

The handoff's assertion that CI runs `32532844577` and `32050627175` were byte-identical was false. Both reported 16 mismatches, but the newer run changed the 188-week actual hashes for `final_save.json`, `run_summary.json`, and `weekly_report.jsonl`. A deliberately false tuple was detected as a positive control. The workflow caches dependencies, not scenario artifacts. Equal red counts concealed changed outputs; CI did exercise the history merge.

The manifest remains frozen at SHA-256 `2BD8549068935249C7FEE8C9BFC27C9B21950C0AA11C2D38B41043024124D03F`.

## Controlled Run Record

| Run | Isolated purpose | Matched | Anchors | Final hash | Disposition |
|---|---|---:|---:|---|---|
| n246 | stale-prefix pruning candidate | 632 | 30/31 | `ca338f347d84a26b` | rejected: Orašje fell to RS |
| n247 | controller heuristic | 604 | 31/31 | `15418713862f4bda` | rejected: Mistral cascade regressed |
| n248 | preserve authored objectives | 604 | 31/31 | `8e8f4e5a726e2e7f` | retained, insufficient alone |
| n249 | pre-planned prefix correction | 604 | 31/31 | `8e8f4e5a726e2e7f` | byte-identical; inert here |
| n251 | defer nonviable opportunity rosters | 601 | 31/31 | `b581b2d3bacb5d65` | rejected and reverted |
| n253 | exact revert proof | 604 | 31/31 | `8e8f4e5a726e2e7f` | byte-identical to n248/n249 |
| n254 | retain staged operation axes | 614 | 31/31 | `f3b1e244e39f23a3` | retained |
| n255 | authored opportunity preempts probes | 630 | 31/31 | `5cb43c593610b335` | retained; cascade restored |
| n256 | casualty replacement commitment guard | 630 | 31/31 | `5cb43c593610b335` | retained; byte-identical in this trajectory |
| n257 | reserve replacements within one operation | 630 | 31/31 | `5cb43c593610b335` | retained; byte-identical in this trajectory |
| n265 | launch/order trace enabled | 628 | 31/31 | `32b614231a2601e2` | diagnostic evidence; env-gated payload changes raw hash |
| n266 | launch/order trace disabled | 628 | 31/31 | `68fb8b09c4fd7260` | final clean run; combat-calibration valid |
| n267 | collapse OFF control at final implementation HEAD | not re-scored | not re-scored | `68fb8b09c4fd7260` | clean half of same-commit ON/OFF pair |
| n268 | collapse ON control at final implementation HEAD | not re-scored | not re-scored | `354a4e4deb109ac5` | clean paired half; Section 6 comparison executed |
| n269 | immutable launch-objective trace enabled | 628 | 31/31 | `65d7b4f7ea5c1398` | clean diagnostic run; strengthened audit passes |

Short diagnostic runs n250 and n252 were evidence-gathering runs, not calibration results. n250 established that Mistral 1 participants were being consumed by a disposable probe; n252 established that the failed n251 heuristic discarded a valid staged sibling axis. Those observations, not conjecture, drove the later fixes.

## Pre-launch-closure Scenario Evidence (n257)

Clean provenance: commit `d7e6929d6008ccc9f21b19841667be6523d00029`, `git_dirty:false`, headless harness.

| Operation | Observed result at n257 | Evidence boundary |
|---|---|---|
| Cincar / Kupres | success, 5/5 captured | AAR completed |
| Mistral 1 | partial, 7 captures | AAR ended turn 173, `max_failures` |
| Mistral 2 | approved t175, execution t178, 7 captures by t184 | still in recovery at turn-188 boundary; no final AAR yet |
| Southern Move | blocked t182–188 | Sipovo staging anchors not HRHB-held |

All six delayed HV formations spawned exactly once and recorded movement events. `hv_112th_infantry_1995` recorded six movement events, 13 operation turns, and five full-stack battle hits. The other five recorded two or three movement events but no operation membership or battle-stack hit. Because the operation and battle projections have positive controls, those absences are established. Four have no authored catalog entry; `hv_7th_hgr_1995` is authored only for Mistral 1, whose eligibility window closes before the required turn-174 spawn. That is an authored-content/calibration boundary, not evidence that their movement executor is broken.

The n257 threshold engine-health gate passed: zero-eligible operations 0/3, dead operations 2/6, ghost-destroyed 2/4, stranded brigades 6/9, consistency failures 0/3, matched OSIDs 630/622 minimum, advisory K:W 3.696 inside band. The 31 anchor checks all passed; an in-memory wrong-controller mutation produced one failure. The commitment audit found no collisions across 1,988 live memberships; its injected collision produced `collision_delta: 1`.

The casualty-replacement guards did not change n256 or n257 relative to n255. Therefore the 188-week trajectory did not establish that either replacement path fired. The focused red/green state reproducer establishes both reachable defects and their corrections.

The threshold-based engine-health gate passes, but the artifact is **not valid for combat calibration**. `behavioral_health.combat_causality.valid_for_combat_calibration` is false with two `operation_attack_orders_without_battles` invalidations. Direct weekly tracing identifies Operacija Osvit at weeks 101 and 102: three attack orders each were skipped as `alliance_blocked`, with zero battles. This qualification is separate from the passing health thresholds and is why n257 is evidence for engine/lifecycle behavior, not a new calibration pin.

## Launch-Prediction Engine Closure

Follow-up tracing disproved two narrower launch fixes before identifying the remaining defect. Operation readiness used the live opening-contact graph as the adjacency supplied to combat prediction, while brigade order generation used the full tactical graph. The sparse graph undercounted reactive defenders and allowed operations such as Kopljem/Gazija to launch on a favorable prediction, then immediately refuse the same opening attack under the order generator's complete combat context.

The readiness predictor now receives the same terrain, supply, population, officer, reverse-formation, and full tactical-adjacency context as order generation. The live opening graph remains responsible only for contact/gate eligibility. The permanent `operation_launch_order_consistency.cjs` audit checks the first execution week of every traced executable axis. It derives the candidates meeting the recorded launch threshold, joins their same-turn execution orders, and verifies direct attacks retain the immutable launch objective; unrelated movement, stale planning rows, correct refusals by weaker candidates, and self-consistent downstream objective drift cannot distort the verdict.

Diagnostic-on n265 checked 965 traced axes and 181 first-execution executable axes: zero contradictions, with the injected contradiction detected. Combat causality is valid: zero invalid operations, 755 attack orders, 553 battles, and zero recovery-without-attempt rows. Diagnostic-off n266 reproduced the same gameplay trajectory. After removing only the three env-gated trace fields (`launch_readiness_detail`, `order_generation_details`, and `launch_blocker_detail`), canonical final-save serialization is byte-identical at SHA-256 `F5237F5F9BAF33B288F43BB7AE97F87269B2752CABC42128B6ACD9EA256F41F0`; a mutated turn produced a different hash as the comparator positive control.

n266 is clean at commit `c700a18d441df90234f2c13f60184856325d2413`. It passes all 31 anchors, the 188-week engine-health gate (stranded 6/9, matched 628/622 minimum), and combat-calibration validity. No baseline pin was regenerated.

## Verification Status

- The final engine/HV focused gate passes 324/324 tests across 16 files, including launch/order controls for unrelated-brigade masking, stale planning rows, wrong direct-attack targets, self-consistent downstream objective drift, mixed weak/strong candidates, and the composite injected defect.
- The regenerated startup artifact passes `desktop:startup-snapshot:check`, 22/22 startup/desktop contract tests, and `desktop:sim:build`.
- TypeScript typecheck and the emitting build pass; `git diff --check` passes.
- The scenario-anchor suite passes 4 selected tests; its Brcko negative case is an explicit positive control.
- n265 passes the launch/order consistency audit with its injected positive control; n266 passes threshold health, anchors, and combat-calibration validity.
- Fresh diagnostic-on n269 at clean commit `448f6c3ef` passes the strengthened objective-bound audit: 965 axes traced, 181 first-execution executable axes checked, zero mismatches, and the composite injected defect detected. After removing only `launch_readiness_detail`, `order_generation_details`, and `launch_blocker_detail`, n269 and n266 are canonically byte-identical at SHA-256 `F5237F5F9BAF33B288F43BB7AE97F87269B2752CABC42128B6ACD9EA256F41F0`; a turn mutation changes the hash.
- A controlled collapse pair was rebuilt at the identical clean commit `709e3aa511325cffd71760e237b649622891eeb4`, Node `v24.13.0`, and consumed-input digest `be30f7c708f3e27a0df84507bc0566219f88fa5a5772ca961b3cce486625752b`. Only `collapse_enabled` differs. The three comparison files pass 70/70 with `pair=FORMED verdict=OK`; all Section 6 sentinels execute, all 84 enclave keys are identical, and none of 17 OFF-held RBiH rim cells is newly lost.
- The earlier broad-suite run reported 12 failing files / 23 failing tests: 7 files / 15 tests were the established pre-existing baseline, four collapse assertions were invalid because they selected an ON/OFF pair from different commits, two startup/desktop failures exposed the stale baked artifact, and one operation-opportunity failure exposed an overlapping test roster. Those three branch-local causes are now independently green in their focused gates. A complete post-correction broad-suite rerun is not claimed here.
- `data/derived/latest_run_final_save.json` is restored to SHA-256 `A9EBCEA481BDE4FEF0E69FAC119E124812922247C1D07F19D95A3F8BF2BE1E4C`.
- `data/derived/scenario/baselines/manifest.json` remains frozen at SHA-256 `2BD8549068935249C7FEE8C9BFC27C9B21950C0AA11C2D38B41043024124D03F`; no pin was regenerated.
- Final independent review is recorded separately when complete.

## Lessons Learned

- A count can stay constant while artifact hashes change; compare the actual tuples.
- A zero is not an absence proof unless the same projection proves it can observe a known event.
- Mixed-axis opportunity planning is staged movement, not evidence that an unreachable sibling axis is invalid.
- Generic probes are disposable planning devices; historical opportunities need an explicit, bounded preemption rule rather than accidental starvation.
- A clean scenario hash can mean a defensive invariant was not exercised, not that the unit-level defect was imaginary.

## Remaining Boundaries

- Do not regenerate baseline pins as part of this work.
- Adding authored post-turn-174 roster paths for the five non-participating formations is a separate historical/content calibration decision.
- Southern Move's Sipovo dependency is a measured scenario outcome, not silently relabeled as an engine failure.
- Promotion requires independent review of the final HEAD; the implementer is not the reviewer.
