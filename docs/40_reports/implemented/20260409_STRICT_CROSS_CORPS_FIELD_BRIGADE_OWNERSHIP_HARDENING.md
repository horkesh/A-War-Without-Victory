# 2026-04-09 - Strict cross-corps field-brigade ownership hardening

## Summary
- Demoted the legacy non-elite cross-corps enclave-rescue path in `brigade_assignment.ts` to a deliberate no-op.
- Tightened final brigade rehome so only same-corps sectors can reclaim a brigade from truthful frontline, territory, or reserve ownership.
- Replaced the old test exception that allowed foreign-corps enclave absorption with strict "leave unresolved unless same-corps truth exists" coverage.

## Why
- The repo canon already said final cross-corps sector assignment is forbidden for field brigades, but the engine still preserved two fallback paths that could silently reattach a brigade to another corps's sector.
- That contradiction was live in the 40-week run: `arbih_717th_slavna_mountain` finished in `sector:arbih_1st_corps:3` even though the brigade belonged to `arbih_3rd_corps`.
- The hardening goal for this lane was not to invent a new attachment system; it was to stop laundering displaced brigades into foreign sector truth.

## Files changed
- `src/sim/combat/brigade_assignment.ts`
- `tests/brigade_territory_reconciliation.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## What changed
1. `assignCrossCorpsEnclaveDefenders(...)` is now an explicitly documented legacy hook that performs no non-elite field-brigade reassignment.
2. `rehomeUnassignedBrigadesToPhysicalSectorOwners(...)` now filters candidate sectors to the brigade's resolved corps before any claim ranking happens.
3. The brigade-territory regression suite now asserts that both old foreign-corps rescue paths stay empty even when a brigade sits inside another same-faction corps's territory.

## Scenario proof

### Baseline
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1399`
- `end_report.md` contained:
  - `[cross_corps_sector_assignment] 1 brigade(s)... arbih_717th_slavna_mountain ... in sector sector:arbih_1st_corps:3`
- Final save state:
  - `arbih_717th_slavna_mountain.corps_id = arbih_3rd_corps`
  - `arbih_717th_slavna_mountain.assignment.sector_id = sector:arbih_1st_corps:3`
  - `arbih_717th_slavna_mountain.location_osid = op:fojnica:turkovici`

### Post-fix rerun
- Run: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1400`
- `end_report.md` no longer contains `cross_corps_sector_assignment`
- Final save state:
  - `arbih_717th_slavna_mountain.corps_id = arbih_3rd_corps`
  - `arbih_717th_slavna_mountain.assignment.sector_id = sector:arbih_3rd_corps:4`
  - `arbih_717th_slavna_mountain.location_osid = op:maglaj:maglaj_2`
- The brigade is still listed under `brigade_far_from_home`, which is the truthful residual seam after removing the false foreign-corps owner.

### Before / after difference
- Fixed: final foreign-corps sector ownership for `arbih_717th_slavna_mountain`
- Fixed: `cross_corps_sector_assignment` anomaly in the 40-week end report
- Clarified, not solved: the brigade remains drifted far from home; the engine now reports that as drift instead of pretending another corps owns it

## Determinism / ownership
- Determinism impact: controlled and deterministic. No randomness, timestamps, or unstable iteration added.
- Canonical owner after cleanup: the brigade's resolved corps, or unresolved drift if no same-corps sector truth exists.
- Demoted path after cleanup: legacy cross-corps enclave rescue for non-elite field brigades.

## Verification
- `npx.cmd vitest run tests/brigade_territory_reconciliation.test.ts`
- `npx.cmd vitest run tests/brigade_territory_reconciliation.test.ts tests/final_sector_truth_reconciliation.test.ts`
- `npm.cmd run sim:scenario:run:40w`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks
- Several brigades still finish far from home or unresolved; this lane intentionally leaves those seams visible instead of masking them with foreign-corps sector ownership.
- `assignCrossCorpsEnclaveDefenders(...)` is now a dormant compatibility hook. If the design ever wants non-elite same-faction attachments, that must arrive as an explicit new contract, not by reviving this fallback.

## Next lane
- Investigate brigade drift / home-return truth for same-faction far-from-home formations, starting with the now-truthful residual `arbih_717th_slavna_mountain` pattern and related `placement:fixed_home_osid` cases.
