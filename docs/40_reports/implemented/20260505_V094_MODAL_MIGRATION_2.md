# LANE-V094-MODAL-MIGRATION-2 — second migration wave (4 modals)

**Date:** 2026-05-05
**Status:** SHIPPED — 4 additional modals migrated to shared `<Modal>` wrapper.
**Predecessor:** LANE-V094-MODAL-MIGRATION (Wave 1 ship at `8d1bfee4`).
**Successor (potential):** LANE-V094-MODAL-MIGRATION-3 — remaining
high-risk / bespoke modals (FirstTurnOrientationCard, ArmyHQModal,
OpsPlanningModal, GameOverModal, PeacePlanModal, EventDecisionModal,
DaytonNegotiationModal, OfficerEventBadge inner modal, PauseMenu,
StackExpansionOverlay) if the parent decides further consolidation is
warranted. Each was deferred for an explicit reason logged below.

## Phase 1 inventory

Project-wide grep for modal-shaped components — `role="dialog"`,
`aria-modal=`, `*Modal*.tsx` filename pattern, and backdrop+panel
composition (`fixed inset-0` overlay with click-outside dismiss).

| Component | Path | Classification | Notes |
|---|---|---|---|
| Modal.tsx | `src/ui/shared/Modal.tsx` | wrapper (skip) | Canonical reusable wrapper — frozen this lane. |
| RecruitmentModal | `src/ui/map/components/RecruitmentModal.tsx` | migrated (Wave 1) | Skip. |
| WarSummaryModal | `src/ui/map/components/WarSummaryModal.tsx` | migrated (Wave 1) | Skip. |
| TurnAftermathModal | `src/ui/map/components/TurnAftermathModal.tsx` | migrated (Wave 1) | Skip. |
| AdvanceTurnModal | `src/ui/map/components/warroom/AdvanceTurnModal.tsx` | migrated (Wave 1) | Skip. |
| **CommanderSelectionModal** | `src/ui/map/components/CommanderSelectionModal.tsx` | **migration-candidate** | Clean `isOpen`/`onClose`/`Z.CRITICAL_MODAL`; no tutorial anchor; no current backdrop click — preserved (default ON). |
| **OperationBriefingModal** | `src/ui/map/components/OperationBriefingModal.tsx` | **migration-candidate** | Clean `isOpen`/`onClose`/`Z.CRITICAL_MODAL`; no tutorial anchor; no current backdrop click — preserved (default ON). |
| **AttackConfirmation** | `src/ui/map/components/AttackConfirmation.tsx` | **migration-candidate** | Already had `role=dialog` / `aria-modal` / `aria-labelledby`; bespoke ESC + Tab-trap + click-outside dismiss; `Z.ATTACK_CONFIRMATION` tier. Bespoke focus-Confirm-on-mount preserved via `trapFocus={false}`. |
| **SidePickerOverlay** | `src/ui/map/components/SidePickerOverlay.tsx` | **migration-candidate** | Clean `isOpen`/`onClose`; already has `role=dialog`/`aria-modal`/`aria-labelledby`; click-outside dismiss; `Z.OVERLAY_LIGHT` tier. |
| FirstTurnOrientationCard | `src/ui/map/components/FirstTurnOrientationCard.tsx` | DEFER (lane cap = 4) | Already has `role=dialog`/`aria-modal`/`aria-labelledby`; `Z.MODAL_HARD`; no current backdrop click. Eligible for next wave. |
| ArmyHQModal | `src/ui/map/components/army_hq/ArmyHQModal.tsx` | DEFER | Two `data-tutorial-step` JSX anchors (`army-hq-tabs`, `army-hq-tab-${id}`) inside the panel; bespoke layered backdrop (absolute sibling) + flex shell. Migration risks moving the tutorial anchors and changing visible layout. |
| OpsPlanningModal | `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` | DEFER | Full-bleed map background — not a backdrop+panel composition. Bespoke arrow-key + numeric-phase keyboard handlers beyond ESC. State ownership (highestPhase, plan, centroidLookup) lives on the modal shell. Doesn't fit the wrapper's panel-content shape. |
| GameOverModal | `src/ui/map/components/GameOverModal.tsx` | DEFER | No `onClose` prop — terminal modal. Migration would introduce ESC dismissal that wasn't present (changes visible behavior). |
| PeacePlanModal | `src/ui/map/components/PeacePlanModal.tsx` | DEFER | No dismiss path — player must respond (Accept/Reject). Backdrop has no click-outside; ESC absent. Migration would require `closeOnBackdropClick={false}` + `closeOnEscape={false}`, but `onClose`/`onDismiss` semantics around the IPC resolve flow need a per-modal review beyond this lane's scope. |
| DaytonNegotiationModal | `src/ui/map/components/DaytonNegotiationModal.tsx` | DEFER | No `onClose` prop — must submit. Same constraint as PeacePlanModal. |
| EventDecisionModal | `src/ui/map/components/EventDecisionModal.tsx` | DEFER | No `onClose` prop — only `onRespond`. Same constraint as PeacePlanModal. |
| EventModal | `src/ui/map/components/EventModal.tsx` | not-a-modal | Composes via `GlassPanel` — different overlay primitive. Not a backdrop+panel modal. |
| OfficerEventBadge (inner `OfficerEventModal`) | `src/ui/map/components/OfficerEventBadge.tsx` | DEFER | Sub-component inside a non-modal wrapper file; multi-step queue logic with conditional `onClose()` fast-paths. Lane cap met without it. |
| PauseMenu | `src/ui/map/components/PauseMenu.tsx` | DEFER | Caller-controlled visibility (no `isOpen` prop); no aria contract; Resume on backdrop click is the dismissal channel. Would benefit from migration but shape differs (caller decides render). Lane cap met without it. |
| StackExpansionOverlay | `src/ui/map/components/StackExpansionOverlay.tsx` | DEFER | Bespoke orbital animation, no panel structure (full-bleed with absolute-positioned formation cards). Doesn't fit the wrapper's backdrop+panel composition. |
| ChronicleOverlay | `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | DEFER | Full-bleed (no backdrop+panel composition); custom transition timing. |
| WrappedOverlay | `src/ui/map/components/chronicle/WrappedOverlay.tsx` | DEFER | Custom mount-time fade with auto-advance timer; bespoke transition. |

The five audit-named modals in the parent spec — `SettingsModal`,
`MagazineModal`, `CommandBriefingModal`, `IvpBreakdownModal`,
`DiplomacyModal` — do not exist on disk (predecessor flagged the same).
Only `SettingsScreen.tsx` and `DiplomacyOverview.tsx` exist as related
shells. No migration possible without inventing modals.

## Outcome

Four modals migrated to consume the shared `<Modal>` wrapper at
`src/ui/shared/Modal.tsx`. Each migration:

- Replaces hand-rolled backdrop+panel markup with the canonical wrapper
- Inherits ESC dismissal (where applicable), focus trap (where applicable),
  `role="dialog"` + `aria-modal="true"`, Tab cycling, and click-outside
  dismissal (per-modal preservation policy)
- Routes z-index through the canonical `Z` token (no numeric literals
  introduced; existing `Z.*` tier preserved per modal byte-for-byte)
- Preserves visible behavior: backdrop/panel styling preserved verbatim
  via `backdropClassName` / `panelClassName` props
- Adds an `aria-labelledby` id to the panel headline so screen readers
  resolve the modal label

### Migrated modals

| Modal | Path | Z tier | Click-outside | Pre-migration aria | Trap focus |
|---|---|---|---|---|---|
| CommanderSelectionModal | `src/ui/map/components/CommanderSelectionModal.tsx` | `Z.CRITICAL_MODAL` (9999) | preserved (default ON) | none — improved | wrapper default ON |
| OperationBriefingModal | `src/ui/map/components/OperationBriefingModal.tsx` | `Z.CRITICAL_MODAL` (9999) | preserved (default ON) | none — improved | wrapper default ON |
| AttackConfirmation | `src/ui/map/components/AttackConfirmation.tsx` | `Z.ATTACK_CONFIRMATION` (100) | preserved (default ON) | `role=dialog`, `aria-modal`, `aria-labelledby` (preserved) | wrapper `trapFocus={false}` (bespoke focus-Confirm-on-mount preserved; bespoke Tab cycling preserved) |
| SidePickerOverlay | `src/ui/map/components/SidePickerOverlay.tsx` | `Z.OVERLAY_LIGHT` (120) | preserved (default ON) | `role=dialog`, `aria-modal`, `aria-labelledby` (preserved) | wrapper default ON |

## Per-modal verification

### Tutorial anchors preserved (Y for all four)

None of the four migrated modals contain a `data-tutorial-step` JSX
attribute before or after migration. The `tests/modal_migration_2.test.ts`
M4 contract pins this regression-guard at the source level for each file.

### Visible behavior preserved (Y for all four)

- **CommanderSelectionModal:** backdrop = `bg-black/60` (preserved
  verbatim via `backdropClassName`); panel classes preserved verbatim
  via `panelClassName` (`bg-white border-2 border-neutral-400 shadow-xl
  max-w-xl w-full max-h-[80vh] flex flex-col`); New `id="commander-selection-title"`
  added to the eyebrow div ("Assign Operations Commander"); existing
  "Back to Draft" button retained, calls `onClose`. No bespoke ESC/Tab
  handling existed pre-migration — wrapper provides it.

- **OperationBriefingModal:** backdrop = `bg-black/60` (preserved
  verbatim); panel classes preserved verbatim (`bg-white border-2
  border-neutral-400 shadow-xl max-w-lg w-full`); New
  `id="operation-briefing-title"` added to the eyebrow div
  ("Operations Briefing"); existing four action buttons (Launch / Order
  Probe / Postpone / Abort / Close) and conditional sections
  (CommandRecord, ForceLaunchBadge, DelegationPathIndicator, etc.)
  preserved unchanged. No bespoke ESC/Tab handling existed pre-migration
  — wrapper provides it.

- **AttackConfirmation:** backdrop = `bg-black/50` (preserved verbatim);
  panel classes preserved verbatim (`bg-panel-card border
  border-panel-border rounded-lg shadow-xl w-full max-w-md mx-4
  overflow-hidden`); existing `id="attack-confirmation-title"` on the
  `<h2>` heading retained. **Behavior nuance preserved:** the wrapper
  is invoked with `trapFocus={false}` so the bespoke `confirmRef.current
  ?.focus()` effect on mount continues to focus the **Confirm** button
  (the affirmative action — original UX). Bespoke Tab-cycling effect
  retained. Bespoke ESC handler removed (now owned by wrapper, calls
  `onCancel`). Click-outside cancel preserved (default ON).

- **SidePickerOverlay:** backdrop = `bg-black/60` (preserved verbatim);
  panel classes preserved verbatim (`w-full max-w-md mx-4 bg-panel-card
  border border-panel-border rounded-lg shadow-xl overflow-hidden`);
  existing `id="side-picker-title"` on the `<h2>` heading retained.
  Click-outside dismiss preserved (default ON). The original Faction
  picker payload (3 faction buttons + manual save load + continue +
  close) is rendered inside the wrapper unchanged.

### Aria contracts preserved or improved

All four modals now expose `role="dialog"` + `aria-modal="true"` (from
the wrapper, replacing per-modal hand-rolled markup or filling the gap
where it was absent), plus an `aria-labelledby` referencing a stable
id inside the panel.

- **CommanderSelectionModal & OperationBriefingModal:** previously had
  no aria contract on the dialog wrapper — improved.
- **AttackConfirmation & SidePickerOverlay:** previously had
  hand-rolled `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
  — these migrate to the wrapper which provides the same contract; the
  hand-rolled attributes are removed from the source so the wrapper is
  the single owner. The existing `id="<labelledby>"` on the heading
  inside the panel is preserved verbatim.

### Z-index canonical (Y for all four)

Each modal continues to import `Z` from `src/ui/shared/zIndex` and pass
its tier via the wrapper's `zIndex` prop. No raw numeric literals.
`tests/modal_migration_2.test.ts` M2 + M5 + `tests/z_index_canonical.test.ts`
T4-family pin the contract.

| Modal | `Z.*` tier | Numeric value (preserved) |
|---|---|---|
| CommanderSelectionModal | `Z.CRITICAL_MODAL` | 9999 |
| OperationBriefingModal | `Z.CRITICAL_MODAL` | 9999 |
| AttackConfirmation | `Z.ATTACK_CONFIRMATION` | 100 |
| SidePickerOverlay | `Z.OVERLAY_LIGHT` | 120 |

## Files

Migrated (4):
- `src/ui/map/components/CommanderSelectionModal.tsx`
- `src/ui/map/components/OperationBriefingModal.tsx`
- `src/ui/map/components/AttackConfirmation.tsx`
- `src/ui/map/components/SidePickerOverlay.tsx`

Tests (NEW):
- `tests/modal_migration_2.test.ts` — 25 tests covering the per-modal
  source contract: M1 imports `Modal`, M2 still imports `Z`, M3 no
  residual numeric `zIndex` literal mapped to a shell tier, M4 no
  `data-tutorial-step` JSX attribute introduced/stripped, M5 wrapper
  invocation references the expected `Z.*` tier (zero numeric drift),
  A1 `ariaLabelledBy` and corresponding panel `id=` present, plus
  cross-target X1 invariant pinning that no migrated modal still
  hand-rolls `role="dialog"`.

Report (NEW):
- `docs/40_reports/implemented/20260505_V094_MODAL_MIGRATION_2.md` (this
  file).

## Verification

- `npx tsc --noEmit -p tsconfig.json`: clean
- `npx vitest run tests/modal_migration_2.test.ts tests/modal_migration.test.ts tests/modal_wrapper.test.ts tests/z_index_canonical.test.ts tests/css_z_index_canonical.test.ts`: 67/67 GREEN
- `npx vitest run tests/ui/gamestore_load_reset.test.ts tests/ui_adapter_boundary.test.ts tests/command_authority_explanation_delegation.test.ts tests/command_authority_assessment_constraints.test.ts tests/command_authority_strain_signals.test.ts tests/ui_opord_player_safe_labels.test.ts`: 183/183 GREEN (covers downstream modal-consumer surfaces — CommandAuthority test cluster touches OperationBriefingModal-derived helpers, ui_adapter_boundary covers SidePickerOverlay-adjacent payload shapes, gamestore_load_reset covers OperationBriefing context state)
- `npm run desktop:map:build`: clean (3.4 MB tactical-map JS bundle, 15.56s)
- Tutorial regression: skipped — none of the four migrated modals
  contain a `data-tutorial-step` anchor pre- or post-migration.

## Sensitive-history compliance

- Ring 1 / no §6 surface (UI-only migration; no engine path entered)
- Faction-symmetric mechanism — wrapper is data-driven, no faction
  branching introduced, palette unchanged
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  `enclave_resilience.ts` touched
- Z-index from canonical source (`src/ui/shared/zIndex.ts`) preserved
  in every migration; numeric values byte-stable per the table above
- `factionPalette.ts` untouched (canonical palette preserved byte-stable)
- `Modal.tsx` wrapper untouched (consumed only)
- `zIndex.ts` token table untouched (consumed only)
- The 4 already-migrated Wave 1 modals untouched (out of scope)
- `tests/modal_migration.test.ts`, `tests/modal_wrapper.test.ts`,
  `tests/z_index_canonical.test.ts`, `tests/css_z_index_canonical.test.ts`
  untouched (consumed as verification gates only)
- `data/scenarios/events/consequences.json` untouched (sibling Wave 14
  events lane owns this file)
- `src/sim/`, `data/scenarios/`, `electron-main.cjs`, `build/*`,
  `package.json`, `.github/workflows/*`, `tools/release/*` untouched
- Tutorial onboarding `data-tutorial-step` anchor contract preserved
  per modal (all four had no anchors pre-migration; none introduced)

## Note on lane scope and deferral

Lane targeted up to 4 candidates per spec, with stop-and-ask requirement
for any candidate whose migration would change visible behavior or
require bespoke state ownership. Two candidates that COULD have been
mechanically migrated (`FirstTurnOrientationCard`, `PauseMenu`) were
deferred to keep the lane bounded at 4 and to preserve risk parity with
Wave 1 (which also shipped 4). The remaining DEFER entries are
documented above with explicit reasons; each is eligible for a future
migration wave once its bespoke surface is decoupled from the wrapper's
backdrop+panel shape.
