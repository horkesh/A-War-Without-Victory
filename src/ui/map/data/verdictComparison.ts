/**
 * The Verdict's comparison with the historical war (R8 council fix 1: B6, B8, H2, H3).
 *
 * Built from structured data, not from the comparison's English notes, so saves frozen before
 * the ending truth pass also read correctly: the end of the war against the like-for-like
 * historical endpoint (Dayton initialled, 21 Nov 1995, for a settled campaign; the ceasefire of
 * 12 Oct 1995 otherwise), military and civilian dead against one source (RDC 2007), and the
 * territory against Dayton or the ceasefire line. Every figure is an integer or a share with its
 * basis in the sentence; no "percent of history" (Sensitive History Design Gate §4).
 */
import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import { historicalMilitaryKilled, SREBRENICA_RUPTURE_FIRST_TURN } from '../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict, HistoricalBaseline, HistoricalEndingBasis } from '../../../state/negotiation_types.js';
import historicalBaselineJson from '../../../../data/reference/historical_baseline.json';
import { t } from '../i18n';
import { formatCount, turnToDateString } from '../utils/formatters.js';
import { formatHistoricalDivergenceNote } from './historicalDivergenceNotes.js';

const HISTORICAL_BASELINE = historicalBaselineJson as HistoricalBaseline;

export type ComparisonLineId = 'end_of_war' | 'military_dead' | 'civilian_dead' | 'territory' | 'srebrenica';

export interface ComparisonLine {
    id: ComparisonLineId;
    text: string;
}

export interface ComparisonLinesInput {
    verdict?: GameVerdict;
    costLedger?: CostLedger;
    comparison?: ComparisonResult;
    /**
     * Shares under the signed settlement (`settlement.territory_pct` / the signed map). The
     * verdict's graded shares leave out the cells of an overrun safe area, so they cannot
     * describe the map (§4 panel, red-team A7).
     */
    settledShares?: Readonly<Record<string, number>>;
}

/** The Srebrenica notes the comparison writes (the other notes are rebuilt here). */
const SREBRENICA_NOTES: ReadonlySet<string> = new Set([
    'Srebrenica genocide occurred',
    'Srebrenica genocide occurred as in the historical war',
    'Srebrenica enclave survived',
    'Srebrenica enclave was overrun',
]);

/** How the campaign ended: the comparison's own record, else the verdict's outcome type. */
export function endingBasisFor(input: ComparisonLinesInput): HistoricalEndingBasis {
    if (input.comparison?.historical_reference_basis) return input.comparison.historical_reference_basis;
    return input.verdict && input.verdict.outcome_type !== 'termination' ? 'settlement' : 'no_settlement';
}

function sharePct(value: number): string {
    return `${value.toFixed(1)}%`;
}

/** Comparison lines in display order. Empty without a cost ledger. */
export function buildHistoricalComparisonLines(input: ComparisonLinesInput): ComparisonLine[] {
    const { costLedger, verdict, comparison } = input;
    if (!costLedger) return [];
    const ending = endingBasisFor(input);
    const lines: ComparisonLine[] = [];

    lines.push({
        id: 'end_of_war',
        text: t(ending === 'settlement' ? 'verdict.compare.endSettlement' : 'verdict.compare.endNoSettlement', {
            date: turnToDateString(costLedger.war_duration_weeks),
        }),
    });
    lines.push({
        id: 'military_dead',
        text: t('verdict.compare.militaryDead', {
            campaign: formatCount(costLedger.total_military_killed),
            history: formatCount(historicalMilitaryKilled(HISTORICAL_BASELINE)),
        }),
    });
    lines.push({
        id: 'civilian_dead',
        text: t('verdict.compare.civilianDead', {
            campaign: formatCount(costLedger.total_civilian_killed),
            history: formatCount(HISTORICAL_BASELINE.civilian_killed),
        }),
    });

    // The map's shares: the signed settlement's for a settled campaign, else the front line at
    // the end (the ledger's area shares, every cell counted).
    const settled = ending === 'settlement' ? input.settledShares : undefined;
    const share = (faction: string): number | undefined => settled?.[faction]
        ?? costLedger.entries.find(entry => entry.faction === faction)?.territory_controlled_pct;
    const rbih = share('RBiH');
    const hrhb = share('HRHB');
    const rs = share('RS');
    if (typeof rbih === 'number' && typeof hrhb === 'number' && typeof rs === 'number') {
        lines.push({
            id: 'territory',
            text: t(ending === 'settlement' ? 'verdict.compare.territorySettlement' : 'verdict.compare.territoryNoSettlement', {
                federation: sharePct(rbih + hrhb),
                rs: sharePct(rs),
            }),
        });
    }

    const srebrenica = (comparison?.divergence_notes ?? []).find(note => SREBRENICA_NOTES.has(note));
    // "Survived" only for a war that reached the rupture window (§4 panel, red-team A9).
    const survivedTooEarly = srebrenica === 'Srebrenica enclave survived'
        && costLedger.war_duration_weeks < SREBRENICA_RUPTURE_FIRST_TURN;
    if (srebrenica && !survivedTooEarly) lines.push({ id: 'srebrenica', text: formatHistoricalDivergenceNote(srebrenica) });
    return lines;
}
