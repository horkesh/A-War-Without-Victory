import type { CostLedger, CostLedgerFinding, CostLedgerFindingCategory, CostLedgerFindingSeverity } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict, OutcomeClass } from '../../../state/negotiation_types.js';
import { strictCompare } from '../../../state/validateGameState.js';

export type VerdictSceneTone = 'somber' | 'pyrrhic' | 'catastrophic' | 'early_peace';

export interface VerdictCostEmphasis {
    title: string;
    text: string;
    severity: CostLedgerFindingSeverity | 'none';
    category: CostLedgerFindingCategory | 'none';
    source: 'finding' | 'totals' | 'none';
}

export interface VerdictScene {
    tone: VerdictSceneTone;
    headline: string;
    subheadline: string;
    focusFaction?: string;
    focusOutcomeClass?: OutcomeClass;
    focusOutcomeLabel: string;
    costEmphasis: VerdictCostEmphasis;
    comparisonCallouts: string[];
}

export interface VerdictSceneInput {
    verdict?: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
    focusFaction?: string;
}

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

const OUTCOME_LABELS: Record<OutcomeClass, string> = {
    strategic_success: 'Strategic Success',
    survival: 'Survival',
    negotiated_escape: 'Negotiated Escape',
    pyrrhic_success: 'Pyrrhic Success',
    hollow_victory: 'Hollow Victory',
    failure: 'Failure',
    collapse: 'Collapse',
};

const FINDING_SEVERITY_RANK: Record<CostLedgerFindingSeverity, number> = {
    rupture: 3,
    grave: 2,
    record: 1,
};

const FINDING_CATEGORY_RANK: Record<CostLedgerFindingCategory, number> = {
    rupture: 5,
    human_cost: 4,
    displacement: 3,
    duration: 2,
    war_crimes: 1,
};

export function formatVerdictOutcomeClass(outcomeClass: OutcomeClass | undefined): string {
    return outcomeClass ? OUTCOME_LABELS[outcomeClass] : 'Unknown';
}

function getFactionOrderKey(faction: string): number {
    const index = CANONICAL_FACTIONS.indexOf(faction as typeof CANONICAL_FACTIONS[number]);
    return index === -1 ? CANONICAL_FACTIONS.length : index;
}

function sortFactions(a: string, b: string): number {
    const orderDelta = getFactionOrderKey(a) - getFactionOrderKey(b);
    if (orderDelta !== 0) return orderDelta;
    return strictCompare(a, b);
}

export function getVerdictFactionOrder(verdict: GameVerdict | undefined): string[] {
    const factions = Object.keys(verdict?.faction_verdicts ?? {});
    return factions.sort(sortFactions);
}

function selectFocusFaction(input: VerdictSceneInput): string | undefined {
    const verdicts = input.verdict?.faction_verdicts ?? {};
    if (input.focusFaction && verdicts[input.focusFaction]) return input.focusFaction;
    for (const faction of CANONICAL_FACTIONS) {
        if (verdicts[faction]) return faction;
    }
    return Object.keys(verdicts).sort(strictCompare)[0];
}

function hasEarlyPeaceSignal(input: VerdictSceneInput): boolean {
    return input.verdict?.outcome_type === 'peace_plan'
        || (input.costLedger?.findings ?? []).some(finding => finding.id === 'early_peace_implementation_record');
}

function hasCatastrophicSignal(verdict: GameVerdict | undefined, costLedger: CostLedger | undefined): boolean {
    const factionVerdicts = Object.values(verdict?.faction_verdicts ?? {});
    return factionVerdicts.some(factionVerdict =>
        factionVerdict.outcome_class === 'collapse'
        || factionVerdict.condemnation_flags.length > 0
    ) || (costLedger?.findings ?? []).some(finding => finding.severity === 'rupture');
}

function hasPyrrhicSignal(verdict: GameVerdict | undefined, focusFaction: string | undefined): boolean {
    const focused = focusFaction ? verdict?.faction_verdicts?.[focusFaction] : undefined;
    if (focused?.outcome_class === 'pyrrhic_success' || focused?.outcome_class === 'hollow_victory') return true;
    return Object.values(verdict?.faction_verdicts ?? {}).some(factionVerdict =>
        factionVerdict.outcome_class === 'pyrrhic_success'
        || factionVerdict.outcome_class === 'hollow_victory'
    );
}

function selectTone(input: VerdictSceneInput, focusFaction: string | undefined): VerdictSceneTone {
    if (hasEarlyPeaceSignal(input)) return 'early_peace';
    if (hasCatastrophicSignal(input.verdict, input.costLedger)) return 'catastrophic';
    if (hasPyrrhicSignal(input.verdict, focusFaction)) return 'pyrrhic';
    return 'somber';
}

function headlineForTone(tone: VerdictSceneTone): string {
    switch (tone) {
        case 'early_peace': return 'Early peace, not an untouched country';
        case 'catastrophic': return 'Verdict under condemnation';
        case 'pyrrhic': return 'Pyrrhic success, measured against the bill';
        case 'somber': return 'A war measured by its costs';
    }
}

function subheadlineForTone(tone: VerdictSceneTone): string {
    switch (tone) {
        case 'early_peace': return 'The settlement shortened the war path, but the ledger still records what happened.';
        case 'catastrophic': return 'The verdict is shaped by collapse, rupture, or condemnation before any score can redeem it.';
        case 'pyrrhic': return 'The outcome preserved something real, but the cost ledger controls the final memory.';
        case 'somber': return 'The conclusion reads the verdict, the cost ledger, and the historical comparison without changing them.';
    }
}

function compareFindings(a: CostLedgerFinding, b: CostLedgerFinding): number {
    const severityDelta = FINDING_SEVERITY_RANK[b.severity] - FINDING_SEVERITY_RANK[a.severity];
    if (severityDelta !== 0) return severityDelta;
    const categoryDelta = FINDING_CATEGORY_RANK[b.category] - FINDING_CATEGORY_RANK[a.category];
    if (categoryDelta !== 0) return categoryDelta;
    return strictCompare(a.id, b.id);
}

function formatInteger(value: number): string {
    return Math.trunc(Math.max(0, value)).toLocaleString('en-US');
}

function selectCostEmphasis(costLedger: CostLedger | undefined): VerdictCostEmphasis {
    if (!costLedger) {
        return {
            title: 'No cost ledger packet available',
            text: 'The verdict scene has no cost ledger packet to summarize.',
            severity: 'none',
            category: 'none',
            source: 'none',
        };
    }

    const finding = [...(costLedger.findings ?? [])].sort(compareFindings)[0];
    if (finding) {
        return {
            title: finding.title,
            text: finding.text,
            severity: finding.severity,
            category: finding.category,
            source: 'finding',
        };
    }

    return {
        title: 'War cost totals',
        text: `${formatInteger(costLedger.total_military_killed)} military killed and ${formatInteger(costLedger.total_civilian_killed)} civilian killed recorded by the Cost Ledger.`,
        severity: 'record',
        category: 'human_cost',
        source: 'totals',
    };
}

function selectComparisonCallouts(comparison: ComparisonResult | undefined): string[] {
    return [...(comparison?.divergence_notes ?? [])]
        .filter(note => note.trim().length > 0)
        .sort(strictCompare)
        .slice(0, 3);
}

export function buildVerdictScene(input: VerdictSceneInput): VerdictScene {
    const focusFaction = selectFocusFaction(input);
    const focusOutcomeClass = focusFaction
        ? input.verdict?.faction_verdicts?.[focusFaction]?.outcome_class
        : undefined;
    const tone = selectTone(input, focusFaction);

    return {
        tone,
        headline: headlineForTone(tone),
        subheadline: subheadlineForTone(tone),
        focusFaction,
        focusOutcomeClass,
        focusOutcomeLabel: formatVerdictOutcomeClass(focusOutcomeClass),
        costEmphasis: selectCostEmphasis(input.costLedger),
        comparisonCallouts: selectComparisonCallouts(input.historicalComparison),
    };
}
