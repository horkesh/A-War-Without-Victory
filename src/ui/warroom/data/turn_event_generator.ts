/**
 * Turn event generator — delta-based event generation for newspaper,
 * ticker, and declaration modals.
 *
 * Compares current GameState against a PreviousTurnSnapshot to detect
 * what happened since last turn: control flips, battles, displacement,
 * alliance changes, sustainability collapses, exhaustion milestones.
 *
 * All iteration is sorted for determinism. No Math.random(), no timestamps.
 */

import type { FactionId, GameState, SettlementId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { classifyFactionFieldTier, type FogTier } from './fog_of_war.js';
import type { PreviousTurnSnapshot } from './warroom_state.js';

// ---------------------------------------------------------------------------
// TurnEvent
// ---------------------------------------------------------------------------

export type TurnEventType =
    | 'control_flip'
    | 'battle_casualties'
    | 'displacement'
    | 'civilian_casualties'
    | 'formation_created'
    | 'alliance_change'
    | 'sustainability_collapse'
    | 'exhaustion_milestone'
    | 'ceasefire_started'
    | 'washington_signed'
    | 'encirclement';

export interface TurnEvent {
    type: TurnEventType;
    /** Faction this event primarily concerns. */
    faction: FactionId;
    /** Fog tier from player's perspective: 1=exact, 2=partial, 3=hidden. */
    visibility: FogTier;
    /** Settlement ID if location-specific. */
    settlement?: SettlementId;
    /** Municipality ID if municipality-specific. */
    municipality?: string;
    /** Priority for sorting (lower = more important). */
    priority: number;
    /** Type-specific data. */
    details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sc(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/** Exhaustion milestone thresholds. */
const EXHAUSTION_MILESTONES = [25, 50, 75] as const;

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate TurnEvents by diffing current state against a previous snapshot.
 * If previousSnapshot is null, returns an empty array (first turn).
 */
export function generateTurnEvents(
    currentState: GameState,
    previousSnapshot: PreviousTurnSnapshot | null,
    playerFaction: FactionId,
): TurnEvent[] {
    if (!previousSnapshot) return [];

    const events: TurnEvent[] = [];

    detectControlFlips(currentState, previousSnapshot, playerFaction, events);
    detectBattleCasualties(currentState, previousSnapshot, playerFaction, events);
    detectDisplacement(currentState, previousSnapshot, playerFaction, events);
    detectCivilianCasualties(currentState, previousSnapshot, playerFaction, events);
    detectFormationCreated(currentState, previousSnapshot, playerFaction, events);
    detectAllianceChanges(currentState, previousSnapshot, playerFaction, events);
    detectSustainabilityCollapses(currentState, previousSnapshot, playerFaction, events);
    detectExhaustionMilestones(currentState, previousSnapshot, playerFaction, events);
    detectCeasefireWashington(currentState, previousSnapshot, playerFaction, events);

    // Sort by priority (lower = more important), then by type for determinism
    events.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return sc(a.type, b.type);
    });

    return events;
}

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

function detectControlFlips(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    const current = state.political_controllers ?? {};
    const previous = prev.politicalControllers;

    const allSids = new Set([...Object.keys(current), ...Object.keys(previous)]);
    const sortedSids = [...allSids].sort(sc);

    let ownGains = 0;
    let ownLosses = 0;

    for (const sid of sortedSids) {
        const oldController = previous[sid] ?? null;
        const newController = current[sid] ?? null;

        if (oldController !== newController) {
            const isOwnGain = newController === pf;
            const isOwnLoss = oldController === pf;
            if (isOwnGain) ownGains++;
            if (isOwnLoss) ownLosses++;

            const faction = newController ?? oldController ?? pf;
            const tier = classifyFactionFieldTier(faction, pf);

            events.push({
                type: 'control_flip',
                faction,
                visibility: tier,
                settlement: sid,
                priority: isOwnLoss ? 1 : isOwnGain ? 2 : 5,
                details: {
                    from: oldController,
                    to: newController,
                    isOwnGain,
                    isOwnLoss,
                },
            });
        }
    }

    // If 3+ flips happened, add a summary event (for newspaper headline priority)
    if (ownGains + ownLosses >= 3) {
        events.push({
            type: 'control_flip',
            faction: pf,
            visibility: 1,
            priority: 0, // Highest priority — multi-flip is big news
            details: {
                summary: true,
                ownGains,
                ownLosses,
                totalFlips: ownGains + ownLosses,
            },
        });
    }
}

function detectBattleCasualties(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    const factionIds = state.factions.map(f => f.id).sort(sc);

    for (const fid of factionIds) {
        const oldKilled = prev.casualtyTotals[fid]?.killed ?? 0;
        const newKilled = state.casualty_ledger?.[fid]?.killed ?? 0;
        const deltaKilled = newKilled - oldKilled;

        const oldWounded = prev.casualtyTotals[fid]?.wounded ?? 0;
        const newWounded = state.casualty_ledger?.[fid]?.wounded ?? 0;
        const deltaWounded = newWounded - oldWounded;

        if (deltaKilled > 0 || deltaWounded > 0) {
            const tier = classifyFactionFieldTier(fid, pf);
            events.push({
                type: 'battle_casualties',
                faction: fid,
                visibility: tier,
                priority: fid === pf ? 2 : 4,
                details: {
                    deltaKilled,
                    deltaWounded,
                    totalKilled: newKilled,
                },
            });
        }
    }
}

function detectDisplacement(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    if (!state.displacement_state) return;

    // Check hostile takeover timers (Record<MunicipalityId, HostileTakeoverTimerState>)
    const timers = state.hostile_takeover_timers;
    if (timers) {
        for (const munId of Object.keys(timers).sort(sc)) {
            const timer = timers[munId];
            if (!timer) continue;
            // Timer started this turn = new displacement event
            if (timer.started_turn === state.meta.turn) {
                events.push({
                    type: 'displacement',
                    faction: timer.to_faction,
                    visibility: classifyFactionFieldTier(timer.to_faction, pf),
                    municipality: timer.mun_id,
                    priority: 3,
                    details: {
                        hostileTakeover: true,
                        fromFaction: timer.from_faction,
                        toFaction: timer.to_faction,
                    },
                });
            }
        }
    }
}

function detectCivilianCasualties(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    if (!state.civilian_casualties) return;

    const fids = Object.keys(state.civilian_casualties).sort(sc);
    for (const fid of fids) {
        const oldKilled = prev.civilianKilled[fid] ?? 0;
        const newKilled = state.civilian_casualties[fid]?.killed ?? 0;
        const delta = newKilled - oldKilled;

        if (delta > 0) {
            events.push({
                type: 'civilian_casualties',
                faction: fid,
                visibility: classifyFactionFieldTier(fid, pf),
                priority: 3,
                details: { deltaKilled: delta, totalKilled: newKilled },
            });
        }
    }
}

function detectFormationCreated(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    if (!state.formations) return;

    const formIds = Object.keys(state.formations).sort(sc);
    for (const fmId of formIds) {
        const fm = state.formations[fmId];
        if (!fm) continue;
        // Formation was created this turn
        if (fm.created_turn === state.meta.turn) {
            const tier = classifyFactionFieldTier(fm.faction, pf);
            events.push({
                type: 'formation_created',
                faction: fm.faction,
                visibility: tier,
                priority: fm.faction === pf ? 4 : 6,
                details: {
                    formationId: fmId,
                    name: fm.name ?? fmId,
                    kind: fm.kind,
                },
            });
        }
    }
}

function detectAllianceChanges(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    const oldAlliance = prev.allianceValue;
    const newAlliance = state.war_alliance_rbih_hrhb ?? null;

    if (oldAlliance == null || newAlliance == null) return;

    const delta = newAlliance - oldAlliance;
    if (Math.abs(delta) < 0.01) return;

    // Significant alliance shift
    events.push({
        type: 'alliance_change',
        faction: pf,
        visibility: (pf === 'RBiH' || pf === 'HRHB') ? 1 : 3,
        priority: Math.abs(delta) > 0.10 ? 3 : 5,
        details: {
            oldValue: oldAlliance,
            newValue: newAlliance,
            delta,
            direction: delta > 0 ? 'improving' : 'deteriorating',
        },
    });

    // Check for war-between-allies (crossed below 0)
    if (oldAlliance >= 0 && newAlliance < 0) {
        events.push({
            type: 'alliance_change',
            faction: pf,
            visibility: 1,
            priority: 0,
            details: {
                allianceWar: true,
                oldValue: oldAlliance,
                newValue: newAlliance,
            },
        });
    }
}

function detectSustainabilityCollapses(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    if (!state.sustainability_state) return;

    const prevCollapsed = new Set(prev.collapsedMunicipalities);
    const munIds = Object.keys(state.sustainability_state).sort(sc);

    for (const munId of munIds) {
        const ss = state.sustainability_state[munId];
        if (ss?.collapsed && !prevCollapsed.has(munId)) {
            const controller = state.political_controllers?.[munId] ?? null;
            events.push({
                type: 'sustainability_collapse',
                faction: controller ?? pf,
                visibility: classifyFactionFieldTier(controller ?? pf, pf),
                municipality: munId,
                priority: controller === pf ? 2 : 5,
                details: { munId },
            });
        }
    }
}

function detectExhaustionMilestones(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    if (!state.war_exhaustion) return;

    const fids = Object.keys(state.war_exhaustion).sort(sc);
    for (const fid of fids) {
        const oldEx = (prev.exhaustion[fid] ?? 0) * 100; // convert to %
        const newEx = (state.war_exhaustion[fid] ?? 0) * 100;

        for (const milestone of EXHAUSTION_MILESTONES) {
            if (oldEx < milestone && newEx >= milestone) {
                events.push({
                    type: 'exhaustion_milestone',
                    faction: fid,
                    visibility: classifyFactionFieldTier(fid, pf),
                    priority: fid === pf ? 2 : 4,
                    details: {
                        milestone,
                        level: newEx,
                    },
                });
            }
        }
    }
}

function detectCeasefireWashington(
    state: GameState,
    prev: PreviousTurnSnapshot,
    pf: FactionId,
    events: TurnEvent[],
): void {
    const rhs = state.rbih_hrhb_state;
    if (!rhs) return;

    // Ceasefire just started
    if (rhs.ceasefire_active && !prev.ceasefireActive) {
        events.push({
            type: 'ceasefire_started',
            faction: pf,
            visibility: 1,
            priority: 0,
            details: {},
        });
    }

    // Washington just signed
    if (rhs.washington_signed && !prev.washingtonSigned) {
        events.push({
            type: 'washington_signed',
            faction: pf,
            visibility: 1,
            priority: 0,
            details: {},
        });
    }
}
