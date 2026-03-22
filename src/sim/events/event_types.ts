/**
 * B1→v0.4.1 Event framework: types for trigger/effect and event definitions.
 * Deterministic: no timestamps; random events use caller-provided RNG.
 * v0.4.1: Unified Event Effect System — mechanical effects beyond narrative.
 */

import type { FactionId, GameState } from '../../state/game_state.js';

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
    | { type: 'corridor_severed'; from_osid: string; to_osid: string; faction: FactionId };

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
export interface EventEffectNegotiationCapital {
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

export type EventEffect =
    | EventEffectNarrative
    | EventEffectMoraleChange
    | EventEffectSupplyDelta
    | EventEffectCohesionChange
    | EventEffectHumanitarianImpact
    | EventEffectPatronPressure
    | EventEffectAllianceChange
    | EventEffectNegotiationCapital
    | EventEffectEquipmentGrant
    | EventEffectAggressionModifier;

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
    /** Lower = fires first when multiple events trigger. Default 100. */
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
export function triggerMatches(def: EventDefinition, state: GameState, currentTurn: number): boolean {
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
        if (!evaluateCondition(t.condition, state)) return false;
    }
    return true;
}

/** Evaluate a state-based condition against current game state. */
export function evaluateCondition(condition: EventCondition, state: GameState): boolean {
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
        case 'siege_active': {
            const mil = state.military as any;
            const enclaves: any[] = mil?.active_enclaves ?? [];
            return enclaves.some((e: any) =>
                e.municipality === condition.osid_or_municipality ||
                e.osids?.includes(condition.osid_or_municipality)
            );
        }
        case 'operation_completed': {
            const mil2 = state.military as any;
            const firedOps: string[] = mil2?.completed_operation_names ?? [];
            const pattern = condition.operation_name_pattern.toLowerCase();
            return firedOps.some((name: string) => name.toLowerCase().includes(pattern));
        }
        case 'and':
            return condition.conditions.every(c => evaluateCondition(c, state));
        case 'or':
            return condition.conditions.some(c => evaluateCondition(c, state));
        case 'not':
            return !evaluateCondition(condition.condition, state);
        default:
            return true;
    }
}

