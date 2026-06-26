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

import {
    buildDecisionConsequenceLedger,
    resolveDecisionConsequenceCopy,
    type DecisionConsequenceRecord,
} from '../../data/decisionConsequenceLedger.js';
import { getConsequenceStillForRecord } from '../../data/presidentialDeskAssets.js';
import { buildConsequenceReceipts } from '../../data/consequenceReceipts.js';
import { buildWarWearinessChronicleEntries } from './warWearinessChronicle.js';
import { buildRefugeeFlowChronicleEntries } from './refugeeFlowChronicle.js';
import { buildSarajevoSiegeChronicleEntries } from './sarajevoSiegeChronicle.js';
import { buildGeneralsDigestChronicleEntries } from './generalsDigestChronicle.js';
import { shouldNarrateTerritorySummary } from '../../data/territorySummaryGuard.js';
import { t, type MessageKey } from '../../i18n/index.js';
import type { EventDefinition } from '../../../../sim/events/event_types.js';
import type { GameState } from '../../../../state/game_state.js';
import { turnToDateString } from '../../utils/formatters.js';
import { playerFactionMatch } from '../../data/playerFactionMatch.js';

import {
    getPlayerSafeDisplacementGroupLabel,
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

function reportedNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatOutcome(outcome: string): string {
    let key: MessageKey;
    switch (outcome) {
        case 'attacker_victory':
        case 'victory':
        case 'success':
            key = 'chronicle.generated.outcome.attackerAdvance';
            break;
        case 'defender_victory':
        case 'failed':
        case 'failure':
            key = 'chronicle.generated.outcome.defenderHeld';
            break;
        case 'draw':
        case 'stalemate':
            key = 'chronicle.generated.outcome.indecisive';
            break;
        case 'partial':
            key = 'chronicle.generated.outcome.partial';
            break;
        default:
            key = 'chronicle.generated.outcome.unreported';
            break;
    }
    return t(key);
}

function formatOperationOutcome(outcome: string): string {
    return formatOutcome(outcome);
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
    casualtiesReported: boolean;
} {
    let friendlyCasualties = 0;
    let opposingCasualties = 0;
    let theaterCasualties = 0;

    let casualtiesReported = false;

    for (const battle of Array.isArray(summary?.battles) ? summary.battles : []) {
        if (battle?.casualties_reported === false) continue;
        const attackerCasualties = reportedNumber(battle?.attacker_casualties);
        const defenderCasualties = reportedNumber(battle?.defender_casualties);
        if (attackerCasualties === null || defenderCasualties === null) continue;
        casualtiesReported = true;
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

    return { friendlyCasualties, opposingCasualties, theaterCasualties, casualtiesReported };
}

function buildTurnCostEntry(summary: any, playerFaction: string | null): ChronicleEntry | null {
    const turn = Number(summary?.turn ?? 0);
    const { friendlyCasualties, opposingCasualties, theaterCasualties, casualtiesReported } = summarizeBattleCost(summary, playerFaction);
    const reportedDisplacement = reportedNumber(summary?.displacement_total);
    const displaced = reportedDisplacement ?? 0;
    const ownFormationsDestroyed = Array.isArray(summary?.formation_destructions)
        ? summary.formation_destructions.filter((formation: any) => formation?.faction === playerFaction).length
        : 0;
    const netFriendlyTerritory = playerFaction
        ? Number(summary?.territory_net?.[playerFaction] ?? 0)
        : 0;
    const narrateTerritory = shouldNarrateTerritorySummary(summary);

    const playerScopedCost = playerFaction
        ? (casualtiesReported && friendlyCasualties >= COST_FRIENDLY_CASUALTY_THRESHOLD)
            || ownFormationsDestroyed > 0
            || displaced >= COST_DISPLACEMENT_THRESHOLD
        : (casualtiesReported && theaterCasualties >= COST_THEATER_CASUALTY_THRESHOLD)
            || displaced >= COST_DISPLACEMENT_THRESHOLD;
    if (!playerScopedCost) return null;

    const severity: 'severe' | 'critical' = ownFormationsDestroyed > 0
        || (casualtiesReported && friendlyCasualties >= CASUALTY_THRESHOLD)
        || displaced >= COST_DISPLACEMENT_THRESHOLD
        ? 'critical'
        : 'severe';

    const reasons: string[] = [];
    if (playerFaction && friendlyCasualties > 0) {
        reasons.push(t('chronicle.generated.cost.friendlyCasualties', { count: friendlyCasualties }));
    } else if (!playerFaction && theaterCasualties > 0) {
        reasons.push(t('chronicle.generated.cost.battlefieldCasualties', { count: theaterCasualties }));
    }
    if (opposingCasualties > 0) {
        reasons.push(t('chronicle.generated.cost.opposingCasualties', { count: opposingCasualties }));
    }
    if (displaced > 0) {
        reasons.push(t('chronicle.generated.cost.displaced', { count: displaced }));
    }
    if (ownFormationsDestroyed > 0) {
        reasons.push(t(
            ownFormationsDestroyed === 1
                ? 'chronicle.generated.cost.ownFormationDestroyed.one'
                : 'chronicle.generated.cost.ownFormationDestroyed.many',
            { count: ownFormationsDestroyed },
        ));
    }
    if (playerFaction && narrateTerritory && netFriendlyTerritory !== 0) {
        reasons.push(t('chronicle.generated.cost.netSettlements', {
            count: `${netFriendlyTerritory >= 0 ? '+' : ''}${netFriendlyTerritory}`,
        }));
    }

    return {
        turn,
        type: 'cost',
        headline: severity === 'critical',
        title: severity === 'critical'
            ? t('chronicle.generated.cost.title.critical')
            : t('chronicle.generated.cost.title.severe'),
        detail: reasons.join(' | '),
        metadata: {
            ...(casualtiesReported ? { casualties: playerFaction ? friendlyCasualties : theaterCasualties } : {}),
            ...(reportedDisplacement !== null ? { displaced: reportedDisplacement } : {}),
            costSeverity: severity,
            netFriendlyTerritory: playerFaction && narrateTerritory ? netFriendlyTerritory : undefined,
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
        title: t('chronicle.generated.endgame.ledgerTitle'),
        detail: visibleComparisons > 0
            ? t(
                visibleComparisons === 1
                    ? 'chronicle.generated.endgame.divergenceCount.one'
                    : 'chronicle.generated.endgame.divergenceCount.many',
                { count: visibleComparisons },
            )
            : t('chronicle.generated.endgame.noDivergence'),
    });

    for (const note of nonGhostNotes) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            title: t('chronicle.generated.endgame.divergenceTitle'),
            detail: note,
        });
    }

    if (ghostSrebrenica) {
        entries.push({
            turn,
            type: 'narrative',
            headline: false,
            ghost: true,
            title: t('chronicle.generated.endgame.ruptureAbsentTitle'),
            detail: t('chronicle.generated.endgame.srebrenicaGhostDetail'),
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

function operationObjectiveSummary(op: any): {
    heldAtClose: number;
    loggedCaptured: number;
    hasLoggedCaptureField: boolean;
    detail: string;
} {
    const targeted = Array.isArray(op.objectives_targeted) ? op.objectives_targeted.length : 0;
    const heldAtClose = Array.isArray(op.objectives_captured) ? op.objectives_captured.length : 0;
    const hasLoggedCaptureField = Array.isArray(op.objectives_logged_captured);
    const loggedCaptured = hasLoggedCaptureField ? op.objectives_logged_captured.length : heldAtClose;
    const detail = hasLoggedCaptureField && loggedCaptured !== heldAtClose
        ? t('chronicle.generated.operation.objectivesCapturedHeld', { logged: loggedCaptured, targeted, held: heldAtClose })
        : t('chronicle.generated.operation.objectivesHeld', { captured: heldAtClose, targeted });
    return { heldAtClose, loggedCaptured, hasLoggedCaptureField, detail };
}

function buildOperationHistoryEntries(state: any, playerFaction: string | null): ChronicleEntry[] {
    if (!playerFaction || !Array.isArray(state?.operationHistory)) return [];

    const entries: ChronicleEntry[] = [];
    for (const op of state.operationHistory) {
        if (op?.faction !== playerFaction) continue;

        const objectives = operationObjectiveSummary(op);
        const attacks = Number(op.total_attacks ?? 0);
        const suffered = sumCasualties(op.casualties_suffered);
        const inflicted = sumCasualties(op.casualties_inflicted);
        const stars = Number(op.grade?.stars ?? 0);
        const outcome = typeof op.outcome === 'string' ? op.outcome : 'unknown';
        const operationName = getOperationDisplayName(op);
        const headline = objectives.loggedCaptured > 0
            || (!objectives.hasLoggedCaptureField && objectives.heldAtClose > 0)
            || (objectives.heldAtClose === 0 && (outcome === 'success' || outcome === 'partial'));

        entries.push({
            id: typeof op.operation_id === 'string' ? `operation-aar-${op.operation_id}` : undefined,
            turn: Number(op.ended_turn ?? state.turn ?? 0),
            type: 'military',
            headline,
            title: t('chronicle.generated.operation.concludedTitle', { operationName }),
            detail: [
                formatOperationOutcome(outcome),
                objectives.detail,
                t(attacks === 1 ? 'chronicle.generated.operation.attacks.one' : 'chronicle.generated.operation.attacks.many', { count: attacks }),
                t('chronicle.generated.operation.casualtyExchange', { suffered, inflicted }),
                t(stars === 1 ? 'chronicle.generated.operation.stars.one' : 'chronicle.generated.operation.stars.many', { count: stars }),
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
        const objectives = operationObjectiveSummary(op);
        const attacks = Number(op.total_attacks ?? 0);
        const stars = Number(op.grade?.stars ?? 0);
        const outcome = typeof op.outcome === 'string' ? op.outcome : 'unknown';
        const operationName = getOperationDisplayName(op);
        const headline = objectives.loggedCaptured > 0
            || (!objectives.hasLoggedCaptureField && objectives.heldAtClose > 0)
            || (objectives.heldAtClose === 0 && (outcome === 'success' || outcome === 'partial'));

        entries.push({
            id: typeof op.operation_id === 'string' ? `officer-week-${op.operation_id}` : undefined,
            turn: Number(op.ended_turn ?? state.turn ?? 0),
            type: 'personnel',
            headline,
            title: t('chronicle.generated.officer.title', { displayName }),
            detail: [
                operationName,
                formatOperationOutcome(outcome),
                objectives.detail,
                t(attacks === 1 ? 'chronicle.generated.operation.attacks.one' : 'chronicle.generated.operation.attacks.many', { count: attacks }),
                t(stars === 1 ? 'chronicle.generated.operation.stars.one' : 'chronicle.generated.operation.stars.many', { count: stars }),
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
    if (record.familyId === 'army-reserve' || record.familyId === 'operation-opportunity') return 'military';
    if (record.familyId === 'peace-proposal' || record.familyId === 'dayton-settlement') return 'diplomatic';
    return 'political';
}

function buildDecisionLedgerEntries(state: any): ChronicleEntry[] {
    return buildDecisionConsequenceLedger(state, Number.MAX_SAFE_INTEGER)
        .filter((record) => record.recordTarget === 'chronicle')
        .map((record) => ({
            id: `decision-ledger-${record.id}`,
            turn: record.turn,
            type: decisionRecordType(record),
            headline: true,
            title: resolveDecisionConsequenceCopy(record, 'title'),
            detail: resolveDecisionConsequenceCopy(record, 'detail'),
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
            title: t('chronicle.generated.consequence.title', { predictedLabel: receipt.predictedLabel }),
            detail: t('chronicle.generated.consequence.detail', {
                decisionOptionLabel: receipt.decisionOptionLabel,
                date: turnToDateString(receipt.decisionTurn),
            }),
            metadata: {
                decisionRecordId: `event:${receipt.decisionEventId}`,
            },
        });
    }
    return entries;
}

type RawDecisionLogEntry = {
    event_id?: unknown;
    decision_source?: unknown;
    faction?: string | null;
};

function collectDecisionEventIds(
    state: any,
    eventCatalog: ReadonlyMap<string, EventDefinition> | undefined,
): Set<string> {
    const ids = new Set<string>();
    for (const event of Array.isArray(state?.firedEvents) ? state.firedEvents : []) {
        if (event?.isDecision === true && typeof event.id === 'string') {
            ids.add(event.id);
        }
    }
    if (eventCatalog) {
        for (const [id, def] of eventCatalog.entries()) {
            if (Array.isArray(def.response_options) && def.response_options.length > 0) {
                ids.add(id);
            }
        }
    }
    for (const entry of rawDecisionLog(state) ?? []) {
        if (typeof entry.event_id === 'string' && entry.event_id) {
            ids.add(entry.event_id);
        }
    }
    for (const decision of collectPendingEventDecisions(state)) {
        if (typeof decision.event_id === 'string' && decision.event_id) {
            ids.add(decision.event_id);
        }
    }
    return ids;
}

function rawDecisionLog(state: any): RawDecisionLogEntry[] | null {
    const rawLog = state?.rawGameState?.military?.event_decision_log;
    if (Array.isArray(rawLog)) return rawLog as RawDecisionLogEntry[];
    const stateLog = state?.military?.event_decision_log;
    return Array.isArray(stateLog) ? stateLog as RawDecisionLogEntry[] : null;
}

function collectPendingEventDecisions(state: any): Array<{ event_id?: unknown }> {
    const decisions: Array<{ event_id?: unknown }> = [];
    for (const source of [
        state?.pendingEventDecisions,
        state?.rawGameState?.military?.pending_event_decisions,
    ]) {
        if (Array.isArray(source)) decisions.push(...source);
    }
    return decisions;
}

function hasPendingDecisionEvent(state: any, eventId: string): boolean {
    return collectPendingEventDecisions(state).some((decision) => decision.event_id === eventId);
}

function playerFactionFromState(state: any): string | null {
    if (typeof state?.player_faction === 'string') return state.player_faction;
    const rawPlayerFaction = state?.rawGameState?.meta?.player_faction;
    return typeof rawPlayerFaction === 'string' ? rawPlayerFaction : null;
}

function hasPlayerFiledDecision(
    log: RawDecisionLogEntry[] | null,
    eventId: string,
    playerFaction: string | null,
): boolean {
    if (!log) return false;
    return log.some((entry) => (
        entry.event_id === eventId
        && entry.decision_source === 'player'
        && playerFactionMatch(entry.faction, playerFaction)
    ));
}

function shouldSuppressTurnSummaryDecisionEvent(
    state: any,
    eventId: string,
    playerFaction: string | null,
    decisionEventIds: ReadonlySet<string>,
): boolean {
    if (!decisionEventIds.has(eventId)) return false;

    const ledgerWillRenderPlayerDecision = Array.isArray(state?.firedEvents)
        && state.firedEvents.some((event: any) => event?.id === eventId && event?.isDecision === true);
    if (ledgerWillRenderPlayerDecision) return true;

    const log = rawDecisionLog(state);
    if (!log) return hasPendingDecisionEvent(state, eventId);
    return !hasPlayerFiledDecision(log, eventId, playerFaction);
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
    const playerFaction = playerFactionFromState(state);
    const decisionEventIds = collectDecisionEventIds(state, eventCatalog);

    for (const summary of turnSummaries) {
        const turn = summary.turn;
        if (!shouldNarrateTerritorySummary(summary)) continue;

        if (Array.isArray(summary.battles)) {
            for (const battle of summary.battles) {
                const casualtiesReported = battle?.casualties_reported !== false
                    && reportedNumber(battle?.attacker_casualties) !== null
                    && reportedNumber(battle?.defender_casualties) !== null;
                const totalCasualties = casualtiesReported
                    ? reportedNumber(battle.attacker_casualties)! + reportedNumber(battle.defender_casualties)!
                    : null;
                if (!battle.territory_flipped && (totalCasualties ?? 0) <= CASUALTY_THRESHOLD) continue;

                const location = getPlayerSafeSettlementName(battle.osid || '', 'this position');
                entries.push({
                    turn,
                    type: 'combat',
                    headline: battle.territory_flipped === true,
                    title: t('chronicle.generated.battle.title', { location }),
                    detail: t('chronicle.generated.battle.detail', {
                        outcome: formatOutcome(battle.outcome || 'unknown'),
                        casualties: totalCasualties ?? t('chronicle.generated.casualties.unreported'),
                    }),
                    metadata: {
                        osid: battle.osid,
                        ...(totalCasualties !== null ? { casualties: totalCasualties } : {}),
                    },
                });
            }
        }

        if (Array.isArray(summary.events_fired)) {
            for (const event of summary.events_fired) {
                const id = event.id || '';
                if (shouldSuppressTurnSummaryDecisionEvent(state, id, playerFaction, decisionEventIds)) continue;
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
                .map(([eth, count]) => `${getPlayerSafeDisplacementGroupLabel(eth)}: ${count}`)
                .join(', ');
            entries.push({
                turn,
                type: 'humanitarian',
                headline: summary.displacement_total > 5000,
                title: t('chronicle.generated.displacement.title'),
                detail: detail
                    ? t('chronicle.generated.displacement.detailWithBreakdown', {
                        count: summary.displacement_total,
                        breakdown: detail,
                    })
                    : t('chronicle.generated.displacement.detail', { count: summary.displacement_total }),
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
                    title: t('chronicle.generated.formation.formed', {
                        formation: getPlayerSafeDisplayLabel(spawn.formation_name || spawn.formation_id, 'Formation'),
                    }),
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
                    title: t('chronicle.generated.formation.destroyed', {
                        formation: getPlayerSafeDisplayLabel(destruction.formation_name || destruction.formation_id, 'Formation'),
                    }),
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
        state.runtimeFeatureFlags,
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
