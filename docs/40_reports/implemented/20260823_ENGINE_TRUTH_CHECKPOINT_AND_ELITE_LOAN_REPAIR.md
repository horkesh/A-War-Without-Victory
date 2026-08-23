# Engine Truth Checkpoint and Elite-Loan Ownership Repair

**Date:** 2026-08-23  
**Branch:** `codex/engine-truth-checkpoint`  
**Simulation commit measured:** `26929e6b86e08f0438e97b7917f779ac8271b237`  
**Status:** Implemented, independently reviewed, campaign-verified; affected baseline pins reconciled

## Outcome

The observed 188-week elite-loan assignment defect is closed. A live elite loan whose sector assignment is invalidated by the final topology rebuild now receives its normal deterministic deployment order in that same turn, rather than remaining without movement ownership until the next turn. A permanent, read-only campaign checkpoint establishes this from live evidence and fails closed when evidence is missing, suppressed, truncated, duplicated, or drawn from incomparable runs.

Two fresh clean 188-week runs (`n3`, `n4`) are byte-identical across eight core artifacts and finish at `930195c6879502c7`. Both pass the checkpoint with zero unresolved-assignment emissions. After remote CI reproduced exactly the same ten expected 188-week/52-week artifact changes, those ten baseline hashes were reconciled; no calibration threshold changed.

## Root cause and repair

`tickEliteLoans` executes before the final sector-topology reconciliation. In the old clean run, final topology invalidated `rs_65th_protection_motorized_regiment`'s assignment at turn 14 after the ordinary deployment-order decision had already completed. The brigade remained sectorless until turn 15.

`repairActiveEliteDeploymentOrdersAfterFinalTopology` now runs after final topology and operation reconciliation, before final distribution and the assignment seal. It examines only the stable-sorted IDs in finalized `unresolved_sector_brigades`, and acts only when a formation is active, unassigned, and on a live elite loan. It reuses the existing deployment-order policy; it does not rerun recall, operation attachment, loan lifecycle, or general brigade assignment.

Measured lifecycle:

| Evidence | Turn 13 | Turn 14 | Turn 15 | Arrival |
|---|---|---|---|---|
| Old clean `n1` | assigned sector 4 | sectorless, no order | movement order | turn 19, sector 2 |
| New clean `n3`/`n4` | same | sectorless, order issued | in transit | turn 18, sector 2 |

## Fail-closed evidence contract

`npm run diagnose:engine-truth -- <run-dir> --assignment-log <combined.log>` binds an explicit run directory to one console segment through output-directory and final-state-hash evidence, then validates:

- exactly 188 `kind=turn` final-assignment seals and one `kind=final_save` projection seal;
- warning count reconciled to the unresolved sum across those seals;
- complete 564-cell faction-week formation coverage;
- complete displacement events reconciled to state and summary totals;
- exactly the three canonical casualty factions;
- the 31-anchor authored startup contract and both report copies;
- mutually consistent attack-order, battle, and invalid-operation counters.

Separately, both audited `run_meta.json` files record exact commit `26929e6b86e08f0438e97b7917f779ac8271b237`, `git_dirty:false`, `harness:headless`, Node `v24.13.0`, and consumed-input digest `be30f7c708f3e27a0df84507bc0566219f88fa5a5772ca961b3cce486625752b`. The checkpoint does not independently validate those provenance fields; this report derives them directly from the two run-meta artifacts.

Mutation tests provide positive controls for every evidence dimension. The old clean `n1` correctly fails: it predates the contract stamps and contains the genuine r65 unresolved emission.

The legacy `validate_run_consistency.cjs` cannot establish transient assignment completeness from `final_save.json`, because serialization intentionally excludes `unresolved_sector_brigades`. It now prints `NOT ESTABLISHED` when that field is absent instead of converting absence to an empty list and reporting a false zero. A synthetic present/nonempty field remains a failing positive control.

## Campaign result

| Metric | New clean `n3` / `n4` |
|---|---:|
| Historical fit | 637 / 712 |
| Authored anchors | 31 / 31 |
| Final-state hash | `930195c6879502c7` |
| Attack orders | 770 |
| Battles | 569 |
| Invalid / zero-eligible / dead operations | 0 / 0 / 0 |
| K:W ratio | 3.698 |
| Stranded brigades | 6 |
| Ghost-destroyed rows | 2 |

Compared with old clean `n1` (`cc88344e922ac8b4`), final control changes in exactly four OSIDs:

- `op:bihac:trubar`: RBiH → RS (painted loss)
- `op:brcko:skakava_donja`: RBiH → RS (painted gain)
- `op:gradacac:pelagicevo`: RBiH → RS (painted gain)
- `op:mrkonjic_grad:bjelajce_2`: HRHB → RS (painted loss)

The two gains and two losses leave the score at 637. `formation_delta.json` is byte-identical old-to-new; the other principal artifacts move with the one-turn campaign cascade.

Same-commit `n3` and `n4` are byte-identical across `final_save.json`, `run_summary.json`, `weekly_report.json`, `control_delta.json`, `activity_summary.json`, `formation_delta.json`, `brigade_temporal_log.jsonl`, and `displacement_event_log.jsonl`.

## Realism boundary

Current military totals are 56,553 KIA, 209,119 WIA, and 20,322 missing/captured. The KIA total is within the working historical 57–62k band, but default-on reporting scalars mean this is not independent proof of historically correct raw lethality. Missing/captured lacks a like-for-like historical contract. Civilian events reconcile internally—31,115 killed, 287,229 fled, 1,286,801 displaced—but cover only modeled takeover/displacement pathways. Area-weighted endpoint territory was not measured.

All six HV expeditionary formations spawn at turn 174 and move. Two have reachable authored operation participation; three have no authored catalog assignment, and `hv_7th_hgr_1995`'s only authored window precedes spawn. Those are catalog/timing limits, not evidence of a movement-engine defect.

## Verification performed

- Independent engine review: corrected narrow implementation approved after rejection of the first broad patch.
- Harness review: iterated until run/log/hash binding, liveness, full temporal coverage, final survivors, casualty factions, authored anchors, counter reconciliation, multi-run rejection, and kinded seals were all fail-closed.
- Focused final slices: 55/55 validator + checkpoint tests; earlier engine/phase slices 106/106 and 47/47.
- TypeScript typecheck: passed before the clean campaign runs.
- Same-commit clean 188-week repeat: passed and byte-identical over eight core artifacts.
- Complete final-tree `npm run test:vitest:balanced`: passed with all four isolated lanes and the 50-file / 800-test serial hazard tail; top-level exit code 0.
- Initial `npm run canon:check`: determinism static scan passed; baseline comparison failed against the pre-repair manifest with six 188-week and four 52-week artifact mismatches.
- Remote CI run `32659474284` independently reproduced exactly those ten mismatches, including 188-week final hash `930195c6879502c7`, while typecheck, event/phase tests, and the strict canon rail passed.
- After updating exactly those ten hashes through the repository baseline-update path, a fresh comparison-mode run exited 0 with `Baseline regression: all scenarios match.`
- Final-tree `npm run canon:check`: determinism static scan passed and the regenerated comparison passed all scenarios; top-level exit code 0.

Follow-up remote CI on the reconciled manifest remains a promotion gate recorded separately.

## Files and ownership

- Engine: `src/sim/combat/army_reserve_system.ts`, `src/sim/turn_phases/war_phase_reconciliation_steps.ts`
- Live seal: `src/sim/combat/corps_front_sectors.ts`
- Run provenance/anchor contract: `src/scenario/scenario_runner.ts` and historical anchor resolver
- Permanent checkpoint: `tools/diagnostics/engine_truth_checkpoint.cjs`
- Legacy validator truth fix: `tools/validate_run_consistency.cjs`
- Tests: `tests/army_reserve_system.test.ts`, phase-order tests, `tests/engine_truth_checkpoint.test.ts`, `tests/validate_run_consistency.test.ts`

## Protected state

Exactly six `apr1992_188w` hashes and four `apr1992_52w` hashes in `data/derived/scenario/baselines/manifest.json` were refreshed only after local repeatability, the earlier cache/hash anomaly settlement, and an exact remote mismatch reproduction. The tracked `data/derived/latest_run_final_save.json` remained clean. The HV spawn timing and mobility changes remain in the same tree and were not separated.

The baseline runner still emits four unresolved HV task-group rows in each synthetic four-week scenario: `hv_113th_brigade_tg`, `hv_116th_brigade_tg`, `hv_1st_guards_tg`, and `hv_4th_guards_tg`. Those fixtures use the initial-municipal substrate rather than the audited 188-week campaign path. This report does not classify that signal as harmless or fixed; it is separate engine-health debt.
