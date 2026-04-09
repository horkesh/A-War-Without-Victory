# 2026-04-09 - Graz Cold-Front Zero-Combat Corps Hardening

## Lane summary

- **Lane title:** Graz cold-front zero-combat anomaly hardening
- **Type:** Harness / anomaly truth hardening
- **Primary run pair:** `n1408` -> `n1409`

## Candidate seams considered

1. `zero_combat_corps` for `hvo_tomislavgrad`
2. `undefended_painted_mismatch` / `adjacent_uncontested_territory`
3. `brigade_never_fights`
4. redesign-blocked stranded-brigade lifecycle (`rs_1st_podrinje`, `rs_5th_podrinje`)

## Exact seam chosen

`checkZeroCombatCorps(...)` in `src/scenario/anomaly_checks_extended.ts` still emitted `zero_combat_corps` for `hvo_tomislavgrad` in `n1408` even though the sim already canonically owned that RS-HRHB frontage as a Graz cold front.

## Why this was the highest-value bounded step

This was the clearest remaining false-warning seam after `n1408`:

- it contradicted existing sim-owned cold-front truth
- it could be fixed entirely in the anomaly/reporting layer
- it had strong before/after scenario proof without changing sim behavior

The other visible warnings were either realism/calibration signals or redesign-blocked contract gaps.

## Canonical owner after cleanup

Cold-front truth remains sim-owned by:

- `src/sim/local_truces.ts`
- `src/sim/combat/sector_utils.ts` via `isSectorColdFront(...)`

`checkZeroCombatCorps(...)` now consumes that truth before declaring a corps-level dead front.

## Demoted path after cleanup

The demoted path is the anomaly-local inference:

- `corps has front sectors`
- `corps brigades have zero recorded battles`
- therefore `Dead front`

That inference is no longer allowed to overrule the canonical Graz cold-front owner.

## Player-visible truth after cleanup

`n1409` no longer reports:

- `[zero_combat_corps] Corps hvo_tomislavgrad (HRHB) has 1 sector(s) with 11 front edges and 3 brigades, but 0 battles fought after 40 turns. Dead front.`

The remaining anomaly board is unchanged, which proves the lane removed a false warning rather than laundering other seams.

## Canonical UI / reporting surface after cleanup

The canonical downstream surface is:

- `run_summary.json`
- `end_report.md`
- any UI/reporting path that consumes anomaly output

These surfaces now align with existing cold-front truth instead of contradicting it.

## Files changed

- `src/scenario/anomaly_checks_extended.ts`
- `tests/zero_combat_corps_cold_front.test.ts`
- `docs/40_reports/implemented/20260409_GRAZ_COLD_FRONT_ZERO_COMBAT_CORPS_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

1. Imported `isSectorColdFront(...)` into `checkZeroCombatCorps(...)`.
2. Tracked each corps's front-sector IDs alongside sector/edge counts.
3. Suppressed the warning when **all** of a corps's front sectors are canonically cold fronts.
4. Added focused regression coverage:
   - suppress true Graz cold-front corps (`hvo_tomislavgrad`)
   - keep reporting active non-cold fronts (`vrs_1st_krajina` sample)

## Scenario / anomaly proof

### Baseline

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1408`
- **Final hash:** `bde31c0aab141f42`
- **Problem before:**
  - anomaly count = `15`
  - `end_report.md` included `zero_combat_corps` for `hvo_tomislavgrad`
  - final state still showed:
    - one `hvo_tomislavgrad` front sector
    - `opposing_factions = ['RS']`
    - three brigades assigned
    - no operations
  - the same front was already canonically a Graz cold front

### Post-fix rerun

- **Run:** `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1409`
- **Final hash:** `bde31c0aab141f42`
- **After:**
  - anomaly count = `14`
  - `zero_combat_corps` is removed
  - all other visible anomaly families remain unchanged

### Difference

- **Fixed:** false `zero_combat_corps` warning for `hvo_tomislavgrad`
- **Unchanged but unrelated:** `brigade_never_fights`, territorial mismatch warnings, `brigade_far_from_home_unassigned`
- **Newly exposed:** none

This lane hardened reporting truth without changing the simulation result.

## Verification

- `npx.cmd vitest run tests/zero_combat_corps_cold_front.test.ts tests/cold_front_sector_suppression.test.ts`
- `npx.cmd vitest run tests/integration_anomaly.test.ts tests/anomaly_detector_deployment_truth.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1409`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npm.cmd run build`

## Residual risks

- `brigade_never_fights` remains a noisy but truthful broad warning
- territorial warnings still need a future judgment call between realism/calibration work and any narrower report-contract hardening
- stranded same-faction ownerless brigades remain redesign-blocked

## Additional investigation recorded this run

`arbih_444th_mountain` at the Konjic pocket tip was investigated during this campaign.

Finding:

- it is **not** a truth-owner leak or false serialization seam
- it captures `op:konjic:sitnik` via a one-brigade probe and remains connected by friendly path
- the issue is a doctrinal/salient-risk heuristic question, not a hardening bug

This was therefore demoted to realism/design, not taken as the next hardening lane.

## Stop / continue decision after this lane

After `n1409`, the remaining visible board is dominated by:

- realism/calibration signals
- noisy-but-truthful diagnostics
- redesign-blocked lifecycle or doctrine seams

No higher-value bounded hardening lane clearly beat the strategic stop threshold.
