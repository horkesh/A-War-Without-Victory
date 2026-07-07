import type { CorpsOperation, FactionId, GameState, PendingProposalReview } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type HistoricalOperationAuthorizationKind = 'preplanned' | 'triggered' | 'army_hq';
export type HistoricalOperationAuthorizationStatus = 'not_required' | 'pending' | 'accepted' | 'declined';

export interface HistoricalOperationAuthorizationInput {
    kind: HistoricalOperationAuthorizationKind;
    faction: FactionId;
    corpsId: string;
    operationName: string;
}

export function historicalOperationAuthorizationAction(input: HistoricalOperationAuthorizationInput): string {
    return `HISTORICAL_OP:${input.kind}:${input.corpsId}:${input.operationName}`;
}

function reviewIdForAction(turn: number, action: string): string {
    return `PROP_${turn}_historical_op_${action
        .replace(/^HISTORICAL_OP:/, '')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()}`;
}

function existingReview(
    state: GameState,
    action: string,
    faction: FactionId,
): PendingProposalReview | undefined {
    return [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((review) => review.proposed_action === action && review.faction === faction)
        .sort((a, b) => strictCompare(a.id, b.id))[0];
}

export function ensureHistoricalOperationAuthorizationReview(
    state: GameState,
    input: HistoricalOperationAuthorizationInput,
): HistoricalOperationAuthorizationStatus {
    if (state.meta?.player_faction !== input.faction) return 'not_required';

    const turn = state.meta?.turn ?? 0;
    const action = historicalOperationAuthorizationAction(input);
    const existing = existingReview(state, action, input.faction);
    if (existing) {
        if (existing.accepted === true) return 'accepted';
        if (existing.accepted === false) return 'declined';
        return 'pending';
    }

    state.meta.pending_proposal_reviews ??= [];
    state.meta.pending_proposal_reviews.push({
        id: reviewIdForAction(turn, action),
        turn,
        faction: input.faction,
        domain: 'ops',
        description: `${input.operationName} - staff requests authorization to proceed.`,
        proposed_action: action,
        current_value: 'awaiting_authorization',
        proposed_value: 'authorize',
    });
    state.meta.pending_proposal_reviews.sort((a, b) => strictCompare(a.id, b.id));
    return 'pending';
}

function isPlayableFaction(value: unknown): value is FactionId {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

function operationFaction(state: GameState, corpsId: string, op: CorpsOperation): FactionId | null {
    const corpsFaction = state.military?.formations?.[corpsId]?.faction;
    if (isPlayableFaction(corpsFaction)) return corpsFaction;

    for (const brigadeId of [...(op.participating_brigades ?? [])].sort(strictCompare)) {
        const faction = state.military?.formations?.[brigadeId]?.faction;
        if (isPlayableFaction(faction)) return faction;
    }
    return null;
}

/**
 * Baked startup snapshots are faction-neutral and may already contain historical
 * pre-planned operations. Once a human faction is selected, normalize those live
 * operations back into explicit authorization reviews so the player is the actor.
 */
export function deferUnauthorizedHistoricalOperationsForPlayer(state: GameState): void {
    const playerFaction = state.meta?.player_faction;
    if (!isPlayableFaction(playerFaction)) return;

    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return;

    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const command = corpsCommand[corpsId];
        if (!command) continue;

        const retained: CorpsOperation[] = [];
        let deferredAny = false;

        for (const operation of command.active_operations ?? []) {
            const faction = operationFaction(state, corpsId, operation);
            if (operation.is_pre_planned !== true || faction !== playerFaction) {
                retained.push(operation);
                continue;
            }

            const authorization = ensureHistoricalOperationAuthorizationReview(state, {
                kind: 'preplanned',
                faction,
                corpsId,
                operationName: operation.name,
            });
            if (authorization === 'accepted') {
                retained.push(operation);
                continue;
            }
            deferredAny = true;
        }

        command.active_operations = retained;
        if (deferredAny) {
            delete command.queued_operations;
        }
    }
}
