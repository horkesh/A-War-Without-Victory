# LANE-V094-LOADING-AND-ERROR — first-paint scenario-load skeleton + LoadErrorToast

**Date:** 2026-05-05
**Status:** SHIPPED
**Lane:** `LANE-V094-LOADING-AND-ERROR`
**Parent SHA:** `3326cbd8124508a77583a2ee830c306064d258c5`
**Audit reference:** `docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md` (commit `cdb2d30f`)
**Backlog item:** Order 4 — `LANE-V094-LOADING-AND-ERROR (P1-C + P1-D)`

---

## 1. Summary

This lane lands two of the v0.9.4 Phase-1 polish quick-wins flagged by the
UI shell audit:

1. **`LoadingSkeleton` (P1-C / QW-2)** — first-paint scenario-load skeleton
   that replaces the prior blank screen between "in-game shell mounted" and
   "first save loaded".
2. **`LoadErrorToast` (P1-D / QW-3)** — dismissible toast that surfaces
   `loadError` strings from the canonical `useGameStore.loadError` slice,
   replacing the prior silent failure mode.

Both components are mounted at App root in `src/ui/map/App.tsx`. Both are
faction-symmetric (no faction colors, no faction copy), Ring 1, no §6
surface, and UI-only — they do NOT enter the simulation path.

---

## 2. Files committed

| File | Status | Purpose |
|---|---|---|
| `src/ui/map/components/LoadingSkeleton.tsx` | NEW | First-paint scenario-load skeleton component |
| `src/ui/map/components/LoadErrorToast.tsx` | NEW | Dismissible save-load error toast component |
| `src/ui/map/App.tsx` | EDIT | Wired both components at App root |
| `tests/loading_skeleton.test.ts` | NEW | 6 tests covering render contract, accessibility, determinism |
| `tests/load_error_toast.test.ts` | NEW | 8 tests covering render, dismiss callbacks (click + Escape), determinism |
| `docs/40_reports/implemented/20260505_V094_LOADING_AND_ERROR.md` | NEW | This report |

---

## 3. Implementation

### 3.1 LoadingSkeleton

- Pure functional component; no hooks, no store reads, no IPC.
- Mirrors the gross shell layout: top toolbar bar (`h-12`), left rail
  (`w-64`, mirrors `OOBSidebar`), map area (centered caption), bottom
  strip (`h-8`, mirrors `BottomStatusStrip`).
- Reuses canonical `panel-shimmer` keyframe from `globals.css` — no new
  animation vocabulary added.
- Faction-symmetric palette: `bg-panel-bg`, `bg-panel-card`, `text-amber-400`.
- Mount predicate at App root:
  ```tsx
  {appScreen === 'game' && !loadedGameState && !sidePickerOpen && (
    <LoadingSkeleton />
  )}
  ```
  Auto-dismisses when `loadedGameState !== null`. Excluded during MainMenu /
  Warroom screens (those have their own UI) and the SidePicker overlay
  (which is itself the entry surface). z-index `z-[50]` (below toolbar
  `z-[100]` and other modals so a transient overlap won't trap the user).

### 3.2 LoadErrorToast

- Renders `null` when `message` is null / undefined / empty — no DOM
  weight when there's no error.
- `role="alert"` + `aria-live="assertive"` for accessibility.
- Dismiss via close button click OR `Escape` key (button is auto-focused on
  mount via `useEffect`).
- z-index `z-[8500]` per audit recommendation (above modal stack at
  `z-[1000–9999]`, below GameOver / Verdict / TurnAftermath at
  `z-[9999+]`).
- Faction-symmetric palette: `bg-panel-bg`, `border-red-500`, `text-red-400`,
  `text-amber-400` for the dismiss button. No faction colors.
- Reusable: accepts `message` + `onDismiss` props; the App-level wrapper
  reads `loadError` from `useGameStore` and dispatches `setLoadError(null)`
  on dismiss. Same component is reusable by future v0.9.4 backlog lanes.
- Suppressed while the SidePickerOverlay is open — that overlay already
  renders `errorMessage={loadError}` inline (existing path, unchanged), so
  the toast avoids being a duplicate consumer there.

### 3.3 Tutorial onboarding anchors preserved

The `data-tutorial-step` attributes on `PresidentialToolbar`, `OOBSidebar`,
and other shell elements are NOT touched by this lane — neither component
renders to the existing shell DOM tree, both are siblings under the App
root.

---

## 4. Verification

### 4.1 Lane tests — 14/14 GREEN

```
$ npx vitest run tests/loading_skeleton.test.ts tests/load_error_toast.test.ts
 ✓ tests/load_error_toast.test.ts (8 tests) 50ms
 ✓ tests/loading_skeleton.test.ts (6 tests) 12ms
 Test Files  2 passed (2)
      Tests  14 passed (14)
```

**LoadingSkeleton tests (6):**
- T1 — renders `role="status"` + `aria-busy=true` + `aria-live=polite`
- T2 — renders ≥4 `panel-shimmer` placeholder bars (top, sidebar, map, bottom)
- T3 — renders default caption "LOADING SCENARIO"; respects override
- T4 — faction-symmetric palette (no per-faction colors / RGBs)
- T5 — pure / deterministic — same input yields byte-identical HTML
- T6 — no scripts, no timers; structural data-testid hooks present

**LoadErrorToast tests (8):**
- T1 — renders nothing when message null / undefined / empty
- T2 — renders alert region with `aria-live=assertive` when message present
- T3 — renders message text verbatim + ERROR tag
- T4 — dismiss button click invokes onDismiss callback
- T5 — Escape key invokes onDismiss callback
- T6 — pure / deterministic: same message yields byte-identical HTML
- T7 — faction-symmetric palette (red status / amber dismiss)
- T8 — fixed positioning applies `z-[8500]`

### 4.2 Focused UI regression — 51/51 GREEN

```
$ npx vitest run tests/loading_skeleton.test.ts tests/load_error_toast.test.ts \
                tests/ui_adapter_boundary.test.ts \
                tests/ui/gamestore_load_reset.test.ts \
                tests/ui/desktop_load_error_classification.test.ts \
                tests/tutorial_onboarding_skeleton.test.ts
 Test Files  6 passed (6)
      Tests  51 passed (51)
```

**Adjacent regression tested:**
- Load-error path (`gamestore_load_reset` — 11/11) — `setLoadError`
  semantics unchanged.
- Desktop load-error classification (`desktop_load_error_classification`
  — 10/10) — error string flow unchanged.
- UI adapter boundary (`ui_adapter_boundary` — 13/13) — adapter contract
  unchanged.
- Tutorial onboarding skeleton (`tutorial_onboarding_skeleton` — 3/3) —
  state shape unchanged; lane does NOT touch onboarding contract.

### 4.3 Faction palette canonicalization regression — 7/7 GREEN

```
$ npx vitest run tests/faction_palette_canonical.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

`FACTION_GLOW_RGB` byte-stable; this lane introduces no new palette tokens
and references no faction-colored values.

### 4.4 Typecheck — clean

```
$ npx tsc --noEmit
(no output)
```

### 4.5 Verify-before-exit

`git show --stat HEAD` confirms the expected file set before reporting back
to parent (see §5 commit details).

---

## 5. Sensitive-history compliance

- **Ring 1 / no §6 surface.** Both components are pure UI; no narrative
  content, no faction-asymmetric data, no sensitive territory assertions.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring
  / `enclave_resilience.ts` touch.** Confirmed by file inventory in §2.
- **No combat-math / scenario / canon edits.**
- **No determinism risk.** UI-only; no engine path, no scenario mutation.
- **No new palette tokens.** Status colors only (`text-red-400`,
  `text-amber-400`, `border-red-500`); no faction-specific RGBs introduced.
  Test T7 in `load_error_toast.test.ts` and T4 in `loading_skeleton.test.ts`
  guard against faction-color regression.
- **Tutorial `data-tutorial-step` anchors preserved.** Lane did not touch
  any anchor; lane components are App-root siblings, not children of any
  tutorial-anchored surface.

**Sensitive-history compliance: GREEN.**

---

## 6. Successor handoffs

This lane closes 2 of 5 v0.9.4 Phase-1 P1 quick-wins. Remaining backlog from
the audit (`docs/40_reports/audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`
§4 "Prioritized backlog"):

1. **LANE-V094-Z-INDEX-TOKENS** (P1-A) — central z-index token file.
2. **LANE-V094-MODAL-WRAPPER** (P1-B + P1-F + P1-J) — shared `<Modal>`
   wrapper for entry/exit animation, ESC handling, focus return.
3. **LANE-V094-EMPTY-STATE-PASS** (P1-E + P2-I) — one-voice empty-state
   pass across Army HQ subpanels.

The `LoadErrorToast` component is reusable by future lanes — it accepts a
`message` + `onDismiss` contract and is not load-error-specific in shape.

---

End of report.
