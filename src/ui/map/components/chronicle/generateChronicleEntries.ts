export type ChronicleCardType = 'combat' | 'political' | 'humanitarian' | 'military' | 'diplomatic' | 'narrative' | 'cost' | 'personnel' | 'consequence';

export interface ChronicleEntry {
    id?: string;
    turn: number;
    type: ChronicleCardType;
    headline: boolean;
    ghost?: boolean;
    title: string;
    detail: string;
    metadata?: {
        corpsId?: string;
        osid?: string;
        operationName?: string;
        dimensionShifts?: Array<{ dimension: string; delta: number }>;
        casualties?: number;
        displaced?: number;
        costSeverity?: 'severe' | 'critical';
        netFriendlyTerritory?: number;
        ownFormationsDestroyed?: number;
        aftermathId?: string;
        operationAarId?: string;
        operationOutcome?: string;
        officerName?: string;
        officerRank?: string;
        costLedgerRef?: string;
        decisionRecordId?: string;
        codexRef?: string;
        sensitiveSignals?: Array<'atrocity' | 'rupture'>;
        imageUrl?: string;
    };
}

import { buildDecisionConsequenceLedger, type DecisionConsequenceRecord } from '../../data/decisionConsequenceLedger.js';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets.js';
import { buildConsequenceReceipts } from '../../data/consequenceReceipts.js';
import { buildWarWearinessChronicleEntries } from './warWearinessChronicle.js';
import { buildRefugeeFlowChronicleEntries } from './refugeeFlowChronicle.js';
import { buildSarajevoSiegeChronicleEntries } from './sarajevoSiegeChronicle.js';
import { buildGeneralsDigestChronicleEntries } from './generalsDigestChronicle.js';
import type { EventDefinition } from '../../../../sim/events/event_types.js';
import type { GameState } from '../../../../state/game_state.js';
import { turnToDateString } from '../../utils/formatters.js';

import {
    getPlayerSafeDisplayLabel,
    getPlayerSafeMilitaryFactionName,
    getPlayerSafeOfficerName,
    getPlayerSafeOperationName,
    getPlayerSafeSettlementName,
} from '../../utils/playerSafeText.js';

const HEADLINE_EVENT_PATTERNS = ['strategic_goals', 'state_identity', 'political_goal'];
const DIPLOMATIC_EVENT_PATTERNS = ['graz', 'ceasefire', 'alliance', 'embargo', 'conference'];
const CASUALTY_THRESHOLD = 100;
const DISPLACEMENT_THRESHOLD = 500;
const COST_FRIENDLY_CASUALTY_THRESHOLD = 50;
const COST_THEATER_CASUALTY_THRESHOLD = 150;
const COST_DISPLACEMENT_THRESHOLD = 1000;

function formatOutcome(outcome: string): string {
    switch (outcome) {
        case 'attacker_victory':
        case 'victory':
        case 'success':
            return 'Attacker advance';
        case 'defender_victory':
        case 'failed':
        case 'failure':
            return 'Defender held';
        case 'draw':
        case 'stalemate':
            return 'Indecisive action';
        case 'partial':
            return 'Partial result';
        default:
            return 'Result unreported';
    }
}

function formatOperationOutcome(outcome: string): string {
    const formatted = formatOutcome(outcome);
    return formatted ? `${formatted[0].toUpperCase()}${formatted.slice(1)}` : 'Result unreported';
}

function isDiplomaticEvent(id: string): boolean {
    return DIPLOMATIC_EVENT_PATTERNS.some(p => id.includes(p));
}

function isHeadlineEvent(id: string): boolean {
    return HEADLINE_EVENT_PATTERNS.some(p => id.includes(p));
}

function summarizeBattleCost(summary: any, playerFaction: string | null): {
    friendlyCasualties: number;
    opposingCasualties: number;
    theaterCasualties: number;
} {
    let friendlyCasualties = 0;
    let opposingCasualties = 0;
    let theaterCasualties = 0;

    for (const battle of Array.isArray(summary?.battles) ? summary.battles : []) {
        const attackerCasualties = Number(battle?.attacker_casualties ?? 0);
        const defenderCasualties = Number(battle?.defender_casualties ?? 0);
        theaterCasualties += attackerCasualties + defenderCasualties;
        if (!playerFaction) continue;
        if (battle?.attacker_faction === playerFaction) {
            friendlyCasualties += attackerCasualties;
            opposingCasualties += defenderCasualties;
        } else if (battle?.defender_faction === playerFaction) {
            friendlyCasualties += defenderCasualties;
            opposingCasualties += attackerCasualties;
        }
    }

    return { friendlyCasualties, opposingCasualties, theaterCasualties };
}

function buildTurnCostEntry(summary: any, playerFaction: string | null): ChronicleEntry | null {
    const turn = Number(summary?.turn ?? 0);
    const { friendlyCasualties, opposingCasualties, theaterCasualties } = summarizeBattleCost(summary, playerFaction);
    const displaced = Number(summary?.displacement_total ?? 0);
    const ownFormationsDestroyed = Array.isArray(summary?.formation_destructions)
        ? summary.formation_destructions.filter((formation: any) => formation?.faction === playerFaction).length
        : 0;
    const netFriendlyTerritory = playerFaction
        ? Number(summary?.territory_net?.[playerFaction] ?? 0)
        : 0;

    const playerScopedCost = playerFaction
        ? friendlyCasualties >= COST_FRIENDLY_CASUALTY_THRESHOLD
            || ownFormationsDestroyed > 0
            || displaced >= COST_DISPLACEMENT_THRESHOLD
        : theaterCasualties >= COST_THEATER_CASUALTY_THRESHOLD
            || displaced >= COST_DISPLACEMENT_THRESHOLD;
    if (!playerScopedCost) return null;

    const severity: 'severe' | 'critical' = ownFormationsDestroyed > 0
        || friendlyCasualties >= CASUALTY_THRESHOLD
        || displaced >= COST_DISPLACEMENT_THRESHOLD
        ? 'critical'
        : 'severe';

    const reasons: string[] = [];
    if (playerFaction && friendlyCasualties > 0) {
        reasons.push(`${friendlyCasualties} friendly casualties`);
    } else if (!playerFaction && theaterCasualties > 0) {
        reasons.push(`${theaterCasualties} battlefield casualties`);
    }
    if (opposingCasualties > 0) {
        reasons.push(`${opposingCasualties} opposing casualties`);
    }
    if (displaced > 0) {
        reasons.push(`${displaced} displaced`);
    }
    if (ownFormationsDestroyed > 0) {
        reasons.push(`${ownFormationsDestroyed} own ${ownFormationsDestroyed === 1 ? 'formation' : 'formations'} destroyed`);
    }
    if (playerFaction && netFriendlyTerritory !== 0) {
        reasons.push(`${netFriendlyTerritory >= 0 ? '+' : ''}${netFriendlyTerritory} net settlements`);
    }

    return {
        turn,
        type: 'cost',
        headline: severity === 'critical',
        title: severity === 'critical' ? 'Critical campaign cost' : 'Costly campaign turn',
        detail: reasons.join(' | '),
        metadata: {
            casualties: playerFaction ? friendlyCasualties : theaterCasualties,
            displaced,
            costSeverity: severity,
            netFriendlyTerritory: playerFaction ? netFriendlyTerritory : undefined,
            ownFormationsDestroyed,
        },
    };
}

function buildEndgameComparisonEntries(state: any): ChronicleEntry[] {
    if (!state?.gameOver || !state?.historicalComparison) return [];

    const comparison = state.historicalComparison as {
        divergence_notes?: string[];
        rupture_divergence?: string[];
    };
    const rawNotes = Array.isArray(comparison.divergence_notes)
        ? comparison.divergence_notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
        : [];
    const ruptureDivergence = new Set(
        Array.isArray(comparison.rupture_divergence)
            ? comparison.rupture_divergence.filter((id): id is string => typeof id === 'string' && id.length > 0)
            : [],
    );
    const turn = Number(state.turn ?? 0);

    if (rawNotes.length === 0 && ruptureDivergence.size > 0) {
        return [];
    }

    const entries: ChronicleEntry[] = [];
    const nonGhostNotes = rawNotes.filter((note) => note !== 'Srebrenica enclave survived');
    const ghostSrebrenica = !ruptureDivergence.has('srebrenica_genocide_1995');
    const visibleComparisons = nonGhostNotes.length + (ghostSrebrenica ? 1 : 0);

    entries.push({
        turn,
        type: 'narrative',
        headline: true,
        title: 'History kept its own ledger',
        detail: visibleComparisons > 0
            ? `${visibleComparisons} divergence ${visibleComparisons === 1 ? 'note' : 'notes'} marked against the historical war`
            : 'No divergence notes were recorded against the historical war',
    });

    for (const note of nonGhostNotes) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            title: 'Historical divergence',
            detail: note,
        });
    }

    if (ghostSrebrenica) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            ghost: true,
            title: 'Historical rupture absent',
            detail: 'Srebrenica enclave survived in your war; the historical July 1995 catastrophe never arrived.',
        });
    }

    return entries;
}

function sumCasualties(value: any): number {
    return Number(value?.killed ?? 0) + Number(value?.wounded ?? 0);
}

function getOperationDisplayName(op: any): string {
    const displayName = typeof op?.operation_display_name === 'string' ? op.operation_display_name.trim() : '';
    if (displayName) return displayName;
    return getPlayerSafeOperationName(
        typeof op?.operation_name === 'string' ? op.operation_name : null,
        typeof op?.corps_id === 'string' ? op.corps_id : null,
        'Operation',
    );
}

function buildOperationHistoryEntries(state: any, playerFaction: string | null): ChronicleEntry[] {
    if (!playerFaction || !Array.isArray(state?.operationHistory)) return [];

    const entries: ChronicleEntry[] = [];
    for (const op of state.operationHistory) {
        if (op?.faction !== playerFaction) continue;

        const targeted = Array.isArray(op.objectives_targeted) ? op.objectives_targeted.length : 0;
        const captured = Array.isArray(op.objectives_captured) ? op.objectives_captured.length : 0;
        const attacks = Number(op.total_attacks ?? 0);
        const suffered = sumCasualties(op.casualties_suffered);
        const inflicted = sumCasualties(op.casualties_inflicted);
        const stars = Number(op.grade?.stars ?? 0);
        const outcome = typeof op.outcome === 'string' ? op.outcome : 'unknown';
        const operationName = getOperationDisplayName(op);

        entries.push({
            id: typeof op.operation_id === 'string' ? `operation-aar-${op.operation_id}` : undefined,
            turn: Number(op.ended_turn ?? state.turn ?? 0),
            type: 'military',
            headline: captured > 0 || outcome === 'success' || outcome === 'partial',
            title: `${operationName} concluded`,
            detail: [
                formatOperationOutcome(outcome),
                `${captured}/${targeted} objectives`,
                `${attacks} attacks`,
                `${suffered} suffered / ${inflicted} inflicted`,
                `${stars} ${stars === 1 ? 'star' : 'stars'}`,
            ].join(' | '),
            metadata: {
                corpsId: typeof op.corps_id === 'string' ? op.corps_id : undefined,
                operationAarId: typeof op.operation_id === 'string' ? op.operation_id : undefined,
                operationName,
                operationOutcome: outcome,
            },
        });
    }

    return entries;
}

function buildOfficerSpotlightEntries(state: any, playerFaction: string | null): ChronicleEntry[] {
    if (!playerFaction || !Array.isArray(state?.operationHistory)) return [];

    const entries: ChronicleEntry[] = [];
    for (const op of state.operationHistory) {
        if (op?.faction !== playerFaction) continue;

        const commanderName = getPlayerSafeOfficerName(
            typeof op.commander_name === 'string' ? op.commander_name : null,
            '',
        );
        if (!commanderName) continue;

        const commanderRank = typeof op.commander_rank === 'string' && op.commander_rank.trim().length > 0
            ? op.commander_rank.trim()
            : undefined;
        const displayName = commanderRank ? `${commanderRank} ${commanderName}` : commanderName;
        const targeted = Array.isArray(op.objectives_targeted) ? op.objectives_targeted.length : 0;
        const captured = Array.isArray(op.objectives_captured) ? op.objectives_captured.length : 0;
        const attacks = Number(op.total_attacks ?? 0);
        const stars = Number(op.grade?.stars ?? 0);
        const outcome = typeof op.outcome === 'string' ? op.outcome : 'unknown';
        const operationName = getOperationDisplayName(op);

        entries.push({
            id: typeof op.operation_id === 'string' ? `officer-week-${op.operation_id}` : undefined,
            turn: Number(op.ended_turn ?? state.turn ?? 0),
            type: 'personnel',
            headline: captured > 0 || outcome === 'success' || outcome === 'partial',
            title: `Officer of the Week: ${displayName}`,
            detail: [
                operationName,
                formatOperationOutcome(outcome),
                `${captured}/${targeted} objectives`,
                `${attacks} attacks`,
                `${stars} ${stars === 1 ? 'star' : 'stars'}`,
            ].join(' | '),
            metadata: {
                corpsId: typeof op.corps_id === 'string' ? op.corps_id : undefined,
                operationAarId: typeof op.operation_id === 'string' ? op.operation_id : undefined,
                operationName,
                operationOutcome: outcome,
                officerName: commanderName,
                officerRank: commanderRank,
            },
        });
    }

    return entries;
}

function decisionRecordType(record: DecisionConsequenceRecord): ChronicleCardType {
    if (record.family === 'Army reserve' || record.family === 'Operation opportunity') return 'military';
    if (record.family.toLowerCase().includes('peace')) return 'diplomatic';
    return 'political';
}

function buildDecisionLedgerEntries(state: any): ChronicleEntry[] {
    return buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER).map((record) => ({
        id: `decision-ledger-${record.id}`,
        turn: record.turn,
        type: decisionRecordType(record),
        headline: record.recordTarget === 'chronicle',
        title: record.title,
        detail: record.detail,
        metadata: {
            decisionRecordId: record.id,
            imageUrl: getConsequenceStillForRecord(record),
        },
    }));
}

/** Chronicle cards for CONFIRMED consequence receipts — the promise→receipt
 *  loop. Each card names the originating decision and the downstream
 *  consequence the dossier predicted, now delivered by the engine. CONFIRMED
 *  only (pending/contradicted are surfaced in the Decision History overlay,
 *  not the chronicle). Requires the full event catalog for prediction lookup;
 *  collapses to [] when absent. Tone stays somber: these are recorded costs
 *  and outcomes, never gamified achievements. */
function buildConsequenceReceiptEntries(
    state: any,
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): ChronicleEntry[] {
    if (!eventCatalog || eventCatalog.size === 0) return [];
    // The persisted causality substrate lives on the runtime raw GameState
    // handle (Phase H Packet 7), not the parsed view.
    const rawState: GameState | undefined = state?.rawGameState;
    if (!rawState) return [];
    const receipts = buildConsequenceReceipts(rawState, eventCatalog);
    const entries: ChronicleEntry[] = [];
    for (const receipt of receipts) {
        if (receipt.id.startsWith('patron_defiance::')) continue;
        if (receipt.status !== 'confirmed') continue;
        if (receipt.firedTurn === null) continue;
        entries.push({
            id: `consequence-receipt-${receipt.id}`,
            turn: receipt.firedTurn,
            type: 'consequence',
            headline: false,
            title: `Consequence realized: ${receipt.predictedLabel}`,
            detail: `Your decision "${receipt.decisionOptionLabel}" on ${turnToDateString(receipt.decisionTurn)} brought this about, as the dossier warned.`,
            metadata: {
                decisionRecordId: `event:${receipt.decisionEventId}`,
            },
        });
    }
    return entries;
}

function collectDecisionEventIds(state: any): Set<string> {
    const ids = new Set<string>();
    for (const event of Array.isArray(state?.firedEvents) ? state.firedEvents : []) {
        if (event?.isDecision === true && typeof event.id === 'string') {
            ids.add(event.id);
        }
    }
    return ids;
}

export function generateChronicleEntries(
    state: any,
    eventCatalog?: ReadonlyMap<string, EventDefinition>,
): ChronicleEntry[] {
    if (!state) {
        return [];
    }

    const turnSummaries = Array.isArray(state.turnSummaries) ? state.turnSummaries : [];
    const entries: ChronicleEntry[] = [];
    const playerFaction = typeof state.player_faction === 'string' ? state.player_faction : null;
    const decisionEventIds = collectDecisionEventIds(state);

    for (const summary of turnSummaries) {
        const turn = summary.turn;

        if (Array.isArray(summary.battles)) {
            for (const battle of summary.battles) {
                const totalCasualties = (battle.attacker_casualties || 0) + (battle.defender_casualties || 0);
                if (!battle.territory_flipped && totalCasualties <= CASUALTY_THRESHOLD) continue;

                const location = getPlayerSafeSettlementName(battle.osid || '', 'this position');
                entries.push({
                    turn,
                    type: 'combat',
                    headline: battle.territory_flipped === true,
                    title: `Battle of ${location}`,
                    detail: `${formatOutcome(battle.outcome || 'unknown')} — ${totalCasualties} casualties`,
                    metadata: {
                        osid: battle.osid,
                        casualties: totalCasualties,
                    },
                });
            }
        }

        if (Array.isArray(summary.events_fired)) {
            for (const event of summary.events_fired) {
                const id = event.id || '';
                if (decisionEventIds.has(id)) continue;
                const title = getPlayerSafeDisplayLabel(event.text, 'Recorded event');

                if (isDiplomaticEvent(id)) {
                    entries.push({
                        turn,
                        type: 'diplomatic',
                        headline: true,
                        title,
                        detail: '',
                    });
                } else {
                    entries.push({
                        turn,
                        type: 'political',
                        headline: isHeadlineEvent(id),
                        title,
                        detail: '',
                    });
                }
            }
        }

        const costEntry = buildTurnCostEntry(summary, playerFaction);
        if (costEntry) {
            entries.push(costEntry);
        }

        if (summary.displacement_total > DISPLACEMENT_THRESHOLD) {
            const ethnicBreakdown = summary.displacement_by_ethnicity || {};
            const detail = Object.entries(ethnicBreakdown)
                .map(([eth, count]) => `${eth}: ${count}`)
                .join(', ');
            entries.push({
                turn,
                type: 'humanitarian',
                headline: summary.displacement_total > 5000,
                title: 'Displacement wave',
                detail: `${summary.displacement_total} displaced${detail ? ` (${detail})` : ''}`,
                metadata: {
                    displaced: summary.displacement_total,
                },
            });
        }

        if (Array.isArray(summary.formation_spawns)) {
            for (const spawn of summary.formation_spawns) {
                entries.push({
                    turn,
                    type: 'military',
                    headline: false,
                    title: `${getPlayerSafeDisplayLabel(spawn.formation_name || spawn.formation_id, 'Formation')} formed`,
                    detail: spawn.faction ? getPlayerSafeMilitaryFactionName(spawn.faction) : '',
                });
            }
        }

        if (Array.isArray(summary.formation_destructions)) {
            for (const destruction of summary.formation_destructions) {
                entries.push({
                    turn,
                    type: 'military',
                    headline: true,
                    title: `${getPlayerSafeDisplayLabel(destruction.formation_name || destruction.formation_id, 'Formation')} destroyed`,
                    detail: destruction.faction ? getPlayerSafeMilitaryFactionName(destruction.faction) : '',
                });
            }
        }

        if (Array.isArray(summary.notable_events)) {
            for (const event of summary.notable_events) {
                entries.push({
                    turn,
                    type: 'narrative',
                    headline: false,
                    title: getPlayerSafeDisplayLabel(event.text || event.id, 'Notable event'),
                    detail: '',
                });
            }
        }
    }

    entries.push(...buildEndgameComparisonEntries(state));
    entries.push(...buildOperationHistoryEntries(state, playerFaction));
    entries.push(...buildOfficerSpotlightEntries(state, playerFaction));
    entries.push(...buildDecisionLedgerEntries(state));
    entries.push(...buildConsequenceReceiptEntries(state, eventCatalog));

    // War-weariness feel surface (Collapse Repurpose Design A) — somber beats
    // when any faction has crossed an exhaustion threshold. Pure read of the
    // live war_exhaustion accumulator; monotonic ⇒ no history field needed.
    // Dated at the latest recorded turn.
    const latestTurn = turnSummaries.reduce(
        (max: number, s: any) => Math.max(max, Number(s?.turn ?? 0)),
        Number(state.turn ?? 0),
    );
    entries.push(...buildWarWearinessChronicleEntries(state.rawGameState as GameState | undefined, latestTurn));

    // Refugee-flow cadence surface (D2 mid-1995 void fill) — somber humanitarian
    // beats keyed off the persisted per-turn displacement tally: cumulative
    // milestone crossings + single-turn surges, each pinned to the week it
    // occurred. Fills the silent stretches (incl. w140-160) with ambient cadence
    // AROUND the §6 rupture; never the rupture receipt itself. Pure read.
    entries.push(...buildRefugeeFlowChronicleEntries(state.rawGameState as GameState | undefined, latestTurn));

    // Sarajevo-siege legibility surface (D2 task #41) — one somber, faction-aware
    // beat while the SRK strangles the urban core (encirclement + bombardment, the
    // city NOT stormed; Galić §389). Pure read of the per-turn strangle field
    // (last_contained_osids_by_faction.RS ∩ Sarajevo core); the core HOLDING is the
    // §6-correct outcome. Names the historical siege, never an atrocity-achievement.
    entries.push(...buildSarajevoSiegeChronicleEntries(
        state.rawGameState as GameState | undefined,
        latestTurn,
        playerFaction,
    ));

    // Generals' digest surface (D2 task #42) — "what your generals did this week". A
    // factual military beat from the player faction's chair: corps operations under way,
    // ground held/taken/lost, own attrition; a genuinely silent week earns a quiet
    // "fronts quiet" beat. It is DEAD-AIR FILLER — emitted ONLY on a turn that carries no
    // other chronicle entry (so it never displaces an AAR / event / rupture / the #439
    // cadence or #440 siege beats; ChronicleOverlay collapses multi-entry turns behind an
    // expander, which would bury the existing card). Built last, so `entries` already
    // holds every other surface — their turns are the occupied set. Military-factual only,
    // never the §6 rupture record. Pure read.
    const occupiedTurns = new Set<number>(entries.map((e) => e.turn));
    entries.push(...buildGeneralsDigestChronicleEntries(
        turnSummaries,
        playerFaction,
        (state.rawGameState as GameState | undefined)?.military?.corps_command,
        latestTurn,
        occupiedTurns,
    ));

    entries.sort((a, b) => a.turn - b.turn);
    return entries;
}
