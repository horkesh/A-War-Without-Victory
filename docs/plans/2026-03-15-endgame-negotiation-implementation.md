# Endgame & Negotiation System — Implementation Plan

**Design source:** `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md`
**Target version:** v0.4.0 (Interactive Alpha)
**Status:** PLAN — ready for execution

---

## Implementation Phases

The system is too large for a single sprint. Split into 5 phases with clear gates:

### Phase 1: Negotiation Capital Tracking (Engine Foundation)
### Phase 2: Peace Plan Events (Event System + Scripted Plans)
### Phase 3: Patron Pressure & Override (Diplomatic Layer)
### Phase 4: Dayton Negotiation (Endgame Screen)
### Phase 5: Verdict & Scoring (Results Screen)

Phases 1-3 can be partially parallelized. Phase 4 depends on 1-3. Phase 5 depends on 4.

---

## Phase 1: Negotiation Capital Tracking

**Goal:** Per-faction negotiation capital computed and persisted every turn. No UI yet — just engine + state.

### 1.1 State Schema

**New file:** `src/state/negotiation_types.ts`

```typescript
export interface NegotiationCapital {
    military_position: number;        // 0-100
    humanitarian_standing: number;    // 0-100 (negative = atrocities)
    international_credibility: number; // 0-100
    military_effectiveness: number;   // 0-100
    political_cohesion: number;       // 0-100

    // Detailed breakdowns
    territory_controlled_pct: number;
    civilians_under_protection: number;
    refugees_created: number;
    refugees_received: number;
    military_casualties_inflicted: number;
    military_casualties_taken: number;
    civilian_casualties_caused: number;
    enclaves_held: string[];
    enclaves_lost: string[];
    peace_plans_accepted: string[];
    peace_plans_rejected: string[];
    operations_launched: number;
    operations_successful: number;
    war_crimes_events: number;
}

export interface PatronRelationship {
    patron_id: string;           // 'serbia', 'croatia', 'international_community'
    support_level: number;       // 0-100
    override_authority: number;  // 0-100
    sanctions_active: boolean;
    relationship_events: string[];
}
```

**GameState addition:** `state.negotiation` namespace:
```typescript
negotiation?: {
    capital: Record<FactionId, NegotiationCapital>;
    patron_relationships: Record<FactionId, PatronRelationship>;
    peace_plans_history: Array<{
        plan_id: string;
        turn_offered: number;
        responses: Record<FactionId, 'accepted' | 'rejected' | 'pending'>;
    }>;
}
```

### 1.2 Capital Computation Engine

**New file:** `src/sim/negotiation/compute_capital.ts`

Per-turn step added to war_phases.ts: `compute-negotiation-capital`

Reads from existing state:
- `political_controllers` → territory_controlled_pct
- `formations` → military strength, casualties (from brigade_history)
- `displacement` → refugees_created, refugees_received
- `sector_intel` → military_effectiveness (operations success rate)
- `rbih_hrhb_state` → political_cohesion (alliance management)
- `patron_pressure` → international_credibility

Faction-specific weighting applied to compute the 5 composite dimensions.

### 1.3 Pipeline Integration

Add `compute-negotiation-capital` step to `war_phases.ts` after `compile-turn-summary` (step ~122). Non-disruptive — reads state, writes to `state.negotiation.capital`.

### 1.4 Tests

- Unit tests for each capital dimension computation
- Integration test: run 40w scenario, verify capital accumulates correctly
- Determinism test: same inputs → same capital values

### 1.5 Files

| File | Action |
|------|--------|
| `src/state/negotiation_types.ts` | NEW |
| `src/state/game_state.ts` | Add `negotiation` to state |
| `src/sim/negotiation/compute_capital.ts` | NEW |
| `src/sim/turn_phases/war_phases.ts` | Add pipeline step |
| `tests/negotiation_capital.test.ts` | NEW |

**Gate:** Capital values tracked per-turn in 40w run. Values reasonable (0-100 range, faction-differentiated).

---

## Phase 2: Peace Plan Events

**Goal:** Historical peace plans fire as scripted events. Player responds. Consequences applied.

### 2.1 Event Types Extension

**New file:** `src/sim/negotiation/peace_plans.ts`

Define 4 pre-Dayton plans + Dayton itself:

```typescript
export interface PeacePlan {
    id: string;                    // 'cutileiro', 'vance_owen', etc.
    name: string;
    trigger_turn: number;          // historical turn (from scenario start)
    trigger_conditions?: {         // optional conditions beyond timing
        min_war_duration?: number;
        min_exhaustion?: Record<FactionId, number>;
    };
    proposed_split: Record<FactionId, number>;  // territory %
    institutional_model: string;   // 'cantonization', '10_provinces', 'union_3_republics', '51_49_entities'
    patron_pressure_on_accept: Record<FactionId, number>;
    patron_pressure_on_reject: Record<FactionId, number>;
    narrative_text: string;
    player_options: ('accept' | 'reject' | 'counter')[];
}
```

### 2.2 Peace Plan Pipeline Step

Add `evaluate-peace-plans` step to war_phases.ts. Each turn:
1. Check if any plan's trigger_turn matches current turn
2. If yes, create a `PendingPeacePlan` event (similar to officer events)
3. Bot factions auto-respond based on capital + override authority
4. Player faction gets UI notification (like officer events)

### 2.3 Peace Plan UI

**New component:** `PeacePlanModal.tsx`

- Shows plan details: proposed territorial split, institutional model, narrative
- Player chooses: Accept / Reject / (Counter if available)
- Shows consequences preview: "Rejecting will cost X international credibility and increase patron pressure by Y"
- If all factions accept → game ends with abbreviated verdict

### 2.4 Peace Plan Consequences

On rejection:
- International credibility cost for rejecting faction
- Patron override authority increases
- May trigger patron sanctions (if override > 50)
- May escalate military situation (NATO involvement thresholds)

On acceptance by all:
- Game transitions to abbreviated verdict screen
- Territorial split from the plan applied (not from military reality)
- Scoring based on how good the deal is vs. historical outcome

### 2.5 Files

| File | Action |
|------|--------|
| `src/sim/negotiation/peace_plans.ts` | NEW — plan definitions + evaluation |
| `src/sim/negotiation/peace_plan_data.ts` | NEW — 5 historical plan configs |
| `src/sim/turn_phases/war_phases.ts` | Add `evaluate-peace-plans` step |
| `src/state/game_state.ts` | Add `pending_peace_plan` to state |
| `src/ui/map/components/PeacePlanModal.tsx` | NEW |
| `src/desktop/electron-main.cjs` | Add peace plan IPC handlers |
| `tests/peace_plans.test.ts` | NEW |

**Gate:** All 4 pre-Dayton plans fire at correct turns. Player can accept/reject. Consequences apply correctly.

---

## Phase 3: Patron Pressure & Override

**Goal:** Patron relationships evolve over the war. Override authority determines negotiation leverage.

### 3.1 Patron Pressure Engine

**New file:** `src/sim/negotiation/patron_pressure.ts`

Extends existing `patron_pressure.ts` (supply system). Adds:
- `override_authority` computation per turn
- Patron sanctions mechanics (Belgrade→RS after Contact Group rejection)
- Patron support withdrawal thresholds
- Integration with peace plan responses (rejection → override increase)

### 3.2 Override Authority Formula

```typescript
function computeOverrideAuthority(state, faction): number {
    let authority = 0;

    // Patron sanctions on client faction
    if (patronSanctionsActive(state, faction)) authority += 30;

    // Client military collapse (territory loss rate over last 10 turns)
    const lossRate = getTerritoryLossRate(state, faction, 10);
    authority += Math.min(20, lossRate * 100);

    // Client international isolation (ICTY indictments, UN resolutions)
    authority += Math.min(15, state.negotiation.capital[faction].war_crimes_events * 5);

    // Patron's own exhaustion
    authority += Math.min(15, getPatronExhaustion(state, faction));

    // Client military strength (strong army resists patron)
    const milStrength = getMilitaryStrengthRatio(state, faction);
    authority -= Math.min(25, milStrength * 25);

    // Recent defeats (NATO bombing, major operations lost)
    authority += Math.min(20, getRecentDefeats(state, faction, 8) * 10);

    return Math.max(0, Math.min(100, authority));
}
```

### 3.3 Patron Events

Scripted patron events that modify relationships:
- Contact Group rejection (1994) → Belgrade sanctions RS (+30 override)
- Srebrenica (1995) → international community override on all factions +20
- NATO bombing (1995) → RS override +20, RS supply disruption
- Washington Agreement (1994) → Croatia override on HRHB maxed, alliance locked

### 3.4 Files

| File | Action |
|------|--------|
| `src/sim/negotiation/patron_pressure.ts` | NEW (or extend existing) |
| `src/sim/negotiation/patron_events.ts` | NEW — scripted patron events |
| `src/state/negotiation_types.ts` | Add PatronRelationship fields |
| `src/sim/turn_phases/war_phases.ts` | Add `update-patron-pressure` step |
| `tests/patron_pressure.test.ts` | NEW |

**Gate:** Override authority tracks correctly over 52w run. Values match historical baseline table. Belgrade sanctions RS after Contact Group rejection.

---

## Phase 4: Dayton Negotiation Screen

**Goal:** Interactive negotiation at game end. Player trades territory + institutions using capital.

### 4.1 Territorial Packages

**New file:** `src/sim/negotiation/territorial_packages.ts`

Pre-defined packages based on real Dayton negotiations:
- Goražde corridor (RBiH demand)
- Brčko district (contested — special arbitration)
- Posavina pocket (RS/HRHB contested)
- Srebrenica area (if still held)
- Sarajevo suburbs (RS held historically, traded at Dayton)
- Western Bosnia (Bihać, Ključ, Sanski Most — Federation gains 1995)
- Mostar (HRHB/RBiH joint)
- Central Bosnia (Travnik, Zenica area)

Each package: OSID set, capital cost to demand, capital cost to concede.

### 4.2 Institutional Packages

Pre-defined institutional options:
- Military: unified (costs RS 15 capital) vs. entity armies (costs RBiH 10 capital)
- Presidency: single (costs RS 20) vs. tripartite (costs RBiH 5)
- Police: central (costs RS 10) vs. entity (costs RBiH 5)
- Judiciary: central court (costs RS 10) vs. entity courts (costs RBiH 8)
- Economy: unified taxation (costs RS 15) vs. entity autonomy (costs RBiH 10)
- Education: unified (costs RS 10) vs. entity (costs RBiH 3)

### 4.3 Negotiation UI

**New component:** `DaytonNegotiationScreen.tsx`

Full-screen negotiation interface:
- **Left panel:** Map showing current front lines + proposed entity boundary
- **Center:** Package cards (territorial + institutional) — drag to "demand" or "concede"
- **Right panel:** Capital budget (how much you've spent, how much remains)
- **Bottom:** Bot faction response indicator (will accept / will reject / will counter)
- **Patron indicator:** Locked items where patron override > 75

### 4.4 Bot Negotiation Logic

**New file:** `src/sim/negotiation/bot_negotiation.ts`

Bot evaluates proposals:
1. Compute bot's own "acceptable range" from its capital
2. For each package: would accepting this leave the bot with positive capital?
3. Patron override narrows acceptable range (at 90+, bot accepts almost anything)
4. Counter-proposals: bot removes its most expensive demand first

### 4.5 Files

| File | Action |
|------|--------|
| `src/sim/negotiation/territorial_packages.ts` | NEW |
| `src/sim/negotiation/institutional_packages.ts` | NEW |
| `src/sim/negotiation/bot_negotiation.ts` | NEW |
| `src/ui/map/components/DaytonNegotiationScreen.tsx` | NEW |
| `src/ui/map/components/NegotiationPackageCard.tsx` | NEW |
| `src/desktop/electron-main.cjs` | Dayton IPC handlers |
| `tests/dayton_negotiation.test.ts` | NEW |

**Gate:** Player can complete a Dayton negotiation. Bot responds coherently. Patron override constrains both sides. Map reflects final agreement.

---

## Phase 5: Verdict & Scoring

**Goal:** Comprehensive results screen with grading, statistics, and Pyrrhic Score.

### 5.1 Scoring Engine

**New file:** `src/sim/negotiation/scoring.ts`

Computes:
- Per-dimension grades (A+ through F) against historical anchors
- Composite Pyrrhic Score (0-100) with faction-specific weighting
- Comparison to historical Dayton outcome
- "What-if" notes (enclaves you saved/lost vs. history, operations you launched/didn't)

### 5.2 Verdict UI

**Replace/enhance:** `GameOverModal.tsx` → `VerdictScreen.tsx`

Full-screen results:
- **Header:** Date, duration, outcome type (Dayton / early plan / termination)
- **Pyrrhic Score:** Large composite number with breakdown dial
- **Report card:** 5 dimensions graded A+ through F with historical comparison
- **Map tab:** Side-by-side: your Dayton map vs. historical Dayton map
- **Statistics tab:** Full data dump (territory, casualties, refugees, operations, events)
- **Institutions tab:** What you negotiated vs. what history got
- **Timeline tab:** Key moments of your campaign vs. historical timeline

### 5.3 Files

| File | Action |
|------|--------|
| `src/sim/negotiation/scoring.ts` | NEW |
| `src/ui/map/components/VerdictScreen.tsx` | NEW (replaces GameOverModal) |
| `src/ui/map/components/VerdictReportCard.tsx` | NEW |
| `src/ui/map/components/VerdictStatistics.tsx` | NEW |
| `src/ui/map/components/VerdictMap.tsx` | NEW |
| `tests/scoring.test.ts` | NEW |

**Gate:** Full verdict screen renders with all tabs. Grades reflect gameplay quality. Pyrrhic Score computable and deterministic.

---

## Phase 6: Washington Agreement Integration

**Separate from Dayton but prerequisite for complete endgame.**

### 6.1 Washington Trigger

Extend `alliance_update.ts` with Washington Agreement triggering:
- Conditions: mutual HRHB-ARBiH exhaustion + US patron pressure + bilateral war duration > 40 weeks
- Player (as RBiH or HRHB) can accept or delay
- Bot auto-accepts when conditions met + override > 50

### 6.2 Washington Effects

On acceptance:
- Alliance locked at 0.80
- Bilateral ceasefire immediate
- HRHB entity dissolved into Federation (cosmetic — formation faction stays HRHB)
- Joint command: ARBiH and HVO formations can operate in shared sectors
- HV brigade spawning begins (see 6.3)

### 6.3 Croatian Army (HV) Integration

**New file:** `src/sim/combat/hv_integration.ts`

After Washington + preparation period (~4-8 weeks):
- Spawn 4-6 HV brigades as HRHB-faction formations
- `origin: 'hv'`, high equipment (tanks, artillery), high cohesion/morale
- Assigned to western front sectors (Krajina, Livno, Glamoč direction)
- NOT player-controlled — follow Zagreb strategic directives
- Bot AI drives them toward historical Operation Storm/Mistral objectives

### 6.4 Files

| File | Action |
|------|--------|
| `src/sim/combat/hv_integration.ts` | NEW |
| `src/sim/early_war/alliance_update.ts` | Extend Washington logic |
| `data/scenarios/officers/apr1992_officers.json` | Add HV officer entries |
| `data/source/oob_brigades.json` | Add HV brigade definitions |
| `tests/washington_agreement.test.ts` | NEW |
| `tests/hv_integration.test.ts` | NEW |

**Gate:** Washington fires at correct timing. HV brigades appear. Western front pressure increases dramatically. RS responds to the crisis.

---

## Execution Sequence

```
Phase 1 (negotiation capital)     ← START HERE
    ↓
Phase 2 (peace plans)            ← can partially parallel with Phase 3
Phase 3 (patron pressure)        ← can partially parallel with Phase 2
    ↓
Phase 6 (Washington)             ← can parallel with Phase 4
Phase 4 (Dayton negotiation)     ← depends on 1, 2, 3
    ↓
Phase 5 (verdict & scoring)      ← depends on 4
```

**Estimated total:** 6-8 focused sessions across v0.4 milestone.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Capital computation too expensive per-turn | Profile — most reads are O(n) over formations/OSID, acceptable |
| Dayton negotiation UI too complex | Start with minimal package-trading; iterate on polish |
| Bot negotiation produces nonsensical results | Transparent scoring — show WHY the bot said yes/no |
| HV brigades break calibration | HV only appears post-Washington (~w100+), 40w calibration unaffected |
| Peace plan timing misaligned with scenarios | Each scenario defines its own plan schedule offset |
| Patron override feels unfair | Clearly communicate to player HOW override built up — their past decisions caused this |

---

## Determinism Rules

- All negotiation capital computation: sorted iteration, no Math.random()
- Peace plan evaluation: deterministic trigger conditions
- Bot negotiation: deterministic response based on capital thresholds
- Patron override: formula-based, no randomness
- HV spawning: fixed brigade roster, deterministic timing

---

## Pyrrhic Rules Compliance

> **Note:** This plan was ALREADY EXECUTED (v0.3.1). Compliance sections below are retrospectively satisfied.

### /simplify Gates

```
Phase 1 (Negotiation Capital) → /simplify → commit   [RETROSPECTIVELY SATISFIED]
Phase 2∥3 (Peace Plans ∥ Patron Pressure) → /simplify → commit   [RETROSPECTIVELY SATISFIED]
Phase 4∥6 (Dayton Negotiation ∥ Washington Agreement) → /simplify → commit   [RETROSPECTIVELY SATISFIED]
Phase 5 (Verdict & Scoring) → /simplify → commit → tag   [RETROSPECTIVELY SATISFIED]
```

### Role Assignments

| Phase | Role |
|-------|------|
| Phase 1: Negotiation Capital | Systems Programmer |
| Phase 2: Peace Plan Events | Gameplay Programmer |
| Phase 3: Patron Pressure | Gameplay Programmer |
| Phase 4: Dayton Negotiation UI | UI/UX Developer |
| Phase 5: Verdict & Scoring | UI/UX Developer + Gameplay Programmer |
| Phase 6: Washington Agreement | Gameplay Programmer + Systems Programmer |

- **Orchestrator** oversees all phases.
- **Architect** makes architectural decisions — flagged for user review (not silently applied).

### Protocol Enforcement

- [x] Orchestrator oversees all phases
- [x] Architect decisions flagged for user review
- [x] Napkin read at start, updated during work
- [x] Ledger entry appended on completion
- [x] Life lessons scanned, relevant ones flagged
- [x] tsc + vitest after every phase
- [x] Version bump + tag on completion

### Completion Checklist

- [x] Implementation report in `docs/40_reports/implemented/`
- [x] Canon docs updated (if applicable)
- [x] Master files updated (if applicable)
- [x] `VERSIONING.md` milestone marked complete
- [x] `ROADMAP_TO_1_0.md` status updated
- [x] `PROJECT_LEDGER.md` entry appended
- [x] Napkin updated
- [x] `package.json` version bumped
- [x] Git tag pushed
