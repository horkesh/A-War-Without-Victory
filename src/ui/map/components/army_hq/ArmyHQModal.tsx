/**
 * Army HQ Modal — Warroom dark aesthetic matching CorpsDetail/FormationDetail.
 * Full-screen command overview for the player's faction.
 */
import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getArmyCrest } from '../../utils/factionAssets';
import osidAreasData from '../../../../../data/derived/operational/osid_areas.json';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

const FACTION_SHORT: Record<string, string> = {
    RS: 'VRS', RBiH: 'ARBiH', HRHB: 'HVO',
};

const FACTION_DISPLAY: Record<string, string> = {
    RS: 'Vojska Republike Srpske',
    RBiH: 'Armija Republike Bosne i Hercegovine',
    HRHB: 'Hrvatsko Vijeće Obrane',
};

function StatRow({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
    return (
        <div className="flex justify-between items-baseline py-1 border-b border-panel-border/30">
            <span className="text-text-secondary text-[12px] uppercase tracking-wide">{label}</span>
            <span className={`font-mono text-[13px] font-bold tabular-nums ${warn ? 'text-red-400' : 'text-text-primary'}`}>
                {value}
            </span>
        </div>
    );
}

export function ArmyHQModal() {
    const open = useGameStore((s) => s.armyHQOpen);
    const setOpen = useGameStore((s) => s.setArmyHQOpen);
    const faction = useGameStore((s) => s.selectedArmyId);
    const state = useGameStore((s) => s.loadedGameState);
    const expandedCorpsId = useGameStore((s) => s.armyHQExpandedCorpsId);
    const setExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (expandedCorpsId) {
                    setExpandedCorpsId(null);
                } else {
                    setOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, expandedCorpsId, setExpandedCorpsId, setOpen]);

    const data = useMemo(() => {
        if (!state || !faction) return null;

        const formations = state.formations.filter((f) => f.faction === faction);
        const brigades = formations.filter((f) => f.kind === 'brigade' && f.status === 'active');
        const corpsFormations = formations.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset');
        const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const sectors = (state.corpsFrontSectors ?? []).filter((s) => s.faction === faction);
        const operations = (state.operations ?? []).filter((op) =>
            corpsFormations.some(c => c.id === op.corps_id)
        );

        const cbs = state.controlBySettlement ?? {};
        let factionArea = 0;
        for (const [osid, ctrl] of Object.entries(cbs)) {
            if (ctrl === faction) factionArea += osidAreas.areas[osid] ?? 0;
        }
        const territoryPct = osidAreas.total_area_km2 > 0 ? (factionArea / osidAreas.total_area_km2) * 100 : 0;

        const exhaustion = state.warPhaseExhaustion?.[faction];
        const exhaustionDisplay = typeof exhaustion === 'number' ? exhaustion.toFixed(1) : '0.0';

        const reserves = state.factionReserves?.[faction];
        const eff = aggregateEffectiveness(brigades);

        const battles = state.latestTurnSummary?.battles ?? [];
        const factionBattles = battles.filter(b => b.attacker_faction === faction || b.defender_faction === faction);

        const commander = getFactionArmyCommander(faction, state);

        return {
            formations, brigades, corpsFormations, totalPersonnel, sectors, operations,
            territoryPct, exhaustionDisplay, reserves,
            eff, commander, factionBattles
        };
    }, [state, faction]);

    if (!open || !faction || !state || !data) return null;

    const crestSrc = getArmyCrest(faction);

    return (
        <div className="fixed inset-0 z-[1000] flex overflow-hidden font-mono" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="absolute inset-0 bg-black/85" />

            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-panel-bg text-text-primary">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-4 shrink-0 border-b border-panel-border bg-panel-card">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold">
                            COMMANDER
                        </div>
                        <div className="text-[22px] font-bold uppercase tracking-wide text-text-primary">
                            {FACTION_SHORT[faction] ?? faction} MAIN STAFF
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold">
                            STRATEGIC SITUATION
                        </div>
                        <div className="text-[14px] font-bold text-text-primary">
                            Week {state.turn} {state.metadata?.date ? `\u2014 ${state.metadata.date}` : ''}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setExpandedCorpsId(null); setOpen(false); }}
                        className="ml-6 text-text-secondary hover:text-text-primary text-[20px] leading-none transition-colors"
                        title="Close [ESC]"
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="relative flex-1 overflow-y-auto px-8 pt-6 pb-8">

                    {/* Top section: Commander + Crest + Stats */}
                    {!expandedCorpsId && (
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-8 mb-8 items-start">
                            {/* Commander */}
                            <div className="bg-panel-card border border-panel-border rounded p-5">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                                    COMMANDER
                                </div>
                                {data.commander ? (
                                    <OfficerProfile officer={data.commander} label="" compact={false} />
                                ) : (
                                    <div className="text-text-secondary text-[13px] py-6 text-center">
                                        No commander data available
                                    </div>
                                )}
                            </div>

                            {/* Army Crest — prominently centered */}
                            <div className="flex flex-col items-center justify-center px-8 py-4 select-none">
                                {crestSrc ? (
                                    <img
                                        src={crestSrc}
                                        alt={`${FACTION_DISPLAY[faction] ?? faction} crest`}
                                        className="w-[180px] h-[180px] object-contain drop-shadow-lg opacity-90"
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="text-[64px] font-black text-text-secondary/20">
                                        {FACTION_SHORT[faction] ?? faction}
                                    </div>
                                )}
                                <div className="text-[11px] uppercase tracking-[0.2em] text-text-secondary mt-3 text-center leading-relaxed">
                                    {FACTION_DISPLAY[faction] ?? faction}
                                </div>
                            </div>

                            {/* Strategic Situation */}
                            <div className="bg-panel-card border border-panel-border rounded p-5">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-2 border-b border-panel-border">
                                    STRATEGIC SITUATION
                                </div>
                                <div className="space-y-0.5">
                                    <StatRow label="Territory" value={`${data.territoryPct.toFixed(1)}%`} />
                                    <StatRow label="Personnel" value={data.totalPersonnel.toLocaleString()} />
                                    <StatRow label="Brigades" value={`${data.brigades.length} active`} />
                                    <StatRow label="Operations" value={`${data.operations.length} active`} />
                                    <StatRow label="Combat Eff." value={`${(data.eff.score ?? 0).toLocaleString()} (${data.eff.grade ?? '?'})`} />
                                    <StatRow label="War Exhaustion" value={data.exhaustionDisplay} warn={parseFloat(data.exhaustionDisplay) > 30} />
                                    {data.reserves && (
                                        <StatRow label="Supply" value={Math.round(data.reserves.generalSupply ?? 0)} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Corps Cards */}
                    <div className="max-w-[1600px] mx-auto">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-4 pb-2 border-b border-panel-border">
                            ALL CORPS ({data.corpsFormations.length})
                        </div>

                        <div className={`grid gap-4 ${expandedCorpsId
                            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                        }`}>
                            {data.corpsFormations.map((corps) => (
                                <ArmyHQCorpsCard
                                    key={corps.id}
                                    corps={corps}
                                    brigades={data.brigades.filter((b) => b.corps_id === corps.id)}
                                    sectors={(state.corpsFrontSectors ?? []).filter((s) => s.corps_id === corps.id)}
                                    operations={data.operations.filter((o) => o.corps_id === corps.id)}
                                    factionBattles={data.factionBattles}
                                    gameState={state}
                                    isExpanded={expandedCorpsId === corps.id}
                                    isCompressed={expandedCorpsId !== null && expandedCorpsId !== corps.id}
                                    onToggleExpand={() => setExpandedCorpsId(expandedCorpsId === corps.id ? null : corps.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
