import { t } from '../i18n';

/** Localize known generated historical-divergence notes while preserving unknown authored notes. */
export function formatHistoricalDivergenceNote(note: string): string {
    const longerMatch = /^War lasted (\d+) weeks longer(?: than the historical (\d+) weeks)?$/.exec(note);
    if (longerMatch) {
        return t('warCost.divergence.duration.longer', {
            deltaWeeks: Number(longerMatch[1]),
            historicalReference: longerMatch[2] === undefined ? '' : t('warCost.divergence.duration.historicalReference', { historicalWeeks: Number(longerMatch[2]) }),
        });
    }

    const shorterMatch = /^War lasted (\d+) weeks shorter(?: than the historical (\d+) weeks)?$/.exec(note);
    if (shorterMatch) {
        return t('warCost.divergence.duration.shorter', {
            deltaWeeks: Number(shorterMatch[1]),
            historicalReference: shorterMatch[2] === undefined ? '' : t('warCost.divergence.duration.historicalReference', { historicalWeeks: Number(shorterMatch[2]) }),
        });
    }

    const exactMatch = /^War lasted exactly the historical (\d+) weeks$/.exec(note);
    if (exactMatch) {
        return t('warCost.divergence.duration.exact', { historicalWeeks: Number(exactMatch[1]) });
    }

    const territoryMatch = /^(.+) controlled ([\d.]+)% territory vs historical ([\d.]+)%$/.exec(note);
    if (territoryMatch) {
        const rawLabel = territoryMatch[1] ?? '';
        const label = rawLabel === 'Federation' ? t('warCost.federation') : rawLabel;
        const messageKey = rawLabel === 'Federation'
            ? 'warCost.divergence.territoryControlledFederation'
            : 'warCost.divergence.territoryControlled';
        return t(messageKey, {
            label,
            playerPct: territoryMatch[2] ?? '',
            historicalPct: territoryMatch[3] ?? '',
        });
    }

    const casualtyMatch = /^Total military casualties were (\d+)% of historical levels$/.exec(note);
    if (casualtyMatch) {
        return t('warCost.divergence.casualtyTotal', { casualtyPct: Number(casualtyMatch[1]) });
    }

    const knownNotes: Record<string, string> = {
        'Srebrenica genocide occurred': t('warCost.divergence.srebrenicaOccurred'),
        'Srebrenica genocide occurred as in the historical war': t('warCost.divergence.srebrenicaOccurredHistorical'),
        'Srebrenica enclave survived': t('warCost.divergence.srebrenicaSurvived'),
    };
    return knownNotes[note] ?? note;
}
