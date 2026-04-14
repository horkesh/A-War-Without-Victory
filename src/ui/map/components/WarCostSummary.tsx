/**
 * War Cost Summary — downstream comparison surface.
 * Consumes buildCostLedger() and compareToHistorical() outputs.
 * Does not re-derive upstream truth. Canonical owner for cost display.
 */

import type { CostLedger } from '../../../sim/endgame/cost_ledger.js';
import type { ComparisonResult } from '../../../sim/endgame/endgame_comparison.js';

// ═══════════════════════════════════════════════════════════════════════════
// Formatting helpers (exported for testing)
// ═══════════════════════════════════════════════════════════════════════════

/** Format a duration delta as a human-readable string. */
export function formatDurationDelta(deltaWeeks: number, historicalWeeks: number): string {
    if (deltaWeeks > 0) {
        return `${deltaWeeks} weeks longer than the historical ${historicalWeeks} weeks`;
    } else if (deltaWeeks < 0) {
        return `${Math.abs(deltaWeeks)} weeks shorter than the historical ${historicalWeeks} weeks`;
    }
    return `Exactly the historical ${historicalWeeks} weeks`;
}

/** Format a ratio as a percentage string with direction indicator. */
export function formatCasualtyRatio(ratio: number): string {
    const pct = Math.round(ratio * 100);
    if (pct > 100) return `${pct}% of historical levels (more costly)`;
    if (pct < 100) return `${pct}% of historical levels (less costly)`;
    return '100% of historical levels (identical)';
}

/** Format territory divergence entry. */
export function formatTerritoryDivergence(key: string, delta: number): string {
    const label = key === 'RBiH_HRHB_Federation' ? 'Federation' : key;
    if (Math.abs(delta) < 0.5) return `${label}: within historical range`;
    const dir = delta > 0 ? 'more' : 'less';
    return `${label}: ${Math.abs(delta).toFixed(1)}% ${dir} than Dayton baseline`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export interface WarCostSummaryProps {
    costLedger: CostLedger;
    comparison: ComparisonResult;
}

export function WarCostSummary({ costLedger, comparison }: WarCostSummaryProps) {
    return (
        <div className="p-6 space-y-4 border-t border-panel-border">
            <div className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-semibold">
                War Cost &amp; Historical Comparison
            </div>

            {/* Key figures */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <CostRow
                    label="Total Military Killed"
                    value={costLedger.total_military_killed.toLocaleString()}
                />
                <CostRow
                    label="Total Civilian Killed"
                    value={costLedger.total_civilian_killed.toLocaleString()}
                />
                <CostRow
                    label="War Duration"
                    value={`${costLedger.war_duration_weeks} weeks`}
                />
                <CostRow
                    label="vs Historical Duration"
                    value={formatDurationDelta(comparison.duration_delta_weeks, costLedger.war_duration_weeks - comparison.duration_delta_weeks)}
                />
                <CostRow
                    label="Military Casualties vs History"
                    value={formatCasualtyRatio(comparison.casualty_ratio)}
                />
            </div>

            {/* Territory divergence */}
            {Object.keys(comparison.territory_divergence).length > 0 && (
                <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-secondary font-semibold mb-2">
                        Territory vs Dayton 49/51
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
                        Historical Divergence
                    </div>
                    <div className="space-y-1">
                        {comparison.divergence_notes.map((note, i) => (
                            <div key={i} className="text-[10px] text-text-secondary leading-relaxed">
                                {note}
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
