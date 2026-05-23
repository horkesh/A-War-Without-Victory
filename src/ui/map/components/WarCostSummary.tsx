/**
 * War Cost Summary — downstream comparison surface.
 * Consumes buildCostLedger() and compareToHistorical() outputs.
 * Does not re-derive upstream truth. Canonical owner for cost display.
 */

import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';
import { t, useLocale } from '../i18n';

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

    const knownNotes: Record<string, string> = {
        'Srebrenica genocide occurred': t('warCost.divergence.srebrenicaOccurred'),
        'Srebrenica genocide occurred as in the historical war': t('warCost.divergence.srebrenicaOccurredHistorical'),
        'Srebrenica enclave survived': t('warCost.divergence.srebrenicaSurvived'),
    };
    return knownNotes[note] ?? note;
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

    return (
        <div data-tutorial-step="cost-ledger" className="p-6 space-y-4 border-t border-panel-border">
            <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-semibold">
                {t('warCost.title')}
            </div>

            {/* Key figures */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
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
                    value={t('warCost.weekCount', { count: costLedger.war_duration_weeks })}
                />
                <CostRow
                    label={t('warCost.vsHistoricalDuration')}
                    value={formatDurationDelta(comparison.duration_delta_weeks, costLedger.war_duration_weeks - comparison.duration_delta_weeks)}
                />
                <CostRow
                    label={t('warCost.militaryCasualtiesVsHistory')}
                    value={formatCasualtyRatio(comparison.casualty_ratio)}
                />
            </div>

            {/* Operation opportunity reckoning */}
            {opportunityLedger && opportunityLedger.total_decisions > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">
                        {t('warCost.opportunityDecisions')}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
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
                    <div className="space-y-1">
                        {opportunityLedger.entries.map((entry) => (
                            <div
                                key={entry.proposal_id}
                                className="flex items-center justify-between gap-3 text-[10px] text-text-secondary"
                            >
                                <div className="min-w-0">
                                    <span className="text-text-primary font-medium">
                                        {entry.display_name}
                                    </span>
                                    <span className="ml-2 uppercase text-[8px] tracking-wider text-text-secondary/80">
                                        {entry.faction} / {entry.response.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="shrink-0 text-right tabular-nums">
                                    <span className="text-text-primary">
                                        {formatExitClass(entry.exit_class)}
                                    </span>
                                    {entry.total_attacks > 0 && (
                                        <span className="ml-2">
                                            {t('warCost.attackCount', { count: entry.total_attacks })}
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
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">
                        {t('warCost.prosecutorialFindings')}
                    </div>
                    <div className="space-y-2">
                        {costLedger.findings.map((finding) => (
                            <div
                                key={finding.id}
                                className="border-l border-panel-border pl-3 text-[10px] text-text-secondary leading-relaxed"
                            >
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-text-primary font-semibold">
                                        {finding.title}
                                    </span>
                                    <span className="shrink-0 uppercase text-[8px] tracking-wider text-text-secondary/80">
                                        {finding.faction ? `${finding.faction} / ` : ''}{finding.severity}
                                    </span>
                                </div>
                                <div>{finding.text}</div>
                                {finding.sources.length > 0 && (
                                    <div className="mt-1 text-[9px] text-text-secondary/75">
                                        {t('warCost.sources', { sources: finding.sources.join('; ') })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Territory divergence */}
            {Object.keys(comparison.territory_divergence).length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">
                        {t('warCost.territoryVsDayton')}
                    </div>
                    <div className="space-y-1">
                        {Object.entries(comparison.territory_divergence).map(([key, delta]) => (
                            <div key={key} className="text-[10px] text-text-secondary">
                                {formatTerritoryDivergence(key, delta)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Divergence notes */}
            {comparison.divergence_notes.length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">
                        {t('warCost.historicalDivergence')}
                    </div>
                    <div className="space-y-1">
                        {comparison.divergence_notes.map((note, i) => (
                            <div key={i} className="text-[10px] text-text-secondary leading-relaxed">
                                {formatHistoricalDivergenceNote(note)}
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

function CostRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text-primary tabular-nums font-medium">{value}</span>
        </div>
    );
}

function OpportunityMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded border border-panel-border bg-panel-card/35 px-3 py-2">
            <div className="text-[8px] uppercase tracking-wider text-text-secondary/80">
                {label}
            </div>
            <div className="text-[15px] font-bold tabular-nums text-text-primary">
                {value}
            </div>
        </div>
    );
}
