/**
 * Reusable combat summary display for corps/army_hq formations.
 * Used by CorpsDetail, ArmyDetail, and FormationDetail.
 */
import type { FormationView } from '../data/types';

const ARC_COLORS: Record<string, string> = {
    veteran: 'text-green-400',
    bloodied: 'text-amber-400',
    shattered: 'text-red-400',
    risen: 'text-emerald-300',
    destroyed: 'text-neutral-500',
    garrison: 'text-neutral-400',
};

interface CombatSummaryPanelProps {
    summary: NonNullable<FormationView['combatSummary']>;
    formations?: FormationView[];
    onSelectFormation?: (id: string) => void;
    compact?: boolean;
}

function resolveName(id: string | null, formations?: FormationView[]): string | null {
    if (!id || !formations) return null;
    return formations.find((f) => f.id === id)?.name ?? id;
}

export function CombatSummaryPanel({ summary, formations, onSelectFormation, compact }: CombatSummaryPanelProps) {
    const territoryNet = summary.total_osids_captured - summary.total_osids_lost;
    const territorySign = territoryNet > 0 ? '+' : territoryNet < 0 ? '' : '±';

    return (
        <div className="border-t border-panel-border pt-2 mb-3 text-[11px]">
            <div className="text-text-secondary font-semibold mb-1.5 text-[10px] uppercase tracking-wide">
                Combat Record
            </div>

            {/* Battle tallies */}
            <div className="space-y-0.5">
                <div className="flex justify-between">
                    <span className="text-text-secondary">Battles</span>
                    <span className="text-text-primary tabular-nums">
                        {summary.battles_fought}
                        <span className="text-text-secondary ml-1">
                            ({summary.battles_as_attacker} att / {summary.battles_as_defender} def)
                        </span>
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-secondary">Win Rate</span>
                    <span className="text-text-primary tabular-nums">
                        {(summary.win_rate * 100).toFixed(1)}%
                        <span className="text-text-secondary ml-1">
                            {summary.victories}W {summary.defeats}L {summary.stalemates}D
                        </span>
                    </span>
                </div>
            </div>

            {/* Casualties */}
            <div className="mt-1.5 space-y-0.5">
                <div className="flex justify-between">
                    <span className="text-text-secondary">Casualties Taken</span>
                    <span className="text-red-400 tabular-nums">{summary.total_casualties_taken.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-secondary">Casualties Inflicted</span>
                    <span className="text-green-400 tabular-nums">{summary.total_casualties_inflicted.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-secondary">Exchange Ratio</span>
                    <span className="text-text-primary tabular-nums">
                        {summary.casualty_exchange_ratio.toFixed(2)}:1
                    </span>
                </div>
            </div>

            {/* Territory */}
            <div className="mt-1.5">
                <div className="flex justify-between">
                    <span className="text-text-secondary">Territory</span>
                    <span className={`tabular-nums ${territoryNet > 0 ? 'text-green-400' : territoryNet < 0 ? 'text-red-400' : 'text-text-primary'}`}>
                        {territorySign}{territoryNet}
                        <span className="text-text-secondary ml-1">
                            ({summary.total_osids_captured} cap / {summary.total_osids_lost} lost)
                        </span>
                    </span>
                </div>
            </div>

            {/* Brigade counts */}
            <div className="mt-1.5">
                <div className="flex justify-between">
                    <span className="text-text-secondary">Brigades</span>
                    <span className="text-text-primary tabular-nums">
                        {summary.active_brigade_count} active / {summary.brigade_count} total
                    </span>
                </div>
                {summary.peak_aggregate_personnel > 0 && (
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Peak Personnel</span>
                        <span className="text-text-primary tabular-nums">{summary.peak_aggregate_personnel.toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* Arc distribution */}
            {Object.keys(summary.arc_distribution).length > 0 && (
                <div className="mt-1.5">
                    <span className="text-text-secondary">Arcs: </span>
                    {Object.entries(summary.arc_distribution)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([arc, count], i) => (
                            <span key={arc}>
                                {i > 0 && <span className="text-text-secondary"> · </span>}
                                <span className={ARC_COLORS[arc] ?? 'text-text-primary'}>
                                    {count} {arc}
                                </span>
                            </span>
                        ))
                    }
                </div>
            )}

            {/* Top brigades (hidden in compact mode) */}
            {!compact && formations && onSelectFormation && (
                (summary.most_victories_brigade_id || summary.most_casualties_brigade_id) && (
                    <div className="mt-1.5 space-y-0.5">
                        {summary.most_victories_brigade_id && (
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Most Victories</span>
                                <button
                                    type="button"
                                    className="text-interactive hover:underline truncate ml-1 text-right"
                                    onClick={() => onSelectFormation(summary.most_victories_brigade_id!)}
                                >
                                    {resolveName(summary.most_victories_brigade_id, formations)}
                                </button>
                            </div>
                        )}
                        {summary.most_casualties_brigade_id && (
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Bloodiest</span>
                                <button
                                    type="button"
                                    className="text-interactive hover:underline truncate ml-1 text-right"
                                    onClick={() => onSelectFormation(summary.most_casualties_brigade_id!)}
                                >
                                    {resolveName(summary.most_casualties_brigade_id, formations)}
                                </button>
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    );
}
