import type { GameVerdict } from '../../../state/negotiation_types.js';
import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import {
    buildVerdictScene,
    formatVerdictOutcomeClass,
    getVerdictFactionOrder,
    type VerdictSceneInput,
} from './verdictScene.js';

export interface VerdictShareSummaryInput extends VerdictSceneInput {
    verdict?: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
}

function formatOutcomeLine(input: VerdictShareSummaryInput): string {
    const scene = buildVerdictScene(input);
    if (!input.verdict || !scene.focusFaction) return 'Outcome: No verdict packet available';

    const factionVerdict = input.verdict.faction_verdicts[scene.focusFaction];
    return [
        `Outcome: ${scene.focusFaction} - ${scene.focusOutcomeLabel}`,
        `(Grade ${factionVerdict.grade}, Pyrrhic Score ${factionVerdict.pyrrhic_score.toFixed(1)})`,
    ].join(' ');
}

function formatWarEndLine(verdict: GameVerdict | undefined): string {
    if (!verdict) return 'War ended: Unknown end state';
    return `War ended: ${verdict.outcome_label}, week ${verdict.duration_weeks}`;
}

function formatCostLine(input: VerdictShareSummaryInput): string {
    if (!input.costLedger) return 'Cost Ledger: No cost ledger packet available';
    const scene = buildVerdictScene(input);
    return `Cost Ledger: ${scene.costEmphasis.title} - ${scene.costEmphasis.text}`;
}

function formatComparisonLine(input: VerdictShareSummaryInput): string {
    if (!input.historicalComparison) return 'Historical comparison: No historical comparison packet available';
    const callout = input.historicalComparison.divergence_notes
        .find(note => note.trim().length > 0)
        ?? 'No divergence notes available';
    return `Historical comparison: ${callout}`;
}

function formatFactionOutcomes(verdict: GameVerdict | undefined): string {
    const factions = getVerdictFactionOrder(verdict);
    if (factions.length === 0 || !verdict) return 'Faction outcomes: No faction verdicts available';

    const outcomes = factions.map((faction) => {
        const factionVerdict = verdict.faction_verdicts[faction];
        return `${faction} ${formatVerdictOutcomeClass(factionVerdict.outcome_class)}`;
    });
    return `Faction outcomes: ${outcomes.join('; ')}`;
}

export function buildVerdictShareSummary(input: VerdictShareSummaryInput): string {
    return [
        'A War Without Victory - Verdict',
        formatOutcomeLine(input),
        formatWarEndLine(input.verdict),
        formatCostLine(input),
        formatComparisonLine(input),
        formatFactionOutcomes(input.verdict),
    ].join('\n');
}
