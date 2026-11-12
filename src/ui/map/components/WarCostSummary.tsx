/**
 * War Cost Summary — downstream comparison surface.
 * Consumes buildCostLedger() and compareToHistorical() outputs.
 * Does not re-derive upstream truth. Canonical owner for cost display.
 */

import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import { formatHistoricalDivergenceNote } from '../data/historicalDivergenceNotes.js';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { t, useLocale } from '../i18n';
import { SURFACE_LABEL, SURFACE_LABEL_MUTED, SurfaceFigure, SurfacePanel, SurfaceStat } from './surface/Surface';
export { formatHistoricalDivergenceNote } from '../data/historicalDivergenceNotes.js';

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

function formatExitClass(exitClass: string | undefined): string {
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
}

export function WarCostSummary({ costLedger, comparison }: WarCostSummaryProps) {
    useLocale();
    const opportunityLedger = costLedger.operation_opportunities;

    // Surface redesign, step 4 (2026-11-12): surface section labels, stat rows and
    // figure tiles; text 13 px and up. Figures and wording unchanged.
    return (
        <div data-tutorial-step="cost-ledger" className="flex flex-col gap-6">
            <h4 className={`m-0 ${SURFACE_LABEL}`}>
                {t('warCost.title')}
            </h4>

            {/* Key figures */}
            <SurfacePanel className="grid grid-cols-2 gap-x-8">
                <CostRow
                    label={t('warCost.totalMilitaryKilled')}
                    value={costLedger.total_military_killed.toLocaleString()}
                />
                <CostRow
                    label={t('warCost.totalCivilianKilled')}
                    value={costLedger.total_civilian_killed.toLocaleString()}
                />
                <CostRow
                    label={t('warCost.warDuration')}
                    value={t('warCost.weeksValue', { weeks: costLedger.war_duration_weeks })}
                />
                <CostRow
                    label={t('warCost.vsHistoricalDuration')}
                    value={formatDurationDelta(comparison.duration_delta_weeks, costLedger.war_duration_weeks - comparison.duration_delta_weeks)}
                />
                <CostRow
                    label={t('warCost.militaryCasualtiesVsHistory')}
                    value={formatCasualtyRatio(comparison.casualty_ratio)}
                />
            </SurfacePanel>

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
                                    <span className="font-semibold text-[#f1e6c8]">
                                        {entry.display_name}
                                    </span>
                                    <span className="text-[15px] text-[#b9ad94]">
                                        {getPlayerSafeMilitaryFactionName(entry.faction)} / {formatOpportunityResponse(entry.response)}
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

            {/* Prosecutorial findings */}
            {costLedger.findings && costLedger.findings.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('warCost.prosecutorialFindings')}
                    </div>
                    <div className="flex flex-col gap-3">
                        {costLedger.findings.map((finding) => (
                            <div
                                key={finding.id}
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

            {/* Territory divergence */}
            {Object.keys(comparison.territory_divergence).length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('warCost.territoryVsDayton')}
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {Object.entries(comparison.territory_divergence).map(([key, delta]) => (
                            <li key={key} className="text-[16px] leading-relaxed text-[#ddd1b3]">
                                {formatTerritoryDivergence(key, delta)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Divergence notes */}
            {comparison.divergence_notes.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className={SURFACE_LABEL_MUTED}>
                        {t('warCost.historicalDivergence')}
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                        {comparison.divergence_notes.map((note, i) => (
                            <li key={i} className="text-[16px] leading-relaxed text-[#ddd1b3]">
                                {formatHistoricalDivergenceNote(note)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-component
// ═══════════════════════════════════════════════════════════════════════════

function CostRow({ label, value }: { label: string; value: string }) {
    return <SurfaceStat label={label} value={value} />;
}

function OpportunityMetric({ label, value }: { label: string; value: string }) {
    return <SurfaceFigure label={label} value={value} tone="font-mono tabular-nums text-[#f1e6c8]" />;
}
