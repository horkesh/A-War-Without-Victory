# Officers Phase E — GUI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add officer info to FormationDetail (tactical map), an officer list to the warroom FactionOverviewPanel, and succession notifications in both UIs, using existing GameState and turn report (no new IPC).

**Architecture:** Approach 1 from `docs/plans/2026-03-02-officers-phase-e-gui-design.md`: optional view types on LoadedGameState and WarDataSnapshot; GameStateAdapter and extractWarData derive officer data with sorted order; FormationDetail and FactionOverviewPanel render; succession from TurnReport.officer_succession in existing payload.

**Tech Stack:** TypeScript, React (map), vanilla TS (warroom), Vitest (map tests), Node test runner (warroom if needed), Zustand (map store).

**Spec:** `docs/plans/2026-03-02-officers-phase-e-gui-design.md`

---

## Between checkpoints: refactor-pass and code-simplifier

**After every task (or after every 2 tasks), before the next task:**

1. **Refactor-pass** (cursor command `/refactor-pass` or refactor-pass skill):
   - Identify modified files: `git diff --name-only` and `git diff --cached --name-only`.
   - For each modified file: remove dead code (unused imports, types, functions); deduplicate logic into a shared helper; remove over-engineered stubs; simplify conditionals and nesting; remove backward-compat shims that nothing uses.
   - Run `npx tsc --noEmit` and `npx vitest run`; fix any failures.

2. **Code-simplifier** (cursor command `/code-simplifier` or code-simplifier skill):
   - Apply to recently modified code: preserve functionality; follow project standards; improve clarity (no nested ternaries, explicit names); keep balance (no over-simplification).

**Checkpoints** = after Task 2, Task 4, Task 6, and Task 7 (or after each task if preferred). Do not skip refactor-pass and code-simplifier between checkpoints.

---

## Task 1: Map view types for officers

**Files:**
- Modify: `src/ui/map/data/types.ts`
- Test: `tests/ui_map_officers_phase_e.test.ts` (or add to existing map adapter test file if present)

**Step 1: Add view types and extend FormationView / LoadedGameState**

In `src/ui/map/data/types.ts`:

- Add `NamedOfficerView` (id, name, faction, rank, competence, aggressiveness, defensive_skill, home_corps_id, assigned_corps_id from state, status, acting_commander, turns_in_command, battles, victories). Use a flattened shape suitable for UI only.
- Add `NamedOfficerStateView` (officer_id, status, assigned_corps_id, acting_commander, turns_in_command, battles, victories).
- On `FormationView`, add optional `officer_quality?: number`.
- On `LoadedGameState`, add optional `namedOfficerData?: NamedOfficerView[]` and `namedOfficerStateById?: Record<string, NamedOfficerStateView>`.

**Step 2: Write failing test — adapter parses officers and formation officer_quality**

Create or extend a test file that:
- Builds a minimal state-like object with `named_officer_data` (array of at least one officer), `named_officers` (record id → state), and `formations` (one formation with `officer_quality: 0.45`).
- Calls `parseGameState(state)`.
- Asserts `result.namedOfficerData` is an array sorted by id, length ≥ 1.
- Asserts `result.namedOfficerStateById[officerId]` has expected fields.
- Asserts the formation in `result.formations` has `officer_quality === 0.45`.

Run: `npm run test:vitest -- tests/ui_map_officers_phase_e.test.ts -t "officer"` (or the exact test file path).
Expected: FAIL (parseGameState does not yet populate officer fields or formation.officer_quality).

**Step 3: Implement adapter mapping (Task 2 will do this; keep Task 1 as types only if you prefer)**

For Task 1, only the types are added. The failing test will fail until Task 2 implements the mapping. So either:
- (A) In Task 1, add types only; test expects parseGameState to return shape with optional fields (test can pass by mocking or by implementing minimal mapping in Task 1).  
- (B) Merge Task 1 and 2: add types and adapter logic in one task.

Recommendation: **Task 1 = types only.** Step 2 test: assert that when parseGameState is given state *with* named_officers and named_officer_data, the result includes `namedOfficerData` and `namedOfficerStateById` sorted by id, and formations include `officer_quality` when present in raw formation. So the test fails until Task 2 implements the mapping. Step 4 runs after Task 2.

**Step 4: Run test after Task 2**
(After Task 2 implementation) Run same test. Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/map/data/types.ts tests/ui_map_officers_phase_e.test.ts
git commit -m "feat(map): add officer view types for Phase E GUI"
```

---

## Task 2: GameStateAdapter — map officers and officer_quality

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Test: `tests/ui_map_officers_phase_e.test.ts`

**Step 1: Implement officer mapping in parseGameState**

In `parseGameState`:
- After building `formations` array, if `state.named_officer_data` is an array and `state.named_officers` is an object:
  - Build `namedOfficerData: NamedOfficerView[]` by iterating `state.named_officer_data`, mapping each to NamedOfficerView (include name, faction, rank, competence, etc.; merge with `state.named_officers[id]` for status, assigned_corps_id, acting_commander). Sort by id (strictCompare).
  - Build `namedOfficerStateById: Record<string, NamedOfficerStateView>` from `state.named_officers`, keys sorted when iterating if needed (view values only).
- When pushing each formation in the loop (~line 219), read `f.officer_quality`; if typeof number and finite, set `officer_quality` on the FormationView.

**Step 2: Add namedOfficerData and namedOfficerStateById to return object**

Where the final `LoadedGameState` object is built (search for `attackOrders, aorOrders, recentControlEvents`), add `namedOfficerData` and `namedOfficerStateById` when defined. Ensure no extra keys when state has no officers.

**Step 3: Run test**

Run: `npm run test:vitest -- tests/ui_map_officers_phase_e.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/ui/map/data/GameStateAdapter.ts
git commit -m "feat(map): map named officers and officer_quality in GameStateAdapter"
```

---

## Task 3: FormationDetail Command block

**Files:**
- Modify: `src/ui/map/components/FormationDetail.tsx`
- Test: Optional — Storybook or Vitest component test that FormationDetail renders Command block when loadedGameState has officer data and formation has corps_id or officer_quality.

**Step 1: Add Command section**

In `FormationDetail.tsx`, after the existing stats (cohesion, fatigue, personnel, location) and before War Story:
- Read from store: `loadedGameState?.namedOfficerData`, `loadedGameState?.namedOfficerStateById`.
- Helper: given `corpsId: string | undefined`, find officer where `namedOfficerStateById[officerId].assigned_corps_id === corpsId`, then resolve name from `namedOfficerData`.
- If there is no officer data (`!namedOfficerData?.length`), do not render Command block.
- Otherwise render a "Command" block:
  - **Brigade:** If `formation.officer_quality != null`, show "Officer quality" and a progress bar or percentage (e.g. `(formation.officer_quality * 100).toFixed(0)}%`).
  - **Brigade with corps_id:** Also show "Corps commander: [Name]" (or "(Acting)" if acting_commander).
  - **Corps / army_hq:** Show "Corps commander" or "Army commander": name and "(Acting)" when applicable.
- Use existing panel styling (text-xs, text-text-secondary, etc.). Ensure block is focusable/readable (no color-only info).

**Step 2: Run dev map and manually verify**

Run: `npm run dev:map`
Load a run that has officers (e.g. apr1992 definitive 40w). Select a brigade and a corps; confirm Command block appears and shows officer quality and commander name.

**Step 3: Commit**

```bash
git add src/ui/map/components/FormationDetail.tsx
git commit -m "feat(map): add Command block to FormationDetail for officers Phase E"
```

---

## Task 4: Warroom — officersByFaction in WarDataSnapshot and extractWarData

**Files:**
- Modify: `src/ui/warroom/data/war_data_extractor.ts`
- Test: Unit test that extractWarData with gameState containing named_officers and named_officer_data returns snapshot with officersByFaction[faction] sorted by id.

**Step 1: Add OfficerListEntry and officersByFaction**

In `war_data_extractor.ts`:
- Add interface `OfficerListEntry { id: string; name: string; rank: string; status: string; assigned_corps_id: string | null; acting_commander: boolean }`.
- Add to `WarDataSnapshot`: `officersByFaction?: Record<FactionId, OfficerListEntry[]>`.

**Step 2: Implement extractOfficersByFaction**

- New function `extractOfficersByFaction(gameState: GameState, playerFaction: FactionId): Record<FactionId, OfficerListEntry[]>`. Iterate `gameState.named_officer_data` (or empty array if missing); for each officer get state from `gameState.named_officers[data.id]`. Build list per faction; sort each list by id (strictCompare). Fog of war: only include player faction (and optionally allies); for others omit or return empty. Return record keyed by faction.

**Step 3: Call from extractWarData and assign to snapshot**

In `extractWarData`, call `extractOfficersByFaction(gameState, playerFaction)` and set `snapshot.officersByFaction = result` (or only when non-empty).

**Step 4: Write failing test**

Test: given a GameState with `named_officer_data` and `named_officers` for one faction, `extractWarData(state, thatFaction)` returns `snapshot.officersByFaction[faction]` as array sorted by id with expected name/rank/status.
Run: `npm test` (or the warroom test command). Expected: FAIL if test file not runnable yet, or PASS after implementation.

**Step 5: Commit**

```bash
git add src/ui/warroom/data/war_data_extractor.ts tests/...
git commit -m "feat(warroom): add officersByFaction to WarDataSnapshot and extractOfficersByFaction"
```

---

## Task 5: FactionOverviewPanel — Officers subsection

**Files:**
- Modify: `src/ui/warroom/components/FactionOverviewPanel.ts`

**Step 1: Consume officersByFaction from snapshot**

Where FactionOverviewPanel receives the snapshot (or is built from it), ensure the snapshot type includes `officersByFaction`. If the panel is built from a different type, extend that type or pass officers through.

**Step 2: Render Officers subsection**

For each faction rendered in the panel, if `snap.officersByFaction?.[faction]` exists and length > 0, add a collapsible "Command" or "Officers" section. List entries in order (already sorted by id): name, rank, status (Active/Reserve/Killed/Retired), assigned corps (show corps name or id). Style consistently with existing sections.

**Step 3: Manual check**

Run: `npm run desktop` or warroom dev; load a run with officers; open faction overview and confirm officer list appears for player faction.

**Step 4: Commit**

```bash
git add src/ui/warroom/components/FactionOverviewPanel.ts
git commit -m "feat(warroom): add Officers subsection to FactionOverviewPanel"
```

---

## Task 6: Succession notifications

**Files:**
- Modify: `src/ui/map/components/FormationDetail.tsx` (optional: Recent command changes for corps)
- Modify: `src/desktop/electron-main.cjs` or wherever AAR/turn report is sent to renderer
- Modify: Warroom component that shows AAR / newspaper after advance-turn

**Step 1: Ensure officer_succession is in payload**

Verify that when the desktop sends game state or turn report after advance-turn, the payload includes `report.officer_succession` (or equivalent). TurnReport already has `officer_succession?: OfficerSuccessionReport` (see `src/sim/turn_pipeline_types.ts`). Ensure the serialized state or the event payload that the warroom and map receive includes this (e.g. in the object passed to `game-state-updated` or in a separate AAR event). If it is already there, no change. If not, add it (e.g. include lastTurnReport.officer_succession in the AAR payload).

**Step 2: FormationDetail — Recent command changes (corps)**

When selected formation is a corps and loaded state has a succession view (e.g. last turn’s officer_succession or current turn report), show a small "Recent command changes" block: list replacements where `corps_id === formation.id` and new_arrivals/departures/casualties that affect this corps. Use deterministic order (e.g. by officer id). Data source: either add `lastOfficerSuccession?: OfficerSuccessionReportView` to LoadedGameState (populated from last turn report when available) or pass via store from desktop. Prefer adding to LoadedGameState if the report is part of the state payload.

**Step 3: Warroom AAR — append succession lines**

Where the warroom displays AAR text or events after advance-turn, append lines for officer_succession: for each replacement, "[Turn N] [New officer] assigned to [Corps]"; for each casualty/departure, "[Turn N] [Officer] killed/retired". Resolve officer id to name from officer data. Order: replacements first (sorted by corps_id then new_officer), then casualties, then departures (sorted by id).

**Step 4: Commit**

```bash
git add src/ui/map/components/FormationDetail.tsx src/ui/warroom/... src/desktop/...
git commit -m "feat(officers): succession notifications in FormationDetail and warroom AAR"
```

---

## Task 7: Tests, docs, ledger

**Files:**
- Modify: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Modify: `docs/40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md` or `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Test: Ensure all new tests pass.

**Step 1: Run full test suite**

Run: `npm run typecheck`
Run: `npm run test:vitest`
Run: `npm test` (node tests)
Expected: All pass.

**Step 2: Update TACTICAL_MAP_SYSTEM.md**

Add a short subsection (e.g. under Formation panel or §0): FormationDetail includes a "Command" block when officer data is present (brigade officer quality, corps/army commander name, acting status). Data from LoadedGameState.namedOfficerData and namedOfficerStateById; formation.officer_quality.

**Step 3: Update Officers implementation report or CONSOLIDATED_IMPLEMENTED**

Add "Phase E (GUI)" subsection: FormationDetail Command block, warroom FactionOverviewPanel Officers subsection, succession in AAR and optional Recent command changes in FormationDetail. Reference this implementation plan.

**Step 4: Ledger entry**

Append to `docs/PROJECT_LEDGER.md`: Officers Phase E GUI — blast-radius (map types, GameStateAdapter, FormationDetail, WarDataSnapshot, extractWarData, FactionOverviewPanel, succession in AAR); verification (manual: load run with officers, open formation and warroom, advance turn and see succession).

**Step 5: Commit**

```bash
git add docs/20_engineering/TACTICAL_MAP_SYSTEM.md docs/40_reports/... docs/PROJECT_LEDGER.md
git commit -m "docs: Officers Phase E GUI — tests, TACTICAL_MAP_SYSTEM, report, ledger"
```

---

## Required reading

- `docs/plans/2026-03-02-officers-phase-e-gui-design.md`
- `docs/40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md` (Phase E deferred section)
- `src/state/officer_types.ts` (NamedOfficer, NamedOfficerState)
- `src/sim/combat/officer_system.ts` (OfficerSuccessionReport)

## Determinism checklist

- All officer arrays sorted by id (strictCompare).
- Succession display order: by (corps_id, new_officer) or (turn, officer_id) as specified.
- No Math.random(), no Date.now(), no timestamps in view types.

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-03-02-officers-phase-e-implementation.md`.

**Remember:** Between checkpoints (after Task 2, 4, 6, and 7), run **/refactor-pass** then **/code-simplifier** on modified files; verify with `npx tsc --noEmit` and `npx vitest run`.

**Two execution options:**

1. **Subagent-driven (this session)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Parallel session (separate)** — Open a new session with executing-plans in a worktree and run through tasks with checkpoints.

Which approach do you want?
