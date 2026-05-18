# Endgame Small-Screen Verdict Flow

**Date:** 2026-05-18
**Scope:** UI-only verdict presentation polish. No scoring, simulation, Cost Ledger, historical comparison, save schema, scenario data, or generated scenario artifact changed.

## Summary

- Added a mobile lower-flow section switcher to `VerdictScreen` so the dense legacy report content no longer stacks all at once below the cinematic verdict band on 390px screens.
- Kept desktop/tablet behavior as the existing stacked scrollable report by using responsive classes: inactive sections collapse only below the `sm` breakpoint.
- Tightened mobile-only spacing in `CinematicVerdict` and the verdict footer to keep the cinematic band visible while giving the lower report flow usable scroll height.
- Preserved the existing faction tabs, faction report, War Cost summary, milestone comparison, Codex ghosts, replay section, share summary, and footer actions.

## Implementation Notes

- `data-awwv-mobile-verdict-flow` records the active lower section for regression tests and browser metrics.
- Available mobile sections are derived deterministically from existing content availability:
  - `report` always exists.
  - `reckoning` exists when Cost Ledger and historical comparison packets exist.
  - `codex` exists when ghost entries exist.
  - `replay` exists when replay frames or manifest exist.
- Active mobile sections render as `block`; inactive sections render as `hidden sm:block`, preserving the full stacked desktop flow.

## Visual Validation

Artifacts: `docs/40_reports/implemented/visual_validation/20260518_endgame_small_screen_verdict_flow/`

| Capture | Result |
|---|---|
| `mobile_390x844_report.png` | Cinematic band visible; `Report` active; reckoning collapsed. |
| `mobile_390x844_reckoning.png` | Cinematic band visible; `Reckoning` active; report collapsed. |
| `desktop_1440x900_overview.png` | Desktop retains stacked report and reckoning sections in the scroll pane. |

Key metrics from `summary.json`:

- 390px mobile cinematic band: `364x343`.
- 390px mobile lower flow: `364x361`.
- Mobile `report` active: report box `364x694`, reckoning `0x0`.
- Mobile `reckoning` active: reckoning box `364x569`, report `0x0`.

## Verification

- `npm.cmd exec -- vitest run tests/ui/cinematic_verdict.test.ts tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/endgame_interaction_proof.test.ts tests/ui/endgame_presentation_proof.test.ts tests/ui/endgame_live_store_proof.test.ts tests/ui/verdict_visibility.test.ts tests/ui/verdict_scene.test.ts tests/ui/verdict_share_summary.test.ts` passed 124/124.
- `npm.cmd run typecheck` passed.
- `node docs\40_reports\implemented\visual_validation\20260518_endgame_small_screen_verdict_flow\capture.cjs` produced the screenshots and metrics above.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/components/VerdictScreen.tsx` | Adds mobile section flow, responsive lower-section visibility, compact mobile footer, and regression selectors. |
| `src/ui/map/components/verdict/CinematicVerdict.tsx` | Tightens mobile-only spacing while preserving the same upstream verdict/share content. |
| `tests/ui/endgame_interaction_proof.test.ts` | Adds mobile flow interaction proof and updates stale text assumptions to stable surface contracts. |
| `docs/40_reports/implemented/visual_validation/20260518_endgame_small_screen_verdict_flow/` | Adds capture script, screenshots, metrics, and visual README. |

## Remaining Polish

- The active lower pane still scrolls internally on 390px screens, which is expected for the full legacy report/reckoning content. Further polish could make the faction report itself sub-sectioned, but this pass intentionally kept all existing verdict content and behavior intact.
