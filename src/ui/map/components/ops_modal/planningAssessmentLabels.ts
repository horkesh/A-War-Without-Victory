import { t, type MessageKey } from '../../i18n';

const OUTCOME_LABEL_KEYS: Record<string, MessageKey> = {
    decisive_victory: 'aar.outcome.decisive',
    victory: 'aar.outcome.victory',
    costly_victory: 'aar.outcome.costly',
    stalemate: 'aar.outcome.stalemate',
    repulsed: 'aar.outcome.repulsed',
    catastrophic: 'aar.outcome.collapse',
};

const RECOMMENDATION_LABEL_KEYS: Record<string, MessageKey> = {
    launch: 'operationBriefing.recommendsLaunch',
    postpone: 'operationBriefing.recommendsPostpone',
    abort: 'operationBriefing.recommendsAbort',
};

export function formatPlanningPredictedOutcome(value: string | null | undefined): string {
    if (!value) return t('aar.outcome.recorded');
    return t(OUTCOME_LABEL_KEYS[value] ?? 'aar.outcome.recorded');
}

export function formatPlanningRecommendation(value: string | null | undefined): string {
    if (!value) return t('operationBriefing.pendingAssessment');
    return t(RECOMMENDATION_LABEL_KEYS[value] ?? 'operationBriefing.pendingAssessment');
}
