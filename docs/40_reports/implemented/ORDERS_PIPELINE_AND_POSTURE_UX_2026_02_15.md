# Fix Attack/Move/Posture Orders + Posture Picker UX

**Date:** 2026-02-15
**Type:** Bug fix + feature wiring + UX overhaul
**Scope:** Wire the full turn pipeline in desktop, add IPC order staging, fix adapter parsing, exclude player faction from bot AI, enhance posture picker

---

## 1. Problem Statement

Two broken systems in the tactical map GUI:

1. **Orders do nothing:** Clicking Attack/Move on a brigade, then selecting a target, showed a status message ("staged") but the order was never written to GameState. On turn advance, nothing happened. Five cascading root causes:
   - UI handlers were fire-and-forget (only `showStatusError`, no state mutation)
   - No IPC channels existed for order staging
   - Desktop used `runPhaseIITurn` stub (turn increment only) instead of the full `runTurn` pipeline
   - `GameStateAdapter.ts` parsed orders as arrays but GameState defines them as Records
   - Bot AI overwrote all factions including the player's

2. **Posture picker was unintuitive:** Dropdown showed raw enum names (`defend`, `probe`, `attack`, `elastic_defense`, `consolidation`) with no descriptions of what they do, no eligibility gating, and no feedback on stats.

---

## 2. Changes Implemented

### 2.1 Full Turn Pipeline — `desktop_sim.ts`

| Before | After |
|--------|-------|
| `runPhaseIITurn` stub (increment turn, initialize AoR, nothing else) | Full `runTurn` from `turn_pipeline.ts` (combat, supply, exhaustion, posture costs, AoR rebalance, bot AI, etc.) |
| Manual `accrueRecruitmentResources` call (double-counted with full pipeline) | Removed — pipeline handles it in `phase-ii-recruitment` step |
| No `settlementEdges` passed | Passes `graph.edges` so pipeline steps don't re-load |

### 2.2 IPC Order Staging — `preload.cjs` + `electron-main.cjs`

Four new IPC channels added to the Electron bridge:

| Channel | Payload | GameState Mutation |
|---------|---------|-------------------|
| `stage-attack-order` | `{ brigadeId, targetSettlementId }` | `state.brigade_attack_orders[brigadeId] = targetSettlementId` |
| `stage-posture-order` | `{ brigadeId, posture }` | Push/replace in `state.brigade_posture_orders[]` |
| `stage-move-order` | `{ brigadeId, targetMunicipalityId }` | `state.brigade_mun_orders[brigadeId] = [targetMunicipalityId]` |
| `clear-orders` | `{ brigadeId }` | Delete from all three order fields |

Each handler: deserialize `currentGameStateJson` → mutate order field → reserialize → `sendGameStateToRenderer()` → return `{ ok: true }`. State push to renderer triggers re-render, so order arrows appear immediately.

### 2.3 GameStateAdapter Fix — `GameStateAdapter.ts`

Fixed order parsing to match canonical GameState types:

| Field | Old (broken) | New (correct) |
|-------|-------------|---------------|
| `brigade_attack_orders` | Parsed as `Array<{brigade_id, target_settlement_id}>` | Parsed as `Record<FormationId, SettlementId \| null>` |
| `brigade_mun_orders` | Parsed as `Array<{brigade_id, target_mun_id}>` | Parsed as `Record<FormationId, MunicipalityId[] \| null>` |

Both use deterministic sorted iteration over `Object.entries()`.

### 2.4 MapApp UI Wiring — `MapApp.ts`

Added `getDesktopBridge()` helper method for typed access to the IPC bridge:

- **Attack click handler:** Calls `bridge.stageAttackOrder(brigadeId, targetSid)` with error handling
- **Move click handler:** Resolves `mun1990Id` via `resolveMunicipalityFromFeature()` (converts numeric `municipality_id` to kebab-case `mun1990_id`), then calls `bridge.stageMoveOrder(brigadeId, mun1990Id)`
- **Posture dropdown:** Calls `bridge.stagePostureOrder(f.id, newPosture)` on change
- **Clear Orders button:** New button in ACTIONS section, calls `bridge.clearOrders(f.id)`
- All handlers gracefully degrade in browser mode (no desktop bridge → show status message only)

### 2.5 Player Faction Exclusion — `turn_pipeline.ts`

Both bot AI pipeline steps now filter out the player faction:

```
const playerFaction = context.state.meta.player_faction ?? null;
const factions = (context.state.factions ?? []).map(f => f.id)
  .filter(fid => playerFaction == null || fid !== playerFaction);
```

- `generate-bot-corps-orders`: Player's corps don't get bot stance changes
- `generate-bot-brigade-orders`: Player's brigades keep their staged orders

When `player_faction` is null (headless scenario runner), all factions remain bot-controlled — backward compatibility preserved.

### 2.6 Posture Picker UX — `MapApp.ts`

Enhanced posture dropdown with:

| Enhancement | Detail |
|-------------|--------|
| Human labels | `defend` → "Defend", `elastic_defense` → "Elastic Defense", etc. |
| Tooltip stats | Each `<option>` has `title` with full stat line |
| Inline description | Below dropdown: "Pressure 0.3× · Defense 1.5× · Cohesion +1/turn" — updates on change |
| Disabled states | Options the brigade can't adopt are `disabled` (checks cohesion threshold + readiness level) |

Posture stat data (inline constant, matches `brigade_posture.ts`):

| Posture | Pressure | Defense | Cohesion | Min Coh | Readiness |
|---------|----------|---------|----------|---------|-----------|
| Defend | 0.3× | 1.5× | +1/turn | 0 | Any |
| Probe | 0.7× | 1.0× | −1/turn | 20 | Active, Overextended |
| Attack | 1.5× | 0.5× | −3/turn | 40 | Active only |
| Elastic Defense | 0.2× | 1.2× | −0.5/turn | 0 | Active, Overextended, Degraded |
| Consolidation | 0.6× | 1.1× | +0.5/turn | 0 | Active, Overextended, Degraded |

### 2.7 Order Arrows (No Changes Needed)

`drawOrderArrows` (MapApp.ts) already renders:
- Attack orders as red solid arrows with glow
- Move orders as faction-colored dashed arrows

Once the adapter fix (2.3) + IPC staging (2.2) were in place, arrows displayed automatically when state refreshed after staging.

---

## 3. Files Modified

| File | Lines Changed | Nature |
|------|--------------|--------|
| `src/desktop/desktop_sim.ts` | ~10 | Replace stub with full pipeline |
| `src/desktop/preload.cjs` | +4 | Add IPC methods to bridge |
| `src/desktop/electron-main.cjs` | +80 | Add 4 IPC handlers |
| `src/ui/map/data/GameStateAdapter.ts` | ~30 | Fix order parsing (Record not Array) |
| `src/ui/map/MapApp.ts` | ~80 | IPC wiring, posture UX, clear button, desktop bridge helper |
| `src/sim/turn_pipeline.ts` | ~6 | Filter player_faction from bot AI |

---

## 4. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Clean (0 errors) |
| `npx vitest run` | 119/119 pass |
| `npm run canon:check` | Determinism scan clean + baseline regression match |
| `npm test` | Pre-existing failure in `phase_i_turn_structure.test.ts` (unrelated `jna-ghost-degradation` step name) — not introduced by these changes |

---

## 5. Architecture Notes

### Order Flow (End-to-End)

```
Player clicks Attack → MapApp.click handler
  → bridge.stageAttackOrder(brigadeId, targetSid)
  → IPC 'stage-attack-order' in electron-main.cjs
  → deserialize state → state.brigade_attack_orders[id] = target
  → serialize → sendGameStateToRenderer()
  → MapApp receives updated state → GameStateAdapter parses Record
  → drawOrderArrows() renders red arrow from brigade HQ to target

Player clicks Advance Turn
  → IPC 'advance-turn' → desktop_sim.advanceTurn()
  → runTurn(state, input) — full pipeline
  → 'apply-posture-orders' step: applies posture changes, costs
  → 'generate-bot-corps-orders' step: bot factions only (not player)
  → 'generate-bot-brigade-orders' step: bot factions only
  → 'resolve-attack-orders' step: resolves combat at target settlements
  → 'apply-municipality-orders' step: relocates brigades to target mun
  → orders consumed → state returned → renderer updated
```

### Browser Mode Degradation

When running via Vite dev server (no Electron), `getDesktopBridge()` returns null. All order handlers fall back to `showStatusError()` messages only. Orders aren't persisted — this is intentional for the browser preview mode.
