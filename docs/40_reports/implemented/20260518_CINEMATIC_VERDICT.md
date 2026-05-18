# Cinematic Verdict UI Completion

**Date:** 2026-05-18
**Type:** Verdict UI presentation, deterministic share-summary presentation, and visual validation. No victory scoring, Pyrrhic classification, Cost Ledger calculation, historical comparison builder, simulation rule, scenario data, save schema, or generated scenario artifact changed.

## Summary

- Added the cinematic verdict band to the canonical endgame `VerdictScreen`, consuming the existing verdict scene and share-summary read models.
- Preserved upstream scoring truth and source-order historical comparison display while adding a copyable plain-text summary.
- Captured desktop, tablet, and mobile screenshots through the local map shell and documented the remaining mobile polish scope.

## Changes Made

### Verdict Presentation

- Added `CinematicVerdict` as a presentation-only React component over `GameVerdict`, `CostLedger`, and `ComparisonResult`.
- Replaced the old thin verdict header with the cinematic verdict band and widened the modal with viewport constraints.
- Kept the existing faction tabs, faction detail, War Cost summary, milestone comparison, Codex ghost rows, replay surface, and footer intact.

### Share Summary

- Reused `buildVerdictShareSummary(...)` for deterministic plain-text export.
- Added a Copy action using the browser clipboard API.
- Kept the full plain-text preview visible from tablet width upward; mobile shows the action without the long preview to preserve the verdict band.

### Validation

- Added `tests/ui/cinematic_verdict.test.ts` and verified red/green behavior for the missing component.
- Visual validation artifacts live under `docs/40_reports/implemented/visual_validation/20260518_cinematic_verdict/`.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/components/verdict/CinematicVerdict.tsx` | New cinematic verdict band and share-summary presentation. |
| `src/ui/map/components/VerdictScreen.tsx` | Wires the cinematic band into the canonical endgame surface. |
| `tests/ui/cinematic_verdict.test.ts` | Contract test for rendered scene, cost emphasis, comparison, and share summary. |
| `docs/40_reports/implemented/visual_validation/20260518_cinematic_verdict/` | Screenshot probe, metrics, screenshots, and README. |
| `docs/40_reports/GAME_STATE_RATING_MASTER.md` | Updates endgame/verdict scorecard status. |
| `docs/PROJECT_LEDGER.md` | Adds project ledger entry. |

## Verification

- `npx.cmd vitest run tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\verdict_share_summary.test.ts --reporter=dot` passed 6/6.
- `npx.cmd vitest run tests\ui\endgame_verdict_screen_mount.test.ts tests\ui\verdict_visibility.test.ts tests\ui\cinematic_verdict.test.ts --reporter=dot` passed 64/64.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `node docs\40_reports\implemented\visual_validation\20260518_cinematic_verdict\capture.cjs` produced 390x844, 768x1024, and 1440x900 screenshots plus JSON metrics.
- `npm.cmd run typecheck` passed.

## Remaining Polish Scope

- Small-screen endgame should eventually move lower legacy verdict sections into a tabbed or internally scrollable structure. The cinematic verdict copy is visible, but the full legacy War Cost section still exceeds a 390x844 viewport.
