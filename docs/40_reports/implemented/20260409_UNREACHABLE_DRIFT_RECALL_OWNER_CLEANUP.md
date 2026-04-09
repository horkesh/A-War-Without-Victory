# Unreachable Drift Recall Owner Cleanup

**Date:** 2026-04-09  
**Baseline:** `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1403` (`3e73da751bd457d9`)  
**Result:** `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1404` (`dbd50f6e5aaacb95`)

## Summary

- Hardened `recallDriftedBrigades(...)` so ownerless brigades no longer keep impossible home-recall packets when no friendly path home exists.
- Preserved the truthful residual seam: `rs_1st_podrinje` and `rs_5th_podrinje` still finish as stranded `brigade_far_from_home_unassigned`, but they no longer serialize a false movement owner.
- Locked the narrow movement-authority contract with deterministic regression tests for unreachable stale generic orders and unreachable stale home recalls.

## Changes Made

### Engine hardening

- `src/sim/turn_phases/war_phases.ts`
  - Added a friendly-path reachability check before writing or preserving ownerless drift recall orders.
  - Cleared stale generic movement orders when a brigade is ownerless, outside same-corps sector space, and has no reachable route home.
  - Cleared stale home-recall packets for the same unreachable shape instead of preserving an impossible order.

### Regression coverage

- `tests/drift_recall_precedence.test.ts`
  - Added a regression proving unreachable ownerless drift clears a stale generic movement order.
  - Added a regression proving unreachable ownerless drift clears an impossible existing home-recall order.

## Verification

- `npx.cmd vitest run tests/drift_recall_precedence.test.ts tests/brigade_home_return.test.ts tests/elite_loan_return_to_corps.test.ts`
- `npm.cmd run sim:scenario:run:40w` -> baseline `n1403`, post-fix `n1404`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1404`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Scenario Proof

### Baseline (`n1403`)

- `rs_1st_podrinje` and `rs_5th_podrinje` both finished at `op:banja_luka:banja_luka_2`.
- Both brigades had `assignment = null`, so sector and operation ownership were already gone.
- Both brigades still serialized live movement orders pointing toward their home OSIDs even though no friendly path existed.
- `brigade_far_from_home_unassigned` truthfully reported both brigades.

### Post-fix (`n1404`)

- `rs_1st_podrinje` and `rs_5th_podrinje` still finished at `op:banja_luka:banja_luka_2`.
- Both brigades still had `assignment = null`.
- Both brigades now serialize `order = null` and `brigade_movement_state = null`.
- `brigade_far_from_home_unassigned` still truthfully reports both brigades.

### Before/after difference

- Fixed: false movement ownership and impossible home-recall packets are gone from the final save.
- Unchanged but clarified: the Podrinje pair remains genuinely stranded and ownerless.
- Reclassified honestly: this is no longer a movement-order wording issue; it is now a real strandedness/resolution-owner seam.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/turn_phases/war_phases.ts` | Cleared unreachable ownerless drift orders instead of preserving impossible movement ownership |
| `tests/drift_recall_precedence.test.ts` | Added unreachable-order regression coverage |
| `docs/40_reports/implemented/20260409_UNREACHABLE_DRIFT_RECALL_OWNER_CLEANUP.md` | Recorded lane proof and residual seam |
| `docs/PROJECT_LEDGER.md` | Added implementation ledger entry |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added reusable lesson about unreachable repair orders |
| `docs/plans/MASTER_ROADMAP.md` | Updated current runtime-truth status from `n1403` to `n1404` |
| `.claude/architect_notes.md` | Added durable architecture note for unreachable drift recall ownership |

## Residual Risks

- The engine now tells the truth about unreachable drift, but it still lacks a canonical resolver for same-faction brigades stranded beyond any friendly path home.
- `brigade_far_from_home_unassigned` remains the honest residual anomaly for the Podrinje pair until a bounded owner decides whether they should be reclassified, recovered through another authority, or remain unresolved.

## Next Steps

- Investigate the canonical owner for irrecoverably unreachable same-faction drift after sector, operation, and movement ownership are all gone.
- Keep the next lane narrow: either introduce a truthful stranded-state owner or prove an existing owner should absorb the Podrinje pair without reintroducing fake movement truth.
