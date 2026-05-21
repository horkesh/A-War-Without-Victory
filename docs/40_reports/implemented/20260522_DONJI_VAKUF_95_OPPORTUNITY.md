# Donji Vakuf 95 Opportunity Catalog Fill (2026-05-22)

## Summary

Added `donji_vakuf_95` as a T1 Central Bosnia operation opportunity for ARBiH 7th Corps, covering the ten Donji Vakuf OSIDs that move from mostly RS-held in Apr 1995 painted control to RBiH-held in Oct 1995 painted control.

This is catalog behavior only. It does not change scenario data, painted targets, save schema, combat math, OOB source rows, or outcome tuning.

## Implementation

- New opportunity: `DONJI_VAKUF_95_OPPORTUNITY` in `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`.
- Window: turns 177-180, representing the September 1995 Donji Vakuf operation window.
- Corps/faction: `arbih_7th_corps` / `RBiH`.
- Staging: Bugojno anchors `op:bugojno:gracanica` and `op:bugojno:kopcic_2`.
- Objectives: all ten `op:donji_vakuf:*` painted Oct 1995 RBiH target OSIDs.
- Gates: live date window, Operation Storm theater rupture, 7th Corps command/readiness, RBiH-held Bugojno staging, at least one RS-held objective, RBiH supply pressure, commander state, and axis coordination.
- Single-owner cleanup: retired the `vlasic_ridge_95` `bugojno_support` redirect variant so Donji Vakuf OSIDs no longer belong to a spring Vlasic redirect path.

## Verification

- Red test first: `npx.cmd vitest run tests\operation_opportunities_central_bosnia_catalog.test.ts --reporter=dot` failed because `donji_vakuf_95` was absent and no proposal spawned.
- Green focused test: `npx.cmd vitest run tests\operation_opportunities_central_bosnia_catalog.test.ts --reporter=dot` passed 12/12 after implementation.

Broader verification is recorded in the PROJECT_LEDGER entry for the commit.
