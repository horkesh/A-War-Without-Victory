# LANE-V094-MODAL-DISMISSIBLE-EXTENSION — substrate extension + Wave 3 migration

**Date:** 2026-05-05
**Status:** SHIPPED — `<Modal>` substrate extended with optional `onClose` +
`dismissible` prop; 4 must-respond / terminal modals migrated to consume
the wrapper.
**Predecessor:** LANE-V094-MODAL-MIGRATION-2 (Wave 2 ship at
`20260505_V094_MODAL_MIGRATION_2.md`).
**Audit gap addressed:** 4A from 2026-05-05 trip-session-4 proposal (the
4 modals that Wave 2 deferred for "no dismiss path" / "no `onClose`"
reasons).

## Phase 1 — substrate extension (Modal.tsx)

The shared `<Modal>` wrapper at `src/ui/shared/Modal.tsx` was extended
with two backward-compatible API surface changes:

1. `onClose` is now `() => void | undefined` (was `() => void` required).
2. New optional prop `dismissible?: boolean` (default `true`).

### Behavior contract (from JSDoc on the prop)

| `dismissible` | `onClose` | ESC | Click-outside | Notes |
|---|---|---|---|---|
| `true` (default) | provided | calls `onClose` | calls `onClose` | Wave 1 backward-compat |
| `true` (default) | undefined | no-op | no-op | guarded via `?.()` |
| `false` | provided | not installed | not installed | parent owns close path |
| `false` | undefined | not installed | not installed | terminal / must-respond |

### Implementation summary

- ESC `useEffect` early-returns when `!dismissible`. Master switch overrides
  `closeOnEscape`.
- Backdrop click handler early-returns when `!dismissible`. Master switch
  overrides `closeOnBackdropClick`.
- All `onClose()` invocations changed to `onClose?.()` so undefined
  callbacks are no-op rather than crash.
- Effect dep array updated to include `dismissible`.
- File-header docstring + `dismissible` JSDoc explicitly document the
  master-switch precedence and backward-compat guarantees.

### Phase 1 diff size

`src/ui/shared/Modal.tsx`: +56 / -8 LOC (net +48). The bulk of the diff
is the `dismissible` JSDoc block + extended file-header docstring —
runtime-effect changes are 4 lines (one early-return guard each on ESC
and backdrop, one optional-call guard on each, one new dep-array entry).

### Backward compatibility

The 8 existing migrated consumers (Wave 1: RecruitmentModal,
WarSummaryModal, TurnAftermathModal, AdvanceTurnModal — Wave 2:
CommanderSelectionModal, OperationBriefingModal, AttackConfirmation,
SidePickerOverlay) ALL continue to work without source-level changes:

- They pass `onClose: () => void` (still the required-shape they were
  migrated against — TypeScript optional makes this a strict superset).
- They omit `dismissible`, so the default `true` preserves Wave 1
  behavior byte-for-byte.
- `tests/modal_wrapper.test.ts` (10/10), `tests/modal_migration.test.ts`
  (21/21), and `tests/modal_migration_2.test.ts` (25/25) all pass
  unchanged after the extension.

## Phase 2 — migrate 4 modals

| Modal | Path | Z tier | `dismissible` | aria contract | Bespoke handlers preserved |
|---|---|---|---|---|---|
| GameOverModal | `src/ui/map/components/GameOverModal.tsx` | `Z.GAME_OVER` (99999) | `false` (terminal) | `role=dialog` + `aria-modal=true` (via wrapper) + `aria-labelledby="game-over-title"` | New Game (`window.location.reload()`), Load Save (`ipc.loadStateDialog`) |
| PeacePlanModal | `src/ui/map/components/PeacePlanModal.tsx` | `Z.CRITICAL_MODAL` (9999) | `false` (must-respond) | wrapper aria + `aria-labelledby="peace-plan-title"` | `onDismiss` + `handleRespond('accepted'/'rejected')` (IPC `resolvePeacePlan`) |
| DaytonNegotiationModal | `src/ui/map/components/DaytonNegotiationModal.tsx` | `Z.CRITICAL_MODAL` (9999) | `false` (must-submit) | wrapper aria + `aria-labelledby="dayton-negotiation-title"` | `handleSubmit` (IPC `resolveDayton`), demand/concession/institution toggles, capital-budget validation |
| EventDecisionModal | `src/ui/map/components/EventDecisionModal.tsx` | `Z.CRITICAL_MODAL` (9999) | `false` (must-respond) | wrapper aria + `aria-labelledby="event-decision-title"` | `onRespond(eventId, responseId)` |

### Per-modal verification

- **GameOverModal:** Backdrop class `bg-black/80 backdrop-blur-sm`
  preserved verbatim via `backdropClassName`. Panel classes
  `w-[560px] max-h-[85vh] bg-panel-bg border border-panel-border
  rounded-lg shadow-2xl flex flex-col overflow-hidden` preserved verbatim
  via `panelClassName`. New `id="game-over-title"` added to the title
  `<div>` so `ariaLabelledBy` resolves. Subtitle, faction standings, and
  footer (New Game + Load Save buttons) preserved unchanged. Old
  bespoke fixed-overlay `<div>` removed; wrapper is sole owner. No
  `onClose` exists pre- or post-migration (terminal modal).

- **PeacePlanModal:** Backdrop `bg-black/70 backdrop-blur-sm` preserved
  verbatim; panel classes preserved verbatim; panel inline style
  (linear-gradient + `Georgia, "Times New Roman", serif`) preserved via
  `panelStyle` prop. New `id="peace-plan-title"` on `<h2>`. Existing
  `onDismiss` prop kept on the panel content (called from
  `handleRespond` after Accept/Reject), NOT passed to Modal as
  `onClose` — Modal's `dismissible={false}` master switch makes the
  Modal-level close path inactive by design.

- **DaytonNegotiationModal:** Backdrop `bg-black/80 backdrop-blur-sm`
  preserved verbatim; panel classes preserved; panel inline style
  preserved via `panelStyle` (same diplomatic-paper aesthetic). New
  `id="dayton-negotiation-title"` on `<h2>`. All bespoke state
  (`demands`, `concessions`, `institutions`, `submitting`,
  `capitalSpent`/`overBudget` derivations) and the Submit Proposal
  button (calling `handleSubmit` -> IPC `resolveDayton`) preserved
  unchanged. No `onClose` exists pre- or post-migration (must-submit
  modal).

- **EventDecisionModal:** Backdrop `bg-black/70` preserved (note: this
  modal's pre-migration backdrop was the only one of the 4 without
  `backdrop-blur-sm` on the backdrop — the `backdrop-blur-sm` lived on
  the panel, which is preserved exactly via `panelClassName`). New
  `id="event-decision-title"` on `<h3>`. `onRespond(eventId, responseId)`
  preserved on inner `<ResponseButton>` `onChoose` handler — bespoke
  handler stays on inner panel content per spec.

### Aria contracts preserved

All four modals expose `role="dialog"` + `aria-modal="true"` (from the
wrapper, replacing absence in 3 cases — none of these 4 had an aria
contract pre-migration), plus an `aria-labelledby` referencing a stable
id inside the panel. This is a strict aria improvement — every migrated
modal now has the canonical aria contract that Wave 1/2 also
established.

### `data-tutorial-step` anchors

None of the 4 modals contained a `data-tutorial-step` JSX attribute
pre- or post-migration. Wave 3 introduces no anchors. The
`tests/modal_migration_3.test.ts` M4 contract pins this regression-guard
at the source level for each file.

### Z-index canonical (Y for all four)

Each modal continues to import `Z` from `src/ui/shared/zIndex` and pass
its tier via the wrapper's `zIndex` prop. No raw numeric literals.
`tests/modal_migration_3.test.ts` M5 + `tests/z_index_canonical.test.ts`
T4-family pin the contract.

| Modal | `Z.*` tier | Numeric value (preserved verbatim) |
|---|---|---|
| GameOverModal | `Z.GAME_OVER` | 99999 |
| PeacePlanModal | `Z.CRITICAL_MODAL` | 9999 |
| DaytonNegotiationModal | `Z.CRITICAL_MODAL` | 9999 |
| EventDecisionModal | `Z.CRITICAL_MODAL` | 9999 |

## Files

Substrate (1):
- `src/ui/shared/Modal.tsx` (extended; backward-compatible)

Migrated (4):
- `src/ui/map/components/GameOverModal.tsx`
- `src/ui/map/components/PeacePlanModal.tsx`
- `src/ui/map/components/DaytonNegotiationModal.tsx`
- `src/ui/map/components/EventDecisionModal.tsx`

Tests (NEW, 2):
- `tests/modal_dismissible.test.ts` — 8 tests covering the substrate
  contract: D1 default + onClose works, D2 default + no onClose no-op,
  D3 dismissible=false ESC no-op, D4 dismissible=false click-outside
  no-op, D5 dismissible=false + no onClose typecheck-clean and renders,
  D6 backward-compat for Wave 1 callsite shape, D7 master-switch
  precedence over `closeOnEscape`, D8 master-switch precedence over
  `closeOnBackdropClick`.
- `tests/modal_migration_3.test.ts` — 29 tests covering the per-modal
  source contract: M1 imports `Modal`, M2 still imports `Z`, M3 no
  residual numeric `zIndex` literal mapped to a shell tier, M4 no
  `data-tutorial-step` JSX attribute introduced/stripped, M5 wrapper
  invocation references the expected `Z.*` tier (zero numeric drift),
  M6 wrapper invocation declares `dismissible={false}`, A1
  `ariaLabelledBy` and corresponding panel `id=` present, plus
  cross-target X1 invariant pinning that no migrated modal still
  hand-rolls `role="dialog"`.

Report (NEW, 1):
- `docs/40_reports/implemented/20260505_V094_MODAL_MIGRATION_3.md` (this
  file).

Total: 8 declared files (1 substrate + 4 migrations + 2 tests + 1 report).

## Verification

- `npx tsc --noEmit -p tsconfig.json`: clean (zero errors)
- `npx vitest run tests/modal_dismissible.test.ts tests/modal_migration_3.test.ts tests/modal_wrapper.test.ts tests/modal_migration.test.ts tests/modal_migration_2.test.ts tests/z_index_canonical.test.ts tests/css_z_index_canonical.test.ts`:
  **104/104 GREEN** across 7 suites
  - `modal_dismissible.test.ts`: 8/8
  - `modal_migration_3.test.ts`: 29/29
  - `modal_wrapper.test.ts`: 10/10 (Wave 1 foundation, immutable)
  - `modal_migration.test.ts`: 21/21 (Wave 1 migration, immutable)
  - `modal_migration_2.test.ts`: 25/25 (Wave 2 migration, immutable)
  - `z_index_canonical.test.ts`: 7/7
  - `css_z_index_canonical.test.ts`: 4/4
- `npm run desktop:map:build`: clean (3.4 MB tactical-map JS bundle,
  15.79s; standard chunk-size advisory preexisting, not introduced)
- Tutorial regression: skipped — none of the four migrated modals
  contain a `data-tutorial-step` anchor pre- or post-migration (the M4
  contract guards this at the source level for each file).

## Sensitive-history compliance

- Ring 1 / no §6 surface (UI-only migration; no engine path entered)
- Faction-symmetric mechanism — wrapper is data-driven, no faction
  branching introduced; modal content references factions but mechanism
  (dismiss/render) is symmetric
- No `political_controllers`, `OOB`, paint anchor, rupture wiring, or
  `enclave_resilience.ts` touched
- Z-index from canonical source (`src/ui/shared/zIndex.ts`) preserved
  in every migration; numeric values byte-stable per the table above
- `factionPalette.ts` untouched (canonical palette preserved byte-stable)
- `zIndex.ts` token table untouched (consumed only)
- The 8 already-migrated Wave 1 + Wave 2 modals untouched (out of
  scope; their tests remain GREEN under the extended substrate)
- `tests/modal_migration.test.ts`, `tests/modal_migration_2.test.ts`,
  `tests/modal_wrapper.test.ts`, `tests/z_index_canonical.test.ts`,
  `tests/css_z_index_canonical.test.ts` untouched (consumed as
  verification gates only)
- `data/scenarios/events/consequences.json` untouched (out of scope)
- `src/sim/`, `src/state/`, `electron-main.cjs`, `build/*`,
  `package.json`, `.github/workflows/*`, `tools/release/*` untouched
- Determinism: no `Math.random`, `Date.now`, `new Date()` introduced;
  wrapper is a pure render with CSS-driven animations (Wave 1 contract
  preserved).

## Note on lane scope

The lane shipped exactly the declared scope: 1 substrate extension + 4
modal migrations + 2 new test files + 1 report. The substrate extension
is fully backward-compatible — every Wave 1 + Wave 2 consumer continues
to behave identically without any source change. The 4 migrated modals
adopt `dismissible={false}` + the wrapper's canonical aria contract,
preserving every bespoke handler (`onDismiss`, `handleRespond`,
`handleSubmit`, `onRespond`, capital-budget validation, IPC resolve
calls) verbatim on the inner panel content.
