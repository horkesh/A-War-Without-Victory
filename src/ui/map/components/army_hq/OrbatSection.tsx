/**
 * ORBAT section for expanded corps card.
 * Compact brigade list with cohesion bar, fatigue, and status badge.
 * Click a brigade row to expand stats, equipment, engagements, and narrative.
 */
import { useMemo, useState } from 'react';
import type { FormationView } from '../../data/types';
import { FACTION_COLORS, getCohesionColor, OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel, formatOsidLabel } from '../../utils/formatters';
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


function BrigadeExpandedDetail({ b }: { b: FormationView }) {
    const morale = Math.round(b.morale ?? 0);
    const entrenchment = b.entrenchment_turns ?? 0;
    const officerQuality = b.officer_quality;
    const homeHops = b.homeHops;
    const homeDistMult = b.homeDistanceMult;
    const comp = b.composition;
    const hist = b.brigade_history;
    const engagements = b.recent_engagements ?? [];
    const arc = b.narrativeArc;
    const narrative = b.warNarrative;

    return (
        <div className="px-2 py-2 space-y-2 text-[10px] border-t border-[#c8b898]/30 bg-[#e8dcc4]/30"
             style={{ fontFamily: 'Courier New, monospace' }}>
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                    <span className="text-[#8a7a60]">Morale</span>
                    <span className={morale < 30 ? 'text-red-700 font-bold' : morale < 50 ? 'text-amber-700' : 'text-[#2a2016]'}>{morale}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8a7a60]">Entrench</span>
                    <span className="text-[#2a2016]">{entrenchment.toFixed(1)}t</span>
                </div>
                {officerQuality != null && (
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Officers</span>
                        <span className="text-[#2a2016]">{(officerQuality * 100).toFixed(0)}%</span>
                    </div>
                )}
                {homeHops != null && (
                    <div className="flex justify-between">
                        <span className="text-[#8a7a60]">Home dist</span>
                        <span className="text-[#2a2016]">{homeHops} hops{homeDistMult != null ? ` (${(homeDistMult * 100).toFixed(0)}%)` : ''}</span>
                    </div>
                )}
                {b.home_defense_active && (
                    <div className="col-span-2">
                        <span className="text-[8px] font-bold text-green-700 bg-green-100/50 px-1 rounded border border-green-300/30">HOME DEFENSE</span>
                    </div>
                )}
            </div>

            {/* Equipment */}
            {comp && (comp.tanks > 0 || comp.artillery > 0 || comp.aa_systems > 0) && (
                <div className="border-t border-[#c8b898]/30 pt-1.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider mb-1">Equipment</div>
                    <div className="flex gap-3">
                        {comp.tanks > 0 && (
                            <span>Tanks: <span className="font-bold text-[#2a2016]">{comp.tank_condition.operational}</span>/{comp.tanks}</span>
                        )}
                        {comp.artillery > 0 && (
                            <span>Arty: <span className="font-bold text-[#2a2016]">{comp.artillery_condition.operational}</span>/{comp.artillery}</span>
                        )}
                        {comp.aa_systems > 0 && <span>AA: {comp.aa_systems}</span>}
                    </div>
                    {hist && (hist.total_equipment_destroyed || hist.total_equipment_captured) && (
                        <div className="flex gap-3 mt-0.5 text-[9px]">
                            {hist.total_equipment_captured && (hist.total_equipment_captured.tanks > 0 || hist.total_equipment_captured.artillery > 0) && (
                                <span className="text-green-700">Captured: {hist.total_equipment_captured.tanks}T {hist.total_equipment_captured.artillery}A</span>
                            )}
                            {hist.total_equipment_destroyed && (hist.total_equipment_destroyed.tanks > 0 || hist.total_equipment_destroyed.artillery > 0) && (
                                <span className="text-red-700">Lost: {hist.total_equipment_destroyed.tanks}T {hist.total_equipment_destroyed.artillery}A</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Narrative arc */}
            {arc && (
                <div className="border-t border-[#c8b898]/30 pt-1.5">
                    <span className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider">Arc: </span>
                    <span className="text-[10px] font-bold text-[#2a2016] capitalize">{arc}</span>
                    {narrative && <div className="text-[9px] text-[#6a5a40] mt-0.5 italic">{narrative}</div>}
                </div>
            )}

            {/* Recent engagements */}
            {engagements.length > 0 && (
                <div className="border-t border-[#c8b898]/30 pt-1.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider mb-1">Recent Engagements</div>
                    <div className="space-y-0.5">
                        {engagements.slice(0, 5).map((e, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[#8a7a60] w-6 shrink-0">w{e.turn}</span>
                                <span className="text-[8px] font-bold uppercase px-1 py-px rounded border"
                                      style={{ color: OUTCOME_COLORS[e.outcome] ?? '#8a7a60', borderColor: (OUTCOME_COLORS[e.outcome] ?? '#8a7a60') + '40' }}>
                                    {e.outcome.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[#8a7a60]">{e.role === 'attacker' ? 'ATK' : 'DEF'}</span>
                                <span className="text-red-700">-{e.casualties_taken}</span>
                                {e.territory_flipped && <span className="text-green-700 text-[8px]">FLIP</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Casualties */}
            {(b.campaignKia || b.campaignWia || b.campaignMia) && (
                <div className="border-t border-[#c8b898]/30 pt-1.5 flex gap-3">
                    {b.campaignKia != null && b.campaignKia > 0 && <span className="text-red-700">KIA: {b.campaignKia.toLocaleString()}</span>}
                    {b.campaignWia != null && b.campaignWia > 0 && <span className="text-amber-700">WIA: {b.campaignWia.toLocaleString()}</span>}
                    {b.campaignMia != null && b.campaignMia > 0 && <span className="text-[#8a7a60]">MIA: {b.campaignMia.toLocaleString()}</span>}
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
            <div className="max-h-[400px] overflow-y-auto space-y-px">
                {sorted.map((b) => {
                    const cohesion = Math.round(Math.max(0, Math.min(100, b.cohesion ?? 0)));
                    const fatigue = Math.round(b.fatigue ?? 0);
                    const personnel = b.personnel ?? 0;
                    const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                    const status = isDisrupted ? 'disrupted' : b.status;
                    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.active;
                    const factionColor = FACTION_COLORS[b.faction] ?? 'text-[#2a2016]';
                    const cohesionColor = getCohesionColor(cohesion);
                    const filledSegments = Math.ceil(cohesion / 20);
                    const isExpanded = expandedId === b.id;

                    return (
                        <div key={b.id}>
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className={`w-full flex items-center gap-2 px-1.5 py-1 rounded transition-colors text-left ${
                                    isExpanded ? 'bg-[#e8dcc4]/70' : 'hover:bg-[#e8dcc4]/50'
                                }`}
                                style={{ fontFamily: 'Courier New, monospace' }}>
                                {/* Expand indicator */}
                                <span className="text-[7px] text-[#8a7a60] w-2 shrink-0" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                                    &#9654;
                                </span>

                                {/* Name */}
                                <span className={`text-[10px] font-medium truncate flex-1 min-w-0 ${factionColor}`}>
                                    {b.name}
                                </span>

                                {/* Personnel */}
                                <span className="text-[9px] tabular-nums text-[#6a5a40] w-10 text-right shrink-0">
                                    {formatPersonnel(personnel)}
                                </span>

                                {/* Cohesion bar (5 segments) */}
                                <div className="flex gap-0.5 shrink-0">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <span
                                            key={i}
                                            className="block h-1.5 w-2 rounded-sm"
                                            style={{ backgroundColor: i < filledSegments ? cohesionColor : '#d4ccc0' }}
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
                            </button>
                            {isExpanded && <BrigadeExpandedDetail b={b} />}
                        </div>
                    );
                })}
            </div>
        </CollapsibleSection>
    );
}
