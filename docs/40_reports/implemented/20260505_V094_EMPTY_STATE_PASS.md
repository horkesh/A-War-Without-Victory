# LANE-V094-EMPTY-STATE-PASS — one-voice empty-state pass

**Date:** 2026-05-05
**Status:** SHIPPED
**Lane:** `LANE-V094-EMPTY-STATE-PASS`
**Audit reference:** `docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md` (commit `cdb2d30f`)
**Backlog item:** Order 5 — `LANE-V094-EMPTY-STATE-PASS (P1-E + P2-I)`
**Predecessor (component pattern):** `docs/40_reports/implemented/20260505_V094_LOADING_AND_ERROR.md` (commit `a3433670`)

---

## 1. Summary

This lane lands the v0.9.4 Phase-1/2 polish quick-win flagged by the UI
shell audit:

- **`<EmptyState>`** — reusable empty-state component (P1-E + P2-I).
  One voice register, one visual treatment, applied across 8 surfaces
  that previously rendered ad-hoc inline empty-state strings or blank
  panels.

The component matches the `LoadingSkeleton` / `LoadErrorToast` pattern
established in `LANE-V094-LOADING-AND-ERROR`: pure functional React,
faction-symmetric palette, status-color (`role="status"` + `aria-live=polite`),
deterministic, no engine path.

UI-only — does NOT enter the simulation path. File-disjoint from sim
files.

---

## 2. Files committed

| File | Status | Purpose |
|---|---|---|
| `src/ui/map/components/EmptyState.tsx` | NEW | Reusable empty-state component |
| `src/ui/map/components/army_hq/OperationsSection.tsx` | EDIT | Empty state when corps has no active operations |
| `src/ui/map/components/army_hq/SectorsSection.tsx` | EDIT | Empty state when corps has no sector assignments |
| `src/ui/map/components/army_hq/CombatRecordSection.tsx` | EDIT | Empty state when corps has no combat record |
| `src/ui/map/components/army_hq/OrbatSection.tsx` | EDIT | Empty state when corps has no brigades |
| `src/ui/map/components/EventLogPanel.tsx` | EDIT | Empty state when no events recorded |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | EDIT | Empty state when no chronicle entries |
| `src/ui/map/components/ArmyReservePanel.tsx` | EDIT | Empty state for reserve pool + active deployments |
| `src/ui/map/components/AARPanel.tsx` | EDIT | Empty state when turn is quiet |
| `tests/empty_state.test.ts` | NEW | 9 tests covering render contract, accessibility, determinism |
| `docs/40_reports/implemented/20260505_V094_EMPTY_STATE_PASS.md` | NEW | This report |

---

## 3. Implementation

### 3.1 EmptyState component — voice register

The Army HQ shell already had a recognisable analytical staff-narrative
voice (e.g. `NO ACTIVE OPERATIONS DETECTED`, `NO SECTOR ASSIGNMENTS
DETECTED`, `No combat record`). The `<EmptyState>` component locks this
in at one register:

- **Primary line:** short, uppercase, mono, `tracking-[0.22em]`,
  declarative ("No active operations"). Uses sentence case under the
  uppercase CSS, so callers pass natural strings ("No active operations")
  rather than shouting raw all-caps.
- **Optional helper line:** sentence-case italic, `text-[10px]`. Brief
  context for why the surface is quiet ("Awaiting orders from corps
  command.").
- **Optional glyph:** 1–2 char prefix (e.g. `·`, `—`) for callers that
  want a small visual anchor. Off by default (no iconography dependency
  introduced — that is a separate lane, P2-E).
- **Density:** `'compact'` | `'normal'`. Compact mode (`py-2`) is for
  inline list slots; normal (`py-4`) is for full-panel placeholders.

### 3.2 Faction-symmetric palette (status-color, no faction coupling)

- `bg-panel-bg` / panel neutrals
- `text-text-secondary/70` for primary
- `text-text-secondary/50` italic for helper
- `text-text-secondary/40` for glyph

No faction-specific RGBs. No status colors (red/green/amber) — the
empty-state is informational, not an alert. T5 in the test suite guards
against status-color regression.

### 3.3 Voice migration table

| Surface | Old copy | New (primary / helper) |
|---|---|---|
| `OperationsSection` | "NO ACTIVE OPERATIONS DETECTED" | "No active operations" / "Awaiting orders from corps command." |
| `SectorsSection` | "NO SECTOR ASSIGNMENTS DETECTED" | "No sector assignments" / "No front sectors are currently held by this corps." |
| `CombatRecordSection` | "No combat record" | "No combat record" / "Corps has not fought a battle yet." |
| `OrbatSection` | (no empty state — rendered blank header row) | "No formations to show" / "No brigades currently report under this corps." |
| `EventLogPanel` | "No events recorded yet." | "No events recorded" / "Awaiting first event." |
| `ChronicleOverlay` | "No events recorded yet. Advance turns to build your chronicle." | "No chronicle entries" / "Advance turns to record the campaign chronicle." |
| `ArmyReservePanel` (reserve pool) | "No elite brigades in reserve pool." | "No elite formations" / "Reserve pool currently empty." |
| `ArmyReservePanel` (active loans) | "No active deployments this turn." | "No active deployments" / "No elite formations are presently committed to corps." |
| `AARPanel` (quiet-turn fallback) | "Quiet turn — no significant events recorded." | "Quiet turn" / "No significant events recorded this turn." |

### 3.4 Tutorial onboarding anchors preserved

The `data-tutorial-step` attributes on `PresidentialToolbar`,
`OOBSidebar`, `ArmyHQModal`, `OOBSidebar` and other tutorial-bound
shell elements are NOT touched by this lane. The `<EmptyState>`
component renders inside list slots (Operations/Sectors/Combat/ORBAT)
or under panel headers (Event Log, Chronicle, Reserve, AAR) — none of
those slots are tutorial spotlight anchors.

`tests/tutorial_onboarding_skeleton.test.ts` GREEN (3/3) confirms the
tutorial state shape is unchanged.

### 3.5 Toolbar empty-band remediation (audit § P1-I)

Reviewed `OOBSidebar.tsx` and `panelRail.ts` per audit reference. The
`OOBSidebar` empty-band sits below the 48-px Presidential toolbar; the
audit recommends three options (split CSS var, tighter list, z-index
pull) and notes split CSS var has the smallest blast radius. This lane
scoped the fix to inline empty-state surfaces only — the layout-level
toolbar empty-band is a separate Phase-1 P3 task that is dependent on
the larger panel-rail rework called out in `panelRail.ts`. Defer
to a follow-up lane to avoid blast-radius creep on a UI-only quick-win
lane.

---

## 4. Verification

### 4.1 Lane tests — 9/9 GREEN

```
$ npx vitest run tests/empty_state.test.ts
 ✓ tests/empty_state.test.ts (9 tests) 11ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

Test contracts:
- T1 — renders `role="status"` + `aria-live="polite"`
- T2 — renders the primary message verbatim
- T3 — renders optional `helpText` when provided; omits when absent
- T4 — renders optional `glyph` when provided; omits when absent
- T5 — faction-symmetric palette (no per-faction colors / RGBs / status colors)
- T6 — pure / deterministic — same input yields byte-identical HTML
- T7 — `density='compact'` tightens vertical padding (`py-2`) vs default (`py-4`)
- T8 — accepts optional `className` for layout-specific overrides
- T9 — no scripts, no timers; structural `data-testid` hooks present

### 4.2 Focused UI regression — 43/43 GREEN

```
$ npx vitest run tests/empty_state.test.ts \
                tests/loading_skeleton.test.ts \
                tests/load_error_toast.test.ts \
                tests/ui_adapter_boundary.test.ts \
                tests/faction_palette_canonical.test.ts
 ✓ tests/ui_adapter_boundary.test.ts (13 tests) 122ms
 ✓ tests/faction_palette_canonical.test.ts (7 tests) 7ms
 ✓ tests/empty_state.test.ts (9 tests) 12ms
 ✓ tests/load_error_toast.test.ts (8 tests) 50ms
 ✓ tests/loading_skeleton.test.ts (6 tests) 12ms
 Test Files  5 passed (5)
      Tests  43 passed (43)
```

### 4.3 Tutorial + Chronicle + Army HQ regression — 10/10 GREEN

```
$ npx vitest run tests/tutorial_onboarding_skeleton.test.ts \
                tests/ui_chronicle_review_tools.test.ts \
                tests/ui_army_hq_war_summary_visibility.test.ts
 ✓ tests/tutorial_onboarding_skeleton.test.ts (3 tests) 5ms
 ✓ tests/ui_army_hq_war_summary_visibility.test.ts (4 tests) 5ms
 ✓ tests/ui_chronicle_review_tools.test.ts (3 tests) 4ms
 Test Files  3 passed (3)
      Tests  10 passed (10)
```

### 4.4 Typecheck — clean

```
$ npx tsc --noEmit
(no output)
```

### 4.5 Verify-before-exit

`git show --stat HEAD` confirms the expected file set before reporting
back to parent (see §5 commit details).

---

## 5. Sensitive-history compliance

- **Ring 1 / no §6 surface.** All 8 consumer surfaces are pure UI; no
  narrative content authored, no faction-asymmetric data, no sensitive
  territory assertions.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-
  wiring / `enclave_resilience.ts` touch.** Confirmed by file inventory
  in §2 — only `src/ui/map/components/` paths edited.
- **No combat-math / scenario / canon edits.**
- **No determinism risk.** UI-only; no engine path, no scenario mutation.
  MORALE_OVERRIDE smoke chain (running concurrently in another lane) is
  file-disjoint — none of the edited files appear in `src/sim/`.
- **No new palette tokens.** Neutral text-secondary palette only; no
  status colors, no faction-specific RGBs introduced. Test T5 in
  `empty_state.test.ts` guards against faction-color regression and
  status-color over-coupling.
- **`factionPalette.ts` byte-stable.** Confirmed by
  `tests/faction_palette_canonical.test.ts` (7/7 GREEN).
- **Tutorial `data-tutorial-step` anchors preserved.** Lane did not
  touch any anchor; consumer surfaces are inside list slots / panel
  bodies, not on tutorial-anchored shell elements.

**Sensitive-history compliance: GREEN.**

---

## 6. Surfaces with empty-state applied (count + list)

8 surfaces total:

1. `src/ui/map/components/army_hq/OperationsSection.tsx` — corps with no active ops
2. `src/ui/map/components/army_hq/SectorsSection.tsx` — corps with no sector assignments
3. `src/ui/map/components/army_hq/CombatRecordSection.tsx` — corps with no battles
4. `src/ui/map/components/army_hq/OrbatSection.tsx` — corps with no brigades
5. `src/ui/map/components/EventLogPanel.tsx` — no events recorded
6. `src/ui/map/components/chronicle/ChronicleOverlay.tsx` — no chronicle entries
7. `src/ui/map/components/ArmyReservePanel.tsx` (×2 — reserve pool + active loans)
8. `src/ui/map/components/AARPanel.tsx` — quiet-turn AAR

---

## 7. Successor handoffs

This lane closes the v0.9.4 Phase-1 P1 empty-state pass plus the
Phase-2 P3 empty-state visual-language pass (P1-E + P2-I).

Remaining backlog from the audit § 4 "Prioritized backlog":

1. **LANE-V094-Z-INDEX-TOKENS** (P1-A) — central z-index token file
2. **LANE-V094-MODAL-WRAPPER** (P1-B + P1-F + P1-J) — shared `<Modal>`
   wrapper for entry/exit animation, ESC handling, focus return
3. **LANE-V094-TYPOGRAPHY-SPACING-TOKENS** (P2-C + P2-D) — codify
   font scale + tracking + spacing tokens
4. **LANE-V094-COLOR-SEMANTICS-TOKENS** (P2-F) — status semantic tokens

The `<EmptyState>` component is reusable by future lanes — additional
surfaces can drop in `<EmptyState message="…" helpText="…"
density="compact" />` without changes to the component.

---

End of report.
