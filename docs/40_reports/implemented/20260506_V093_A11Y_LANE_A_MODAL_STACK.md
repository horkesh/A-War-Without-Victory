# LANE-NIGHTSHIFT-V093-A11Y-LANE-A — Modal stack accessibility baseline

**Lane:** `LANE-NIGHTSHIFT-V093-A11Y-LANE-A`
**Date:** 2026-05-06
**Status:** IMPLEMENTED
**Predecessor audit:** `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` (Lane A scope, 8 ACs)
**Predecessor wrapper:** `src/ui/shared/Modal.tsx` (`edb48f1f` — `LANE-V094-MODAL-WRAPPER` + `LANE-V094-MODAL-DISMISSIBLE-EXTENSION`)
**Sensitive-history compliance:** Ring 1, faction-agnostic mechanism, no §6 surface, UI-only, no determinism path.

---

## 1. Lane scope (binding)

Lane A owns the canonical `<Modal>` wrapper (`src/ui/shared/Modal.tsx`) and the 12 modals migrated to it. The audit panel scoped 8 acceptance criteria (C-A1 through C-A8). This lane:

1. Audits the per-modal a11y contract for all 12 migrated modals.
2. Extends the wrapper with `aria-describedby` support (additive prop; no breaking change).
3. Authors `tests/v093_a11y_lane_a_modal_stack.test.ts` (≥8 tests) that pin the contract.
4. Leaves predecessor tests untouched (`tests/modal_wrapper.test.ts`, `tests/modal_migration*.test.ts`, `tests/modal_dismissible.test.ts`).

---

## 2. Per-modal a11y verdict (12/12)

Per phase 2 verification:

| # | Modal | `ariaLabelledBy` | Heading id present | Dismissible | Action button(s) | div-onClick antipattern | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | RecruitmentModal | `recruitment-title` | `<h2 id="recruitment-title">` | `true` (default) | close (×) | none | PASS |
| 2 | WarSummaryModal | `war-summary-title` | `<div id="war-summary-title">` | `true` (default) | close (×) | none | PASS |
| 3 | TurnAftermathModal | `turn-aftermath-title` | `<div id="turn-aftermath-title">` | `true` (default) | close | none | PASS |
| 4 | AdvanceTurnModal | `advance-turn-title` | `<div id="advance-turn-title">` | `true` (default) | confirm/cancel | none | PASS |
| 5 | CommanderSelectionModal | `commander-selection-title` | `<div id="commander-selection-title">` | `true` (default) | assign | none | PASS |
| 6 | OperationBriefingModal | `operation-briefing-title` | `<div id="operation-briefing-title">` | `true` (default) | brief actions | none | PASS |
| 7 | AttackConfirmation | `attack-confirmation-title` | `id="attack-confirmation-title"` | `true` (default) | confirm/cancel | none | PASS |
| 8 | SidePickerOverlay | `side-picker-title` | `<h2 id="side-picker-title">` | `true` (default) | pick faction | none | PASS |
| 9 | GameOverModal | `game-over-title` | `<div id="game-over-title">` | `false` (terminal) | New Game / Load Save | none | PASS |
| 10 | PeacePlanModal | `peace-plan-title` | `<h2 id="peace-plan-title">` | `false` (must-respond) | accept/reject | none | PASS |
| 11 | DaytonNegotiationModal | `dayton-negotiation-title` | `<h2 id="dayton-negotiation-title">` | `false` (must-respond) | accept/reject | none | PASS |
| 12 | EventDecisionModal | `event-decision-title` | `<h3 id="event-decision-title">` | `false` (must-respond) | per-decision | none | PASS |

**Verdict: 12/12 PASS.** All modals declare `ariaLabelledBy` referencing an existing heading id inside the panel; all `dismissible={false}` modals expose at least one explicit action button; no `<div onClick>` clickable-div anti-pattern exists in any of the 12.

The audit panel's flagged 4 div-onClick files (`AARPanel`, `ArmyHQModal`, `OperationHistoryPanel`, `SituationTab`) were re-classified during this lane:

- `AARPanel` (`src/ui/map/components/AARPanel.tsx:477`) — div-onClick is a *dismissal backdrop* on a slide-out side panel, not a content widget. Equivalent semantics to `Modal`'s own `handleBackdropClick`. NOT one of the 12 migrated modals.
- `OperationHistoryPanel` (`src/ui/map/components/OperationHistoryPanel.tsx:509`) — same as AARPanel: dismissal backdrop on slide-out panel. NOT migrated.
- `ArmyHQModal` (`src/ui/map/components/army_hq/ArmyHQModal.tsx:183`) — dismissal backdrop (`if (e.target === e.currentTarget) setOpen(false);`). Owned by Lane C per the Phase 0 audit's file-disjoint table.
- `SituationTab` (`src/ui/map/components/SituationTab.tsx`) — no `<div onClick>` matches found by re-grep. False positive in audit; or anti-pattern was already removed prior to this lane.

**Lane A does not modify any of the 4** — they fall to sibling lanes per ownership table.

---

## 3. Modal.tsx extension

Per Phase 1 ACs, `Modal.tsx` baseline already covered:
- `role="dialog"` + `aria-modal="true"` (lines 294–295)
- `aria-labelledby` (line 296)
- ESC dismissal respecting `dismissible` (lines 207–218)
- Click-outside dismissal respecting `dismissible` (lines 280–283)
- Focus capture on open + restore on close (lines 222–248)
- Tab-trap inside panel (lines 252–272)
- `tabIndex={-1}` on panel (line 298)

The only baseline gap was `aria-describedby` support. This lane adds:

- New optional `ariaDescribedBy?: string` prop in `ModalProps`.
- Forwarded to `aria-describedby` on the dialog node.
- Backward-compatible (default undefined; existing 12 modals unaffected).

Existing animation classes (`modal-fade-in`, `modal-panel-in`) are CSS class names — not attributes that confuse screen readers. No change needed.

---

## 4. New test file

`tests/v093_a11y_lane_a_modal_stack.test.ts` — 8 tests:

- **T1** — `Modal` renders `role="dialog"` + `aria-modal="true"` (positive baseline).
- **T2** — All 12 migrated modal source files declare `ariaLabelledBy=` AND have a matching `id="..."` token in the same file (static-source assertion that resolves the labelledby reference).
- **T3** — ESC respects `dismissible={false}` (suppresses) vs `dismissible={true}` (fires `onClose`).
- **T4** — Tab-trap cycles: shift+tab on first focusable lands on last; tab on last focusable lands on first.
- **T5** — Focus restoration: prior `document.activeElement` is restored when modal closes.
- **T6** — `aria-describedby` (newly added) wires correctly when `ariaDescribedBy` prop is supplied.
- **T7** — Static source guard: none of the 12 migrated modal files contain `<div onClick=` clickable-div anti-pattern (regex match against file source).
- **T8** — Determinism static-grep guard: `Modal.tsx` contains no `Math.random`, `Date.now`, `new Date(`, or locale-sort patterns; faction-symmetric (no faction RGB or 3-letter token).

---

## 5. Verification

```
$ npx vitest run tests/v093_a11y_lane_a_modal_stack.test.ts \
                tests/modal_wrapper.test.ts \
                tests/modal_migration.test.ts \
                tests/modal_migration_2.test.ts \
                tests/modal_dismissible.test.ts \
                tests/modal_migration_3.test.ts
 Test Files  6 passed (6)
      Tests  101 passed (101)
   - tests/v093_a11y_lane_a_modal_stack.test.ts: 8/8
   - tests/modal_wrapper.test.ts:                10/10
   - tests/modal_dismissible.test.ts:            8/8
   - tests/modal_migration.test.ts:              21/21
   - tests/modal_migration_2.test.ts:            25/25
   - tests/modal_migration_3.test.ts:            29/29

$ npx tsc --noEmit -p tsconfig.json
(zero errors)

$ npm run desktop:map:build
✓ built in 17.23s (no warnings beyond pre-existing 500 kB chunk size note)
```

All three smoke-test gates green. No regressions in any of the 5 predecessor modal test suites.

---

## 6. Sensitive-history compliance

Ring 1, faction-agnostic mechanism, no §6 surface. UI-only. No `political_controllers`, `OOB`, paint anchors, rupture wiring, `enclave_resilience.ts`, canon files, or determinism path touched.

Static-grep guard (T8) defensively pins:
- No `Math.random` / `Date.now` / `new Date(` / `localeCompare` in non-comment Modal.tsx code.
- No faction tokens (`RBiH` / `HRHB` / `VRS` / `ARBiH` / `HVO`) anywhere in Modal.tsx.
- No canonical faction RGB literals (`#c04040` / `#4a9a55` / `#4080b8` / `#c24040`) in Modal.tsx.

---

## 7. Files touched

- `src/ui/shared/Modal.tsx` (extended with `ariaDescribedBy` prop; additive, backward-compatible).
- `tests/v093_a11y_lane_a_modal_stack.test.ts` (NEW; 8 tests).
- `docs/40_reports/implemented/20260506_V093_A11Y_LANE_A_MODAL_STACK.md` (NEW; this report).

No other files touched. The 12 migrated modals were verified per Phase 2 audit and required no source changes (all already declare valid `ariaLabelledBy` references with matching heading IDs, all `dismissible={false}` modals expose action buttons, none contain `<div onClick>` clickable-div anti-patterns).

The 4 audit-flagged div-onClick files (`AARPanel`, `ArmyHQModal`, `OperationHistoryPanel`, `SituationTab`) are dismissal backdrops on slide-out panels (not the 12 migrated modals) and are owned by sibling Lane C per the Phase 0 file-disjoint table.

---

End of report.
