# Sector Hash Reconciliation

**Date:** 2026-06-04
**Type:** Docs-only sector/frontline performance lane reconciliation
**Scope:** Roadmap, command board, sector master, and next-target plan only

## Summary

**Supersession note:** This report's original floor, `41c72b13ad2e91b9`, is now historical pre-PR #180 evidence. The active sector/frontline performance floor is `41ba34ddfaa02a85` after PR #180 / commit `d6b6533a` moved ARBiH 4th Corps HQ from Jablanica to East Mostar and refloored golden baselines.

The older `e086afbefcef01e6` floor remains historical evidence for the 2026-06-03 coverage-component-cache slice, but it is no longer valid as the pre-change floor for new sector optimization work. PR #159 / commit `1a823d5e` intentionally changed final-sector serialization/sealing by passing full operational edges plus final spatial context into the final-save seal path.

## Evidence

Current run:

- `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2019`
- Final hash: `41c72b13ad2e91b9`
- Anchors: 30/30
- Critical anomalies: 0
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2019` passed.

Historical run:

- `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2017`
- Final hash: `e086afbefcef01e6`
- Anchors: 30/30
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2017` now fails under current validators with one empty contested sector, one wide undefended front subsegment, and adjacent uncontested `op:zavidovici:cardak_2` exposure.

This is accepted mainline drift from the final-sector seal correction, not a sector-performance regression.

## Next Gate

Before any new sector/frontline performance implementation:

1. Re-profile from current `main`.
2. Treat `41ba34ddfaa02a85` as the current no-edit floor; keep `41c72b13ad2e91b9` as historical pre-#180 proof.
3. Stop on unexpected pre-edit hash drift.
4. Pick one measured owner only, from current profile evidence.
5. Keep generated run/profile artifacts unstaged unless a separate artifact-ownership lane explicitly retains them.

## Files Updated

- `docs/40_reports/README.md`
- `docs/40_reports/SECTOR_MASTER.md`
- `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`
