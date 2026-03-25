/**
 * Army HQ Modal — Multi-tab military command center.
 * Tabs: BRIEFING | SUMMARY | RECORDS | PERSONNEL
 * Full-screen command overview for the player's faction.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { SituationBriefing, generateBriefing } from './SituationBriefing';
import { ThreatAssessment, generateThreatAssessment } from './ThreatAssessment';
import { ForceReadiness, generateForceReadiness } from './ForceReadiness';
import { SupplyIntelligence, computeSupplyBreakdown, getEnclaveStatuses, getMobilizationInfo } from './SupplyIntelligence';
import { StrategicPosition } from './StrategicPosition';
import { ChiefOfStaffBriefing } from './ChiefOfStaffBriefing';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getArmyCrest, getArmyName } from '../../utils/factionAssets';
import { turnToDateString } from '../../utils/formatters';
import { WarSummaryContent } from './WarSummaryContent';
import { RecordsContent } from './RecordsContent';
import { PersonnelContent } from './PersonnelContent';
import osidAreasData from '../../../../../data/derived/operational/osid_areas.json';

const HQ_TABS = [
    { id: 'briefing' as const, label: 'BRIEFING' },
    { id: 'summary' as const, label: 'SUMMARY' },
    { id: 'records' as const, label: 'RECORDS' },
    { id: 'personnel' as const, label: 'PERSONNEL' },
];

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

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
    const activeTab = useGameStore((s) => s.armyHQTab);
    const setActiveTab = useGameStore((s) => s.setArmyHQTab);
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
        if (!open || !state || !faction) return null;

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

        const briefingItems = generateBriefing(state, faction as 'RS' | 'RBiH' | 'HRHB');

        // Threat Assessment (enemy intel synthesis)
        const threatItems = generateThreatAssessment(state, faction);
        const threatCorpsIds = new Set(threatItems.filter(t => t.friendlyCorpsId).map(t => t.friendlyCorpsId!));
        const activeThreatsById = new Set(
            threatItems.filter(t => t.severity === 'active' && t.friendlyCorpsId).map(t => t.friendlyCorpsId!),
        );

        // Force Readiness (per-corps health grade)
        const readinessItems = generateForceReadiness(state.formations, state.operations ?? [], faction, threatCorpsIds);
        const readinessByCorpsId = new Map(readinessItems.map(r => [r.corpsId, r.grade]));

        // Supply & Sustainability
        const supplyBreakdown = computeSupplyBreakdown(state, faction);
        const enclaveStatuses = getEnclaveStatuses(state, faction);
        const mobilizationInfo = getMobilizationInfo(state, faction);

        const sectorsByCorps = new Map<string, typeof sectors>();
        for (const s of sectors) {
            const list = sectorsByCorps.get(s.corps_id) || [];
            list.push(s);
            sectorsByCorps.set(s.corps_id, list);
        }
        const opsByCorps = new Map<string, typeof operations>();
        for (const o of operations) {
            const list = opsByCorps.get(o.corps_id) || [];
            list.push(o);
            opsByCorps.set(o.corps_id, list);
        }

        return {
            formations, brigades, corpsFormations, totalPersonnel, sectors, operations,
            sectorsByCorps, opsByCorps,
            territoryPct, exhaustionDisplay, reserves,
            eff, commander, factionBattles, briefingItems,
            threatItems, readinessItems, readinessByCorpsId, activeThreatsById,
            supplyBreakdown, enclaveStatuses, mobilizationInfo,
        };
    }, [open, state, faction]);

    const ipc = useIPC();

    const handleEmergencyPosture = useCallback(async (stance: string) => {
        if (!ipc.isAvailable || !data) return;
        const corpsIds = data.corpsFormations.map(c => c.id);
        for (const corpsId of corpsIds) {
            await ipc.stageCorpsStanceOrder(corpsId, stance);
        }
    }, [ipc, data]);

    const navigateToCorps = useCallback((corpsId: string) => {
        setActiveTab('briefing');
        setExpandedCorpsId(corpsId);
    }, [setActiveTab, setExpandedCorpsId]);

    if (!open || !faction || !state || !data) return null;

    const crestSrc = getArmyCrest(faction);

    return (
        <div className="fixed inset-0 z-[1000] flex overflow-hidden font-mono" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="absolute inset-0 bg-black/85" />

            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-panel-bg text-text-primary">

                <div className="flex items-center justify-between px-6 py-2.5 shrink-0 border-b border-panel-border bg-panel-card">
                    {/* Left: back/close + crest + title */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                if (expandedCorpsId) {
                                    setExpandedCorpsId(null);
                                } else {
                                    setOpen(false);
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary border border-panel-border rounded-md hover:bg-panel-hover hover:text-text-primary transition-colors"
                        >
                            {expandedCorpsId ? '← BACK' : '← MAP'}
                        </button>
                        {crestSrc && (
                            <img src={crestSrc} alt="" className="w-10 h-10 object-contain opacity-80" draggable={false} />
                        )}
                        <div>
                            <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold">
                                {expandedCorpsId ? `${getArmyName(faction) ?? faction} HQ` : (FACTION_DISPLAY[faction] ?? faction)}
                            </div>
                            <div className="text-[16px] font-bold uppercase tracking-wide text-text-primary">
                                {expandedCorpsId
                                    ? data?.corpsFormations.find(c => c.id === expandedCorpsId)?.name ?? expandedCorpsId
                                    : `${getArmyName(faction) ?? faction} MAIN STAFF`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Right: emergency posture + situation + close */}
                    <div className="flex items-center gap-4">
                        {!expandedCorpsId && ipc.isAvailable && (
                            <select
                                defaultValue=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        void handleEmergencyPosture(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="text-[10px] font-bold uppercase bg-panel-bg text-amber-400 border border-amber-400/50 rounded-md px-3 py-1.5 cursor-pointer focus:outline-none focus:border-amber-400 hover:bg-amber-400/10 transition-colors"
                            >
                                <option value="" disabled>EMERGENCY POSTURE</option>
                                <option value="defensive">ALL DEFENSIVE</option>
                                <option value="balanced">ALL BALANCED</option>
                                <option value="offensive">ALL OFFENSIVE</option>
                                <option value="reorganize">ALL REORGANIZE</option>
                            </select>
                        )}
                        <div className="text-right">
                            <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold">
                                STRATEGIC SITUATION
                            </div>
                            <div className="text-[13px] font-bold text-text-primary tabular-nums">
                                Week {state.turn} — {state.metadata?.date ?? turnToDateString(state.turn)}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setExpandedCorpsId(null); setOpen(false); }}
                            className="text-text-secondary hover:text-text-primary text-[20px] leading-none transition-colors px-1"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex items-center gap-0.5 px-6 py-1.5 bg-panel-bg border-b border-panel-border shrink-0">
                    {HQ_TABS.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md transition-all ${
                                activeTab === id
                                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="relative flex-1 overflow-y-auto px-6 pt-4 pb-6">

                    {/* === BRIEFING TAB === */}
                    {activeTab === 'briefing' && (
                        <>
                            {/* Top section: Commander | CoS Brief | Crest | Strategic Position */}
                            {!expandedCorpsId && (
                                <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-4 mb-4 items-stretch">
                                    {/* Commander */}
                                    <div className="bg-panel-card border border-panel-border rounded-lg p-4">
                                        <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1.5 border-b border-panel-border">
                                            COMMANDER
                                        </div>
                                        {data.commander ? (
                                            <OfficerProfile officer={data.commander} label="" compact={false} />
                                        ) : (
                                            <div className="text-text-secondary text-[12px] py-4 text-center italic">
                                                No commander data available
                                            </div>
                                        )}
                                    </div>

                                    {/* Chief of Staff Briefing */}
                                    <ChiefOfStaffBriefing
                                        briefingItems={data.briefingItems}
                                        gameState={state}
                                        faction={faction}
                                        onCorpsClick={navigateToCorps}
                                    />

                                    {/* Army Crest */}
                                    <div className="flex flex-col items-center justify-center px-4 py-2 select-none">
                                        {crestSrc && (
                                            <img
                                                src={crestSrc}
                                                alt={`${FACTION_DISPLAY[faction] ?? faction} crest`}
                                                className="w-[140px] h-[140px] object-contain drop-shadow-lg"
                                                draggable={false}
                                            />
                                        )}
                                        <div className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mt-2 text-center leading-relaxed">
                                            {FACTION_DISPLAY[faction] ?? faction}
                                        </div>
                                    </div>

                                    {/* Strategic Position — 6 dimension bars */}
                                    <StrategicPosition
                                        dimensions={state.strategicDimensions?.[faction]}
                                        faction={faction}
                                        compositeScore={state.negotiatingCapital?.[faction]}
                                    />
                                </div>
                            )}

                            {/* Situation Briefing */}
                            {!expandedCorpsId && data.briefingItems.length > 0 && (
                                <SituationBriefing
                                    items={data.briefingItems}
                                    onCorpsClick={navigateToCorps}
                                />
                            )}

                            {/* Threat Assessment */}
                            {!expandedCorpsId && data.threatItems.length > 0 && (
                                <ThreatAssessment
                                    items={data.threatItems}
                                    onCorpsClick={navigateToCorps}
                                />
                            )}

                            {/* Force Readiness */}
                            {!expandedCorpsId && data.readinessItems.length > 0 && (
                                <ForceReadiness
                                    items={data.readinessItems}
                                    onCorpsClick={navigateToCorps}
                                />
                            )}

                            {/* Supply & Sustainability */}
                            {!expandedCorpsId && (
                                <SupplyIntelligence
                                    breakdown={data.supplyBreakdown}
                                    enclaves={data.enclaveStatuses}
                                    mobilization={data.mobilizationInfo}
                                    currentTurn={state.turn}
                                />
                            )}

                            {/* Corps Cards */}
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-3 pb-1.5 border-b border-panel-border">
                                    ALL CORPS ({data.corpsFormations.length})
                                </div>

                                <div className={`grid gap-3 ${expandedCorpsId
                                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                                }`}>
                                    {data.corpsFormations.map((corps) => (
                                        <ArmyHQCorpsCard
                                            key={corps.id}
                                            corps={corps}
                                            brigades={data.brigades.filter((b) => b.corps_id === corps.id)}
                                            sectors={data.sectorsByCorps.get(corps.id) ?? []}
                                            operations={data.opsByCorps.get(corps.id) ?? []}
                                            factionBattles={data.factionBattles}
                                            gameState={state}
                                            isExpanded={expandedCorpsId === corps.id}
                                            isCompressed={expandedCorpsId !== null && expandedCorpsId !== corps.id}
                                            onToggleExpand={() => setExpandedCorpsId(expandedCorpsId === corps.id ? null : corps.id)}
                                            readinessGrade={data.readinessByCorpsId.get(corps.id)}
                                            hasThreat={data.activeThreatsById.has(corps.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* === SUMMARY TAB === */}
                    {activeTab === 'summary' && (
                        <WarSummaryContent />
                    )}

                    {/* === RECORDS TAB === */}
                    {activeTab === 'records' && (
                        <RecordsContent />
                    )}

                    {/* === PERSONNEL TAB === */}
                    {activeTab === 'personnel' && (
                        <PersonnelContent />
                    )}
                </div>
            </div>
        </div>
    );
}
