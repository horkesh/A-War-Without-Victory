/**
 * Scripted Patron Events — Phase 3 of Endgame System.
 *
 * Key historical events that modify patron relationships.
 * Each event fires once when its trigger_week matches the current war week.
 *
 * Deterministic: no randomness, sorted iteration.
 *
 * Design source: docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md §3.3
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { PatronRelationship } from '../../state/negotiation_types.js';
import { clamp } from '../../utils/math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Event definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface PatronEvent {
    /** Unique event identifier — also stored in relationship_events to prevent re-fire. */
    id: string;
    /** War week (from scenario war start) when the event triggers. */
    trigger_week: number;
    /** Human-readable description. */
    description: string;
    /** Effects applied to each faction's patron relationship. */
    effects: PatronEventEffect[];
}

export interface PatronEventEffect {
    faction: FactionId;
    /** Change to override_authority (additive, clamped 0-100 after). */
    override_delta?: number;
    /** Change to support_level (additive, clamped 0-100 after). */
    support_delta?: number;
    /** Set sanctions_active to this value (if defined). */
    set_sanctions?: boolean;
    /** Cap override_authority at this maximum (if defined). */
    override_max?: number;
    /** Change to international_standing strategic dimension. */
    humanitarian_delta?: number;
}

// ── Historical patron events ──

/**
 * Contact Group Plan rejection (July 1994, ~week 118 from April 1992).
 * RS rejects the 51/49 plan → Belgrade sanctions RS.
 * Historically: Milošević closed border, cut off supplies.
 */
export const CONTACT_GROUP_REJECTION: PatronEvent = {
    id: 'contact_group_rejection',
    trigger_week: 118,
    description: 'RS rejects the Contact Group Plan. Belgrade imposes sanctions on Pale.',
    effects: [
        {
            faction: 'RS',
            override_delta: 30,
            support_delta: -15,
            set_sanctions: true,
        },
    ],
};

/**
 * Srebrenica aftermath (July 1995, ~week 170 from April 1992).
 * International community horrified. All factions' patrons increase pressure.
 * RS humanitarian standing devastated.
 */
export const SREBRENICA_AFTERMATH: PatronEvent = {
    id: 'srebrenica_aftermath',
    trigger_week: 170,
    description: 'Srebrenica falls. International outrage peaks. All patrons increase pressure toward peace.',
    effects: [
        {
            faction: 'RS',
            override_delta: 20,
            humanitarian_delta: -30,
        },
        {
            faction: 'RBiH',
            override_delta: 20,
        },
        {
            faction: 'HRHB',
            override_delta: 20,
        },
    ],
};

/**
 * NATO bombing campaign (August-September 1995, ~week 175 from April 1992).
 * Operation Deliberate Force. RS military capability degraded, patron pressure peaks.
 */
export const NATO_BOMBING: PatronEvent = {
    id: 'nato_bombing',
    trigger_week: 175,
    description: 'NATO launches Operation Deliberate Force. RS military infrastructure targeted.',
    effects: [
        {
            faction: 'RS',
            override_delta: 20,
            support_delta: -20,
        },
    ],
};

/**
 * Washington Agreement (March 1994, ~week 104 from April 1992).
 * Croatia takes full control of HRHB policy. Override maxed, alliance locked.
 */
export const WASHINGTON_AGREEMENT: PatronEvent = {
    id: 'washington_agreement',
    trigger_week: 104,
    description: 'Washington Agreement signed. Croatia assumes full authority over HRHB policy.',
    effects: [
        {
            faction: 'HRHB',
            override_max: 85,
            support_delta: 10,
        },
    ],
};

/** All scripted patron events, sorted by trigger_week. */
export const ALL_PATRON_EVENTS: PatronEvent[] = [
    WASHINGTON_AGREEMENT,       // week 104
    CONTACT_GROUP_REJECTION,    // week 118
    SREBRENICA_AFTERMATH,       // week 170
    NATO_BOMBING,               // week 175
];

// ═══════════════════════════════════════════════════════════════════════════
// Event evaluation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if any patron event should fire this turn and apply effects.
 * Each event fires exactly once (tracked via relationship_events).
 */
export function evaluatePatronEvents(state: GameState): void {
    const neg = state.military.negotiation;
    if (!neg) return;

    const warStartTurn = state.meta.war_start_turn ?? 0;
    const warWeek = state.meta.turn - warStartTurn;

    for (const event of ALL_PATRON_EVENTS) {
        if (warWeek !== event.trigger_week) continue;

        // Check if already fired (look in any affected faction's events)
        const alreadyFired = event.effects.some(eff => {
            const pr = neg.patron_relationships[eff.faction];
            return pr?.relationship_events.includes(event.id);
        });
        if (alreadyFired) continue;

        // Apply effects
        applyPatronEvent(state, event);
    }
}

/**
 * Apply a patron event's effects to the game state.
 */
export function applyPatronEvent(state: GameState, event: PatronEvent): void {
    const neg = state.military.negotiation;
    if (!neg) return;

    for (const effect of event.effects) {
        const pr = neg.patron_relationships[effect.faction];
        if (!pr) continue;

        // Record event
        pr.relationship_events.push(event.id);

        // Override authority changes
        if (effect.override_delta !== undefined) {
            pr.override_authority = clamp(
                pr.override_authority + effect.override_delta,
                0,
                100
            );
        }

        // Override authority cap
        if (effect.override_max !== undefined) {
            pr.override_authority = Math.max(pr.override_authority, effect.override_max);
        }

        // Support level changes
        if (effect.support_delta !== undefined) {
            pr.support_level = clamp(
                pr.support_level + effect.support_delta,
                0,
                100
            );
        }

        // Sanctions
        if (effect.set_sanctions !== undefined) {
            pr.sanctions_active = effect.set_sanctions;
        }

        // Humanitarian standing changes — now applied to strategic_dimensions
        // TODO: Apply humanitarian_delta to international_standing dimension instead
        if (effect.humanitarian_delta !== undefined && neg.strategic_dimensions?.[effect.faction]) {
            const dim = neg.strategic_dimensions[effect.faction]['international_standing'];
            if (dim) {
                dim.event_modifier = clamp(dim.event_modifier + effect.humanitarian_delta, -100, 100);
                dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
            }
        }
    }
}
