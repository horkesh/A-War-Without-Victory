# LANE-V094-MODAL-MIGRATION — first migration wave (4 modals)

**Date:** 2026-05-05
**Status:** SHIPPED — 4 modals migrated to shared `<Modal>` wrapper.
**Predecessor:** LANE-V094-MODAL-WRAPPER foundation ship (`5fec69a6`).
**Successor (potential):** LANE-V094-MODAL-MIGRATION-2 — remaining modals
(EventDecisionModal, OperationBriefingModal, DaytonNegotiationModal,
PeacePlanModal, CommanderSelectionModal, OpsPlanningModal, ArmyHQModal,
WarroomStatusBar pause overlay, etc.) if the parent decides to push more.

## Outcome

Four modals migrated to consume the shared `<Modal>` wrapper at
`src/ui/shared/Modal.tsx`. Each migration:

- Replaces hand-rolled backdrop+panel markup with the canonical wrapper
- Inherits ESC dismissal, focus trap (focus first focusable on open,
  restore prior focus on close), `role="dialog"` + `aria-modal="true"`,
  Tab cycling, and click-outside dismissal (configurable per modal)
- Routes z-index through the canonical `Z` token (no numeric literals
  added; existing `Z.*` tier preserved per modal)
- Preserves visible behavior: backdrop/panel styling preserved
  via `backdropClassName` / `panelClassName` / `panelStyle` props
- Adds an `aria-labelledby` id to the panel headline so screen readers
  resolve the modal label

### Migrated modals

| Modal | Path | Z tier | Click-outside |
|---|---|---|---|
| RecruitmentModal | `src/ui/map/components/RecruitmentModal.tsx` | `Z.OVERLAY_LIGHT` (120) | preserved (default ON) |
| WarSummaryModal | `src/ui/map/components/WarSummaryModal.tsx` | `Z.MODAL_RAISED_2` (1200) | preserved (default ON) |
| TurnAftermathModal | `src/ui/map/components/TurnAftermathModal.tsx` | `Z.TURN_AFTERMATH` (10000) | preserved OFF (`closeOnBackdropClick={false}`) |
| AdvanceTurnModal | `src/ui/map/components/warroom/AdvanceTurnModal.tsx` | `Z.CRITICAL_MODAL` (9999) | preserved OFF (`closeOnBackdropClick={false}`) |

## Per-modal verification

### Tutorial anchors preserved (Y for all four)

None of the four migrated modals contained a `data-tutorial-step` JSX
attribute before migration; none introduce one in this lane. The
`tests/modal_migration.test.ts` `M4` contract pins this regression-guard
contract at the source level.

```
$ git grep -nP 'data-tutorial-step\s*=' \
    src/ui/map/components/RecruitmentModal.tsx \
    src/ui/map/components/WarSummaryModal.tsx \
    src/ui/map/components/TurnAftermathModal.tsx \
    src/ui/map/components/warroom/AdvanceTurnModal.tsx
(no output — no anchors present, before or after)
```

### Visible behavior preserved (Y for all four)

- **RecruitmentModal:** backdrop = `bg-black/60` (preserved); panel
  geometry preserved verbatim via `panelClassName`; `aria-labelledby`
  preserved on the title element (`recruitment-title`). Click-outside
  dismiss preserved (default ON; original used target===currentTarget
  trick — wrapper achieves the same via stopPropagation on panel).
- **WarSummaryModal:** backdrop preserved as `bg-[rgba(0,0,0,0.55)]`
  (matches original `0.55` alpha exactly); panel inline styles
  (background, border, padding, width, shadow, blur, color) preserved
  verbatim via `panelStyle`. Close button preserved. New
  `aria-labelledby="war-summary-title"` id added to the headline.
- **TurnAftermathModal:** backdrop preserved as `bg-black/70 px-4`;
  panel classes preserved verbatim via `panelClassName`; original markup
  had no click-outside dismiss — preserved with
  `closeOnBackdropClick={false}`. New `aria-labelledby="turn-aftermath-title"`
  added to the "Turn Aftermath" eyebrow div.
- **AdvanceTurnModal:** backdrop preserved as `bg-black/65 px-4`; panel
  classes preserved verbatim; original markup had no click-outside
  dismiss — preserved with `closeOnBackdropClick={false}`. The advance
  guard (`advancing` state) is preserved through `handleCancel` (passed
  as `onClose`); ESC during advance routes to handleCancel which is a
  no-op while advancing. New `aria-labelledby="advance-turn-title"`
  added to the "End of Turn" eyebrow div.

### Aria contracts preserved or improved

All four modals now expose `role="dialog"` + `aria-modal="true"` (from
the wrapper, replacing per-modal hand-rolled or absent attributes), plus
an `aria-labelledby` referencing a stable id inside the panel.
RecruitmentModal previously hand-rolled its own `role="dialog"` markup
plus `aria-labelledby="recruitment-title"`; both contracts preserved
through the wrapper. The other three modals previously had no aria
contract on the dialog wrapper — improved.

### Z-index canonical (Y for all four)

Each modal continues to import `Z` from `src/ui/shared/zIndex` and pass
its tier via the wrapper's `zIndex` prop. No raw numeric literals.
`tests/z_index_canonical.test.ts` T4/T4b/T4c continues GREEN for all
four files post-migration.

## Files

Migrated (4):
- `src/ui/map/components/RecruitmentModal.tsx`
- `src/ui/map/components/WarSummaryModal.tsx`
- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx`

Tests (NEW):
- `tests/modal_migration.test.ts` — 21 tests covering the per-modal
  source contract: M1 imports `Modal`, M2 still imports `Z`, M3 no
  residual numeric `zIndex` literal mapped to a shell tier, M4 no
  `data-tutorial-step` JSX attribute introduced/stripped, A1
  `ariaLabelledBy` and corresponding panel `id=` present, plus a
  cross-target check that no migrated modal still hand-rolls
  `role="dialog"`.

Report (NEW):
- `docs/40_reports/implemented/20260505_V094_MODAL_MIGRATION.md` (this
  file).

## Verification

- `npx tsc --noEmit`: clean
- `npx vitest run tests/modal_migration.test.ts tests/modal_wrapper.test.ts tests/z_index_canonical.test.ts tests/ui_army_hq_war_summary_visibility.test.ts tests/warroom_shell_layer.test.ts tests/tutorial_objectives.test.ts tests/tutorial_onboarding_skeleton.test.ts tests/tutorial_content_v1.test.ts`: 89/89 GREEN
- `npx vitest run tests/ui_map_render_smoke.test.ts tests/ui_map_interactions.test.ts tests/ui_shell_navigation.test.ts tests/ui_adapter_boundary.test.ts tests/recruitment_engine.test.ts`: 115/115 GREEN
- `npx vitest run tests/ui/turn_aftermath.test.ts tests/ui/pre_advance_command_review.test.ts`: 14/14 GREEN
- `npm run desktop:map:build`: clean (3.4 MB tactical_map JS bundle, 16.6s)

## Sensitive-history compliance

- Ring 1 / no §6 surface (UI-only migration; no engine path entered)
- Faction-symmetric mechanism — wrapper is data-driven, no faction
  branching introduced, palette unchanged
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  `enclave_resilience.ts` touched
- Z-index from canonical source (`src/ui/shared/zIndex.ts`) preserved
  in every migration
- `factionPalette.ts` untouched (canonical source preserved byte-stable)
- `Modal.tsx` wrapper untouched (consumed only)
- `src/sim/`, `data/scenarios/` untouched
- Tutorial onboarding `data-tutorial-step` anchor contract preserved
  per modal (all four had no anchors pre-migration; none introduced)

## Note on lane scope

Lane targeted 3-4 modals to keep risk bounded. Spec named modals that
do not actually exist in the codebase (SettingsModal, MagazineModal,
CommandBriefingModal, IvpBreakdownModal, DiplomacyModal — only
`SettingsScreen.tsx` and `DiplomacyOverview.tsx` exist as related
shells; the others were never authored). Substituted four real
candidates with similar risk profiles: RecruitmentModal (lowest risk —
already had aria + click-outside), WarSummaryModal (clean
fixed-inset backdrop pattern), TurnAftermathModal and AdvanceTurnModal
(no click-outside dismiss; preserved via `closeOnBackdropClick={false}`).
None of the four contain tutorial anchors — preserves lane safety
guarantee at the source level.
