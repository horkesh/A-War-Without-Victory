import type { GameState } from '../../state/game_state.js';

export function dismissEventNotification(
    state: GameState,
    notificationId: string,
): { ok: true } | { ok: false; error: 'notification_not_found' } {
    const notifications = state.military.pending_event_notifications;
    const notification = notifications?.find((entry) => entry.notification_id === notificationId);
    if (!notification) return { ok: false, error: 'notification_not_found' };
    notification.consumed = true;
    return { ok: true };
}
