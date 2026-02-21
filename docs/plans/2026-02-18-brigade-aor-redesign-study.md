# Brigade AoR Comprehensive Redesign Study

**Date:** 2026-02-18
**Status:** Design approved, ready for implementation planning. Warroom cross-impacts documented in docs/plans/2026-02-18-warroom-war-phase-modals-design.md § Brigade AoR Redesign Cross-Impact Summary.
**Scope:** Fundamental rework of brigade positioning, movement, combat, front lines, and AoR

## Executive Summary

Replace the current municipality-based AoR system (brigades cover 12-48+ settlements derived from 1-3 municipalities) with a **settlement-level positional system** where each brigade covers **1-4 settlements** based on personnel strength. Undefended settlements rely on militia garrisons from Phase 0 investment. Front lines remain defined by political control boundaries but distinguish between defended (brigade-garrisoned) and undefended (militia-only or empty) segments. Brigades move via a pack/unpack cycle with vulnerability windows. Multiple brigades can combine for attacks. Operational Groups draw personnel from brigades at the cost of AoR coverage.

Three additional systems complete the redesign:
- **Terrain-limited battle width**: Mountain passes and river crossings restrict how many brigades can attack simultaneously, creating natural chokepoints.
- **Battle damage (exhaustion-as-terrain)**: Settlements accumulate permanent physical destruction from fighting, slowing movement and degrading supply — producing front stagnation organically.
- **Fog of frontage with faction-asymmetric reconnaissance**: Players cannot see enemy brigade positions. ARBiH has recon range 2 (elite *izviđačke čete* reconnaissance platoons), VRS and HVO have recon range 1. Probe posture enables active reconnaissance. Battalion defensive arc markers show detected positions on the map.

## Current System (Being Replaced)

### Architecture
- **Municipality supra-layer**: each brigade assigned 1-3 municipalities (MAX_MUNICIPALITIES_PER_BRIGADE = 3)
- **Settlement AoR derived from municipalities**: multi-source BFS assigns front-active settlements to brigades within their municipalities
- **Operational cap**: 12-48 settlements actively covered per brigade depending on personnel/readiness/posture
- **Movement**: brigade submits municipality orders (move to adjacent municipalities); settlement-level AoR re-derived automatically
- **Front detection**: settlement adjacent to enemy-controlled settlement = front-active

### Problems With Current System
1. Brigades cover unrealistic territory (the 803rd Light had 223 settlements)
2. Even with operational caps, the abstraction is "you cover territory" not "you hold positions"
3. Zvornik stays RBiH in all scenario runs — historically it fell immediately in April 1992
4. Front is a wall-to-wall line with no gaps — not how the early war worked
5. Municipality-level movement is too coarse for tactical positioning
6. No meaningful decision about brigade concentration vs spread

### Key Numbers
- **Total settlements in graph**: 5,821 (with edges)
- **Total edges**: 8,558 (undirected)
- **Average edges per settlement**: 5.88
- **Mandatory brigades at game start**: 213 (RBiH 101, RS 80, HRHB 32)
- **Total OOB brigades**: 236 (RBiH 116, RS 80, HRHB 40)

---

## New System: Settlement-Level Positional AoR

### Core Rule: Personnel-Based AoR Cap

A brigade's maximum AoR size is determined by its personnel:

| Personnel | Max AoR Settlements | Concept |
|-----------|-------------------|---------|
| 1-399 | 1 | Single position (urban fortress, last stand, newly formed) |
| 400-799 | 2 | Two positions (thin coverage) |
| 800-1199 | 3 | Standard brigade frontage |
| 1200+ | 4 | Maximum brigade frontage (regardless of further personnel growth) |

**Formula**: `maxAoR = Math.min(4, Math.max(1, Math.floor(personnel / 400)))`

**Key properties:**
- Cap is a **maximum, not a requirement**. A 1200-person brigade *can* cover 3 settlements but may choose to concentrate on 1 or 2.
- Player (or bot) decides the brigade's AoR size within the cap.
- AoR settlements must be **contiguous** within the settlement graph.

### Garrison Strength Per Settlement

Garrison is evenly distributed across AoR settlements:

```
garrison_per_settlement = personnel / aor_settlement_count
```

**Concentration tradeoff:**
- 1200 personnel across 3 settlements = 400 per settlement (standard)
- 1200 personnel concentrated on 1 settlement = 1200 garrison (fortress)
- 1200 personnel across 4 settlements = 300 per settlement (thin)

**Cohesion modifier for spread:**
- At max AoR: -2 cohesion per turn (command strain from full spread)
- At AoR = 1 (fully concentrated): +1 cohesion per turn (concentration bonus)
- Between: linear interpolation

This creates a genuine tradeoff: concentrate for strength and cohesion, or spread for territory at the cost of defensive weakness and command strain.

### Coverage Math at Game Start

With 213 mandatory brigades at 800 personnel (2 settlements each):

| Faction | Brigades | AoR Settlements | % of 5,821 |
|---------|----------|----------------|------------|
| RBiH | 101 | 202 | 3.5% |
| RS | 80 | 160 | 2.7% |
| HRHB | 32 | 64 | 1.1% |
| **Total** | **213** | **426** | **7.3%** |

~93% of settlements are undefended by brigades at war start. This is intentional — April 1992 was chaos. Brigades must be positioned deliberately. The early war is a land grab for strategic positions, and undefended settlements depend on militia garrisons.

As brigades recruit to 1200+ personnel (3-4 settlements each) and new brigades spawn from pools:

| Phase | Avg Personnel | Avg AoR | Total Coverage | % of 5,821 |
|-------|--------------|---------|---------------|------------|
| Week 1 (war start) | 800 | 2 | ~426 | 7.3% |
| Week 12 (early war) | 1000 | 2-3 | ~600 | 10.3% |
| Week 26 (mid war) | 1400 | 3-4 | ~900 | 15.5% |
| Week 52 (year 1) | 1800 | 4 | ~1100 | 18.9% |
| Week 80+ (late war) | 2000+ | 4 | ~1200+ | 20%+ |

Front coverage grows over time as brigades build strength and new ones spawn. By late war, with ~300 brigades at 4 settlements each, ~1200 settlements are brigade-garrisoned — still only ~20% of all settlements, but concentrated on the actual front lines where it matters.

---

## Front Line Definition

### Dual Front Classification

Front lines remain defined by **political control boundaries** (where faction A's territory meets faction B's territory). Every edge between settlements of different factions is a front edge. But front edges are now classified:

| Front Type | Condition | Visual | Combat |
|-----------|-----------|--------|--------|
| **Defended** | Brigade AoR settlement adjacent to enemy settlement (with or without enemy brigade) | Solid barbed wire (existing style) | Full combat resolution |
| **Garrisoned** | No brigade, but militia garrison > 0 (from Phase 0 investment) | Dashed line, thinner | Reduced combat — militia fights but weakly |
| **Undefended** | No brigade, no militia garrison | Dotted line, faint | Minimal resistance — attacker takes with trivial losses |

**Map rendering**: All three types visible so the player can see where the gaps are. Defended segments are thick and solid. Undefended segments are faint dots — visible holes in the line. This visual language tells the player "you need brigades here" without any abstract overlay.

### Front Line Properties
- Front still computed from `political_controllers` (settlement control boundary)
- Front type determined by checking `brigade_aor[settlement]` and `militia_garrison[settlement]`
- RBiH-HRHB front suppressed when allied (existing gate, unchanged)

---

## Militia Garrisons

### Phase 0 Legacy Payoff

Settlements not covered by a brigade have a **militia garrison** derived from Phase 0 organizational investment. This is not a formation — it's a background defense value representing armed locals, Territorial Defense remnants, police, and party militia.

### Garrison Derivation

```
militia_garrison[settlement] = base_militia(municipality) × org_pen_multiplier(municipality, faction)
```

Where:
- `base_militia(municipality)`: derived from `militia_pools[mun].available` — the manpower pool that feeds brigade recruitment. A fraction remains as local defense.
- `org_pen_multiplier`: from Phase 0 organizational penetration values:
  - `party_penetration`: 0.0-1.0 (political organization)
  - `police_loyalty`: loyal/neutral/hostile → 1.0/0.3/0.0
  - `paramilitary_presence`: 0.0-1.0 (armed irregulars)
  - `to_control` (RBiH only): controlled/partial/none → 1.0/0.5/0.0

**Typical values:**
- Heavily invested municipality: militia garrison ~80-120 per settlement
- Lightly invested: ~20-40 per settlement
- No investment: 0 (truly undefended)

### Militia in Combat

Militia garrisons fight when attacked but with severe penalties:
- **No equipment bonus** (infantry only, no tanks/artillery)
- **Low cohesion** (militia cohesion: 30, vs brigade 60+)
- **No posture bonus** (always "defend" at base multiplier)
- **No corps/operation bonuses**
- **Casualties absorbed by militia pool** (not formation casualties)

Militia cannot attack. Militia cannot move. Militia exists only as static local defense. This gives Phase 0 investment lasting value — a well-organized municipality resists enemy takeover longer, buying time for brigade redeployment.

### Militia Depletion

When a militia garrison takes casualties from defending against attack:
- Casualties subtracted from `militia_pools[mun].available`
- If militia pool depleted, garrison becomes 0 (truly undefended)
- Militia does not regenerate during war (pool is finite)

This means sustained attacks against militia-only settlements eventually exhaust local resistance, reflecting the historical pattern of paramilitaries wearing down local defense before regular forces arrive.

---

## Brigade Movement: Pack/Unpack Cycle

### Movement Model

Brigades no longer "move between municipalities." Instead, they move through the settlement graph via a **pack/unpack cycle**:

**States:**
| State | Duration | Combat Capability | AoR |
|-------|----------|------------------|-----|
| **Deployed** | Indefinite | Full | 1-4 settlements (normal) |
| **Packing** | 1 turn | 50% garrison (preparing to move) | Current AoR, degraded |
| **In Transit** | 1-3 turns (distance-dependent) | 0% (cannot fight) | No AoR — brigade is "on the road" |
| **Unpacking** | 1 turn | 50% garrison (setting up positions) | New AoR, degraded |

### Movement Sequence

1. **Player issues movement order**: selects brigade, selects destination settlement(s) (1-4, contiguous, within faction territory)
2. **Packing turn**: brigade remains at current AoR but at 50% garrison effectiveness. Can still be attacked (fights at half strength). Status: `packing`.
3. **Transit turns**: brigade is removed from AoR entirely. No garrison, no combat capability. Represented on map as a moving marker along the shortest path through friendly territory. Duration = graph distance / movement rate.
4. **Unpacking turn**: brigade arrives at destination, placed on new AoR at 50% garrison effectiveness. Status: `unpacking`.
5. **Deployed**: full combat capability restored.

### Movement Rate

```
transit_turns = Math.max(1, Math.ceil(graph_distance / MOVEMENT_RATE))
```

Where:
- `graph_distance`: shortest path through friendly-controlled settlements from current position to destination
- `MOVEMENT_RATE`: 3 settlements per turn (infantry march rate)
- Moving through enemy-controlled territory: **impossible** (must go through friendly territory only)

**Examples:**
- Adjacent settlement (distance 1): 1 transit turn
- 6 settlements away: 2 transit turns
- 12 settlements away: 4 transit turns
- Cross-country redeployment (30+ settlements): 10+ transit turns

### Movement Vulnerability

During transit, the brigade's former AoR settlements become **undefended** (or militia-garrisoned only). The enemy can detect this via Tier 2 intelligence (if they attacked those positions last turn and found reduced/no garrison). A well-timed attack against positions vacated by a redeploying brigade can break through before the brigade arrives at its new position.

This creates the core movement dilemma: **do you redeploy to plug a gap, knowing your current positions will be exposed?**

### Quick Shift (1-Settlement Reposition)

For small adjustments, a brigade can **shift** by 1 settlement without the full pack/unpack cycle:
- Drop one AoR settlement, add one adjacent settlement
- Takes 1 turn, no transit phase
- Brigade is at 75% garrison effectiveness during the shift turn
- Settlement being added: 25% garrison (advance element)
- Settlement being dropped: 50% garrison (rearguard, removed next turn)

This allows gradual front-line adjustment without the vulnerability of full redeployment.

---

## Player AoR Painting

### Interface

The player selects a brigade and **paints** which settlements it should cover:

1. Click brigade (on map or in OOB panel)
2. Brigade's current AoR highlighted
3. Click settlements to add/remove from AoR (toggle)
4. Validation shown in real-time:
   - Green: valid (contiguous, within cap, faction-controlled)
   - Red: invalid (non-contiguous, exceeds cap, enemy-controlled)
   - Amber: valid but causes movement (not adjacent to current AoR — triggers pack/unpack)
5. Confirm order

### Validation Rules
- All selected settlements must be contiguous with each other
- Count must not exceed personnel-based cap
- All settlements must be controlled by player's faction
- If new AoR overlaps another friendly brigade's AoR: **not allowed** (one brigade per settlement)
- If new AoR is not adjacent to current AoR: triggers pack/unpack movement

### Bot AoR Selection

Bot assigns AoR based on strategic scoring per settlement:
- Front-active settlements scored highest (adjacent to enemy)
- Corridor/objective settlements from `bot_strategy.ts` scored next
- Settlements adjacent to existing friendly brigades scored for linking bonus
- Rear settlements scored lowest
- Bot prefers to keep brigades concentrated (fewer settlements = stronger) unless front coverage demands spread

---

## Operational Groups Under New System

### OG as Personnel Detachment

Under the new system, Operational Groups gain a clear mechanical identity: a brigade **detaches personnel** to an OG, reducing its effective garrison but contributing to a concentrated strike force.

### OG Formation (Revised)

1. **Corps orders OG activation** with 2-4 donor brigades
2. Each donor contributes personnel (100-500 per donor, minimum 400 residual in donor)
3. **Donor's AoR cap recalculates immediately** based on reduced personnel:
   - Brigade with 1200 personnel (cap 3) donates 400 → 800 personnel (cap 2)
   - Brigade must shed 1 AoR settlement (outermost, non-critical)
   - If brigade cannot shed without breaking contiguity: donation reduced
4. OG formed as temporary formation with contributed personnel
5. OG assigned to 1-2 focus settlements (its own mini-AoR)
6. OG has attack posture, high initial cohesion (70), drains at -4/turn

### OG Dissolution

When OG dissolves (cohesion <15 or max_duration reached):
- Personnel returned to donor brigades equally
- Donor brigade AoR caps recalculate upward
- Donor brigades may expand AoR on next turn (if positions available)

### OG Gameplay Loop

The player (or bot) faces a real tradeoff:
- **Form OG**: concentrated strike force for key objective, but donor brigades lose AoR coverage, creating gaps
- **Skip OG**: front coverage maintained but no concentrated punch for breakthrough

This is the fundamental tension of the Bosnian War: you never have enough forces to both hold the line AND attack. OGs represent the gamble of weakening your defense to achieve an offensive objective.

---

## Multi-Brigade Attack

### Combined Arms: Multiple Brigades Attack One Settlement

Under the new system, brigades can combine attacks on a single enemy settlement.

### Rules

1. **Adjacent requirement**: each attacking brigade must have at least one AoR settlement adjacent to the target
2. **Maximum attackers**: 3 brigades per target settlement (command friction limits coordination)
3. **Combined power**: sum of attacking brigades' combat power, with diminishing returns:
   - 1 brigade: 100% of its power
   - 2 brigades: 85% of each brigade's power (170% total — coordination overhead)
   - 3 brigades: 75% of each brigade's power (225% total — significant friction)
4. **Same corps bonus**: if all attacking brigades belong to the same corps, reduce friction:
   - 2 brigades, same corps: 90% each (180% total)
   - 3 brigades, same corps: 82% each (246% total)
5. **OG present bonus**: if an OG is one of the attacking formations, additional +10% coordination (OGs are purpose-built for combined operations)

### Casualty Distribution

When multiple brigades attack:
- Attacker casualties distributed proportionally to personnel contributed
- Each brigade takes its share independently (different cohesion/experience can cause different loss rates)
- If attack succeeds, settlement control flips; **first brigade by sorted ID** claims the settlement in its AoR

### Defender Against Multi-Brigade Attack

The defender gets a **fortification bonus** when outnumbered:
- Defending a single settlement against 2+ brigades: +15% defensive power (interior lines, concentrated defense)
- This means 2 brigades at 170% combined power vs 115% defense = effective 1.48:1 ratio
- 3 brigades at 225% vs 115% = effective 1.96:1 ratio
- Breakthrough requires commitment and still costs significant casualties

---

## Brigade Linking

### Adjacent Brigade Coordination Bonus

When two friendly brigades have AoR settlements adjacent to each other, they form a **linked** pair:

**Benefits:**
- **Mutual support**: +10% defensive power for linked settlements (can reinforce each other)
- **Cohesion stability**: -1 to cohesion loss per turn (shared logistics, mutual morale)
- **Combined attack eligibility**: linked brigades can combine for multi-brigade attacks (see above)
- **Intelligence sharing**: Tier 2 contact data shared between linked brigades (if one fights an enemy formation, the adjacent brigade learns about it too)

**Conditions:**
- Both brigades must be active (not packing/transit/unpacking)
- Both must be same faction
- At least one AoR settlement of brigade A must be adjacent to at least one AoR settlement of brigade B
- Both brigades in the same corps: linking bonus increased to +15% defensive power

**Visual:**
- Linked brigades show a thin connecting line on the map (existing corps-subordinate line style)
- Linked segments of the front line rendered slightly thicker/brighter

**Strategic implication:**
The player wants to link brigades along the front to form a coherent defensive line. Gaps between brigades (no linking) are the weak points. This naturally creates the "continuous front" feel for mature armies while keeping the early-war gaps visible.

**Late-war front coverage:**
With ~300 brigades at 4 settlements each = 1200 settlements. If concentrated on front lines (which is maybe 800-1000 settlements of actual contact), most of the front becomes defended AND linked. This is the historical trajectory: chaotic early war → stabilized front by mid-1993.

---

## Attack Origination

### Attacks Must Originate From AoR

A brigade can only attack settlements adjacent to its own AoR settlements. This is already implicit in the current system but becomes critical under the new model:

- Brigade covering settlements [A, B, C] can only attack settlements adjacent to A, B, or C
- To attack in a new direction, the brigade must first reposition its AoR (quick shift or full redeploy)
- This makes brigade positioning the **core strategic decision**: where you point your brigade determines what you can attack

### Attack Posture and AoR

When a brigade has attack posture:
- It can target one adjacent enemy settlement per turn (unchanged from current)
- Its garrison effectiveness on AoR settlements drops to 70% (troops committed to offensive — unchanged from current operational cap posture multiplier, but now applied to the smaller AoR)
- If the attack succeeds and the settlement flips, the brigade can absorb it into AoR (if within personnel cap) or it becomes ungarrisoned

### Successful Attack — AoR Expansion

When a brigade conquers an enemy settlement:
- If brigade is below AoR cap: conquered settlement automatically added to AoR (must maintain contiguity)
- If brigade is at AoR cap: conquered settlement becomes ungarrisoned (militia-only or empty)
- Brigade cannot exceed cap even through conquest — maintaining more ground requires more personnel or another brigade

---

## Encirclement at Brigade Level

### Brigade-Level Pocket Formation

Under the new system, encirclement becomes tactically meaningful at the brigade level:

**Detection:**
A brigade is considered **tactically encircled** when:
- ALL of its AoR settlements are surrounded by enemy-controlled settlements (no friendly-controlled neighbor)
- OR all paths through friendly territory from its AoR to faction main territory are cut

**Effects of encirclement:**
- **Supply cut**: brigade cannot receive reinforcements or WIA trickleback
- **Cohesion drain**: -5 per turn (accelerated, vs normal -2 when unsupplied)
- **No movement**: pack/unpack orders blocked (nowhere to go through friendly territory)
- **Morale**: garrison effectiveness -20% (isolation penalty)

**Breakout:**
An encircled brigade can attempt breakout:
- Issues movement order toward nearest friendly territory
- Breakout is a special movement: brigade fights through 1 enemy-controlled settlement per turn
- Casualties during breakout: 10% personnel per settlement traversed
- If successful: brigade arrives in friendly territory, depleted but alive
- If personnel reaches 0 during breakout: brigade destroyed

**Pocket dynamics:**
Enemy brigades can create pockets by pushing past a brigade's flanks through undefended settlements. The target brigade's AoR doesn't change, but suddenly all neighboring settlements are enemy-held. This is how Srebrenica, Gorazde, Zepa, and Bihac formed historically — and how smaller pockets form and collapse throughout the war.

---

## Interaction With Existing Systems

### What Changes

| System | Current | New | Impact |
|--------|---------|-----|--------|
| **brigade_aor** | Record<SettlementId, FormationId \| null> — thousands of entries | Same type, but only 1-4 entries per brigade | Major simplification |
| **brigade_municipality_assignment** | Primary layer driving AoR | **Removed entirely** — AoR is settlement-level, no municipality abstraction | Large deletion |
| **Municipality orders** | Brigade moves between municipalities | **Replaced by** settlement-level AoR painting + pack/unpack movement | Rewrite |
| **Operational cap** | 12-48 settlements dynamically | **Replaced by** personnel-based 1-4 cap | Simplification |
| **Rebalancing** | Shed/absorb settlements to reduce 1000:1 ratios | **Removed** — with 1-4 max, no rebalancing needed | Deletion |
| **Contiguity enforcement** | Complex multi-pass contiguity repair | **Simplified** — 1-4 contiguous settlements trivially validated | Simplification |
| **Front-active detection** | Settlement adjacent to enemy = front-active | **Unchanged** — still control-boundary based | No change |
| **Garrison calculation** | `personnel / coveredSettlements.length` | **Unchanged formula** — but coveredSettlements is now 1-4, not 12-48 | Values change dramatically |
| **Battle resolution** | Garrison-based combat | **Unchanged core** — but garrison values are now 200-1200 instead of 10-100 | Rebalancing needed |
| **Bot brigade AI** | Select posture, select attack target from operational coverage | **Revised** — select AoR settlements (positioning), then posture and target | Rewrite |
| **Bot corps AI** | Generate municipality orders, OG orders, operations | **Revised** — generate settlement-level AoR orders, OG orders (with AoR cost), operations | Significant revision |
| **Corps-directed AoR** | Partition front into corps sectors, assign municipalities | **Revised** — partition front into sectors, assign settlement clusters | Revision |
| **Surrounded brigade reform** | Detect enclave, relocate to main territory | **Enhanced** — tactical encirclement detection at brigade level, breakout mechanics | Enhancement |
| **Turn pipeline** | 6+ AoR management steps | **Reduced** — validate AoR, apply movement, apply orders | Simplification |
| **Map rendering** | Barbed wire on all control boundaries + defended/undefended | **Enhanced** — three-tier front (defended/garrisoned/undefended) + movement markers | Enhancement |
| **Warroom modals** | Fake data (personnel = settlements × 500, totalDisplaced = 0) | **Updated** — reads new state fields: `brigade_movement_state`, `militia_garrison`, `recon_intelligence`, `battle_damage`. See warroom design doc cross-impact section. | Enhancement |
| **Player UI** | AoR transfer dropdown in settlement panel | **Replaced by** AoR painting interface + movement orders | Rewrite |
| **HQ mobility** | HQ at depth-2 behind front in AoR | **Simplified** — HQ at one of the 1-4 AoR settlements (typically rearmost) | Simplification |

### What Stays Unchanged

- **Political control** (`political_controllers`): settlement ownership unchanged
- **Formation state**: personnel, cohesion, experience, equipment, posture — all unchanged
- **Casualty ledger**: unchanged
- **Displacement/civilian casualties**: unchanged
- **Exhaustion system**: unchanged
- **Recruitment/reinforcement**: unchanged (personnel flows into brigade, brigade AoR cap grows)
- **Phase 0 → Phase I transition**: unchanged
- **Corps command structure**: unchanged (corps still manage brigades)
- **Named operations**: unchanged (still multi-turn campaigns)

### What Gets Deleted

- `brigade_municipality_assignment` state field
- `brigade_mun_orders` state field
- `ensureBrigadeMunicipalityAssignment()` and all municipality assignment logic
- `deriveBrigadeAoRFromMunicipalities()` — no longer derived from municipalities
- `applyBrigadeMunicipalityOrders()` — replaced by settlement-level movement
- `rebalanceBrigadeAoR()` — unnecessary with 1-4 cap
- `MAX_MUNICIPALITIES_PER_BRIGADE` constant
- `BRIGADE_OPERATIONAL_AOR_HARD_CAP` constant
- `getBrigadeOperationalCoverageSettlements()` — replaced by direct AoR (AoR IS the coverage)
- Dynamic operational cap calculation (`brigade_operational_cap.ts`) — replaced by personnel-based cap
- Municipality-level contiguity enforcement (replaced by trivial settlement-level check)

### New State Fields

```typescript
// New fields in GameState
militia_garrison: Record<SettlementId, number>;          // Per-settlement militia defense value
brigade_movement_state: Record<FormationId, BrigadeMovementState>;  // Pack/unpack tracking
battle_damage: Record<SettlementId, number>;             // Per-settlement cumulative damage [0.0, 1.0]
recon_intelligence: Record<FactionId, ReconIntelligence>; // Fog of frontage per faction

interface BrigadeMovementState {
  status: 'deployed' | 'packing' | 'in_transit' | 'unpacking';
  origin_settlements: SettlementId[];      // Where the brigade was
  destination_settlements: SettlementId[]; // Where it's going
  transit_path: SettlementId[];            // Route through friendly territory
  transit_progress: number;                // Settlements traversed so far
  transit_total: number;                   // Total path length
  turns_remaining: number;                 // Turns until arrival
}

interface ReconIntelligence {
  detected_brigades: Record<SettlementId, DetectedBrigadeInfo>;
  confirmed_empty: SettlementId[];         // Sorted array for determinism
  detection_turn: Record<SettlementId, number>;
}

interface DetectedBrigadeInfo {
  formation_id?: FormationId;              // Known if identified through battle
  strength_category: 'weak' | 'moderate' | 'strong' | 'fortress';
  detected_turn: number;
  detected_via: 'battle' | 'probe' | 'recon' | 'linked';
}
```

### New Constants

```typescript
// AoR cap
const PERSONNEL_PER_AOR_SETTLEMENT = 400;  // 400 personnel per settlement slot
const MAX_AOR_SETTLEMENTS = 4;             // Hard cap regardless of personnel
const MIN_AOR_SETTLEMENTS = 1;             // Always at least 1

// Movement
const MOVEMENT_RATE = 3;                   // Settlements per turn during transit
const PACKING_GARRISON_MULT = 0.5;         // 50% garrison during packing
const UNPACKING_GARRISON_MULT = 0.5;       // 50% garrison during unpacking
const QUICK_SHIFT_GARRISON_MULT = 0.75;    // 75% during 1-settlement shift
const QUICK_SHIFT_NEW_GARRISON_MULT = 0.25; // 25% on the settlement being added

// Multi-brigade attack
const MULTI_ATTACK_MAX_BRIGADES = 3;       // Max brigades per target
const MULTI_ATTACK_2_EFFICIENCY = 0.85;    // Each brigade at 85% with 2 attackers
const MULTI_ATTACK_3_EFFICIENCY = 0.75;    // Each brigade at 75% with 3 attackers
const MULTI_ATTACK_SAME_CORPS_2 = 0.90;    // Same corps: 90% with 2
const MULTI_ATTACK_SAME_CORPS_3 = 0.82;    // Same corps: 82% with 3
const MULTI_ATTACK_OG_BONUS = 0.10;        // +10% when OG is participating
const MULTI_ATTACK_DEFENDER_BONUS = 0.15;  // +15% for defender vs multi-brigade

// Linking
const LINK_DEFENSE_BONUS = 0.10;           // +10% defense for linked brigades
const LINK_SAME_CORPS_BONUS = 0.15;        // +15% if same corps
const LINK_COHESION_BONUS = 1;             // -1 cohesion loss per turn

// Concentration
const CONCENTRATION_COHESION_BONUS = 1;    // +1 cohesion/turn when AoR = 1
const SPREAD_COHESION_PENALTY = 2;         // -2 cohesion/turn when AoR = max

// Militia
const MILITIA_GARRISON_FRACTION = 0.05;    // 5% of municipality militia pool as local garrison
const MILITIA_COHESION = 30;               // Fixed militia cohesion
const MILITIA_EQUIPMENT_MULT = 0.5;        // No heavy equipment (infantry only, halved effectiveness)

// Encirclement
const ENCIRCLED_COHESION_DRAIN = 5;        // Per turn when encircled
const ENCIRCLED_GARRISON_PENALTY = 0.20;   // -20% garrison effectiveness
const BREAKOUT_CASUALTY_RATE = 0.10;       // 10% personnel lost per settlement during breakout
```

---

## Battle Resolution Rebalancing

### Garrison Value Changes

Under the current system, garrison per settlement ranges from ~10-100 (thousands of settlements per brigade). Under the new system, garrison ranges from ~200-1200 (1-4 settlements per brigade).

**Current combat power formula remains valid** — it uses garrison as an input, and the intensity/casualty calculations scale with garrison magnitude. However, constants may need recalibration:

**Areas requiring calibration:**
1. `ATTACKER_VICTORY_THRESHOLD` (currently 1.2) — may need adjustment since garrison values are 10-100x higher
2. `BASE_CASUALTY_PER_INTENSITY` (currently 50) — casualty magnitude relative to new garrison ranges
3. `CASUALTY_INTENSITY_DIVISOR` (currently 350) — scales intensity to reasonable casualty numbers
4. `UNDEFENDED_DEFENDER_CASUALTY_SCALE` (currently 0.5) — for militia-only settlements

**Recommended approach**: Run the existing 52w scenario with the new AoR system and calibrate combat constants based on output. The key metric is: does the control map at week 26 / week 52 resemble historical patterns better than the current system?

### Militia Combat Resolution

When an enemy brigade attacks a settlement with only militia garrison:
- Militia fights as defender with `MILITIA_COHESION` (30), no equipment multiplier, base experience (0)
- Attacker power likely overwhelms militia — attack succeeds in most cases
- Militia casualties subtracted from `militia_pools[mun].available`
- Attacker still takes casualties (no free wins) but lighter than vs brigade
- Multiple militia settlements can fall per turn to a single aggressive brigade (attack one, take it, next turn attack the next)

---

## Turn Pipeline (Revised Phase II Steps)

### New Step Ordering

```
1. validate-brigade-aor
   - Verify all AoR entries valid (settlement exists, controlled by faction, within cap)
   - Remove dissolved/inactive brigade entries
   - No rebalancing needed (1-4 cap self-regulates)

2. process-brigade-movement
   - Advance transit progress for in-transit brigades
   - Transition packing → in_transit (clear origin AoR)
   - Transition in_transit → unpacking when arrived (assign destination AoR)
   - Transition unpacking → deployed (full garrison restored)
   - Apply new movement orders (deployed → packing)

3. apply-aor-orders
   - Player/bot AoR painting: add/remove settlements within cap
   - Quick shifts: drop one, add one adjacent
   - Validate contiguity and cap

4. detect-encirclement
   - Check each brigade for tactical encirclement
   - Apply encirclement effects (supply cut, cohesion drain)
   - Process breakout attempts

5. compute-militia-garrisons
   - Derive militia_garrison[settlement] from militia_pools and org-pen
   - Deplete militia from previous turn's combat losses

6. generate-bot-corps-orders
   - Corps stance, operations, OG activation (revised for settlement-level)

7. generate-bot-brigade-orders
   - AoR selection (positioning), posture, attack targets
   - Bot considers linking, concentration, and front coverage

8. resolve-attack-orders
   - Multi-brigade attacks resolved together
   - Militia garrison used when no brigade present
   - Settlement flips, casualties, displacement cascade

9. post-combat-aor-update
   - Conquered settlements added to attacker AoR if within cap
   - Lost settlements removed from defender AoR
   - OG AoR cap recalculated from donor personnel changes

10. formation-hq-sync
    - HQ placed at rearmost AoR settlement
    - Trivial with 1-4 settlements
```

---

## Bot AI Revisions

### Bot Brigade AI (Settlement-Level Positioning)

The bot must now decide **which settlements** each brigade covers, not just posture and attack target.

**AoR Selection Algorithm:**

1. **Front-priority**: always prefer settlements adjacent to enemy territory
2. **Objective-priority**: settlements in strategic municipality lists (from bot_strategy.ts offensive/defensive objectives)
3. **Linking-priority**: settlements adjacent to friendly brigade AoR (to form linked line)
4. **Concentration-priority**: when threatened (low cohesion, enemy attacking), reduce AoR to concentrate
5. **Expansion-priority**: when secure (high cohesion, no enemy contact), expand AoR to cover more front

**Attack target selection**: unchanged in principle (score adjacent enemy settlements by strategic value, garrison strength, etc.) but now constrained to settlements adjacent to brigade's 1-4 AoR settlements.

### Bot Corps AI (Operational-Level Coordination)

Corps AI coordinates brigade positioning across a sector:

1. **Sector coverage**: distribute brigades along corps sector to minimize gaps (maximize linking)
2. **Reserve management**: keep 1-2 brigades behind the front for rapid deployment to breaches
3. **OG formation**: identify attack objectives, select donor brigades (accepting AoR reduction cost)
4. **Movement orders**: redeploy brigades to threatened sectors or offensive assembly areas

---

## Impact on Existing Features

### Shared RBiH-HRHB Municipalities

**Problem solved.** Under the current system, shared municipalities require complex rules about which faction's brigade gets which settlement. Under the new system, each brigade covers 1-4 specific settlements. An RBiH brigade can hold 2 settlements in Travnik while an HRHB brigade holds 2 other settlements in Travnik. No conflict, no special rules needed. The municipality layer is gone — it's all settlement-level.

### Zvornik Historical Outcome

**Problem solved.** At war start, RBiH has maybe 1-2 brigades near Zvornik covering 2-4 settlements. RS has JNA-equipped brigades nearby with higher combat power. RS attacks the specific settlements, overwhelms the garrison (or bypasses and encircles), and takes Zvornik. Under the current system, the entire municipality is assigned to a brigade that "covers" dozens of settlements — making it impossible for the attacker to punch through.

### Sarajevo Siege

**Enhanced.** Sarajevo brigades can concentrate (AoR = 1 settlement, 1200+ garrison) creating fortress positions. RS brigades encircle but must crack each position individually. The siege ring is visible as a ring of RS brigades surrounding concentrated RBiH positions. Small ARBIH brigade sorties (attack posture from a single AoR settlement) can try to break the ring but at great cost.

### Enclaves

**Enhanced.** Srebrenica/Gorazde/Zepa brigades are literally 1-2 brigades covering 2-4 settlements each, surrounded by RS territory. Supply is cut (encirclement mechanics). Cohesion drains. The enclave holds until the brigades' cohesion collapses or RS concentrates enough force to overwhelm.

### Phase 0 Investment Value

**Greatly increased.** Militia garrisons from Phase 0 investment provide the background defense that fills the 93% of settlements not covered by brigades. A player who invested heavily in Territorial Defense and paramilitaries starts the war with better militia garrisons, meaning their rear areas resist cleanup longer and their brigade deployments can be more aggressive.

---

## Implementation Order

### Phase A: Core AoR Rework (Foundation)
1. Define new constants and state fields
2. Replace `brigade_municipality_assignment` with settlement-level AoR
3. Implement personnel-based AoR cap (`maxAoR` formula)
4. Simplify contiguity validation (1-4 settlements trivial to check)
5. Revise garrison calculation
6. Update `brigade_aor` initialization from OOB (assign initial AoR at war start)
7. Delete municipality assignment layer, rebalancing, operational cap

### Phase B: Militia Garrisons
1. Implement `militia_garrison` derivation from Phase 0 org-pen
2. Wire militia garrison into battle resolution (as fallback defender)
3. Implement militia depletion from combat

### Phase C: Movement System
1. Implement `BrigadeMovementState` and pack/unpack cycle
2. Implement transit pathfinding (shortest path through friendly territory)
3. Implement quick shift (1-settlement reposition)
4. Wire movement into turn pipeline
5. Update map rendering (transit markers)

### Phase D: Multi-Brigade Attack & Linking
1. Implement combined attack resolution (2-3 brigades per target)
2. Implement linking detection (adjacent friendly brigade AoR)
3. Implement linking bonuses (defense, cohesion, intelligence)
4. Update front line rendering (linked segments)

### Phase E: OG Revision
1. Revise OG formation to reduce donor brigade AoR cap
2. Implement AoR settlement shedding when personnel donated
3. Test OG lifecycle with new AoR system

### Phase F: Bot AI
1. Revise bot brigade AI for settlement-level AoR selection
2. Revise bot corps AI for sector coverage and reserve management
3. Implement movement order generation
4. Calibrate strategic scoring for new system

### Phase G: Encirclement & Breakout
1. Implement tactical encirclement detection
2. Implement encirclement effects (supply, cohesion, garrison penalty)
3. Implement breakout mechanics
4. Wire into surrounded-brigade-reform (enhanced)

### Phase H: Terrain Battle Width
1. Derive terrain type per settlement from `settlements_terrain_scalars.json`
2. Implement `getMaxAttackers(settlement)` from slope/river/urban
3. Wire terrain battle width cap into multi-brigade attack resolution
4. Validate: mountain settlements allow only 1 attacker, plains allow 3

### Phase I: Battle Damage (Exhaustion-as-Terrain)
1. Implement `battle_damage` state field (monotonic 0.0-1.0)
2. Accumulate damage from battle casualties in `resolve-attack-orders`
3. Wire damage into movement cost (transit penalty), supply throughput, militia garrison, combat modifiers
4. Add visual degradation to map rendering (darkening/desaturation)

### Phase J: Fog of Frontage (Reconnaissance)
1. Implement `recon_intelligence` state field per faction
2. Implement passive recon (BFS from brigade AoR, faction-specific range)
3. Wire recon detection into map rendering (detected vs unknown enemy settlements)
4. Implement probe posture (active recon, reveals garrison with light casualties)
5. Implement intelligence staleness (probe/linked detections expire)
6. Implement linked brigade intelligence sharing
7. Render battalion defensive arc markers (half-circle with teeth toward enemy)
8. Render strength category markers for detected enemy formations

### Phase K: Player UI
1. Implement AoR painting interface on tactical/war map
2. Implement movement order UI (select destination, confirm pack/unpack)
3. Update settlement panel for new AoR display
4. Update OOB panel for brigade status (deployed/packing/transit/unpacking)
5. Implement fog of frontage on map (unknown/detected/confirmed empty visual states)
6. Implement defensive arc rendering for own and detected enemy brigades

### Phase L: Calibration & Testing
1. Run 52w scenario with new system
2. Compare control maps to historical
3. Calibrate combat constants for new garrison ranges
4. Calibrate militia garrison values
5. Calibrate battle damage accumulation rate
6. Calibrate terrain battle width thresholds (slope degrees)
7. Verify: Zvornik falls, Sarajevo holds, enclaves form
8. Verify: late-war front stabilization with linked brigades
9. Verify: RBiH recon advantage produces asymmetric intelligence
10. Verify: mountain/river chokepoints resist multi-brigade attack
11. Verify: battle-damaged settlements show front stagnation by week 40+

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Garrison values 10-100x higher breaks combat balance | Outcomes unrealistic | Calibration pass with existing scenario (Phase L) |
| Bot AI cannot reason about 5,821 settlement choices | Bot makes bad positioning | Restrict bot AoR choices to front-active + objective settlements |
| Transit brigades create mass vulnerability | Player loses territory during redeployment | Quick shift for small adjustments; transit only for major redeployment |
| Too few brigades → no front at all | Game feels like scattered skirmishes | Militia garrisons provide baseline defense; brigades concentrate at critical points |
| Late war too many brigades → system feels like current | Redesign wasted for late war | Max AoR cap of 4 keeps brigade count relevant; 300 brigades × 4 = 1200, still not wall-to-wall |
| Municipality layer removal breaks unexpected code | Runtime errors | Search all `brigade_municipality_assignment` references before deletion |
| Terrain battle width too restrictive | Mountain settlements become impregnable | Tune slope thresholds; verify that mountain garrisons still fall to concentrated firepower over multiple turns |
| Battle damage accumulates too fast | Front stagnates by week 12 instead of week 40 | Tune BATTLE_DAMAGE_DIVISOR; only count casualties above a floor to ignore small skirmishes |
| Fog of frontage makes bot too passive | Bot probes endlessly instead of attacking | Bot uses recon data from previous turns; probe is 1-turn investment, then commit; bot doesn't re-probe known positions |
| RBiH recon advantage too strong | RBiH always finds gaps, RS never does | RS compensates with firepower — even blind attacks succeed if concentrated; recon reveals position but not strength (only category) |
| Intelligence staleness too confusing for player | Player acts on stale data | Clear visual indicator (fading marker) for stale detections; tooltip shows "Last confirmed: N turns ago" |

---

## Terrain-Limited Battle Width

### Terrain Constrains Attacker Count

Not all settlements can absorb the same number of attacking brigades. Terrain type limits the **battle width** — how many brigades can engage simultaneously:

| Terrain | Max Attacking Brigades | Rationale |
|---------|----------------------|-----------|
| Plains / open | 3 | Full maneuver room |
| Hills / mixed | 2 | Restricted approach routes |
| Mountain / steep slope | 1 | Single narrow approach, funnel effect |
| Urban | 2 | Street fighting limits mass; but multiple axes of approach |
| River crossing | 1 | Single crossing point bottleneck |

### Derivation

Terrain type per settlement already exists in `settlements_terrain_scalars.json` (elevation_mean_m, slope, river adjacency). The battle width cap is derived from these existing scalars:

```
if (settlement has river_crossing edge to attacker): max_attackers = 1
else if (slope > MOUNTAIN_THRESHOLD): max_attackers = 1
else if (slope > HILL_THRESHOLD): max_attackers = 2
else if (settlement.is_urban): max_attackers = 2
else: max_attackers = 3
```

### Strategic Implications

- **Mountain passes become natural chokepoints**: 1 brigade can hold a mountain settlement against any force (only 1 attacker can engage). This is the Vlasic line, the Igman approach, the Drina gorges.
- **River crossings are deadly**: Attacking across a river means only 1 brigade can cross. The defender has interior lines. This is the Neretva, the Drina, the Bosna river crossings.
- **Plains are where breakthroughs happen**: Open terrain allows 3 brigades to combine — the maximum force concentration. Posavina corridor, Semberija, the flat approaches around Tuzla.
- **Urban combat is attritional**: 2 brigades can attack but urban defender bonus (existing terrain multiplier) plus fortification bonus means cities grind down both sides. This is Mostar, Sarajevo, Brcko.

### Interaction With Multi-Brigade Attack

The terrain battle width cap overrides the general multi-brigade attack maximum:
- General max: 3 brigades per target
- Mountain target: 1 brigade (terrain override)
- Hill target: 2 brigades (terrain override)
- Plains target: 3 brigades (general max applies)

If a player tries to send 3 brigades against a mountain settlement, only 1 can engage. The other 2 are blocked — they waste their attack order. This forces the player to read the terrain before committing forces.

---

## Exhaustion-as-Terrain (Battle Damage)

### Settlements Accumulate Battle Damage

After heavy fighting in a settlement — multiple battles, high casualties on both sides — the settlement accumulates **battle damage** representing physical destruction of infrastructure: cratered roads, destroyed bridges, collapsed buildings, mined approaches.

### Damage Accumulation

```
battle_damage[settlement] += damage_per_battle
```

Where `damage_per_battle` is proportional to the combined casualties (attacker + defender) from that battle:
```
damage_increment = (attacker_casualties + defender_casualties) / BATTLE_DAMAGE_DIVISOR
```

Battle damage is **monotonic** — it never decreases. A settlement fought over 10 times is permanently scarred. This is a one-way ratchet, consistent with the game's exhaustion philosophy.

**Cap:** `battle_damage` ranges from 0.0 to 1.0 (pristine to wasteland).

### Effects of Battle Damage

| Effect | Mechanism | Impact |
|--------|-----------|--------|
| **Movement cost** | Transit through damaged settlement costs +1 extra turn | Redeployment through war zones is slower |
| **Supply throughput** | Supply reachability penalized through damaged settlements | Supply lines through battle zones are fragile |
| **Militia garrison** | Militia garrison reduced by `(1 - battle_damage)` multiplier | Local defense collapses in devastated areas |
| **Defender bonus** | Damaged settlement gives +10% defensive bonus (rubble, craters as cover) | Paradoxically, ruins are easier to defend |
| **Attacker penalty** | Damaged settlement gives -10% attacker penalty (obstacles, mines, rubble) | Attacking through wasteland is costly |

### Sarajevo Application

After 52 weeks of siege warfare, the Sarajevo front settlements accumulate massive battle damage. The settlements around the siege ring become a wasteland:
- Movement through them is slow (+1 turn per damaged settlement in transit)
- Supply through them is degraded
- Militia in surrounding settlements is gone
- But the defenders dig deeper into the rubble (defender bonus)
- The attacker faces a nightmare of obstacles (attacker penalty)

This naturally produces front stagnation without arbitrary rules. The front hardens because the *ground itself* is destroyed. Neither side can push through the devastation efficiently.

### Late-War Implications

By week 80+, the main front lines are strips of devastated settlements. Fresh offensives must find routes *around* the damaged zones — through undamaged terrain where movement is faster and supply flows better. This creates the historical pattern of offensives along fresh axes rather than battering against established fronts.

### New State Field

```typescript
// Per-settlement cumulative battle damage [0.0, 1.0]
battle_damage: Record<SettlementId, number>;
```

### New Constants

```typescript
const BATTLE_DAMAGE_DIVISOR = 2000;           // Casualties needed per 1.0 damage point
const BATTLE_DAMAGE_MOVEMENT_PENALTY = 1;     // +1 transit turn per damaged settlement
const BATTLE_DAMAGE_SUPPLY_PENALTY = 0.3;     // Supply throughput × (1 - 0.3 × damage)
const BATTLE_DAMAGE_MILITIA_PENALTY = 1.0;    // Militia × (1 - damage)
const BATTLE_DAMAGE_DEFENDER_BONUS = 0.10;    // +10% defense at max damage
const BATTLE_DAMAGE_ATTACKER_PENALTY = 0.10;  // -10% attack at max damage
```

### Visual Representation

Battle-damaged settlements shown on the map with increasing visual degradation:
- 0.0-0.25: normal appearance
- 0.25-0.50: slight darkening, small damage indicator
- 0.50-0.75: visible destruction, scorched fill
- 0.75-1.0: wasteland appearance, heavy scorching

The staff map already uses terrain tinting — battle damage can overlay a desaturation + darkening filter on the settlement fill color, making war zones visually obvious.

---

## Fog of Frontage (Reconnaissance System)

### The Player Cannot See Enemy Brigade Positions

Under fog of war, the player can see enemy-controlled settlements (political control is visible from the map). But the player **cannot see which enemy settlements have brigade garrisons**. Every enemy settlement beyond the front looks the same — you don't know if it holds a fortress brigade, a militia garrison, or nothing.

### Revealing Enemy Positions

Enemy brigade presence is revealed through:

| Method | What It Reveals | Duration |
|--------|---------------|----------|
| **Battle** | Enemy formation ID, approximate strength category | Permanent (Tier 2 — once contacted, always known) |
| **Probe posture** | Whether target settlement has brigade garrison (yes/no) | Until next turn (probes are lightweight reconnaissance) |
| **Recon range** (faction-specific) | Brigade presence in settlements within recon range | Refreshed each turn (passive intelligence) |
| **Linked brigade sharing** | If a linked brigade has Tier 2 data, adjacent brigade sees it too | While linked |

### Faction-Asymmetric Reconnaissance

Each faction has a different **recon range** — the number of enemy settlements deep a deployed brigade can passively detect enemy brigade presence.

| Faction | Recon Range | Historical Basis |
|---------|------------|-----------------|
| **RBiH** | **2 settlements** | ARBiH invested heavily in elite reconnaissance platoons (*izviđačke čete*) — the famous recon companies of the 7th Muslim Brigade, 2nd Corps scouts, and platoon-level recon elements. This was ARBiH's primary asymmetric advantage, compensating for inferior equipment with superior battlefield intelligence. |
| **RS** | **1 settlement** | VRS inherited JNA doctrine emphasizing artillery and armored superiority over patrol reconnaissance. Intelligence came from signals intercept and forward observers, not infiltration. Line-of-sight range only. |
| **HRHB** | **1 settlement** | HVO had mixed capabilities, smaller force size limited dedicated recon assets. Croatian military advisors brought some doctrine but not the deep patrol tradition ARBiH developed from necessity. |

### Recon Range Mechanics

A deployed (not packing/transit/unpacking) brigade passively detects enemy brigade presence within `RECON_RANGE` settlements of its AoR:

```
For each AoR settlement of this brigade:
  BFS outward through enemy-controlled settlements up to RECON_RANGE depth
  For each reached enemy settlement:
    If enemy brigade has AoR here: mark as "brigade detected" (Tier 2)
    If no enemy brigade: mark as "no brigade detected"
```

**What recon reveals:**
- **"Brigade detected"**: enemy has a formation here (but not which formation, not exact strength)
- **"No brigade detected"**: no enemy formation here (could be militia or empty — militia presence is NOT revealed by recon)
- **Beyond recon range**: "Unknown" — no information

### Probe Posture as Active Reconnaissance

Any brigade can set `probe` posture to actively reconnoiter:
- Probe sends a lightweight attack against one adjacent enemy settlement
- If the settlement has a brigade: small skirmish, probe force takes light casualties, **reveals enemy formation ID and approximate strength**
- If the settlement has only militia: probe overruns militia easily, **reveals no brigade present**
- If the settlement is empty: probe walks in unopposed, **reveals empty**
- Probe does **not** flip the settlement — it's reconnaissance, not conquest
- Probe costs: 2-5% personnel casualties (light but not free)

Probe posture becomes a genuine tactical tool under this system. Before committing to a full attack with 2-3 brigades, you probe to find the gaps. This is how front lines were actually mapped in Bosnia.

### Strength Categories (Fog-Compatible)

When an enemy formation is revealed (through battle, probe, or recon), its strength is shown as a category, not an exact number:

| Category | Personnel Range | Display |
|----------|---------------|---------|
| **Weak** | < 400 | Single thin marker |
| **Moderate** | 400-800 | Standard marker |
| **Strong** | 800-1200 | Bold marker |
| **Fortress** | > 1200 | Heavy marker with fortification indicator |

> These categories align with AoR cap thresholds (400 personnel per settlement). A FORTRESS brigade can hold 4 settlements at full garrison; a WEAK brigade holds only 1. The warroom Reports modal uses these exact labels for enemy contact display.

The player never sees "RS 1st Krajina Brigade: 1,147 personnel." They see "Strong enemy formation detected at [settlement]." This preserves fog while giving actionable intelligence.

### RBiH Gameplay Implications

Playing as RBiH with recon range 2:
- You can see 2 settlements into enemy territory — you know where the RS brigade positions are AND where the gaps are
- You can identify weak points in the RS line before committing
- You can detect RS buildup for an offensive 1-2 turns before it hits
- But you still can't see RS rear areas (3+ settlements deep)
- Your inferior equipment means you see the gaps but often can't exploit them — the classic ARBiH dilemma

### RS Gameplay Implications

Playing as RS with recon range 1:
- You can only see the immediately adjacent enemy settlement
- You don't know what's behind the RBiH front line — reserves? empty? fortress?
- Your JNA equipment gives firepower superiority but you're punching blind
- Probing becomes essential: send a brigade to probe, learn the position, then commit the assault
- RS has the firepower to attack anywhere — but without reconnaissance, you might commit 3 brigades against a militia position (overkill) or 1 brigade against a fortress (disaster)

### Map Rendering Under Fog

| Settlement State | Player View (own) | Player View (enemy) |
|-----------------|------------------|---------------------|
| Own brigade AoR | Full marker with personnel | N/A |
| Own militia garrison | Militia indicator | N/A |
| Own empty | Empty (visible gap) | N/A |
| Enemy — brigade detected | N/A | Strength category marker + battalion arc |
| Enemy — no brigade detected | N/A | Settlement shown as controlled, no garrison marker |
| Enemy — unknown (beyond recon) | N/A | Settlement shown as controlled, "?" or fog overlay |

### Battalion Defensive Arc Marker

When an enemy brigade position is detected (via battle, probe, or recon), it's shown on the map with the **battalion defensive position symbol**: a half-circle arc with teeth/notches facing toward the nearest friendly settlement. This is the standard military symbol for a prepared defensive position.

**Rendering:**
- Arc centered on the enemy settlement
- Teeth point toward the nearest player-controlled settlement (the threat direction)
- Arc thickness indicates strength category (thin = weak, thick = fortress)
- Arc color = enemy faction color
- Multiple arcs if the settlement faces multiple directions

**For player's own brigades:** same arc symbol but facing outward toward enemy territory. Each AoR settlement gets a defensive arc facing the adjacent enemy settlement(s). This gives the player an immediate visual read of "where are my positions pointing."

### New State Fields

```typescript
// Fog of war intelligence per faction
recon_intelligence: Record<FactionId, ReconIntelligence>;

interface ReconIntelligence {
  // Settlements where enemy brigade presence is known
  detected_brigades: Record<SettlementId, DetectedBrigadeInfo>;
  // Settlements confirmed empty (no brigade, may have militia)
  confirmed_empty: Set<SettlementId>;  // stored as sorted array for determinism
  // Turn when each detection was made (for staleness)
  detection_turn: Record<SettlementId, number>;
}

interface DetectedBrigadeInfo {
  formation_id?: FormationId;        // Known if identified through battle
  strength_category: 'weak' | 'moderate' | 'strong' | 'fortress';
  detected_turn: number;
  detected_via: 'battle' | 'probe' | 'recon' | 'linked';
}
```

### Intelligence Staleness

Detected positions go stale if not refreshed:
- **Battle-detected**: permanent (Tier 2 — combat is definitive proof)
- **Probe-detected**: stale after 2 turns (enemy may have moved)
- **Recon-detected**: refreshed every turn while brigade is deployed and in range
- **Linked-shared**: refreshed while link is active

Stale detections shown on map with a fading indicator — the player sees "we knew something was here 3 turns ago but haven't confirmed since."

### New Constants

```typescript
// Recon
const RECON_RANGE_RBIH = 2;              // ARBiH: 2 settlements deep
const RECON_RANGE_RS = 1;                // VRS: 1 settlement (line of sight)
const RECON_RANGE_HRHB = 1;             // HVO: 1 settlement
const PROBE_CASUALTY_RATE = 0.03;       // 3% personnel lost on probe
const RECON_STALENESS_TURNS = 2;         // Probe/linked detections go stale after 2 turns

// Terrain battle width
const BATTLE_WIDTH_PLAINS = 3;
const BATTLE_WIDTH_HILLS = 2;
const BATTLE_WIDTH_MOUNTAIN = 1;
const BATTLE_WIDTH_URBAN = 2;
const BATTLE_WIDTH_RIVER = 1;
const HILL_SLOPE_THRESHOLD = 15;         // degrees — above this, hills terrain
const MOUNTAIN_SLOPE_THRESHOLD = 25;     // degrees — above this, mountain terrain
```

---

## Determinism

All new systems must maintain determinism:
- AoR assignment: sorted by settlement ID, brigade ID for tie-breaking
- Movement pathfinding: deterministic shortest path (BFS with sorted neighbor iteration)
- Militia garrison: derived from sorted municipality/settlement iteration
- Multi-brigade attack: resolved in sorted brigade ID order
- Linking detection: sorted pairs
- No `Math.random()`, no timestamps, no unsorted iteration


---

## Cross-References

- **Warroom integration**: When this redesign is implemented, update the warroom modals per `docs/plans/2026-02-18-warroom-war-phase-modals-design.md § Brigade AoR Redesign Cross-Impact Summary`
- **New state fields exposed to warroom**: `brigade_movement_state`, `militia_garrison`, `recon_intelligence`, `battle_damage`
- **Warroom implementation order**: Brigade AoR redesign (Phases A-L) must complete before warroom brigade-specific features are implemented — the warroom reads these state fields, it does not define them