# Forensics: ARBiH `commander_state` Init Defect (Player-Faction Bypass)

Date: 2026-05-22
Run: `apr1992_definitive_188w__210e69404d054959__w188_n1954`
Branch: `feature/arc-operations-calibration` (HEAD has Wave 1A + 1B committed)
Author: gameplay-programmer (Wave 2 investigation)

## Headline

**Every ARBiH corps — not just 5th Corps — is missing `commander_state` for the
entire 188w run.** The forensics memo focused on arbih_5th_corps because that
was the corps with authored opportunities, so its predicate failure was
visible. But the actual defect is **faction-wide and affects all 7 ARBiH corps**.

The discriminator is the **player-faction filter** in
`src/sim/turn_phases/war_phases.ts:1268` which excludes the player faction
(RBiH in this run) from `generateAllCorpsOrders` — the **only writer** of
`commander_state` in the engine.

The 8 5th-Corps catalog opportunities (and any similar predicates on other
ARBiH corps) silently red-axis because their commanders never get a state
written.

## Save-State Evidence

`data/derived/latest_run_final_save.json` (188w final):

```
player_faction: RBiH

corps_command entries with commander_state PRESENT:
  hvo_central_bosnia      hvo_main_staff           hvo_northwest_bosnia
  hvo_southeast_herzegovina hvo_tomislavgrad       vrs_1st_krajina
  vrs_2nd_krajina         vrs_drina                vrs_east_bosnian
  vrs_herzegovina         vrs_main_staff           vrs_sarajevo_romanija

corps_command entries with commander_state MISSING:
  arbih_1st_corps  (subordinate_count=36) ← active brigades, fully loaded
  arbih_2nd_corps  (subordinate_count=40)
  arbih_3rd_corps  (subordinate_count=25) ← spawned donji_vakuf_95 via opportunity path
  arbih_4th_corps  (subordinate_count=10)
  arbih_5th_corps  (subordinate_count=10)
  arbih_7th_corps  (subordinate_count=0)
  arbih_general_staff (subordinate_count=2)
  jna_herzegovina_command (subordinate_count=0)
```

The split is perfect along faction lines: every non-RBiH corps with subordinates
has `commander_state`; every RBiH corps (regardless of subordinate count) does not.
(`jna_herzegovina_command` is RS but has no subordinates so doesn't reach
`getFactionCorps` Step 2.)

## Init Site Found

**`commander_state` is populated only by the commander-loop pipeline:**

- File: `src/sim/combat/commander/commander_loop.ts`
- Function: `applyCommanderOutput(state, corpsId, output)`
- Write lines: 262, 268, 275

**The driver of that loop is faction-gated:**

- File: `src/sim/turn_phases/war_phases.ts`
- Lines 1266-1289:
  ```ts
  const playerFaction = context.state.meta.player_faction ?? null;
  const factions = (context.state.factions ?? []).map(f => f.id)
      .filter(fid => playerFaction == null || fid !== playerFaction)   // ← excludes player faction
      .sort(strictCompare);
  // ...
  for (const faction of factions) {
      generateAllCorpsOrders(context.state, faction, edges, sidToMun, ...);
  }
  ```

In this run, `player_faction === 'RBiH'`, so RBiH is filtered out — and with
it goes every ARBiH commander_state write.

## Discriminating Condition (Definitive)

**The `player_faction` exclusion at war_phases.ts:1268.**

This is by-design intent: don't run the bot AI for the human-controlled faction.
But `commander_state` is a *bookkeeping* / *intel-substrate* surface, not a
strategic-intent output — multiple downstream consumers (catalog predicates,
opportunity gating, briefing assembly) read it regardless of who plays the
faction. Excluding it from the player faction effectively bricks those
predicates for the player's side.

The 5th Corps catalog (`operation_opportunity_catalog_5th_corps.ts`) checks
`state.military.corps_command?.[PRIMARY_CORPS]?.commander_state` and requires
non-undefined. With the player as RBiH, this is **always undefined**, so the
`commander_confidence` axis is **always red**, so all 8 opportunities are
**always blocked**.

The same pattern silently affects:
- All RBiH catalog opportunities (5th Corps catalog + 3rd Corps catalog in
  `operation_opportunity_catalog_central_bosnia.ts`)
- All RBiH commander briefings (briefing.ts reads `previous_state`)
- All RBiH belief assembly (`belief.ts` reads previous beliefs)
- Any UI surface that reads `commander_state` for the player's own corps

## Proposed Fix — Definitive

**Root cause is a missing-helper bug, not a design conflict.**

The codebase already has a canonical helper for this exact filter:

```ts
// src/sim/turn_phases/war_phases.ts:218-226
export function selectBotBrigadeOrderFactions(state: GameState): FactionId[] {
    const playerFaction = state.meta.headless_scenario_auto_control
        ? null
        : state.meta.player_faction ?? null;
    return (state.factions ?? [])
        .map(f => f.id)
        .filter((fid): fid is FactionId => playerFaction == null || fid !== playerFaction)
        .sort(strictCompare);
}
```

Note the `headless_scenario_auto_control` honoring: when this scenario flag is
set, `playerFaction` is treated as `null` and **ALL factions get bot orders**.

The commander-loop driver at war_phases.ts:1266-1269 has a **duplicated, less-
careful** inline filter that **misses** the `headless_scenario_auto_control`
clause:

```ts
// BUG: lines 1266-1269
const playerFaction = context.state.meta.player_faction ?? null;
const factions = (context.state.factions ?? []).map(f => f.id)
    .filter(fid => playerFaction == null || fid !== playerFaction)  // ← doesn't honor headless flag
    .sort(strictCompare);
```

In the current 188w run, `meta.headless_scenario_auto_control === true` but
`meta.player_faction === 'RBiH'`. The canonical helper would expose all
factions; the inline duplicate excludes RBiH. **This is the discriminator.**

### The fix

**Replace the duplicate inline filter with the canonical helper.** Minimal
diff, matches established pattern, fixes the headless calibration case
without changing live-play behavior.

**Concrete change** (war_phases.ts:1266-1269):

```diff
-    const playerFaction = context.state.meta.player_faction ?? null;
-    const factions = (context.state.factions ?? []).map(f => f.id)
-        .filter(fid => playerFaction == null || fid !== playerFaction)
-        .sort(strictCompare);
+    const factions = selectBotBrigadeOrderFactions(context.state);
```

### Why this is the right level

- The canonical helper `selectBotBrigadeOrderFactions` already exists in the
  same file (lines 218-226). The bug is that the commander-loop driver
  didn't use it.
- Behavior change is scoped to headless scenarios (where it's correct to
  drive all factions) — live play with a real player still excludes the
  player's faction from bot writes.
- Symmetric: the bot brigade orders step at line 1338 (approximately) uses
  `selectBotBrigadeOrderFactions` — so brigade-order generation already
  runs for all factions in headless mode. Only the commander loop missed
  this.
- The forensics memo's `commander_confidence` 34-count is fixed by this:
  arbih_5th_corps will have `commander_state` populated from turn 24 (corps
  activation) onwards.
- All 7 ARBiH corps will start writing commander_state, unlocking every
  read-side consumer (briefings, beliefs, predicates).

### Risk

- In headless mode (the only mode affected), there is no human-in-the-loop
  so emitting bot directives for RBiH corps is the *intended* behavior.
- In live mode (`headless_scenario_auto_control` falsy), behavior is
  unchanged — RBiH corps still get filtered out.
- `early_war_phases.ts:208-211` has the SAME duplicate-filter pattern but
  for `runEarlyWarBotPosture`. Fixing it is out of scope for this Wave 2
  patch but should be flagged for follow-up (same root cause, same shape).

## Verification Approach

1. `npm.cmd run typecheck` — must PASS.
2. Existing tests for commander loop and operation_opportunities:
   - `tests/operation_opportunities_phase2_decisions.test.ts`
   - `tests/operation_opportunities_substrate.test.ts`
   - `tests/operation_opportunities_catalog.test.ts`
3. Existing tests that check player-faction gating:
   - `tests/desktop_autonomy_boundary_truth.test.ts` (may need review — does
     it expect player-faction corps to NOT have bot directives?)
4. Targeted check post-fix: rerun 188w; verify
   `final_save.military.corps_command['arbih_5th_corps'].commander_state` is
   no longer `undefined`, and confirm at least one of (apwb_pressure_94,
   sana_95, sana_95_follow_on, tigar_sloboda_94, grmec_94) reaches `eligible`
   in the lifecycle traces.

## File:Line Summary

- Defect: `src/sim/turn_phases/war_phases.ts:1268` (`.filter(fid => playerFaction == null || fid !== playerFaction)`)
- Write site that's bypassed: `src/sim/combat/commander/commander_loop.ts:262, 268, 275` (`corps.commander_state = ...`)
- Driver function bypassed: `src/sim/combat/bot_corps_ai.ts:411` (`runCommanderForCorps`)
- Read site that hard-fails: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` (multiple `commander_state` checks)
- Read site (analogous): `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:278, 356, 434`

## Status

- Investigation: COMPLETE
- Save-state evidence: COLLECTED (all 7 ARBiH corps confirm faction-wide pattern)
- Memo: WRITTEN
- Fix: APPLIED at `src/sim/turn_phases/war_phases.ts:1266-1271` (now calls `selectBotBrigadeOrderFactions(context.state)`)
- Typecheck: PASS (`npm.cmd run typecheck` → 0 errors)
- Test verification:
  - `tests/operation_opportunities_catalog.test.ts` (44 tests) PASS
  - `tests/operation_opportunities_substrate.test.ts` (44 tests) PASS
  - `tests/operation_opportunities_phase2_decisions.test.ts` (16 tests) PASS
  - `tests/operation_opportunities_central_bosnia_catalog.test.ts` (14 tests) PASS
  - `tests/operation_opportunities_federation_western_bosnia_catalog.test.ts` (6 tests) PASS
  - `tests/desktop_autonomy_boundary_truth.test.ts` (4 tests) PASS
  - `tests/state/player_faction_contract.test.ts` (2 tests) PASS
  - `tests/ui/warroom_player_faction.test.ts` (1 test) PASS
  - Total: 131/131 PASS
- 188w scenario rerun: PENDING (parent — Wave 2 hand-off)

## Follow-Up Flag

- `src/sim/turn_phases/early_war_phases.ts:208-211` has the SAME duplicate-filter
  pattern (inline filter, no `headless_scenario_auto_control` honoring) for
  `runEarlyWarBotPosture`. Out of scope for Wave 2 but should be patched with
  the same `selectBotBrigadeOrderFactions(state)` helper before next calibration
  pass — RBiH early-war bot posture may be similarly under-driven in headless
  mode.
