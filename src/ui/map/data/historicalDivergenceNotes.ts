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

    // Saves frozen before the R8 ending truth pass carry "Total military casualties were N% of
    // historical levels", which divided military killed by all deaths (council B6/H3) and states a
    // percentage of history (§4). It is shown without the percentage; the Verdict rebuilds the
    // corrected integer line from the ledger (verdictComparison.ts).
    if (/^Total military casualties were \d+% of historical levels$/.test(note)) {
        return t('warCost.divergence.casualtyLegacy');
    }

    const deadMatch = /^(Military killed|Civilians killed): ([\d,]+) in this campaign; ([\d,]+) in the historical war$/.exec(note);
    if (deadMatch) {
        return t(deadMatch[1] === 'Military killed' ? 'verdict.compare.militaryDead' : 'verdict.compare.civilianDead', {
            campaign: deadMatch[2] ?? '',
            history: deadMatch[3] ?? '',
        });
    }

    const knownNotes: Record<string, string> = {
        'Srebrenica genocide occurred': t('warCost.divergence.srebrenicaOccurred'),
        'Srebrenica genocide occurred as in the historical war': t('warCost.divergence.srebrenicaOccurredHistorical'),
        'Srebrenica enclave survived': t('warCost.divergence.srebrenicaSurvived'),
        'Srebrenica enclave was overrun': t('chronicle.generated.endgame.srebrenicaOverrunDetail'),
    };
    return knownNotes[note] ?? note;
}
