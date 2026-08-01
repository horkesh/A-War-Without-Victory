import { CANONICAL_FACTIONS, type FactionId, type GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type ClaimPredicateOperator = 'equals' | 'truthy_equals' | 'at_least' | 'contains';
export type ClaimPredicateValue = string | number | boolean | null;

export interface ClaimPredicateOperand {
    owner_path: string;
    operator: ClaimPredicateOperator;
    expected_value: ClaimPredicateValue;
    observed_value: ClaimPredicateValue;
    expression: string;
}

export interface NamedClaimPredicate {
    kind: 'state' | 'receipt';
    /** Compatibility summary; `owner_paths` is the exact structured contract. */
    owner_path: string;
    owner_paths: string[];
    expression: string;
    operands: ClaimPredicateOperand[];
}

export interface RealizedConsequenceReceipt {
    receipt_id: string;
    receipt_record_id: string;
    source_record_id: string;
    decision_event_id: string;
    response_id: string;
    decision_turn: number;
    consequence_event_id: string;
    fired_turn: number;
    turns_elapsed: number;
    claim_predicate: NamedClaimPredicate;
}

function canonicalPlayerFaction(value: unknown): FactionId | null {
    return typeof value === 'string' && CANONICAL_FACTIONS.includes(value as FactionId)
        ? value as FactionId
        : null;
}

function receiptId(eventId: string, responseId: string, turn: number, consequenceId: string): string {
    return `${eventId}::${responseId}::${turn}::${consequenceId}`;
}

function receiptPredicate(
    eventId: string,
    responseId: string,
    decisionTurn: number,
    consequenceId: string,
    firedTurn: number,
    playerFaction: FactionId,
): NamedClaimPredicate {
    const operands: ClaimPredicateOperand[] = [
        {
            owner_path: 'state.meta.player_faction',
            operator: 'equals',
            expected_value: playerFaction,
            observed_value: playerFaction,
            expression: `state.meta.player_faction=${playerFaction}`,
        },
        {
            owner_path: 'state.military.event_decision_log',
            operator: 'contains',
            expected_value: `${eventId}::${responseId}::${decisionTurn}::${playerFaction}::player`,
            observed_value: `${eventId}::${responseId}::${decisionTurn}::${playerFaction}::player`,
            expression:
                `event_decision_log(event_id=${eventId},response_id=${responseId},turn=${decisionTurn},` +
                `faction=${playerFaction},decision_source=player)`,
        },
        {
            owner_path: 'state.military.event_causality_log',
            operator: 'contains',
            expected_value: `${eventId}::${consequenceId}::${responseId}::${decisionTurn}::enables`,
            observed_value: `${eventId}::${consequenceId}::${responseId}::${decisionTurn}::enables`,
            expression:
                `event_causality_log(kind=enables,from_event=${eventId},to_event=${consequenceId},` +
                `source_response_id=${responseId},turn=${decisionTurn})`,
        },
        {
            owner_path: 'state.military.fired_event_ids',
            operator: 'contains',
            expected_value: consequenceId,
            observed_value: consequenceId,
            expression: `fired_event_ids contains ${consequenceId}`,
        },
        {
            owner_path: `state.military.event_last_fired_turn.${consequenceId}`,
            operator: 'at_least',
            expected_value: decisionTurn,
            observed_value: firedTurn,
            expression: `event_last_fired_turn[${consequenceId}]=${firedTurn}>=${decisionTurn}`,
        },
    ];
    const ownerPaths = operands.map((operand) => operand.owner_path);
    return {
        kind: 'receipt',
        owner_path: ownerPaths.join('+'),
        owner_paths: ownerPaths,
        expression: operands.map((operand) => operand.expression).join(' AND '),
        operands,
    };
}

/**
 * Project realized player-decision receipts from persisted engine truth.
 * Calendar values identify the recorded rows; they never establish an outcome
 * without the matching player decision, response-tagged causal edge, and fired
 * consequence record.
 */
export function buildRealizedConsequenceReceipts(
    state: GameState | null | undefined,
): RealizedConsequenceReceipt[] {
    if (!state) return [];

    const playerFaction = canonicalPlayerFaction(state.meta?.player_faction);
    if (playerFaction === null) return [];
    const firedIds = new Set(state.military?.fired_event_ids ?? []);
    const firedTurns = state.military?.event_last_fired_turn ?? {};
    const edges = state.military?.event_causality_log ?? [];
    const emitted = new Map<string, RealizedConsequenceReceipt>();

    for (const decision of state.military?.event_decision_log ?? []) {
        if (decision.decision_source !== 'player') continue;
        if (decision.faction !== playerFaction) continue;
        if (!Number.isInteger(decision.turn)) continue;

        for (const edge of edges) {
            if (edge.kind !== 'enables' || edge.to_event === null) continue;
            if (edge.turn !== decision.turn) continue;
            if (edge.from_event !== decision.event_id) continue;
            if (edge.source_response_id !== decision.response_id) continue;

            const consequenceId = edge.to_event;
            const firedTurn = firedTurns[consequenceId];
            if (!firedIds.has(consequenceId)) continue;
            if (typeof firedTurn !== 'number' || firedTurn < decision.turn) continue;

            const id = receiptId(decision.event_id, decision.response_id, decision.turn, consequenceId);
            if (emitted.has(id)) continue;
            emitted.set(id, {
                receipt_id: id,
                receipt_record_id: `receipt:${id}`,
                source_record_id: `decision:${decision.event_id}::${decision.response_id}::${decision.turn}`,
                decision_event_id: decision.event_id,
                response_id: decision.response_id,
                decision_turn: decision.turn,
                consequence_event_id: consequenceId,
                fired_turn: firedTurn,
                turns_elapsed: firedTurn - decision.turn,
                claim_predicate: receiptPredicate(
                    decision.event_id,
                    decision.response_id,
                    decision.turn,
                    consequenceId,
                    firedTurn,
                    playerFaction,
                ),
            });
        }
    }

    return [...emitted.values()].sort((a, b) => {
        if (a.fired_turn !== b.fired_turn) return a.fired_turn - b.fired_turn;
        return strictCompare(a.receipt_id, b.receipt_id);
    });
}
