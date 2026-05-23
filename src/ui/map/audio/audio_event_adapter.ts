import type { LoadedGameState } from '../data/types.js';
import { getCueConfig } from './sound_manifest.js';

export type AudioCueEventReason =
    | 'turn_completed'
    | 'battle_reported'
    | 'battle_territory_flipped'
    | 'historical_event_fired'
    | 'operation_completed';

export interface AudioCueEvent {
    key: string;
    cueId: string;
    reason: AudioCueEventReason;
}

function strictCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function appendIfRegistered(events: AudioCueEvent[], event: AudioCueEvent): void {
    if (!getCueConfig(event.cueId)) return;
    events.push(event);
}

export function buildAudioCueEventsForState(
    previous: LoadedGameState | null | undefined,
    next: LoadedGameState | null | undefined,
): AudioCueEvent[] {
    const previousTurn = previous?.latestTurnSummary?.turn;
    const summary = next?.latestTurnSummary;
    if (previousTurn === undefined || !summary || summary.turn <= previousTurn) {
        return [];
    }

    const events: AudioCueEvent[] = [];
    appendIfRegistered(events, {
        key: `turn:${summary.turn}:complete`,
        cueId: 'turn_complete',
        reason: 'turn_completed',
    });

    if (summary.battles.length > 0) {
        const hasTerritoryFlip = summary.battles.some((battle) => battle.territory_flipped);
        appendIfRegistered(events, {
            key: `turn:${summary.turn}:battle:${hasTerritoryFlip ? 'decisive' : 'reported'}`,
            cueId: hasTerritoryFlip ? 'battle_decisive' : 'battle_notification',
            reason: hasTerritoryFlip ? 'battle_territory_flipped' : 'battle_reported',
        });
    }

    for (const event of [...summary.events_fired].sort((a, b) => strictCompare(a.id, b.id))) {
        appendIfRegistered(events, {
            key: `turn:${summary.turn}:event:${event.id}`,
            cueId: 'event_notification',
            reason: 'historical_event_fired',
        });
    }

    const previousOperationIds = new Set((previous?.operationHistory ?? []).map((operation) => operation.operation_id));
    const completedOperations = (next?.operationHistory ?? [])
        .filter((operation) => operation.ended_turn === summary.turn && !previousOperationIds.has(operation.operation_id))
        .sort((a, b) => strictCompare(a.operation_id, b.operation_id));
    for (const operation of completedOperations) {
        appendIfRegistered(events, {
            key: `turn:${summary.turn}:operation:${operation.operation_id}`,
            cueId: 'operation_complete',
            reason: 'operation_completed',
        });
    }

    return events;
}
