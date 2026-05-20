# Army HQ Visual Hierarchy And Palette Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the standalone War Exhaustion candle/card from Army HQ and refresh the briefing surface around full-width visual bands plus disciplined information-color semantics.

**Architecture:** This is a UI-only presentation lane. The underlying war-exhaustion data and mechanics remain intact; exhaustion should stay visible only in decision-relevant textual/read-model surfaces such as War Summary, Command Relationship, OOB summaries, and Chief of Staff warning copy. The Army HQ briefing tab should move away from repeated generic cards toward a masthead band, a document-like briefing strip, and an action/evidence band that uses color by meaning rather than decoration.

**Tech Stack:** React, TypeScript, Tailwind utility classes, existing Army HQ components under `src/ui/map/components/army_hq/`, existing map UI tests, optional generated raster assets for faction-specific background plates.

---

## Product Direction

The current Army HQ briefing surface is functional but visually monotonous: many panels share the same black-card, thin-border, all-caps, amber-accent treatment. The standalone `ExhaustionClock` also reads as a gimmick: it occupies prime briefing-tab space, duplicates information better represented in staff copy, and visually competes with actionable Army HQ/Decision Room content.

The accepted direction is:

- Retire the standalone War Exhaustion visual widget from Army HQ.
- Do not remove war exhaustion from simulation, adapters, command-strain logic, War Summary, OOB summaries, or staff briefing warnings.
- Rebuild the top briefing composition with broad visual bands instead of more small cards.
- Apply a restrained semantic palette:
  - Gold: presidential action, command authority, selected/primary action.
  - Blue/green: friendly force state, supply, readiness, institutional capacity.
  - Red: enemy threat, civilian harm, critical warnings, hard blockers.
  - Paper/off-white: authored briefing/document truth.
  - Gray: unavailable, disabled, unknown, or secondary metadata.
- Avoid a one-note amber interface. Amber may remain the command accent, not the default accent for every fact.

## Out Of Scope

- No sim mechanic changes.
- No scenario or baseline tuning.
- No changes to `GameStateAdapter.ts` unless a purely presentational type issue blocks compilation.
- No map overlay fixes for the browser-smoke console findings (`front-line-stripe`, `supply-reach-outline`, Deck.gl polygon assertions); those are separate UI-map defect lanes.
- No canon edits and no `FORAWWV.md` edits.
- No new player decision families, no new queues, no new save fields.

## Current Code Pointers

- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - Computes `exhaustionDisplay` near the briefing data memo.
  - Mounts `ExhaustionClock` in the briefing tab top grid.
  - Owns the briefing tab's high-level layout.
- `src/ui/map/components/army_hq/ExhaustionClock.tsx`
  - Standalone candle visual to retire.
- `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
  - Keeps exhaustion warnings as staff copy when relevant.
- `src/ui/map/components/army_hq/CommandRelationshipSection.tsx`
  - Keeps decision-relevant exhaustion strain explanation.
- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
  - Keeps war exhaustion as a summary fact.
- `src/ui/map/components/army_hq/StrategicPosition.tsx`
  - Should stop rendering a large empty card when dimension data is unavailable.
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
  - Should remain the action/evidence owner below the top briefing band.

## Optional Image Asset Direction

Generated image assets are allowed if they strengthen the surface and stay non-deceptive. Use them as low-opacity plates, paper textures, or faction-specific masthead backgrounds, not as fake documentary proof.

Suggested asset prompts:

```text
top-down 1992 wartime command desk, Bosnia map fragments, typed briefing sheets with no readable text, pencil annotations, rubber stamps, muted desk lamp, realistic archival texture, no logos, no faces, 16:9
```

```text
military operations board, dark green map table, acetate overlays, colored push pins, grease pencil arrows, worn field HQ lighting, no readable labels, realistic tactical planning texture, 16:9
```

If assets are committed:

- Place them under the existing map UI asset structure.
- Keep file sizes reasonable.
- Document provenance in the closeout report or ledger.
- Add build/package coverage only if the asset path needs explicit packaging.

## Task 1: Remove The Standalone Exhaustion Widget

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Delete if unreferenced: `src/ui/map/components/army_hq/ExhaustionClock.tsx`
- Check references: `src/ui/map/components/army_hq/*`, `tests/*`

**Step 1: Write or update a focused UI test**

Add or adjust an Army HQ render test so it asserts:

- The briefing tab does not render the candle/standalone exhaustion widget.
- Existing exhaustion text surfaces remain available where already covered, or are explicitly left to existing tests.

Candidate commands to discover coverage:

```powershell
rg -n "ExhaustionClock|War Exhaustion|ArmyHQModal|Army Headquarters" tests src/ui/map/components/army_hq
```

**Step 2: Remove the import and JSX mount**

In `ArmyHQModal.tsx`, remove the `ExhaustionClock` import and the briefing-tab grid cell that renders it.

**Step 3: Remove dead data plumbing**

If `exhaustionDisplay` is only used by the retired widget path, remove it from the memo return. Do not remove state fields or adapter fields.

**Step 4: Delete the component if truly orphaned**

Run:

```powershell
rg -n "ExhaustionClock" src tests
```

If no references remain, delete `src/ui/map/components/army_hq/ExhaustionClock.tsx`.

**Step 5: Verify the targeted test**

Run the focused Army HQ/UI test that covers the change.

## Task 2: Recompose The Briefing Tab Into Visual Bands

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Modify if needed: `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
- Modify if needed: `src/ui/map/components/army_hq/StrategicPosition.tsx`

**Step 1: Replace the small-card top grid with a band hierarchy**

Use this structure:

- Masthead band: faction crest/name, week/date, commander identity, and compact status metrics.
- Briefing band: Chief of Staff briefing as the primary document surface.
- Evidence/action band: Strategic Position when data exists, commander warning counts, and Decision Room entry points.

Keep `PresidentialDecisionRoomPanel` below the top band. Do not create a second Decision Room or duplicate queue.

**Step 2: Give the masthead stable responsive dimensions**

Use explicit min heights and responsive constraints so the masthead does not collapse on 390px mobile or stretch awkwardly on desktop.

**Step 3: Treat unavailable dimension data as absence, not a feature**

In `StrategicPosition.tsx`, replace the large `DIMENSION DATA NOT AVAILABLE` card with either:

- a compact muted row inside the masthead/evidence band, or
- no rendered Strategic Position block until dimensions exist.

Do not spend prime top-row space on empty status.

**Step 4: Preserve keyboard and modal semantics**

Keep:

- `role="dialog"` / `aria-modal="true"` / `aria-label="Army Headquarters"`
- tab roles and labels
- close button behavior
- existing Army HQ tab navigation

## Task 3: Apply Semantic Palette Discipline

**Files:**
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Modify: `src/ui/map/components/army_hq/StrategicPosition.tsx`
- Modify if needed: `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx`
- Modify if needed: `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`

**Step 1: Assign color meaning before class changes**

Use this palette policy:

- Gold only for presidential action, command authority, selected tabs, and primary calls to action.
- Blue/green for friendly status, readiness, supply, capacity, and stable facts.
- Red for enemy pressure, civilian harm, critical warnings, and hard blockers.
- Paper/off-white for authored briefings and staff-document surfaces.
- Gray for unavailable, disabled, unknown, and low-priority metadata.

**Step 2: Reduce all-caps amber repetition**

Keep all-caps labels for compact military UI affordances, but reduce repeated amber headings. Use paper/document surfaces for authored text and cooler status colors for friendly-state panels.

**Step 3: Keep contrast and scan density**

Do not turn the Army HQ into a landing page. It is an operational command surface: dense, scannable, and repeat-use friendly.

## Task 4: Browser Visual Verification

**Files:**
- No source changes unless verification finds a defect in the scoped files.
- Save screenshots only under ignored debug/evidence paths unless a report explicitly owns them.

**Step 1: Run static checks**

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/ui_army_hq_war_summary_visibility.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts --reporter=dot
npm.cmd run desktop:map:build
git diff --check
```

Adjust the focused test list if discovery shows better Army HQ render coverage.

**Step 2: Run browser smoke**

```powershell
npm.cmd run dev:map -- --host 127.0.0.1
```

Open `http://127.0.0.1:3002/`, choose `RBiH`, open Army HQ/Decision Room, and capture:

- desktop 1280x720 Army HQ briefing tab
- mobile 390x844 Army HQ briefing tab
- at least one non-RBiH faction if the masthead uses faction-specific styling/assets

**Step 3: Check these visual gates**

- No standalone War Exhaustion candle/card.
- No large empty `DIMENSION DATA NOT AVAILABLE` card.
- No text overlap in the masthead or tab strip.
- Primary action color is gold; warning color is red; friendly-state color is blue/green.
- Commander/briefing/Decision Room content reads as separate material zones, not repeated copies of the same card.

## Task 5: Documentation Closeout

**Files:**
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optional report: `docs/40_reports/implemented/YYYYMMDD_ARMY_HQ_VISUAL_HIERARCHY_REFRESH.md`

**Step 1: Update roadmap status**

Change the Legendary Features row for `Exhaustion Clock` from implemented to retired from the Army HQ visual roadmap, while noting the underlying exhaustion mechanic remains alive.

**Step 2: Add closeout evidence**

Record:

- changed files
- tests run
- screenshots or evidence path
- explicit no-baselines decision: UI-only presentation; no scenario runner path touched

**Step 3: Do not claim full GUI polish closure**

This closes one visual-hierarchy lane only. Broader GUI polish and map overlay console errors remain separate work.

## Acceptance Criteria

- `ExhaustionClock` is no longer rendered in Army HQ.
- No standalone War Exhaustion visual widget remains in the briefing tab.
- War exhaustion still appears in legitimate decision-relevant text/read-model surfaces if those surfaces already emitted it.
- Army HQ briefing tab uses visual bands rather than a row of similarly styled small cards.
- Palette semantics follow the accepted gold / blue-green / red / paper / gray policy.
- Desktop and 390px mobile screenshots show no incoherent text overlap.
- `npm.cmd run typecheck` passes.
- Focused Army HQ / Decision Room tests pass.
- `npm.cmd run desktop:map:build` passes.
- `git diff --check` is clean.

## Stop Gates

- Stop if any planned change requires changing sim state, save shape, scenario outputs, or canon.
- Stop if removing the widget also removes the only actionable exhaustion warning from Army HQ; preserve the warning as staff copy instead.
- Stop if generated assets create packaging/build failures or are too large for the repo.
- Stop if the visual refresh starts redesigning Warroom, map overlays, or endgame verdict surfaces.
