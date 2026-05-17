# GUI Playtest Defects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan track-by-track. Use `superpowers:systematic-debugging` for the runtime defects (D1, D2, D5). Use `superpowers:test-driven-development` for the data-binding fixes (D3, D4).

**Goal:** Close the 15 real defects and the highest-leverage recommendations surfaced by the 2026-05-16 RS playtest of v0.9.6-alpha.1, sequenced by severity so launch-blocking bugs land first and cosmetic items last.

**Architecture:** The playtest exercised the live boot path (Warroom → faction picker → Map → War Begins → tutorial → turn 0 inspection → Continue → turn 40 Vance-Owen modal). Defects cluster into 7 thematic tracks. Each track is an independently dispatchable lane with file ownership, sequenced steps, acceptance criteria, and tests-first discipline where applicable.

**Tech Stack:** TypeScript, React, Vite, MapLibre/Deck.gl, Zustand store, Electron, Vitest. No new dependencies. No simulation authority introduced — every fix consumes existing engine truth.

**Date:** 2026-05-16. **Source:** `GUI_PLAYTEST_2026-05-16.md` (Cowork-mode RS playtest, v0.9.6-alpha.1).

---

## Supersedes / Corrects

This plan **does not supersede** the parallel `docs/plans/2026-05-16-gui-polish-action-plan.md` (which covers the LIV-P0/P1/P2 findings from `GUI_POLISH_MASTER.md` — paramilitary inbox, officer filter, warroom polish, AdvanceTurnModal palette, first-run sequence).

This plan covers the **remaining 11 playtest defects** + the 13 recommendations not addressed by the polish action plan. Together, the two plans close the entire 2026-05-16 playtest finding set.

**Sequencing relative to the polish action plan:**
- The polish action plan's Tasks 1–3 (paramilitary inbox) are the **highest-priority work overall** — they unblock sensitive-history credibility.
- This plan's Track D1 (ADVANCE_TURN silent no-op) is the **next launch-blocker** — without it, the player cannot progress past a Decision Room block.
- This plan's Track D2 (deck.gl polygon asserts) silently disables two legendary v0.9.4 map features (Map That Scars, Force-Quality Glow) — must close before v1.0.

Coordinate file ownership: this plan does not touch `inboxItems.ts`, `GameStateAdapter.ts`, `AdvanceTurnModal.tsx`, `WarroomShellLayer.tsx`, or `OnboardingOverlay.tsx` except where explicitly noted (Track D6 adds inbox dedupe, which extends `inboxItems.ts` — must serialize after polish plan Task 2).

---

## Inputs

- `GUI_PLAYTEST_2026-05-16.md` (source — at project root)
- `docs/plans/2026-05-16-gui-polish-action-plan.md` (parallel plan)
- `docs/40_reports/GUI_POLISH_MASTER.md` (LIV-* findings overlap)
- `docs/40_reports/GAME_STATE_RATING_MASTER.md` (impacts ratings #17, #21, #22, #24)
- `docs/40_reports/GUI_MASTER.md` (update on close)
- `docs/plans/MASTER_ROADMAP.md` (integration target)
- `docs/plans/2026-05-16-aaa-triple-plus-shipping-plan.md` (Track B / Phase 0 alignment)

---

## Severity classification

The 15 defects split into 3 severity tiers:

| Tier | Defects | Reason |
|------|---------|--------|
| **P0 — Launch blocker** | #15 ADVANCE_TURN silent no-op, #2 deck.gl polygon asserts, rec #12 (HQ REVIEW → blank map error-boundary gap) | Primary action silently broken; legendary map features invisible; entire game view can blank from one panel render failure (HMR-triggered in dev, but the failure mode would be indistinguishable from a real prod render bug — playtest explicitly flagged this for an error boundary). |
| **P1 — Player-visible defect** | #10 / #11 / #12 / #13 Vance-Owen modal, #14 inbox dedupe, #5 personnel mismatch, #9 tutorial replay on Continue, #4 OPSEC inconsistency, #3 War Summary empty placeholders, #6 RECORDS button no-op, #7 OPS z-order, #1 \U2014 literal | Visible to player on first run; erodes trust; breaks immersion. |
| **P2 — Cosmetic / dev-only** | #8 DEFENSE duplicate label, #16/17/18 dev-environment issues (browser dev, host names, popup) | Survivable; should close before v1.0 but not gating. |

---

## Track inventory

| Track | Theme | Severity | Defects covered | Effort |
|------:|-------|---------|-----------------|------:|
| **D1** | Primary-action feedback (ADVANCE_TURN) + error boundary | P0 | #15 + rec #12 | ~3d |
| **D2** | Deck.gl polygon overlay assertion fixes | P0 | #2 | ~3d |
| **D3** | Vance-Owen peace-plan modal pass | P1 | #10, #11, #12, #13 | ~4d |
| **D4** | War Summary completeness + reconciliation | P1 | #3, #4, #5 | ~3d |
| **D5** | Save persistence + tutorial-seen flag | P1 | #9 | ~1d |
| **D6** | Inbox dedupe + RECORDS button clarity | P1 | #6, #14 | ~2d |
| **D7** | Visual polish + dev cleanup | P1/P2 | #1, #7, #8, #16, #17, #18 | ~2d |
| **R** | Cross-cutting recommendations | varies | rec #1, #2, #12, #13 | ~5d |

**Total: ~23 person-days** (single-stream) or **~7 days at 3-way parallelism**. Tracks D1, D2, D5, D7, R are file-disjoint and parallel-safe.

---

## Track D1 — Primary-action feedback

**Origin:** Playtest defect #15 + recommendation #12. The ADVANCE_TURN button at turn 40 is unresponsive — accepts clicks, no state change, no console log, no toast, no modal. This is the **worst possible UX state for a primary action**. Separately, the HQ REVIEW click during the playtest blanked the entire map; the trigger was dev-mode HMR, but the playtest explicitly recommended an error boundary because the failure mode is indistinguishable from a real prod render bug (rec #12 in the consolidated list).

**Owner agents:** `ui-ux-developer` lead; `systems-programmer` for the Decision Room gate behavior.

**Files:**
- Modify: `src/ui/map/components/PresidentialToolbar.tsx` (the ADVANCE_TURN button — read its gating logic; surface the block)
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx` (mirror the same gate behavior)
- Modify: `src/ui/map/data/preAdvanceCommandReview.ts` or equivalent (read the existing pre-advance readiness packet)
- Create: `src/ui/map/components/RootErrorBoundary.tsx` (panel-level error boundary)
- Modify: `src/ui/map/App.tsx` (wrap right-panel rail + MapContainer in their own error boundaries)
- Test: `tests/ui/advance_turn_button_gated_feedback.test.ts` (new)
- Test: `tests/ui/error_boundary_isolation.test.ts` (new)

**Steps:**

**D1.1 — Surface the ADVANCE_TURN gate (defect #15)**
1. Audit existing pre-advance gate logic. Confirm whether ADVANCE_TURN is currently disabled / clickable-but-no-op when the Decision Room has pending blocking items.
2. **TDD:** write failing tests asserting:
   - Button shows a tooltip "Resolve N pending decisions to continue" when blocked.
   - Button auto-opens the Decision Room modal when clicked-while-blocked, OR shows an inline toast/banner with the block reason.
   - Click on un-blocked state advances normally.
3. Implement the gate-feedback path. Reuse `buildPreAdvanceCommandReviewView(...)` — do not invent new sim authority.
4. Mirror behavior in `WarroomStatusBar.tsx` ADVANCE button (parity per GUI_POLISH P1-19).

**D1.2 — Add panel-level error boundary (defect #17)**
1. Create `RootErrorBoundary` component (class component or `react-error-boundary`-style functional wrapper).
2. **TDD:** write failing test asserting that a component throwing inside the right rail does NOT blank the map container.
3. Wrap each major panel mount (right panel rail, MapContainer, OOBSidebar, BottomStatusStrip) in independent boundaries.
4. Boundary fallback UI: small "Panel failed to render — click to reload" message; logs error to console + Sentry-shaped payload (telemetry wire-up is Track P in the AAA+++ shipping plan, but error capture is ready for it).

**Acceptance criteria (Done Means):**
- ✅ At turn 40 with blocking items, clicking ADVANCE_TURN produces visible feedback (tooltip OR auto-open of Decision Room OR toast).
- ✅ Aria-disabled / disabled state is consistent: if button is unresponsive, it's visually disabled too.
- ✅ Triggering a render error inside the right panel preserves map + sidebar + toolbar visibility.
- ✅ Tests committed for both behaviors.
- ✅ `GUI_PLAYTEST_2026-05-16.md` defect #15 marked RESOLVED + recommendation #12 marked IMPLEMENTED.

**Effort:** ~3 person-days.

---

## Track D2 — Deck.gl polygon overlay assertion fixes

**Origin:** Playtest defect #2. Two deck.gl `SolidPolygonLayer` initializations fail on every page load:
```
deck: initialization of SolidPolygonLayer({id: 'osid-damage-overlay-fill'})
deck: initialization of SolidPolygonLayer({id: 'force-quality-glow-overlay-fill'})
```
Cause: `@math.gl/web-mercator: assertion failed` in `lngLatToWorld` — invalid coordinates (NaN or out-of-bounds lat/lng) in the polygon set. **Result: both overlays silently absent.** These are v0.9.4 "legendary map features" (Map That Scars + Force-Quality Glow) — invisible until fixed.

**Owner agents:** `graphics-programmer` lead; `data-pipeline-engineer` for any data-side coord clamp; `determinism-auditor` for the clamp policy (must not introduce non-determinism).

**Files:**
- Modify: `src/ui/map/layers/buildOsidDamageOverlay.ts`
- Modify: `src/ui/map/layers/buildForceQualityOverlay.ts`
- Reference: `src/ui/map/map/MapContainer.tsx` (where layers compose)
- Reference: `data/derived/operational/osid_areas.json` + OSID centroid lookup tables (likely coord source)
- Reference: `data/derived/osid_damage_seed.json` (v0.9.4 R2-5 lane data)
- Test: `tests/ui/osid_damage_overlay_coord_validity.test.ts` (new)
- Test: `tests/ui/force_quality_overlay_coord_validity.test.ts` (new)

**Steps:**

**D2.1 — Reproduce + classify**
1. Boot dev map, capture full console asserts including any payload identifying the offending OSID(s).
2. Write a diagnostic in either tools/diagnostics/ or as part of the test that walks the geometry array and reports every record where any vertex has non-finite or out-of-bounds (lat outside [-90, 90], lng outside [-180, 180]) coordinates.

**D2.2 — Fix at source if possible**
1. If the bad coords come from OSID centroid lookups, the upstream fix lives in `data/derived/`. Confirm with `data-pipeline-engineer`.
2. If the source is correct but a builder is producing NaN (e.g., division by zero in a damage-intensity → radius calculation), fix the builder.

**D2.3 — Defensive guard at builder boundary**
1. In both `buildOsidDamageOverlay.ts` and `buildForceQualityOverlay.ts`, add a filter pass that skips records with non-finite or out-of-bounds coords AND logs a one-time warning per OSID. This prevents future data drift from blanking the overlay.
2. The filter must be deterministic — sorted iteration, no randomness, no timestamps.

**D2.4 — TDD with both layer-builder tests + integration**
1. Test: builder receives a record with NaN coords → output array contains zero records for that OSID, warning logged exactly once.
2. Test: builder receives a well-formed record → output matches expected polygon structure.
3. Integration: full map render in jsdom or Playwright produces zero deck.gl assertion errors.

**Acceptance criteria (Done Means):**
- ✅ Zero deck.gl `lngLatToWorld` assertion errors on dev map boot.
- ✅ Both overlays visibly render when their map mode is active (visual confirmation required — Playwright screenshot OR manual verification per the existing visual regression bar from Track B5 of the AAA+++ shipping plan).
- ✅ Builders silently skip + warn on bad coords; no crash if data drifts.
- ✅ Determinism preserved — 40w hash stable across baseline reruns.
- ✅ `GUI_PLAYTEST_2026-05-16.md` defect #2 marked RESOLVED.

**Effort:** ~3 person-days (1 reproduce, 1 fix, 1 test + visual).

---

## Track D3 — Vance-Owen peace-plan modal pass

**Origin:** Playtest defects #10, #11, #12, #13. The Vance-Owen modal at turn 40 has 4 distinct bugs:
- #10: territorial-division bars render 0% / 0% / 0% — empty data or rendered before payload loads.
- #11: RS listed under "OTHER FACTION RESPONSES" when the player IS RS — proposing/responding faction not filtered out.
- #12: no close/dismiss button — only Accept/Reject; players forced to commit.
- #13: REJECT PLAN doesn't dismiss the inbox card; INBOX count stays at 41.

**Owner agents:** `ui-ux-developer` + `game-designer` (Reject vs Defer semantics) + `historian` (Vance-Owen-specific copy).

**Files:**
- Modify: `src/ui/map/components/PeacePlanModal.tsx`
- Reference: `src/sim/negotiation/peace_plan_resolution.ts` or equivalent (for Reject semantics — does it dispatch through IPC?)
- Reference: `src/ui/map/data/inboxItems.ts` (peace_plan derivation — confirm card removal logic)
- Reference: data/scenarios/events/ for Vance-Owen proposal payload shape
- Test: `tests/ui/peace_plan_modal.test.ts` (extend or create)

**Steps:**

**D3.1 — Diagnose data binding (defect #10)**
1. Capture the actual `pendingPeacePlan` payload at turn 40 (Continue save). Log shape.
2. Identify whether `0%/0%/0%` is (a) empty data on the model side, (b) modal rendering before data lands, or (c) mismatched key names in the binding.
3. **TDD:** write test with realistic Vance-Owen payload asserting bars render non-zero percentages.
4. Fix the binding mismatch OR add a loading state with a spinner.

**D3.2 — Filter player faction from "OTHER FACTION RESPONSES" (defect #11)**
1. **TDD:** write test asserting that when `player_faction === 'RS'`, the modal does NOT list RS under "OTHER FACTION RESPONSES".
2. Implement the filter — read `player_faction` from store, filter the response list.

**D3.3 — Add Close / Defer button (defect #12)**
1. Add an `[X]` close button at top-right and/or a `Defer for now` action in the action row.
2. Closing without responding leaves the proposal pending; the player can re-open from the inbox card.
3. **TDD:** assert close button exists, modifying handler keeps proposal pending.
4. Sensitive-history note: defer copy must not imply "wait for a better deal" — phrase as "Review later" or "Defer decision". `historian` reviews.

**D3.4 — Wire REJECT to inbox card removal (defect #13)**
1. **TDD:** assert that after a successful REJECT, the inbox no longer surfaces the same peace_plan_modal card; INBOX badge decrements.
2. Trace the existing REJECT IPC: where does the response go? Does it clear `pendingPeacePlan`, or does the inbox derivation still read it?
3. Most likely fix: `inboxItems.ts` derivation must check whether the player has already responded, not just whether `pendingPeacePlan !== null`. Add a `playerResponse` field check or rely on a `resolved_turn` timestamp.

**Acceptance criteria (Done Means):**
- ✅ Vance-Owen modal at turn 40 renders non-zero percentage bars.
- ✅ RS does not appear in "OTHER FACTION RESPONSES" when player faction is RS.
- ✅ Modal has Close / Defer affordance reviewed by historian.
- ✅ REJECT decrements INBOX count and removes the peace_plan card from the inbox.
- ✅ All 4 defects covered by tests.
- ✅ Defects #10–#13 marked RESOLVED.

**Effort:** ~4 person-days.

---

## Track D4 — War Summary completeness + reconciliation

**Origin:** Playtest defects #3, #4, #5.
- #3: CONVOYS, SUPPORT, CAPITAL tabs render empty containers with no placeholder.
- #4: OPSEC tab lists 2 operations; OPS view lists 5 — undocumented filter or stale.
- #5: "WAR BEGINS" briefing says 82.5k VRS personnel; WAR SUMMARY · OVERVIEW says 118k — same screen lacks label distinguishing the two.

**Owner agents:** `ui-ux-developer` (empty states + labels) + `game-designer` (personnel semantics) + `gameplay-programmer` (OPSEC filter logic).

**Files:**
- Modify: `src/ui/map/components/WarSummaryModal.tsx`
- Modify: `src/ui/map/components/army_hq/WarSummaryContent.tsx`
- Create: `src/ui/map/components/EmptyState.tsx` (reusable per recommendation #2)
- Reference: data source for personnel — likely `src/state/game_state.ts` or `derivePersonnel*` helpers
- Reference: OPSEC source — likely sector intel reports
- Test: `tests/ui/war_summary_empty_states.test.ts` (new)
- Test: `tests/ui/war_summary_personnel_label.test.ts` (new)
- Test: `tests/ui/war_summary_opsec_reconciliation.test.ts` (new)

**Steps:**

**D4.1 — Create `<EmptyState>` component** (~1d, also closes recommendation #2)
1. Generic empty-state with icon slot + message slot + optional CTA.
2. Stylable per panel context (dark shell consistent).
3. **TDD:** component renders with required `message` prop.

**D4.2 — Type the War Summary panel render contract**
1. Each tab's render function must return `rows: Row[]` OR an `<EmptyState message="..." />`.
2. **TDD:** assert that every War Summary tab with zero data renders an EmptyState (CONVOYS, SUPPORT, CAPITAL today; defensive cover for future tabs).

**D4.3 — Personnel label reconciliation (defect #5)**
1. Determine the actual distinction between 82.5k and 118k (likely at-arms vs mobilized, or excluding/including TO/police, or live formations vs historical max).
2. Label both screens explicitly: e.g., `82.5k at arms` and `118k mobilized · 82.5k at arms · 35.5k reserve / TO`.
3. **TDD:** assert that the WAR SUMMARY OVERVIEW renders both numbers with explicit labels.
4. If the two screens count different things, the WAR BEGINS briefing also gets the same label.

**D4.4 — OPSEC vs OPS reconciliation (defect #4)**
1. Determine actual semantics: is OPSEC filtering for "operations under OPSEC restriction" or is it stale data?
2. If filtering: add a subheading `Operations under OPSEC restriction (2 of 5)` so the player understands the filter.
3. If stale: fix the OPSEC list to consume the same operation source as the OPS view.
4. **TDD:** assert that OPSEC count + ops-view count are either equal OR the OPSEC subheading explicitly explains the difference.

**Acceptance criteria (Done Means):**
- ✅ `<EmptyState>` component lives + is reusable.
- ✅ CONVOYS, SUPPORT, CAPITAL tabs render an EmptyState when zero data, never a blank container.
- ✅ Personnel numbers on both WAR BEGINS and WAR SUMMARY are labeled with what they count.
- ✅ OPSEC list either matches OPS view count or has an explicit subheading explaining the filter.
- ✅ Defects #3, #4, #5 marked RESOLVED.

**Effort:** ~3 person-days.

---

## Track D5 — Save persistence + tutorial-seen flag

**Origin:** Playtest defect #9. Tutorial overlay replays on Continue at week 40. The tutorial-seen flag is in `localStorage`, not in the save file. This means: (a) save shared across machines re-tutorials the player, (b) localStorage clear re-tutorials the player, (c) loading any save replays it.

**Owner agents:** `ui-ux-developer` + `systems-programmer` (save schema extension).

**Files:**
- Modify: `src/state/game_state.ts` or wherever `StateMeta.tutorial_state` lives (already exists per Memory — `R2-3` ship)
- Modify: `src/ui/map/components/onboarding/OnboardingOverlay.tsx`
- Modify: `src/ui/map/components/FirstTurnOrientationCard.tsx`
- Modify: `src/ui/map/desktop/useIPC.ts` + `src/desktop/preload.cjs` + `src/desktop/electron-main.cjs` (tutorial dismissal IPC already exists — verify it writes to save)
- Test: `tests/ui/tutorial_persisted_in_save.test.ts` (new)
- Test: `tests/state/state_migration.test.ts` (extend — backward-compat with saves missing tutorial_state)

**Steps:**

**D5.1 — Confirm `tutorial_state` save persistence**
1. Per Memory: `StateMeta.tutorial_state` field was added by R2-3 (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON, commit `e4c661d5`). Confirm the dismissal IPC writes it back to save.
2. **TDD:** load a save with `tutorial_state.dismissed === true` → onboarding overlay does NOT render.

**D5.2 — Treat any save with non-fresh state as tutorial-seen**
1. If the save's turn > 0, OR the player has already issued any order, OR any decision has been resolved, treat tutorial as implicitly seen — even if `tutorial_state.dismissed` is not yet set.
2. **TDD:** load a turn-40 save with no explicit `tutorial_state` → onboarding does NOT render.

**D5.3 — Backward-compat for older saves**
1. State migration: saves missing `tutorial_state` default to dismissed=true when turn > 0, dismissed=false when turn === 0.
2. **TDD:** state migration test covers both branches.

**Acceptance criteria (Done Means):**
- ✅ Continue (Last Run) at turn 40 does NOT replay tutorial.
- ✅ New campaign (turn 0) DOES show tutorial.
- ✅ Once dismissed, save persists the flag; subsequent loads of that save respect it.
- ✅ Older saves without the field default sensibly per turn number.
- ✅ Defect #9 marked RESOLVED.

**Effort:** ~1 person-day.

---

## Track D6 — Inbox dedupe + RECORDS button clarity

**Origin:** Playtest defects #6, #14.
- #14: 4+ duplicate "PERSONNEL Matter — Regarding Ratko Mladić" cards stack in the Inbox without dedupe. Same underlying event emitted on every turn it remains unresolved.
- #6: RECORDS button in the top toolbar highlights when clicked but opens nothing distinct from the left COMMAND panel. Tutorial promises "RECORDS opens Army HQ" — over-sells it.

**Owner agents:** `ui-ux-developer` + `narrative-designer` (RECORDS button label / tutorial copy reconciliation).

**Files:**
- Modify: `src/ui/map/data/inboxItems.ts` (dedupe by `(event_kind, subject_id)`)
- Modify: `src/ui/map/components/PresidentialInbox.tsx` (render `+N updates` indicator on deduped cards)
- Modify: `src/ui/map/components/PresidentialToolbar.tsx` (RECORDS button — either remove if redundant, or wire to a distinct view)
- Modify: `src/ui/map/components/onboarding/onboardingSteps.ts` (update tutorial copy if RECORDS behavior changes)
- Test: `tests/ui/inbox_dedup.test.ts` (new)
- Test: `tests/ui/records_button_behavior.test.ts` (new)

**Steps:**

**D6.1 — Inbox dedupe (defect #14)**
1. **TDD:** state with 4 officer_event entries all for `subject_id: 'ratko_mladic'` → `deriveInboxItems()` returns ONE card with metadata indicating 4 underlying events.
2. Implement dedupe key: `(event_kind, subject_id)` for officer_event; `(event_kind, target_osid)` for paramilitary; generic key for others.
3. UI: when count > 1, render `+N updates` chip; click expands all entries.
4. **Coordination:** this extends the same `inboxItems.ts` as the polish action plan's Task 2. **Serialize this after polish action plan Task 2 closes.**

**D6.2 — RECORDS button decision (defect #6)**
1. Decide with `game-designer` + user: is RECORDS supposed to be (a) a distinct full Army HQ records modal, (b) a shortcut to the left COMMAND panel, or (c) deprecated?
2. If (a): wire to open `ArmyHQModal` with the Records tab pre-selected.
3. If (b): remove the button OR add a tooltip clarifying it scrolls/focuses the COMMAND panel.
4. If (c): remove the button; update tutorial copy (`onboardingSteps.ts` step 3) to remove the RECORDS promise.
5. **TDD:** assert that clicking RECORDS produces a visible state change.

**Acceptance criteria (Done Means):**
- ✅ Inbox shows ONE Mladić card with `+3 updates` chip, not 4 duplicate cards.
- ✅ Generalized dedupe applies across all `(event_kind, subject_id)` clusters.
- ✅ RECORDS button has a clear, tested behavior — either opens a distinct surface, or is deprecated with tutorial copy updated.
- ✅ Defects #6, #14 marked RESOLVED.

**Effort:** ~2 person-days.

---

## Track D7 — Visual polish + dev cleanup

**Origin:** Playtest defects #1, #7, #8, #16, #17, #18. These are the smaller, faster polish items.

**Owner agents:** `ui-ux-developer` (D7.1, D7.2, D7.3); `build-engineer` (D7.4, D7.5, D7.6).

**Files (per sub-track below).**

**D7.1 — `\U2014` literal in Presidential Brief button (defect #1)**
1. Find the source — likely `PresidentialInbox.tsx` OpeningBrief component (`Understood \\u2014 Begin`).
2. Fix: render real em-dash character.
3. Add `tests/ui/no_unicode_escapes_in_rendered_text.test.ts` per recommendation #1 — scan all rendered text in JSX for `\u` or `\U` literal sequences. Implements rec #1.
4. ✅ Effort: ~0.5d.

**D7.2 — OPS-view right panel z-order (defect #7)**
1. The Field Ops Snapshot panel hides behind Presidential Inbox when OPS view is active. Per rec #6: single right-column container, swap content based on top-bar selection rather than stacking.
2. Modify the panel rail to make Field Ops + Inbox mutually exclusive in OPS mode.
3. **TDD:** assert that in OPS mode, only one of (Field Ops, Inbox) is mounted on the right.
4. ✅ Effort: ~0.5d.

**D7.3 — Bottom-bar "DEFENSE" duplicate label (defect #8)**
1. Locate the duplicate in `BottomStatusStrip.tsx` — likely a primary-modes vs secondary-modes overlap.
2. Fix: render each label once.
3. **TDD:** assert that when `+MORE` is expanded, no label appears twice.
4. ✅ Effort: ~0.5d.

**D7.4 — Standardize dev host name (defect #17)**
1. Standardize Warroom + Map dev servers on `127.0.0.1` OR `localhost` — not both.
2. Update Vite configs + any IPC origin checks.
3. Document in `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`.
4. ✅ Effort: ~0.5d. Closes related auto-spawn / CORS / popup issues (defects #16, #18 by side effect).

**Acceptance criteria (Done Means):**
- ✅ No `\u` / `\U` literal sequences in rendered text; lint rule live.
- ✅ OPS mode shows only one right panel.
- ✅ DEFENSE label appears once.
- ✅ Dev servers on consistent host name.
- ✅ Defects #1, #7, #8, #16, #17, #18 marked RESOLVED.

**Effort:** ~2 person-days.

---

## Track R — Cross-cutting recommendations

These are the recommendations from the playtest that don't map to a single defect and would prevent future defects:

**R.1 — Unicode unescape build-step lint** (closes recommendation #1)
- Already implemented in D7.1 as a side-effect — confirm it's catching all rendered text.

**R.2 — `<EmptyState>` component + render-contract typing** (closes recommendation #2)
- Already implemented in D4.1 — confirm the contract is enforced beyond War Summary (audit all tabbed modals).

**R.12 — Error boundaries** (closes recommendation #12)
- Already implemented in D1.2.

**R.13 — Investigate deck.gl `lngLatToWorld` failures** (closes recommendation #13)
- Already implemented in D2.

**R.5 — Faction-choice postMessage handoff (Warroom → Map)** (closes recommendation #5)
- Defects #16, #17, #18 cluster: double picker, host inconsistency, auto-spawn fragility. R.5 fixes them upstream by handing the faction choice via `postMessage` from Warroom → Map opener, eliminating the double picker entirely.
- **Files:** `src/ui/warroom/warroom.ts` (postMessage send), `src/ui/map/App.tsx` (postMessage receive), `src/ui/map/components/SidePickerOverlay.tsx` (skip when opener handoff present).
- **TDD:** assert that when `window.opener` exists and a faction handoff message arrives, SidePicker auto-resolves without UI.
- ✅ Effort: ~2 person-days.

**R-extras for sensitive-history product polish:**
- Personnel cards labeled (already in D4.3).
- Vance-Owen dismissal semantics reviewed by historian (already in D3.3).

**Effort total: ~5 person-days, but most folded into D1–D7 (only R.5 is standalone, ~2d).**

---

## Sequencing / dependency graph

```
PARALLEL POLISH ACTION PLAN  (separate file)
  Task 1–3 (paramilitary inbox)        ─── runs in parallel
  Task 4   (officer filter)            ───
  Task 6   (AdvanceTurnModal palette)  ───
  Task 7   (warroom polish)            ───
  Task 8   (first-run pass)            ───

THIS PLAN — D-tracks (file-disjoint, parallel-safe)
  D1  ADVANCE_TURN + error boundary  ──┐
  D2  deck.gl polygon overlay fix    ──┤
  D3  Vance-Owen modal               ──┤
  D4  War Summary + EmptyState       ──┤  ⇐ blocks Track B5 of AAA+++ shipping (typography)
  D5  Tutorial-seen save persistence ──┤
  D6  Inbox dedupe + RECORDS         ──┤  ⇐ must serialize AFTER polish plan Task 2 (extends same file)
  D7  Visual polish                  ──┤
  R.5 Faction handoff (postMessage)  ──┘
                                       ↓
                                     v0.9.7-rc bump after all close
```

Suggested 3-way parallel split:
- **Stream A:** D1, D2 (P0 launch blockers) + R.5
- **Stream B:** D3, D6 (Vance-Owen modal + RECORDS + inbox dedupe — needs polish plan Task 2 closed first)
- **Stream C:** D4, D5, D7 (War Summary + tutorial persistence + visual polish)

**Calendar:** ~5–7 days at 3-way parallelism. ~23 days single-stream.

---

## Acceptance criteria — whole-plan level

This plan is DONE when:

1. ✅ All 15 playtest defects have status RESOLVED or DEFERRED-WITH-REASON in `GUI_PLAYTEST_2026-05-16.md`.
2. ✅ All 4 cross-cutting recommendations (rec #1, #2, #12, #13) are live, plus rec #5.
3. ✅ Full focused regression GREEN:
   ```
   npx vitest run tests/ui/
   npm run typecheck
   npm run desktop:map:build
   ```
4. ✅ Live smoke (browser + Electron):
   - New RS campaign → no `\U2014` literal visible.
   - Dev map boot → zero deck.gl assertion errors.
   - Continue (last run) at turn 40 → tutorial does NOT replay.
   - Continue → Vance-Owen modal → percentages render, RS not in "OTHER", Close button exists, REJECT decrements INBOX.
   - Continue → ADVANCE_TURN gives visible feedback when blocked.
   - Trigger render error in right panel → map remains rendered.
   - Mladić personnel card shows ONE entry with `+N updates` indicator.
5. ✅ `GUI_PLAYTEST_2026-05-16.md` updated with closing summary + cross-link to implementation report.
6. ✅ `docs/40_reports/GUI_MASTER.md` "Recent GUI changes" table cites the closeout.
7. ✅ Implementation report committed: `docs/40_reports/implemented/YYYYMMDD_GUI_PLAYTEST_DEFECTS_CLOSEOUT.md` with verification screenshots.

---

## Open design questions (must resolve before relevant track starts)

1. **Q-DEFER-COPY** (Track D3.3): Exact copy for the Vance-Owen Defer/Close button. Owner: `narrative-designer` + `historian` + user.
2. **Q-RECORDS-SEMANTICS** (Track D6.2): Is RECORDS a distinct view, a shortcut, or deprecated? Owner: `game-designer` + user.
3. **Q-PERSONNEL-DISTINCTION** (Track D4.3): What exactly distinguishes 82.5k (at arms) from 118k (mobilized)? Confirm with `historian` + `game-designer` before authoring labels.
4. **Q-OPSEC-FILTER** (Track D4.4): Is OPSEC supposed to filter operations under OPSEC restriction, or list all? Owner: `gameplay-programmer` + `game-designer`.
5. **Q-DEDUPE-DETAIL-VIEW** (Track D6.1): When inbox card represents N events, does clicking expand inline, open a list view, or jump to the most recent event? Owner: `ui-ux-developer`.

---

## Risks / stop conditions

- **R1** — Deck.gl coord fix lands and 40w hash drifts. Roll back; investigate whether the data-layer skip introduced ordering nondeterminism.
- **R2** — Inbox dedupe across `(event_kind, subject_id)` accidentally suppresses cards that SHOULD be distinct (e.g., two separate Mladić issues). Fall back to per-turn deduplication only.
- **R3** — Vance-Owen modal payload shape investigation (D3.1) reveals deeper IPC contract drift. Treat as v0.9.7 emergency; do not paper over.
- **R4** — RECORDS button decision (D6.2) requires user design input; if blocked, ship D6.1 alone and defer D6.2 to next version.

---

## Owner / dispatch responsibilities

Per `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md`:

- **Orchestrator (Claude):** dispatches D-tracks per the 3-way stream split above; reports stream progress.
- **Per-track owners:** named above per D-track.
- **User retains:**
  - All Q-* design questions above.
  - RECORDS semantics decision (Q-RECORDS-SEMANTICS).
  - Personnel distinction labeling (Q-PERSONNEL-DISTINCTION).
  - Sensitive-history copy review (Vance-Owen Defer, dedup wording).
- **Operator-owned (non-engineering):** none — this plan is fully engineering-owned.

---

## Roadmap integration

This plan integrates into `docs/plans/MASTER_ROADMAP.md`:
- Listed in the `Key Plan Documents` table alongside the polish action plan.
- Referenced from the AAA+++ shipping plan summary in `Path to v1.0`.
- A 2026-05-16 hardening board note appended with playtest source + both plans + plan dispatch state.

This plan is the **engineering execution answer** to the playtest findings in `GUI_PLAYTEST_2026-05-16.md`. Update both when defects close.

---

**End of plan. Status: AUTHORED 2026-05-16. Phase 0 dispatch can start in parallel with the polish action plan once user approves Q-* design questions and confirms severity tier ordering.**
