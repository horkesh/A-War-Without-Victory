import { t } from '../i18n';
import { turnToDateString } from './formatters';

/**
 * G1 (2026-11-16): before a gesture event's own trigger.turn_min the President cannot use it yet.
 * The copy names the opening date (falls back to an undated line if the contract sent none).
 */
export function gestureNotYetText(availableFromTurn: number | null | undefined): string {
    return typeof availableFromTurn === 'number'
        ? t('directive.gesture.notYet', { date: turnToDateString(availableFromTurn) })
        : t('directive.gesture.notYetUndated');
}
