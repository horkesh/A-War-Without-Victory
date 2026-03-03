# Supply System Phase D — UX + Bot + UN Airdrops
**Date:** 2026-03-03
**Owner:** Orchestrator (direction); PM (delivery); Gameplay Programmer (implementation)
**Phase:** D of `SUPPLY_AMMO_SYSTEM_PLAN.md` (Phases A–C complete)
**Depends on:** Phases A, B, C complete ✓; `supply_reserves_enabled` gating in place ✓

---

## Summary

Phase D delivers three capabilities:

1. **Supply map mode** — OSIDs colored by supply state (adequate/strained/critical); companion panel shows per-faction reserve bars and corridor/isolation summary.
2. **UN Airdrops** — deterministic weekly supply injection to isolated RBiH enclaves (historically accurate, fits Phase C enclave resilience system).
3. **Bot supply-aware targeting** — corps AI scores supply-critical/strained enemy OSIDs higher; protects brittle corridor edges.

Phase D does **not** require GameState schema changes beyond what Phases A–C introduced. No new state fields; adapter + UI + bot scoring only.

---

## Affected Files

| File | Change |
|------|--------|
| `src/ui/map/data/types.ts` | Add `factionReserves` to `LoadedGameState` |
| `src/ui/map/data/GameStateAdapter.ts` | Extract reserve levels from game state |
| `src/ui/map/map/builders/buildSupplyGeoJSON.ts` | **NEW** — OSID coloring by supply state |
| `src/ui/map/map/awwv_map_style.json` | Add `osid-supply-fill` layer |
| `src/ui/map/map/MapContainer.tsx` | Wire supply mode to supply layer |
| `src/ui/map/components/SupplyPanel.tsx` | **NEW** — reserve bars + corridor summary panel |
| `src/ui/map/App.tsx` | Render SupplyPanel when mapMode === 'supply' |
| `src/state/supply_reserve_constants.ts` | Add AIRDROP_* constants |
| `src/state/supply_reserves.ts` | Add `applyUnAirdrops()` |
| `src/sim/turn_phases/war_phases.ts` | Wire airdrop step after enclave resilience |
| `src/sim/combat/bot_corps_ai.ts` | Supply-aware target scoring |
| `tests/supply_airdrop.test.ts` | **NEW** — airdrop unit tests |
| `vitest.config.ts` | Add new test to include list |

---

## Stepwise Plan

### Step 1 — Data Pipeline: GameStateAdapter + types

**Goal:** Expose reserve levels and supply state per OSID to the UI.

1. In `src/ui/map/data/types.ts`, add to `LoadedGameState`:
   ```typescript
   factionReserves?: Record<string, { generalSupply: number; heavyMunitions: number }>;
   ```
   (keyed by faction ID: 'RBiH', 'RS', 'HRHB')

2. In `src/ui/map/data/GameStateAdapter.ts`, inside `parseGameState()`:
   - Extract `state.general_supply_reserve` and `state.heavy_munitions_reserve` (both `Record<string, number>`)
   - Build `factionReserves` entry per faction; default 0 if field absent (backward compat)
   - Guard: only populate when `state.meta?.supply_reserves_enabled === true`

3. `phaseIiSupplyPressure` is already in `LoadedGameState` — reuse for OSID supply state derivation (no new field needed; derive adequate/strained/critical from pressure thresholds inline in builder).

**Acceptance:** `factionReserves` present in adapter output when reserves enabled; absent when disabled.

---

### Step 2 — Supply Map Visualization

**Goal:** Supply mode colors OSIDs by supply state instead of showing political control.

1. Create `src/ui/map/map/builders/buildSupplyGeoJSON.ts`:
   - Input: `phaseIiSupplyPressure: Record<string, number>`, settlement GeoJSON features
   - Map pressure → state: `≥80 → 'adequate'`, `50–79 → 'strained'`, `<50 → 'critical'`, missing → `'unknown'`
   - Return GeoJSON FeatureCollection with `supply_state` property per feature
   - **Determinism:** iterate features in index order (GeoJSON array — stable); no sorting needed

2. In `src/ui/map/map/awwv_map_style.json`, add layer `osid-supply-fill`:
   ```json
   {
     "id": "osid-supply-fill",
     "type": "fill",
     "source": "osid-supply",
     "paint": {
       "fill-color": [
         "match", ["get", "supply_state"],
         "adequate", "#4ade80",
         "strained",  "#fbbf24",
         "critical",  "#f87171",
         "#9ca3af"
       ],
       "fill-opacity": 0.55
     },
     "layout": { "visibility": "none" }
   }
   ```

3. In `src/ui/map/map/MapContainer.tsx`:
   - Change `showPolitical` check: remove `'supply'` from the political fallback group
   - Add useEffect for supply mode: when `mapMode === 'supply'`, build supply GeoJSON, add/update `osid-supply` source and `osid-supply-fill` layer, set visible
   - When leaving supply mode, hide `osid-supply-fill`, show `osid-control-fill`
   - Follow existing pattern: `requestAnimationFrame` + cancelled flag + `safeSetLayoutVisibility`

**Acceptance:** Supply mode shows green/amber/red OSID fill. Switching modes cleans up layers correctly.

---

### Step 3 — SupplyPanel Component

**Goal:** Companion panel shown when supply mode is active — reserve bars + corridor summary.

1. Create `src/ui/map/components/SupplyPanel.tsx`:
   - Props: `factionReserves`, `corridorSummary` (derived from `phaseIiSupplyPressure` using existing SituationTab thresholds)
   - Layout: fixed position bottom-left, above BottomStatusStrip
   - Three faction rows: faction name + two progress bars (general supply, heavy munitions) with % label
   - One summary row: "Corridors: X open · Y strained · Z cut"
   - When `supply_reserves_enabled` is false: show only corridor summary (reserves not available)
   - Style: match existing panel styles (dark background, faction colors per `FACTION_COLORS`)

2. In `src/ui/map/App.tsx`:
   - Import SupplyPanel
   - Render conditionally: `{mapMode === 'supply' && loadedGameState && <SupplyPanel ... />}`
   - Pass `loadedGameState.factionReserves` and compute corridorSummary from `loadedGameState.phaseIiSupplyPressure`

**Acceptance:** Panel visible in supply mode, hidden in other modes. Bars show correct values. Renders without reserves (shows 0/corridor-only).

---

### Step 4 — UN Airdrops

**Goal:** Deterministic weekly supply injection to isolated RBiH enclaves (humanitarian airdrops, food/medical only — no munitions).

**Historical basis:** USAF C-130 drops to Srebrenica, Goražde, Žepa, Tuzla began February 1993. Continued through enclave period. General supply only (UNSC embargo barred weapons).

1. In `src/state/supply_reserve_constants.ts`, add:
   ```typescript
   export const AIRDROP_ISOLATION_THRESHOLD = 4;       // turns before UN airdrops begin
   export const AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE = 1.5; // per eligible enclave per turn
   export const AIRDROP_MAX_SUPPLY_CAP = 15;           // faction-level cap per turn (prevents stacking)
   export const AIRDROP_ELIGIBLE_FACTION: FactionId = 'RBiH'; // only RBiH enclaves receive airdrops
   ```

2. In `src/state/supply_reserves.ts`, add `applyUnAirdrops(state: GameState): void`:
   ```typescript
   export function applyUnAirdrops(state: GameState): void {
     if (!state.meta?.supply_reserves_enabled) return;
     const enclaveResilience = state.enclave_resilience ?? {};
     let totalDrop = 0;
     // Sorted iteration for determinism
     for (const key of Object.keys(enclaveResilience).sort()) {
       const entry = enclaveResilience[key];
       if (typeof entry !== 'object') continue;
       if (entry.isolation_turns < AIRDROP_ISOLATION_THRESHOLD) continue;
       totalDrop += AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE;
     }
     const drop = Math.min(totalDrop, AIRDROP_MAX_SUPPLY_CAP);
     if (drop <= 0) return;
     const faction = AIRDROP_ELIGIBLE_FACTION;
     state.general_supply_reserve ??= {};
     state.general_supply_reserve[faction] = Math.min(
       100,
       (state.general_supply_reserve[faction] ?? 0) + drop
     );
   }
   ```

3. In `src/sim/turn_phases/war_phases.ts`:
   - After the `phase-ii-enclave-resilience` pipeline step, add call to `applyUnAirdrops(state)`
   - No new named pipeline step needed (internal to existing step or inline call)

4. Create `tests/supply_airdrop.test.ts`:
   - Test: no airdrops when isolation_turns < threshold
   - Test: airdrops begin at threshold
   - Test: multi-enclave accumulation, capped at AIRDROP_MAX_SUPPLY_CAP
   - Test: non-RBiH factions not affected
   - Test: no-op when supply_reserves_enabled = false
   - Test: reserve clamped at 100
   - Test: sorted key iteration (determinism)

5. In `vitest.config.ts`: add `tests/supply_airdrop.test.ts` to include list.

**Acceptance:** 7 tests pass. Airdrops appear in reserve report when enclaves isolated ≥4 turns. VRS/HRHB unaffected.

---

### Step 5 — Bot Supply-Aware Targeting

**Goal:** Corps AI prefers attacking supply-critical/strained enemy OSIDs; protects brittle corridor edges.

**Mechanism:** Additive score bonus applied in target evaluation loop in `bot_corps_ai.ts`.

1. In `src/state/formation_constants.ts` (or `bot_corps_ai.ts` constants block), add:
   ```typescript
   export const SUPPLY_CRITICAL_ATTACK_BONUS = 15;  // score bonus for attacking critical-supply OSID
   export const SUPPLY_STRAINED_ATTACK_BONUS = 8;   // score bonus for attacking strained-supply OSID
   ```

2. In `src/sim/combat/bot_corps_ai.ts`, in the target scoring section (where opportunistic/directive targets are scored):
   - Accept `supplyByOsid: Record<string, string>` (already available — passed as parameter to most corps AI functions)
   - For each candidate target OSID, compute `targetSupplyState`:
     ```typescript
     const pressure = supplyByOsid[targetOsid] ?? 100;
     const targetSupplyState = pressure < 50 ? 'critical' : pressure < 80 ? 'strained' : 'adequate';
     ```
   - Add to score: `if (targetSupplyState === 'critical') score += SUPPLY_CRITICAL_ATTACK_BONUS;`
   - Add to score: `if (targetSupplyState === 'strained') score += SUPPLY_STRAINED_ATTACK_BONUS;`
   - Note: `supplyByOsid` uses pressure values, not effective supply state — consistent with existing `assessCorpsSupplyHealth`

3. **Corridor chokepoint defense** (stretch — implement if time permits):
   - In `generateCorpsDirective`, when determining `hold_osids`: include OSIDs adjacent to brittle corridor edges
   - Use existing `isCorridorMunicipality()` for identification

**Acceptance:** No test required for scoring logic (emergent behavior; verify via calibration run). Deterministic by construction (additive constant, no RNG).

---

### Step 6 — Smoke-Test Triad + Refactor-Pass

Per napkin rule:
```
tsc --noEmit (root)
npm run test:vitest (all 22 suites + new airdrop suite)
src/ui/map: npm run build (desktop:map:build)
```

Then refactor-pass: dead imports, duplicate logic, unused variables introduced during Phase D.

---

### Step 7 — Calibration Run (supply_reserves_enabled: true)

**First calibration run with reserves live.**

1. In `data/scenarios/apr1992_definitive_40w.json`, set `supply_reserves_enabled: true`
2. Run `npm run sim:scenario:run:40w`
3. Compare with compare_painted_vs_sim.cjs
4. Expected: OSID match near 88.6% (supply system gated off was neutral, turning on may shift ±1–2pp)
5. Tune `MAINTENANCE_DRAIN_PER_FORMATION`, `COMBAT_HEAVY_MUNITIONS_RATE`, `AIRDROP_*` constants if calibration shifts significantly

---

### Step 8 — Propagate to Canon + Ledger

1. `/propagate-to-canon`: Update `Systems_Manual_v0_6_0.md` §14 with Phase D notes (supply UX, airdrop mechanic)
2. Append ledger entries for each sub-feature (UX, airdrops, bot)
3. Update `SUPPLY_AMMO_SYSTEM_PLAN.md` Phase D status → COMPLETE

---

## Determinism Checklist

- [ ] `applyUnAirdrops()`: sorted key iteration on `enclave_resilience` ✓ (plan specifies `Object.keys().sort()`)
- [ ] `buildSupplyGeoJSON.ts`: iterates GeoJSON features array (stable order) ✓
- [ ] Bot scoring: additive constant, no RNG ✓
- [ ] Airdrop amount: derived from isolation_turns (integer, deterministic) ✓
- [ ] No `Math.random()`, no `Date.now()`, no `new Date()` anywhere in new code
- [ ] New constants: all in dedicated constants files, not inlined ✓

---

## Assumptions and Risks

| Assumption | Risk | Mitigation |
|-----------|------|-----------|
| `phaseIiSupplyPressure` populated for all OSIDs | Medium — may be sparse if supply OSID step hasn't run | Default to 'adequate' (safe fallback) for missing keys |
| `supply_reserves_enabled: true` doesn't break calibration | Medium — first live run; maintenance drain may starve factions | MAINTENANCE_DRAIN_PER_FORMATION=0.15 is small; tune if >2pp shift |
| Airdrop amount (1.5/enclave) is balanced | Low — bounded by MAX_SUPPLY_CAP=15 and reserve clamp at 100 | Easily tuned constant |
| Bot scoring additive doesn't distort existing weights | Low — 8/15 points vs typical scores 40–100 | Observe calibration run; reduce if RS over-targets enclave OSIDs |
| Map style layer add doesn't conflict with existing layers | Low — new source ID `osid-supply` is unique | Verify via manual QA in supply mode |

---

## Phase E (Deferred — Not This Session)

| Feature | Notes |
|---------|-------|
| Tunnel of Hope | Week 64+ corridor event, synthetic BFS edge Dobrinja↔Butmir. Relevant for 52w+ scenarios. |
| Patron arms pipeline visualization | Show HVO/VRS external supply corridors on map. |
| Winter logistics drain | Tie `seasonal_effects.ts` modifier to maintenance drain. |
| UNPROFOR convoy friction | Supply corridor reliability degradation — needs determinism care (no RNG). |

---

## Handoffs

```
Orchestrator → PM: plan approved, sequence Steps 1–8
PM → Gameplay Programmer: Steps 1–5 implementation
PM → QA Engineer: Step 6 smoke-test + test suite
PM → Gameplay Programmer: Step 7 calibration
PM → Technical Architect: Step 8 canon propagation
```

---

## Ledger Entry Template (append after completion)

```
### [2026-03-03] Supply Phase D — UX + Bot + UN Airdrops
- **Type:** Feature (UI / Simulation / Bot AI)
- **Summary:** Supply map mode now colors OSIDs by supply state (adequate/strained/critical).
  SupplyPanel component shows per-faction reserve bars + corridor summary when supply mode active.
  UN Airdrops deliver general supply to isolated RBiH enclaves (≥4 isolation turns, 1.5/enclave/turn,
  capped 15/turn). Bot corps AI scores supply-critical/strained enemy OSIDs higher. First calibration
  run with supply_reserves_enabled: true.
- **Files modified:** [list after implementation]
- **Determinism:** Sorted key iteration in applyUnAirdrops; no RNG.
- **Tests:** tests/supply_airdrop.test.ts (7 tests)
- **Calibration:** [result after Step 7]
```
