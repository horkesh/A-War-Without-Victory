# Commander Explanation Surfaces Wave 2 — Implementation Report

**Date:** 2026-04-04
**Lane:** v0.8-to-v0.9 Commander Explanation Surfaces
**Plan:** `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`
**Status:** COMPLETE

---

## Summary

Wave 2 moves corps situation assessment from descriptive (list of factors) to decision-useful (dominant reason + constraint classification). The player now sees THE main thing holding back a corps, classified by type, with detail factors available below.

All explanation remains grounded in real engine state. No theater prose.

---

## What Was Implemented

### Derivation (1 file, ~100 new lines)

1. **`command_strain.ts`**: New `PrimaryConstraint` type — 7-value enum classifying the dominant constraint. New `classifyPrimaryConstraint()` function implementing priority-ordered classification:
   - siege (existential) > threat_pressure (critical/heavy/concentration) > defensive_duty (deficit/must-hold/no surplus) > force_condition (exhaustion/low effectiveness) > institutional_strain (reorganize/compromised/defensive stance) > plan_lifecycle (suspended/abandoned) > none (healthy)

2. **`CorpsSituationAssessment` interface extended** with:
   - `dominantReason: string | null` — one sentence naming THE main factor
   - `primaryConstraint: PrimaryConstraint` — classification enum for badge/routing

### Type (1 file, ~4 lines)

3. **`types.ts`**: `FormationView.situationAssessment` shape extended with `dominantReason` and `primaryConstraint`. No adapter changes needed — adapter already passes through the full derived object.

### UI (1 file, rewrite ~115 lines)

4. **`CorpsSituationSection.tsx`**: Rewritten to show:
   - **Dominant reason banner** with constraint-type badge (SIEGE/THREAT/GARRISON/READINESS/INSTITUTIONAL/PLANNING) — color-coded per type
   - **Detail factors** below in dimmed secondary text, only when there are additional factors beyond the dominant reason
   - Threat context suppressed from detail when constraint is already threat/siege (no duplication)
   - Silence = healthy preserved (renders null when primaryConstraint = 'none')

### Tests (18 new tests)

5. **`command_authority.test.ts`**: Wave 12 describe block with 18 tests covering:
   - Healthy → none/null
   - Siege beats everything (priority test with all factors active)
   - Critical threat → threat_pressure
   - Heavy threat → threat_pressure  
   - Must-hold deficit → defensive_duty (over force_condition)
   - Garrison deficit > 2 → defensive_duty
   - No surplus → defensive_duty
   - Heavy exhaustion → force_condition
   - Low combat effectiveness → force_condition
   - Reorganize stance → institutional_strain
   - Command compromised → institutional_strain
   - Defensive stance → institutional_strain
   - Suspended plan → plan_lifecycle
   - Abandoned plan → plan_lifecycle
   - Moderate threat + concentration → threat_pressure (lower priority)
   - Strained command → institutional_strain (lowest non-none)
   - Priority ordering stress test
   - Null commanderState → none

---

## What Changed from Wave 1

Wave 1 showed a flat list: postureSummary + militaryFactors[] + institutionalFactors[] + threatContext + planExplanation.

Wave 2 adds hierarchy: dominantReason (one sentence) + primaryConstraint (classification). The flat list remains as detail below the dominant reason banner.

The UI shifts from "here are all the factors" to "THIS is the main constraint, and here are contributing factors."

---

## Verification

- **tsc**: clean
- **vitest** (lane): 210/210 pass (18 new Wave 12 + 192 existing)
- **vitest** (full): 2144/2164 (20 pre-existing in 6 unrelated files)
- **vite build**: clean (9.07s)
- **governance**: OK
- **Pre-existing evidence**: Same 20 failures as Wave 1, evidenced via `git stash` round-trip on commit `d9d1be4b` (before any explanation surfaces work)

### Pre-Existing Failure Evidence (20 tests, 6 files)

| File | Failures | Failing Tests | Why Unrelated |
|------|----------|---------------|---------------|
| `tests/brigade_posture.test.ts` | 12 | `applyPostureOrders` (3) + `applyPostureCosts` (9) | Tests `brigade_posture.ts` — zero posture files touched. |
| `tests/commander_override.test.ts` | 4 | `commanderReviewAssignment`: mission compliance, excess release, 2x withdraw | Tests `commander_march_correction.ts` — zero march files touched. |
| `tests/corps_front_sector_corps_ownership.test.ts` | 1 | cross-corps brigade claiming | Tests `corps_front_sectors.ts` — zero sector files touched. |
| `tests/desktop_pmtiles_protocol_route.test.ts` | 1 | protocol route rewriting | Tests Electron — zero desktop files touched. |
| `tests/engine_honesty_legacy_contracts.test.ts` | 1 | legacy schema field markers | Tests top-level schema — Wave 2 only touched UI derivation. |
| `tests/war_phase_step_order.test.ts` | 1 | step count stability | Tests war_phases.ts — zero pipeline files touched. |

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/command_strain.ts` | +PrimaryConstraint type, +classifyPrimaryConstraint(), extended CorpsSituationAssessment + deriveCorpsSituationAssessment() |
| `src/ui/map/data/types.ts` | +dominantReason + primaryConstraint on situationAssessment |
| `src/ui/map/components/army_hq/CorpsSituationSection.tsx` | Rewritten: dominant reason banner + constraint badge + detail factors |
| `tests/command_authority.test.ts` | +18 Wave 12 tests + PrimaryConstraint import |

---

## Completion Block

**Canonical owner:** `classifyPrimaryConstraint()` in `command_strain.ts` — priority-ordered constraint classification
**Demoted path:** flat factor lists without hierarchy, prose-first explanation, scattered constraint fragments
**Player-visible truth:** the player sees THE dominant reason with a constraint-type badge, plus detail factors — all derived from real CommanderState
**Canonical UI surface:** `CorpsSituationSection` in Army HQ corps card back-face — dominant reason banner + detail
**Done means:** explanation is decision-useful (player knows what kind of constraint and what the main one is), not just descriptive; QA can verify classification against backend state; silence = healthy preserved
