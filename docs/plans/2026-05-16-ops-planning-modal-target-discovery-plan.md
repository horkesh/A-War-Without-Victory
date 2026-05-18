# Ops Planning Modal — Target Discovery & Authoring Friction Reduction

**Date:** 2026-05-16
**Lane:** Codex UI/product (renderer-only; no IPC, no sim contract, no scenario data)
**Status:** Implemented 2026-05-16
**Source:** 2026-05-16 external audit playtest — `docs/40_reports/playtest/GUI_PLAYTEST_2026-05-16.md` + live walk-through of `OpsPlanningModal` Commander → Plan flow as RS / 1st Krajina at Turn 0
**Companion docs:** `docs/40_reports/audits/20260516_CODE_AUDIT.md`, `2026-05-16-working-tree-eol-normalization-plan.md`, `docs/40_reports/implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md`

---

## Implementation Closeout

Implemented on 2026-05-16. Lanes A-D are closed for engineering scope:

- Lane A: Plan phase renders `Suggest Plan`, disabled until commander selection exists, and fills objective, schwerpunkt, and brigade allocation deterministically.
- Lane B: Objective panel shows live `Available` count and OpsMap renders an `ops-available-targets` highlight source for selectable enemy objectives.
- Lane C: tab/advance gating now surfaces prerequisite messages; Plan-to-G2 buttons stay disabled until objective+brigade prerequisites are met.
- Lane D: CorpsDetail selects a forward sector when available, and OpsPlanningModal uses the selected sector's friendly OSID as default staging.

Verification: `tests\ui\ops_planning_target_discovery.test.ts` + `tests\ui\ops_modal_auto_propose.test.ts` passed 18/18; integrated focused regression passed 100/100; `npm.cmd run typecheck` passed.

## Background

The Ops Planning Modal (`src/ui/map/components/ops_modal/OpsPlanningModal.tsx`) implements a four-phase OPORD-style authoring flow:

```
COMMANDER → PLAN → G-2 ASSESSMENT → AUTHORIZE
```

It is the **only** player surface for creating a brand-new corps operation (distinct from approving/declining/force-launching a staff-proposed op via `OperationBriefingModal`). Reachable from two entry points:

- `CorpsDetail` → Ops Snapshot tab → **"Prepare Operation in HQ"** (uses `corpsSectors[0]` as staging)
- `CorpsFrontPanel` → **"Draft New Directive in HQ"** (uses the clicked sector as staging)

**What works.** End-to-end UX is polished: real historical officers in Commander phase with personality data (competence, aggressiveness, prep-time, archetype, home/compatible/out-of-region), auto-generated op name from the faction's name pool, full OPORD parameter set (type / tempo / tolerance / support / artillery prep), interactive deck.gl OpsMap with rich settlement tooltips (elevation, slope, defensive bonus, river-crossing penalty, holder faction, distance-from-staging counter), real brigade tray with personnel / tanks / arty / cohesion / fatigue, deterministic auto-axis creation, keyboard navigation between phases.

**What blocks first-time players.** During a clean Turn-0 walk-through as RS / 1st Krajina, the tester could not find a single selectable enemy objective from the default map view despite hovering on multiple pink polygons. Every sampled ARBiH sector reported "out of range":

| Settlement | Distance | Status | Faction |
|---|---|---|---|
| Zelinja Donja | +9 | out of range | ARBiH |
| Kotor Varoš | +13 | out of range | HRHB |
| Bihać | +10 | out of range | ARBiH |
| Pavidi | +4 | out of range | RS (own) |
| Marićka | +7 | **selectable** | RS (own — invalid as attack objective) |

The legend at bottom-left says **"Bright = selectable | Dim = out of range"**, but at default bird's-eye zoom (the zoom level the modal lands you in), the bright-vs-dim brightness step is small enough to be visually unreadable. There is no in-range count, no "Zoom to Front", no "Suggest Objective", no animated halo, no per-objective indicator outside the hover tooltip.

This is a hard floor for player onboarding: the new-op flow's whole purpose is to let a player author offensive intent, but the player must hunt blindly to find a sector that lets them advance. The phase tabs are correctly gated (`goToPhase` rejects targets above `highestPhase`), so the player is locked into Plan phase with no progress until they discover a valid click.

A latent `autoPropose.ts` module already lives in `src/ui/map/components/ops_modal/` and contains the logic to suggest a viable axis + objective + brigade allocation, but it is not wired to a button in the modal UI.

## Goals

1. **A new player who opens this modal must be able to find a valid first objective within seconds**, without trial-and-error hovering.
2. **No new IPC**, no new sim contract, no new scenario data, no change to `OPERATION_NAMES`, no change to phase order or gating rules.
3. **Determinism preserved.** Anything that draws from sim state must be a deterministic read (no `Math.random`, no `Date.now`).
4. **Renderer-only delta.** Engine and main process untouched. The plan is testable entirely in dev-server mode.

## Out of scope

- The G-2 Assessment phase content (untested in this playtest).
- The Authorize phase IPC submit (`stageCorpsOperationOrder`) — that's a main-process contract.
- Drag-drop accessibility for the brigade tray (deserves its own a11y lane).
- Changing the `OPERATION_NAMES` pool or naming algorithm.
- The Dayton modal (separate fix already shipped today; see `DaytonNegotiationModal` changelog).

## Lanes

### Lane A — `autoPropose` button (smallest, highest leverage)

The `autoPropose.ts` module already exists and already knows how to pick a viable axis + objective + brigade set. Wire it to a single button in the **Plan phase header**, labeled **"Suggest Plan"** or **"Auto-Propose"**.

**Behaviour:**
- Disabled until Commander phase is complete (we have a commander).
- On click, calls the existing `autoPropose(...)` with `(corpsId, originSectorId, selectedOfficerId, loadedGameState, plan)`.
- Replaces the current `plan` state with the suggested plan via `setPlan`. Highlights what changed (objective added, brigade IDs added, schwerpunkt set) with a 2-second fade-in.
- Idempotent: clicking again re-runs the suggestion (deterministic; same inputs → same output) — useful if the player tweaks tempo or tolerance and wants a re-suggested brigade fit.
- If `autoPropose` returns no viable plan (e.g. no in-range enemy sectors exist for this corps at this turn), show a friendly toast: *"No viable objective in range from this staging area. Try a different staging sector via the corps front panel."*

**Files touched:**
- `src/ui/map/components/ops_modal/PlanPhase.tsx` — add the button + handler.
- `src/ui/map/components/ops_modal/autoPropose.ts` — verify the public signature; add the "no viable plan" return path if not already there. No core logic change.
- Tests: `tests/ops_modal_auto_propose.test.ts` (new) — assert the button is rendered, disabled when commander unset, calls autoPropose, applies the result; assert deterministic output across two invocations with same inputs.

**Acceptance:**
- AC-A1: Plan phase header shows a `[Suggest Plan]` button.
- AC-A2: Clicking it fills in axis, objective(s), brigades, schwerpunkt without manual map clicks.
- AC-A3: After the click, the PLAN STATUS panel reads ≥1 objective and ≥1 brigade.
- AC-A4: G-2 Assessment phase tab is now reachable (`goToPhase('g2')` succeeds).
- AC-A5: Two consecutive clicks with no other state changes produce the same plan (determinism check).

### Lane B — Map affordance: in-range halo + selectable count

The legend's bright/dim distinction is too subtle at the default zoom. Add two visual cues to the OpsMap layer.

**B1. In-range halo overlay.** A new deck.gl `PolygonLayer` (or `ScatterplotLayer` if too expensive) drawn at z-order between the political-control fill and the corps-front outline, rendering a soft glow (e.g. RGBA `255, 220, 60, 64`) on every enemy sector currently within selectable range from the active axis's staging point. The halo is computed from the same `inRange` predicate that already drives the tooltip's "selectable" / "out of range" tag, so this is free truth — just a different rendering of existing logic.

**B2. Live selectable count.** In the **OBJECTIVES** panel (top-right of Plan phase), under the existing AXIS / OBJECTIVES / BRIGADES rows, add a fourth row: **`AVAILABLE: N`**. `N` = count of enemy sectors with `inRange === true` for the current axis. If `N === 0`, render in red. If `N > 0`, render in the same accent-gold as objectives.

**Files touched:**
- `src/ui/map/components/ops_modal/OpsMap.tsx` — add the halo layer (gated behind a feature flag for one release if you want to AB it).
- `src/ui/map/components/ops_modal/ObjectiveList.tsx` (or the panel that renders OBJECTIVES) — add the `AVAILABLE` row.
- Whatever computes `inRange` per sector — expose a memoized list of in-range sector IDs to the panel.

**Acceptance:**
- AC-B1: On Plan phase open at Turn 0 RS / 1st Krajina, ≥1 enemy sector renders with the halo overlay (or AVAILABLE renders 0 with red text — which is information, not silence).
- AC-B2: Hovering an in-range sector still shows the same tooltip text (no behavioural regression).
- AC-B3: Toggling axis staging via the brigade tray re-computes the halo within one frame.
- AC-B4: AVAILABLE counter updates when staging changes.

### Lane C — Phase-gate feedback

When the player clicks `PLAN 2`, `G-2 ASSESSMENT 3`, or `AUTHORIZE 4` from a lower phase without meeting the prerequisites, the click silently does nothing (per `goToPhase` source). New players read silent buttons as broken buttons.

**Behaviour:** Add a one-line toast or tooltip on each gated phase tab summarizing what's missing:

| Click target | Required state | Toast if missing |
|---|---|---|
| `PLAN 2` | Commander selected | *"Select a commander first."* |
| `G-2 ASSESSMENT 3` | ≥1 objective and ≥1 brigade on an axis | *"Add at least 1 objective and 1 brigade to your axis."* |
| `AUTHORIZE 4` | G-2 assessment viewed once | *"Review the G-2 assessment first."* |

Toasts auto-dismiss after 2s. Use the existing toast/alert primitive if one exists; if not, lightweight inline message under the phase row is fine.

**Files touched:**
- `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` — replace silent `goToPhase` reject with a callback that surfaces a reason.

**Acceptance:**
- AC-C1: Clicking a gated phase tab produces a visible message naming the missing prerequisite.
- AC-C2: Once the prerequisite is met, the tab becomes clickable and the message no longer appears.

### Lane D — Sensible default staging for the CorpsDetail entry path

`CorpsDetail`'s "Prepare Operation in HQ" uses `corpsSectors[0]` as the staging sector. Array index 0 is whatever happens to be first in the corps's sector list — not necessarily a forward-deployed sector. The CorpsFrontPanel entry path is better because it uses the clicked sector. Fix CorpsDetail's default by preferring a sector with at least one front-edge sub-segment (i.e. an `assigned` sector with neighbours of a different controller).

**Files touched:**
- `src/ui/map/components/CorpsDetail.tsx:132` — `handleOpenOpsPlanning` should pick the first sector whose sub-segments include an enemy_osids entry, falling back to `corpsSectors[0]` if none exists.

**Acceptance:**
- AC-D1: At Turn 0 RS / 1st Krajina, entering the modal via "Prepare Operation in HQ" lands on a staging sector that has ≥1 in-range enemy sector (i.e. `AVAILABLE > 0` in Lane B's counter).
- AC-D2: If no such sector exists (corps is fully interior), fall back to `corpsSectors[0]` and show a hint: *"This corps has no forward-deployed sector — Suggest Plan will report 0 viable objectives."*

---

## Sequencing

Recommended order (each lane is a self-contained PR):

1. **Lane A** (Suggest Plan button) — unblocks the tester loop fastest. ~half-day.
2. **Lane C** (phase-gate feedback) — removes silent-button confusion. ~quarter-day.
3. **Lane D** (default staging) — eliminates the "no viable objective" entry case. ~quarter-day.
4. **Lane B** (halo + counter) — polish the visual affordance. ~one day, AB-flag-gated if cautious.

Total wall-clock: ~2 days for one engineer, no scenario reruns required.

## Determinism and canon

- Lane A: `autoPropose` is already deterministic per its source comments. Verify the test in AC-A5.
- Lane B: rendering-only; no sim state mutation.
- Lane C: UI-only.
- Lane D: changes which `originSectorId` is passed to `setOpsPlanningContext` — this is rendererstate, not sim state. The final IPC `stageCorpsOperationOrder` payload is the same shape.

No `Math.random`, no `Date.now`, no `Date` construction, no Intl, no scenario data, no save-schema field, no FORAWWV touch. No 40w hash drift by construction.

## Validation

For each lane independently:

1. `npm run typecheck` — clean.
2. `npm run test:vitest:fast` — green, including new ops-modal tests.
3. `npm run desktop:map:build` — green.
4. Local browser walk-through:
   - Open Warroom → RS → WAR BEGINS → BEGIN → Skip Tutorial.
   - 1st Krajina Corps → Ops Snapshot → Prepare Operation in HQ.
   - Select Talić → Confirm & Proceed.
   - On Plan phase, click `Suggest Plan` (Lane A) → confirm objective + brigade populated → G-2 tab reachable.
   - Click G-2 tab from Commander phase (Lane C) → confirm toast appears.
   - Open the same modal at Turn 40 (Continue Last Run) → repeat above for late-war state.

End-to-end submit at Authorize phase still requires Electron — out of scope for this validation.

## Risk and rollback

- **Risk: Suggest Plan picks a poor plan in some edge state.** Mitigation: the player can still edit the result manually before advancing. The button is a starting point, not a commit.
- **Risk: Lane B halo overlay degrades map render perf.** Mitigation: gate behind feature flag for one release; measure FPS on the wide bird's-eye view; fall back to AVAILABLE counter only if perf drops.
- **Risk: Lane D's "smarter" default staging changes behaviour for an active save.** Mitigation: only the initial open call into the modal is affected; once the player picks a staging sector, no further change. No persisted state.
- **Rollback:** all four lanes are independent commits, each safely revertable.

## Out-of-scope follow-ups

If the playthrough validation surfaces additional friction, file as separate lanes:

- Brigade tray drag-drop a11y (keyboard-only path).
- Multi-axis authoring UX (current modal supports it via `axes[]` but the UI for adding a second axis was not exercised in the audit).
- G-2 Assessment phase content review (post-Lane A unblock).
- Authorize phase Command Authority cost display (currently `FORCE_LAUNCH_COST = 15` is hard-coded in `OperationBriefingModal.tsx`; the create-flow equivalent should display the actual CA cost preview before submit).
- Reachability check from the staging sector before the modal opens — if `AVAILABLE` would be 0, surface a hint at the entry button instead of dropping the player into a dead-end modal.

## Owner

Unassigned. Self-contained UI lane — any frontend engineer with access to the OpsMap and deck.gl knowledge can run Lane B; Lanes A, C, D need only React + the existing ops_modal module surface.
