/**
 * War Cost Summary — downstream comparison surface.
 * Consumes buildCostLedger() and compareToHistorical() outputs.
 * Does not re-derive upstream truth. Canonical owner for cost display.
 */

import type { CostLedger, OpportunityCostLedgerEntry } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import type { GameVerdict } from '../../../state/negotiation_types.js';
import { buildHistoricalComparisonLines } from '../data/verdictComparison.js';
import { buildDisplayFindings } from '../data/verdictFindings.js';
import { formatVerdictSideName } from '../data/verdictScene.js';
import { getPlayerSafeMilitaryFactionName, getPlayerSafeOperationName } from '../utils/playerSafeText';
import { formatCount } from '../utils/formatters.js';
import { t, useLocale } from '../i18n';
import { SURFACE_LABEL, SURFACE_LABEL_MUTED, SurfaceFigure, SurfacePanel } from './surface/Surface';
import { BasisStat } from './surface/BasisStat';
export { formatHistoricalDivergenceNote } from '../data/historicalDivergenceNotes.js';

/**
 * Player-facing name of an operation decision (R8 council C8: "una 94", "pauk 94 95"): the
 * executed operation's name, else the name the proposal was reviewed under (the opportunity
 * records the adapter builds), else the id title-cased ("Una 94"), never the raw slug.
 */
export function formatOpportunityName(
    entry: Pick<OpportunityCostLedgerEntry, 'executed_op_name' | 'opportunity_id' | 'proposal_id' | 'display_name'>,
    reviewedNames?: ReadonlyMap<string, string>,
): string {
    if (entry.executed_op_name) return getPlayerSafeOperationName(entry.executed_op_name);
    const reviewed = reviewedNames?.get(entry.proposal_id);
    if (reviewed) return getPlayerSafeOperationName(reviewed);
    const titled = (entry.display_name || entry.opportunity_id).replace(/_+/g, ' ').trim()
        .replace(/\b\w/g, c => c.toUpperCase());
    return titled ? getPlayerSafeOperationName(titled) : t('warCost.operationFallback');
}

// ═══════════════════════════════════════════════════════════════════════════
// Formatting helpers (exported for testing)
// ═══════════════════════════════════════════════════════════════════════════

/** Format a duration delta as a human-readable string. */
export function formatDurationDelta(deltaWeeks: number, historicalWeeks: number): string {
    if (deltaWeeks > 0) {
        return t('warCost.duration.longer', { deltaWeeks, historicalWeeks });
    } else if (deltaWeeks < 0) {
        return t('warCost.duration.shorter', { deltaWeeks: Math.abs(deltaWeeks), historicalWeeks });
    }
    return t('warCost.duration.exact', { historicalWeeks });
}

/** Format a ratio as a percentage string with direction indicator. */
export function formatCasualtyRatio(ratio: number): string {
    const index = Math.round(ratio * 100);
    return t('warCost.casualtyIndex', { index });
}

/** Format territory divergence entry. */
export function formatTerritoryDivergence(key: string, delta: number): string {
    const label = key === 'RBiH_HRHB_Federation' ? t('warCost.federation') : key;
    if (Math.abs(delta) < 0.5) return t('warCost.territoryWithinRange', { label });
    const directionKey = delta > 0 ? 'warCost.direction.more' : 'warCost.direction.less';
    return t('warCost.territoryDivergence', {
        label,
        delta: Math.abs(delta).toFixed(1),
        direction: t(directionKey),
    });
}

function formatExitClass(exitClass: string | undefined, gameOver = true): string {
    if (!exitClass && gameOver) return t('warCost.exit.unresolvedAtEnd');
    return formatExitClassLabel(exitClass);
}

function formatExitClassLabel(exitClass: string | undefined): string {
    const labels: Record<string, string> = {
        decisive_success: t('warCost.exit.decisiveSuccess'),
        partial_success: t('warCost.exit.partialSuccess'),
        failed: t('warCost.exit.failed'),
        aborted: t('warCost.exit.aborted'),
        did_not_launch: t('warCost.exit.didNotLaunch'),
        t3_authorized_no_offensive: t('warCost.exit.defensiveCommitment'),
    };
    return labels[exitClass ?? ''] ?? t('warCost.exit.pendingOutcome');
}

function formatOpportunityResponse(response: string): string {
    const labels: Record<string, string> = {
        approve: t('warCost.response.approve'),
        delay: t('warCost.response.delay'),
        redirect: t('warCost.response.redirect'),
        under_resource: t('warCost.response.underResource'),
        decline: t('warCost.response.decline'),
        expire: t('warCost.response.expire'),
    };
    return labels[response] ?? t('warCost.response.reviewed');
}

export function formatFindingSeverity(severity: string): string {
    const labels: Record<string, string> = {
        record: t('warCost.findingSeverity.record'),
        grave: t('warCost.findingSeverity.grave'),
        rupture: t('warCost.findingSeverity.rupture'),
        none: t('warCost.findingSeverity.none'),
    };
    return labels[severity] ?? t('warCost.findingSeverity.record');
}

function formatFindingFaction(faction: string | undefined): string | null {
    if (!faction) return null;
    const labels: Record<string, string> = {
        RBiH: t('warCost.findingFaction.RBiH'),
        RS: t('warCost.findingFaction.RS'),
        HRHB: t('warCost.findingFaction.HRHB'),
    };
    return labels[faction] ?? getPlayerSafeMilitaryFactionName(faction);
}

function formatFindingBadge(finding: { faction?: string; severity: string }): string {
    const severity = formatFindingSeverity(finding.severity);
    const faction = formatFindingFaction(finding.faction);
    return faction ? `${faction} / ${severity}` : severity;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export interface WarCostSummaryProps {
    costLedger: CostLedger;
    comparison: ComparisonResult;
    /** The frozen verdict: its graded territory shares feed the territory comparison line. */
    verdict?: GameVerdict;
    /** proposal_id → name the proposal was reviewed under (adapter opportunity records). */
    opportunityNames?: ReadonlyMap<string, string>;
    /** Shares under the signed settlement, for the territory comparison line. */
    settledShares?: Readonly<Record<string, number>>;
}

/**
 * R8 ending truth pass (2026-11-14): every casualty and displacement figure carries its basis,
 * the historical comparison is rebuilt from structured data (like-for-like end of war, one
 * source for military and civilian dead, integers only), findings are localized and deduped
 * with public sources only, and operations show names, not ids.
 */
export function WarCostSummary({ costLedger, comparison, verdict, opportunityNames, settledShares }: WarCostSummaryProps) {
    useLocale();
    const opportunityLedger = costLedger.operation_opportunities;
    const comparisonLines = buildHistoricalComparisonLines({ verdict, costLedger, comparison, settledShares });
    const findings = buildDisplayFindings(costLedger);
    const displacedOrKilled = costLedger.entries.reduce((sum, entry) => sum + Math.max(0, entry.refugees_created), 0);

    return (
        <div data-tutorial-step="cost-ledger" className="flex flex-col gap-6">
            <h4 className={`m-0 ${SURFACE_LABEL}`}>
                {t('warCost.title')}
            </h4>

            {/* Key figures, each with its basis (R8 council B6). */}
            <SurfacePanel className="grid grid-cols-1 gap-x-8 md:grid-cols-2" data-awwv-war-cost-figures>
                <BasisStat
                    label={t('warCost.totalMilitaryKilled')}
                    value={formatCount(costLedger.total_military_killed)}
                    basis={t('verdict.basis.campaignAllSides')}
                    kind="casualty"
                />
                <BasisStat
                    label={t('warCost.totalCivilianKilled')}
                    value={formatCount(costLedger.total_civilian_killed)}
                    basis={t('verdict.basis.campaignAllSides')}
                    kind="casualty"
                />
                <BasisStat
                    label={t('verdict.report.stat.refugeesCreated')}
                    value={formatCount(displacedOrKilled)}
                    basis={t('verdict.basis.displacedAllSides')}
                    kind="displacement"
                />
                <BasisStat
                    label={t('warCost.warDuration')}
                    value={t('warCost.weeksValue', { weeks: costLedger.war_duration_weeks })}
                    basis={t('verdict.basis.duration')}
                    kind="record"
                />
            </SurfacePanel>

            {/* Against the historical war (R8 council B8, H2, H3). */}
            {comparisonLines.length > 0 && (
                <div className="flex flex-col gap-2" data-awwv-historical-comparison={comparisonLines.length}>
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('verdict.compare.title')}
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {comparisonLines.map(line => (
                            <li key={line.id} data-awwv-comparison-line={line.id} className="text-[16px] leading-relaxed text-[#ddd1b3]">
                                {line.text}
                            </li>
                        ))}
                    </ul>
                    <p className="m-0 text-[15px] text-[#9c917b]">{t('verdict.compare.sources')}</p>
                </div>
            )}

            {/* Operation opportunity reckoning */}
            {opportunityLedger && opportunityLedger.total_decisions > 0 && (
                <div className="flex flex-col gap-3">
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('warCost.opportunityDecisions')}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <OpportunityMetric
                            label={t('warCost.decisions')}
                            value={String(opportunityLedger.total_decisions)}
                        />
                        <OpportunityMetric
                            label={t('warCost.completed')}
                            value={String(opportunityLedger.completed)}
                        />
                        <OpportunityMetric
                            label={t('warCost.successes')}
                            value={String(opportunityLedger.successes)}
                        />
                    </div>
                    <div className="flex flex-col">
                        {opportunityLedger.entries.map((entry) => (
                            <div
                                key={entry.proposal_id}
                                className="flex items-baseline justify-between gap-4 border-b border-[#262b35] py-2.5 text-[16px] text-[#c2b69c] last:border-b-0"
                            >
                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                    <span className="font-semibold text-[#f1e6c8]" data-awwv-opportunity-name>
                                        {formatOpportunityName(entry, opportunityNames)}
                                    </span>
                                    <span className="text-[15px] text-[#b9ad94]">
                                        {formatVerdictSideName(entry.faction)} / {formatOpportunityResponse(entry.response)}
                                    </span>
                                </div>
                                <div className="shrink-0 text-right tabular-nums">
                                    <span className="text-[#f1e6c8]">
                                        {formatExitClass(entry.exit_class)}
                                    </span>
                                    {entry.total_attacks > 0 && (
                                        <span className="ml-2">
                                            {t('warCost.attacks', { count: entry.total_attacks })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Findings: one per id, localized, public sources only (R8 council B5, C1, C3). */}
            {findings.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('warCost.prosecutorialFindings')}
                    </div>
                    <div className="flex flex-col gap-3">
                        {findings.map((finding) => (
                            <div
                                key={finding.id}
                                data-awwv-finding={finding.id}
                                className="flex flex-col gap-1.5 border-l-2 border-[#3a4150] pl-4 text-[16px] leading-relaxed text-[#ddd1b3]"
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <span className="text-[17px] font-semibold text-[#f1e6c8]">
                                        {finding.title}
                                    </span>
                                    <span className="shrink-0 font-mono text-[14px] font-semibold uppercase tracking-[0.12em] text-[#b9ad94]">
                                        {formatFindingBadge(finding)}
                                    </span>
                                </div>
                                <div>{finding.text}</div>
                                {finding.sources.length > 0 && (
                                    <div className="text-[15px] text-[#9c917b]">
                                        {t('warCost.sources')}: {finding.sources.join('; ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-component
// ═══════════════════════════════════════════════════════════════════════════

function OpportunityMetric({ label, value }: { label: string; value: string }) {
    return <SurfaceFigure label={label} value={value} tone="font-mono tabular-nums text-[#f1e6c8]" />;
}

