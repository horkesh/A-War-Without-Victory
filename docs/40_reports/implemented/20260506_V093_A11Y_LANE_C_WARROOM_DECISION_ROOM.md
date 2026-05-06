# v0.9.3 a11y Lane C — Warroom + Decision Room + tablist + 4 div-onClick fixes

**Lane ID:** `LANE-NIGHTSHIFT-V093-A11Y-LANE-C`
**Date:** 2026-05-06
**Phase 0 panel:** `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` (commit `49375b5a`)
**Status:** PARTIAL (closes the 4th P0 v1.0-ship a11y blocker — the clickable-div anti-pattern in 4 React files; the Warroom vanilla-TS shell remains for a follow-up lane).

## 1. Scope

Closes the four declared clickable-div anti-pattern fixes flagged in the A11y Phase 0 panel §3.1 (A2-A) and the Lane C acceptance criteria (C-C1, C-C2, C-C3).

### Files modified (exclusive ownership)

| File | Change |
|---|---|
| `src/ui/map/components/AARPanel.tsx` | Backdrop `<div onClick=...>` → real `<button>` with `aria-label="Close After-Action Report"`; close-X button hardened with `type="button"` + aria-label. |
| `src/ui/map/components/army_hq/ArmyHQModal.tsx` | (a) Outer wrapper `<div onClick=...>` → real `<button>` backdrop. (b) Tablist a11y: `role="tablist"` parent + `role="tab"` + `aria-selected` + `aria-controls` + roving tabindex on each of the four HQ tabs (BRIEFING/SUMMARY/RECORDS/PERSONNEL). (c) Tabpanel container carries `role="tabpanel"` + `aria-labelledby` linkage. (d) ArrowLeft/ArrowRight cycle (with wrap-around); Home/End jump to first/last. (e) `role="dialog"` + `aria-modal="true"` + `aria-label="Army Headquarters"` on the dialog root. |
| `src/ui/map/components/OperationHistoryPanel.tsx` | Backdrop `<div onClick=...>` → real `<button>` with `aria-label="Close Operations panel"`; close-X button hardened. |
| `src/ui/map/components/SituationTab.tsx` | Verified clean (no `<div onClick=...>` regression in current source); added A11y docstring citing the lane id and the static-grep guard so the file is included in the lane's regression test set. |
| `src/ui/map/components/TabBar.tsx` | Generic canonical TabBar promoted to full WAI-ARIA tablist pattern: `role="tablist"` + named `aria-label`, per-tab `role="tab"` + `aria-selected` + `aria-controls` + `id`, roving tabindex (`active=0`, others `-1`), and ArrowLeft/ArrowRight/Home/End keyboard navigation with focus management via callback ref map. New exported helpers `tabId()` / `tabPanelId()` so callers can wire a matching `<div role="tabpanel">` deterministically. |

### Files added

| File | Purpose |
|---|---|
| `tests/v093_a11y_lane_c_warroom_decision_room.test.ts` | 10 vitest tests pinning the lane's a11y contract. |
| `docs/40_reports/implemented/20260506_V093_A11Y_LANE_C_WARROOM_DECISION_ROOM.md` | This lane report. |

## 2. Per-file fix verdict

| File | Anti-pattern present pre-lane | Anti-pattern present post-lane | Verdict |
|---|---|---|---|
| `AARPanel.tsx` | YES (line 477 backdrop) | NO | FIXED |
| `ArmyHQModal.tsx` | YES (line 183 outer wrapper) | NO | FIXED + tablist a11y added |
| `OperationHistoryPanel.tsx` | YES (line 509 backdrop) | NO | FIXED |
| `SituationTab.tsx` | NO at lane start (already clean) | NO | VERIFIED CLEAN; added regression-guard docstring |
| `TabBar.tsx` | n/a (no clickable-div issue) | n/a | UPGRADED to full tablist a11y (was minimal `role="tablist"` + `role="tab"` + `aria-selected` only) |

## 3. Tests

`tests/v093_a11y_lane_c_warroom_decision_room.test.ts` — 10 tests, all GREEN:

- T1 — AARPanel.tsx contains no `<div onClick=...>` clickable-div anti-pattern.
- T2 — ArmyHQModal.tsx contains no `<div onClick=...>` clickable-div anti-pattern.
- T3 — OperationHistoryPanel.tsx contains no `<div onClick=...>` clickable-div anti-pattern.
- T4 — SituationTab.tsx contains no `<div onClick=...>` clickable-div anti-pattern.
- T5 — TabBar renders `role="tablist"` + `role="tab"` + `aria-selected` reflecting active state, plus `aria-controls` / `id` linkage; helper IDs (`tabId`, `tabPanelId`) round-trip.
- T6 — TabBar arrow-key navigation cycles (Right/Left wrap; Home/End jump).
- T7 — TabBar applies roving tabindex (active=0, others=-1).
- T8 — ArmyHQModal source declares tablist + tab roles + `aria-controls` / `aria-labelledby` linkage + `onKeyDown` handler + canonical `army-hq-tab-*` / `army-hq-tabpanel-*` ID derivation.
- T9 — Lane source files are faction-symmetric + free of determinism red flags (Math.random, Date.now, new Date(, localeCompare on UI-pure files).
- T10 — All five lane files cite `LANE-NIGHTSHIFT-V093-A11Y-LANE-C` in an A11y comment.

## 4. Lane C acceptance criteria coverage

| Criterion | Coverage |
|---|---|
| C-C1 (TabBar tablist + tabpanel structure + aria-selected + aria-controls) | DONE — implemented in `TabBar.tsx`; pinned by T5/T7/T8. |
| C-C2 (Arrow-key navigation + wrap-around) | DONE — Left/Right wrap + Home/End jump; pinned by T6. |
| C-C3 (4 div-onClick → button conversions) | DONE — AARPanel + ArmyHQModal + OperationHistoryPanel; SituationTab verified clean. Pinned by T1–T4. |
| C-C4 (Heading hierarchy in Army HQ + Decision Room) | DEFERRED — out of declared file ownership for this lane (`SituationBriefing.tsx`, `PresidentialDecisionRoomPanel.tsx`, etc. were not granted to this lane). Tracked in follow-up. |
| C-C5 (Warroom-shell DOM-injected modals carry accessible name) | DEFERRED — vanilla-TS Warroom shell (`src/ui/warroom/**`) was not in this lane's exclusive ownership and is best paired with Playwright e2e (Lane C2 follow-up). |
| C-C6 (Tutorial `data-tutorial-step` anchors preserved) | VERIFIED — `data-tutorial-step="army-hq-tabs"` and `data-tutorial-step="army-hq-tab-${id}"` retained on the tablist + each tab button (lines 282-308 of `ArmyHQModal.tsx`). |
| C-C7 (Tests green) | DONE — vitest 10/10 GREEN. (Playwright e2e Warroom test deferred with C-C5.) |

## 5. Sensitive-history compliance

- **Ring:** Ring 1 (UI surface only — React component a11y plumbing).
- **§6 surface:** None.
- **Faction symmetry:** All changes faction-agnostic. Static-grep guard in T9 enforces no `if (faction === 'X')` branches in lane code.
- **Determinism:** T9 enforces no `Math.random` / `Date.now` / `new Date(` / `localeCompare` in the strict UI-scaffold files (`TabBar`, `ArmyHQModal`).

## 6. Verification

- `npx vitest run tests/v093_a11y_lane_c_warroom_decision_room.test.ts` — 10/10 GREEN (1.76 s).
- `npx tsc --noEmit -p tsconfig.json` — clean.
- `npm run desktop:map:build` — built in 16.45 s, no errors.

## 7. Stop-trigger compliance

- No visible-behavior regression: backdrop button uses `cursor-default` + identical visual styling to the prior div; tabs render visually identical to before; close-X buttons keep the same rendered glyph (`✕`). Tutorial spotlight anchors preserved.
- No determinism / sim bleed: zero touch to `src/sim/` or `src/state/`.
- No public-component-API break: TabBar's new props (`idPrefix`, `ariaLabel`) are optional with sensible defaults; existing callers (none yet) continue to compile.

## 8. Follow-ups

- Lane C2 (Warroom DOM-injected accessible names + Playwright e2e) — deferred.
- Heading hierarchy sweep in Army HQ briefing surfaces (C-C4) — deferred (different file ownership).
- Wire `army-hq-tab-*` / `army-hq-tabpanel-*` IDs into onboarding spotlight queries if/when the tutorial transitions from `data-tutorial-step="*"` to ARIA-id-based queries.
