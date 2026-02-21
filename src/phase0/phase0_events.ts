/**
 * Phase 0 Event System: generates structured events by comparing state snapshots.
 *
 * Events are used by warroom modals (newspaper, magazine, reports) for dynamic content.
 * Pure function: same inputs = same outputs. No Math.random(), no Date.now().
 */

import type { GameState, Phase0Event } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { DECLARATION_PRESSURE_THRESHOLD, DECLARING_FACTIONS } from './declaration_pressure.js';

/** More specific event type for internal use. */
export type Phase0EventType =
    | 'declaration'
    | 'stability_change'
    | 'referendum_eligible'
    | 'referendum_held'
    | 'war_countdown'
    | 'alliance_change'
    | 'pressure_milestone';

/** Priority ordering for event types (lower = higher priority). */
const EVENT_PRIORITY: Record<string, number> = {
    declaration: 0,
    referendum_held: 1,
    referendum_eligible: 2,
    war_countdown: 3,
    stability_change: 4,
    pressure_milestone: 5,
    alliance_change: 6,
};

/**
 * Generate Phase 0 events by comparing state before and after a turn.
 * Returns a sorted array of events (deterministic ordering).
 */
export function generatePhase0Events(
    prevState: GameState,
    nextState: GameState
): Phase0Event[] {
    const events: Phase0Event[] = [];
    const turn = nextState.meta.turn;

    // 1. Declaration events
    checkDeclarations(prevState, nextState, turn, events);

    // 2. Stability changes (significant, >= 5 points)
    checkStabilityChanges(prevState, nextState, turn, events);

    // 3. Referendum eligible
    checkReferendumEligible(prevState, nextState, turn, events);

    // 4. Referendum held
    checkReferendumHeld(prevState, nextState, turn, events);

    // 5. War countdown
    checkWarCountdown(nextState, turn, events);

    // 6. Pressure milestones (25, 50, 75)
    checkPressureMilestones(prevState, nextState, turn, events);

    // 7. Alliance changes
    checkAllianceChanges(prevState, nextState, turn, events);

    // Sort: by priority (type), then faction, then municipality (all deterministic)
    events.sort((a, b) => {
        const pa = EVENT_PRIORITY[a.type] ?? 99;
        const pb = EVENT_PRIORITY[b.type] ?? 99;
        if (pa !== pb) return pa - pb;
        const fa = a.faction ?? '';
        const fb = b.faction ?? '';
        if (fa !== fb) return strictCompare(fa, fb);
        const ma = a.municipality ?? '';
        const mb = b.municipality ?? '';
        return strictCompare(ma, mb);
    });

    return events;
}

function checkDeclarations(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    for (const factionId of DECLARING_FACTIONS) {
        const prevFaction = prev.factions.find(f => f.id === factionId);
        const nextFaction = next.factions.find(f => f.id === factionId);
        if (!prevFaction || !nextFaction) continue;

        const wasDeclared = prevFaction.declared ?? false;
        const isDeclared = nextFaction.declared ?? false;

        if (!wasDeclared && isDeclared) {
            events.push({
                type: 'declaration',
                turn,
                faction: factionId,
                details: { pressure: DECLARATION_PRESSURE_THRESHOLD },
            });
        }
    }
}

function checkStabilityChanges(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    if (!next.municipalities) return;
    const munIds = Object.keys(next.municipalities).sort(strictCompare);

    for (const munId of munIds) {
        const prevMun = prev.municipalities?.[munId];
        const nextMun = next.municipalities[munId];
        if (!nextMun) continue;

        const oldScore = prevMun?.stability_score ?? 50;
        const newScore = nextMun.stability_score ?? 50;
        const diff = newScore - oldScore;

        if (Math.abs(diff) >= 5) {
            events.push({
                type: 'stability_change',
                turn,
                municipality: munId,
                details: {
                    oldScore,
                    newScore,
                    direction: diff > 0 ? 'up' : 'down',
                },
            });
        }
    }
}

function checkReferendumEligible(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    const wasEligible = prev.meta.referendum_eligible_turn != null;
    const isEligible = next.meta.referendum_eligible_turn != null;

    if (!wasEligible && isEligible) {
        events.push({
            type: 'referendum_eligible',
            turn,
            details: { eligible_turn: next.meta.referendum_eligible_turn },
        });
    }
}

function checkReferendumHeld(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    const wasHeld = prev.meta.referendum_held ?? false;
    const isHeld = next.meta.referendum_held ?? false;

    if (!wasHeld && isHeld) {
        events.push({
            type: 'referendum_held',
            turn,
            details: {
                referendum_turn: next.meta.referendum_turn,
                war_start_turn: next.meta.war_start_turn,
            },
        });
    }
}

function checkWarCountdown(
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    const warStartTurn = next.meta.war_start_turn;
    if (warStartTurn == null) return;

    const turnsRemaining = warStartTurn - turn;
    if (turnsRemaining > 0 && turnsRemaining <= 5) {
        events.push({
            type: 'war_countdown',
            turn,
            details: { turnsRemaining, warStartTurn },
        });
    }
}

function checkPressureMilestones(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    const milestones = [25, 50, 75];

    for (const factionId of DECLARING_FACTIONS) {
        const prevFaction = prev.factions.find(f => f.id === factionId);
        const nextFaction = next.factions.find(f => f.id === factionId);
        if (!prevFaction || !nextFaction) continue;

        const prevPressure = prevFaction.declaration_pressure ?? 0;
        const nextPressure = nextFaction.declaration_pressure ?? 0;

        for (const milestone of milestones) {
            if (prevPressure < milestone && nextPressure >= milestone) {
                events.push({
                    type: 'pressure_milestone',
                    turn,
                    faction: factionId,
                    details: { milestone, pressure: nextPressure },
                });
            }
        }
    }
}

function checkAllianceChanges(
    prev: GameState,
    next: GameState,
    turn: number,
    events: Phase0Event[]
): void {
    const prevRel = prev.phase0_relationships;
    const nextRel = next.phase0_relationships;
    if (!prevRel || !nextRel) return;

    const hrhbDiff = nextRel.rbih_hrhb - prevRel.rbih_hrhb;
    if (Math.abs(hrhbDiff) >= 0.05) {
        events.push({
            type: 'alliance_change',
            turn,
            details: {
                relationship: 'rbih_hrhb',
                oldValue: prevRel.rbih_hrhb,
                newValue: nextRel.rbih_hrhb,
                direction: hrhbDiff > 0 ? 'improving' : 'deteriorating',
            },
        });
    }

    const rsDiff = nextRel.rbih_rs - prevRel.rbih_rs;
    if (Math.abs(rsDiff) >= 0.05) {
        events.push({
            type: 'alliance_change',
            turn,
            details: {
                relationship: 'rbih_rs',
                oldValue: prevRel.rbih_rs,
                newValue: nextRel.rbih_rs,
                direction: rsDiff > 0 ? 'improving' : 'deteriorating',
            },
        });
    }
}
