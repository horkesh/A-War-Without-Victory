# Accessibility P0 Closeout - 2026-05-17

Plan: `docs/plans/2026-05-17-accessibility-p0-closeout-plan.md`

## Scope

Implemented within the requested ownership scope:

- Added focused static regression tests for clickable controls, contrast tokens, reduced motion, and form labels.
- Patched real component offenders discovered under `src/ui/map/components/**`.
- Did not edit `docs/PROJECT_LEDGER.md` or `docs/plans/MASTER_ROADMAP.md` per task instruction.

## P0 Categories

### Clickable Controls - PASS

Replaced clickable non-interactive elements with semantic `button type="button"` controls where they are commands:

- Strategic Dashboard launcher in `BottomStatusStrip.tsx`
- modal/backdrop controls in `GlassPanel.tsx`, `CreditsScreen.tsx`, `PauseMenu.tsx`, `SettingsScreen.tsx`, `StrategicDashboard.tsx`, `StackExpansionOverlay.tsx`, and `WrappedOverlay.tsx`
- Chronicle scrubber ticks in `ChronicleSpine.tsx`
- formation-stack selection and dismiss controls in `StackExpansionOverlay.tsx`

Kept role-button fallbacks where the element is conditionally interactive, and added Space-key activation:

- `CorpsCard.tsx`
- `OOBSidebar.tsx`
- `SettlementDetailContent.tsx`

Regression: `tests/ui/accessibility_clickable_controls.test.ts`

### Contrast Tokens - PASS

Added a token-level WCAG AA guard in `tests/ui/accessibility_contrast_tokens.test.ts`. The current canonical map Tailwind tokens already pass the pinned pairs, so no CSS/token churn was needed.

### Reduced Motion - PASS

Added `tests/ui/accessibility_reduced_motion.test.ts` to pin the existing `prefers-reduced-motion: reduce` and `.user-reduce-motion` global gates in `src/ui/map/styles/globals.css`.

No CSS change was required because the global gate already collapses animation duration, iteration count, transition duration, and scroll behavior.

### Form Labels - PASS

Added `tests/ui/accessibility_form_labels.test.ts` and patched unlabeled or weakly named controls:

- `SettingsScreen.tsx`: `Map quality`
- `ArmyHQCorpsCard.tsx`: corps stance select
- `ArmyHQModal.tsx`: emergency posture select
- `SectorsSection.tsx`: sector stance select
- `AiSettingsPanel.tsx`: explicit radio labels for AI mode choices
- `RecruitmentModal.tsx`: explicit brigade and equipment-class labels

## Verification

Passing:

- `npx.cmd vitest run tests\ui\accessibility_clickable_controls.test.ts tests\ui\accessibility_contrast_tokens.test.ts tests\ui\accessibility_reduced_motion.test.ts tests\ui\accessibility_form_labels.test.ts`
  - 4 files passed, 6 tests passed.
- `npx.cmd vitest run tests\ui\accessibility_clickable_controls.test.ts tests\ui\accessibility_contrast_tokens.test.ts tests\ui\accessibility_reduced_motion.test.ts tests\ui\accessibility_form_labels.test.ts tests\v093_a11y_lane_e_forms_live_regions.test.ts`
  - 5 files passed, 18 tests passed.
- `npm.cmd run desktop:map:build`
  - Vite build completed successfully. Existing browser-externalization/chunk-size warnings remain.
- `npm.cmd run typecheck`
  - Passed.

Not performed:

- Browser/axe spot check. No browser automation was run in this pass; the closeout relies on static tests plus production map build.

## Ledger / Roadmap Notes For Follow-Up

- Ledger note needed: Accessibility P0 closeout added static guards and component-level semantic fixes for clickable controls, contrast-token AA pairs, reduced-motion gates, and form labels.
- Roadmap note needed: v1.0 Accessibility P0 blockers are test-covered; remaining optional follow-up is browser/axe spot-check evidence.
