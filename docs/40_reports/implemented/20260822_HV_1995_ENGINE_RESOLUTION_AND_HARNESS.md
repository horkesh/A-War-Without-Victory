# HV 1995 Engine Resolution and Evidence Harness

**Date:** 2026-08-22

**Branch:** `codex/hv-1995-timing-mobility`

**Final clean run:** `apr1992_definitive_188w__9e902ad68783fbe7__w188_n256`

**Result:** 630/712 matched OSIDs, 31/31 anchors, final hash `5cb43c593610b335`

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
- Authored objective sequences are not shortened merely because the first objective is not immediately approachable. Mixed/staged axes survive planning reconciliation.
- An approved authored opportunity may preempt participants from a live `probe`, but not from another planning/execution operation. Empty probes enter canonical recovery.

### Commitment invariants

- Operation selection and per-turn elite-loan attachment reject brigades committed to another live operation.
- `evaluateOperationProgress` formerly selected a healthy casualty replacement by excluding only the current operation's participants. A deterministic reproducer showed it selecting a brigade already committed to a second planning operation and creating `operation.participant_double_committed`. The selector now excludes every brigade returned by `findBrigadeLiveOperationAnywhere`.
- The replacement test proves the initial state is lifecycle-clean, makes the committed candidate sort first, expects the uncommitted candidate, and proves the resulting state remains lifecycle-clean.

### Permanent evidence harness

- `npm run diagnose:hv1995 -- <run-dir> --write` emits `hv_1995_lifecycle_diagnostic.json`.
- `npm run diagnose:operation-commitments -- <run-dir>` audits every weekly planning/execution membership and injects a deliberate collision as its positive control.
- `AWWV_DEBUG_REASON_CODES=objective_filter` exposes friendly-objective rejection rows only when requested. The payload is validated and deterministically sorted; the focused test proves a friendly rejection is recorded while an enemy objective remains as the positive control.
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

Short diagnostic runs n250 and n252 were evidence-gathering runs, not calibration results. n250 established that Mistral 1 participants were being consumed by a disposable probe; n252 established that the failed n251 heuristic discarded a valid staged sibling axis. Those observations, not conjecture, drove the later fixes.

## Final Scenario Evidence

Clean provenance: commit `f91b80ca1a00c56ecbae33597806ce99ddbbb75a`, `git_dirty:false`, headless harness.

| Operation | Observed result at n256 | Evidence boundary |
|---|---|---|
| Cincar / Kupres | success, 5/5 captured | AAR completed |
| Mistral 1 | partial, 7 captures | AAR ended turn 173, `max_failures` |
| Mistral 2 | approved t175, execution t178, 7 captures by t184 | still in recovery at turn-188 boundary; no final AAR yet |
| Southern Move | blocked t182–188 | Sipovo staging anchors not HRHB-held |

All six delayed HV formations spawned exactly once and recorded movement events. `hv_112th_infantry_1995` recorded six movement events, 13 operation turns, and five full-stack battle hits. The other five recorded two or three movement events but no operation membership or battle-stack hit. Because the operation and battle projections have positive controls, those absences are established. Four have no authored catalog entry; `hv_7th_hgr_1995` is authored only for Mistral 1, whose eligibility window closes before the required turn-174 spawn. That is an authored-content/calibration boundary, not evidence that their movement executor is broken.

The final engine-health gate passed: zero-eligible operations 0/3, dead operations 2/6, ghost-destroyed 2/4, stranded brigades 6/9, consistency failures 0/3, matched OSIDs 630/622 minimum, advisory K:W 3.696 inside band. The 31 anchor checks all passed; an in-memory wrong-controller mutation produced one failure. The commitment audit found no collisions across 1,988 live memberships; its injected collision produced `collision_delta: 1`.

The casualty-replacement guard did not change n256's final state relative to n255. Therefore the 188-week trajectory did not establish that this path fired. The focused red/green state reproducer establishes the reachable defect and its correction.

## Verification Status

- Focused replacement, lifecycle, sector-offensive, opportunity, state-validation, and HV diagnostic tests pass.
- TypeScript typecheck passes.
- The scenario-anchor suite passes 4 selected tests; its Brcko negative case is an explicit positive control.
- n256 passes the engine-health, HV lifecycle, anchor, provenance, and operation-commitment harnesses.
- `data/derived/latest_run_final_save.json` is restored to SHA-256 `A9EBCEA481BDE4FEF0E69FAC119E124812922247C1D07F19D95A3F8BF2BE1E4C`.
- Full-suite/build verification and final independent review are recorded separately when complete.

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
