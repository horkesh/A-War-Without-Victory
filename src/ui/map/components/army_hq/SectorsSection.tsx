/**
 * Sectors section for expanded corps card.
 * Warroom dark palette.
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

function SectorExpandedDetail({ sector, sectorBattles, formationMap }: { sector: CorpsFrontSectorView; sectorBattles: TurnBattle[]; formationMap: Map<string, FormationView> }) {
    const frontIds = sector.assigned_brigade_ids;
    const reserveIds = sector.reserve_brigade_ids;

    return (
        <div className="px-4 py-3 space-y-4 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Front brigades */}
            {frontIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">FRONT LINE DEPLOYMENT ({frontIds.length})</div>
                    <div className="space-y-1.5">
                        {frontIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">[!] {id} UNKNOWN</div>;
                            const cohesion = Math.round(b.cohesion ?? 0);
                            const isDisrupted = (b.disrupted_turns ?? 0) > 0;
                            return (
                                <div key={id} className="flex items-center gap-3">
                                    <span className="truncate flex-1 min-w-0 text-text-secondary">{b.name}</span>
                                    <span className="text-text-secondary tabular-nums w-12 text-right shrink-0">
                                        {formatPersonnel(b.personnel ?? 0)}
                                    </span>
                                    <span className={`tabular-nums w-10 text-right shrink-0 font-bold ${cohesion >= 70 ? 'text-emerald-400' : cohesion >= 40 ? 'text-accent-gold' : 'text-red-500'}`}>
                                        {cohesion}%
                                    </span>
                                    {isDisrupted && <span className="text-red-500 font-bold shrink-0 animate-pulse text-[9px]">[DIS]</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Reserve brigades */}
            {reserveIds.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest mb-1.5 border-b border-panel-border/30 pb-0.5">SECTOR RESERVES ({reserveIds.length})</div>
                    <div className="space-y-1.5">
                        {reserveIds.map((id) => {
                            const b = formationMap.get(id);
                            if (!b) return <div key={id} className="text-text-secondary/60 italic">[!] {id} UNKNOWN</div>;
                            return (
                                <div key={id} className="flex items-center gap-3 text-text-secondary">
                                    <span className="truncate flex-1 min-w-0 font-bold">{b.name}</span>
                                    <span className="tabular-nums w-12 text-right shrink-0">
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
                <div className="border-t border-panel-border/50 pt-3">
                    <div className="text-[10px] font-bold uppercase text-red-500/60 tracking-widest mb-1.5 border-b border-red-500/5 pb-0.5">RECENT ENGAGEMENTS ({sectorBattles.length})</div>
                    <div className="space-y-1">
                        {sectorBattles.map((battle, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border leading-none shrink-0"
                                    style={{ color: OUTCOME_COLORS[battle.outcome] ?? '#d4c5a0', borderColor: (OUTCOME_COLORS[battle.outcome] ?? '#d4c5a0') + '40' }}>
                                    {battle.outcome.replace(/_/g, ' ')}
                                </span>
                                <span className="text-text-secondary truncate flex-1">
                                    {formatOsidLabel(battle.osid)}
                                </span>
                                <span className="text-red-500 font-bold shrink-0">-{battle.attacker_casualties + battle.defender_casualties} PERS</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sector stats */}
            <div className="border-t border-panel-border/50 pt-3 flex flex-wrap gap-x-6 gap-y-2 text-text-secondary/60 text-[10px] uppercase tracking-wider">
                <span>FRONTAGE: {sector.length_edges} KM</span>
                <span>TROOP DENSITY: {sector.density.toFixed(2)}</span>
                {sector.sub_segments && <span>SEGMENTS: {sector.sub_segments.length}</span>}
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
                <div className="text-[11px] text-text-secondary/60 italic py-2 font-mono uppercase">NO SECTOR ASSIGNMENTS DETECTED</div>
            ) : (
                <div className="space-y-2">
                    {sectors.map((sector) => {
                        const sectorOsids = sectorOsidSets.get(sector.sector_id) ?? new Set<string>();
                        const battleCount = factionBattles.filter((b) => sectorOsids.has(b.osid)).length;
                        const hasBattle = battleCount > 0;
                        const isExpanded = expandedId === sector.sector_id;

                        return (
                            <div key={sector.sector_id} className="border border-panel-border/50 bg-panel-card rounded-md">
                                <div className={`flex items-center justify-between px-3 py-2.5 transition-colors ${isExpanded ? 'bg-panel-bg' : 'hover:bg-panel-bg'
                                    }`}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : sector.sector_id)}
                                        className="min-w-0 text-left flex-1"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] text-text-secondary/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                                ▶
                                            </span>
                                            <span className="text-[12px] font-bold text-text-primary uppercase font-mono truncate"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {sector.display_name}
                                            </span>
                                            {hasBattle && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-sm bg-red-900/40 text-red-400 border border-red-500/30 animate-pulse">
                                                    {battleCount} CONTACTS
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-text-secondary tabular-nums mt-1.5 ml-5 font-mono uppercase tracking-tight">
                                            {sector.assigned_brigade_ids.length} FRONT //
                                            {sector.reserve_brigade_ids.length > 0 ? ` ${sector.reserve_brigade_ids.length} RES // ` : ''}
                                            {sector.length_edges} KM // D:{sector.density.toFixed(2)}
                                        </div>
                                    </button>
                                    <div className="text-right shrink-0 ml-4">
                                        <select
                                            value={sector.sector_stance ?? 'defend'}
                                            onChange={(e) => { void handleSectorStance(sector.sector_id, e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[10px] font-bold uppercase bg-panel-bg text-text-primary border border-panel-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-400"
                                        >
                                            <option value="fortify">FORTIFY</option>
                                            <option value="defend">DEFEND</option>
                                            <option value="elastic">ELASTIC</option>
                                            <option value="active_defense">ACT DEF</option>
                                            <option value="screening">SCREENING</option>
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
