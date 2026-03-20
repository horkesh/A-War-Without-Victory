/**
 * ORBAT section for expanded corps card.
 * Compact brigade list with cohesion bar, fatigue, and status badge.
 */
import type { FormationView } from '../../data/types';
import { FACTION_COLORS } from '../../utils/theme';
import { CollapsibleSection } from './CollapsibleSection';

interface OrbatSectionProps {
    corpsId: string;
    brigades: FormationView[];
}

const STATUS_COLOR: Record<string, string> = {
    active: 'text-[#4a9a55]',
    disrupted: 'text-red-700',
    forming: 'text-amber-600',
    reserve: 'text-blue-600',
};

export function OrbatSection({ corpsId, brigades }: OrbatSectionProps) {
    const sorted = [...brigades].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return (
        <CollapsibleSection sectionKey={`orbat-${corpsId}`} title="ORBAT" count={brigades.length}>
            <div className="max-h-[320px] overflow-y-auto space-y-px">
                {sorted.map((b) => {
                    const cohesion = Math.round(Math.max(0, Math.min(100, b.cohesion ?? 0)));
                    const fatigue = Math.round(b.fatigue ?? 0);
                    const personnel = b.personnel ?? 0;
                    const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                    const status = isDisrupted ? 'disrupted' : b.status;
                    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.active;
                    const factionColor = FACTION_COLORS[b.faction] ?? 'text-[#2a2016]';
                    const cohesionColor = cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040';

                    return (
                        <div key={b.id}
                             className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[#e8dcc4]/50 transition-colors"
                             style={{ fontFamily: 'Courier New, monospace' }}>
                            {/* Name */}
                            <span className={`text-[10px] font-medium truncate flex-1 min-w-0 ${factionColor}`}>
                                {b.name}
                            </span>

                            {/* Personnel */}
                            <span className="text-[9px] tabular-nums text-[#6a5a40] w-10 text-right shrink-0">
                                {personnel >= 1000 ? `${(personnel / 1000).toFixed(1)}k` : personnel}
                            </span>

                            {/* Cohesion bar (5 segments) */}
                            <div className="flex gap-0.5 shrink-0">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <span
                                        key={i}
                                        className="block h-1.5 w-2 rounded-sm"
                                        style={{ backgroundColor: i < Math.ceil(cohesion / 20) ? cohesionColor : '#d4ccc0' }}
                                    />
                                ))}
                            </div>

                            {/* Fatigue */}
                            <span className={`text-[9px] tabular-nums w-4 text-right shrink-0 ${
                                fatigue >= 20 ? 'text-red-700 font-bold' : fatigue >= 10 ? 'text-amber-700' : 'text-[#8a7a60]'
                            }`}>
                                {fatigue}
                            </span>

                            {/* Status badge */}
                            <span className={`text-[7px] font-bold uppercase w-12 text-right shrink-0 ${statusColor}`}>
                                {isDisrupted ? `DIS ${b.disrupted_turns}t` : (b.posture ?? '—')}
                            </span>
                        </div>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
}
