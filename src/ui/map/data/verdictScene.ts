/**
 * Verdict scene: the ending's one headline logic (R8 council fix 1, B1/B3).
 *
 * The headline is the verdict word, the side in focus's FINAL outcome class, so the headline,
 * the Outcome tile and the faction rail always agree. The letter grade is the war-record
 * grade. When the two disagree, the subheadline names the cap and its source. A condemnation
 * sentence or tone appears only for a side that holds its own condemnation flag; a recorded
 * rupture is named with its perpetrator, and for the victims' state as its loss
 * (Sensitive History Design Gate §4; game-designer ruling C and §4 panel, 2026-11-14).
 *
 * Display only: reads the frozen verdict, cost ledger and comparison; derives no truth.
 */
import type { CostLedger, CostLedgerFindingCategory, CostLedgerFindingSeverity } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import type { FactionVerdict, GameVerdict, OutcomeClass } from '../../../state/negotiation_types.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { t, type MessageKey } from '../i18n';
import { formatCount } from '../utils/formatters.js';

export type VerdictSceneTone = 'somber' | 'pyrrhic' | 'catastrophic' | 'early_peace';

export interface VerdictCostEmphasis {
    title: string;
    text: string;
    severity: CostLedgerFindingSeverity | 'none';
    category: CostLedgerFindingCategory | 'none';
    source: 'finding' | 'totals' | 'none';
}

/** A cap that moved the outcome class below the class the grade alone would give. */
export interface VerdictCap {
    source: 'settlement' | 'condemnation';
    from: OutcomeClass;
    to: OutcomeClass;
    fromLabel: string;
    toLabel: string;
    /** Peace dysfunction index (this side's own reading), for a settlement cap. */
    index?: number;
    /** Which dysfunction band set a settlement cap. */
    band?: 'soft' | 'hard' | 'failure';
    /** "Outcome capped: Survival → Hollow Victory (signed settlement)". */
    chip: string;
}

/** How the side in focus stands to a recorded rupture. */
export type VerdictStainRelation = 'perpetrator' | 'victims_state' | 'other';

export interface VerdictStain {
    ruptureId: string;
    relation: VerdictStainRelation;
    text: string;
}

export interface VerdictScene {
    tone: VerdictSceneTone;
    headline: string;
    /** The subheadline sentences joined; see `subheadlineParts`. */
    subheadline: string;
    subheadlineParts: string[];
    focusFaction?: string;
    /** Display name of the side in focus ("Republic of Bosnia and Herzegovina"). */
    focusSideName: string;
    focusOutcomeClass?: OutcomeClass;
    focusOutcomeLabel: string;
    focusGrade?: string;
    focusScore?: number;
    cap?: VerdictCap;
    stain?: VerdictStain;
    costEmphasis: VerdictCostEmphasis;
    /** Kept for older readers; the Verdict renders `buildHistoricalComparisonLines` instead. */
    comparisonCallouts: string[];
}

export interface VerdictSceneInput {
    verdict?: GameVerdict;
    costLedger?: CostLedger;
    historicalComparison?: ComparisonResult;
    focusFaction?: string;
}

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

const OUTCOME_LABELS: Record<OutcomeClass, MessageKey> = {
    strategic_success: 'verdict.outcome.strategicSuccess',
    survival: 'verdict.outcome.survival',
    negotiated_escape: 'verdict.outcome.negotiatedEscape',
    pyrrhic_success: 'verdict.outcome.pyrrhicSuccess',
    hollow_victory: 'verdict.outcome.hollowVictory',
    failure: 'verdict.outcome.failure',
    collapse: 'verdict.outcome.collapse',
};

/** Best first. A class's index is its rank; a lower index is a better outcome. */
const OUTCOME_ORDER: readonly OutcomeClass[] = [
    'strategic_success', 'survival', 'negotiated_escape', 'pyrrhic_success', 'hollow_victory', 'failure', 'collapse',
];

/** The class each letter grade gives on its own (classifyOutcome, without flags or caps). */
const GRADE_CLASS: Record<string, OutcomeClass> = {
    'A+': 'strategic_success',
    A: 'survival',
    B: 'negotiated_escape',
    C: 'pyrrhic_success',
    D: 'failure',
    F: 'collapse',
};

/**
 * One colour per outcome class on every Verdict surface (rail badge, Outcome tile, cap chip).
 * R8 council B1: "Survival" was red in the Outcome tile and green in the rail.
 */
export const OUTCOME_CLASS_COLOR: Record<OutcomeClass, string> = {
    strategic_success: '#7fd18b',
    survival: '#86c98f',
    negotiated_escape: '#8fb6dd',
    pyrrhic_success: '#e0bd72',
    hollow_victory: '#e3a066',
    failure: '#e07a7a',
    collapse: '#ef6b6b',
};

const SIDE_NAME_KEYS: Record<string, MessageKey> = {
    RBiH: 'verdict.side.name.RBiH',
    RS: 'verdict.side.name.RS',
    HRHB: 'verdict.side.name.HRHB',
};

const SIDE_SUBJECT_KEYS: Record<string, MessageKey> = {
    RBiH: 'verdict.side.subject.RBiH',
    RS: 'verdict.side.subject.RS',
    HRHB: 'verdict.side.subject.HRHB',
};

export function formatVerdictOutcomeClass(outcomeClass: OutcomeClass | undefined): string {
    return outcomeClass ? t(OUTCOME_LABELS[outcomeClass]) : t('verdict.outcome.unknown');
}

/** Display name of a side ("Republic of Bosnia and Herzegovina"); the id for an unknown side. */
export function formatVerdictSideName(faction: string | undefined): string {
    if (!faction) return t('verdict.campaign');
    const key = SIDE_NAME_KEYS[faction];
    return key ? t(key) : faction;
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

function rank(outcomeClass: OutcomeClass): number {
    const index = OUTCOME_ORDER.indexOf(outcomeClass);
    return index === -1 ? OUTCOME_ORDER.length : index;
}

function isEarlyPeace(input: VerdictSceneInput): boolean {
    return input.verdict?.outcome_type === 'peace_plan'
        || (input.costLedger?.findings ?? []).some(finding => finding.id === 'early_peace_implementation_record');
}

/**
 * The cap that moved this side's outcome below its grade's own class, if any. The settlement
 * cap is read from the grade trace; saves frozen before the trace fall back to the verdict's
 * dysfunction index. Condemnation is named only for a side holding its own flag.
 */
export function selectVerdictCap(factionVerdict: FactionVerdict, verdict: GameVerdict | undefined): VerdictCap | undefined {
    const finalClass = factionVerdict.outcome_class;
    const ownFlags = factionVerdict.condemnation_flags ?? [];
    const trace = factionVerdict.grade_trace;
    const gradeClass = GRADE_CLASS[factionVerdict.grade];
    if (!gradeClass || rank(gradeClass) >= rank(finalClass)) return undefined;

    const traceIndex = trace?.peace_dysfunction_index ?? null;
    const settlementCapped = trace
        ? trace.peace_dysfunction_band !== 'none'
        : ownFlags.length === 0 && typeof verdict?.peace_dysfunction_index === 'number' && finalClass === 'hollow_victory';
    let source: VerdictCap['source'] | undefined;
    if (settlementCapped) source = 'settlement';
    else if (ownFlags.length > 0) source = 'condemnation';
    if (!source) return undefined;

    const index = source === 'settlement' ? traceIndex ?? verdict?.peace_dysfunction_index ?? undefined : undefined;
    const from = source === 'settlement' && trace ? trace.base_outcome_class : gradeClass;
    const fromLabel = formatVerdictOutcomeClass(from);
    const toLabel = formatVerdictOutcomeClass(finalClass);
    const traceBand = trace?.peace_dysfunction_band;
    const band: VerdictCap['band'] = source !== 'settlement'
        ? undefined
        : traceBand && traceBand !== 'none'
            ? traceBand
            : typeof index === 'number' && index >= 60 ? 'hard' : 'soft';
    return {
        source,
        from,
        to: finalClass,
        fromLabel,
        toLabel,
        band,
        index: typeof index === 'number' ? Math.round(index) : undefined,
        chip: t(source === 'settlement' ? 'verdict.cap.chip.settlement' : 'verdict.cap.chip.condemnation', { from: fromLabel, to: toLabel }),
    };
}

/** The Srebrenica genocide, if recorded in this campaign, as it stands to the side in focus. */
export function selectVerdictStain(costLedger: CostLedger | undefined, focusFaction: string | undefined): VerdictStain | undefined {
    const rupture = (costLedger?.rupture_consequences ?? []).find(r => r.id === 'srebrenica_genocide_1995');
    if (!rupture || !focusFaction) return undefined;
    const relation: VerdictStainRelation = rupture.perpetrator_faction === focusFaction
        ? 'perpetrator'
        : focusFaction === 'RBiH' ? 'victims_state' : 'other';
    const key: MessageKey = relation === 'perpetrator'
        ? 'verdict.stain.srebrenica.perpetrator'
        : relation === 'victims_state' ? 'verdict.stain.srebrenica.victimsState' : 'verdict.stain.srebrenica.other';
    return { ruptureId: rupture.id, relation, text: t(key) };
}

function headlineKey(factionVerdict: FactionVerdict, cap: VerdictCap | undefined): MessageKey {
    const ownFlags = factionVerdict.condemnation_flags ?? [];
    switch (factionVerdict.outcome_class) {
        case 'strategic_success': return 'verdict.headline.strategicSuccess';
        case 'survival': return 'verdict.headline.survival';
        case 'negotiated_escape': return 'verdict.headline.negotiatedEscape';
        case 'pyrrhic_success': return 'verdict.headline.pyrrhicSuccess';
        case 'hollow_victory':
            return cap?.source === 'settlement' || ownFlags.length === 0
                ? 'verdict.headline.hollowPeace'
                : 'verdict.headline.hollowCondemned';
        case 'failure':
            return ownFlags.includes('genocide_condemnation')
                ? 'verdict.headline.failureGenocide'
                : 'verdict.headline.failure';
        case 'collapse': return 'verdict.headline.collapse';
    }
}

function selectTone(input: VerdictSceneInput, factionVerdict: FactionVerdict | undefined): VerdictSceneTone {
    if (factionVerdict && (factionVerdict.outcome_class === 'collapse' || (factionVerdict.condemnation_flags ?? []).length > 0)) {
        return 'catastrophic';
    }
    if (isEarlyPeace(input)) return 'early_peace';
    if (factionVerdict?.outcome_class === 'pyrrhic_success' || factionVerdict?.outcome_class === 'hollow_victory') return 'pyrrhic';
    return 'somber';
}

function buildSubheadline(
    input: VerdictSceneInput,
    factionVerdict: FactionVerdict | undefined,
    cap: VerdictCap | undefined,
    stain: VerdictStain | undefined,
): string[] {
    const parts: string[] = [];
    if (isEarlyPeace(input)) {
        parts.push(t('verdict.scene.headline.earlyPeace') + '.', t('verdict.scene.subheadline.earlyPeace'));
    }
    if (factionVerdict && cap) {
        parts.push(t(cap.source === 'settlement' ? 'verdict.sub.gradeCapSettlement' : 'verdict.sub.gradeCapCondemnation', {
            grade: factionVerdict.grade,
            outcome: cap.toLabel,
        }));
        if (cap.source === 'settlement' && typeof cap.index === 'number') {
            // With a grade trace the index is this side's own reading, and the sentence says so
            // (one settlement can score differently per side); older saves carry only the
            // settlement-wide index (§4 panel round 2).
            const perSide = Boolean(factionVerdict.grade_trace);
            const key: MessageKey = cap.band === 'failure'
                ? 'verdict.sub.settlementCapFailure'
                : cap.band === 'soft'
                    ? (perSide ? 'verdict.sub.settlementCapSoft' : 'verdict.sub.settlementCapSoftLegacy')
                    : (perSide ? 'verdict.sub.settlementCapHard' : 'verdict.sub.settlementCapHardLegacy');
            parts.push(t(key, { index: cap.index }));
        }
    }
    // The Srebrenica line stands on its own line, never joined after a cap sentence (§4 panel,
    // red-team A2); it is rendered from `stain`.
    if (parts.length === 0 && !stain) parts.push(t('verdict.sub.costLedgerBelow'));
    return parts;
}

/** The human-cost totals of the war, the cost panel's lead (no finding outranks them). */
function selectCostEmphasis(costLedger: CostLedger | undefined): VerdictCostEmphasis {
    if (!costLedger) {
        return {
            title: t('verdict.scene.costMissing.title'),
            text: t('verdict.scene.costMissing.text'),
            severity: 'none',
            category: 'none',
            source: 'none',
        };
    }
    return {
        title: t('verdict.scene.costTotals.title'),
        text: t('verdict.scene.costTotals.text', {
            militaryKilled: formatCount(costLedger.total_military_killed),
            civilianKilled: formatCount(costLedger.total_civilian_killed),
        }),
        severity: costLedger.total_military_killed > 0 || costLedger.total_civilian_killed > 0 ? 'grave' : 'record',
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
    const factionVerdict = focusFaction ? input.verdict?.faction_verdicts?.[focusFaction] : undefined;
    const cap = factionVerdict ? selectVerdictCap(factionVerdict, input.verdict) : undefined;
    const stain = selectVerdictStain(input.costLedger, focusFaction);
    const subject = focusFaction && SIDE_SUBJECT_KEYS[focusFaction] ? t(SIDE_SUBJECT_KEYS[focusFaction]) : formatVerdictSideName(focusFaction);
    const subheadlineParts = buildSubheadline(input, factionVerdict, cap, stain);

    return {
        tone: selectTone(input, factionVerdict),
        headline: factionVerdict ? t(headlineKey(factionVerdict, cap), { side: subject }) : t('verdict.scene.headline.somber'),
        subheadline: subheadlineParts.join(' '),
        subheadlineParts,
        focusFaction,
        focusSideName: formatVerdictSideName(focusFaction),
        focusOutcomeClass: factionVerdict?.outcome_class,
        focusOutcomeLabel: formatVerdictOutcomeClass(factionVerdict?.outcome_class),
        focusGrade: factionVerdict?.grade,
        focusScore: factionVerdict?.pyrrhic_score,
        cap,
        stain,
        costEmphasis: selectCostEmphasis(input.costLedger),
        comparisonCallouts: selectComparisonCallouts(input.historicalComparison),
    };
}
