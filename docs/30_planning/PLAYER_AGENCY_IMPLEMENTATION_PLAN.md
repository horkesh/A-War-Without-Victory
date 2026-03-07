# Player Agency Implementation Plan

**Date:** 2026-03-07
**Source:** Paradox team convene Ã¢â‚¬â€ Defender's Agency + Offensive Agency + Supply Agency proposals
**Owner:** Orchestrator (plan); PM for sequencing; delegated roles per task

---

## Overview

Eight implementation phases delivering player agency across defensive, offensive, and supply systems. Phases are sequenced by risk: UI-only first, small engine changes next, new mechanics last.

**Process discipline per phase:**
1. Implement all tasks in the phase
2. Run `/simplify` on all changed files
3. Update `docs/PROJECT_LEDGER.md` (append entry) and `.claude/napkin.md` (update relevant categories)
4. Commit and push before starting the next phase

**Calibration rule:** Any phase that changes engine behavior (B, C, G, H) must include a 40w scenario regression run before commit.

---

## Phase A Ã¢â‚¬â€ Surface Defensive Systems (UI Only)

**Goal:** Give the player visibility into defensive systems that already work but are invisible.
**Risk:** Zero to engine. Zero calibration risk.
**Prerequisite:** None.

### A1: Enclave Dashboard Panel

**Delegation:** UI/UX Developer

**What:** New component `EnclaveDashboard.tsx` in `src/ui/map/components/`. Displays per-enclave:
- Enclave name and faction
- Resilience bar (0Ã¢â‚¬â€œ30, with hardening threshold marker at 8)
- Isolation turns counter
- Hardening status (active/inactive badge)
- Effective supply state (adequate/strained/critical indicator)
- Airdrop status (receiving / not eligible / not isolated long enough)

**Data source:** `LoadedGameState.enclaveResilience` Ã¢â‚¬â€ already derived in `GameStateAdapter.ts` as `Record<string, EnclaveResilienceView>`. Type already defined in `types.ts`:
```typescript
interface EnclaveResilienceView {
    resilience: number;
    isolation_turns: number;
    hardening_active: boolean;
}
```

**Additional adapter work:** Derive effective supply state per enclave from `supplyStateByOsid` (majority state across enclave OSIDs). Add `enclave_supply_state` to `EnclaveResilienceView`.

**Placement:** Accessible from TopToolbar or as a collapsible section in OOBSidebar. Show only when `supply_reserves_enabled` and at least one enclave has `isolation_turns > 0`.

**Acceptance:** Panel renders for all 5 enclaves. Resilience bar updates each turn. Hardening badge activates at isolation_turns >= 8.

### A2: Sector Entrenchment Summary

**Delegation:** UI/UX Developer

**What:** In the existing sector display (CorpsFrontPanel or sector info area), add per-sector summary:
- Average `entrenchment_turns` across brigades in sector
- Average `dig_in_progress` across brigades in sector
- Count of brigades in `dig_in` posture vs total

**Data source:** Aggregate from `LoadedGameState.formations` filtered by sector assignment (from `corps_front_sectors`). All formation data already in adapter.

**Adapter work:** Add `sectorEntrenchmentSummary` derivation to `GameStateAdapter.ts`: iterate formations per sector, compute averages. Type: `Record<string, { avgEntrenchment: number; avgDigIn: number; digInCount: number; totalCount: number }>`.

**Acceptance:** Each sector shows entrenchment info. Values update when brigades move or change posture.

### A3: Mobilization Pool Status

**Delegation:** UI/UX Developer

**What:** New section in OOBSidebar (or standalone panel) showing per-faction mobilization pool status:
- Total `available` manpower across all municipality pools
- Total `committed` manpower
- Total `exhausted` manpower
- Exhaustion percentage (exhausted / military-age-male estimate)
- Strategic reserve level (`state.strategic_reserves[faction]`)
- Top 5 municipalities by available pool (largest reserves)

**Data source:** `state.militia_pools` on raw GameState. Currently NOT exposed to UI adapter.

**Adapter work:** Add `mobilizationSummary` derivation to `GameStateAdapter.ts`. Aggregate militia_pools by faction. Type:
```typescript
interface MobilizationSummaryView {
    faction: FactionId;
    total_available: number;
    total_committed: number;
    total_exhausted: number;
    exhaustion_pct: number;
    strategic_reserve: number;
    top_pools: Array<{ mun_id: string; available: number }>;
}
```

**Acceptance:** Panel shows data for player faction (or all factions if no player faction). Updates each turn. Strategic reserve shown alongside pool totals.

### A4: Front Hardening Visualization

**Delegation:** Graphics Programmer

**What:** Encode average entrenchment per front segment in `buildCorpsFrontLinesGeoJSON.ts`. Vary front line rendering based on defensive depth:
- Entrenchment 0Ã¢â‚¬â€œ1: thin dashed line (fluid front)
- Entrenchment 2Ã¢â‚¬â€œ3: medium solid line (forming front)
- Entrenchment 4+: thick solid line (hardened front)

**Data source:** Front segments already have associated brigade assignments. For each segment, compute average `entrenchment_turns` of assigned brigades. Add `avg_entrenchment` property to front line GeoJSON features.

**Style changes:** In `awwv_map_style.json` or MapContainer layer setup, use data-driven styling: `line-width` driven by `avg_entrenchment` property. Keep existing black-white stripe pattern Ã¢â‚¬â€ only vary width.

**Constraint:** Do NOT change to chevron/barbed-wire style (napkin: "Front line style: black-white stripe Ã¢â‚¬â€ no chevrons").

**Acceptance:** Front lines visibly thicken over time as brigades entrench. Moving brigades reset their contribution. Visual difference clear at zoom levels 7Ã¢â‚¬â€œ9.

### A5: Posture Impact Tooltips

**Delegation:** UI/UX Developer

**What:** In FormationDetail.tsx posture selector (lines 601Ã¢â‚¬â€œ629), add tooltip text to each posture button explaining:
- Defense multiplier (e.g., "1.60x defense")
- Cohesion cost per turn (e.g., "-4.0/turn")
- Key trade-off (e.g., "Never auto-downgrades. Brigade fights to destruction.")

**Data source:** Constants from `brigade_posture.ts` and `combat_math.ts`. Hardcode tooltip strings Ã¢â‚¬â€ these are stable constants.

**Acceptance:** Hovering or long-pressing each posture button shows mechanical impact. Text is concise (1Ã¢â‚¬â€œ2 lines max).

### Phase A Process

1. Implement A1Ã¢â‚¬â€œA5
2. Run `/simplify` on all changed files
3. Run `npx tsc --noEmit` and `npm run test:vitest`
4. Append ledger entry (n-next): "Phase A Ã¢â‚¬â€ Surface defensive systems (enclave dashboard, entrenchment summary, mobilization pools, front hardening, posture tooltips)"
5. Update napkin: GUI/HoI Map category with new items for enclave dashboard and front hardening
6. Commit: `feat: Phase A Ã¢â‚¬â€ surface defensive systems (enclave dashboard, pools, front hardening)`
7. Push

---

## Phase F Ã¢â‚¬â€ Expose Offensive Levers (UI Only)

**Goal:** Give the player control over offensive levers that already exist in the engine.
**Risk:** Zero to engine. Zero calibration risk.
**Prerequisite:** None (can be parallel with Phase A).

### F1: Casualty Tolerance Slider

**Delegation:** UI/UX Developer

**What:** In OpsPlanningModal.tsx, add a slider for `min_attack_outcome` when creating/editing an operation. Labels:
- "Decisive Only" Ã¢â€ â€™ `decisive_victory`
- "Victory Required" Ã¢â€ â€™ `victory`
- "Accept Costly" Ã¢â€ â€™ `costly_victory`
- "Attack Regardless" Ã¢â€ â€™ `repulsed`

Store on CorpsOperation. Participating brigades use operation's `min_attack_outcome` instead of corps directive default when the operation has one set.

**Schema change:** Add optional `min_attack_outcome?: PredictedOutcome` to `CorpsOperation` in `game_state.ts`.

**Engine wiring:** In `bot_brigade_ai_osid.ts`, when a brigade is participating in an operation that has `min_attack_outcome` set, use that value instead of `directive.min_attack_outcome`. This is a 3-line change in the attack approval path.

**IPC:** Add `minAttackOutcome` to `CorpsOperationOrderPayload`.

**Acceptance:** Player creates operation with slider set to "Accept Costly". Participating brigades attack targets they would otherwise refuse. Casualties increase visibly compared to "Decisive Only" operations.

### F2: Halt Operation Button

**Delegation:** UI/UX Developer

**What:** In OperationsPanel.tsx, add "Halt & Consolidate" button for operations in `execution` phase. On click:
1. Set `recovery_reason = 'manual_termination'` on the operation
2. Transition operation to `recovery` phase (duration: 1 turn per schema)
3. Optionally set all participating brigades to `dig_in` posture (checkbox: "Dig in on halt")

**Schema:** `recovery_reason: 'manual_termination'` already exists in CorpsOperation type.

**IPC:** New handler `stage-operation-halt` accepting `{ corpsId, operationName, digInOnHalt: boolean }`.

**Engine:** In `advanceSectorOffensives()`, check for `recovery_reason === 'manual_termination'` before normal phase transitions. If set, skip to recovery. Apply `dig_in` posture to participants if flag set.

**Acceptance:** Player halts a stalling operation. Brigades enter recovery. If dig-in selected, brigades adopt `dig_in` posture. Operation shows "Halted" status.

### F3: Go/No-Go Gauge

**Delegation:** UI/UX Developer

**What:** In OpsPlanningModal.tsx (planning phase view) and OperationsPanel (active operation detail), show a combined readiness gauge:
- **Supply readiness**: `operation.supply_readiness * 100%` (already computed)
- **Cohesion readiness**: average cohesion of participating brigades / 100
- **Intel confidence**: average sector intel confidence for the operation's sector

Display as three horizontal bars (green/amber/red thresholds) or a combined traffic-light indicator.

**Data source:** All three values already available:
- `supply_readiness` on CorpsOperation
- Cohesion from formations filtered by `participating_brigades`
- Sector intel confidence from `sector_intel` filtered by operation's `sector_id`

**Adapter work:** Derive `operationReadiness` in GameStateAdapter.ts: aggregate the three metrics per active operation.

**Acceptance:** Player sees green/amber/red status for each readiness dimension. Gauge updates each turn during planning.

### F4: Weight of Effort Map Mode

**Delegation:** Graphics Programmer

**What:** 6th map mode (keyboard shortcut `6`) showing offensive weight distribution:
- Heat-map sectors by concentration: `(brigades_in_sector / total_corps_brigades) * (1 + aggression_modifier)`
- Color scale: blue (holding force, low weight) Ã¢â€ â€™ red (main effort, high weight)
- Overlay: active operation objective arrows (thicker for schwerpunkt/primary objective)

**Data source:** `corps_front_sectors` (brigade counts per sector), `corps_command` (directive aggression_modifier per corps). Already in adapter.

**Integration:** Add mode to `MapModeToolbar` badges (`6: operations`). Add to `useKeyboardShortcuts`. Build GeoJSON via new `buildOperationalWeightGeoJSON.ts` builder.

**Constraint:** Keep shortcut mapping synchronized with toolbar labels (napkin: "Map mode shortcuts must match toolbar labels").

**Acceptance:** Mode 6 shows clear visual distinction between holding sectors and main effort sectors. Active operations have visible objective arrows.

### F5: Operation Info Enhancement

**Delegation:** UI/UX Developer

**What:** In OperationsPanel.tsx, enhance active operation display:
- Momentum indicator: 0Ã¢â‚¬â€œ3 pips (filled = momentum level)
- Consecutive failures counter with warning color at 2+
- Supply readiness percentage with color
- Current objective name and index (e.g., "Objective 2/4: op:jajce:jajce_2")
- Participating brigade count and average health (personnel %, cohesion)
- Phase badge with turn count (e.g., "Execution Ã¢â‚¬â€ Turn 3")

**Data source:** All fields already on CorpsOperation. Brigade health from formations.

**Acceptance:** Player can assess operation health at a glance. Momentum pips fill on captures, empty on failures. Warning indicators for stalling operations.

### Phase F Process

1. Implement F1Ã¢â‚¬â€œF5
2. Run `/simplify` on all changed files
3. Run `npx tsc --noEmit` and `npm run test:vitest`
4. Append ledger entry: "Phase F Ã¢â‚¬â€ Expose offensive levers (casualty slider, halt button, Go/No-Go gauge, weight-of-effort mode, operation info)"
5. Update napkin: GUI/HoI Map category and Sectors & Operations category
6. Commit: `feat: Phase F Ã¢â‚¬â€ expose offensive levers (casualty slider, halt, Go/No-Go, ops heatmap)`
7. Push

---

## Phase B Ã¢â‚¬â€ Sector-Level Defensive Orders (Small Engine + UI)

**Goal:** Let the player issue orders at sector granularity instead of per-brigade.
**Risk:** Low Ã¢â‚¬â€ translates sector intent to existing per-brigade postures.
**Prerequisite:** Phase A complete (sector display exists).

### B1: Sector Stance Order

**Delegation:** Gameplay Programmer

**What:** New `SectorStanceOrder` type:
```typescript
interface SectorStanceOrder {
    sector_id: string;
    stance: 'dig_in' | 'elastic_defense' | 'defend_at_all_costs' | 'hold';
}
```

New pipeline step `apply-sector-stance-orders` (after `apply-posture-orders`): for each sector stance order, set all brigades assigned to that sector to the specified posture (respecting `canAdoptPosture()` constraints Ã¢â‚¬â€ skip brigades that can't adopt).

**State:** Add optional `sector_stance_orders?: SectorStanceOrder[]` to GameState. Consumed and cleared each turn.

**IPC:** New handler `stage-sector-stance-order` accepting `{ sectorId, stance }`.

**Acceptance:** Player issues "Dig In" to a sector. All eligible brigades in sector adopt `dig_in`. Brigades that can't (e.g., forming) are skipped with no error.

### B2: Sector Reinforcement Priority

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** Wire `logistics_priority` (already on GameState) to the UI. Player sets a priority weight (0.5 = deprioritized, 1.0 = normal, 2.0 = reinforced) per sector.

**Engine:** `logistics_priority` already consumed by `formation_fatigue.ts` as a multiplicative supply weight. Map sector_id Ã¢â€ â€™ constituent edge_ids when writing priority. No new engine logic.

**UI:** In sector panel, add priority slider (0.5 / 1.0 / 2.0). Visual indicator on sector: faded = deprioritized, normal = standard, highlighted = reinforced.

**IPC:** New handler `stage-logistics-priority` accepting `{ faction, sectorId, priority }`. Translates sector to edge_ids and writes to `state.logistics_priority`.

**Acceptance:** Player deprioritizes a quiet sector (0.5) and reinforces a threatened one (2.0). Supply effects visible in subsequent turns (higher-priority sector's brigades recover fatigue faster).

### B3: Sector Stance UI

**Delegation:** UI/UX Developer

**What:** In CorpsFrontPanel (or sector detail view), add sector-level stance selector:
- Dropdown or button group: Dig In / Elastic Defense / Defend at All Costs / Hold
- Shows current effective stance (majority posture of brigades in sector)
- Visual indicator on map per-sector: small icon or color wash overlay

**Acceptance:** Sector stance selector visible for each sector. Changing stance sends `stage-sector-stance-order` IPC. Map shows visual feedback.

### Phase B Process

1. Implement B1Ã¢â‚¬â€œB3
2. Run `/simplify` on all changed files
3. Run `npx tsc --noEmit`, `npm run test:vitest`, and `npm run sim:scenario:run:40w` (verify no calibration regression Ã¢â‚¬â€ sector stance orders should be no-op for bot since bot doesn't issue them)
4. Append ledger entry: "Phase B Ã¢â‚¬â€ Sector-level defensive orders (sector stance, reinforcement priority)"
5. Update napkin: Sectors & Operations category, GUI/HoI Map category
6. Commit: `feat: Phase B Ã¢â‚¬â€ sector-level defensive orders (stance, reinforcement priority)`
7. Push

---

## Phase G Ã¢â‚¬â€ Shaping the Fight (Small Engine + UI)

**Goal:** Give the player control over how operations are executed.
**Risk:** Low-medium Ã¢â‚¬â€ per-operation parameter overrides. Bot uses defaults.
**Prerequisite:** Phase F complete (operation UI enhanced).

### G1: Schwerpunkt OSID

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** Add optional `schwerpunkt_osid?: string` to CorpsOperation. Player picks in OpsPlanningModal (click on map to select one objective OSID as main effort).

**Engine effect:** In `bot_brigade_ai_osid.ts` target scoring, when brigade is participating in an operation with `schwerpunkt_osid` set:
- Add +200 flat score bonus to schwerpunkt target
- Reserve brigades may attack schwerpunkt (bypass reserve hold)
- Concentration joining threshold relaxed by 1 rank for schwerpunkt

**IPC:** Add `schwerpunktOsid` to `CorpsOperationOrderPayload`.

**Acceptance:** Player sets schwerpunkt. Brigades concentrate on that OSID preferentially. Visible clustering of attacks on main effort point.

### G2: Operation Tempo Presets

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** Add `tempo?: 'methodical' | 'standard' | 'all_out'` to CorpsOperation. Player picks in OpsPlanningModal.

**Tempo effects (applied to participating brigades during execution):**

| Tempo | min_attack_outcome | aggression_modifier | reserve_fraction | Extra cohesion cost |
|---|---|---|---|---|
| Methodical | +1 rank (more conservative) | -0.05 | +0.10 | 0 |
| Standard | unchanged | 0 | 0 | 0 |
| All-out | -1 rank (more aggressive) | +0.10 | -0.10 | +1.0/turn |

**Engine:** In `bot_brigade_ai_osid.ts`, when computing effective directive for an operation participant, apply tempo modifiers on top of the operation's `min_attack_outcome` and the corps directive's aggression/reserve values.

**IPC:** Add `tempo` to `CorpsOperationOrderPayload`.

**Acceptance:** "Methodical" operations advance slowly but preserve brigades. "All-out" operations take more ground but burn cohesion rapidly. Visible difference in casualty rates and advance speed.

### G3: Pre-Bombardment

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** During planning phase, player can toggle "Artillery Preparation" on operation in OpsPlanningModal.

**Cost:** `BOMBARDMENT_PREP_COST = 2.0` deducted from faction `heavy_munitions_reserve` when execution begins.

**Effect (first execution turn only):**
- All defenders at first objective OSID: `dig_in_progress` set to 0 (fortifications destroyed)
- All defenders at first objective: -10 cohesion penalty (bombardment shock)
- After turn 1, normal combat rules resume

**State:** Add `artillery_preparation?: boolean` to CorpsOperation. Consumed on first execution turn.

**Gating:** Only available if faction `heavy_munitions_reserve >= BOMBARDMENT_PREP_COST`. Grayed out in UI otherwise.

**IPC:** Add `artilleryPreparation` to `CorpsOperationOrderPayload`.

**Acceptance:** Player activates artillery prep for a VRS offensive. First turn defenders lose entrenchment and take cohesion hit. Heavy munitions visibly decrease. Subsequent turns normal.

### G4: Early Launch with Penalty

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** "Launch Now" button in OpsPlanningModal during planning phase (after Ã¢â€°Â¥1 planning turn elapsed).

**Effect:** Force immediate transition from planning to execution. All participating brigades take -15 cohesion (rushed preparation).

**Engine:** In `advanceSectorOffensives()`, check for `force_launch` flag on CorpsOperation. If set, skip remaining planning turns and apply cohesion penalty.

**State:** Add `force_launch?: boolean` to CorpsOperation. Consumed on transition.

**IPC:** New handler `stage-operation-force-launch` accepting `{ corpsId }`.

**Acceptance:** Player launches early. Brigades enter execution with reduced cohesion. Visible in Go/No-Go gauge (cohesion bar drops).

### G5: Reserve Commitment Event

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** When operation momentum reaches 3, fire a player decision event:
- Title: "Breakthrough at [objective OSID]"
- Text: "Frontline shattered. Commit reserves for exploitation?"
- YES: `reserve_fraction` temporarily set to 0 for this corps for 2 turns. Momentum aggression bonus increased to +0.25. After 2 turns, reserve_fraction reverts to directive default.
- NO: Operation continues normally.

**State:** Add optional `reserves_committed_until_turn?: number` to CorpsCommandState. When `state.meta.turn <= reserves_committed_until_turn`, override `directive.reserve_fraction = 0`.

**Bot behavior:** Auto-commit when momentum=3 AND average corps cohesion > 50 AND no enemy `offensive_signs` on adjacent sectors (flank safety check).

**UI:** Modal popup on momentum=3 (same pattern as truce-break warning). Show projected risk: "Warning: No reserves for 2 turns. Vulnerable to counterattack."

**Acceptance:** Player commits reserves after breakthrough. Fresh brigades join the attack. If advance stalls, counterattack hits unreserved front.

### Phase G Process

1. Implement G1Ã¢â‚¬â€œG5
2. Run `/simplify` on all changed files
3. Run `npx tsc --noEmit`, `npm run test:vitest`, and `npm run sim:scenario:run:40w` (bot uses `standard` tempo, no schwerpunkt, no pre-bombardment, no early launch, no reserve commitment Ã¢â‚¬â€ all features are player-only by default, so bot baseline should be unchanged)
4. Append ledger entry: "Phase G Ã¢â‚¬â€ Shaping the fight (schwerpunkt, tempo, pre-bombardment, early launch, reserve commitment)"
5. Update napkin: Bot AI & Combat, Sectors & Operations categories
6. Commit: `feat: Phase G Ã¢â‚¬â€ shaping the fight (schwerpunkt, tempo, pre-bombardment, reserves)`
7. Push

---

## Phase C Ã¢â‚¬â€ Supply as Player Agency (New Mechanics)

**Goal:** Transform supply from a background system into a source of asymmetric player decisions with political consequences.
**Risk:** Medium Ã¢â‚¬â€ new IVP system, small engine changes to airdrop/convoy/smuggling.
**Prerequisite:** Phase A complete (enclave dashboard exists for C1/C2 UI). Phase B recommended (sector reinforcement priority for logistics integration).

### C0: IVP Foundation

**Delegation:** Gameplay Programmer

**What:** Implement `international_visibility_pressure` on GameState per canon (Systems Manual Ã‚Â§16.1).

**State fields:**
```typescript
interface InternationalVisibilityPressure {
    sarajevo_siege_visibility: number;       // 0-100
    enclave_humanitarian_pressure: number;   // 0-100
    atrocity_visibility: number;             // 0-100 (placeholder Ã¢â‚¬â€ driven by displacement events)
    negotiation_momentum: number;            // 0-100 (placeholder Ã¢â‚¬â€ driven by future negotiation system)
    composite_ivp: number;                   // weighted sum
    last_major_shift: number;                // turn of last significant IVP change
}
```

**Pipeline step:** `update-ivp` after `phase-ii-enclave-resilience`. Derives:
- `sarajevo_siege_visibility`: if Sarajevo enclave `isolation_turns > 0`, increment by 0.5/turn (cap 100). Decay -0.2/turn when siege lifted.
- `enclave_humanitarian_pressure`: sum of `(isolation_turns * 0.3)` across all active enclaves (cap 100). Scaled by enclave population weight.
- `atrocity_visibility`: driven by displacement rate Ã¢â‚¬â€ `sum(displaced_out this turn) / 1000` (cap 100). Decays -1.0/turn.
- `composite_ivp`: `sarajevo * 0.4 + enclave * 0.3 + atrocity * 0.2 + negotiation * 0.1`

**Gating:** Behind `supply_reserves_enabled` flag (same gate as supply system).

**Tests:** Unit test: IVP accumulates when Sarajevo is besieged. IVP decays when siege lifted. Enclave pressure scales with isolation.

### C0.2: IVP -> Patron Commitment Modifier

**Delegation:** Gameplay Programmer

**What:** Modify patron commitment calculation in `supply_reserves.ts` (patron aid income):
- RS: `patron_commitment *= (1.0 - composite_ivp * 0.003)` Ã¢â‚¬â€ high IVP reduces RS patron support (Serbia distancing under international pressure)
- RBiH: `patron_commitment *= (1.0 + composite_ivp * 0.002)` Ã¢â‚¬â€ high IVP increases RBiH support (international sympathy)
- HRHB: unmodified (Croatia's commitment driven by separate dynamics)

**Constraints:** Patron commitment clamped to [0.1, 1.0]. Effect is gradual, not binary.

### C0.3: IVP UI Indicator

**Delegation:** UI/UX Developer

**What:** IVP gauge in TopToolbar (small) or dedicated panel (expanded). Shows:
- Composite IVP bar (0Ã¢â‚¬â€œ100)
- Breakdown: Sarajevo siege | Enclave pressure | Atrocity visibility
- Per-faction patron commitment level with trend arrow
- Active consequences (if any Ã¢â‚¬â€ see C4)

### C1: Player-Allocated Airdrops

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** Replace automatic `applyUnAirdrops()` with player-allocated model.

**Engine change in `supply_reserves.ts`:**
- Compute total budget: count eligible enclaves (isolation_turns >= `AIRDROP_ISOLATION_THRESHOLD`) Ãƒâ€” `AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE`, capped at `AIRDROP_MAX_SUPPLY_PER_TURN` (3.0)
- If player faction set: read `state.airdrop_allocation` (new field) Ã¢â‚¬â€ `Record<string, number>` mapping enclave_id to allocation amount. Sum must equal budget. Unallocated budget distributed evenly.
- If no player faction (bot): distribute proportional to `isolation_turns` (current behavior, effectively)

**State:** Add `airdrop_allocation?: Record<string, number>` to GameState. Cleared and re-set each turn by player.

**IPC:** New handler `stage-airdrop-allocation` accepting `{ allocations: Record<string, number> }`.

**UI:** In Enclave Dashboard (A1), add airdrop allocation section. Sliders per eligible enclave. Budget indicator showing remaining allocation. Impact preview: "+X general supply" per enclave.

**C1.3 Ã¢â‚¬â€ Airdrop IVP feedback:** Enclaves receiving airdrops get -0.1 IVP contribution modifier (world sees relief effort). Enclaves NOT receiving airdrops when eligible get +0.1 IVP modifier (neglected suffering visible). Net: player can slightly reduce total IVP by distributing airdrops wisely, or generate more IVP by concentrating on fewer enclaves.

### C2: Convoy Interdiction (RS/HRHB Agency)

**Delegation:** Gameplay Programmer + Game Designer + UI/UX Developer

**What:** Humanitarian convoy event system.

**Engine Ã¢â‚¬â€ convoy generation (`evaluate-humanitarian-convoys` pipeline step, after `update-ivp`):**
- Each turn, for each besieged enclave (isolation_turns >= 4), roll a deterministic convoy check: `convoy_fires = (isolation_turns * 2 + composite_ivp * 0.5) >= CONVOY_THRESHOLD` (threshold calibrated so 1Ã¢â‚¬â€œ2 convoys/turn at typical siege conditions). Use turn number as seed for deterministic selection.
- Each convoy has: `target_enclave`, `route_faction` (faction controlling the corridor), `supply_amount` (0.3Ã¢â‚¬â€œ0.8 general supply).

**Player decision (when player faction controls the corridor):**
- **Allow passage:** Convoy delivers full `supply_amount` to enclave faction. No IVP change.
- **Block convoy:** No supply delivered. IVP spike: +3.0 to `enclave_humanitarian_pressure`. RS `diplomatic_isolation` += 0.05. Patron commitment modifier reduced.
- **Divert convoy:** Half supply delivered to enclave, half to blocking faction's general_supply. IVP increase: +1.0. Diplomatic isolation += 0.02.

**Bot behavior:** Allow when composite_ivp > 50 (too much pressure already). Block when composite_ivp < 30 AND military advantage is strong. Divert otherwise.

**State:** Add `pending_convoy_decisions?: ConvoyDecision[]` to GameState. Each entry: `{ id, target_enclave, route_faction, supply_amount, decision?: 'allow' | 'block' | 'divert' }`. Cleared after processing.

**IPC:** New handler `stage-convoy-decision` accepting `{ convoyId, decision }`.

**UI:** Modal popup when convoy fires through player-controlled territory. Shows: target enclave, supply amount, projected IVP impact for each option. Three buttons: Allow / Block / Divert.

**HRHB variant:** Same mechanic when HVO controls chokepoints to RBiH areas (1993 central Bosnia blockade). Lower IVP impact (Ãƒâ€”0.6 modifier on all IVP consequences).

**Canon note:** Systems Manual Ã‚Â§16.1 says patron behavior is "no reactive player control." This proposal gives the player *indirect* control via IVP, not direct patron manipulation. Recommend canon amendment: "Player military and humanitarian decisions generate IVP; IVP modifies patron commitment curves. The player does not directly control patron behavior." Flag for Game Designer + Architect sign-off.

### C3: Smuggling and Tunnel Agency (RBiH)

**Delegation:** Gameplay Programmer + Game Designer + UI/UX Developer

**What:** Smuggling efficiency curve and tunnel construction event.

**C3.1 Ã¢â‚¬â€ Smuggling efficiency:**
- Add `smuggling_efficiency` to faction state (start 0.0 for RBiH, N/A for RS/HRHB)
- Growth: +0.0015/turn (per canon), cap 0.3
- Effect: each turn, RBiH receives `smuggling_efficiency * SMUGGLING_HEAVY_MUNITIONS_SCALE` (e.g., 0.5) added to heavy_munitions_reserve. This is the ONLY way ARBiH gets ammo besides battlefield capture.
- Pipeline step: `apply-smuggling-income` after `compute-supply-reserves`.

**C3.2 Ã¢â‚¬â€ Tunnel construction event:**
- At turn = `warStartTurn + 60` (~mid-1993), if Sarajevo enclave still RBiH-controlled AND `isolation_turns >= 20`:
- Fire one-time event: "Sarajevo Tunnel operational"
- Effect: Sarajevo enclave supply state permanently upgraded by one tier (criticalÃ¢â€ â€™strained)
- Reduce Sarajevo's IVP contribution by 30% (siege partially broken by tunnel)
- State: `sarajevo_tunnel_operational?: boolean` on GameState

**C3.3 Ã¢â‚¬â€ Player smuggling allocation:**
- Small pool of "smuggling points" per turn: `smuggling_efficiency * SMUGGLING_POOL_SCALE` (e.g., 2.0 at max efficiency Ã¢â€ â€™ 0.6 points)
- Player allocates across eligible enclaves (isolation_turns > 0): choose ammo (heavy_munitions) or food (general_supply) per enclave
- Trade-off: ammo improves combat but doesn't reduce IVP; food reduces IVP but doesn't help fighting
- State: `smuggling_allocation?: Record<string, { type: 'ammo' | 'food'; amount: number }>` on GameState
- Bot: allocate proportional to military need (lowest supply reserves get ammo)

**C3.4 Ã¢â‚¬â€ Smuggling UI:**
- Section in Enclave Dashboard. Sliders per eligible enclave with ammo/food toggle. Budget indicator. Impact preview.

### C4: Patron Pressure Consequences

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** IVP threshold events that impose consequences on the high-IVP faction.

**Threshold events (RS-focused, historically the faction under most international pressure):**

| IVP Threshold | Event | Effect |
|---|---|---|
| composite_ivp >= 30 | "Drina Blockade" Ã¢â‚¬â€ Serbia reduces support | RS `patron_commitment *= 0.85`. RS production income -15%. |
| composite_ivp >= 60 | "International Sanctions" | RS production income -30% total. RS `embargo_profile` smuggling reduced. |
| composite_ivp >= 80 | "NATO Intervention Threat" | RS aggression_modifier -0.15 globally (bot cautious near safe zones). Any RS attack on enclave OSID generates +5 IVP spike. |

**Hysteresis:** Consequences activate when threshold crossed, deactivate only when IVP drops 10 points below threshold (prevents oscillation).

**State:** Add `ivp_consequences_active?: string[]` to GameState (list of active consequence IDs).

**UI (C4.3):** Expand IVP gauge (C0.3) into "International Pressure" panel:
- IVP bar with threshold markers (30/60/80)
- Active consequences list with descriptions
- Per-faction: patron commitment bar, diplomatic isolation, active sanctions
- Trend arrows for all metrics

**Calibration (C4.4):** Run 40w scenario. Verify:
- IVP reaches ~30Ã¢â‚¬â€œ40 by week 40 (Sarajevo siege + enclave pressure)
- RS patron commitment begins declining by week 30Ã¢â‚¬â€œ35
- Troop strength and territorial control remain in historical bands
- Smuggling income doesn't cause RBiH heavy_munitions explosion

### Phase C Process

1. Implement C0 (IVP foundation) first Ã¢â‚¬â€ prerequisite for all other C tasks
2. Implement C1, C2, C3, C4 (can partially parallelize C1+C3 as they're independent)
3. Run `/simplify` on all changed files
4. Run `npx tsc --noEmit`, `npm run test:vitest`, and `npm run sim:scenario:run:40w`
5. Append ledger entry: "Phase C Ã¢â‚¬â€ Supply as player agency (IVP, airdrops, convoys, smuggling, patron consequences)"
6. Update napkin: Simulation Engine category (IVP, smuggling), GUI/HoI Map category (enclave dashboard expansion, convoy decisions, IVP panel)
7. Commit: `feat: Phase C Ã¢â‚¬â€ supply as player agency (IVP, airdrops, convoys, smuggling, patron pressure)`
8. Push

---

## Phase H Ã¢â‚¬â€ Intelligence Warfare (New Mechanics)

**Goal:** Let the player weaponize the intelligence system.
**Risk:** Medium Ã¢â‚¬â€ new operation types, confidence modifiers. Needs calibration.
**Prerequisite:** Phase F complete (operation UI), Phase G recommended (tempo presets show pattern for operation-type variants).

### H1: Feint Operation Type

**Delegation:** Gameplay Programmer + Game Designer

**What:** New `type: 'feint'` for CorpsOperation.

**Lifecycle:**
- Planning: normal (brigades stage, create visible buildup)
- Creates genuine `offensive_signs` in enemy sector intel (it IS an operation)
- Never transitions to execution Ã¢â‚¬â€ auto-enters recovery after 2 planning turns
- Recovery: 1 turn (minimal exhaustion)

**Cost:**
- Participating brigades: -5 cohesion (demonstration stress)
- Supply: 0.5 general_supply (fuel, ammo expenditure for demonstration)
- Corps exhaustion: +5 (vs +15 for real operation)

**Bot reaction:** Bot's existing intel consumption reacts naturally. When bot sees `offensive_signs=true`, it weights that sector as threatened and may shift reserves. No special "fooled" code Ã¢â‚¬â€ the feint works because the bot trusts its intel.

**Player UI:** In OpsPlanningModal, "Feint" as 5th operation type option. Tooltip: "Create false buildup to divert enemy reserves. Costs cohesion but never executes."

**Balance:** Feints must be costly enough to prevent spam. The -5 cohesion + supply cost + corps exhaustion means you can't feint more than 2Ã¢â‚¬â€œ3 times before your corps needs real recovery.

### H2: Operational Security Toggle

**Delegation:** Gameplay Programmer + UI/UX Developer

**What:** Per-sector toggle: "OPSEC Active".

**Effect:**
- Enemy confidence buildup for this sector halved (passive_buildup_per_turn Ãƒâ€” 0.5)
- Friendly cohesion recovery halved in sector (communication discipline is stressful)
- Duration: until toggled off or an operation in that sector enters execution (OPSEC breaks when the shooting starts)

**Engine:** In `deriveSectorIntel()`, when computing passive buildup for an enemy sector, check if the enemy sector's corresponding friendly sector has OPSEC active. If so, halve the buildup rate.

**State:** Add `opsec_sectors?: string[]` to GameState (list of sector_ids with OPSEC active).

**IPC:** New handler `stage-opsec-toggle` accepting `{ sectorId, active: boolean }`.

**UI:** Checkbox in sector detail panel. Visual indicator on map (sector tinted, small "OPSEC" badge).

### H3: Probe Operation Type

**Delegation:** Gameplay Programmer + Game Designer

**What:** New `type: 'probe'` for CorpsOperation. Reconnaissance in force.

**Lifecycle:**
- Planning: 1 turn only (rapid deployment)
- Execution: attack first objective only, 1 attempt maximum
- On ANY combat result (win or lose): set sector intel confidence to 1.0 for the contacted enemy sector
- If result is `costly_victory` or worse for attacker: auto-halt (casualty limit)
- Recovery: 1 turn

**Constraints:**
- Max 2 participating brigades (limited commitment)
- Corps exhaustion: +5 (vs +15 for full operation)

**Player UI:** In OpsPlanningModal, "Probe" as 6th operation type option. Tooltip: "Limited attack to reveal enemy strength. Max 2 brigades. Intel guaranteed regardless of outcome."

**Balance:** Probes trade ~200Ã¢â‚¬â€œ400 casualties for perfect sector intel. Worth it before a major offensive to avoid nasty surprises. But you can't probe everywhere Ã¢â‚¬â€ the 2-brigade limit and corps exhaustion throttle usage.

### H4: Calibration Gate

**Delegation:** QA Engineer

**What:** Run 40w scenario with all H-phase mechanics enabled. Bot defaults:
- Bot never creates feint operations (cost-benefit negative without player judgment)
- Bot never enables OPSEC (cohesion recovery cost too high for automated play)
- Bot never creates probe operations (recon by force already works via regular combat)

All new mechanics are player-only by default, so bot baseline should be unchanged. Verify:
- Territorial control unchanged from pre-H baseline
- Troop strength unchanged
- Sector intel confidence patterns unchanged (OPSEC and probes not used by bot)

### Phase H Process

1. Implement H1Ã¢â‚¬â€œH3
2. Run `/simplify` on all changed files
3. Run `npx tsc --noEmit`, `npm run test:vitest`, and `npm run sim:scenario:run:40w`
4. Append ledger entry: "Phase H Ã¢â‚¬â€ Intelligence warfare (feint operations, OPSEC toggle, probe operations)"
5. Update napkin: Bot AI & Combat category, Sectors & Operations category
6. Commit: `feat: Phase H Ã¢â‚¬â€ intelligence warfare (feint, OPSEC, probe operations)`
7. Push

---

## Phase E - Advanced Mobilization Agency

**Goal:** Let the player allocate weapons to specific municipalities.
**Risk:** HIGH - directly conflicts with calibrated mobilization scales.
**Prerequisite:** All previous phases stable and calibrated.

**Implementation note (2026-03-07):** Phase E was implemented after the A/B/C/F/G/H closure gate went green. The shipped mechanic kept the original intent but made it faction-differentiated under one shared state/UI surface:
- `RBiH`: `weapons_shipment` - one-turn local mobilization boost in the targeted municipality.
- `RS`: `staff_priority` - one-turn local reinforcement-rate boost from the existing pool.
- `HRHB`: `croatian_support_package` - one-turn local cohesion bonus on local reinforcement.

All three variants are deliberately local, one-turn, and pool-constrained so they add placement agency without rewriting global manpower calibration.

### E1: Design Weapons Allocation Mechanic

**Delegation:** Game Designer

**What:** Design a mechanic that gives the player a small "weapons shipment" budget per turn (e.g., 50 rifles/turn for RBiH in 1992, scaling with smuggling_efficiency). Player targets a municipality. Reinforcement rate for that municipality's pool boosted for 1 turn. Does NOT change global mobilization scales.

**Constraint:** Must not break calibration. The budget is small enough that it's a marginal boost, not a game-changer. The player's decision is WHERE to apply the boost, not how much total manpower is available.

### E2: Implement and Calibrate

**Delegation:** Gameplay Programmer + QA Engineer

**What:** Only after E1 design review and calibration impact assessment. Full 40w + 52w regression required.

### Phase E Process

Originally deferred. Implemented on 2026-03-07 after the Phase H acceptance gate was restored (`n248`/`n249`).

---

## Execution Order Summary

```
Sprint 1 (Parallel Ã¢â‚¬â€ UI Only, Zero Risk):
  Phase A: Surface Defensive Systems
  Phase F: Expose Offensive Levers
  -> /simplify -> ledger + napkin -> commit -> push

Sprint 2 (Sequential Ã¢â‚¬â€ Small Engine):
  Phase B: Sector-Level Defensive Orders
  -> /simplify -> ledger + napkin -> 40w regression -> commit -> push
  Phase G: Shaping the Fight
  -> /simplify -> ledger + napkin -> 40w regression -> commit -> push

Sprint 3 (Sequential Ã¢â‚¬â€ New Mechanics, Calibration-Sensitive):
  Phase C: Supply as Player Agency (C0 first, then C1-C4)
  -> /simplify -> ledger + napkin -> 40w regression -> commit -> push
  Phase H: Intelligence Warfare
  -> /simplify -> ledger + napkin -> 40w regression -> commit -> push

Deferred:
  Phase E: Advanced Mobilization Agency
```

---

## File Impact Summary

### New Files (estimated)
- `src/ui/map/components/EnclaveDashboard.tsx` (A1)
- `src/ui/map/map/builders/buildOperationalWeightGeoJSON.ts` (F4)
- `src/sim/ivp.ts` (C0)
- `src/sim/convoy_events.ts` (C2)
- `src/sim/smuggling.ts` (C3)

### Modified Files (major)
- `src/state/game_state.ts` Ã¢â‚¬â€ Schema additions per phase
- `src/ui/map/data/GameStateAdapter.ts` Ã¢â‚¬â€ Adapter derivations per phase
- `src/ui/map/data/types.ts` Ã¢â‚¬â€ UI type additions per phase
- `src/ui/map/components/OpsPlanningModal.tsx` Ã¢â‚¬â€ F1, G1-G4, H1, H3
- `src/ui/map/components/OperationsPanel.tsx` Ã¢â‚¬â€ F2, F5
- `src/ui/map/components/OOBSidebar.tsx` Ã¢â‚¬â€ A3
- `src/ui/map/components/FormationDetail.tsx` Ã¢â‚¬â€ A5
- `src/sim/combat/sector_offensive.ts` Ã¢â‚¬â€ F2, G4, H1, H3
- `src/sim/combat/bot_brigade_ai_osid.ts` Ã¢â‚¬â€ F1, G1, G2
- `src/sim/combat/bot_corps_ai.ts` Ã¢â‚¬â€ G5
- `src/sim/combat/sector_intel.ts` Ã¢â‚¬â€ H2
- `src/state/supply_reserves.ts` Ã¢â‚¬â€ C1, C3
- `src/sim/turn_phases/war_phases.ts` Ã¢â‚¬â€ Pipeline steps for B1, C0, C2, C3
- `src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts` Ã¢â‚¬â€ A4

### Test Files (new)
- `tests/ivp.test.ts` (C0)
- `tests/convoy_events.test.ts` (C2)
- `tests/smuggling.test.ts` (C3)
- `tests/sector_stance_orders.test.ts` (B1)
- `tests/operation_tempo.test.ts` (G2)
- `tests/feint_operation.test.ts` (H1)
- `tests/probe_operation.test.ts` (H3)
