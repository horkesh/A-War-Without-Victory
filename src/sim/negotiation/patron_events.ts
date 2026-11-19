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
import { applyDimensionShift } from '../events/strategic_dimensions.js';
import { applyPatronSupportDelta } from './patron_pressure.js';

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
    /**
     * Optional precondition. When set, the event fires at the first war week ≥ trigger_week
     * at which it holds, instead of exactly at trigger_week.
     */
    requires?: (state: GameState) => boolean;
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
    /**
     * §6 E2 one-carrier rule: skip `humanitarian_delta` when this catalog event id has
     * already fired (`military.event_last_fired_turn[id]` is set), because that event
     * card carries the same standing cost itself. Declarative; the applier never
     * special-cases an event id. Other fields of the effect still apply.
     */
    humanitarian_delta_unless_event_fired?: string;
}

// ── Historical patron events ──

/**
 * True once the Contact Group plan is resolved on the plan record with RS's answer
 * 'rejected'. Reads `peace_plan_history` (the single source, §6 E3a1 D3), never the card.
 */
export function rsRejectedContactGroupPlan(state: GameState): boolean {
    return (state.military.negotiation?.peace_plan_history ?? []).some(
        (h) => h.plan_id === 'contact_group' && h.resolved && h.responses?.RS === 'rejected',
    );
}

/**
 * Contact Group Plan rejection (July 1994, ~week 118 from April 1992).
 * RS rejects the 51/49 plan → Belgrade sanctions RS.
 * Historically: Milošević closed border, cut off supplies.
 *
 * §6 E4 round 3 (Q3): the one carrier of Belgrade's break. It fires only after RS has
 * rejected the plan on the record, at the first war week ≥118 where that holds. Hands-off,
 * the three contact-group response cards answer at week 118 and evaluate-peace-plans
 * resolves the plan from the log that same step (§6 E3a2), before update-patron-pressure
 * runs, so the event still fires at 118. If a card slips (cap, gate), the plan resolves at
 * its close week (120) and the event fires then. An RS acceptance never fires it.
 */
export const CONTACT_GROUP_REJECTION: PatronEvent = {
    id: 'contact_group_rejection',
    trigger_week: 118,
    requires: rsRejectedContactGroupPlan,
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
 * RS international standing: one carrier per path (§6 E2). When the
 * srebrenica_falls_1995 card fired, the card carries the RS −30 standing cost and this
 * event skips its own −30. When RS holds the town without the card ever firing, this
 * event charges the −30.
 */
export const SREBRENICA_AFTERMATH: PatronEvent = {
    id: 'srebrenica_aftermath',
    trigger_week: 170,
    // RD run review (2026-11-07): only if Srebrenica actually fell (the fall event fired, or
    // RS holds the town); fires at the first week from 170 when that is true. In the
    // historical campaign the town falls at week 162, so the event still fires at week 170.
    // §6 E2 follow-up (2026-11-17): also when the fall is recorded (`srebrenica_fell`, set by the
    // card or by the genocide rupture at a combat fall). A combat fall at t160-169 retaken before
    // w170 blocks the card (it requires `srebrenica_fell` unset), so this event charges the −30
    // once; whichever path, the standing cost is charged exactly once.
    requires: (state) =>
        state.military.event_last_fired_turn?.srebrenica_falls_1995 !== undefined
        || state.political?.political_controllers?.['op:srebrenica:srebrenica_2'] === 'RS'
        || state.military.event_flags?.srebrenica_fell === true,
    description: 'Srebrenica falls. International outrage peaks. All patrons increase pressure toward peace.',
    effects: [
        {
            faction: 'RS',
            override_delta: 20,
            humanitarian_delta: -30,
            humanitarian_delta_unless_event_fired: 'srebrenica_falls_1995',
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
 *
 * §6 E4 round 5 (2026-11-17, unanimous): carries the override only. Its former
 * `support_delta: -20` charged Belgrade's backing for a NATO act, and charged it a second
 * time: the card `deliberate_force_rs_compliance_1995` is the one carrier of the Deliberate
 * Force patron change (its net depends on RS's answer). Belgrade's backing of the VRS held
 * through autumn 1995 (BB1 pp.376, 383, 389). The 29 Aug 1995 transfer of negotiating
 * authority to Milošević is override, not support.
 */
export const NATO_BOMBING: PatronEvent = {
    id: 'nato_bombing',
    trigger_week: 175,
    description: 'NATO launches Operation Deliberate Force. RS military infrastructure targeted.',
    effects: [
        {
            faction: 'RS',
            override_delta: 20,
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
        if (event.requires) {
            if (warWeek < event.trigger_week || !event.requires(state)) continue;
        } else if (warWeek !== event.trigger_week) {
            continue;
        }

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

        // Support level changes: the one support writer (§6 E4 round 3), so a cost below
        // the floor spills into patron_confidence.
        if (effect.support_delta !== undefined) {
            applyPatronSupportDelta(neg, effect.faction, effect.support_delta);
        }

        // Sanctions
        if (effect.set_sanctions !== undefined) {
            pr.sanctions_active = effect.set_sanctions;
        }

        // Humanitarian standing changes — applied to strategic_dimensions international_standing
        // through the one accumulator rule (§6 E3a1 D1): no ±100 clamp on event_modifier.
        // §6 E2: skipped when the named event card has already fired and carried the cost.
        const humanitarianCarriedByEvent = effect.humanitarian_delta_unless_event_fired !== undefined
            && state.military.event_last_fired_turn?.[effect.humanitarian_delta_unless_event_fired] !== undefined;
        if (effect.humanitarian_delta !== undefined && !humanitarianCarriedByEvent && neg.strategic_dimensions) {
            applyDimensionShift(neg.strategic_dimensions, effect.faction, 'international_standing', effect.humanitarian_delta);
        }
    }
}
