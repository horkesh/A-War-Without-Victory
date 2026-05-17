import { CANONICAL_FACTIONS, type FactionId, type GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { EventNotification, EventNotificationTextByResponse } from './event_types.js';

export interface EventNotificationSource {
    event_id: string;
    notifications_to_other_factions?: EventNotificationTextByResponse;
}

export function isTwoLevelNotificationsEnabled(): boolean {
    return process.env.AWWV_TWO_LEVEL_NOTIFICATIONS === 'true';
}

export function emitEventNotifications(
    state: GameState,
    source: EventNotificationSource,
    responseId: string,
    sourceFaction: FactionId,
    currentTurn: number,
): void {
    const authoredForResponse = source.notifications_to_other_factions?.[responseId];
    if (!authoredForResponse) return;

    const existing = state.military.pending_event_notifications ?? [];
    const byId = new Map<string, EventNotification>();
    for (const notification of existing) {
        byId.set(notification.notification_id, notification);
    }

    const recipients = [...CANONICAL_FACTIONS]
        .filter((faction) => faction !== sourceFaction)
        .sort(strictCompare);

    for (const targetFaction of recipients) {
        const text = authoredForResponse[targetFaction];
        if (!text) continue;
        const notificationId = `${source.event_id}:${sourceFaction}:${targetFaction}`;
        byId.set(notificationId, {
            notification_id: notificationId,
            event_id: source.event_id,
            source_faction: sourceFaction,
            target_faction: targetFaction,
            response_id: responseId,
            surfaced_on_turn: currentTurn + 1,
            headline: text.headline,
            body: text.body,
            consumed: false,
        });
    }

    state.military.pending_event_notifications = [...byId.values()]
        .sort((a, b) => strictCompare(a.notification_id, b.notification_id));
}
