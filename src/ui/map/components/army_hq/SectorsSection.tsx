/**
 * Sectors section for expanded corps card.
 * Lists all front sectors with density, brigade count, and stance.
 * Click a sector to expand brigade positions and recent battles.
 */
import { useMemo, useState } from 'react';
import type { CorpsFrontSectorView, FormationView } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { OUTCOME_COLORS } from '../../utils/theme';
import { formatPersonnel, formatOsidLabel } from '../../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';

interface SectorsSectionProps {
    corpsId: string;
    sectors: CorpsFrontSectorView[];
    factionBattles: TurnBattle[];
}

const STANCE_LABEL: Record<string, string> = {
    fortify: 'Fortify', defend: 'Defend', elastic: 'Elastic',
    active_defense: 'Active Def', screening: 'Screening',
};


function SectorExpandedDetail({ sector, sectorBattles, formationMap }: { sector: CorpsFrontSectorView; sectorBattles: TurnBattle[]; formationMap: Map<string, FormationView> }) {
    const frontIds = sector.assigned_brigade_ids;
    const reserveIds = sector.reserve_brigade_ids;

    return (
        <div className="px-2 py-2 space-y-2 text-[10px] border-t border-[#c8b898]/30 bg-[#e8dcc4]/20"
             style={{ fontFamily: 'Courier New, monospace' }}>
            {/* Front brigades */}
            {frontIds.length > 0 && (
                <div>
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider mb-0.5">Front ({frontIds.length})</div>
                    <div className="space-y-px">
                        {frontIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-[#8a7a60] italic">{id}</div>;
                            const cohesion = Math.round(b.cohesion ?? 0);
                            const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                            return (
                                <div key={id} className="flex items-center gap-2">
                                    <span className="truncate flex-1 min-w-0 text-[#2a2016]">{b.name}</span>
                                    <span className="text-[9px] text-[#6a5a40] tabular-nums w-8 text-right shrink-0">
                                        {formatPersonnel(b.personnel ?? 0)}
                                    </span>
                                    <span className="text-[9px] tabular-nums w-6 text-right shrink-0" style={{ color: cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040' }}>
                                        {cohesion}%
                                    </span>
                                    {isDisrupted && <span className="text-[8px] text-red-700 font-bold shrink-0">DIS</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reserve brigades */}
            {reserveIds.length > 0 && (
                <div>
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider mb-0.5">Reserve ({reserveIds.length})</div>
                    <div className="space-y-px">
                        {reserveIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-[#8a7a60] italic">{id}</div>;
                            return (
                                <div key={id} className="flex items-center gap-2 text-[#6a5a40]">
                                    <span className="truncate flex-1 min-w-0">{b.name}</span>
                                    <span className="text-[9px] tabular-nums w-8 text-right shrink-0">
                                        {formatPersonnel(b.personnel ?? 0)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent battles in this sector */}
            {sectorBattles.length > 0 && (
                <div className="border-t border-[#c8b898]/30 pt-1.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider mb-0.5">Battles This Week ({sectorBattles.length})</div>
                    <div className="space-y-0.5">
                        {sectorBattles.map((battle, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[8px] font-bold uppercase px-1 py-px rounded border"
                                      style={{ color: OUTCOME_COLORS[battle.outcome] ?? '#8a7a60', borderColor: (OUTCOME_COLORS[battle.outcome] ?? '#8a7a60') + '40' }}>
                                    {battle.outcome.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[#6a5a40] truncate">
                                    {formatOsidLabel(battle.osid)}
                                </span>
                                <span className="text-red-700 shrink-0">-{battle.attacker_casualties + battle.defender_casualties}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sector stats */}
            <div className="border-t border-[#c8b898]/30 pt-1.5 flex gap-3 text-[#6a5a40]">
                <span>Front: ~{sector.length_edges} km</span>
                <span>Density: {sector.density.toFixed(2)}</span>
                {sector.sub_segments && <span>Sub-segments: {sector.sub_segments.length}</span>}
            </div>
        </div>
    );
}

export function SectorsSection({ corpsId, sectors, factionBattles }: SectorsSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const formations = useGameStore((s) => s.loadedGameState?.formations ?? []);
    const formationMap = useMemo(() => {
        const m = new Map<string, FormationView>();
        for (const f of formations) m.set(f.id, f);
        return m;
    }, [formations]);

    // Precompute sector OSID sets once (stable unless sectors change)
    const sectorOsidSets = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const sector of sectors) {
            const osids = new Set<string>();
            for (const sub of (sector.sub_segments ?? [])) {
                for (const osid of sub.friendly_osids) osids.add(osid);
            }
            map.set(sector.sector_id, osids);
        }
        return map;
    }, [sectors]);

    const handleSectorStance = async (sectorId: string, stance: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stageSectorStanceOrder(sectorId, stance);
        if (!result.ok) setLoadError(result.error ?? 'Failed to stage sector stance.');
    };

    return (
        <CollapsibleSection sectionKey={`sec-${corpsId}`} title="Sectors" count={sectors.length}>
            {sectors.length === 0 ? (
                <div className="text-[11px] text-[#8a7a60] italic py-1">No sectors assigned</div>
            ) : (
                <div className="space-y-1.5">
                    {sectors.map((sector) => {
                        const sectorOsids = sectorOsidSets.get(sector.sector_id) ?? new Set<string>();
                        const battleCount = factionBattles.filter((b) => sectorOsids.has(b.osid)).length;
                        const hasBattle = battleCount > 0;
                        const isExpanded = expandedId === sector.sector_id;

                        return (
                            <div key={sector.sector_id}>
                                <div className={`flex items-center justify-between px-2 py-1.5 rounded border border-[#c8b898]/30 transition-colors ${
                                    isExpanded ? 'bg-[#e8dcc4]/60' : 'bg-[#e8dcc4]/40'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : sector.sector_id)}
                                        className="min-w-0 text-left flex-1 hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[7px] text-[#8a7a60]" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                                                &#9654;
                                            </span>
                                            <span className="text-[11px] font-bold text-[#2a2016] truncate"
                                                  style={{ fontFamily: 'Courier New, monospace' }}>
                                                {sector.display_name}
                                            </span>
                                            {hasBattle && (
                                                <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-red-900/20 text-red-700 border border-red-800/20">
                                                    {battleCount} BATTLE{battleCount !== 1 ? 'S' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-[#8a7a60] tabular-nums mt-0.5 ml-3.5"
                                             style={{ fontFamily: 'Courier New, monospace' }}>
                                            {sector.assigned_brigade_ids.length} front
                                            {sector.reserve_brigade_ids.length > 0 && ` + ${sector.reserve_brigade_ids.length} res`}
                                            {' \u00B7 ~'}{sector.length_edges} km
                                            {' \u00B7 D:'}{sector.density.toFixed(2)}
                                        </div>
                                    </button>
                                    <div className="text-right shrink-0 ml-2">
                                        <select
                                            value={sector.sector_stance ?? 'defend'}
                                            onChange={(e) => { void handleSectorStance(sector.sector_id, e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[9px] font-bold uppercase bg-[#e8dcc4] border border-[#c8b898] rounded px-1 py-0.5 text-[#2a2016] cursor-pointer"
                                            style={{ fontFamily: 'Courier New, monospace' }}
                                        >
                                            <option value="fortify">Fortify</option>
                                            <option value="defend">Defend</option>
                                            <option value="elastic">Elastic</option>
                                            <option value="active_defense">Active Def</option>
                                            <option value="screening">Screening</option>
                                        </select>
                                    </div>
                                </div>
                                {isExpanded && <SectorExpandedDetail
                                    sector={sector}
                                    sectorBattles={factionBattles.filter((b) => sectorOsids.has(b.osid))}
                                    formationMap={formationMap}
                                />}
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}
