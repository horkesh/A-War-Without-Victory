/**
 * B1→v0.4.1 Event framework: types for trigger/effect and event definitions.
 * Deterministic: no timestamps; random events use caller-provided RNG.
 * v0.4.1: Unified Event Effect System — mechanical effects beyond narrative.
 */

import type { FactionId, GameState } from '../../state/game_state.js';

/** Trigger: when to consider firing (turn range; scenario can extend with keys later). */
export interface EventTrigger {
    /** Inclusive. Omit for no lower bound. */
    turn_min?: number;
    /** Inclusive. Omit for no upper bound. */
    turn_max?: number;
    /** Require this phase. */
    phase?: 'war';
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

export type EventEffect =
    | EventEffectNarrative
    | EventEffectMoraleChange
    | EventEffectSupplyDelta
    | EventEffectCohesionChange
    | EventEffectHumanitarianImpact
    | EventEffectPatronPressure
    | EventEffectAllianceChange
    | EventEffectNegotiationCapital;

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
    /** How bot factions auto-respond: accept_first picks first option, reject_all picks last, capital_based/capital_weighted uses negotiation capital position. */
    bot_response_logic?: 'accept_first' | 'reject_all' | 'capital_based' | 'capital_weighted';
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

/** Check if trigger matches current state (deterministic). */
export function triggerMatches(def: EventDefinition, state: GameState, currentTurn: number): boolean {
    const t = def.trigger;
    if (t.turn_min != null && currentTurn < t.turn_min) return false;
    if (t.turn_max != null && currentTurn > t.turn_max) return false;
    if (t.phase != null && state.meta.phase !== t.phase) return false;
    return true;
}

