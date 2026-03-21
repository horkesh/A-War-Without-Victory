/**
 * Army HQ Modal — NATO Terminal Aesthetic (Option 1).
 * Full-screen command terminal for the player's faction.
 */
import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { TeletypeTicker } from './TeletypeTicker';
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

export function ArmyHQModal() {
    const open = useGameStore((s) => s.armyHQOpen);
    const setOpen = useGameStore((s) => s.setArmyHQOpen);
    const faction = useGameStore((s) => s.selectedArmyId);
    const state = useGameStore((s) => s.loadedGameState);
    const expandedCorpsId = useGameStore((s) => s.armyHQExpandedCorpsId);
    const setExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);

    // ESC key handler
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
        const operations = (state.operations ?? []).filter((op) =>
            corpsFormations.some(c => c.id === op.corps_id)
        );

        // Territory
        const cbs = state.controlBySettlement ?? {};
        let factionArea = 0;
        for (const [osid, ctrl] of Object.entries(cbs)) {
            if (ctrl === faction) factionArea += osidAreas.areas[osid] ?? 0;
        }
        const territoryPct = osidAreas.total_area_km2 > 0 ? (factionArea / osidAreas.total_area_km2) * 100 : 0;

        // Exhaustion
        const exhaustion = state.warPhaseExhaustion?.[faction];
        const exhaustionDisplay = typeof exhaustion === 'number' ? exhaustion.toFixed(1) : '0.0';

        // Supply
        const reserves = state.factionReserves?.[faction];

        // Combat effectiveness
        const eff = aggregateEffectiveness(brigades);

        // Alerts
        const alerts: Array<{ text: string; severity: 'critical' | 'warning' | 'info'; corpsId?: string }> = [];

        // This week battles/events
        const battles = state.latestTurnSummary?.battles ?? [];
        const factionBattles = battles.filter(b => b.attacker_faction === faction || b.defender_faction === faction);
        if (factionBattles.length > 0) {
            alerts.push({ text: `${factionBattles.length} CONTACTS REPORTED IN THEATRE`, severity: 'info' });
        }

        const pendingOfficers = (state.pendingOfficerEvents ?? []).filter((e) => !e.acknowledged);
        if (pendingOfficers.length > 0) {
            alerts.push({ text: `AUTH REQUIRED: ${pendingOfficers.length} PERSONNEL DECISIONS PENDING`, severity: 'warning' });
        }

        const readyOps = operations.filter((op) => op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready');
        for (const op of readyOps) {
            alerts.push({ text: `STRAT: ${op.name} IS GO/NO-GO READY`, severity: 'info', corpsId: op.corps_id });
        }

        for (const corps of corpsFormations) {
            const corpsBrigades = brigades.filter((b) => b.corps_id === corps.id);
            const avgCohesion = corpsBrigades.length > 0
                ? corpsBrigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / corpsBrigades.length
                : 100;
            if (avgCohesion < 40) {
                alerts.push({ text: `CRITICAL: ${corps.name} COHESION BELOW MINIMAL`, severity: 'critical', corpsId: corps.id });
            }
        }

        const commander = getFactionArmyCommander(faction, state);

        return {
            formations, brigades, corpsFormations, totalPersonnel, sectors, operations,
            territoryPct, exhaustionDisplay, reserves,
            eff, alerts, commander, factionBattles
        };
    }, [state, faction]);

    if (!open || !faction || !state || !data) return null;

    const breadcrumb = expandedCorpsId
        ? `${FACTION_SHORT[faction] ?? faction} HQ > ${data.corpsFormations.find((c) => c.id === expandedCorpsId)?.name ?? expandedCorpsId}`
        : `${FACTION_SHORT[faction] ?? faction} HQ OVERVIEW`;

    return (
        <div className="fixed inset-0 z-[1000] flex overflow-hidden font-mono" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-black/90" />

            {/* CRT overlay effect */}
            <div className="crt-overlay absolute inset-0 pointer-events-none z-[60] opacity-[0.03]" />

            {/* Main Terminal UI container */}
            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#0c0b0a] text-[#4af626]">

                {/* Header Row */}
                <div className="relative flex items-end justify-between px-8 py-6 shrink-0 border-b border-[#4af626]/20 bg-[#12110f]">
                    <div className="flex flex-col gap-1 z-10">
                        <span className="text-[10px] uppercase font-bold text-[#4af626]/60 tracking-[0.3em]">
                            NATO MISSION TERMINAL v4.2
                        </span>
                        <div className="text-[28px] font-bold text-[#4af626] uppercase tracking-widest leading-none" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                            {breadcrumb}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 z-10 text-right">
                        <span className="text-[10px] uppercase font-bold text-[#4af626]/60 tracking-[0.3em]">
                            SYSTEM CLOCK
                        </span>
                        <div className="text-[16px] font-bold text-[#4af626] uppercase tracking-widest leading-none">
                            WEEK {state.turn} {state.metadata?.date ? `// ${state.metadata.date}` : ''}
                        </div>
                    </div>
                </div>

                {/* Content area — scrollable */}
                <div className="relative flex-1 overflow-y-auto px-10 pt-8 pb-[140px]">

                    {/* Top Readouts: Dashboard (only if no corps selected) */}
                    {!expandedCorpsId && (
                        <div className="grid grid-cols-[400px_1fr_400px] gap-10 mb-10">
                            {/* Commander Dashboard */}
                            <div className="bg-black/40 border border-[#4af626]/30 p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-4">
                                <div className="text-[11px] font-bold text-[#4af626]/60 uppercase tracking-widest border-b border-[#4af626]/20 pb-2">
                                    [ AUTHENTICATED COMMANDER ]
                                </div>
                                {data.commander ? (
                                    <OfficerProfile officer={data.commander} label="" compact={false} />
                                ) : (
                                    <div className="text-red-500 font-bold text-[14px] animate-pulse py-8 text-center border border-red-500/20">
                                        &lt;&lt; NO COMMANDER DATA &gt;&gt;
                                    </div>
                                )}
                            </div>

                            {/* Central Visual */}
                            <div className="flex items-center justify-center opacity-10 pointer-events-none select-none">
                                <div className="text-[120px] font-black tracking-tighter text-[#4af626]">
                                    {FACTION_SHORT[faction] ?? faction}
                                </div>
                            </div>

                            {/* Strategic Readiness */}
                            <div className="bg-black/40 border border-[#4af626]/30 p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-4">
                                <div className="text-[11px] font-bold text-[#4af626]/60 uppercase tracking-widest border-b border-[#4af626]/20 pb-2">
                                    [ STRATEGIC READINESS ]
                                </div>
                                <div className="space-y-3 text-[14px]">
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">Territory Control</span>
                                        <span className="text-[#4af626] font-bold tabular-nums">
                                            {data.territoryPct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">Force Strength</span>
                                        <span className="text-[#4af626] font-bold tabular-nums">
                                            {data.totalPersonnel.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">Active Formations</span>
                                        <span className="text-[#4af626] font-bold tabular-nums">
                                            {data.brigades.length} BRIG
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">Current Ops</span>
                                        <span className="text-[#4af626] font-bold tabular-nums">
                                            {data.operations.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">Theatre Efficiency</span>
                                        <span className="text-[#4af626] font-bold tabular-nums">
                                            {data.eff.grade}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1">
                                        <span className="text-[#4af626]/70 uppercase">War Exhaustion</span>
                                        <span className={`${parseFloat(data.exhaustionDisplay) > 30 ? 'text-red-500' : 'text-amber-500'} font-bold tabular-nums`}>
                                            {data.exhaustionDisplay}
                                        </span>
                                    </div>
                                    {data.reserves && (
                                        <div className="flex justify-between items-end border-b border-[#4af626]/5 pb-1 pt-2">
                                            <span className="text-[#4af626]/70 uppercase">Supply Reserves</span>
                                            <span className="text-cyan-400 font-bold tabular-nums">
                                                {Math.round(data.reserves.generalSupply ?? 0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content Grid: Corps Cards */}
                    <div className="max-w-[1600px] mx-auto">
                        {expandedCorpsId && (
                            <div className="mb-6 flex items-center gap-4 text-[12px] animate-pulse">
                                <span className="bg-[#4af626] text-black px-2 py-0.5 font-bold">DRILLING</span>
                                <span className="text-[#4af626]/80">[ ACCESSING {expandedCorpsId} ORBAT ]</span>
                            </div>
                        )}

                        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#4af626]/40 mb-4 border-b border-[#4af626]/10 pb-2">
                            THEATRE ORDER OF BATTLE // {data.corpsFormations.length} CORPS IDENTIFIED
                        </div>

                        <div className={`grid grid-cols-1 ${expandedCorpsId ? 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
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

                {/* Footer Section - Teletype & Controls */}
                <div className="shrink-0 bg-[#0a0908] border-t-2 border-[#4af626]/20 absolute bottom-0 left-0 right-0 z-50">
                    <div className="px-8 py-4 border-b border-[#4af626]/10">
                        <TeletypeTicker alerts={data.alerts} onAlertClick={(id) => setExpandedCorpsId(id ?? null)} />
                    </div>
                    <div className="flex items-center justify-between px-8 py-4 bg-[#12110f]">
                        <div className="flex items-center gap-10 font-mono text-[11px] tracking-widest text-[#4af626]/40">
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#4af626] shadow-[0_0_5px_#4af626]" /> MODE: COMMAND</span>
                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#4af626] shadow-[0_0_5px_#4af626]" /> AUTH: SECURE</span>
                            <span className="flex items-center gap-2 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4]" /> UP-LINK: NOMINAL</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setExpandedCorpsId(null);
                                setOpen(false);
                            }}
                            className="px-6 py-2 border border-[#4af626]/40 text-[#4af626] font-bold uppercase tracking-[0.2em] text-[13px] transition-all hover:bg-[#4af626]/10 hover:border-[#4af626] shadow-[0_0_15px_rgba(74,246,38,0.1)] active:scale-95"
                        >
                            CLOSE TERMINAL [ESC]
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
