# Fifth Corps Sana Follow-On Reachability

**Date:** 2026-05-01
**Status:** Implemented and verified on rebased `codex/fifth-corps-reachability`
**Run IDs:** 40w `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`; 188w `runs/apr1992_definitive_188w__210e69404d054959__w188_n1`
**Baseline:** `main` integration baseline n1609/n1610 after combat-math, Storm theater gate split, and campaign proof platform
**Result:** Initial Sana no longer carries the structurally unreachable Sanski Most / Kljuc axis; that axis is now an emergent follow-on opportunity. 188w proof has zero reachability warnings.

## Summary

- Split Operation Sana into two catalog opportunities: `sana_95` for the reachable Krupa + Bihac-Petrovac breakthrough, and `sana_95_follow_on` for the Sanski Most / Kljuc interior push.
- The follow-on keeps the legacy 4-brigade / 13-objective interior axis, but only surfaces after live control opens a western approach corridor.
- This is not a railroad and not a scripted success: it removes a known impossible initial axis so the next combat-math lane can evaluate real reachable attacks.
- Rebased verification after the combat-math mega-lane shows `sana_95` launching as a 2-axis / 18-objective operation at t175, while `sana_95_follow_on` stays blocked in-window by `staging_access` and `logistics` because the live corridor never opens.

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

### Red/Green Tests

- Red: `vitest tests/operation_opportunities_5th_corps_sana.test.ts` failed with 5 failures, including initial Sana still carrying `sana_sanski_most_kljuc` and missing `sana_95_follow_on`.
- Green: `vitest tests/operation_opportunities_5th_corps_sana.test.ts` passed 19/19.
- Rebased focused proof pack: `npx.cmd vitest run tests/operation_opportunities_5th_corps_sana.test.ts tests/operation_opportunities_una_94.test.ts tests/operation_opportunities_breza_94.test.ts tests/operation_opportunities_pauk_94_95.test.ts tests/opportunity_campaign_proof_diagnostic.test.ts` passed 70/70.
- Typecheck: `npx.cmd tsc --noEmit` passed.

### Scenario Evidence

| Check | Result |
|---|---|
| 40w smoke | hash `0c2fc264112dec1f`, matching current main integration baseline; no pre-window behavior drift |
| Jan1993 painted compare | 91.3% count / 93.3% area |
| 40w diagnose | 0 ERR / 30 WARN |
| 40w validate | PASS |
| 188w proof | hash `b2426eb412f4422e`, behavioral drift expected after t175 because Sana footprint changed |
| Oct1995 painted compare | 70.8% count / 63.2% area, same headline as current baseline |
| 188w diagnose | 0 ERR / 35 WARN |
| 188w validate | 18 known sector-layer failures, same class as current baseline |
| opportunity health | 7 decisions / 7 completed / 2 successes / 3 T3 sentinels / 0 broken AAR links |
| campaign proof | 8 observed opportunities / 4 surfaced-executed / 3 T3-authorized / 1 blocked in-window / 0 reachability warnings |

### Sana-Specific Proof

| Surface | Result |
|---|---|
| `sana_95` proposal | t175 approved, `failed`, AAR `arbih_5th_corps:Operation Sana:t175` |
| `sana_95` footprint | 18 objectives, staging at `op:bihac:bihac_2` and `op:bosanska_krupa:otoka_2`; no Sanski Most / Kljuc interior objectives |
| `sana_95` execution | 4 attacks, 0/18 captures, `max_failures`; both axes are reachable and underdeliver in combat |
| `sana_95_follow_on` | blocked in-window turns 175-188; blockers `staging_access x14` and `logistics x14` |
| delivery audit | Sana axis predicates are `UNDERDELIV:2`; no `unreachable_at_launch` axis remains |

## Next Steps

1. Treat the Sana catalog geometry issue as closed: remaining initial Sana failure is combat underdelivery, not a front-reachability bug.
2. Do not add a `sana_95_completed -> sana_95_follow_on` chain. The follow-on should continue to require live corridor control.
3. If a later combat or 5th Corps pressure lane opens the corridor, rerun the campaign proof to see whether `sana_95_follow_on` surfaces and whether it then stalls in normal combat/staging.
4. Keep sensitive-history lanes separate: Krivaja-95 / Stupcanica-95 / Srebrenica remain pre-existing P0s outside this 5th Corps catalog split.
