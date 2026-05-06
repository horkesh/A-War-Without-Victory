# v0.9.2 Tutorial Lane C — Anchor Coverage Regression Test

**Lane:** `LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-C`
**Date:** 2026-05-06
**Type:** IMPLEMENTED (Ring 1, test-only, faction-agnostic)
**Mandate:** v0.9.2 tutorial fill-out Phase 0 — Lane C anchor coverage regression scope.
**Predecessor panel:** `docs/40_reports/audits/20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md` Lane C.
**Predecessors in flight:** A11y Lane B (`f496de43`) wired the previously-missing
`map-container` anchor; Tutorial Lane B subset (`20260506_V092_TUTORIAL_LANE_B_AUTO_DISMISS.md`)
shipped auto-dismiss + RestartButton mount.

---

## Summary

A regression test now asserts that **every anchor referenced by the canonical
8-step `OnboardingOverlay` step list has at least one corresponding emitter
under `src/`**. If a future modal-migration or refactor drops an anchor (e.g.
removes `data-tutorial-step="cost-ledger"` while reorganising
`WarCostSummary.tsx`), this test fails before the silent tutorial-spotlight
regression reaches a build. The test runs as a static-time fs+grep scan — it
does not render React, does not boot Electron, and does not depend on the
sim layer.

The test additionally guards against orphan emitters (anchors emitted in `src/`
but not referenced by either the canonical step list `TUTORIAL_SPOTLIGHT_TARGETS`
allow-list or a documented ancillary allowlist) and asserts deterministic /
faction-agnostic behaviour.

No production code was changed; no anchor was found genuinely missing during
authoring (per the lane spec, that would have been a Lane A successor concern
and a STOP signal).

---

## Files Touched (exclusive ownership)

| File | Purpose |
|---|---|
| `tests/v092_tutorial_anchor_coverage.test.ts` (NEW) | 8 contract tests (T1-T8). |
| `docs/40_reports/implemented/20260506_V092_TUTORIAL_LANE_C_ANCHOR_COVERAGE.md` (NEW; THIS FILE) | Lane report. |

**Not touched** (per lane spec):

- `src/ui/map/components/onboarding/OnboardingOverlay.tsx` — sibling Tutorial
  Lane E owns the overlay a11y surface.
- `src/ui/map/components/onboarding/onboardingSteps.ts` — canonical step list
  is read-only from this lane's perspective; no edit needed (every step has an
  emitter).
- `src/ui/map/map/MapContainer.tsx` — A11y Lane B already wired the
  `map-container` anchor; this lane confirms via test, no edit.
- `src/ui/map/components/PresidentialToolbar.tsx`,
  `src/ui/map/components/warroom/WarroomStatusBar.tsx`,
  `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`,
  `src/ui/map/components/army_hq/ArmyHQModal.tsx`,
  `src/ui/map/components/WarCostSummary.tsx` — emitters of the remaining 6
  anchors. All present, all coverage assertions GREEN.
- Sibling lane files (A11y Lanes C/E, Tutorial Lane E).

---

## Canonical Step List (at time of authoring)

The v0.9.2 tutorial is an 8-step campaign-loop overlay. Steps are sorted
lexicographically by `id` for byte-stable ordering across save/load. Source:
`src/ui/map/components/onboarding/onboardingSteps.ts` `ONBOARDING_STEPS`.

| # | `id` | Title | `target_ui_element` |
|---|------|-------|---------------------|
| 1 | `01_welcome` | You Are the President | `null` (overlay-self spotlight) |
| 2 | `02_map` | Reading the Map | `map-container` |
| 3 | `03_brief` | The Brief | `presidential-toolbar` |
| 4 | `04_inspect` | Inspect Before You Decide | `warroom-status-bar` |
| 5 | `05_decide` | The Decision Room | `decision-room` |
| 6 | `06_execute` | Operations | `army-hq-tab-briefing` |
| 7 | `07_report` | Advance and Read the Aftermath | `advance-turn-button` |
| 8 | `08_judge` | The Cost Ledger | `cost-ledger` |

`TUTORIAL_SPOTLIGHT_TARGETS` (the canonical allow-list) contains the seven
non-null anchors; `01_welcome` documented as the overlay-self spotlight case.

---

## Per-Anchor Coverage (verified at test runtime)

| Anchor | Emitter file | Emitter form |
|--------|--------------|--------------|
| `map-container` | `src/ui/map/map/MapContainer.tsx` | literal `data-tutorial-step="map-container"` (A11y Lane B) |
| `presidential-toolbar` | `src/ui/map/components/PresidentialToolbar.tsx` | literal |
| `warroom-status-bar` | `src/ui/map/components/warroom/WarroomStatusBar.tsx` | literal |
| `decision-room` | `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | literal |
| `army-hq-tab-briefing` | `src/ui/map/components/army_hq/ArmyHQModal.tsx` | template literal `data-tutorial-step={`army-hq-tab-${id}`}` over `HQ_TABS` (id `briefing`) |
| `advance-turn-button` | `src/ui/map/components/PresidentialToolbar.tsx` | literal |
| `cost-ledger` | `src/ui/map/components/WarCostSummary.tsx` | literal |
| `01_welcome` (self-anchor) | `src/ui/map/components/onboarding/OnboardingOverlay.tsx` | overlay self-emitter when `target_ui_element === null` |

Ancillary anchor allowlist (literal emitters under `src/` that are not
step targets but are documented sibling anchors):

| Anchor | Emitter file | Reason |
|--------|--------------|--------|
| `army-hq-tabs` | `src/ui/map/components/army_hq/ArmyHQModal.tsx` | tab-bar container; one DOM level above the per-tab buttons. Reserved as a future hover-target for an "open the tab bar" tutorial step. |

If a future change adds a literal `data-tutorial-step="<value>"` not present
in either the step list or this allowlist, T4 fails — the lane owner must
explicitly classify the new anchor as either step-targeted or ancillary
before merging.

---

## Test Contracts (8 total)

- **T1** — Canonical step list shape: 8 steps, sorted lexicographically by
  id, every non-null `target_ui_element` is in `TUTORIAL_SPOTLIGHT_TARGETS`.
- **T2** — Per-anchor emitter coverage: every step's `target_ui_element`
  AND every `TUTORIAL_SPOTLIGHT_TARGETS` token has at least one emitter in
  `src/` (literal or dynamic). Failure surfaces as a per-anchor list of
  unbacked promises.
- **T3** — Welcome-step exception: `01_welcome.target_ui_element === null`
  and the overlay's self-anchor branch
  (`data-tutorial-step={next.target_ui_element === null ? next.id : undefined}`)
  is verified to exist in `OnboardingOverlay.tsx`.
- **T4** — No orphan emitters: every literal `data-tutorial-step="<v>"`
  attribute under `src/` is either in `TUTORIAL_SPOTLIGHT_TARGETS` or in
  the documented `ANCILLARY_ANCHOR_ALLOWLIST`. The canonical owner file
  (`onboardingSteps.ts`) is excluded from orphan scanning because it
  documents anchors in docstrings rather than emitting them.
- **T5** — Static-grep guards: the test source itself contains no
  `Math.random` / `Date.now` / `new Date` outside docstrings (comment-stripped
  source check).
- **T6** — Faction symmetry: the canonical step list (titles + bodies)
  contains none of the faction tokens `RBiH`, `ARBiH`, `HRHB`, `HVO`, `VRS`,
  `Bosniak`, `Serb`, `Croat`. The test logic itself never reads
  `meta.player_faction`; verifiable by inspection (no faction-id branches
  anywhere in the file).
- **T7** — Manifest determinism: building the per-step emitter manifest
  twice yields a byte-identical JSON string. Literal-anchor discovery is
  also stable across calls.
- **T8** — Dynamic-anchor coverage for the army-hq tab family: the
  template-literal emitter
  `data-tutorial-step={`army-hq-tab-${id}`}` exists in `ArmyHQModal.tsx`
  AND the co-located `HQ_TABS` const contains an entry with
  `id: 'briefing'`. The aggregate finder discovers `ArmyHQModal.tsx` as
  an emitter for `army-hq-tab-briefing`.

---

## Regression-Prevention Guarantee

This test fails (preventing the change from merging) under any of the
following conditions:

1. The canonical step list changes shape (length, sort order, or a step's
   `target_ui_element` no longer matches `TUTORIAL_SPOTLIGHT_TARGETS`).
2. An emitter file is renamed/moved/deleted without a replacement emitter
   for the same anchor.
3. A `data-tutorial-step` attribute is removed from an emitter (e.g.
   accidental drop during a JSX refactor).
4. The `army-hq-tab-${id}` template literal in `ArmyHQModal.tsx` is
   restructured in a way that no longer yields `army-hq-tab-briefing`.
5. The overlay-self branch (`target_ui_element === null ? next.id : undefined`)
   is removed from `OnboardingOverlay.tsx` (welcome-step regression).
6. A new literal `data-tutorial-step="<v>"` is added without a corresponding
   step entry or ancillary-allowlist entry.

The test does NOT re-validate copy quality, modal a11y, or runtime overlay
rendering — those are owned by Tutorial Lane B / Lane E and the existing
`tutorial_content_v1.test.ts` suite. Lane C is a structural-coverage
sentinel only.

---

## Verification

- `npx vitest run tests/v092_tutorial_anchor_coverage.test.ts tests/tutorial_content_v1.test.ts tests/tutorial_onboarding_skeleton.test.ts tests/v092_tutorial_lane_b_auto_dismiss.test.ts` → **22/22 GREEN** (8 + 5 + 3 + 6).
- `npx tsc --noEmit -p tsconfig.json` → no errors attributable to this lane's files. Three unrelated TS errors in sibling `tests/v093_a11y_lane_e_forms_live_regions.test.ts` (A11y Lane E) are pre-existing and not within this lane's exclusive ownership.

---

## Determinism

- Pure fs reads + sorted iteration; no clock, no `Math.random`, no `new Date`.
- Source-file discovery uses `readdirSync(...).sort()` to enforce iteration
  order; the per-anchor emitter list is sorted; the manifest is JSON-encoded
  in step-id order.
- T7 explicitly asserts manifest byte-stability across re-runs.

## Sensitive-history compliance

Ring 1, test-only lane. The test never reads sim state, never reads
`meta.player_faction`, never asserts on faction-bearing data. T6 enforces
faction-agnostic copy in the canonical step list.

---

## Open Items / Deferred

None. Lane C scope is closed. If a future Lane A-style anchor-fix lane finds
a step whose anchor is structurally orphaned (no emitter exists and the
canonical owner needs an edit), that lane will own the fix; this test will
already be in place to catch it.

---

**END OF REPORT — `LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-C`**
