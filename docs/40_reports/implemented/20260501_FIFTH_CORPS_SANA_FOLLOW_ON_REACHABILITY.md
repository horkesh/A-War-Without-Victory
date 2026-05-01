# Fifth Corps Sana Follow-On Reachability

**Date:** 2026-05-01
**Status:** Implemented on `codex/fifth-corps-reachability`
**Run ID:** Not run; catalog/content split after n1605 evidence
**Baseline:** n1605 Late-War Operation Combat Delivery evidence
**Result:** Initial Sana no longer carries the structurally unreachable Sanski Most / Kljuc axis; that axis is now an emergent follow-on opportunity.

## Summary

- Split Operation Sana into two catalog opportunities: `sana_95` for the reachable Krupa + Bihac-Petrovac breakthrough, and `sana_95_follow_on` for the Sanski Most / Kljuc interior push.
- The follow-on keeps the legacy 4-brigade / 13-objective interior axis, but only surfaces after live control opens a western approach corridor.
- This is not a railroad and not a scripted success: it removes a known impossible initial axis so the next combat-math lane can evaluate real reachable attacks.

## Why

Claude's Late-War Operation Combat Delivery mega-lane showed that Sana axis C (`sana_sanski_most_kljuc`) launched with zero live approach OSIDs in n1605. The engine now records that as `unreachable_at_launch`, but the catalog content was still wrong: a polygon-interior first objective should not be bundled into the initial operation package when no breakthrough corridor exists.

The product goal is emergence, not calendar scripting. The clean model is a staged opportunity family:

1. The initial Sana offer asks whether 5th Corps can break out toward Krupa and Petrovac after Storm/Oluja opens the theater.
2. The follow-on offer asks whether the live map has created a corridor to Sanski Most / Kljuc.
3. Normal operation execution still decides whether either opportunity succeeds.

## Changes Made

### Catalog

- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
  - Removed `sana_sanski_most_kljuc` from `SANA_95_OPPORTUNITY.axes`.
  - Added `SANA_95_FOLLOW_ON_OPPORTUNITY` with `opportunity_id: 'sana_95_follow_on'`.
  - Added `stagingAccessSanaFollowOn`, which requires pocket survival plus at least one RBiH-controlled approach corridor anchor.
  - Added `enemyWeaknessSanaFollowOn`, which requires at least one interior follow-on target to remain RS-controlled.
  - Added the follow-on to `FIFTH_CORPS_OPPORTUNITIES`.

### Tests

- `tests/operation_opportunities_5th_corps_sana.test.ts`
  - Red-first test proved initial Sana still carried the interior axis.
  - Added follow-on catalog identity and axis-shape tests.
  - Added eligibility tests proving the follow-on stays hidden before a live approach corridor and surfaces after one exists.

### Documentation

- `docs/plans/late-war-5th-corps-opportunities-design.md`
  - Updated Sana 95 design to describe the initial/follow-on split.

## Determinism

No random, timestamp, or locale ordering was introduced. The new predicates are pure reads of political control and existing corps readiness. Hash drift is expected after turn 175 in any run where the initial Sana proposal fires, because the catalog now creates a different operation footprint and may later create a second proposal if the live map opens the corridor. Earlier checkpoints should be unaffected by date gates except for catalog shape if tooling lists the catalog.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | Split Sana into initial and follow-on catalog entries |
| `tests/operation_opportunities_5th_corps_sana.test.ts` | Added follow-on and corridor eligibility coverage |
| `docs/plans/late-war-5th-corps-opportunities-design.md` | Updated design contract |
| `docs/40_reports/implemented/20260501_FIFTH_CORPS_SANA_FOLLOW_ON_REACHABILITY.md` | This report |

## Verification

- Red: `vitest tests/operation_opportunities_5th_corps_sana.test.ts` failed with 5 failures, including initial Sana still carrying `sana_sanski_most_kljuc` and missing `sana_95_follow_on`.
- Green: `vitest tests/operation_opportunities_5th_corps_sana.test.ts` passed 19/19.
- Broader opportunity pack: `vitest` across 8 opportunity suites passed 169/169.
- Typecheck: `tsc --noEmit` passed after linking the worktree to the existing root and map UI dependency installs.

## Next Steps

1. Claude's next mega-lane should integrate defender-side modifiers into `estimateForceRatio` so operation launch prediction stops producing fantasy confidence against entrenched defenders.
2. After that lane, run a fresh 188w opportunity-health + operation-delivery audit to see whether initial Sana can create the corridor that surfaces `sana_95_follow_on`.
3. If the follow-on surfaces but stalls, investigate normal combat/staging outputs rather than rewriting the catalog again.
