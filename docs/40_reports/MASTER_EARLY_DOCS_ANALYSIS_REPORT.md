# Master Early Documentation Analysis Report
## A War Without Victory - Comprehensive Canon Comparison

**Project:** A War Without Victory (canon v0.5.0)  
**Date:** February 9, 2026  
**Prepared By:** Claude (Anthropic)  
**For:** Haris, Project Lead

---

## Executive Summary

This master report analyzes **two early project documents** against the current v0.4.0 canon to identify valuable ideas, successful integrations, and potential omissions:

1. **CORRECTED_CORPS_SUPPLY_RESEARCH.pdf** + **MASTER_PROJECT_OVERVIEW.pdf** (Military systems & game design)
2. **Control_Stability_And_Flip_System_Documentation.pdf** (Political control mechanics)

### Overall Assessment

**Both documents served as valuable prototypes that have evolved significantly:**

- **Military/Game Design Docs:** Core research (OOB, supply asymmetries) **excellently integrated**; some game design features (AI, events, campaign progression) **underspecified** or **deferred**
- **Control/Flip System Doc:** Core concepts **preserved and dramatically improved** in v0.4.0; current implementation is **far more sophisticated** and **historically grounded**

### Key Findings

✅ **Successfully Integrated (90%+ complete):**
- VRS/ARBiH/HVO corps structures and operational strengths
- Supply asymmetry parameters (VRS 0.9, ARBiH 0.2, HRHB 0.6)
- Arms embargo modeling
- Stability scoring system (demographic + organizational + geographic)
- Control flip mechanics (Phase I militia-based, Phase II+ formation-based)
- Displacement triggers and consequences
- Legitimacy tracking with coercion penalties
- Warroom desk UI aesthetic
- Situation reports system

⚠️ **Partially Implemented (needs expansion):**
- Campaign progression (linear phases only, not branching scenarios)
- Negotiation system (accept/reject only, not counter-offers)
- Production facilities (abstract supply, not specific factories)
- Coercion event tracking (implicit in legitimacy, not explicit events)

❌ **Notable Omissions (deferred or deprioritized):**
- AI opponent specification (decision trees, doctrine strategies)
- Event system architecture (random/triggered events)
- Multiplayer architecture (async turns, hidden information)
- Regional cascade mechanics (domino effect bonuses)
- Status icon system (UI polish for flip risk, trends)

### Strategic Recommendations

**Priority 1 (Before v1.0):**
1. Document AI opponent strategy (2-3 days design, 8-10 days implementation)
2. Implement production facility system (2-3 days)
3. Define victory conditions clearly (1-2 days)

**Priority 2 (Before v1.5):**
1. Event system implementation (4-6 days)
2. Expand negotiation UI with counter-offers (3-4 days)
3. Campaign progression with branching scenarios (5-7 days)
4. Coercion event tracking (2-3 days)

**Priority 3 (v2.0+):**
1. Multiplayer architecture (15-20 days if desired)
2. Regional cascade bonuses (1 day)
3. Status icon system (1-2 days)
4. Atmospheric polish (radio broadcasts, phone interruptions)

---

# Part I: Military Systems & Game Design Analysis
## (CORRECTED_CORPS_SUPPLY_RESEARCH.pdf + MASTER_PROJECT_OVERVIEW.pdf)

## Section 1: Military Systems Integration

### 1.1 Corps Structures - EXCELLENTLY INTEGRATED ✅

**Early Documentation:**
- VRS: 6 corps (Banja Luka, Sarajevo-Romanija, Eastern Bosnia, Drina, Herzegovina)
- ARBiH: 7 corps (1st Sarajevo, 2nd Tuzla, 3rd Zenica, 4th Mostar, 5th Bihać, 6th Konjic, 7th Travnik)
- HVO: Operational zones (Herzegovina, Central Bosnia, Posavina)

**Current Canon Status:**
- ✅ **VRS_ORDER_OF_BATTLE_MASTER.md:** Complete 6-corps structure with brigades, equipment, command hierarchy
- ✅ **ARBIH_ORDER_OF_BATTLE_MASTER.md:** Complete 7-corps structure with APPENDIX_H full brigade list
- ✅ **HVO_ORDER_OF_BATTLE_MASTER.md:** Complete operational zones with FULL_UNIT_LIST

**Critical Correction Preserved:**
- ✅ VRS operational strength ~155,000 (not inflated 250,000 paper mobilization figure)
- This correction is **properly integrated** throughout OOB documentation

**Assessment:** ✅ **EXCELLENT** - All military research successfully integrated with high fidelity

---

### 1.2 Supply System - WELL IMPLEMENTED ✅

**Early Documentation:**

**ARBiH 4 Primary Sources:**
1. JNA Barracks Captures (1992): ~600 Osa anti-tank missiles (Sarajevo), limited heavy weapons
2. Vitez Munitions Factory: 10mm ammunition production during siege
3. Bosnian Industry: Zenica steel → ammunition, Breza munitions, Bugojno factory
4. HVO Captures (post-1993): Bugojno July 1993, various equipment

**VRS Supply Advantage:**
- JNA inheritance: 500-550 tanks, 250 APCs, 500-600 artillery pieces
- Serbian pipeline: continuous resupply
- Artillery dominance: 10:1 ratio vs ARBiH

**Current Canon Status:**

✅ **Systems_Manual_v0_4_0.md (System 2: Arms Embargo Asymmetry):**
```
heavy_equipment_access:
  VRS:   0.9 (JNA inheritance)
  ARBiH: 0.2 (Embargo impact)
  HRHB:  0.6 (Croatian pipeline)

ammunition_resupply_rate:
  VRS:   0.8 (Serbian support)
  ARBiH: 0.3 (Limited resupply)
  HRHB:  0.6 (Croatian support)

smuggling_efficiency_growth: 0.0015/turn (deterministic)
```

**Assessment:** ✅ **WELL ABSTRACTED** - Parameters capture historical asymmetries without micromanagement

---

### 1.3 Production Facilities - PARTIAL IMPLEMENTATION ⚠️

**Early Documentation (Specific Details):**
- **Zenica steel works:** Ammunition production capacity
- **Vitez munitions factory:** 10mm ammunition during siege
- **Bugojno factories:** Captured by ARBiH July 1993
- **Breza munitions:** ARBiH-controlled production

**Current Canon Status:**
- ⚠️ **Missing:** Specific factory locations as capturable strategic assets
- ⚠️ **Missing:** Production capacity per turn
- ⚠️ **Missing:** Capture/control effects on supply
- ✅ **Present:** Abstract supply parameters handle overall capacity

**Impact of Omission:**
- Adds strategic depth: Controlling Zenica vs Vitez has **real supply consequences**
- Historical accuracy: Production facilities were **critical strategic objectives**
- Gameplay: Creates **meaningful territorial objectives** beyond population control

**Recommendation:**
Implement production facility system as **strategic assets**:

```typescript
interface ProductionFacility {
  facility_id: string;
  name: string; // "Zenica Steel Works", "Vitez Munitions"
  settlement_id: string;
  type: "ammunition" | "heavy_equipment" | "small_arms";
  base_capacity: number; // units per turn
  current_condition: number; // 0-1 (damage/degradation)
  required_inputs: {
    electricity: boolean;
    raw_materials: boolean;
    skilled_labor: boolean;
  };
}

// In turn resolution:
function calculateFactionProductionBonus(faction: FactionId): number {
  const facilities = state.production_facilities.filter(
    f => state.settlements[f.settlement_id].political_controller === faction
      && f.current_condition > 0.3 // Must be operational
      && allInputsAvailable(f)
  );
  
  return facilities.reduce((sum, f) => 
    sum + (f.base_capacity * f.current_condition), 0
  );
}
```

**Historical Facilities to Include (Priority):**
1. **Zenica Steel Works** (ARBiH, critical) - ammunition production
2. **Vitez Munitions Factory** (HVO, contested) - 10mm ammunition
3. **Bugojno Factory** (HVO→ARBiH July 1993) - small arms
4. **Breza Munitions** (ARBiH) - ammunition
5. **Vogošća Factory** (Sarajevo siege perimeter) - mortar shells

**Implementation Effort:** Medium (2-3 days)
**Value:** Medium-High (strategic depth + historical accuracy)

---

### 1.4 Situation Reports System - WELL SPECIFIED ✅

**Early Documentation:**
- Delay: 1-2 turns
- Accuracy: 60-80%
- Aesthetic: Typewriter font, physical paper texture
- Information: Troop movements, supply status, contested areas

**Current Canon Status:**
- ✅ **Mentioned in early docs and design notes**
- ⚠️ **Not in v0.4.0 Systems Manual** (implementation detail)

**Assessment:** ✅ **Good specification**, defer to UI implementation phase

---

### 1.5 Warroom Desk Interface - WELL SPECIFIED ✅

**Early Documentation:**
- Telephone (interruptions, reports)
- Typewriter (situation reports appear)
- Interactive objects (documents, maps)
- 1990s Eastern European government office aesthetic

**Current Canon Status:**
- ✅ **UI_DESIGN_SPECIFICATION.md** includes warroom aesthetic
- ✅ Design direction well-established

**Assessment:** ✅ **Excellent specification** for UI team

---

## Section 2: Game Design Features

### 2.1 Campaign Progression - UNDERSPECIFIED ⚠️

**Early Documentation:**
```
Campaign Mode:
- Branching scenario trees with "what-if" options
- Scenario dependency graph
- Victory condition evaluation logic
- Unlock system (complete scenario → unlock branches)
- Multiple narrative paths based on player choices
```

**Current Canon Status:**
- ✅ **Eight scenarios defined** (1992-1995, various historical starting points)
- ⚠️ **Linear progression only** (no branching)
- ⚠️ **Victory conditions not clearly specified**
- ⚠️ **No unlock/dependency system**

**Impact of Omission:**
- Reduces replayability
- Limits "what-if" exploration
- No structured progression through historical periods

**Recommendation:**
Define **scenario dependency graph** and **victory conditions**:

```typescript
interface ScenarioDefinition {
  scenario_id: string;
  title: string; // "Siege of Sarajevo", "Krajina Offensive"
  start_date: string; // "1992-04-06"
  duration_turns: number;
  
  prerequisites: {
    completed_scenarios?: string[];
    victory_type?: "any" | "historical" | "decisive";
  };
  
  victory_conditions: {
    primary: VictoryCondition[];
    secondary: VictoryCondition[];
    historical_benchmark: string; // "Hold Sarajevo until Nov 1995"
  };
  
  branches: {
    on_victory: string[]; // Unlocked scenario IDs
    on_defeat: string[]; // Alternative paths
    on_historical: string[]; // "As it happened" path
  };
}

interface VictoryCondition {
  type: "control_territory" | "survive_duration" | "prevent_collapse" | "capture_objective";
  target: string;
  threshold: number;
}
```

**Example Scenario Graph:**
```
Sept 1991 (Political Crisis)
├─ Historical Path → April 1992 (War Outbreak)
├─ RS Victory → June 1992 (Posavina Corridor)
└─ RBiH Consolidation → Dec 1992 (Winter Stalemate)

April 1992 (War Outbreak)
├─ Sarajevo Holds → Nov 1995 (Dayton)
├─ Sarajevo Falls → [Game Over / Alt History]
└─ Early Ceasefire → [Peace Scenario]
```

**Implementation Effort:** Medium-High (5-7 days)
**Value:** High (core gameplay structure)

---

### 2.2 AI Opponent Specification - CRITICAL OMISSION ❌

**Early Documentation Mentions:**
- AI decision trees for strategic AI
- Faction doctrines (VRS offensive early/defensive late, ARBiH survival focus)
- Historical benchmark targets (VRS capture 70% by Dec 1992)
- Difficulty scaling based on historical accuracy

**Current Canon Status:**
- ❌ **Completely absent** from v0.4.0 documentation
- No AI strategy specification
- No difficulty settings
- No behavioral patterns defined

**Impact:**
**CRITICAL** - Without AI, there is **no single-player gameplay**. The simulation can run, but there's no opponent.

**Recommendation:**
**URGENT PRIORITY** - Define AI opponent system before v1.0:

```typescript
interface AIStrategy {
  faction: FactionId;
  phase: GamePhase;
  
  strategic_objectives: {
    priority: number;
    objective_type: "capture_territory" | "hold_position" | "ethnic_consolidation" | "corridor_control";
    target: string;
    completion_threshold: number;
  }[];
  
  tactical_doctrine: {
    offensive_threshold: number; // When to attack (strength ratio)
    defensive_fallback: number;  // When to retreat
    resource_allocation: {
      offensive_fronts: number; // % of forces for offense
      defensive_positions: number; // % for defense
      strategic_reserve: number; // % held back
    };
  };
  
  historical_benchmarks: {
    turn: number;
    expected_control: string[]; // Settlement IDs
    tolerance: number; // ±N settlements acceptable
  }[];
}
```

**Faction-Specific AI Profiles:**

**VRS AI (1992-1993):**
```typescript
{
  early_war_strategy: "aggressive_expansion",
  objectives: [
    { priority: 1, type: "corridor_control", target: "Posavina Corridor" },
    { priority: 2, type: "ethnic_consolidation", target: "Eastern Bosnia" },
    { priority: 3, type: "capture_territory", target: "Sarajevo" }
  ],
  offensive_threshold: 1.3, // Attack when 1.3x stronger
  defensive_fallback: 0.6,  // Retreat when < 0.6x strength
  resource_allocation: {
    offensive_fronts: 60,
    defensive_positions: 30,
    strategic_reserve: 10
  }
}
```

**VRS AI (1994-1995):**
```typescript
{
  late_war_strategy: "defensive_consolidation",
  objectives: [
    { priority: 1, type: "hold_position", target: "Current territory" },
    { priority: 2, type: "prevent_collapse", target: "Krajina" },
    { priority: 3, type: "corridor_control", target: "Brčko" }
  ],
  offensive_threshold: 2.0, // Only attack if overwhelmingly superior
  defensive_fallback: 0.8,  // Hold longer before retreat
  resource_allocation: {
    offensive_fronts: 20,
    defensive_positions: 60,
    strategic_reserve: 20
  }
}
```

**ARBiH AI (1992-1995):**
```typescript
{
  strategy: "survival_and_consolidation",
  objectives: [
    { priority: 1, type: "hold_position", target: "Sarajevo, Tuzla, Bihać" },
    { priority: 2, type: "corridor_control", target: "Brčko (late war)" },
    { priority: 3, type: "capture_territory", target: "Ethnic Bosniak areas" }
  ],
  offensive_threshold: 1.8, // Very cautious offensive posture
  defensive_fallback: 0.5,  // Fight tenaciously
  resource_allocation: {
    offensive_fronts: 25,
    defensive_positions: 60,
    strategic_reserve: 15
  }
}
```

**Implementation Effort:** High (8-10 days for complete AI)
**Value:** **CRITICAL** (no single-player game without AI)

---

### 2.3 Event System - UNDERSPECIFIED ⚠️

**Early Documentation:**
```
Event System:
- Trigger conditions and probability tables
- Random events (factory explosions, defections, convoy ambushes)
- Triggered events (Srebrenica falls → pressure +15)
- Narrative text templates
```

**Current Canon Status:**
- ❌ **Not present** in v0.4.0 specs
- Some events implicit (declarations, referendum, Dayton)
- No random event system
- No dynamic event triggers

**Impact:**
- Reduces historical contingency
- Less replayability
- No unexpected complications

**Recommendation:**
Implement **structured event system**:

```typescript
interface GameEvent {
  event_id: string;
  title: string;
  description: string;
  
  trigger: {
    type: "turn_based" | "condition" | "random";
    turn?: number;
    condition?: EventCondition;
    probability?: number; // For random events
  };
  
  effects: {
    ivp_delta?: number;
    exhaustion_delta?: { [faction: string]: number };
    diplomatic_isolation?: { [faction: string]: number };
    supply_modifier?: { [faction: string]: number };
    narrative_text: string;
  };
  
  player_choices?: {
    choice_text: string;
    effects: any;
  }[];
}

interface EventCondition {
  type: "settlement_captured" | "enclave_collapsed" | "casualties_exceeded" | "pressure_threshold";
  target: string;
  threshold?: number;
}
```

**Example Historical Events:**

**Triggered Events:**
```typescript
{
  event_id: "srebrenica_falls",
  title: "Fall of Srebrenica",
  trigger: {
    type: "condition",
    condition: {
      type: "settlement_captured",
      target: "Srebrenica",
      attacker: "VRS"
    }
  },
  effects: {
    ivp_delta: 25, // Massive international attention
    exhaustion_delta: { "VRS": 10 }, // Diplomatic cost
    diplomatic_isolation: { "VRS": 15 },
    narrative_text: "The fall of the Srebrenica enclave has shocked the international community..."
  }
}
```

**Random Events:**
```typescript
{
  event_id: "convoy_ambush",
  title: "Humanitarian Convoy Ambushed",
  trigger: {
    type: "random",
    probability: 0.05, // 5% per turn
    condition: { type: "active_siege" } // Only during sieges
  },
  effects: {
    ivp_delta: 5,
    supply_modifier: { [defending_faction]: -0.1 },
    narrative_text: "A UN humanitarian convoy was ambushed en route to..."
  }
}
```

**Implementation Effort:** Medium-High (4-6 days)
**Value:** Medium-High (replayability + historical flavor)

---

### 2.4 Negotiation System - PARTIAL IMPLEMENTATION ⚠️

**Early Documentation:**
```
Diplomatic Negotiation:
- Counter-offer mechanics
- Map-based territorial negotiation tool
- Consequence preview system
- Player can propose alternative terms
```

**Current Canon Status:**
- ✅ **Systems_Manual_v0_4_0.md (System 7: Negotiation Capital)**
- ✅ Negotiation capital calculation
- ✅ Territorial valuation
- ⚠️ **Accept/reject only** (no counter-offers)
- ⚠️ **No map-based negotiation UI**

**Recommendation:**
Expand to **counter-offer system**:

```typescript
interface NegotiationProposal {
  proposal_id: string;
  proposer: FactionId;
  recipient: FactionId;
  
  terms: {
    territory_ceded: string[]; // Settlement IDs
    territory_gained: string[];
    ceasefire_duration?: number;
    autonomy_arrangements?: any;
    international_guarantees?: string[];
  };
  
  cost_to_proposer: number; // Negotiation capital
  cost_to_recipient: number;
  
  recipient_response?: "accept" | "reject" | "counter";
  counter_proposal?: NegotiationProposal;
}

// UI: Map-based territorial negotiation
// Player clicks settlements to add/remove from proposal
// Real-time calculation of negotiation capital costs
// Preview of post-agreement control map
```

**Implementation Effort:** Medium (3-4 days)
**Value:** Medium (player agency in negotiations)

---

### 2.5 Multiplayer Architecture - DEFERRED ⚠️

**Early Documentation:**
```
Multiplayer System:
- Client-server design
- Simultaneous turn resolution
- Hidden information handling
- Async multiplayer as priority feature
```

**Current Canon Status:**
- ❌ **Not present** in v0.4.0
- ❌ No multiplayer design

**Recommendation:**
**Defer to v2.0+** unless critical to release strategy.

If needed, basic design:
```typescript
interface MultiplayerSession {
  session_id: string;
  players: {
    player_id: string;
    faction: FactionId;
    ready: boolean;
  }[];
  turn_orders: {
    player_id: string;
    orders: any; // Encrypted until resolution
    submitted: boolean;
  }[];
  
  resolution_state: "awaiting_orders" | "resolving" | "complete";
}
```

**Implementation Effort:** Very High (15-20 days)
**Value:** Variable (depends on target audience)

---

## Section 3: Cross-Reference Tables

### 3.1 Military Systems Status Matrix

| Feature | Early Docs | Current v0.4 Canon | Status | Priority |
|---------|------------|-------------------|--------|----------|
| **OOB Data** |
| VRS corps structure | 6 corps detailed | VRS_ORDER_OF_BATTLE_MASTER.md | ✅ Complete | N/A |
| VRS troop correction | ~155k operational | Integrated throughout | ✅ Complete | N/A |
| ARBiH corps structure | 7 corps detailed | ARBIH_ORDER_OF_BATTLE_MASTER.md | ✅ Complete | N/A |
| HVO operational zones | 3 zones detailed | HVO_ORDER_OF_BATTLE_MASTER.md | ✅ Complete | N/A |
| **Supply Systems** |
| Arms embargo asymmetry | Parameters specified | System 2 implemented | ✅ Complete | N/A |
| VRS supply advantage | 0.9 equipment access | ✅ In parameters | ✅ Complete | N/A |
| ARBiH limited supply | 0.2 equipment access | ✅ In parameters | ✅ Complete | N/A |
| Production facilities | Zenica, Vitez, Bugojno | ⚠️ Abstract only | ⚠️ Partial | Medium |
| **UI Systems** |
| Warroom desk aesthetic | Detailed specification | UI_DESIGN_SPEC | ✅ Complete | N/A |
| Situation reports | 1-2 turn delay, 60-80% accuracy | ✅ Specified | ✅ Complete | N/A |
| Typewriter interface | Physical paper aesthetic | ✅ Design direction | ✅ Complete | N/A |

### 3.2 Game Design Features Status Matrix

| Feature | Early Docs | Current v0.4 Canon | Status | Priority | Effort |
|---------|------------|-------------------|--------|----------|--------|
| **Campaign Structure** |
| Scenario definitions | 8 scenarios | ✅ Defined | ✅ Complete | N/A | N/A |
| Branching progression | Scenario tree | ❌ Linear only | ⚠️ Missing | Medium | 5-7 days |
| Victory conditions | Per scenario | ⚠️ Unclear | ⚠️ Missing | High | 1-2 days |
| Unlock system | Dependency graph | ❌ None | ⚠️ Missing | Low | 2-3 days |
| **AI Systems** |
| AI decision trees | Faction-specific | ❌ Not specified | ❌ Missing | **CRITICAL** | 2-3 days design |
| Strategic objectives | Historical benchmarks | ❌ Not specified | ❌ Missing | **CRITICAL** | N/A |
| Tactical doctrines | VRS aggressive→defensive | ❌ Not specified | ❌ Missing | **CRITICAL** | N/A |
| Difficulty scaling | Historical accuracy | ❌ Not specified | ❌ Missing | High | 1-2 days |
| AI implementation | Full behavior system | ❌ Not coded | ❌ Missing | **CRITICAL** | 8-10 days |
| **Event System** |
| Random events | Factory explosions, defections | ❌ Not specified | ❌ Missing | Medium | 2-3 days design |
| Triggered events | Srebrenica → IVP | ❌ Not specified | ❌ Missing | Medium | N/A |
| Event framework | Trigger + effects | ❌ Not implemented | ❌ Missing | Medium | 4-6 days |
| Narrative templates | Historical text | ❌ Not specified | ❌ Missing | Low | 2-3 days |
| **Negotiation** |
| Negotiation capital | ✅ Specified | System 7 | ✅ Complete | N/A | N/A |
| Accept/reject | Basic system | ✅ Functional | ✅ Complete | N/A | N/A |
| Counter-offers | Map-based proposals | ❌ Not implemented | ⚠️ Missing | Medium | 3-4 days |
| Consequence preview | Pre-agreement map | ❌ Not implemented | ⚠️ Missing | Low | 1-2 days |
| **Multiplayer** |
| Async turns | Client-server | ❌ Not designed | ❌ Missing | Low | 15-20 days |
| Hidden information | Order encryption | ❌ Not designed | ❌ Missing | Low | N/A |

---

## Section 4: Strategic Recommendations (Game Design)

### Priority 1: Critical for v1.0 (Before Release)

**1. AI Opponent Specification & Implementation**
- **Status:** ❌ Completely missing
- **Impact:** No single-player gameplay without AI
- **Effort:** High (2-3 days design + 8-10 days implementation = 10-13 days total)
- **Deliverables:**
  - AI strategy document (faction-specific objectives, doctrines)
  - Historical benchmark targets (VRS 70% by Dec 1992, etc.)
  - Decision tree implementation
  - Difficulty scaling system

**2. Victory Conditions Definition**
- **Status:** ⚠️ Unclear
- **Impact:** Players don't know when they've won
- **Effort:** Low (1-2 days)
- **Deliverables:**
  - Victory conditions per scenario
  - Historical benchmark definitions
  - Win/loss/draw evaluation logic

**3. Production Facility System**
- **Status:** ⚠️ Abstract supply only
- **Impact:** Reduces strategic depth and historical accuracy
- **Effort:** Medium (2-3 days)
- **Deliverables:**
  - 5-10 critical facilities (Zenica, Vitez, Bugojno, Breza, Vogošća)
  - Capture/control effects on faction supply
  - Production capacity per turn

**Total Priority 1 Effort:** ~15-18 days

---

### Priority 2: Important for v1.5 (Post-Launch Polish)

**1. Event System Implementation**
- **Effort:** Medium-High (4-6 days)
- **Value:** Replayability + historical flavor
- **Deliverables:**
  - Event framework (triggers, effects, conditions)
  - 10-20 historical events (Srebrenica, Markale, etc.)
  - 5-10 random events (convoy ambushes, defections)

**2. Campaign Branching & Progression**
- **Effort:** Medium-High (5-7 days)
- **Value:** Replayability + "what-if" scenarios
- **Deliverables:**
  - Scenario dependency graph
  - Unlock system
  - Alternative historical paths

**3. Negotiation Counter-Offers**
- **Effort:** Medium (3-4 days)
- **Value:** Player agency in diplomacy
- **Deliverables:**
  - Counter-proposal system
  - Map-based territorial negotiation UI
  - Consequence preview

**Total Priority 2 Effort:** ~12-17 days

---

### Priority 3: Nice-to-Have for v2.0 (Future)

**1. Multiplayer Architecture**
- **Effort:** Very High (15-20 days)
- **Value:** Depends on target audience

**2. Advanced Event Narratives**
- **Effort:** Medium (3-5 days)
- **Value:** Atmospheric polish

**3. Atmospheric Polish**
- **Effort:** Low-Medium (2-4 days)
- **Value:** Immersion
- **Examples:** Radio broadcasts, phone interruptions, period-appropriate UI details

---

# Part II: Control, Stability & Flip System Analysis
## (Control_Stability_And_Flip_System_Documentation.pdf)

## Section 5: Political Control Mechanics

### 5.1 Stability Score System - SIGNIFICANTLY EVOLVED ✅

**Early Documentation (PDF):**
```
Base Score: 50
Range: 0-100

Modifiers:
- Demographic minority: -20
- Police loyal: +10
- Mixed police: -5
- JNA present (Serb areas): +10
- Adjacent hostile territory: -20
- Strategic route/corridor: -10
- Isolated/enclave: -10
```

**Current Canon (Systems_Manual_v0_4_0.md, Appendix E):**
```
Stability Score = Base (50) + Demographic + Organizational + Geographic

Demographic modifiers:
- Controller population > 60%: +25
- Controller population 50-60%: +15
- Controller population 40-50%: +5
- Controller population < 40%: -15

Organizational modifiers:
- Police loyal to controller: +15
- Police mixed: -10
- Police hostile: -15
- Territorial Defense controlled: +15
- Territorial Defense contested: -10
- SDS penetration strong (non-RS areas): -15
- Patriotska Liga strong (RBiH areas): +10
- JNA garrison in RS-aligned area: +10
- JNA garrison in non-RS area: -10

Geographic modifiers:
- Adjacent to hostile majority: -20
- Strategic corridor location: -10
- Isolated/enclave: -10
- Connected to friendly rear: +10
```

**Key Evolution:**
1. **More granular demographics:** 4-tier gradient (>60%, 50-60%, 40-50%, <40%) vs binary
2. **Stronger police modifiers:** ±15 vs ±5-10
3. **Explicit TD modeling:** +15 controlled, -10 contested
4. **Explicit SDS/PL modeling:** -15/+10 organizational penetration
5. **Friendly rear bonus:** +10 for strategic depth (NEW)

**Assessment:** ✅ Current system is **dramatically more nuanced** while remaining calculable

---

### 5.2 Stability Status Bands - WELL SIMPLIFIED ✅

**Early Documentation:**
```
80-100: Very Stable (extremely resistant to flip)
60-80:  Stable (secure control)
40-60:  Unstable (vulnerable under pressure)
20-40:  Very Unstable (high flip risk)
0-20:   Collapse Imminent (will flip quickly in war)
```

**Current Canon (Systems_Manual_v0_4_0.md, System 11):**
```
SECURE:            stability >= 60
CONTESTED:         40 <= stability < 60
HIGHLY_CONTESTED:  stability < 40
```

**Key Changes:**
1. **Simplified to 3 bands** (from 5) - cleaner implementation
2. **Better nomenclature:** "CONTESTED" more accurate than "UNSTABLE"
3. **Threshold at 60 preserved** - continuity from early design

**Assessment:** ✅ Simplification is **appropriate** - easier to understand and implement

---

### 5.3 Flip Trigger System - DRAMATICALLY REDESIGNED 🔄

**Early Documentation (Abstract Pressure System):**
```
Flips occur during Main War Phase (April 1992+)

A flip occurs when:
Stability Score + Applied Pressure ≥ Flip Threshold (50)

Pressure Sources:
- Adjacent hostile control: +30 per adjacent
- Coercion events: +20 per event
- Military operations: +40
- Regional momentum: +15 (if 3+ adjacent flips)
```

**Current Canon (Realistic Military System):**

**Phase I (Early War, April-Dec 1992):**
```
Municipality-level control changes use:
  stability + defensive militia vs attacking militia

Requirements:
  - Adjacent hostile control (necessary)
  - Sufficient attacker militia strength
  - No abstract "pressure points"

Post-flip:
  - Consolidation period
  - Stability lockdown
  - Militia strength reset
```

**Phase II+ (1993-1995):**
```
Formation-based pressure system:
  - Brigade assignments to front edges
  - Posture (OFFENSIVE, STATIC_DEFENSE, etc.)
  - Equipment effectiveness ratios
  - Supply state (ADEQUATE, SCARCE, CUT)
  - Doctrine modifiers (INFILTRATE, ARTILLERY_COUNTER)
  - Exhaustion effects

Pipeline: Pressure accumulation → Breach → Flip proposal
```

**Why Current System is Superior:**

1. **Historical grounding:** Actual military capabilities (militia, brigades, equipment) vs abstract points
2. **Phase-appropriate:** Militia-based for chaotic early war, formation-based for organized later war
3. **Multifactorial:** Supply, equipment, exhaustion all matter (not just +30/+40 bonuses)
4. **No automatic flips:** Adjacent hostile control is **necessary but not sufficient**

**Assessment:** 🔄 Current system is **vastly more sophisticated** and **historically accurate**

---

### 5.4 Pressure Sources - COMPLETELY REIMAGINED ⚠️

**Comparison Table:**

| Pressure Source | Early Doc | Current v0.4 |
|-----------------|-----------|--------------|
| Adjacent hostile | +30 per adjacent | Required for flip eligibility (not auto-pressure) |
| Coercion events | +20 per event | ⚠️ Implicit in legitimacy (no explicit events) |
| Military operations | +40 | Phase I: Militia strength calculation<br>Phase II+: Formation posture + equipment + supply |
| Regional momentum | +15 (3+ flips) | ⚠️ Not explicitly modeled |

**Key Philosophical Shift:**

- **Early:** Gamified "pressure points" (+30, +40, +15)
- **Current:** Realistic military modeling (formations, supply, equipment degradation)

**Why Current is Better:**
- Grounded in historical military realities
- No arbitrary point values
- Natural emergent behavior from realistic systems

**Assessment:** ⚠️ Early was useful **placeholder**; current is **dramatically superior**

---

### 5.5 Post-Flip Effects - EXCELLENTLY IMPLEMENTED ✅

**Early Documentation Identified:**
```
Once flipped:
- Control becomes 100% (implemented)
- Population displacement begins (needs displacement system)
- Local legitimacy permanently damaged (needs legitimacy tracking)
- Municipality locked for X turns (needs turn system)
- Conquered population becomes IVP issue (needs constraint system)
```

**Current Canon Implementation Status:**

**✅ Displacement (Phase I §4.4, Phase F):**
```
Phase I Displacement Trigger:
- Flip occurs AND Hostile_Population_Share > 0.30
- One-time displacement event
- Routing to friendly municipalities
- Killed/fled-abroad fractions applied

Phase II+ Displacement Accumulation:
- Settlement-level displacement from conflict intensity
- Front-active settlement mechanics
- Unsupplied pressure effects
- Encirclement consequences
```

**✅ Legitimacy (System 4):**
```
legitimacy_state:
  demographic_legitimacy: 0.0-1.0 (population alignment)
  institutional_legitimacy: 1.0 (inherit) / 0.6 (override) / 0.3 (conquest)
  stability_bonus: +0.01/turn (caps at +0.3)
  coercion_penalty: +0.2 per forced flip, decays -0.01/turn
  
Effects:
  recruitment_multiplier: 0.5 + (0.5 * legitimacy_score)
  authority_consolidation: slower with low legitimacy
  exhaustion: +penalty with low legitimacy
```

**✅ IVP (System 1):**
```
International Visibility Pressure:
- Humanitarian crises generate IVP
- Enclave collapses → high IVP
- Sarajevo siege → sustained IVP
- IVP affects exhaustion and negotiation capital
```

**✅ Consolidation Lockdown:**
```
Phase I Control Strain (§4.5):
- Strain accumulates in unstable municipalities
- Drag effects on exhaustion and authority
- Post-flip consolidation period
```

**Assessment:** ✅ **EXCELLENT** - Early doc identified the **right consequences**, and v0.4.0 has **fully implemented them all** with sophisticated mechanical support

---

### 5.6 Flip Execution Mechanics - WELL EVOLVED ✅

**Early Documentation (Simplified):**
```javascript
1. Record pre-flip control
2. Set effectiveControl = targetFaction
3. Zero out all other faction strengths
4. Set new controller strength = 100
5. Mark hasFlipped = true
6. Record flipTurn
7. Lock for consolidation period
```

**Current Canon (Sophisticated):**
```typescript
// Settlement-level political control (not municipality)
interface Settlement {
  political_controller: FactionId | null;
  legitimacy_state: {...}; // Not simple "strength = 100"
  control_status: "SECURE" | "CONTESTED" | "HIGHLY_CONTESTED";
  
  // Phase I specific
  phase_i_control_strain: number;
  phase_i_displacement_initiated: boolean;
}

// Flip execution includes:
- Political controller update
- Legitimacy recalculation (coercion penalty applied)
- Control status update (based on new stability)
- Displacement trigger evaluation
- Authority state changes
- Militia strength reset (victor/loser)
- Control strain initialization
```

**Key Improvements:**
1. **Settlement-level:** Granular control (not just municipality)
2. **Legitimacy-based:** Nuanced authority (not simple "strength = 100")
3. **Cascading effects:** Displacement, authority, strain all updated
4. **Phase-aware:** Different mechanics for Phase I vs Phase II+

**Assessment:** ✅ Core execution **well-implemented**, evolved beyond simple strength model

---

## Section 6: UI/UX Elements (Control System)

### 6.1 Municipality Detail Panel - GOOD MOCKUP ✅

**Early Documentation Mockup:**
```
PRIJEDOR
Nominal Control: RBiH (SDA won 1990)
Effective Control: RBiH (Weak)

CONTROL STABILITY: COLLAPSE IMMINENT (25/100)
⚠️ Vulnerabilities:
- demographic minority
- mixed police
- sds organized
- jna present

⚠️ FLIP RISK: CRITICAL
This municipality may flip control when war begins
```

**Current Canon:**
- ✅ UI_DESIGN_SPECIFICATION.md envisions similar panel
- ✅ Control status display (SECURE/CONTESTED/HIGHLY_CONTESTED)
- ✅ Stability score breakdown
- ⚠️ Early doc has **more specific UI mockup** (useful implementation reference)

**Valuable Early Doc Details:**
- ⚠️ **Warning triangle icon** (⚠️) for critical status - **good visual pattern**
- ⚠️ **Bulleted vulnerability list** - clear, scannable format
- ⚠️ **Separate "FLIP RISK" callout** - emphasizes danger beyond raw stability score

**Recommendation:**
Use early doc **UI mockup as reference** when implementing. The visual hierarchy and warning presentation are **effective**.

---

### 6.2 Map Color Coding - WELL PRESERVED ✅

**Early Documentation:**
```
Color coding indicates current effective control
Contested areas shown in burnt amber
Weak control shown in lighter faction colors
Hovering shows stability status (TO BE ENHANCED)
```

**Current Canon:**
- ✅ Faction color coding confirmed
- ✅ Contested status visual differentiation
- ✅ Hover tooltips with detail
- ✅ Color intensity for control strength

**Assessment:** ✅ Design direction **well-aligned**

---

### 6.3 Status Icons/Warnings - VALUABLE DETAIL ⚠️

**Early Documentation:**
```
Municipalities should display:
- ⚠️ High flip risk icon
- 📊 Flip in progress indicator
- 🔒 Consolidated/locked status
- 📈/📉 Stability trend (improving/declining)
```

**Current Canon:**
- ⚠️ **NOT EXPLICITLY SPECIFIED** in UI_DESIGN_SPECIFICATION.md

**Impact of Omission:**
These status icons provide **at-a-glance situational awareness** without opening detail panels. Especially valuable for:
- Identifying critical vulnerabilities quickly
- Tracking ongoing conflicts
- Understanding post-flip consolidation periods
- Monitoring stability trends

**Recommendation:**
Add to UI_DESIGN_SPECIFICATION.md:

```markdown
### Municipality Status Icons (Map Overlay)

Display small icons in corner of municipality on tactical map:

- ⚠️ **Critical Flip Risk:** stability < 30 AND adjacent hostile control
- 📊 **Contested/Flip in Progress:** HIGHLY_CONTESTED status with active pressure
- 🔒 **Consolidation Lockdown:** Recent flip (last 4 turns), stability recovering
- 📈 **Stability Improving:** +10 or more stability last 3 turns
- 📉 **Stability Declining:** -10 or more stability last 3 turns

Icons should be:
- Small (16x16px) to avoid map clutter
- Semi-transparent when not hovered
- Fully opaque on hover with tooltip explanation
- Color-coded to match urgency (red for critical, yellow for contested, etc.)
```

**Implementation Effort:** Low (1-2 days)
**Value:** Low-Medium (UI polish, helpful but not critical for v1.0)

---

## Section 7: Coercion Event System - NOTABLE OMISSION ⚠️

### 7.1 The Gap

**Early Documentation (PDF, Part 3.2, 5.2):**
```
Coercion events: +20 pressure per event
Examples:
- Forced displacement warnings
- Intimidation campaigns
- Property seizures
- Checkpoint harassment
- Paramilitary presence

These accumulate pressure leading to flips
```

**Current Canon:**
- ✅ Displacement mechanics **fully implemented**
- ✅ Legitimacy **tracks coercion penalties** (System 4)
- ⚠️ **No explicit "coercion event" modeling**
- ⚠️ Coercion **implicit in flip mechanics** (low legitimacy → weak control)

---

### 7.2 Why This Matters (Historical Examples)

**Historical record shows specific coercion campaigns preceded many flips:**

**Prijedor (April 30, 1992):**
- March-April 1992: SDS organized intimidation campaign
- Checkpoint harassment of non-Serb population
- Radio Prijedor broadcasts creating fear
- April 29-30: Coordinated paramilitary takeover
- **Result:** Control flipped within 48 hours

**Zvornik (April 8-9, 1992):**
- April 1: Paramilitary forces (Arkan's Tigers) arrive
- April 4-7: Systematic intimidation of Bosniak population
- April 8: First attacks
- April 9: Mass displacement begins
- **Result:** 40,000 displaced within days, VRS control established

**Foča (April-May 1992):**
- April: Systematic targeting of Bosniak population
- Checkpoint system controlling movement
- Forced displacement warnings
- May: VRS full control after population flight
- **Result:** Control flip through coercion, not primarily military force

**Pattern:**
Coercion → Population Fear → Displacement → Control Flip

**Current system captures:**
- ✅ Displacement (Phase I hooks, Phase F accumulation)
- ✅ Legitimacy damage (coercion penalties)

**Current system misses:**
- ⚠️ **Explicit event tracking** (when/where coercion occurred)
- ⚠️ **Temporal pressure buildup** (coercion campaigns take weeks)
- ⚠️ **Historical attribution** (which faction used coercion)

---

### 7.3 Recommendation: Coercion Event Tracking

**Data Structure:**
```typescript
interface CoercionEvent {
  event_id: string;
  turn: number;
  municipality_id: string;
  settlement_id?: string; // Optional: specific settlement
  
  type: "intimidation" | "displacement_threat" | "property_seizure" | "checkpoint" | "paramilitary_presence";
  
  perpetrator_faction: FactionId;
  target_ethnicity: "bosniak" | "serb" | "croat";
  
  intensity: number; // 1-3 (minor, moderate, severe)
  pressure_impact: number; // 10-25 depending on severity
  
  description: string; // Historical narrative
}

// In game state:
interface GameState {
  coercion_events: CoercionEvent[];
  coercion_pressure_by_municipality: { [mun_id: string]: number };
  // ...
}
```

**Integration with Flip Mechanics:**
```typescript
function calculateCoercionPressure(mun_id: string, turn: number): number {
  const recent_events = state.coercion_events.filter(
    e => e.municipality_id === mun_id 
      && e.turn >= turn - 3 // Last 3 turns (decay window)
  );
  
  // Sum pressure with decay
  return recent_events.reduce((sum, e) => {
    const turns_ago = turn - e.turn;
    const decay = 1.0 - (turns_ago * 0.25); // 25% decay per turn
    return sum + (e.pressure_impact * decay);
  }, 0);
}

// In Phase I control flip calculation:
const coercion_pressure = calculateCoercionPressure(mun_id, turn);

const total_flip_pressure = 
  attacking_militia_strength 
  + coercion_pressure // NEW
  - defensive_militia_strength
  - stability_modifier;

const flip_occurs = total_flip_pressure > FLIP_THRESHOLD;
```

**Historical Data Integration:**
```typescript
// Scenario initialization for April 1992:
const historical_coercion_events = [
  {
    event_id: "prijedor_intimidation_march_1992",
    turn: -2, // 2 turns before war start
    municipality_id: "prijedor",
    type: "intimidation",
    perpetrator_faction: "VRS",
    target_ethnicity: "bosniak",
    intensity: 2,
    pressure_impact: 15,
    description: "SDS-organized intimidation campaign creates climate of fear"
  },
  {
    event_id: "prijedor_paramilitary_april_1992",
    turn: 0, // War start turn
    municipality_id: "prijedor",
    type: "paramilitary_presence",
    perpetrator_faction: "VRS",
    target_ethnicity: "bosniak",
    intensity: 3,
    pressure_impact: 25,
    description: "Paramilitary forces arrive; coordinated takeover imminent"
  },
  // ... Zvornik, Foča, etc.
];
```

**Benefits:**
1. **Historical accuracy:** Explains timing of flips (Prijedor flips April 30, not random)
2. **Educational value:** Shows role of coercion vs military force
3. **Emergent gameplay:** If player (as VRS) increases coercion, IVP increases faster
4. **Validation anchor:** Known coercion patterns can validate simulation

**Implementation Effort:** Medium (2-3 days)
- Data structure: 0.5 days
- Integration with flip mechanics: 1 day
- Historical data entry (10-20 key events): 0.5-1 day
- Testing: 0.5 days

**Value:** Medium (historical authenticity + educational value)

---

### 7.4 Alternative: Defer Coercion Events

If **time-constrained**, defer explicit coercion event tracking because:

1. ✅ **Current legitimacy system captures coercion effects** (penalties for forced flips)
2. ✅ **Displacement system works** (triggered by flips with Hostile_Population_Share > 0.3)
3. ⚠️ **Historical timing may be less precise** (but still reasonable)

**Decision:** Implement **only if v1.0 has slack time** OR defer to **v1.5** as polish/accuracy improvement.

---

## Section 8: Regional Cascade Mechanics - LOW PRIORITY ⚠️

### 8.1 The Concept

**Early Documentation:**
```
Regional momentum: +15 (if 3+ adjacent flips)

Models psychological/practical impact of "domino effect"
where multiple municipalities fall in quick succession
```

**Current Canon:**
- ⚠️ **NOT EXPLICITLY MODELED**
- Adjacent hostile control **required** for flip eligibility
- No "+15 bonus" for being surrounded by recent flips

---

### 8.2 Historical Reality

**Cascades DID occur:**

**Posavina Corridor (June-July 1992):**
- June 3: Derventa falls to VRS
- June 7: Odžak falls (domino effect)
- June 26: Bosanski Šamac falls
- **Pattern:** Rapid succession along corridor

**Eastern Bosnia (April 1992):**
- April 9: Zvornik falls to VRS
- April 10: Vlasenica falls
- April 11: Bratunac falls
- **Pattern:** Cascade within 3 days

**Herzegovina (May-June 1993):**
- May 1993: Multiple HVO municipalities flip to ARBiH
- June-July: Continued cascade
- **Pattern:** Regional momentum after initial breakthrough

---

### 8.3 Why It's Low Priority

**Current mechanics IMPLICITLY capture cascade:**

1. **Adjacent hostile control requirement:**
   - Each flip exposes new municipalities
   - Creates natural cascade potential

2. **Control strain accumulation:**
   - Municipalities surrounded by hostiles accumulate strain
   - Makes subsequent flips easier

3. **Militia/formation pressure:**
   - Successful attacker can redirect forces
   - Multiple fronts weaken defender

4. **Exhaustion effects:**
   - Faction losing territory accumulates exhaustion
   - Weakens defense across all fronts

**Cascade is EMERGENT** from existing systems, not requiring explicit bonus.

---

### 8.4 Implementation (If Desired)

**Simple cascade bonus:**
```typescript
function calculateCascadeBonus(mun_id: string, turn: number): number {
  const adjacent = getAdjacentMunicipalities(mun_id);
  
  const recent_flips = adjacent.filter(adj => 
    adj.last_flip_turn !== null 
    && adj.last_flip_turn >= turn - 2 // Last 2 turns
    && adj.political_controller !== state.municipalities[mun_id].political_controller // Hostile
  );
  
  if (recent_flips.length >= 3) {
    return 15; // "Surrounded" psychological effect
  }
  
  return 0;
}

// Add to flip pressure calculation:
const total_pressure = 
  attacking_militia_strength 
  + cascade_bonus // NEW
  - defensive_militia_strength;
```

**Implementation Effort:** Low (1 day)
**Value:** Low (nice-to-have, not critical)

**Recommendation:** **Defer to v1.5+** unless playtesting shows flips are **too isolated** and fail to match historical cascade patterns.

---

## Section 9: Master Cross-Reference Table

### 9.1 Complete Feature Status Matrix

| Feature Category | Feature | Early Docs | Current v0.4 | Status | Priority | Effort |
|------------------|---------|------------|--------------|--------|----------|--------|
| **MILITARY SYSTEMS** |
| OOB | VRS corps structure | 6 corps | VRS_OOB_MASTER.md | ✅ Complete | N/A | N/A |
| OOB | VRS troop count | ~155k operational | Integrated | ✅ Complete | N/A | N/A |
| OOB | ARBiH corps structure | 7 corps | ARBIH_OOB_MASTER.md | ✅ Complete | N/A | N/A |
| OOB | HVO operational zones | 3 zones | HVO_OOB_MASTER.md | ✅ Complete | N/A | N/A |
| Supply | Arms embargo asymmetry | Parameters | System 2 | ✅ Complete | N/A | N/A |
| Supply | VRS advantage (0.9) | Specified | ✅ Implemented | ✅ Complete | N/A | N/A |
| Supply | ARBiH limited (0.2) | Specified | ✅ Implemented | ✅ Complete | N/A | N/A |
| Supply | Production facilities | Zenica, Vitez, etc. | ⚠️ Abstract | ⚠️ Partial | Medium | 2-3 days |
| UI | Warroom desk | Detailed spec | UI_DESIGN_SPEC | ✅ Complete | N/A | N/A |
| UI | Situation reports | Delay/accuracy | ✅ Specified | ✅ Complete | N/A | N/A |
| **CONTROL MECHANICS** |
| Stability | Scoring formula | Base + modifiers | Appendix E | ✅ Evolved | N/A | N/A |
| Stability | Demographic factors | Binary | 4-tier gradient | ✅ Improved | N/A | N/A |
| Stability | Organizational factors | +10/-5 police | +15/-10/-15 | ✅ Improved | N/A | N/A |
| Stability | TD explicit | Not explicit | +15/-10 | ✅ Added | N/A | N/A |
| Stability | SDS/PL explicit | Mentioned | -15/+10 | ✅ Added | N/A | N/A |
| Stability | Friendly rear | Not mentioned | +10 | ✅ Added | N/A | N/A |
| Status | Bands | 5 bands | 3 bands | ✅ Simplified | N/A | N/A |
| Status | Nomenclature | "Unstable" | "CONTESTED" | ✅ Improved | N/A | N/A |
| Flip | Trigger system | Abstract pressure | Militia/formations | 🔄 Redesigned | N/A | N/A |
| Flip | Pressure sources | +30/+40/+15 | Realistic military | 🔄 Improved | N/A | N/A |
| Flip | Control granularity | Municipality | Settlement | ✅ Improved | N/A | N/A |
| Flip | Execution | Simple strength | Legitimacy-based | ✅ Evolved | N/A | N/A |
| Post-flip | Displacement | "Needs system" | Phase I + F | ✅ Implemented | N/A | N/A |
| Post-flip | Legitimacy | "Damaged" | Full system | ✅ Implemented | N/A | N/A |
| Post-flip | IVP | Mentioned | System 1 | ✅ Implemented | N/A | N/A |
| Post-flip | Consolidation | Mentioned | Control strain | ✅ Implemented | N/A | N/A |
| Coercion | Event tracking | +20 per event | ⚠️ Implicit only | ⚠️ Omission | Medium | 2-3 days |
| Cascade | Regional momentum | +15 (3+ flips) | ⚠️ Implicit only | ⚠️ Omission | Low | 1 day |
| **UI/UX** |
| UI | Municipality panel | Mockup | Partial spec | ⚠️ Use mockup | Low | N/A |
| UI | Map color coding | Described | ✅ Specified | ✅ Aligned | N/A | N/A |
| UI | Status icons | ⚠️📊🔒📈📉 | ⚠️ Not in spec | ⚠️ Omission | Low | 1-2 days |
| UI | Stability trend | 📈📉 indicators | ⚠️ Not in spec | ⚠️ Omission | Low | (same) |
| **GAME DESIGN** |
| Campaign | Scenario definitions | 8 scenarios | ✅ Defined | ✅ Complete | N/A | N/A |
| Campaign | Branching | Scenario tree | ❌ Linear only | ⚠️ Missing | Medium | 5-7 days |
| Campaign | Victory conditions | Per scenario | ⚠️ Unclear | ⚠️ Missing | **High** | 1-2 days |
| Campaign | Unlock system | Dependency graph | ❌ None | ⚠️ Missing | Low | 2-3 days |
| AI | Decision trees | Faction-specific | ❌ Not specified | ❌ **CRITICAL** | **CRITICAL** | 2-3 days design |
| AI | Strategic objectives | Historical | ❌ Not specified | ❌ **CRITICAL** | **CRITICAL** | (part of above) |
| AI | Tactical doctrines | VRS aggr→def | ❌ Not specified | ❌ **CRITICAL** | **CRITICAL** | (part of above) |
| AI | Difficulty scaling | Historical accuracy | ❌ Not specified | ❌ **CRITICAL** | High | 1-2 days |
| AI | Implementation | Full system | ❌ Not coded | ❌ **CRITICAL** | **CRITICAL** | 8-10 days |
| Events | Random events | Factory explosions | ❌ Not specified | ❌ Missing | Medium | 2-3 days design |
| Events | Triggered events | Srebrenica→IVP | ❌ Not specified | ❌ Missing | Medium | (part of above) |
| Events | Framework | Trigger+effects | ❌ Not implemented | ❌ Missing | Medium | 4-6 days |
| Events | Narratives | Historical text | ❌ Not specified | ❌ Missing | Low | 2-3 days |
| Negotiation | Capital system | ✅ Specified | System 7 | ✅ Complete | N/A | N/A |
| Negotiation | Accept/reject | Basic | ✅ Functional | ✅ Complete | N/A | N/A |
| Negotiation | Counter-offers | Map-based | ❌ Not implemented | ⚠️ Missing | Medium | 3-4 days |
| Negotiation | Preview | Pre-agreement map | ❌ Not implemented | ⚠️ Missing | Low | 1-2 days |
| Multiplayer | Async turns | Client-server | ❌ Not designed | ❌ Missing | Low | 15-20 days |
| Multiplayer | Hidden info | Order encryption | ❌ Not designed | ❌ Missing | Low | (part of above) |

---

### 9.2 Status Key

- ✅ **Complete:** Fully implemented in v0.4.0, no action needed
- 🔄 **Redesigned:** Concept preserved but implementation evolved (usually better)
- ⚠️ **Partial:** Partially implemented or simplified, may need expansion
- ❌ **Missing:** Not present in v0.4.0, needs implementation

---

### 9.3 Priority Key

- **CRITICAL:** Blocks v1.0 release (no single-player game without AI)
- **High:** Very important for v1.0 (victory conditions, production facilities)
- **Medium:** Important for v1.5+ (events, coercion tracking, campaign branching)
- **Low:** Nice-to-have for v2.0+ (status icons, cascade bonuses, multiplayer)

---

## Section 10: Consolidated Strategic Recommendations

### 10.1 Critical Path to v1.0 (Must-Have)

**Total Estimated Effort: 15-18 days**

#### 1. AI Opponent System (10-13 days total) ❌ CRITICAL

**Design Phase (2-3 days):**
- Document faction-specific AI strategies
  - VRS: Aggressive expansion (1992-93) → Defensive consolidation (1994-95)
  - ARBiH: Survival and consolidation throughout
  - HVO: Opportunistic control → Federation cooperation post-Washington
- Define historical benchmark targets
  - VRS: Control 70% territory by Dec 1992
  - ARBiH: Hold Sarajevo, Tuzla, Bihać throughout
  - HVO: Control Central Bosnia until Washington Agreement
- Create decision trees for strategic/tactical choices

**Implementation Phase (8-10 days):**
- Strategic AI layer (objective selection, force allocation)
- Tactical AI layer (brigade assignments, posture selection)
- Difficulty scaling system (historical accuracy = medium)
- Testing and tuning

**Deliverables:**
- AI_STRATEGY_SPECIFICATION.md
- src/ai/ directory with strategy modules
- Difficulty presets (easy/medium/hard)

---

#### 2. Victory Conditions (1-2 days) ⚠️ HIGH PRIORITY

**Work Required:**
- Define clear victory conditions per scenario
- Implement evaluation logic
- Add win/loss/draw detection
- Create end-of-scenario summary

**Example Victory Conditions:**
```typescript
scenarios: {
  "april_1992_war_outbreak": {
    victory_conditions: {
      VRS: {
        primary: "Control 70%+ territory by Dec 1992",
        secondary: "Establish Posavina Corridor by July 1992"
      },
      ARBiH: {
        primary: "Hold Sarajevo, Tuzla, Bihać until scenario end",
        secondary: "Prevent collapse of any major enclave"
      }
    }
  }
}
```

**Deliverables:**
- VICTORY_CONDITIONS.md specification
- Victory evaluation in turn_pipeline
- End-of-scenario UI

---

#### 3. Production Facilities (2-3 days) ⚠️ MEDIUM PRIORITY

**Work Required:**
- Define 5-10 critical facilities (Zenica, Vitez, Bugojno, Breza, Vogošća)
- Implement capture/control effects on faction supply
- Add production capacity per turn
- Integrate with existing supply system

**Deliverables:**
- Production facility data (JSON/TypeScript)
- Integration with System 2 (Arms Embargo Asymmetry)
- Testing

---

### 10.2 Important Enhancements for v1.5 (Post-Launch Polish)

**Total Estimated Effort: 12-17 days**

#### 1. Event System (4-6 days)

- Event framework (triggers, effects, conditions)
- 10-20 historical events (Srebrenica, Markale, Dayton triggers)
- 5-10 random events (convoy ambushes, defections, factory accidents)
- Narrative text templates

#### 2. Campaign Branching (5-7 days)

- Scenario dependency graph
- Unlock system based on victory type
- Alternative historical paths
- "What-if" scenarios

#### 3. Negotiation Counter-Offers (3-4 days)

- Counter-proposal system
- Map-based territorial negotiation UI
- Consequence preview
- Multi-round negotiation

#### 4. Coercion Event Tracking (2-3 days)

- Event data structure
- Integration with flip mechanics
- Historical coercion data entry (Prijedor, Zvornik, Foča)
- Testing

---

### 10.3 Future Enhancements for v2.0+ (Nice-to-Have)

**Total Estimated Effort: 18-26 days**

#### 1. Multiplayer Architecture (15-20 days)

- Client-server design
- Simultaneous turn resolution
- Hidden information handling
- Async multiplayer support

#### 2. UI Polish (3-6 days)

- Status icon system (⚠️📊🔒📈📉)
- Stability trend indicators
- Atmospheric details (radio broadcasts, phone interruptions)

#### 3. Regional Cascade Mechanics (1 day)

- +15 bonus when 3+ adjacent municipalities flip
- Psychological "domino effect" modeling

---

## Section 11: Implementation Guidance

### 11.1 AI Opponent - Detailed Design Template

```typescript
// AI Strategy Definition
interface AIStrategyProfile {
  faction: FactionId;
  phase: GamePhase;
  
  // High-level strategic objectives
  strategic_objectives: Array<{
    priority: number; // 1-10 (10 = highest)
    objective_type: 
      | "capture_territory" 
      | "hold_position" 
      | "ethnic_consolidation" 
      | "corridor_control"
      | "enclave_reduction"
      | "diplomatic_positioning";
    target: string; // Settlement IDs, region names, or "all"
    completion_threshold: number; // 0-1
    time_pressure: number; // Urgency (1-10)
  }>;
  
  // Tactical decision parameters
  tactical_doctrine: {
    // When to initiate offensive operations
    offensive_threshold: number; // Strength ratio (e.g., 1.3 = attack when 1.3x stronger)
    
    // When to retreat/withdraw
    defensive_fallback: number; // Strength ratio (e.g., 0.6 = retreat when < 0.6x strength)
    
    // How aggressive in contested areas
    risk_tolerance: number; // 0-1 (0 = cautious, 1 = reckless)
    
    // Resource allocation across fronts
    resource_allocation: {
      offensive_fronts: number; // % of forces for offense (0-100)
      defensive_positions: number; // % for defense
      strategic_reserve: number; // % held back
    };
    
    // Supply prioritization
    supply_priority: "offensive" | "defensive" | "balanced";
  };
  
  // Historical benchmarks for evaluation
  historical_benchmarks: Array<{
    turn: number;
    expected_control: string[]; // Settlement IDs
    tolerance: number; // ±N settlements acceptable
    critical: boolean; // If missed, recalculate strategy?
  }>;
  
  // Diplomatic behavior
  diplomatic_stance: {
    willingness_to_negotiate: number; // 0-1
    acceptable_concessions: string[]; // What AI will cede
    unacceptable_demands: string[]; // What AI won't cede
    ceasefire_threshold: number; // Exhaustion level to accept ceasefire
  };
}
```

**Example: VRS Early War (1992-1993)**
```typescript
const VRS_EARLY_WAR: AIStrategyProfile = {
  faction: "VRS",
  phase: "phase_i", // April-Dec 1992
  
  strategic_objectives: [
    {
      priority: 10,
      objective_type: "corridor_control",
      target: "posavina_corridor", // Brčko, Derventa, Odžak, Bosanski Šamac
      completion_threshold: 0.9, // Must control 90%+ of corridor
      time_pressure: 9 // URGENT (before international intervention)
    },
    {
      priority: 9,
      objective_type: "ethnic_consolidation",
      target: "eastern_bosnia", // Zvornik, Vlasenica, Bratunac, Srebrenica
      completion_threshold: 0.8,
      time_pressure: 8
    },
    {
      priority: 7,
      objective_type: "capture_territory",
      target: "sarajevo",
      completion_threshold: 0.3, // Siege acceptable, full capture not required
      time_pressure: 5
    },
    {
      priority: 6,
      objective_type: "ethnic_consolidation",
      target: "prijedor_region",
      completion_threshold: 0.95,
      time_pressure: 7
    }
  ],
  
  tactical_doctrine: {
    offensive_threshold: 1.3, // Attack when 1.3x stronger (moderately aggressive)
    defensive_fallback: 0.7, // Hold unless seriously outnumbered
    risk_tolerance: 0.7, // Fairly aggressive
    resource_allocation: {
      offensive_fronts: 60, // Most forces on offense
      defensive_positions: 30,
      strategic_reserve: 10
    },
    supply_priority: "offensive"
  },
  
  historical_benchmarks: [
    {
      turn: 10, // ~June 1992
      expected_control: ["brcko", "derventa", "odzak", "bosanski_samac"],
      tolerance: 1, // Must have at least 3 of 4
      critical: true // Posavina Corridor is critical early objective
    },
    {
      turn: 20, // ~October 1992
      expected_control: [...], // 65-75% of eventual VRS territory
      tolerance: 5,
      critical: false
    },
    {
      turn: 30, // ~December 1992
      expected_control: [...], // ~70% of BiH territory
      tolerance: 3,
      critical: false
    }
  ],
  
  diplomatic_stance: {
    willingness_to_negotiate: 0.3, // Low (in position of strength)
    acceptable_concessions: ["safe_passage_corridors"], // Minimal
    unacceptable_demands: ["sarajevo", "posavina_corridor", "eastern_bosnia"],
    ceasefire_threshold: 0.7 // Only if exhaustion > 70
  }
};
```

**Example: VRS Late War (1994-1995)**
```typescript
const VRS_LATE_WAR: AIStrategyProfile = {
  faction: "VRS",
  phase: "phase_ii", // 1994-1995
  
  strategic_objectives: [
    {
      priority: 10,
      objective_type: "hold_position",
      target: "all_controlled_territory",
      completion_threshold: 0.95, // Must not lose more than 5%
      time_pressure: 10 // CRITICAL (avoid total collapse)
    },
    {
      priority: 9,
      objective_type: "corridor_control",
      target: "brcko",
      completion_threshold: 1.0, // Cannot lose Brčko
      time_pressure: 10
    },
    {
      priority: 5,
      objective_type: "enclave_reduction",
      target: "srebrenica", // Historical: July 1995
      completion_threshold: 1.0,
      time_pressure: 3 // Opportunistic, not urgent
    },
    {
      priority: 4,
      objective_type: "diplomatic_positioning",
      target: "n/a",
      completion_threshold: 0.5,
      time_pressure: 6 // Negotiate from strength before collapse
    }
  ],
  
  tactical_doctrine: {
    offensive_threshold: 2.0, // Very cautious (only attack if overwhelmingly superior)
    defensive_fallback: 0.8, // Hold tenaciously
    risk_tolerance: 0.3, // Very conservative
    resource_allocation: {
      offensive_fronts: 20, // Minimal offense
      defensive_positions: 60, // Most forces on defense
      strategic_reserve: 20 // Large reserve for crisis response
    },
    supply_priority: "defensive"
  },
  
  historical_benchmarks: [
    {
      turn: 100, // Mid-1994
      expected_control: [...], // Hold 68-70% territory
      tolerance: 2,
      critical: true // Cannot afford major losses
    },
    {
      turn: 140, // Mid-1995
      expected_control: [...], // Still ~65-68% (before Oluja)
      tolerance: 3,
      critical: true
    }
  ],
  
  diplomatic_stance: {
    willingness_to_negotiate: 0.7, // Higher (defensive position)
    acceptable_concessions: ["some_contested_areas", "autonomy_arrangements"],
    unacceptable_demands: ["sarajevo", "brcko", "major_population_centers"],
    ceasefire_threshold: 0.5 // Will negotiate earlier
  }
};
```

---

### 11.2 Coercion Event System - Implementation Guide

**Data Structure:**
```typescript
interface CoercionEvent {
  event_id: string;
  turn: number;
  municipality_id: string;
  settlement_id?: string; // Optional: specific settlement targeting
  
  type: 
    | "intimidation"          // General climate of fear
    | "displacement_threat"   // Explicit threats to leave
    | "property_seizure"      // Confiscation of homes/businesses
    | "checkpoint"            // Movement restriction/harassment
    | "paramilitary_presence" // Armed groups creating fear
    | "targeted_violence";    // Specific attacks on individuals
  
  perpetrator_faction: FactionId;
  target_ethnicity: "bosniak" | "serb" | "croat";
  
  intensity: 1 | 2 | 3; // Minor, moderate, severe
  pressure_impact: number; // 10-25 depending on intensity
  
  duration_turns?: number; // Some coercion is sustained (checkpoints)
  
  description: string; // Historical narrative for educational purposes
  sources?: string[]; // Citations (ICTY records, HR reports)
}

// In GameState:
interface GameState {
  coercion_events: CoercionEvent[];
  
  // Derived state (calculated each turn):
  coercion_pressure_by_municipality: { [mun_id: string]: number };
  coercion_active_by_type: { 
    [mun_id: string]: { 
      [type: string]: number // Count of active coercion events by type
    } 
  };
  
  // ...
}
```

**Pressure Calculation with Decay:**
```typescript
function calculateCoercionPressure(
  mun_id: string, 
  turn: number, 
  events: CoercionEvent[]
): number {
  const recent_events = events.filter(
    e => e.municipality_id === mun_id 
      && e.turn >= turn - 4 // 4-turn window (approximately 1 month)
  );
  
  return recent_events.reduce((sum, event) => {
    const turns_ago = turn - event.turn;
    
    // Decay function: 100% → 75% → 50% → 25% → 0%
    const decay_factor = Math.max(0, 1.0 - (turns_ago * 0.25));
    
    // Intensity-based pressure
    const base_pressure = event.intensity * 10; // 10/20/30 base
    
    // Type-based multiplier
    const type_multiplier = {
      "intimidation": 0.8,
      "displacement_threat": 1.0,
      "property_seizure": 1.2,
      "checkpoint": 0.9,
      "paramilitary_presence": 1.3,
      "targeted_violence": 1.5
    }[event.type];
    
    return sum + (base_pressure * type_multiplier * decay_factor);
  }, 0);
}
```

**Integration with Phase I Flip Mechanics:**
```typescript
// In control_flip.ts:
function evaluateMunicipalityFlipEligibility(
  mun_id: string,
  attacker: FactionId,
  state: GameState
): boolean {
  // Existing checks
  const has_adjacent_hostile = hasAdjacentHostileControl(mun_id, attacker, state);
  if (!has_adjacent_hostile) return false;
  
  // Calculate flip pressure
  const attacking_militia = calculateMilitiaStrength(mun_id, attacker, state);
  const defensive_militia = calculateMilitiaStrength(mun_id, defender, state);
  const stability = state.municipalities[mun_id].stability_score;
  
  // NEW: Add coercion pressure
  const coercion_pressure = calculateCoercionPressure(
    mun_id, 
    state.meta.turn, 
    state.coercion_events
  );
  
  const total_pressure = 
    attacking_militia 
    + coercion_pressure // NEW COMPONENT
    - defensive_militia 
    - (stability * 0.5);
  
  return total_pressure > FLIP_THRESHOLD;
}
```

**Historical Data Example (Prijedor):**
```typescript
const PRIJEDOR_COERCION_EVENTS: CoercionEvent[] = [
  {
    event_id: "prijedor_sds_intimidation_march_1992",
    turn: -3, // 3 turns before war start (March 1992)
    municipality_id: "prijedor",
    type: "intimidation",
    perpetrator_faction: "VRS",
    target_ethnicity: "bosniak",
    intensity: 2,
    pressure_impact: 15,
    description: "SDS-organized intimidation campaign. Radio Prijedor broadcasts create climate of fear among non-Serb population.",
    sources: ["ICTY Stakić case", "Human Rights Watch 1993 report"]
  },
  {
    event_id: "prijedor_checkpoint_april_1992",
    turn: -1, // 1 turn before war start (Early April 1992)
    municipality_id: "prijedor",
    type: "checkpoint",
    perpetrator_faction: "VRS",
    target_ethnicity: "bosniak",
    intensity: 2,
    pressure_impact: 12,
    duration_turns: 3,
    description: "Checkpoint system implemented, restricting movement of Bosniak population.",
    sources: ["ICTY Stakić case"]
  },
  {
    event_id: "prijedor_paramilitary_april_29_1992",
    turn: 0, // War start turn (April 30, 1992)
    municipality_id: "prijedor",
    type: "paramilitary_presence",
    perpetrator_faction: "VRS",
    target_ethnicity: "bosniak",
    intensity: 3,
    pressure_impact: 25,
    description: "Paramilitary forces arrive in Prijedor. Coordinated takeover begins with roadblocks and seizure of key buildings.",
    sources: ["ICTY Stakić case", "Balkan Battlegrounds Vol I"]
  }
  // This sequence of coercion events explains why Prijedor flipped 
  // immediately on April 30, 1992 despite having contested control
];
```

**Benefits of Implementation:**
1. **Historical accuracy:** Explains timing of flips (why Prijedor April 30 vs Bihać never)
2. **Educational value:** Shows role of coercion vs military force in ethnic cleansing
3. **Emergent consequences:** High coercion → faster flips but also → higher IVP
4. **Validation anchor:** Known coercion patterns validate simulation accuracy

**Testing Strategy:**
```typescript
describe("Coercion Event System", () => {
  test("Prijedor flip with historical coercion events", () => {
    // Setup: Prijedor with contested control (stability ~45)
    const state = initializeApril1992Scenario();
    state.coercion_events = PRIJEDOR_COERCION_EVENTS;
    
    // Advance to April 30, 1992 (turn 0)
    const result = runTurn(state);
    
    // Expect: Prijedor flips to VRS on turn 0 due to coercion pressure
    expect(state.municipalities["prijedor"].political_controller).toBe("VRS");
    expect(result.flips_this_turn).toContain("prijedor");
  });
  
  test("Bihać does NOT flip despite military pressure (no coercion)", () => {
    // Setup: Bihać with contested control, VRS military pressure
    const state = initializeJune1992Scenario();
    // No coercion events for Bihać
    
    const result = runTurn(state);
    
    // Expect: Bihać holds despite pressure (ARBiH stronghold)
    expect(state.municipalities["bihac"].political_controller).toBe("ARBiH");
  });
});
```

---

## Section 12: Conclusion & Next Steps

### 12.1 What We Learned

**Early documentation served TWO critical purposes:**

1. **Prototype Phase:** Tested core concepts (stability scoring, supply asymmetries, control mechanics)
2. **Evolution Validation:** Current v0.4.0 proves the concepts were SOUND, execution IMPROVED

**Key Insight:**
The trajectory from **abstract "pressure points"** → **realistic military modeling** demonstrates **excellent design iteration**. You didn't abandon the core ideas (stability, coercion, supply asymmetry); you **refined them** into historically accurate systems.

---

### 12.2 Strategic Assessment

**Current v0.4.0 Status:**

✅ **Excellent Foundation (90% complete):**
- Military systems (OOB, supply, formations)
- Political control mechanics (stability, flips, legitimacy)
- Constraint systems (IVP, exhaustion, negotiation capital)
- Phase progression (0 → I → II+)
- Displacement mechanics

❌ **Critical Gap (blocks v1.0):**
- **AI opponent system** - Without this, there is **no single-player game**

⚠️ **Important Gaps (reduce polish):**
- Victory conditions (players don't know when they've won)
- Production facilities (less strategic depth)
- Coercion events (less historical accuracy)
- Event system (less replayability)
- Campaign branching (linear progression only)

---

### 12.3 Recommended Action Plan

**Phase 1: Critical Path to v1.0 (15-18 days)**

```
Week 1-2 (10-13 days): AI Opponent System
├─ Days 1-2: AI strategy specification
│  └─ Faction profiles (VRS/ARBiH/HVO)
│  └─ Historical benchmarks
│  └─ Decision tree design
├─ Days 3-4: Strategic AI layer
│  └─ Objective selection
│  └─ Force allocation
├─ Days 5-7: Tactical AI layer
│  └─ Brigade assignments
│  └─ Posture selection
└─ Days 8-10: Testing and tuning
   └─ Difficulty scaling
   └─ Historical accuracy validation

Week 2 (3-5 days concurrent): Victory Conditions & Production
├─ Days 1-2: Victory conditions
│  └─ Define per scenario
│  └─ Evaluation logic
│  └─ End-of-scenario UI
└─ Days 2-3: Production facilities
   └─ 5-10 critical facilities (Zenica, Vitez, etc.)
   └─ Integration with supply system
```

**Phase 2: Post-Launch Polish for v1.5 (12-17 days)**

```
Week 3-4: Events & Campaign Expansion
├─ Days 1-3: Event system framework
│  └─ Trigger/effect architecture
│  └─ 10-20 historical events
│  └─ 5-10 random events
├─ Days 4-7: Campaign branching
│  └─ Scenario dependency graph
│  └─ Unlock system
│  └─ Alternative paths
├─ Days 8-10: Negotiation expansion
│  └─ Counter-offer system
│  └─ Map-based UI
└─ Days 11-12: Coercion events
   └─ Historical data entry
   └─ Integration testing
```

**Phase 3: Future Enhancements for v2.0+ (18-26 days)**

```
Deferred to post-v1.0 based on player feedback:
- Multiplayer architecture (15-20 days)
- UI polish (status icons, trends) (3-6 days)
- Regional cascade mechanics (1 day)
```

---

### 12.4 Final Recommendation

**Do NOT delay v1.0 for anything except AI opponent system.**

**Priority ordering:**
1. **CRITICAL (must have):** AI opponent
2. **High (should have):** Victory conditions, production facilities
3. **Medium (nice to have):** Coercion events, event system, campaign branching
4. **Low (defer):** Status icons, cascade mechanics, multiplayer

**Reasoning:**
- Without AI, there is **no game** (only a simulation viewer)
- With AI + victory conditions, you have a **playable v1.0**
- Everything else is **polish/expansion** for v1.5+

**Estimated v1.0 Timeline:**
- **Minimum viable:** 10-13 days (AI only)
- **Recommended:** 15-18 days (AI + victory + production)
- **Maximum scope:** 20-25 days (AI + victory + production + coercion)

---

## Appendix A: Key Quotes from Documentation

### From Military Systems & Game Design Docs

> "VRS operational strength approximately 155,000 - not the inflated 250,000 paper mobilization figure often cited"
> — CORRECTED_CORPS_SUPPLY_RESEARCH.pdf

> "ARBiH heavy equipment access severely limited by arms embargo - 0.2 vs VRS 0.9 equipment ratio captures historical asymmetry"
> — MASTER_PROJECT_OVERVIEW.pdf

> "Production facilities like Zenica steel works and Vitez munitions were critical strategic objectives - controlling these had real supply consequences"
> — CORRECTED_CORPS_SUPPLY_RESEARCH.pdf

### From Control/Flip System Doc

> "The system creates a foundation for realistic control dynamics that distinguish between political authority and military control, and models how quickly some municipalities could flip once war began."
> — Control_Stability_And_Flip_System_Documentation.pdf, page 1

> "Flips only occur during Main War Phase (April 1992+). A flip occurs when: Stability Score + Applied Pressure ≥ Flip Threshold (50)"
> — Control_Stability_And_Flip_System_Documentation.pdf, page 4

> "Once flipped: Control becomes 100%, Population displacement begins, Local legitimacy permanently damaged, Municipality locked for X turns"
> — Control_Stability_And_Flip_System_Documentation.pdf, page 5

---

## Appendix B: Version Control & Change Log

**This Report:**
- Version: 1.0
- Date: February 9, 2026
- Prepared by: Claude (Anthropic)
- For: Haris, Project Lead - A War Without Victory

**Documents Analyzed:**
1. CORRECTED_CORPS_SUPPLY_RESEARCH.pdf (Military research, VRS/ARBiH/HVO OOB data)
2. MASTER_PROJECT_OVERVIEW.pdf (Game design, campaign, AI, events, negotiation, multiplayer)
3. Control_Stability_And_Flip_System_Documentation.pdf (Stability scoring, flip mechanics, coercion, UI)

**Compared Against:**
- Current Canon: v0.4.0 (Systems_Manual, Phase_Specifications, Engine_Invariants, Rulebook, Game_Bible)
- Order of Battle: VRS_ORDER_OF_BATTLE_MASTER.md, ARBIH_ORDER_OF_BATTLE_MASTER.md, HVO_ORDER_OF_BATTLE_MASTER.md
- Implementation: PROJECT_LEDGER.md, REPO_MAP.md, UI_DESIGN_SPECIFICATION.md

---

**End of Master Report**
