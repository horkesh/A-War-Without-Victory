/**
 * Reusable combat summary display for corps/army_hq formations.
 * Used by CorpsDetail, ArmyDetail, and FormationDetail.
 */
import type { FormationView } from '../data/types';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';

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
    /** When true, omit top border (e.g. when already inside a bordered section). */
    noTopBorder?: boolean;
}

function resolveName(id: string | null, formations?: FormationView[]): string | null {
    if (!id || !formations) return null;
    const formation = formations.find((f) => f.id === id);
    return getPlayerSafeBrigadeName(formation?.name ?? null);
}

export function CombatSummaryPanel({ summary, formations, onSelectFormation, compact, noTopBorder }: CombatSummaryPanelProps) {
    const territoryNet = summary.total_osids_captured - summary.total_osids_lost;
    const territorySign = territoryNet > 0 ? '+' : territoryNet < 0 ? '' : '±';

    return (
        <div className={`pt-2 mb-3 text-[11px] ${noTopBorder ? '' : 'border-t border-panel-border'}`}>
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
                    <span className="text-text-secondary">Men lost</span>
                    <span className="text-red-400 tabular-nums">{summary.total_casualties_taken.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-secondary">Casualties inflicted</span>
                    <span className="text-green-400 tabular-nums">{summary.total_casualties_inflicted.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-secondary">Exchange ratio</span>
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
                        <span className="text-text-primary tabular-nums">{Math.max(summary.peak_aggregate_personnel, summary.current_personnel).toLocaleString()}</span>
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
                    <div className="mt-1.5 space-y-1.5">
                        {summary.most_victories_brigade_id && (
                            <div className="flex justify-between items-center text-xs p-1.5 bg-accent-gold/5 border border-accent-gold/20 rounded">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-accent-gold" title="Most Victorious Brigade">⭐</span>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-wide text-text-secondary">Wall of Valor</span>
                                        <button
                                            type="button"
                                            className="text-text-primary hover:text-interactive text-left font-semibold truncate max-w-[120px]"
                                            onClick={() => onSelectFormation(summary.most_victories_brigade_id!)}
                                        >
                                            {resolveName(summary.most_victories_brigade_id, formations)}
                                        </button>
                                    </div>
                                </div>
                                <span className="text-accent-gold font-mono text-xs">MVP</span>
                            </div>
                        )}
                        {summary.most_casualties_brigade_id && (
                            <div className="flex justify-between items-center text-xs p-1.5 bg-[#d45555]/5 border border-[#d45555]/20 rounded">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#d45555]" title="Highest Casualties Brigade">🩸</span>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase tracking-wide text-text-secondary">Bleeding Edge</span>
                                        <button
                                            type="button"
                                            className="text-text-primary hover:text-interactive text-left font-semibold truncate max-w-[120px]"
                                            onClick={() => onSelectFormation(summary.most_casualties_brigade_id!)}
                                        >
                                            {resolveName(summary.most_casualties_brigade_id, formations)}
                                        </button>
                                    </div>
                                </div>
                                <span className="text-[#d45555] font-mono text-xs">HEAVIEST LOSSES</span>
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    );
}
