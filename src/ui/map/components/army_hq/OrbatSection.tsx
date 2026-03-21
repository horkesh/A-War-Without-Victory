/**
 * ORBAT section for expanded corps card.
 * NATO Terminal Aesthetic (Option 1).
 */
import { useMemo, useState } from 'react';
import type { FormationView } from '../../data/types';
import { getCohesionColor, OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel, formatOsidLabel } from '../../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';

interface OrbatSectionProps {
    corpsId: string;
    brigades: FormationView[];
}

const STATUS_COLOR: Record<string, string> = {
    active: 'text-[#4af626]',
    disrupted: 'text-red-500',
    forming: 'text-amber-500',
    reserve: 'text-blue-400',
};

function BrigadeExpandedDetail({ b }: { b: FormationView }) {
    const morale = Math.round(b.morale ?? 0);
    const entrenchment = b.entrenchment_turns ?? 0;
    const officerQuality = b.officer_quality;
    const comp = b.composition;
    const hist = b.brigade_history;
    const engagements = b.recent_engagements ?? [];
    const narrative = b.warNarrative;

    return (
        <div className="px-4 py-3 space-y-4 text-[11px] border-t border-[#4af626]/10 bg-black/40 font-mono">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 uppercase tracking-tight">
                <div className="flex justify-between border-b border-[#4af626]/5 pb-1">
                    <span className="text-[#4af626]/40">MORALE</span>
                    <span className={`font-bold ${morale < 30 ? 'text-red-500' : morale < 50 ? 'text-amber-500' : 'text-[#4af626]'}`}>{morale}%</span>
                </div>
                <div className="flex justify-between border-b border-[#4af626]/5 pb-1">
                    <span className="text-[#4af626]/40">ENTRENCH</span>
                    <span className="text-[#4af626]/80">{entrenchment.toFixed(1)} T</span>
                </div>
                {officerQuality != null && (
                    <div className="flex justify-between border-b border-[#4af626]/5 pb-1">
                        <span className="text-[#4af626]/40">OFFICERS</span>
                        <span className="text-[#4af626]/80">{(officerQuality * 100).toFixed(0)}%</span>
                    </div>
                )}
                {b.home_defense_active && (
                    <div className="col-span-full">
                        <span className="text-[10px] font-bold text-black bg-[#4af626] px-2 py-0.5 tracking-widest">HOME DEFENSE ACTIVE</span>
                    </div>
                )}
            </div>

            {/* Equipment */}
            {comp && (comp.tanks > 0 || comp.artillery > 0) && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest">MATERIAL STATUS</div>
                    <div className="grid grid-cols-2 gap-4">
                        {comp.tanks > 0 && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-[#4af626]/30 uppercase">ARMOURED UNITS</span>
                                <span className="text-[#4af626] font-bold">{comp.tank_condition.operational} / {comp.tanks} OP</span>
                            </div>
                        )}
                        {comp.artillery > 0 && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-[#4af626]/30 uppercase">ARTILLERY ASSETS</span>
                                <span className="text-[#4af626] font-bold">{comp.artillery_condition.operational} / {comp.artillery} OP</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent engagements */}
            {engagements.length > 0 && (
                <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-bold uppercase text-red-500/60 tracking-widest border-b border-red-500/10 pb-1">RECENT ENGAGEMENTS</div>
                    <div className="space-y-1.5">
                        {engagements.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-[#4af626]/40 w-6">W{e.turn}</span>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none ${OUTCOME_COLORS[e.outcome] ? 'opacity-80' : 'opacity-40'}`}
                                    style={{ color: OUTCOME_COLORS[e.outcome] ?? '#4af626', borderColor: (OUTCOME_COLORS[e.outcome] ?? '#4af626') + '40' }}>
                                    {e.outcome.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[#4af626]/60 w-8">{e.role === 'attacker' ? 'ATK' : 'DEF'}</span>
                                <span className="text-red-500 font-bold">-{e.casualties_taken} PERS</span>
                                {e.territory_flipped && <span className="text-[#4af626] text-[9px] font-bold">[!] CAPTURE</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Narrative */}
            {narrative && (
                <div className="border-t border-[#4af626]/10 pt-3">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest mb-1">INTEL NARRATIVE</div>
                    <div className="text-[12px] text-[#4af626]/80 leading-relaxed italic">{narrative}</div>
                </div>
            )}
        </div>
    );
}

export function OrbatSection({ corpsId, brigades }: OrbatSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const sorted = useMemo(() => [...brigades].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })), [brigades]);

    return (
        <CollapsibleSection sectionKey={`orbat-${corpsId}`} title="ORBAT" count={brigades.length}>
            <div className="max-h-[500px] overflow-y-auto space-y-1 pr-2 custom-scrollbar font-mono">
                <div className="flex items-center px-4 py-1 text-[9px] text-[#4af626]/30 uppercase tracking-widest font-bold">
                    <span className="w-6 shrink-0" />
                    <span className="flex-1 min-w-0">UNIT IDENTIFIER</span>
                    <span className="w-16 text-right shrink-0">STRGTH</span>
                    <span className="w-20 text-center shrink-0">COHESION</span>
                    <span className="w-10 text-right shrink-0">FATG</span>
                    <span className="w-14 text-right shrink-0">POSTURE</span>
                </div>

                {sorted.map((b) => {
                    const cohesion = Math.round(Math.max(0, Math.min(100, b.cohesion ?? 0)));
                    const fatigue = Math.round(b.fatigue ?? 0);
                    const personnel = b.personnel ?? 0;
                    const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                    const status = isDisrupted ? 'disrupted' : b.status;
                    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.active;
                    const cohesionColor = getCohesionColor(cohesion);
                    const filledSegments = Math.ceil(cohesion / 20);
                    const isExpanded = expandedId === b.id;

                    return (
                        <div key={b.id} className={`border border-[#4af626]/5 mb-[1px] ${isExpanded ? 'bg-[#4af626]/5' : ''}`}>
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2 transition-all text-left ${isExpanded ? '' : 'hover:bg-[#4af626]/5'
                                    }`}>
                                {/* Expand indicator */}
                                <span className={`text-[9px] text-[#4af626]/40 w-2 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    ▶
                                </span>

                                {/* Name */}
                                <span className="text-[12px] font-bold text-[#4af626]/80 flex-1 min-w-0 uppercase tracking-tight">
                                    {b.name}
                                </span>

                                {/* Personnel */}
                                <span className="text-[11px] tabular-nums text-[#4af626]/60 w-16 text-right shrink-0">
                                    {formatPersonnel(personnel)}
                                </span>

                                {/* Cohesion segments */}
                                <div className="flex gap-1 w-20 justify-center shrink-0">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2.5 w-2 border border-black/40 ${i < filledSegments ? '' : 'bg-black/40 opacity-20'}`}
                                            style={{ backgroundColor: i < filledSegments ? cohesionColor : undefined }}
                                        />
                                    ))}
                                </div>

                                {/* Fatigue */}
                                <span className={`text-[11px] tabular-nums w-10 text-right shrink-0 font-bold ${fatigue >= 20 ? 'text-red-500 underline' : fatigue >= 10 ? 'text-amber-500' : 'text-[#4af626]/40'
                                    }`}>
                                    {fatigue}
                                </span>

                                {/* Status posture */}
                                <span className={`text-[10px] font-bold uppercase w-14 text-right shrink-0 ${statusColor}`}>
                                    {isDisrupted ? `DIS` : (b.posture ?? '—')}
                                </span>
                            </button>
                            {isExpanded && <BrigadeExpandedDetail b={b} />}
                        </div>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
}
