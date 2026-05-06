# v0.9.2 Tutorial Lane B Subset — Auto-Dismiss + RestartButton Mount

**Lane:** `LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET`
**Date:** 2026-05-06
**Type:** IMPLEMENTED (Ring 1, UI/state surface; tutorial state is UI-only per `StateMeta.tutorial_state` design intent)
**Mandate:** v0.9.2 tutorial fill-out Phase 0 — Lane B items 1+2 (the autonomous-friendly subset).
**Predecessor panel:** `docs/40_reports/audits/20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md` §2 Lane B.

---

## Summary

Two ship-blocker bugs in the v0.9.2 tutorial state-machine, identified by the
fill-out Phase 0 panel (`6a0ad4c2`), are closed:

1. **Auto-dismiss on final step.** Previously, after the player advanced past
   step 8 (`08_judge`), `resolveNextStep` returned `null` and the overlay
   rendered `null`, but `dismissed=true` was never written. On next save load,
   the visibility predicate `shouldShowOnboarding` returned `true` (because
   `dismissed !== true`) and the overlay tried to mount, then immediately
   short-circuited to `null` — the player saw an invisible re-show with no UI
   affordance. The overlay's `onAdvance` handler now detects `isFinalStep` and
   issues `tutorial:dismiss` immediately after the final `tutorial:advance-step`,
   so `dismissed=true` is written exactly when the player completes step 8.

2. **`OnboardingRestartButton` mount.** The component was exported from
   `OnboardingOverlay.tsx` but had no host in any App-shell consumer — the
   panel flagged this as a coverage gap. The button is now mounted in the
   Settings screen's Gameplay section, gated on
   `tutorial_state.dismissed === true` so it appears only when there is a
   tutorial to restart.

Both fixes are autonomous-friendly per the Phase 0 panel (Lane B items 1 + 2:
"Items 1, 2 yes" under "Autonomous-friendly").

---

## Files Touched (exclusive ownership)

| File | Purpose |
|---|---|
| `src/ui/map/components/onboarding/OnboardingOverlay.tsx` | Auto-dismiss wired in `onAdvance`; new pure helpers `applyAdvanceStepPure` + `isFinalStep`. |
| `src/ui/map/components/SettingsScreen.tsx` | Mounts `OnboardingRestartButton` in Gameplay section, gated on `tutorial_state.dismissed === true`. |
| `tests/v092_tutorial_lane_b_auto_dismiss.test.ts` (NEW) | 6 contract tests (T1-T6). |
| `docs/40_reports/implemented/20260506_V092_TUTORIAL_LANE_B_AUTO_DISMISS.md` (THIS FILE) | Report. |

**Not touched** (per lane spec):
- `src/desktop/electron-main.cjs` — IPC handlers were already wired correctly
  by predecessor `d6da6ad4` (LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1). Verified
  during this lane: `tutorial:dismiss` (line 3013), `tutorial:advance-step`
  (line 3028), and `tutorial:restart` (line 3055) all go through
  `readCanonicalCurrentState`/`writeCanonicalCurrentState` and persist
  `dismissed=true` correctly. No change required.
- `src/state/game_state.ts` — schema unchanged; existing `StateMeta.tutorial_state`
  shape supports the auto-dismiss path (no new fields).
- `src/ui/map/components/onboarding/OnboardingRestartButton.tsx` — n/a; the
  component is co-resident in `OnboardingOverlay.tsx` and was already exported
  and faction-agnostic.
- Sibling A11y Lane A modal stack files, Sibling A11y Lane B map landmarks files,
  Sibling A11y Lane D contrast/reduce-motion files (`factionPalette.ts`,
  `globals.css`, `tailwind.config.ts`).

---

## Implementation Notes

### Phase 1 — auto-dismiss on final step

`OnboardingOverlay.tsx` adds a small pure predicate `isFinalStep(stepId)` that
compares the supplied id against the last entry in the canonical
`ONBOARDING_STEPS` list (`08_judge` today; will follow if the list grows).
The `onAdvance` callback issues `tutorial:advance-step` first, then if and
only if the step it just advanced past is the final step, issues
`tutorial:dismiss` in the same handler. Two IPC writes (advance + dismiss)
remain deterministic: each `ipcMain` handler is a pure synchronous transform
of the canonical state and the renderer-→main bridge runs them in call order.

A second pure helper `applyAdvanceStepPure(prior, stepId)` was added
alongside the existing `applyDismissPure` and `applyRestart` so the
contract can be unit-tested without an Electron host. It mirrors the
canonical `tutorial:advance-step` IPC handler (idempotent append; preserves
`dismissed`; sets `current_step` to the most recent advance).

**Approach choice (panel referenced "(a) overlay-side useEffect" vs "(b)
handler detects final step"):** The overlay-side path was selected here
because the lane spec explicitly excludes touching `electron-main.cjs`.
This is approach (a) implemented synchronously in `onAdvance` rather than
via `useEffect`, so the player sees zero overlay flicker on completion —
the dismiss IPC settles before the overlay's next render.

### Phase 2 — mount `OnboardingRestartButton` in Settings

`SettingsScreen.tsx` imports the canonical button from the onboarding module
and wires it with the IPC bridge derived from `useIPC()`. The render is
gated on `tutorial_state.dismissed === true` (read from the canonical UI
store via `useGameStore((s) => s.loadedGameState?.tutorial_state)`). The
host placement is the Gameplay section so the affordance is grouped with
other gameplay-shape preferences (Turn Confirmation, Fog of War). When
`dismissed === false` (active tutorial) or absent (fresh save), the
`SettingRow` is short-circuited and not rendered — there is no UX
contradiction with an active overlay.

**Faction-agnostic:** the host gate reads only `dismissed`; no
`player_faction` test.

### Phase 3 — tests

`tests/v092_tutorial_lane_b_auto_dismiss.test.ts` adds six contracts:

- **T1** — Composing `applyAdvanceStepPure` + `applyDismissPure` on a
  state where the player has finished steps 1-7 yields
  `dismissed === true` AND `completed_steps` containing all 8 ids. Also
  verifies that `isFinalStep` returns `true` only for `08_judge`.
- **T2** — `shouldShowOnboarding` returns `false` when the post-auto-dismiss
  state is round-tripped through JSON; active and undefined states still
  return `true`.
- **T3** — Static-grep guards: `SettingsScreen.tsx` imports the canonical
  `OnboardingRestartButton`, derives `tutorialDismissed` from
  `?.dismissed === true`, gates the JSX on `{tutorialDismissed && ...}`,
  and mounts the component with the IPC bridge.
- **T4** — The mount is hidden during active tutorial: the source-level
  gate appears before the mount and the model
  `state?.dismissed === true` evaluates `false` for active states.
- **T5** — `applyRestart` resets to a state where the next overlay mount
  resolves to step `01_welcome`; `shouldShowOnboarding` returns `true`.
- **T6** — Static-grep guards: `OnboardingOverlay.tsx` calls
  `ipc.dismissTutorial()` inside an `isFinalStep(next.id)` branch;
  `isFinalStep` references the canonical sorted `ONBOARDING_STEPS` list
  (not a hardcoded id); both files are deterministic (no
  `Math.random()`, `Date.now()`, or `new Date(...)` calls outside docstrings).

---

## Verification

- `npx vitest run tests/v092_tutorial_lane_b_auto_dismiss.test.ts tests/tutorial_content_v1.test.ts tests/tutorial_onboarding_skeleton.test.ts` → **14/14 GREEN** (6 + 5 + 3).
- `npx tsc --noEmit -p tsconfig.json` → clean (EXIT_CODE=0).
- `npm run desktop:map:build` → built in ~16s, EXIT_CODE=0.

---

## Determinism

- No `Math.random()`, no `Date.now()`, no `new Date(...)` outside docstrings.
- `isFinalStep` derives from `ONBOARDING_STEPS[length - 1]` — sorted
  lexicographic order, byte-stable.
- Pure helpers (`applyAdvanceStepPure`, `applyDismissPure`, `applyRestart`,
  `isFinalStep`) are synchronous and side-effect-free.

## Sensitive-history compliance

Ring 1, UI-only surface. `meta.tutorial_state` is documented as UI-only per
`StateMeta` design intent (sim does not read). Faction-agnostic: every step
body is enforced not-naming a faction (T2 in `tutorial_content_v1.test.ts`),
and the SettingsScreen gate reads only `dismissed`.

---

## Open Items / Deferred

Per the panel, Lane B items 3-5 (Back/scrub navigation, first-run-vs-returning
detection, contextual triggers) were intentionally NOT included in this
subset. Items 3 and 5 are panel-recommended deferrals to post-1.0; item 4
requires user direction on per-save vs per-user storage and triggers ST-3
(save-schema substrate addition). Those remain open for a follow-on Lane B
commit.

---

**END OF REPORT — `LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET`**
