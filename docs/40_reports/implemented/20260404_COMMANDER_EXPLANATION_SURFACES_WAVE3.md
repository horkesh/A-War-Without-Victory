# Commander Explanation Surfaces Wave 3 — Implementation Report

**Date:** 2026-04-04
**Lane:** v0.8-to-v0.9 Commander Explanation Surfaces
**Plan:** `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`
**Status:** COMPLETE

---

## Summary

Wave 3 adds relief path explanation — what would need to change for the constraint to ease. The player now sees not just the dominant reason and its type, but what specific change would relieve the bottleneck. All grounded in real state. No fake forecasting.

---

## Orchestrator Report

### Subagents Used

| Workstream | Role | Ownership | Key Finding |
|---|---|---|---|
| WS-A | Technical Architect | Relief-path truthfulness per constraint type | All 7 types have truthful paths; threat_pressure weakest — use honest "hold + request reinforcement" framing |
| WS-B | UI/UX Developer | Surface fit and placement | Relief path as single subtitle line after badge+reason, arrow icon, neutral-400, always visible |
| WS-C | Gameplay Programmer | Field provenance verification | All fields confirmed available (deficit, exhaustion, commandStrain, stabilizationCostCA, recoveryForecast, suspension_reason) — no new data sources needed |
| WS-D | QA Engineer | Test baseline + test plan | 210/210 baseline confirmed; 9 test cases defined (7 constraint types + 2 null cases) |

### What Changed from Subagent Findings
- All four recommendations accepted without modification
- WS-A's threat_pressure framing adopted: name what player CAN do (reinforce, hold), not what enemy will do
- WS-B's placement recommendation adopted: arrow + neutral-400 subtitle after dominant reason
- WS-C confirmed zero new data sources needed — pure extension of existing classifyPrimaryConstraint()

### What Was NOT Delegated
- Final integration code (derivation + UI + tests) — done centrally to avoid overlapping edits
- Documentation — done centrally after verification

---

## What Was Implemented

### Derivation (1 file, ~30 new lines)

1. **`command_strain.ts`**: `reliefPath: string | null` added to `CorpsSituationAssessment`. `classifyPrimaryConstraint()` return type extended. Each constraint return now includes a grounded relief path:
   - **siege**: "Requires breaking the encirclement or widening the corridor"
   - **threat_pressure (critical)**: "Hold defensive positions and absorb the offensive; request reinforcement"
   - **threat_pressure (heavy)**: "Stabilize the front through sustained defense"
   - **defensive_duty (must-hold)**: "Requires {N} additional brigades or consolidation"
   - **defensive_duty (deficit)**: "Requires {N} additional brigades or reduced garrison burden"
   - **defensive_duty (no surplus)**: "Free surplus by receiving reinforcement or consolidating"
   - **force_condition (exhaustion >=60)**: "Exhaustion at {N}% — requires reduced operational tempo"
   - **force_condition (low effectiveness)**: "Rotate depleted brigades; bring replacements forward"
   - **force_condition (exhaustion >=40)**: "Exhaustion at {N}% — limit operations for recovery"
   - **institutional (reorganize)**: "Change stance when reorganization complete"
   - **institutional (compromised)**: "Stabilize command relationship or allow natural decay"
   - **institutional (defensive)**: "Change stance to balanced or offensive"
   - **plan (suspended)**: "Address suspension cause; resumes when conditions improve"
   - **plan (abandoned)**: "Commander evaluates new objectives when surplus permits"
   - **threat (concentration)**: "Reinforce threatened sectors"
   - **institutional (strained)**: "Avoid further interventions; strain decays naturally"
   - **none**: null (silence)

### Type (1 file, ~2 lines)

2. **`types.ts`**: `reliefPath: string | null` added to `situationAssessment` shape.

### UI (1 file, ~5 new lines)

3. **`CorpsSituationSection.tsx`**: Relief path rendered as arrow (→) + neutral-400 text between dominant reason banner and detail factors. Hierarchy: badge+reason → relief path → detail.

### Tests (9 new tests)

4. **`command_authority.test.ts`**: Wave 13 describe block:
   - siege → mentions "encirclement"
   - threat_pressure (critical) → mentions "reinforcement"
   - defensive_duty (deficit) → mentions brigade count + "brigade"
   - force_condition (exhaustion) → mentions exact % + "recover"
   - institutional (compromised) → mentions "stabilize" or "decay"
   - institutional (defensive stance) → mentions "stance"
   - plan_lifecycle (suspended) → mentions "suspension"
   - none → null
   - null commanderState → null

---

## Verification

- **tsc**: clean
- **vitest** (lane): 219/219 pass (9 new Wave 13 + 210 existing)
- **vitest** (full): 2153/2173 (20 pre-existing in 6 unrelated files, evidenced via git stash on d9d1be4b)
- **vite build**: clean (6.56s)
- **governance**: OK

### Pre-Existing Failure Evidence

Same 20 failures in same 6 files as Waves 1+2, evidenced via `git stash` round-trip on commit `d9d1be4b` (before any explanation surfaces work). Wave 3 touched only `command_strain.ts`, `types.ts`, `CorpsSituationSection.tsx`, `command_authority.test.ts` — zero overlap with any failing file.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/command_strain.ts` | +reliefPath on interface + classifyPrimaryConstraint return type + 17 relief strings |
| `src/ui/map/data/types.ts` | +reliefPath on situationAssessment |
| `src/ui/map/components/army_hq/CorpsSituationSection.tsx` | +relief path line (arrow + neutral-400) |
| `tests/command_authority.test.ts` | +9 Wave 13 tests |

---

## Completion Block

**Canonical owner:** `classifyPrimaryConstraint()` in `command_strain.ts` — now returns `reliefPath` alongside `dominantReason` and `primaryConstraint`
**Demoted path:** fake advisory theater, outcome-promising forecasts, scattered "what to do" fragments
**Player-visible truth:** the player sees what would need to change for the constraint to ease — grounded in real state (deficit counts, exhaustion %, stance, strain decay)
**Canonical UI surface:** `CorpsSituationSection` in Army HQ corps card — hierarchy: badge+reason → relief path → detail
**Done means:** explanation is actionable (player knows what bottleneck to address), not just descriptive or classifying; no fake forecasting; silence = healthy preserved
