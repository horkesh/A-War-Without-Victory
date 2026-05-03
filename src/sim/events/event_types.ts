/**
 * B1→v0.4.1 Event framework: types for trigger/effect and event definitions.
 * Deterministic: no timestamps; random events use caller-provided RNG.
 * v0.4.1: Unified Event Effect System — mechanical effects beyond narrative.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { buildOsidAdjacency } from '../combat/osid_adjacency.js';
import type { EventConstraints } from './event_constraints.js';

/** State-based condition for conditional event triggers. */
export type EventCondition =
    | { type: 'territory_control'; municipality?: string; osid?: string; faction: string; threshold?: number }
    | { type: 'alliance_below'; value: number }
    | { type: 'alliance_above'; value: number }
    | { type: 'faction_controls_municipality'; faction: string; municipality: string; threshold?: number }
    | { type: 'siege_active'; osid_or_municipality: string }
    | { type: 'operation_completed'; operation_name_pattern: string }
    | { type: 'and'; conditions: EventCondition[] }
    | { type: 'or'; conditions: EventCondition[] }
    | { type: 'not'; condition: EventCondition }
    // v0.6.0 emergent condition types
    | { type: 'supply_below'; faction: FactionId; threshold: number }
    | { type: 'supply_above'; faction: FactionId; threshold: number }
    | { type: 'territory_percentage'; faction: FactionId; comparator: 'above' | 'below'; threshold: number }
    | { type: 'dimension_above'; faction: FactionId; dimension: DimensionId; threshold: number }
    | { type: 'dimension_below'; faction: FactionId; dimension: DimensionId; threshold: number }
    | { type: 'flag_equals'; flag: string; value: string | number | boolean }
    | { type: 'flag_not_set'; flag: string }
    | { type: 'patron_pressure_above'; faction: FactionId; threshold: number }
    | { type: 'war_crimes_above'; faction: FactionId; threshold: number }
    | { type: 'morale_average_below'; faction: FactionId; threshold: number }
    | { type: 'week_since_event'; event_id: string; min_weeks?: number; max_weeks?: number }
    | { type: 'event_fire_count'; event_id: string; min_count?: number; max_count?: number }
    | { type: 'enclave_supply_status'; municipality: string; status: 'adequate' | 'strained' | 'critical' }
    | { type: 'corridor_severed'; from_osid: string; to_osid: string; faction: FactionId }
    // ─── Ring-1 divergence-event predicates (LANE-NIGHTSHIFT-ROUND2-DIVERGENCE-EVENT-SEEDS) ──
    /** True when state.political.paramilitary_mode equals the given value (defaults to 'rear_pocket' when undefined). Faction-agnostic. */
    | { type: 'paramilitary_mode_equals'; value: 'rear_pocket' | 'offensive' }
    /** Aggregates state.political.enclave_resilience entries via 'max' | 'min' | 'mean' and compares to threshold.
     *  Both bare-number and EnclaveResilienceEntry shapes are read; EnclaveResilienceEntry uses .resilience. */
    | { type: 'enclave_resilience_aggregate'; aggregate: 'max' | 'min' | 'mean'; comparator: 'above' | 'below'; threshold: number }
    /** True when the named numeric event_flag is at least `min` (missing flag treated as 0). Faction-agnostic. */
    | { type: 'flag_at_least'; flag: string; min: number }
    /** Compares an aggregate metric across two factions and (optionally) a static baseline.
     *  metric='officer_quality_avg' aggregates active brigade.officer_quality.
     *  comparator='less_than': require factionA < factionB.
     *  When baseline_drop is set, additionally require (baseline - factionA) >= baseline_drop. */
    | {
        type: 'metric_compare_factions';
        metric: 'officer_quality_avg';
        faction_a: FactionId;
        faction_b: FactionId;
        comparator: 'less_than';
        baseline?: number;
        baseline_drop?: number;
    };

/** Trigger: when to consider firing (turn range + optional prerequisites). */
export interface EventTrigger {
    /** Inclusive. Omit for no lower bound. */
    turn_min?: number;
    /** Inclusive. Omit for no upper bound. */
    turn_max?: number;
    /** Require this phase. */
    phase?: 'war';
    /** All listed event IDs must have already fired (checked against fired_event_ids). */
    requires_events?: string[];
    /** State-based condition that must be true for the event to fire. */
    condition?: EventCondition;
}

/** Effect: narrative only (no mechanical mutation). */
export interface EventEffectNarrative {
    kind: 'narrative';
    text: string;
}

/** Effect: morale delta applied to all brigades of faction. Clamped [0, 100]. */
export interface EventEffectMoraleChange {
    kind: 'morale_change';
    faction: FactionId;
    delta: number;
}

/** Effect: general supply reserve delta for faction. */
export interface EventEffectSupplyDelta {
    kind: 'supply_delta';
    faction: FactionId;
    delta: number;
}

/** Effect: cohesion delta applied to all brigades of faction. Clamped [0, 100]. */
export interface EventEffectCohesionChange {
    kind: 'cohesion_change';
    faction: FactionId;
    delta: number;
}

/** Effect: humanitarian impact (war crimes tracking). */
export interface EventEffectHumanitarianImpact {
    kind: 'humanitarian_impact';
    faction: FactionId;
    war_crimes_delta?: number;
}

/** Effect: patron pressure delta for faction. */
export interface EventEffectPatronPressure {
    kind: 'patron_pressure';
    faction: FactionId;
    delta: number;
}

/** Effect: RBiH–HRHB alliance value delta. Clamped [-1, 1]. */
export interface EventEffectAllianceChange {
    kind: 'alliance_change';
    delta: number;
}

/** Effect: negotiation capital dimension adjustment for faction. */
export interface EventEffectNegotiationBreakdown {
    kind: 'negotiation_capital';
    faction: FactionId;
    dimension: string;
    delta: number;
}

/** Effect: grant equipment (tanks/artillery) to a faction's best-equipped brigade.
 *  Zero-sum when paired with another faction's loss. Equipment starts degraded. */
export interface EventEffectEquipmentGrant {
    kind: 'equipment_grant';
    faction: FactionId;
    tanks?: number;
    artillery?: number;
    aa_systems?: number;
    /** Municipality to target — equipment goes to a brigade in this municipality if possible. */
    target_municipality?: string;
}

/** Effect: temporary aggression modifier for a faction's doctrine.
 *  Applied as a flat bonus to corps aggression for duration_turns. */
export interface EventEffectAggressionModifier {
    kind: 'aggression_modifier';
    faction: FactionId;
    delta: number;
    duration_turns: number;
}

/** Effect: flip OSID control to a faction. Used for barracks seizures, territorial events. */
export interface EventEffectControlChange {
    kind: 'control_change';
    faction: FactionId;
    osids: string[];
}

// ─── v0.9.0 Consequence System effects (Phase 1 Session 1) ──────────────────
// Writers only in this slice. Consumers land in Phase 1 Session 2.

/** Effect: guerrilla threat in faction's rear-area municipalities.
 *  Brigades stationed in listed munis lose cohesion/morale per turn,
 *  proportional to intensity. Supply routes through the area take a
 *  throughput penalty. Consumer: `guerrilla_attrition` (Session 2). */
export interface EventEffectGuerrillaThreat {
    kind: 'guerrilla_threat';
    faction: FactionId;
    municipalities: string[];
    /** Range [0, 1]. 1 = maximum attrition pressure. */
    intensity: number;
    duration_turns: number;
}

/** Effect: multiplicative modifier on a faction's recruitment pool rate.
 *  Stacks multiplicatively with existing mobilization scales.
 *  Consumer: `ongoing_mobilization` (Session 2). */
export interface EventEffectRecruitmentModifier {
    kind: 'recruitment_modifier';
    faction: FactionId;
    pool_multiplier: number;
    duration_turns: number;
}

/** Effect: pushes operation/doctrine/scope restrictions onto the existing
 *  `state.military.event_constraints` bus (see `event_constraints.ts`).
 *  Consumer path already live — `isOperationBlocked`, `getActiveDoctrineOverride`,
 *  `filterByScope` are called from bot AI. The top-level `duration_turns`
 *  stamps `expires_turn` on every pushed sub-entry, overriding any
 *  per-entry `expires_turn` in the provided `constraint`. */
export interface EventEffectDoctrineConstraint {
    kind: 'doctrine_constraint';
    faction: FactionId;
    constraint: EventConstraints;
    duration_turns: number;
}

/** Effect: lock the RBiH-HRHB alliance value at or above a floor, or at or
 *  below a ceiling, for `duration_turns`. Consumer: `alliance_change` handler
 *  clamps incoming deltas against active locks (Session 2). */
export interface EventEffectAllianceLock {
    kind: 'alliance_lock';
    mode: 'floor' | 'ceiling';
    value: number;
    duration_turns: number;
}

/** Effect: runtime additions/removals on a faction's bot strategy objectives.
 *  Merged with static `FACTION_STRATEGIES` at directive-generation time.
 *  Consumer: `bot_strategy` accessor (Session 2). */
export interface EventEffectBotPriorityShift {
    kind: 'bot_priority_shift';
    faction: FactionId;
    add_objectives?: string[];
    remove_objectives?: string[];
    duration_turns: number;
}

/** Effect: append an audit-only annotation to state.military.cost_ledger_annotations.
 *  Read by `buildCostLedger` for narrative surfaces; never drives mechanical effects.
 *  Faction-scoped when `faction` is provided. */
export interface EventEffectCostLedgerAnnotation {
    kind: 'cost_ledger_annotation';
    /** Short stable tag (e.g. 'un_safe_areas_intact'). Used as a key for downstream consumers. */
    tag: string;
    /** Optional human-readable narrative line. */
    text?: string;
    /** Optional subject faction. */
    faction?: FactionId;
}

export type EventEffect =
    | EventEffectNarrative
    | EventEffectMoraleChange
    | EventEffectSupplyDelta
    | EventEffectCohesionChange
    | EventEffectHumanitarianImpact
    | EventEffectPatronPressure
    | EventEffectAllianceChange
    | EventEffectNegotiationBreakdown
    | EventEffectEquipmentGrant
    | EventEffectAggressionModifier
    | EventEffectControlChange
    // v0.9.0 Consequence System
    | EventEffectGuerrillaThreat
    | EventEffectRecruitmentModifier
    | EventEffectDoctrineConstraint
    | EventEffectAllianceLock
    | EventEffectBotPriorityShift
    | EventEffectCostLedgerAnnotation;

/** A player/bot response option for decision events. */
export interface EventResponseOption {
    /** Response identifier, e.g. 'accept', 'reject', 'negotiate'. */
    id: string;
    /** Human-readable button label. */
    label: string;
    /** Optional longer description of consequences. */
    description?: string;
    /** Effects applied when this response is chosen. */
    effects: EventEffect[];
    // v0.6.0 metagame fields
    /** Flags set when this option is chosen. */
    sets_flags?: Record<string, string | number | boolean>;
    /** Strategic dimension shifts applied when chosen. */
    dimension_shifts?: DimensionShift[];
    /** Only appears on Nth+ firing of a recurring event. */
    available_from_fire?: number;
    /** Disappears after Nth firing of a recurring event. */
    unavailable_after_fire?: number;
    /** Bot scoring hint: aggressive commanders prefer positive values. [-1, 1] */
    aggression_affinity?: number;
    /** Bot scoring hint: cautious commanders avoid high risk. [0, 1] */
    risk_level?: number;
}

/** Event category for UI display and filtering. */
export type EventCategory = 'military' | 'political' | 'humanitarian' | 'diplomatic' | 'economic' | 'command' | 'territorial';

export interface EventDefinition {
    id: string;
    /** Display title for event UI headline. */
    title?: string;
    /** Narrative text (2-3 sentences, historically accurate, present tense). */
    narrative?: string;
    /** Event category for UI grouping and badge display. */
    category?: EventCategory;
    /** Optional illustration asset path (relative to assets dir). */
    image?: string;
    trigger: EventTrigger;
    /** Primary effect (required). */
    effect: EventEffect;
    /** Additional effects applied alongside the primary effect. */
    effects?: EventEffect[];
    /**
     * When set, event is probabilistic: fire with this probability [0,1] using rng().
     * When omitted, event fires when trigger matches (historical).
     */
    probability?: number;
    /** If true, event can fire only once (tracked via fired_event_ids on state). Default: false. */
    once?: boolean;
    /** Player choice options. When present, each affected faction must respond. */
    response_options?: EventResponseOption[];
    /** Canonical faction that must respond to this event (bot auto-respond path).
     *  Explicit over soft convention. When absent, fallback chain in evaluate_events.ts applies.
     *  Phase 3 hardening: author new events with this field set. */
    responding_faction?: FactionId;
    /** When true, blocks turn advance until the player responds. */
    requires_player_response?: boolean;
    /** How bot factions auto-respond. */
    bot_response_logic?: 'accept_first' | 'reject_all' | 'capital_based' | 'capital_weighted' | 'historical' | 'personality_weighted' | 'strategic_weighted';
    // v0.6.0 metagame fields (all optional for backward compat)
    /** Pressure system config: readiness counter with increment/decay. */
    pressure?: PressureConfig;
    /** Recurrence model: how many times this event can fire. */
    recurrence?: RecurrenceConfig;
    /** Flags set on fire (before player choice). */
    sets_flags?: Record<string, string | number | boolean>;
    /** Strategic dimension shifts on fire (before player choice). */
    dimension_shifts?: DimensionShift[];
    /** Auto-resolve after N turns if player doesn't respond. Worst option applied. */
    auto_resolve_turns?: number;
    /**
     * Lower = fires first when multiple events trigger. Default 100.
     * Priority tiers: 1=fire-or-miss anchors (single-turn windows),
     * 10=cascade prerequisites, 20=cascade consequents,
     * 50=major political, 100=default.
     */
    priority?: number;
    /** Only one event per mutex group fires per turn. */
    mutex_group?: string;
    /** Tags for querying/filtering. */
    tags?: string[];
    /** Chain: firing this event unlocks these event IDs for evaluation. */
    enables_events?: string[];
    /** ICTY/BB citation for historical grounding. */
    historical_source?: string;
}

/** A pending decision awaiting player response. Stored on MilitaryState. */
export interface PendingEventDecision {
    event_id: string;
    event_title: string;
    turn_fired: number;
    response_options: EventResponseOption[];
    /** Which faction must respond. */
    faction: FactionId;
    /** If true, the player must resolve this decision before advancing the turn. */
    requires_player_response?: boolean;
}

export interface FiredEvent {
    id: string;
    text: string;
}

export type Rng = () => number;

// ══════════════════════════════════════════════════════════════════════════════
// v0.6.0 Metagame Types
// ══════════════════════════════════════════════════════════════════════════════

/** The six strategic dimensions that track faction reputation and position. */
export type DimensionId =
    | 'military_credibility'
    | 'territorial_legitimacy'
    | 'international_standing'
    | 'patron_confidence'
    | 'internal_cohesion'
    | 'negotiating_leverage';

/** A single dimension's value: base (computed from state) + event modifier (from choices). */
export interface StrategicDimension {
    base_value: number;
    event_modifier: number;
    effective_value: number;
}

/** A shift to a strategic dimension, applied by events or response options. */
export interface DimensionShift {
    faction: FactionId;
    dimension: DimensionId;
    delta: number;
}

/** Pressure system config on an EventDefinition. */
export interface PressureConfig {
    /** Readiness increment per turn while conditions hold. */
    base_rate: number;
    /** Readiness value at which the event fires. */
    threshold: number;
    /** Readiness decay per turn when conditions lapse. */
    decay_rate: number;
    /** Situational rate adjustments. */
    modifiers?: PressureModifier[];
}

/** A conditional rate modifier for the pressure system. */
export interface PressureModifier {
    condition: EventCondition;
    rate_bonus: number;
}

/** Recurrence model for events that fire multiple times. */
export interface RecurrenceConfig {
    /** Maximum number of times this event can fire. */
    max_fires: number;
    /** Minimum turns between firings. */
    cooldown_turns: number;
    /** How stakes change on each recurrence. */
    escalation: 'static' | 'escalating' | 'deteriorating';
}

/** Check if trigger matches current state (deterministic). */
export function triggerMatches(def: EventDefinition, state: GameState, currentTurn: number, edges?: EdgeRecord[]): boolean {
    const t = def.trigger;
    if (t.turn_min != null && currentTurn < t.turn_min) return false;
    if (t.turn_max != null && currentTurn > t.turn_max) return false;
    if (t.phase != null && state.meta.phase !== t.phase) return false;
    if (t.requires_events != null && t.requires_events.length > 0) {
        const firedIds = state.military.fired_event_ids ?? [];
        if (!t.requires_events.every(id => firedIds.includes(id))) return false;
    }
    // State-based condition check
    if (t.condition) {
        if (!evaluateCondition(t.condition, state, edges)) return false;
    }
    return true;
}

/** Evaluate a state-based condition against current game state. */
export function evaluateCondition(condition: EventCondition, state: GameState, edges?: EdgeRecord[]): boolean {
    switch (condition.type) {
        case 'territory_control': {
            const pc = state.political?.political_controllers ?? {};
            if (condition.osid) {
                return pc[condition.osid] === condition.faction;
            }
            if (condition.municipality) {
                const threshold = condition.threshold ?? 0.5;
                const munOsids = Object.keys(pc).filter(osid => osid.includes(`:${condition.municipality}:`));
                if (munOsids.length === 0) return false;
                const controlled = munOsids.filter(osid => pc[osid] === condition.faction).length;
                return (controlled / munOsids.length) >= threshold;
            }
            return false;
        }
        case 'alliance_below':
            return (state.political?.war_alliance_rbih_hrhb ?? 1.0) < condition.value;
        case 'alliance_above':
            return (state.political?.war_alliance_rbih_hrhb ?? 1.0) > condition.value;
        case 'faction_controls_municipality': {
            const pc2 = state.political?.political_controllers ?? {};
            const threshold2 = condition.threshold ?? 0.5;
            const munOsids2 = Object.keys(pc2).filter(osid => osid.includes(`:${condition.municipality}:`));
            if (munOsids2.length === 0) return false;
            const controlled2 = munOsids2.filter(osid => pc2[osid] === condition.faction).length;
            return (controlled2 / munOsids2.length) >= threshold2;
        }
        case 'siege_active':
            // TODO: integrate with enclave/siege system when state fields are available
            return false;
        case 'operation_completed':
            // TODO: integrate with operation tracking when state fields are available
            return false;
        case 'and':
            return condition.conditions.every(c => evaluateCondition(c, state, edges));
        case 'or':
            return condition.conditions.some(c => evaluateCondition(c, state, edges));
        case 'not':
            return !evaluateCondition(condition.condition, state, edges);
        case 'supply_below': {
            const supply = state.military.general_supply_reserve?.[condition.faction] ?? 0;
            return supply < condition.threshold;
        }
        case 'supply_above': {
            const supply = state.military.general_supply_reserve?.[condition.faction] ?? 0;
            return supply >= condition.threshold;
        }
        case 'territory_percentage': {
            const pc = state.political?.political_controllers ?? {};
            const allOsids = Object.keys(pc);
            const factionOsids = allOsids.filter(osid => pc[osid] === condition.faction);
            const pct = allOsids.length > 0 ? factionOsids.length / allOsids.length : 0;
            return condition.comparator === 'above' ? pct >= condition.threshold : pct < condition.threshold;
        }
        case 'dimension_above': {
            const dims = state.military.negotiation?.strategic_dimensions?.[condition.faction];
            const dim = dims?.[condition.dimension];
            return (dim?.effective_value ?? 50) >= condition.threshold;
        }
        case 'dimension_below': {
            const dims = state.military.negotiation?.strategic_dimensions?.[condition.faction];
            const dim = dims?.[condition.dimension];
            return (dim?.effective_value ?? 50) < condition.threshold;
        }
        case 'flag_equals': {
            const flags = state.military.event_flags ?? {};
            return flags[condition.flag] === condition.value;
        }
        case 'flag_not_set': {
            const flags = state.military.event_flags ?? {};
            return !(condition.flag in flags);
        }
        case 'patron_pressure_above': {
            const pr = state.military.negotiation?.patron_relationships?.[condition.faction];
            return (pr?.override_authority ?? 0) >= condition.threshold;
        }
        case 'war_crimes_above': {
            const cap = state.military.negotiation?.capital?.[condition.faction];
            return (cap?.war_crimes_events ?? 0) >= condition.threshold;
        }
        case 'morale_average_below': {
            const formations = state.military?.formations ?? {};
            const factionBrigades = Object.values(formations)
                .filter((f) => f.faction === condition.faction && f.kind === 'brigade' && f.status === 'active');
            if (factionBrigades.length === 0) return false;
            const avgMorale = factionBrigades.reduce((sum, f) => sum + (f.morale ?? 50), 0) / factionBrigades.length;
            return avgMorale < condition.threshold;
        }
        case 'week_since_event': {
            const lastFired = state.military.event_last_fired_turn?.[condition.event_id];
            if (lastFired == null) return false;
            const weeksSince = (state.meta?.turn ?? 0) - lastFired;
            if (condition.min_weeks != null && weeksSince < condition.min_weeks) return false;
            if (condition.max_weeks != null && weeksSince > condition.max_weeks) return false;
            return true;
        }
        case 'event_fire_count': {
            const count = state.military.event_fire_counts?.[condition.event_id] ?? 0;
            if (condition.min_count != null && count < condition.min_count) return false;
            if (condition.max_count != null && count > condition.max_count) return false;
            return true;
        }
        case 'enclave_supply_status': {
            // Check if any OSID in target municipality has supply at or worse than target status
            const supplyByOsid = state.political?.last_supply_state_by_osid;
            if (!supplyByOsid) return false;
            const SUPPLY_SEVERITY: Record<string, number> = { adequate: 0, strained: 1, critical: 2 };
            const targetSeverity = SUPPLY_SEVERITY[condition.status] ?? 0;
            for (const osid of Object.keys(supplyByOsid)) {
                if (osid.split(':')[1] !== condition.municipality) continue;
                const osidSeverity = SUPPLY_SEVERITY[supplyByOsid[osid]] ?? 0;
                if (osidSeverity >= targetSeverity) return true;
            }
            return false;
        }
        case 'paramilitary_mode_equals': {
            // Per-brigade `paramilitary_mode` lives on BrigadeFormation. The aggregate
            // "current authorized mode" is: 'offensive' if any active formation has
            // paramilitary_mode='offensive', else 'rear_pocket'. Faction-agnostic.
            const formations = state.military?.formations ?? {};
            let anyOffensive = false;
            for (const fid of Object.keys(formations).sort()) {
                const f = formations[fid];
                if (!f || f.status !== 'active') continue;
                if (f.paramilitary_mode === 'offensive') { anyOffensive = true; break; }
            }
            const mode: 'rear_pocket' | 'offensive' = anyOffensive ? 'offensive' : 'rear_pocket';
            return mode === condition.value;
        }
        case 'enclave_resilience_aggregate': {
            const er = state.political?.enclave_resilience;
            if (!er) return false;
            const ids = Object.keys(er).sort();
            if (ids.length === 0) return false;
            const values: number[] = [];
            for (const id of ids) {
                const entry = er[id];
                if (entry == null) continue;
                const v = typeof entry === 'number' ? entry : entry.resilience;
                if (typeof v === 'number' && !Number.isNaN(v)) values.push(v);
            }
            if (values.length === 0) return false;
            let agg: number;
            if (condition.aggregate === 'max') agg = values.reduce((a, b) => a > b ? a : b, values[0]);
            else if (condition.aggregate === 'min') agg = values.reduce((a, b) => a < b ? a : b, values[0]);
            else agg = values.reduce((s, v) => s + v, 0) / values.length;
            return condition.comparator === 'above' ? agg > condition.threshold : agg < condition.threshold;
        }
        case 'flag_at_least': {
            const flags = state.military.event_flags ?? {};
            const raw = flags[condition.flag];
            const num = typeof raw === 'number' ? raw : (typeof raw === 'boolean' ? (raw ? 1 : 0) : 0);
            return num >= condition.min;
        }
        case 'metric_compare_factions': {
            const formations = state.military?.formations ?? {};
            const sortedIds = Object.keys(formations).sort();
            const collect = (faction: FactionId): number => {
                const vals: number[] = [];
                for (const fid of sortedIds) {
                    const f = formations[fid];
                    if (!f || f.faction !== faction || f.status !== 'active' || f.kind !== 'brigade') continue;
                    if (typeof f.officer_quality === 'number') vals.push(f.officer_quality);
                }
                if (vals.length === 0) return Number.NaN;
                return vals.reduce((s, v) => s + v, 0) / vals.length;
            };
            const a = collect(condition.faction_a);
            const b = collect(condition.faction_b);
            if (Number.isNaN(a) || Number.isNaN(b)) return false;
            if (condition.comparator !== 'less_than') return false;
            if (!(a < b)) return false;
            if (condition.baseline != null && condition.baseline_drop != null) {
                if (!((condition.baseline - a) >= condition.baseline_drop)) return false;
            }
            return true;
        }
        case 'corridor_severed': {
            // BFS from from_osid to to_osid through faction-controlled territory
            // If no path found, corridor is severed → return true
            const pc = state.political?.political_controllers;
            if (!pc) return false;
            if (pc[condition.from_osid] !== condition.faction) return true; // start not held
            if (pc[condition.to_osid] !== condition.faction) return true; // end not held
            // Build adjacency from edges if available
            if (!edges) return false; // can't evaluate without edges
            const adj = buildOsidAdjacency(edges);
            // BFS through faction-controlled OSIDs
            const visited = new Set<string>([condition.from_osid]);
            const queue = [condition.from_osid];
            while (queue.length > 0) {
                const current = queue.shift()!;
                if (current === condition.to_osid) return false; // path found → not severed
                for (const neighbor of adj.get(current) ?? []) {
                    if (visited.has(neighbor)) continue;
                    if (pc[neighbor] !== condition.faction) continue;
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
            return true; // no path found → corridor severed
        }
        default:
            return true;
    }
}

