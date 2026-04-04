# Commander Explanation Surfaces Wave 1 — Implementation Report

**Date:** 2026-04-04
**Lane:** v0.8-to-v0.9 Commander Explanation Surfaces
**Plan:** `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`
**Status:** COMPLETE

---

## Summary

Wave 1 makes Army HQ start exposing real commander reasoning from actual state/traces. The player can now understand why a corps commander is leaning a certain way — what military conditions constrain them, what institutional factors apply, what their current plan status is, and what threat context they face.

All explanation is grounded in real engine inputs (zone assessments, threat assessment, force assessment, plan lifecycle, command strain). No theater prose. Silence = healthy.

---

## What Was Implemented

### Engine (2 files, ~10 lines)

1. **`commander_state.ts`**: Added `last_plan_action` and `last_plan_reason` optional fields to `CommanderState`. These persist the transient `PlanDecision` reason that was previously computed every turn and discarded.

2. **`emit.ts`**: `buildUpdatedState()` now writes `planDecision.action` and `planDecision.reason` into the persisted `CommanderState`.

### Derivation (1 file, ~170 lines)

3. **`command_strain.ts`**: New `deriveCorpsSituationAssessment()` function. Pure derivation, no GameState mutation. Consumes `CommanderState` fields + corps stance/exhaustion/strain. Produces:
   - `postureSummary` — one-line institutional explanation (null = healthy)
   - `militaryFactors` — exhaustion, force balance, garrison deficit, siege, must-hold pressure
   - `institutionalFactors` — stance directives, command strain
   - `planExplanation` — plan lifecycle with reasons (concentrating/ready/executing/suspended/abandoned)
   - `threatContext` — critical/heavy pressure, enemy concentration

   Helper: `getDominantPosture()` — worst posture across zones.

### Adapter (1 file, ~20 lines)

4. **`GameStateAdapter.ts`**: Reads `commander_state` from `corps_command[id]` and calls `deriveCorpsSituationAssessment()`. Result placed on `FormationView.situationAssessment`.

5. **`types.ts`**: Added `situationAssessment` optional field to `FormationView`.

### UI (1 new file, ~95 lines)

6. **`CorpsSituationSection.tsx`**: New component. Renders the situation assessment in the Army HQ corps card back-face, positioned between Command Standing and Commander sections.
   - Silence = healthy: renders null when all fields empty
   - Collapsible section with `sectionKey="situation-assessment"`
   - Military factors: amber bullets
   - Institutional factors: blue bullets
   - Threat context: red triangle indicator
   - Plan explanation: separator + play arrow

7. **`ArmyHQCorpsCard.tsx`**: Imports and renders `CorpsSituationSection` after `CommandRelationshipSection`.

### Tests (13 new tests)

8. **`command_authority.test.ts`**: Wave 11 describe block with 13 tests covering:
   - Healthy projecting corps → all-null (silence = healthy)
   - Defending corps with deficit → posture explanation + military factors
   - Exhaustion as military factor
   - Command strain as institutional factor
   - Concentrating plan with progress
   - Suspended plan with reason
   - Abandoned plan from last_plan_reason
   - Critical threat context
   - Besieged posture summary
   - Null commanderState graceful handling
   - No-plan reason for defensive stance
   - Low combat effectiveness
   - Enemy concentration as threat context

---

## What Was NOT Implemented

- **Commander personality narrative** — no belief state exists in v0.8.0. Deferred to v0.8.1 Commander Maturity.
- **Commander relationships/trust** — no relationship model yet. Deferred to v0.8.1.
- **Brigade-level explanation** — intentionally excluded. Presidential language, not brigade diagnostics.
- **Campaign role explanation** — `campaign_role` is available in `CommanderBriefing` but not yet in `CommanderState`. Can be added as a small honest addition in Wave 2 by persisting it.

---

## Verification

- **tsc**: clean
- **vitest**: 192/192 command_authority tests pass; 2126/2146 full suite (20 pre-existing failures in 6 unrelated files)
- **vite build**: clean (8.47s)
- **governance**: OK
- **Pre-existing proof method**: `git stash` → ran full suite on clean HEAD (`d9d1be4b`) → identical 20 failures → `git stash pop`

### Pre-Existing Failure Evidence (20 tests, 6 files)

| File | Failures | Failing Tests | Why Unrelated |
|------|----------|---------------|---------------|
| `tests/brigade_posture.test.ts` | 12 | `applyPostureOrders`: changes posture, applies hold, hold auto-upgrades. `applyPostureCosts`: attack drains, hold adds, defend drains, auto-downgrades, dig_in cohesion, dig_in progress, dig_in cap, dig_in reset, defend_at_all_costs. | Tests `brigade_posture.ts` — zero files in posture/cohesion touched by this lane. |
| `tests/commander_override.test.ts` | 4 | `commanderReviewAssignment`: mission compliance concentrates, non-priority excess releases, encircled withdraw, 1-neighbor withdraw. | Tests `commander_march_correction.ts` — this lane only added optional fields to `CommanderState` and 2 lines to `emit.ts`. No march correction or assignment review logic touched. |
| `tests/corps_front_sector_corps_ownership.test.ts` | 1 | `does not let one corps sector claim another corps brigade` | Tests `corps_front_sectors.ts` — zero sector files touched. |
| `tests/desktop_pmtiles_protocol_route.test.ts` | 1 | `rewrites desktop awwv origins to canonical app data route` | Tests Electron protocol handling — zero desktop files touched. |
| `tests/engine_honesty_legacy_contracts.test.ts` | 1 | `marks legacy front and theatre schema fields honestly as compatibility-only` | Tests top-level legacy `front`/`theatre` schema markers — this lane added fields to nested `CommanderState`, not top-level schema. |
| `tests/war_phase_step_order.test.ts` | 1 | `step count is stable` | Asserts war_phases.ts step count = 153 — zero pipeline files touched by this lane. |

---

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/commander/commander_state.ts` | +2 optional fields on CommanderState |
| `src/sim/combat/commander/emit.ts` | +2 lines persisting plan action/reason |
| `src/ui/map/data/command_strain.ts` | +deriveCorpsSituationAssessment() + getDominantPosture() |
| `src/ui/map/data/types.ts` | +situationAssessment on FormationView |
| `src/ui/map/data/GameStateAdapter.ts` | +import + derivation call in corps block |
| `src/ui/map/components/army_hq/CorpsSituationSection.tsx` | NEW component |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | +import + render CorpsSituationSection |
| `tests/command_authority.test.ts` | +13 Wave 11 tests |

---

## Completion Block

**Canonical owner:** `deriveCorpsSituationAssessment()` in `command_strain.ts` — single derivation function for corps explanation
**Demoted path:** scattered explanation fragments, theater prose, debug-only truth
**Player-visible truth:** the player sees military conditions, institutional constraints, plan lifecycle reasons, and threat context derived from real CommanderState
**Canonical UI surface:** `CorpsSituationSection` in Army HQ corps card back-face — one strong explanation path
**Done means:** corps explanation surfaces consume real commander traces, QA can verify against backend state, silence = healthy when nothing needs explaining
