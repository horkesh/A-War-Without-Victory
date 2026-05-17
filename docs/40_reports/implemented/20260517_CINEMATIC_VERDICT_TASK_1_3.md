# Cinematic Verdict Task 1 and Task 3

**Date:** 2026-05-17
**Result:** Implemented pure verdict scene/read-model and deterministic share summary only.

## Summary
- Added a pure verdict scene builder that reads existing `GameVerdict`, `CostLedger`, and `ComparisonResult` packets without changing scoring, Cost Ledger generation, or historical comparison builders.
- Added a deterministic plain-text share summary that includes focused outcome class, Cost Ledger headline, historical comparison, and canonical faction outcomes.
- Covered Pyrrhic, catastrophic, early-peace, deterministic output, and missing-packet fallbacks with focused Vitest tests.

## Changes Made
### Verdict Scene Model
- `src/ui/map/data/verdictScene.ts` creates the presentation read-model for tone, headline, cost emphasis, and comparison callouts.
- Tone selection is deterministic and presentation-only: early peace comes from peace-plan/duration signals, catastrophic from collapse/condemnation/rupture signals, and Pyrrhic from existing outcome classes.

### Shareable Summary
- `src/ui/map/data/verdictShareSummary.ts` formats a stable plain-text summary from the same upstream packets.
- Faction outcomes use the canonical display order `RBiH`, `RS`, `HRHB`, with unknown factions sorted after those keys.

### Tests
- `tests/ui/verdict_scene.test.ts` covers Pyrrhic, catastrophic, and early-peace scene selection.
- `tests/ui/verdict_share_summary.test.ts` covers deterministic plain-text output and missing input fallbacks.

## Boundaries Preserved
- No victory scoring changes.
- No Cost Ledger builder changes.
- No historical comparison builder changes.
- No `VerdictScreen` UI changes or broad UI restyle.
- No edits to `docs/PROJECT_LEDGER.md` or `docs/plans/MASTER_ROADMAP.md`.

## Verification
- `npx.cmd vitest run tests\ui\verdict_scene.test.ts tests\ui\verdict_share_summary.test.ts`
- `npm.cmd run typecheck`

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/verdictScene.ts` | New pure verdict scene read-model |
| `src/ui/map/data/verdictShareSummary.ts` | New deterministic plain-text share summary |
| `tests/ui/verdict_scene.test.ts` | Focused tests for Task 1 |
| `tests/ui/verdict_share_summary.test.ts` | Focused tests for Task 3 |
| `docs/40_reports/implemented/20260517_CINEMATIC_VERDICT_TASK_1_3.md` | Implemented report |

## Next Steps
- Task 2 can consume `buildVerdictScene(...)` in a component without moving scoring or Cost Ledger ownership.
- Task 4 visual validation remains separate because this slice did not implement the cinematic UI component.
