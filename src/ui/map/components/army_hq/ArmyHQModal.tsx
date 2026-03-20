/**
 * Army HQ Modal — the player's primary command center.
 * Full-screen overlay with war room table aesthetic.
 * Phase 1: Shell + Overview (commander card, situation card, corps grid).
 */
import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { FACTION_COLORS } from '../../utils/theme';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { Icon } from '../icons/Icon';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import osidAreasData from '../../../../../data/derived/operational/osid_areas.json';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

const FACTION_DISPLAY: Record<string, string> = {
    RS: 'Vojska Republike Srpske',
    RBiH: 'Armija Republike Bosne i Hercegovine',
    HRHB: 'Hrvatsko Vijeće Obrane',
};

const FACTION_SHORT: Record<string, string> = {
    RS: 'VRS', RBiH: 'ARBiH', HRHB: 'HVO',
};

export function ArmyHQModal() {
    const open = useGameStore((s) => s.armyHQOpen);
    const setOpen = useGameStore((s) => s.setArmyHQOpen);
    const faction = useGameStore((s) => s.selectedArmyId);
    const state = useGameStore((s) => s.loadedGameState);
    const expandedCorpsId = useGameStore((s) => s.armyHQExpandedCorpsId);
    const setExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);

    // ESC key handler — go up one level or close
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

    // Derived data
    const data = useMemo(() => {
        if (!state || !faction) return null;

        const formations = state.formations.filter((f) => f.faction === faction);
        const brigades = formations.filter((f) => f.kind === 'brigade' && f.status === 'active');
        const corpsFormations = formations.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset');
        const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const sectors = (state.corpsFrontSectors ?? []).filter((s) => s.faction === faction);
        const operations = (state.operations ?? []).filter((op) => {
            const corps = corpsFormations.find((c) => c.id === op.corps_id);
            return corps != null;
        });

        // Territory
        const cbs = state.controlBySettlement ?? {};
        let factionArea = 0;
        for (const [osid, ctrl] of Object.entries(cbs)) {
            if (ctrl === faction) factionArea += osidAreas.areas[osid] ?? 0;
        }
        const territoryPct = osidAreas.total_area_km2 > 0 ? (factionArea / osidAreas.total_area_km2) * 100 : 0;

        // Exhaustion
        const exhaustion = state.warPhaseExhaustion?.[faction];
        const exhaustionDisplay = typeof exhaustion === 'number' ? exhaustion.toFixed(1) : null;

        // Supply
        const reserves = state.factionReserves?.[faction];

        // This week
        const battles = state.latestTurnSummary?.battles ?? [];
        const factionBattles = battles.filter((b) => b.attacker_faction === faction || b.defender_faction === faction);
        const territoryNet = state.latestTurnSummary?.territory_net?.[faction] ?? 0;
        const osidsGained = territoryNet > 0 ? territoryNet : 0;
        const osidsLost = territoryNet < 0 ? -territoryNet : 0;

        // Combat effectiveness
        const eff = aggregateEffectiveness(brigades);

        // Alerts
        const alerts: Array<{ text: string; severity: 'critical' | 'warning' | 'info'; corpsId?: string }> = [];
        const pendingOfficers = (state.pendingOfficerEvents ?? []).filter((e) => !e.acknowledged);
        if (pendingOfficers.length > 0) {
            alerts.push({ text: `${pendingOfficers.length} officer${pendingOfficers.length !== 1 ? 's' : ''} awaiting your decision`, severity: 'warning' });
        }
        const readyOps = operations.filter((op) => op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready');
        for (const op of readyOps) {
            alerts.push({ text: `${op.name} ready to launch — awaiting go/no-go`, severity: 'info', corpsId: op.corps_id });
        }
        for (const corps of corpsFormations) {
            const corpsBrigades = brigades.filter((b) => b.corps_id === corps.id);
            const avgCohesion = corpsBrigades.length > 0
                ? corpsBrigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / corpsBrigades.length
                : 100;
            if (avgCohesion < 40) {
                alerts.push({ text: `${corps.name} at ${Math.round(avgCohesion)}% cohesion — CRITICAL`, severity: 'critical', corpsId: corps.id });
            }
        }
        if (factionBattles.length > 0) {
            alerts.push({ text: `${factionBattles.length} battle${factionBattles.length !== 1 ? 's' : ''} this week`, severity: 'info' });
        }

        const commander = getFactionArmyCommander(faction, state);

        return {
            formations, brigades, corpsFormations, totalPersonnel, sectors, operations,
            territoryPct, exhaustionDisplay, reserves, factionBattles, osidsGained, osidsLost,
            eff, alerts, commander,
        };
    }, [state, faction]);

    if (!open || !faction || !state || !data) return null;

    const factionColor = FACTION_COLORS[faction] ?? 'text-accent-gold';
    const breadcrumb = expandedCorpsId
        ? `${FACTION_SHORT[faction] ?? faction} HQ > ${data.corpsFormations.find((c) => c.id === expandedCorpsId)?.name ?? expandedCorpsId}`
        : `${FACTION_SHORT[faction] ?? faction} HQ Overview`;

    return (
        <div className="fixed inset-0 z-[1000]" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Wood table surface */}
            <div
                className="relative flex-1 flex flex-col h-full overflow-hidden"
                style={{
                    background: 'linear-gradient(170deg, #2a2016 0%, #1e1810 40%, #161310 100%)',
                }}
            >
                {/* Wood grain overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                        backgroundImage: [
                            'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)',
                            'repeating-linear-gradient(87deg, transparent, transparent 60px, rgba(0,0,0,0.03) 60px, rgba(0,0,0,0.03) 61px)',
                        ].join(', '),
                    }}
                />

                {/* Vignette */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }}
                />

                {/* Content area — scrollable */}
                <div className="relative flex-1 overflow-y-auto px-6 pt-4 pb-6">

                    {/* Alert strip */}
                    {data.alerts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {data.alerts.map((alert, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => alert.corpsId && setExpandedCorpsId(alert.corpsId)}
                                    className={`text-[11px] font-mono px-3 py-1.5 rounded border-l-[3px] bg-black/30 backdrop-blur-sm
                                        ${alert.severity === 'critical' ? 'border-l-red-500 text-red-400' :
                                          alert.severity === 'warning' ? 'border-l-amber-500 text-amber-400' :
                                          'border-l-accent-gold text-accent-gold'}
                                        ${alert.corpsId ? 'hover:bg-black/50 cursor-pointer' : 'cursor-default'}
                                        transition-colors`}
                                >
                                    {alert.text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Top row: Commander + Situation */}
                    <div className="grid grid-cols-[3fr_2fr] gap-4 mb-6">
                        {/* Army Commander Card */}
                        <div className="rounded-lg shadow-[2px_3px_8px_rgba(0,0,0,0.4)] overflow-hidden"
                             style={{ background: 'linear-gradient(135deg, #f0e8d8 0%, #e4dcc8 100%)' }}>
                            <div className="px-4 py-3 border-b border-[#c8b898]">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a7a60]">Army Commander</div>
                                <div className="text-[15px] font-bold text-[#2a2016]" style={{ fontFamily: 'Georgia, serif' }}>
                                    {FACTION_DISPLAY[faction] ?? faction}
                                </div>
                            </div>
                            <div className="p-4">
                                {data.commander ? (
                                    <OfficerProfile officer={data.commander} label="" compact={false} />
                                ) : (
                                    <div className="text-[12px] text-[#8a7a60] italic">No army commander assigned</div>
                                )}
                            </div>
                        </div>

                        {/* Strategic Situation Card */}
                        <div className="rounded-lg shadow-[2px_3px_8px_rgba(0,0,0,0.4)] overflow-hidden"
                             style={{ background: 'linear-gradient(135deg, #f0e8d8 0%, #e4dcc8 100%)' }}>
                            <div className="px-4 py-3 border-b border-[#c8b898]">
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a7a60]">Strategic Situation</div>
                                <div className="text-[13px] font-bold text-[#2a2016]" style={{ fontFamily: 'Georgia, serif' }}>
                                    Week {state.turn ?? 0} — {state.metadata?.date ?? ''}
                                </div>
                            </div>
                            <div className="p-4 space-y-2 text-[12px]" style={{ fontFamily: 'Courier New, monospace' }}>
                                <div className="flex justify-between">
                                    <span className="text-[#8a7a60]">Territory</span>
                                    <span className="font-bold text-[#2a2016]">{data.territoryPct.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8a7a60]">Personnel</span>
                                    <span className="font-bold text-[#2a2016]">{data.totalPersonnel.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8a7a60]">Brigades</span>
                                    <span className="font-bold text-[#2a2016]">{data.brigades.length} active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8a7a60]">Operations</span>
                                    <span className="font-bold text-[#2a2016]">{data.operations.length} active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#8a7a60]">Combat Eff.</span>
                                    <span className="font-bold text-[#2a2016]">{data.eff.totalEffectiveness.toLocaleString()} ({data.eff.grade})</span>
                                </div>
                                {data.exhaustionDisplay && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8a7a60]">War Exhaustion</span>
                                        <span className="font-bold text-[#2a2016]">{data.exhaustionDisplay}</span>
                                    </div>
                                )}
                                {data.reserves && (
                                    <div className="flex justify-between">
                                        <span className="text-[#8a7a60]">Supply</span>
                                        <span className="font-bold text-[#2a2016]">{Math.round(data.reserves.generalSupply ?? 0)}</span>
                                    </div>
                                )}
                                {/* This week badges */}
                                {(data.factionBattles.length > 0 || data.osidsGained > 0 || data.osidsLost > 0) && (
                                    <div className="flex gap-2 pt-1 border-t border-[#c8b898]/50">
                                        {data.factionBattles.length > 0 && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-900/30 text-red-700 border border-red-800/30">
                                                {data.factionBattles.length} BATTLE{data.factionBattles.length !== 1 ? 'S' : ''}
                                            </span>
                                        )}
                                        {data.osidsGained > 0 && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-900/30 text-green-700 border border-green-800/30">
                                                +{data.osidsGained} ADVANCE
                                            </span>
                                        )}
                                        {data.osidsLost > 0 && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-700 border border-amber-800/30">
                                                -{data.osidsLost} RETREAT
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Corps card grid */}
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold/70 mb-3">
                        Corps ({data.corpsFormations.length})
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {data.corpsFormations.map((corps) => (
                            <ArmyHQCorpsCard
                                key={corps.id}
                                corps={corps}
                                brigades={data.brigades.filter((b) => b.corps_id === corps.id)}
                                sectors={(state.corpsFrontSectors ?? []).filter((s) => s.corps_id === corps.id)}
                                operations={data.operations.filter((op) => op.corps_id === corps.id)}
                                factionBattles={data.factionBattles}
                                gameState={state}
                                isExpanded={expandedCorpsId === corps.id}
                                isCompressed={expandedCorpsId != null && expandedCorpsId !== corps.id}
                                onToggleExpand={() => setExpandedCorpsId(expandedCorpsId === corps.id ? null : corps.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Breadcrumb bar */}
                <div className="relative shrink-0 px-6 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px]">
                        <button
                            type="button"
                            onClick={() => setExpandedCorpsId(null)}
                            className={`font-bold uppercase tracking-[0.15em] transition-colors ${
                                expandedCorpsId ? 'text-accent-gold/60 hover:text-accent-gold cursor-pointer' : 'text-accent-gold'
                            }`}
                        >
                            {FACTION_SHORT[faction] ?? faction} HQ
                        </button>
                        {expandedCorpsId && (
                            <>
                                <span className="text-text-secondary/40">&gt;</span>
                                <span className="text-accent-gold font-semibold uppercase tracking-wider">
                                    {data.corpsFormations.find((c) => c.id === expandedCorpsId)?.name ?? expandedCorpsId}
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-[10px] text-text-secondary hover:text-text-primary px-2 py-1 border border-white/10 rounded transition-colors font-mono"
                    >
                        ESC
                    </button>
                </div>
            </div>
        </div>
    );
}
