import type { GameVerdict } from '../../../state/negotiation_types.js';
import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import {
    buildVerdictScene,
    formatVerdictOutcomeClass,
    formatVerdictSideName,
    getVerdictFactionOrder,
    type VerdictSceneInput,
} from './verdictScene.js';
import { buildHistoricalComparisonLines } from './verdictComparison.js';
import { t } from '../i18n';
import { turnToDateString } from '../utils/formatters.js';

export interface VerdictShareSummaryInput extends VerdictSceneInput {
    verdict?: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
}

function formatOutcomeLine(input: VerdictShareSummaryInput): string {
    const scene = buildVerdictScene(input);
    if (!input.verdict || !scene.focusFaction) return t('verdict.share.outcomeMissing');

    const factionVerdict = input.verdict.faction_verdicts[scene.focusFaction];
    return t('verdict.share.outcomeLine', {
        faction: scene.focusSideName,
        outcome: scene.focusOutcomeLabel,
        grade: factionVerdict.grade,
        score: factionVerdict.pyrrhic_score.toFixed(1),
    });
}

/** The headline, its subheadline, then the recorded genocide on its own line (§4 panel). */
function formatHeadlineLines(input: VerdictShareSummaryInput): string[] {
    if (!input.verdict) return [];
    const scene = buildVerdictScene(input);
    return [scene.headline, scene.subheadline, scene.stain?.text ?? ''].filter(line => line.trim().length > 0);
}

function formatWarEndLine(verdict: GameVerdict | undefined): string {
    if (!verdict) return t('verdict.share.warEndedMissing');
    const date = verdict.date?.trim() || turnToDateString(verdict.turn ?? verdict.duration_weeks);
    return t('verdict.share.warEndedLine', { outcome: verdict.outcome_label, date });
}

function formatCostLine(input: VerdictShareSummaryInput): string {
    if (!input.costLedger) return t('verdict.share.costMissing');
    const scene = buildVerdictScene(input);
    return t('verdict.share.costLine', { title: scene.costEmphasis.title, text: scene.costEmphasis.text });
}

function formatComparisonLine(input: VerdictShareSummaryInput): string {
    if (!input.historicalComparison) return t('verdict.share.comparisonMissing');
    const callout = buildHistoricalComparisonLines({
        verdict: input.verdict,
        costLedger: input.costLedger,
        comparison: input.historicalComparison,
    }).find(line => line.id === 'end_of_war')?.text ?? t('verdict.share.noDivergenceNotes');
    return t('verdict.share.comparisonLine', { callout });
}

function formatFactionOutcomes(verdict: GameVerdict | undefined): string {
    const factions = getVerdictFactionOrder(verdict);
    if (factions.length === 0 || !verdict) return t('verdict.share.factionOutcomesMissing');

    const outcomes = factions.map((faction) => {
        const factionVerdict = verdict.faction_verdicts[faction];
        return `${formatVerdictSideName(faction)} ${formatVerdictOutcomeClass(factionVerdict.outcome_class)}`;
    });
    return t('verdict.share.factionOutcomesLine', { outcomes: outcomes.join('; ') });
}

export function buildVerdictShareSummary(input: VerdictShareSummaryInput): string {
    return [
        t('verdict.share.title'),
        ...formatHeadlineLines(input),
        formatOutcomeLine(input),
        formatWarEndLine(input.verdict),
        formatCostLine(input),
        formatComparisonLine(input),
        formatFactionOutcomes(input.verdict),
    ].join('\n');
}
