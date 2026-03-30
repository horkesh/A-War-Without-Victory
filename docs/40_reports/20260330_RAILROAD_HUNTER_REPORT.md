# Railroad Hunter Report — Bot AI Hardcoded Rails (2026-03-30)

## Purpose
Catalog of hardcoded exemptions, magic thresholds, name checks, and competing systems in the bot AI layer. Reference material for v0.8 commander system cleanup (Step 10: old code removal).

---

## 1. Corps Exemptions & Name Checks

### Graz Accords (3 layers)
- **Faction-level**: RS↔HRHB cease-fire at turn 4 (`GRAZ_ACCORDS_TURN = 4` in `local_truces.ts:28`)
- **Corps-pair truces**: vrs_2nd_krajina ↔ hvo_tomislavgrad, vrs_herzegovina ↔ hvo_southeast_herzegovina
- **Corps exemptions**: `GRAZ_EXEMPT_RS_CORPS = {vrs_1st_krajina}`, `GRAZ_EXEMPT_HRHB_CORPS = {hvo_northwest_bosnia}` (`local_truces.ts:177-184`)
- **OSID exclusions**: Kiseljak area — 7 VRS-protected + 7 HRHB-protected OSIDs (`local_truces.ts:55-76`)

### Siege Exempt
- `SIEGE_EXEMPT_CORPS = {arbih_1st_corps, vrs_sarajevo_romanija}` in `brigade_front_distribution.ts:30` — skip redistribution

### Enclave Cores
- `ENCLAVE_CORE_MUNS = {srebrenica, gorazde, bihac}` in `battle_resolution.ts:174`

### RS Blitz Phase
- `RS_BLITZ_PHASE_END_WEEK = 12` (`bot_constants.ts:25`) — RS bypasses intel gates weeks 0-12

---

## 2. Brigade Movement — 6 Competing Systems

| System | File | Mechanism | Speed |
|--------|------|-----------|-------|
| A. Column March (OSID) | `osid_column_movement.ts` | Dijkstra, terrain-weighted | 2-4 OSID/turn |
| B. Regular Movement | `brigade_movement.ts` | BFS, settlement-based | 3 settlements/turn |
| C. Interior Movement | `bot_brigade_movement_ai.ts` | Adaptive 1-hop or column | Varies |
| D. Sector March | `bot_brigade_eval_front.ts` | Column to sector front | Column speed |
| E. Strategic Reserve | `strategic_reserve.ts` | Pure manpower flow | Instant |
| F. Pocket Evacuation | `bot_brigade_eval_front.ts` | Column to home_osid | Column speed |

### Race Conditions
- Multiple evaluators can issue column_march_orders to same brigade — last writer wins
- No check for existing orders before assignment
- Loaned elites can receive conflicting orders from two corps
- OSID column march has NO encirclement check (settlement-based does)

### 3 Separate Pathfinding Engines
1. Settlement BFS (`brigade_movement.ts`) — O(n)
2. OSID Dijkstra (`osid_column_movement.ts`) — terrain-weighted
3. BFS graph analysis (`osid_graph_analysis.ts`) — pre-computed

No caching between systems. Tie-breaking order differs (strict vs reverse).

### Missing Connectivity Checks
- Column march validates destination but not path
- Enclave boundary not validated during transit
- Supply connectivity not checked for movement destinations
- Sector reassignment mid-transit creates orphaned brigades

---

## 3. Operation Launch — Gates & Thresholds

### Exhaustion

| Gate | Constant | Value | File |
|------|----------|-------|------|
| Max for ops | MAX_EXHAUSTION_FOR_OPERATION | 30 | bot_constants.ts:63 |
| Probe margin | PROBE_EXHAUSTION_MARGIN | +10 (40) | bot_corps_directives.ts:160 |
| Idle decay | EXHAUSTION_DECAY_IDLE | 3/turn | sector_offensive.ts:292 |
| Active decay | EXHAUSTION_DECAY_ACTIVE | 1/turn | sector_offensive.ts:295 |

### Intel Gates (Faction-Specific)

| Faction | Initial Confidence | Launch Threshold | File |
|---------|-------------------|------------------|------|
| RS | 0.30 (JNA) | 0.35 | sector_intel_constants.ts |
| RBiH | 0.05 (near-zero) | 0.40 | sector_intel_constants.ts |
| HRHB | 0.15 (Croatian SIS) | 0.30 | sector_intel_constants.ts |

### Operation Phase Timing

| Phase | Max Duration | File |
|-------|-------------|------|
| Planning | 4 turns | sector_offensive.ts:613 |
| Execution | 6 turns | bot_constants.ts:67 |
| Recovery | 3 turns | bot_constants.ts:68 |

### Failure & Abort Gates

| Gate | Value | Effect |
|------|-------|--------|
| MAX_TOTAL_FAILURES | 8/axis | Hard abort |
| MAX_CONSECUTIVE_FAILURES_ON_CURRENT | 3 | Skip objective |
| MAX_CONSECUTIVE_CATASTROPHIC | 2 | Axis stalls |
| MAX_ZERO_PROGRESS_FAILURES | 3 | Hard abort (0 captures + attacks) |
| MAX_MOVEMENT_ONLY_TURNS | 4 | Deadlock abort |
| OBJECTIVE_FAILURE_COOLDOWN | 8 turns | Suppress after 2 fails |

### Doctrine Phases (from timeline JSON, overrides bot_strategy.ts)
- **RS**: Offensive w0-26 (blitz w0-12, sustained w12-26), then offensive w26+
- **RBiH**: Defensive w0-15, balanced w15-80, offensive w80+
- **HRHB**: Offensive w0-26, balanced w26+

### Slot & Participation Limits
- MAX_PARTICIPATING_BRIGADES = 20
- MIN_BRIGADES_FOR_OFFENSIVE = 2
- MIN_BRIGADES_FOR_OPERATION = 3
- MAX_OBJECTIVES_CAP = 6
- OBJECTIVES_PER_BRIGADE = 0.5
- Secondary op cooldown: 5 turns (3 for offensive corps)

---

## 4. Personality Modifiers (Commander Layer)

| Trait | Threshold | Effect | File |
|-------|-----------|--------|------|
| Caution > 0.5 | +0-20% garrison | allocate.ts:38 |
| Aggression > 0.7 | -10% garrison | allocate.ts:44 |
| Aggression > 0.7 | +1 max attackers | emit.ts:274 |
| Caution > 0.5 | -1 max attackers | emit.ts:275 |
| Aggression > 0.6 | 3 reserve shifts/zone | decide.ts:574 |
| Caution > 0.5 | 1 reserve shift/zone | decide.ts:575 |

---

## 5. Implications for v0.8 Cleanup

When `USE_COMMANDER_LOOP` flag is made permanent and old code removed:

1. **Graz exemptions** stay — these are diplomatic/historical, not AI rails
2. **Movement systems** need unification — commander should own movement priority
3. **Intel gates** partially absorbed by commander DECIDE phase — but old gates still active in parallel
4. **Exhaustion/failure gates** in sector_offensive.ts are independent of commander — keep as-is
5. **Doctrine phases** from timeline JSON are consumed by both old and new systems — keep
