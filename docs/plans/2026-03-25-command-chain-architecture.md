# v0.8.x Command Chain Architecture

**Date:** 2026-03-25
**Author:** Technical Architect
**Status:** DESIGN — implementation plans exist for all sections. Roadmap renumbered 2026-03-30.
**Depends on:** v0.7.0 (event flag wiring -- COMPLETE), v0.7.1 (essay template engine -- can parallel)

**SEQUENCING GATE (added 2026-03-30):** Section 1 (Political Leader Bot, v0.8.2) must not start until v0.8.1 Commander Maturity is complete. Section 1 built on a threshold machine produces illusion, not political command. See `MASTER_ROADMAP.md` v0.8.1 milestone for what must be done first.

---

## Design Philosophy

The Command Chain transforms AWWV from a game where the player issues orders and they happen, into a game where the player issues orders and *people* execute them -- or don't. This is the single most important v0.8 insight: **the gap between intent and execution is where the Bosnian War lived.**

Karadzic couldn't control Mladic. Izetbegovic couldn't control Caco. Tudjman couldn't fully control Boban. The player should feel this friction as a revelation mechanic, not a frustration mechanic. Every refusal teaches the player something about why the real war unfolded the way it did.

The architecture extends three existing systems (officer system, event system, patron pressure) and adds one new system (political leader bot). It does NOT replace any existing system.

---

## 1. Political Leader Bot (v0.8.2)

### 1.1 Purpose

Non-player factions currently auto-respond to events via `pickBotResponseV1()` in `src/sim/events/bot_response.ts`. This function uses a flat `CommanderProfile` (aggressiveness + competence) that doesn't distinguish between military and political decisions. The political leader bot replaces this with a faction-specific political personality that responds to events, manages alliance posture, sets war crimes policy, and interacts with patrons.

When the player plays RS, Izetbegovic and Boban need to make political decisions that feel like Izetbegovic and Boban -- not like generic bots picking the first option.

### 1.2 State Schema

New interface on `GameState.military`:

```typescript
// src/state/political_leader_types.ts

export type PoliticalPosture = 'hawkish' | 'moderate' | 'conciliatory';
export type WarCrimesPolicy = 'tolerate' | 'deny' | 'prevent';
export type AlliancePosture = 'committed' | 'pragmatic' | 'hostile';

export interface PoliticalLeaderProfile {
    /** Static personality loaded from scenario JSON. */
    leader_id: string;
    faction: FactionId;
    name: string;

    // Personality axes (1-5 scale, matching officer system convention)
    /** Willingness to escalate military operations. */
    hawkishness: number;
    /** Willingness to compromise at negotiating table. */
    flexibility: number;
    /** Sensitivity to international opinion. */
    international_sensitivity: number;
    /** Obedience to patron demands. */
    patron_deference: number;
    /** Tolerance for war crimes by subordinates. */
    impunity_tolerance: number;
}

export interface PoliticalLeaderState {
    leader_id: string;
    faction: FactionId;

    // Derived posture (recomputed each turn from personality + game state)
    current_posture: PoliticalPosture;
    war_crimes_policy: WarCrimesPolicy;
    alliance_posture: AlliancePosture;

    // Political capital (new resource -- see section 2)
    political_capital: number;
    political_capital_max: number;

    // Priority tracking (top 3 from set, recomputed each turn)
    current_priorities: PoliticalPriority[];

    // Relationship with player faction (if applicable)
    player_trust: number; // [0, 100] -- how much this leader trusts the player's faction

    // Decision history (for consistency -- leaders don't flip-flop)
    recent_decisions: PoliticalDecisionRecord[];
}

export type PoliticalPriority =
    | 'territorial_expansion'
    | 'territorial_defense'
    | 'diplomatic_recognition'
    | 'patron_appeasement'
    | 'military_modernization'
    | 'humanitarian_credibility'
    | 'internal_consolidation'
    | 'alliance_maintenance'
    | 'ethnic_homogeneity';

export interface PoliticalDecisionRecord {
    event_id: string;
    turn: number;
    option_chosen: string;
}
```

**Location on GameState:** `state.military.political_leaders?: Record<FactionId, PoliticalLeaderState>`

**Static data:** `state.military.political_leader_data?: PoliticalLeaderProfile[]`

This mirrors the officer system pattern: static profile loaded from JSON (`political_leader_data`), mutable state updated each turn (`political_leaders`).

### 1.3 Historical Leader Profiles

Loaded from `data/scenarios/leaders/apr1992_leaders.json`:

| Leader | Faction | Hawk | Flex | Intl Sens | Patron Def | Impunity |
|--------|---------|------|------|-----------|------------|----------|
| Karadzic | RS | 4 | 1 | 1 | 3 | 5 |
| Izetbegovic | RBiH | 2 | 3 | 5 | 2 | 1 |
| Boban | HRHB | 3 | 2 | 2 | 5 | 3 |

**Succession:** Leaders can change via events (Boban replaced by Zubak w85, Kresimir Zubak replaced by Haris Silajdzic in Federation context). Leader replacement events use the existing event system with a new effect type `leader_change`.

### 1.4 Decision Pipeline

**When:** Political leader bot runs as a new pipeline step `political-leader-decisions` in `war_phases.ts`, positioned AFTER `evaluate-events` and BEFORE `bot-corps-directives`.

**Why after events:** Events fire and queue decisions. The political leader bot resolves bot-faction decisions from those queued events using political personality instead of military personality.

**Why before corps directives:** Political decisions (war crimes policy, alliance posture, patron compliance) constrain what the military bot can do. A conciliatory leader sets a stance ceiling; a hawkish leader removes constraints.

**Decision flow:**

```
evaluate-events (existing)
    |-- fires events, queues PendingEventDecision for player faction
    |-- for non-player factions: currently auto-responds via pickBotResponseV1
    |
    v
political-leader-decisions (NEW, v0.8.2)
    |-- for each non-player faction with pending decisions:
    |     1. Read PoliticalLeaderState (posture, priorities, capital)
    |     2. Score each option using pickPoliticalResponse() (NEW)
    |     3. Apply chosen option's effects
    |-- recompute posture and priorities from current game state
    |-- emit political_directive constraints for military bot
    |
    v
bot-corps-directives (existing, modified)
    |-- reads political_directive to constrain corps stance ceilings
    |-- reads war_crimes_policy to gate paramilitary operations
```

**Key function:**

```typescript
// src/sim/political/political_leader_bot.ts

export function pickPoliticalResponse(
    leader: PoliticalLeaderState,
    profile: PoliticalLeaderProfile,
    options: EventResponseOption[],
    state: GameState,
    eventDef: EventDefinition,
): EventResponseOption {
    // Score each option on 5 axes:
    // 1. Hawkishness alignment (aggression_affinity * hawkishness)
    // 2. Diplomatic benefit (international_standing shifts * international_sensitivity)
    // 3. Patron alignment (patron_confidence shifts * patron_deference)
    // 4. Internal cohesion impact (internal_cohesion shifts)
    // 5. Consistency with recent_decisions (no flip-flopping penalty)
    //
    // Returns highest-scoring option. Deterministic.
}
```

This replaces `pickBotResponseV1` for non-player factions when political leader data is present. The existing function remains as fallback for saves without political leaders.

### 1.5 Faction Differentiation

**RS (Karadzic):**
- High hawkishness (4) + high impunity (5): tolerates war crimes, pushes military expansion
- Low flexibility (1): rejects peace plans unless patron override_authority > 70
- Moderate patron deference (3): pushes back on Belgrade but ultimately complies under sanctions
- Priorities: territorial_expansion, ethnic_homogeneity, military_modernization
- Special behavior: Contact Group rejection event -- Karadzic profile makes rejection almost certain unless player has shifted RS toward moderation via earlier events

**RBiH (Izetbegovic):**
- High international sensitivity (5): accepts UN resolutions, avoids war crimes at cost of military effectiveness
- Moderate flexibility (3): willing to negotiate but has red lines (Sarajevo, state unity)
- Low impunity (1): prevents war crimes policy -- constrains paramilitaries, sometimes at operational cost
- Priorities: diplomatic_recognition, territorial_defense, humanitarian_credibility
- Special behavior: Arms embargo events -- Izetbegovic profile maximizes international sympathy plays

**HRHB (Boban):**
- Very high patron deference (5): Zagreb controls HRHB policy
- Moderate hawkishness (3): aggressive in central Bosnia but restrained by Zagreb
- Low international sensitivity (2): HRHB operates in Croatia's shadow
- Priorities: alliance_maintenance (with Zagreb), territorial_expansion (Herzegovina), internal_consolidation
- Special behavior: When patron_deference is 5 and Tudjman calls, Boban always complies. This is the Patron Phone Call integration point.

### 1.6 Constraints Emitted to Military Bot

The political leader bot emits a `PoliticalDirective` consumed by corps directives:

```typescript
// src/sim/political/political_directive.ts

export interface PoliticalDirective {
    faction: FactionId;
    /** Maximum corps stance allowed by political leadership. */
    stance_ceiling: CorpsStance;
    /** Whether paramilitary sweeps are authorized. */
    paramilitary_authorized: boolean;
    /** Whether ethnic cleansing operations are tolerated. */
    cleansing_tolerated: boolean;
    /** Target municipalities for political priority (affects op targeting). */
    political_priority_municipalities: string[];
    /** Alliance stance toward other factions. */
    alliance_posture: Record<FactionId, AlliancePosture>;
}
```

**Location on GameState:** `state.military.political_directives?: Record<FactionId, PoliticalDirective>`

This extends the existing `PatronDirective` pattern (already on GameState as `PatronDirective` interface with `stance_ceiling`). The political directive sits BETWEEN patron pressure and military corps directives in the chain of command: Patron -> Political Leader -> Army Commander -> Corps Commander.

### 1.7 IPC Contract (Player Political Decisions)

For the PLAYER faction, the political leader bot does not auto-respond. Instead, the player makes political decisions through existing event decision UI. No new IPC channels are needed for v0.8.2 -- the existing `respond-to-event-decision` channel handles all player political choices.

New IPC channels for player political posture (optional, can defer to v0.8.4):

```
set-war-crimes-policy:  { policy: WarCrimesPolicy }
set-alliance-posture:   { target_faction: FactionId, posture: AlliancePosture }
set-political-priority: { priorities: PoliticalPriority[] }
```

These allow the player to set political constraints that their OWN military bot respects, creating the same political-military tension that non-player factions experience.

---

## 2. Order Interpretation (v0.8.3)

### 2.1 Core Concept

When the player issues a corps stance change, launches an operation, or force-launches an attack, the order passes through the assigned corps commander's personality filter. The commander may comply, creatively interpret, delay, or refuse the order. This models the historical reality: Halilovic ignoring Izetbegovic's defensive posture, Mladic overruling Karadzic's ceasefire, Praljak launching unauthorized attacks.

### 2.2 interpretOrder() Interface

```typescript
// src/sim/political/order_interpretation.ts

export type OrderInterpretation = 'comply' | 'creative' | 'delay' | 'refuse';

export interface InterpretedOrder {
    /** What the commander actually does. */
    interpretation: OrderInterpretation;
    /** Modified order parameters (for creative interpretation). */
    modified_params?: Partial<PlayerOrder>;
    /** Commander's stated reason (for UI display). */
    reason: string;
    /** Political capital cost to override this interpretation. */
    override_cost: number;
    /** Officer who interpreted the order. */
    officer_id: string;
}

export type PlayerOrder =
    | { type: 'corps_stance'; corps_id: string; stance: CorpsStance }
    | { type: 'operation_launch'; corps_id: string; operation: Partial<CorpsOperation> }
    | { type: 'operation_force_launch'; corps_id: string; operation_name: string }
    | { type: 'operation_halt'; corps_id: string; operation_name: string }
    | { type: 'sector_stance'; sector_id: string; stance: SectorStance };

export function interpretOrder(
    order: PlayerOrder,
    officer: NamedOfficer,
    officerState: NamedOfficerState,
    leaderState: PoliticalLeaderState,
    state: GameState,
): InterpretedOrder;
```

### 2.3 Officer Personality Mapping

The interpretation uses the existing officer personality fields with explicit thresholds:

```
aggressiveness (1-5):
  1-2: Cautious. Delays offensive orders. Creatively interprets "attack" as "probe."
       Complies with defensive orders enthusiastically.
  3:   Professional. Complies with most orders. May delay obviously suicidal attacks.
  4-5: Aggressive. Complies with offensive orders eagerly. May creatively interpret
       "defend" as "active defense with counterattacks." Refuses retreat orders.

competence (1-5):
  1-2: Incompetent. High chance of creative interpretation (misunderstands orders).
       Delay is common (can't organize). Override cost is LOW (easy to replace).
  3:   Average. Standard compliance rates.
  4-5: Competent. Low creative interpretation (executes precisely). Override cost is
       HIGH (you need this person).

political_reliability (1-5):
  1-2: Unreliable. The warlord problem. May refuse orders outright. May launch
       unauthorized operations (existing warlord_friction.ts). Override cost is
       VERY HIGH (removing them risks losing their brigades).
  3:   Standard. Complies with orders unless they conflict with military judgment.
  4-5: Reliable. Always complies. Political loyalist. Override cost is N/A (never refuses).
```

**Decision matrix (simplified):**

| Order Type | Agg 1-2 | Agg 3 | Agg 4-5 |
|------------|---------|-------|---------|
| Go offensive | delay/creative | comply | comply (eager) |
| Go defensive | comply | comply | creative/refuse |
| Launch op | delay | comply | comply |
| Halt op | comply | comply | delay/refuse |
| Force launch | creative (probe) | comply | comply |

**Political reliability modulates refusal:**
- `political_reliability >= 4`: Never refuses. Always complies or creatively interprets.
- `political_reliability == 3`: May delay but won't refuse.
- `political_reliability <= 2`: Can refuse outright. Existing `warlord_friction.ts` handles the stochastic check; `interpretOrder()` provides the deterministic override pathway.

**Competence modulates creative interpretation:**
- `competence >= 4`: Creative interpretation is smart (e.g., "attack" becomes "probe to assess, then attack if favorable").
- `competence <= 2`: Creative interpretation is bungled (e.g., "attack" becomes "attack the wrong objective" or "attack with insufficient force").

### 2.4 Political Capital

New resource for the player. Accumulates from political successes; spent to override officer refusals.

```typescript
// Extends PoliticalLeaderState (section 1.2)

// Accumulation sources (per turn):
// +2 base per turn (political legitimacy)
// +3 when a peace plan is accepted
// +2 when patron_confidence dimension > 60
// +1 per successful operation (victory or decisive)
// -2 when an operation fails catastrophically
// -3 when patron rejects your position
// -5 when an officer publicly refuses (and you can't override)

// Override costs:
// comply -> N/A (no override needed)
// creative -> 2 political capital (minor correction)
// delay -> 5 political capital (force the issue)
// refuse -> 10 political capital (political confrontation)
// refuse by warlord (pol_reliability <= 2) -> 15 capital (risking brigade loyalty)

const POLITICAL_CAPITAL_MAX = 50;
const POLITICAL_CAPITAL_START: Record<FactionId, number> = {
    RS: 30,    // Karadzic has strong initial political position
    RBiH: 15,  // Izetbegovic is politically constrained
    HRHB: 20,  // Boban has Zagreb backing but limited internal legitimacy
};
```

**Override mechanic:** When the player receives a refusal/delay/creative interpretation, they can spend political capital to force compliance. The UI shows the cost. If they have insufficient capital, they must accept the interpretation.

**Integration with existing warlord_friction.ts:** The existing `FrictionEvent` system fires `ignored_stance`, `unauthorized_op`, and `refused_release` events. In v0.8.3, these friction events generate `InterpretedOrder` entries that the player can override with political capital. The friction system remains the stochastic trigger; the override system provides the player agency response.

### 2.5 UI Contract

When an order is interpreted as anything other than `comply`:

1. **CoS Briefing Note** (primary channel): A new section in `CommandBriefing` (existing in `src/sim/briefing/collect_briefing.ts`) showing interpreted orders. Format: "[Commander Name] has [delayed/reinterpreted/refused] your order to [order description]. [Reason]. You may override this decision for [X] political capital."

2. **Notification Badge**: Red badge on the Army HQ Personnel tab when unresolved interpretations exist.

3. **Override Modal** (new component): `OrderInterpretationModal.tsx` -- shows the order, the commander's interpretation, the reason, and an "Override (X capital)" or "Accept" button pair. Appears when the player clicks the briefing note or notification badge.

No new IPC channels beyond:
```
override-order-interpretation: { interpretation_id: string }
accept-order-interpretation:   { interpretation_id: string }
```

**Pending interpretations** stored on GameState:
```typescript
// On MilitaryState:
pending_order_interpretations?: InterpretedOrder[];
```

Auto-resolved at turn end if player doesn't act (commander's interpretation stands).

---

## 3. Patron Phone Call Integration (v0.8.2)

### 3.1 Design Intent

Patron pressure is already tracked mechanically (`PatronRelationship.override_authority`, `support_level`). Patron events already fire at scripted weeks (`patron_events.ts`). What's missing is the *drama* -- the phone ringing at 2 AM, Milosevic threatening to cut off supplies, Tudjman ordering a ceasefire, Holbrooke delivering an ultimatum.

Patron Phone Calls are a specialized event subtype that uses the existing event system with enhanced presentation and mechanical teeth.

### 3.2 Event Format

Patron calls use the existing `EventDefinition` schema with additional fields:

```typescript
// Extension to EventDefinition in event_types.ts

export interface PatronCallMetadata {
    /** Patron identity for UI presentation. */
    patron_name: string;
    /** Patron faction (for UI styling -- Belgrade/Zagreb/UN). */
    patron_origin: 'serbia' | 'croatia' | 'international_community';
    /** Dialogue lines (ICTY-sourced or paraphrased). */
    dialogue: string[];
    /** ICTY case reference for dialogue source. */
    icty_source?: string;
    /** Urgency level affects UI presentation. */
    urgency: 'routine' | 'urgent' | 'crisis';
    /** Compliance deadline in turns. If not responded by deadline, worst option auto-applies. */
    deadline_turns?: number;
}

// On EventDefinition:
// patron_call?: PatronCallMetadata;
```

This is a single new optional field on `EventDefinition`. Events with `patron_call` set are rendered with special UI treatment (full-screen modal with dialogue, patron portrait, timer) but mechanically they are standard decision events with `response_options` and `effects`.

### 3.3 Planned Patron Call Events (8-12)

| ID | Patron | Week | Trigger | Description |
|----|--------|------|---------|-------------|
| `patron_belgrade_corridor` | Serbia | ~w8 | RS controls < 60% Posavina | "Secure the corridor or we reconsider support." |
| `patron_belgrade_drina` | Serbia | ~w12 | drina_cleansing_occurred flag | "The international community is asking questions. Be more... discrete." |
| `patron_zagreb_mostar` | Croatia | ~w20 | HRHB controls Mostar < 80% | "Mostar must be ours. Do what is necessary." |
| `patron_zagreb_ceasefire_1` | Croatia | ~w35 | alliance_below 0.3 | "We cannot be seen as aggressors. Ceasefire now." |
| `patron_belgrade_sanctions` | Serbia | ~w118 | Contact Group rejection | "I am closing the border. You are on your own." |
| `patron_ic_srebrenica` | UN/IC | ~w170 | Srebrenica falls | "The world is watching. There will be consequences." |
| `patron_ic_embargo_lift` | UN/IC | ~w100 | RBiH territory < 25% | "We are considering lifting the arms embargo." |
| `patron_zagreb_washington` | Croatia | ~w100 | Washington Agreement conditions | "Sign the agreement. This is not a request." |
| `patron_belgrade_endgame` | Serbia | ~w170 | RS losing territory | "Accept the terms. I will not protect you at The Hague." |

Events fire via the existing pressure/condition system. `trigger_week` is a guideline; actual firing depends on conditions matching (territory, flags, patron override_authority level).

### 3.4 Patron State

The existing `PatronRelationship` interface in `negotiation_types.ts` is sufficient for v0.8.2. It already tracks:
- `support_level` (0-100) -- drives supply, diplomatic cover
- `override_authority` (0-100) -- drives forced compliance
- `sanctions_active` (boolean) -- supply cutoff
- `relationship_events` (string[]) -- history

**New fields for v0.8.2** (extend `PatronRelationship`):

```typescript
// Add to PatronRelationship in negotiation_types.ts:

/** Patron's current patience (0-100). Decreases when client defies calls. */
patience: number;
/** Number of patron calls defied by client. */
calls_defied: number;
/** Number of patron calls complied with. */
calls_complied: number;
```

`patience` provides the escalation mechanic: early defiance costs little, but accumulated defiance triggers escalating consequences. At patience < 20, the patron may impose sanctions unilaterally. At patience < 10, the patron may withdraw support entirely.

### 3.5 Mechanical Consequences

**Compliance effects** (applied via standard `EventEffect`):
- Corps stance ceiling imposed (via `PoliticalDirective.stance_ceiling`)
- Aggression modifier (negative, 4-8 turns)
- Patron confidence dimension +5 to +15
- Patron patience restored partially

**Defiance effects:**
- Patron patience -10 to -25
- Patron override_authority +5 to +15
- Patron support_level -5 to -15
- At cumulative defiance thresholds:
  - 2 calls defied: support_level capped at 60
  - 4 calls defied: sanctions_active = true (if patron is Belgrade/Zagreb)
  - 6 calls defied: support_level locked at 20, override_authority > 80

**Integration with existing systems:**
- `updatePatronPressure()` in `patron_pressure.ts` already reads `override_authority` and `sanctions_active`. Patron calls feed these values; the existing pressure engine handles downstream effects.
- `computeOverrideAuthority()` already factors in sanctions, territory loss, war crimes. Patron calls add a new input channel (cumulative defiance) without replacing the formula.

---

## 4. File Layout

### 4.1 New Files

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/state/political_leader_types.ts` | Type definitions for political leader state | ~80 |
| `src/sim/political/political_leader_bot.ts` | Political leader decision engine | ~250 |
| `src/sim/political/political_directive.ts` | PoliticalDirective type + derivation | ~100 |
| `src/sim/political/order_interpretation.ts` | interpretOrder() + override logic (v0.8.3) | ~300 |
| `src/sim/political/political_capital.ts` | Capital accumulation + spending (v0.8.3) | ~120 |
| `data/scenarios/leaders/apr1992_leaders.json` | Historical leader profiles (3 entries) | ~60 |
| `data/scenarios/events/patron_calls.json` | Patron phone call events (8-12) | ~400 |
| `src/desktop/components/PatronCallModal.tsx` | Full-screen patron call UI (v0.8.2) | ~200 |
| `src/desktop/components/OrderInterpretationModal.tsx` | Override/accept UI (v0.8.3) | ~150 |
| **Total new** | | **~1,660** |

### 4.2 Modified Files

| File | Change | Scope |
|------|--------|-------|
| `src/state/game_state.ts` | Add `political_leaders`, `political_leader_data`, `political_directives`, `pending_order_interpretations` to `MilitaryState` | 8 lines |
| `src/state/negotiation_types.ts` | Add `patience`, `calls_defied`, `calls_complied` to `PatronRelationship` | 6 lines |
| `src/sim/events/event_types.ts` | Add `patron_call?: PatronCallMetadata` to `EventDefinition` | 15 lines |
| `src/sim/events/evaluate_events.ts` | Route non-player faction decisions through `pickPoliticalResponse()` when political leader data present | 20 lines |
| `src/sim/events/bot_response.ts` | No changes (kept as fallback) | 0 |
| `src/sim/turn_phases/war_phases.ts` | Add `political-leader-decisions` step after `evaluate-events` | 5 lines |
| `src/sim/combat/bot_corps_directives.ts` | Read `political_directives` for stance ceiling + paramilitary authorization | 15 lines |
| `src/sim/negotiation/patron_pressure.ts` | Integrate patience/defiance into `computeOverrideAuthority()` | 20 lines |
| `src/sim/negotiation/patron_events.ts` | Load patron calls from JSON alongside existing hardcoded events | 15 lines |
| `src/sim/briefing/collect_briefing.ts` | Add `order_interpretations` section to `CommandBriefing` (v0.8.3) | 20 lines |
| `src/desktop/electron-main.cjs` | Add IPC handlers for override/accept interpretation + political posture (4 channels) | 40 lines |
| `src/state/negotiation_types.ts` | Add `createDefaultPatronRelationship` patience field defaults | 3 lines |

### 4.3 Test Files

| File | Purpose | Est. Tests |
|------|---------|------------|
| `src/sim/political/political_leader_bot.test.ts` | Political response scoring | ~25 |
| `src/sim/political/order_interpretation.test.ts` | Interpretation decision matrix | ~40 |
| `src/sim/political/political_capital.test.ts` | Capital accumulation/spending | ~15 |
| `src/sim/political/political_directive.test.ts` | Directive derivation | ~10 |
| `src/sim/negotiation/patron_calls.test.ts` | Patron call event loading + effects | ~15 |
| **Total new tests** | | **~105** |

---

## 5. Migration / Compatibility

### 5.1 Save Format Changes

All new fields are optional (`?:`) on `MilitaryState` and `PatronRelationship`. Old saves load without political leader data and fall back to existing `pickBotResponseV1()` behavior. No migration function needed.

**Backward compatibility rule:** When `state.military.political_leader_data` is undefined or empty:
- `evaluate_events.ts` uses existing `pickBotResponseV1()` (no change)
- `bot_corps_directives.ts` ignores `political_directives` (no change)
- `patron_pressure.ts` treats missing `patience` as 100 (full patience)

### 5.2 Event System Extensions

**New EventEffect type (v0.8.2):**

```typescript
export interface EventEffectLeaderChange {
    kind: 'leader_change';
    faction: FactionId;
    new_leader_id: string;
}
```

Added to the `EventEffect` union type. Applied in `apply_effects.ts`. Swaps `political_leaders[faction]` to a new leader profile.

**New EventCondition type (v0.8.2):**

```typescript
| { type: 'patron_patience_below'; faction: FactionId; threshold: number }
| { type: 'political_capital_below'; faction: FactionId; threshold: number }
```

Added to the `EventCondition` union. Evaluated in `evaluateCondition()`. Enables events that fire when a faction's patron is running out of patience or the player is running out of political capital.

**New bot_response_logic mode:**

```typescript
// Add to EventDefinition.bot_response_logic union:
| 'political_leader'
```

When set, `evaluate_events.ts` routes the decision through `pickPoliticalResponse()` instead of `pickBotResponseV1()`. Events that represent political decisions (peace plans, alliance shifts, war crimes policy) should use this mode. Military events (corps stance, operation parameters) continue using `personality_weighted` or `strategic_weighted`.

### 5.3 Determinism

All new systems must be deterministic:
- `pickPoliticalResponse()` is pure function of (leader state, profile, options, game state). No Math.random().
- Political capital accumulation is formula-based, computed from game state fields.
- Order interpretation is deterministic given (order, officer, officer state, leader state, game state).
- Patron patience changes are additive deltas from event effects. No randomness.

### 5.4 Schema Version

`CURRENT_SCHEMA_VERSION` remains 1. All new fields are optional. If a future version requires mandatory political leader data, bump to 2 with a migration function that creates default profiles.

---

## 6. Implementation Sequence

**Note (2026-03-30):** A new Phase 0 — Commander Maturity (v0.8.1) — is gated before Phase 1. See `MASTER_ROADMAP.md`. Do not start Phase 1 until v0.8.1 is complete and the full two-tier post-run panel produces Orchestrator go/no-go.

### Phase 1: Political Leader Bot (v0.8.2, ~3 sessions)

1. **Types + Data:** `political_leader_types.ts`, `apr1992_leaders.json`, extend `MilitaryState`
2. **Decision Engine:** `political_leader_bot.ts` with `pickPoliticalResponse()`
3. **Pipeline Integration:** `political-leader-decisions` step in `war_phases.ts`, modify `evaluate_events.ts`
4. **Political Directive:** `political_directive.ts`, modify `bot_corps_directives.ts` to read directives
5. **Tests:** Political response scoring, directive derivation

### Phase 2: Patron Phone Calls (v0.8.2, ~2 sessions)

1. **Event Data:** `patron_calls.json` (8-12 events with `patron_call` metadata)
2. **Event Type Extension:** Add `PatronCallMetadata` to `EventDefinition`
3. **Patron State Extension:** Add patience/defiance fields to `PatronRelationship`
4. **Patron Pressure Integration:** Modify `computeOverrideAuthority()` for patience
5. **UI:** `PatronCallModal.tsx` (can defer to separate UI session)
6. **Tests:** Patron call loading, patience mechanics, compliance/defiance effects

### Phase 3: Order Interpretation (v0.8.3, ~3 sessions)

1. **Core Logic:** `order_interpretation.ts` with `interpretOrder()`
2. **Political Capital:** `political_capital.ts` with accumulation/spending
3. **IPC + Pipeline:** Override/accept handlers, pending interpretations on state
4. **Warlord Integration:** Connect existing `warlord_friction.ts` to interpretation system
5. **UI:** `OrderInterpretationModal.tsx`, briefing integration
6. **Tests:** Decision matrix coverage, capital edge cases, friction integration

### Phase 4: Autonomy Depth (v0.8.4, ~2 sessions)

1. **Player Political Posture IPC:** `set-war-crimes-policy`, `set-alliance-posture`, `set-political-priority`
2. **Claude API Integration:** Optional LLM-assisted political leader decisions (extends existing AI Commander architecture in `src/sim/ai_commander/`)
3. **Personality Drift:** Leader personality changes based on war outcome (hawkishness increases after defeats, flexibility increases after patron pressure)

---

## 7. Invariants

These rules must hold for the entire v0.8.x implementation:

1. **Determinism is sacred.** No Math.random(), no timestamps, no Date.now() in any new code. `strictCompare` for sorted iteration.
2. **Political leader bot is OPTIONAL.** Missing `political_leader_data` falls back to existing behavior. All saves remain loadable.
3. **Order interpretation is ADVISORY.** The player always has the option to override (at political capital cost). The system never blocks the player permanently.
4. **Patron calls are events.** They use the existing event system, not a parallel system. EventDefinition is the canonical schema.
5. **One change per calibration run.** Every phase gets a 40w regression check before proceeding.
6. **Political directives constrain, they don't replace.** Corps directives still run their full logic; political directives provide ceilings and gates, not commands.
7. **No calibration regression.** v0.8.2 should not change headless scenario outcomes when political leader data is absent. The fallback path must be identical to current behavior.

---

## 8. Open Questions for User

1. **Leader portraits:** Do we want visual assets for Karadzic/Izetbegovic/Boban in patron call modals? If so, source?
2. **Political capital visibility:** Should political capital be always visible in the HQ UI, or only shown when an interpretation event requires spending it?
3. **Patron call frequency:** 8-12 events over 180 weeks means roughly one every 15-22 weeks. Is this too sparse? Should we add recurring patron pressure calls (every N turns when conditions persist)?
4. **Order interpretation scope:** Should interpretation apply only to corps-level orders (stance, operations) or also to brigade-level orders (sector stance, posture)? Brigade-level would be more historically accurate but significantly more complex.
5. **Warlord Problem depth:** The existing `warlord_friction.ts` is stochastic and cosmetic. Should v0.8.3 make friction events mechanically binding (commander actually ignores the order), or keep them as notifications with an override option?
