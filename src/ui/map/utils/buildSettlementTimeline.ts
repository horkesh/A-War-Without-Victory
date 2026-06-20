/**
 * Build a chronological timeline of events for a single OSID.
 *
 * Data sources (currently wired):
 *   - displacement_event_log → displacement, civilian_killed
 *   - control_events → control_flip
 *   - operation_history → operation_target, operation_resolved
 *   - ethnic composition shift → ethnic_shift (computed from displacement)
 *
 * Data sources (need future engine tracking):
 *   - brigade_arrived / brigade_departed → need per-turn location_osid diffs
 *   - siege_began / supply_restored → need supply_state transition events
 *   - historical_event → need per-OSID event indexing (currently mun-level)
 */

import { getPlayerSafeOperationName } from './playerSafeText.js';

export type TimelineEventType =
    | 'control_flip'
    | 'battle'
    | 'displacement'
    | 'civilian_killed'
    | 'brigade_arrived'
    | 'brigade_departed'
    | 'siege_began'
    | 'supply_restored'
    | 'operation_target'
    | 'operation_resolved'
    | 'historical_event'
    | 'ethnic_shift';

export interface SettlementTimelineEvent {
    turn: number;
    type: TimelineEventType;
    faction?: string;
    title: string;
    detail?: string;
    casualties?: { attacker: number; defender: number };
    population?: number;
    ethnicity?: string;
    brigadeName?: string;
    outcome?: string;
}

interface DisplacementEvent {
    turn: number;
    origin_osid?: string;
    dest_osid?: string;
    origin_mun?: string;
    ethnicity?: string;
    displaced: number;
    killed: number;
    fled_abroad: number;
    settled: number;
    caused_by?: string;
}

interface ControlEvent {
    turn: number;
    settlementId: string;
    from: string | null;
    to: string | null;
    mechanism: string;
}

interface OperationHistoryEntry {
    operation_name: string;
    operation_display_name?: string;
    corps_id: string;
    faction: string;
    started_turn: number;
    ended_turn: number;
    outcome: string;
    objectives_targeted: string[];
    objectives_captured: string[];
}

/** Ethnicity label for faction key. */
function ethnicLabel(key: string): string {
    if (key === 'RBiH' || key === 'Bosniak') return 'Bosniak';
    if (key === 'RS' || key === 'Serb') return 'Serb';
    if (key === 'HRHB' || key === 'Croat') return 'Croat';
    return key;
}

/** Faction display name. */
function factionName(f: string): string {
    if (f === 'RS') return 'VRS';
    if (f === 'RBiH') return 'ARBiH';
    if (f === 'HRHB') return 'HVO';
    return f;
}

interface BattleRecord {
    turn: number;
    attacker_faction: string;
    defender_faction: string;
    outcome: string;
    attacker_casualties: number;
    defender_casualties: number;
    territory_flipped: boolean;
}

const CONTROL_MECHANISM_LABELS: Record<string, string> = {
    combat: 'combat action',
    event: 'historical control event',
    control_change: 'historical control event',
    event_control_change: 'historical control event',
    initial_control: 'initial control',
    inferred_from_displacement: 'inferred from displacement',
    displacement: 'displacement aftermath',
    paramilitary: 'paramilitary action',
    rear_pocket_consolidation: 'rear-area consolidation',
    null_claim: 'unopposed control claim',
    jna_phantom_capture: 'JNA handoff',
};

/** Control-event mechanism display name. */
function controlMechanismLabel(mechanism: string): string | undefined {
    const normalized = mechanism.trim();
    if (!normalized || normalized === 'unknown') return undefined;
    return CONTROL_MECHANISM_LABELS[normalized];
}

function isInitialControlEvent(event: ControlEvent): boolean {
    const mechanism = event.mechanism.trim();
    return event.turn === 0 && (
        mechanism === 'initial_control'
        || mechanism === 'setup_control'
        || mechanism === 'scenario_start'
        || mechanism === 'scenario_setup'
    );
}

const BATTLE_OUTCOME_LABELS: Record<string, string> = {
    decisive_victory: 'decisive victory',
    victory: 'victory',
    costly_victory: 'costly victory',
    attacker_victory: 'attacker victory',
    defender_victory: 'defender victory',
    stalemate: 'stalemate',
    repulsed: 'attack repulsed',
    catastrophic: 'catastrophic defeat',
    withdrawal: 'withdrawal',
};

/** Outcome display name. */
function outcomeName(o: string): string {
    return BATTLE_OUTCOME_LABELS[o.trim()] ?? 'outcome recorded';
}

function operationDisplayName(op: OperationHistoryEntry): string {
    const displayName = op.operation_display_name?.trim();
    if (displayName) return displayName;
    return getPlayerSafeOperationName(op.operation_name, op.corps_id, 'Operation');
}

const EVENT_OWNED_FALL_OSIDS = new Set([
    'op:srebrenica:srebrenica_2',
    'op:rogatica:zepa_2',
]);

export function buildSettlementTimeline(
    osid: string,
    munId: string | null,
    displacementEvents: DisplacementEvent[],
    controlEvents: ControlEvent[],
    operationHistory: OperationHistoryEntry[],
    battles: BattleRecord[],
    movements: Array<{ turn: number; formation_id: string; formation_name: string; type: 'arrived' | 'departed' }>,
    supplyTransitions: Array<{ turn: number; from: string; to: string }>,
    historicalEvents: Array<{ turn: number; id: string; text: string }>,
    preWarEthnic: { bosniaks: number; serbs: number; croats: number; others: number } | null,
    startController: string | null = null,
): SettlementTimelineEvent[] {
    const events: SettlementTimelineEvent[] = [];

    // --- Turn-0 initial control (from scenario snapshot) ---
    if (startController) {
        events.push({
            turn: 0,
            type: 'control_flip',
            faction: startController,
            title: `Controlled by ${factionName(startController)} at scenario start`,
            detail: 'initial control',
        });
    }

    // --- Control flips ---
    // 1. From persisted control_events (if any)
    for (const ce of controlEvents) {
        if (ce.settlementId !== osid) continue;
        const initialControl = isInitialControlEvent(ce);
        events.push({
            turn: ce.turn,
            type: 'control_flip',
            faction: ce.to ?? undefined,
            title: initialControl
                ? `Controlled by ${ce.to ? factionName(ce.to) : 'Unknown'} at scenario start`
                : `${ce.to ? factionName(ce.to) : 'Unknown'} took control`,
            detail: initialControl ? 'initial control' : controlMechanismLabel(ce.mechanism),
        });
    }
    // 2. Infer control flips from displacement events — when `caused_by` faction
    //    first appears or changes at this OSID, it means that faction took control.
    //    This covers cases where control_events is empty (not persisted in save).
    {
        const controlFlipTurns = new Set(events.filter(e => e.type === 'control_flip').map(e => e.turn));
        let lastCausedBy: string | null = null;
        const dispEventsForOsid = displacementEvents
            .filter(de => de.origin_osid === osid && de.caused_by)
            .sort((a, b) => a.turn - b.turn);
        // Count persisted (non-inferred) control events for this OSID to gate displacement inference
        const persistedFlipCount = controlEvents.filter(ce => ce.settlementId === osid).length;
        for (const de of dispEventsForOsid) {
            if (de.caused_by && de.caused_by !== lastCausedBy) {
                // Don't infer "took control" from displacement when the faction already held
                // this OSID at scenario start and no real control flip events exist
                if (startController && de.caused_by === startController && persistedFlipCount === 0) {
                    lastCausedBy = de.caused_by;
                    continue;
                }
                // Don't duplicate if we already have a control_flip event at this turn
                if (!controlFlipTurns.has(de.turn)) {
                    events.push({
                        turn: de.turn,
                        type: 'control_flip',
                        faction: de.caused_by,
                        title: `${factionName(de.caused_by)} took control`,
                        detail: 'inferred from displacement',
                    });
                    controlFlipTurns.add(de.turn);
                }
                lastCausedBy = de.caused_by;
            }
        }
    }

    // --- Battles ---
    for (const b of battles) {
        events.push({
            turn: b.turn,
            type: 'battle',
            faction: b.attacker_faction,
            title: `Battle — ${outcomeName(b.outcome)}`,
            detail: `${factionName(b.attacker_faction)} attacked ${factionName(b.defender_faction)}${b.territory_flipped ? ' · territory captured' : ''}`,
            casualties: { attacker: b.attacker_casualties, defender: b.defender_casualties },
            outcome: b.outcome,
        });
    }

    // --- Brigade movements ---
    for (const m of movements) {
        events.push({
            turn: m.turn,
            type: m.type === 'arrived' ? 'brigade_arrived' : 'brigade_departed',
            title: `${m.formation_name} ${m.type === 'arrived' ? 'stationed' : 'departed'}`,
            brigadeName: m.formation_name,
        });
    }

    // --- Supply transitions ---
    for (const t of supplyTransitions) {
        const worsened = (t.from === 'adequate' && t.to !== 'adequate') || (t.from === 'strained' && t.to === 'critical');
        events.push({
            turn: t.turn,
            type: worsened ? 'siege_began' : 'supply_restored',
            title: worsened
                ? `Supply ${t.to} (was ${t.from})`
                : `Supply restored to ${t.to} (was ${t.from})`,
        });
    }

    // --- Historical events ---
    for (const e of historicalEvents) {
        events.push({
            turn: e.turn,
            type: 'historical_event',
            title: e.text.trim() || 'Historical event recorded',
        });
    }

    // --- Displacement + civilian killed (phase-based aggregation) ---
    // Group consecutive turns of same-ethnicity displacement into phases
    // to avoid spamming the timeline with weekly displacement ticks.
    interface DispPhase { startTurn: number; endTurn: number; eth: string; displaced: number; killed: number; fled: number }
    const phasesByEth = new Map<string, DispPhase[]>();

    // Collect per-turn-per-ethnicity totals first
    const turnEthTotals = new Map<string, { turn: number; eth: string; displaced: number; killed: number; fled: number }>();
    for (const de of displacementEvents) {
        if (de.origin_osid === osid) {
            const key = `${de.turn}:${de.ethnicity ?? 'unknown'}`;
            const existing = turnEthTotals.get(key);
            if (existing) {
                existing.displaced += de.displaced;
                existing.killed += de.killed;
                existing.fled += de.fled_abroad;
            } else {
                turnEthTotals.set(key, {
                    turn: de.turn,
                    eth: de.ethnicity ?? 'unknown',
                    displaced: de.displaced,
                    killed: de.killed,
                    fled: de.fled_abroad,
                });
            }
        }
    }

    // Build phases: consecutive turns of the same ethnicity merge into one phase.
    // A gap of 3+ turns between events starts a new phase.
    const GAP_THRESHOLD = 3;
    const sorted = [...turnEthTotals.values()].sort((a, b) => a.turn - b.turn || a.eth.localeCompare(b.eth));
    for (const d of sorted) {
        if (!phasesByEth.has(d.eth)) phasesByEth.set(d.eth, []);
        const phases = phasesByEth.get(d.eth)!;
        const last = phases[phases.length - 1];
        if (last && d.turn - last.endTurn <= GAP_THRESHOLD) {
            last.endTurn = d.turn;
            last.displaced += d.displaced;
            last.killed += d.killed;
            last.fled += d.fled;
        } else {
            phases.push({ startTurn: d.turn, endTurn: d.turn, eth: d.eth, displaced: d.displaced, killed: d.killed, fled: d.fled });
        }
    }

    // Emit one displacement event per phase
    for (const phases of phasesByEth.values()) {
        for (const phase of phases) {
            if (phase.displaced > 0) {
                const span = phase.endTurn > phase.startTurn ? ` (over ${phase.endTurn - phase.startTurn + 1} weeks)` : '';
                events.push({
                    turn: phase.startTurn,
                    type: 'displacement',
                    title: `${phase.displaced.toLocaleString()} ${ethnicLabel(phase.eth)}s displaced${span}`,
                    population: phase.displaced,
                    ethnicity: phase.eth,
                });
            }
            const dead = phase.killed + phase.fled;
            if (dead > 0) {
                const parts: string[] = [];
                if (phase.killed > 0) parts.push(`${phase.killed} killed`);
                if (phase.fled > 0) parts.push(`${phase.fled} fled abroad`);
                events.push({
                    turn: phase.startTurn,
                    type: 'civilian_killed',
                    title: `${dead.toLocaleString()} ${ethnicLabel(phase.eth)} civilians lost`,
                    detail: parts.join(', '),
                    population: dead,
                    ethnicity: phase.eth,
                });
            }
        }
    }

    // --- Operations targeting this OSID ---
    for (const op of operationHistory) {
        const targeted = op.objectives_targeted?.includes(osid);
        const captured = op.objectives_captured?.includes(osid);
        const opName = operationDisplayName(op);
        if (targeted) {
            events.push({
                turn: op.started_turn,
                type: 'operation_target',
                faction: op.faction,
                title: `${opName} launched`,
                detail: `${factionName(op.faction)} targeting this area`,
            });
        }
        if (captured && EVENT_OWNED_FALL_OSIDS.has(osid)) {
            events.push({
                turn: op.ended_turn,
                type: 'operation_resolved',
                faction: op.faction,
                title: `${opName} — operation context recorded`,
                detail: 'Control change is owned by the historical event receipt.',
                outcome: op.outcome,
            });
        } else if (captured) {
            events.push({
                turn: op.ended_turn,
                type: 'operation_resolved',
                faction: op.faction,
                title: `${opName} — objective captured`,
                outcome: op.outcome,
            });
        } else if (targeted && op.ended_turn > 0) {
            events.push({
                turn: op.ended_turn,
                type: 'operation_resolved',
                faction: op.faction,
                title: `${opName} — objective not taken`,
                outcome: op.outcome,
            });
        }
    }

    // --- Ethnic majority shift (computed from cumulative displacement) ---
    if (preWarEthnic) {
        const { bosniaks, serbs, croats, others } = preWarEthnic;
        const total = bosniaks + serbs + croats + others;
        if (total > 0) {
            // Find pre-war majority
            const preWarMajority = [
                { eth: 'Bosniak', count: bosniaks },
                { eth: 'Serb', count: serbs },
                { eth: 'Croat', count: croats },
            ].sort((a, b) => b.count - a.count)[0];

            // Track cumulative departures per ethnicity
            const cumDep: Record<string, number> = {};
            const turnEvents = [...turnEthTotals.values()].sort((a, b) => a.turn - b.turn);
            let shiftDetected = false;

            for (const d of turnEvents) {
                cumDep[d.eth] = (cumDep[d.eth] ?? 0) + d.displaced + d.killed + d.fled;

                if (!shiftDetected) {
                    // Recompute current counts
                    const curBosniaks = bosniaks - (cumDep['RBiH'] ?? 0) - (cumDep['Bosniak'] ?? 0);
                    const curSerbs = serbs - (cumDep['RS'] ?? 0) - (cumDep['Serb'] ?? 0);
                    const curCroats = croats - (cumDep['HRHB'] ?? 0) - (cumDep['Croat'] ?? 0);
                    const curMajority = [
                        { eth: 'Bosniak', count: curBosniaks },
                        { eth: 'Serb', count: curSerbs },
                        { eth: 'Croat', count: curCroats },
                    ].sort((a, b) => b.count - a.count)[0];

                    if (curMajority.eth !== preWarMajority.eth && curMajority.count > 0) {
                        events.push({
                            turn: d.turn,
                            type: 'ethnic_shift',
                            title: `Ethnic majority shifted`,
                            detail: `${preWarMajority.eth} → ${curMajority.eth}`,
                        });
                        shiftDetected = true;
                    }
                }
            }
        }
    }

    // Sort by turn descending (most recent first), then by type priority
    const typePriority: Record<TimelineEventType, number> = {
        control_flip: 0,
        battle: 1,
        operation_target: 2,
        operation_resolved: 3,
        ethnic_shift: 4,
        displacement: 5,
        civilian_killed: 6,
        brigade_arrived: 7,
        brigade_departed: 8,
        siege_began: 9,
        supply_restored: 10,
        historical_event: 11,
    };

    events.sort((a, b) => {
        if (a.turn !== b.turn) return b.turn - a.turn;
        return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99);
    });

    return events;
}

/**
 * ENGINE CHANGES NEEDED for full timeline coverage:
 *
 * 1. BATTLE HISTORY PER OSID — turn_summaries only keeps last 3 turns.
 *    Need: persist all TurnBattle records in a per-OSID battle log,
 *    or load weekly_report.jsonl alongside the save file.
 *
 * 2. BRIGADE MOVEMENTS — no per-OSID arrival/departure tracking.
 *    Need: emit { turn, osid, formation_id, type: 'arrived'|'departed' }
 *    when a formation's location_osid changes. Store in a movement log.
 *
 * 3. SUPPLY STATE TRANSITIONS — supply_state_by_osid computed each turn
 *    but transitions not persisted.
 *    Need: emit { turn, osid, from: 'adequate', to: 'critical' } events
 *    when supply state changes. Store in a supply event log.
 *
 * 4. HISTORICAL EVENTS PER OSID — events_fired is turn-level, not OSID-indexed.
 *    Need: tag historical events with affected OSIDs in the event definition
 *    JSON, then filter at display time.
 *
 * 5. OPERATION PER-OBJECTIVE RESOLUTION — operation_history has objectives_captured
 *    as a list, but not per-objective turn of capture.
 *    Need: record the turn each objective was captured in the op history.
 */
