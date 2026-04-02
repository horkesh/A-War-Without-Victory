# 2026-04-02 - Frontline Assignment Helper Alignment

## Summary

Aligned the shared frontline-assignment helper with current sector truth so core combat mechanics and end-of-run reporting no longer quietly disagree about which brigades count as "on the line."

## Root cause

Earlier cleanup had already made several systems sector-aware:

- tactical-map sector orders route through canonical sector overrides
- frontline fatigue treats corps front sectors as primary authority
- player-facing shell no longer exposes front assignment as the main live concept

But the deeper helper `isBrigadeAssignedToFront(...)` still only looked at legacy `brigade_front_assignment`. That meant:

- battle resolution still gated attackers through a legacy-only frontline check
- posture orders still rejected brigades that were sector-assigned but lacked a legacy front assignment
- end-of-run army-strength reporting still counted frontline brigades from the old assignment map only

So the engine had sector truth in one place and legacy frontline truth in another.

## Implementation

### Shared helper

Updated `src/sim/combat/front_assignment.ts`:

- added `buildFrontlineAssignedFormationSet(state)`
- this helper now collects frontline brigades from:
  - `corps_front_sectors[*].assigned_brigade_ids`
  - `corps_front_sectors[*].reserve_brigade_ids`
  - legacy `brigade_front_assignment` as compatibility fallback
- `isBrigadeAssignedToFront(...)` now reads from that unified set

### Fatigue cleanup

Updated `src/state/formation_fatigue.ts`:

- reused the shared `buildFrontlineAssignedFormationSet(...)` helper instead of carrying a private duplicate
- keeps frontline-duty fatigue and frontline combat/posture gating on the same contract

### Reporting alignment

Updated `src/scenario/scenario_end_report.ts`:

- `computeArmyStrengthsSummary(...)` now counts frontline-assigned brigades from the unified helper instead of only from `brigade_front_assignment`
- reporting now matches the sector-first engine contract instead of narrating the older lane as if it were still primary

## Tests

Added / updated:

- `tests/front_assignment.test.ts`
  - proves sector-assigned brigades count as frontline truth even without legacy front assignment
- `tests/scenario_end_report_army_strengths.test.ts`
  - proves army-strength reporting counts sector frontline brigades first, with legacy fallback

## Verification

- `node_modules\\.bin\\tsx.cmd --test tests\\front_assignment.test.ts tests\\formation_fatigue_frontline_assignment.test.ts tests\\scenario_end_report_army_strengths.test.ts`
  - PASS
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

Note:

- `npx.cmd tsc --noEmit -p tsconfig.json` still fails in this worktree due to pre-existing React/JSX typing/tooling issues in `src/ui/map/*`; this slice did not introduce those failures.

## Why this matters

This is a classic half-alive legacy seam:

- sectors had already become the practical frontline authority
- but a shared helper and downstream reporting still behaved as though legacy front assignment owned the truth

That kind of split is exactly how future Claude sessions "repair" the wrong layer. This slice makes one more core contract honest:

- sectors first
- legacy front assignment second
- same rule in mechanics and reporting
