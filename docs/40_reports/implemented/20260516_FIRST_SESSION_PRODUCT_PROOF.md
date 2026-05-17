# First-Session Product Proof: Onboarding Consolidation

**Date:** 2026-05-16  
**Lane:** AAA+++ Phase 1 Track D - Onboarding consolidation  
**Result:** Engineering proof complete; live browser validation closed on 2026-05-17.

## What changed

- `App.tsx` no longer mounts the legacy `FirstTurnOrientationWrapper` / `FirstTurnOrientationCard` path. First-run education is owned by `OnboardingOverlay`.
- `PeaceWarTransition` is now gated by `peaceWarTransitionGate.ts` plus store load behavior: loading directly into a war save marks the transition seen, while a live peace-to-war loaded-state transition arms the overlay.
- `CoachmarkLayer` adds first-hover tooltips for Decision Room, Operation Opportunity, Chronicle filters, and Codex, persisted via `localStorage`.
- Opening presidential briefs are three scan bullets with `Begin` and `Read later` controls instead of long paragraph blocks.
- Onboarding step 01 now explicitly points the player from opening brief into the Brief -> Inspect -> Decide -> Execute -> Report -> Judge loop.

## First-session Confusion Classification

| Moment | Prior risk | Classification | Resolution |
|---|---|---|---|
| Fresh campaign after side picker | Multiple sequential overlays competed for attention | Tutorial / UX | Removed the separate first-turn orientation mount; onboarding is single-owned. |
| Loading a war save | Peace-war transition could replay on save load | Bug | Store now suppresses direct war-save loads and only arms after a peace-to-war transition. |
| Finding the command board | Decision Room exists but needs first-use literacy | Tutorial | First-hover coachmark on the Decision Room surface. |
| Operation opportunity decisions | Dossier actions are high-impact but easy to miss | Tutorial | First-hover coachmark on the opportunity dossier section. |
| Reviewing campaign history | Chronicle filters were discoverable only by inspection | UX / Tutorial | First-hover coachmark on Chronicle filter controls. |
| Historical/reference context | Codex button was present but not introduced | Tutorial | First-hover coachmark on the Codex toolbar control. |
| Opening faction brief | Long paragraph created first-minute reading friction | UX | Three bullet brief with a read-later affordance. |

## Verification

- `npx.cmd vitest run tests/ui/coachmark_layer.test.ts tests/ui/onboarding_track_d_consolidation.test.ts` passed 5/5.
- `npx.cmd vitest run tests/tutorial_content_v1.test.ts tests/onboarding_spotlight_targets.test.ts tests/v092_tutorial_anchor_coverage.test.ts tests/v092_tutorial_lane_b_auto_dismiss.test.ts tests/v092_tutorial_lane_e_overlay_a11y.test.ts tests/ui/tutorial_persistence.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_presidential_toolbar_summary_click.test.ts tests/ui/first_turn_orientation.test.ts tests/ui/first_turn_orientation_persistence.test.ts tests/ui/coachmark_layer.test.ts tests/ui/onboarding_track_d_consolidation.test.ts` passed 65/65.
- `npx.cmd tsc --noEmit` passed.
- `npm.cmd run desktop:map:build` passed with the existing Vite warnings already tracked for browser-external Node modules, dynamic/static import chunking, and bundle size.
- Browser validation report: `docs/40_reports/implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md`. Decision Room and Chronicle filter coachmark targets were validated in the live Turn 40 tactical shell. The Chronicle filter target was corrected from a `0x0` `display: contents` wrapper to a real filter-row rectangle.

## Residual Validation

- Operation Opportunity coachmark visual proof still requires a save with active opportunity proposals; the latest Turn 40 VRS save did not expose that surface.
- The dormant `FirstTurnOrientationCard` read-model/component remains in the tree for compatibility with existing tests, but it is no longer mounted by the app shell.
