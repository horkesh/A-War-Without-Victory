/**
 * Army HQ Modal — The military command center the president visits.
 *
 * Tabs: BRIEFING | SUMMARY | RECORDS | PERSONNEL
 * The president reviews corps briefings, operations, personnel, and records here.
 * This is Level 2 (Army/Corps Directives) in the presidential command doctrine.
 * The president sets intent; corps commanders interpret and execute.
 *
 * See: docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { Modal } from '../../../shared/Modal';
import { shouldShowWarroomReturn, isEmbeddedTacticalMap } from '../../utils/warroomReturn';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { SituationBriefing, type BriefingTarget } from './SituationBriefing';
import { PresidentialDecisionRoomPanel } from './PresidentialDecisionRoomPanel';
import { PresidentialAttentionPanel } from './PresidentialAttentionPanel';
import { StrategicPosition } from './StrategicPosition';
import { ChiefOfStaffBriefing } from './ChiefOfStaffBriefing';
import { ExhaustionClock } from './ExhaustionClock';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getArmyCrest, getArmyName } from '../../utils/factionAssets';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { WarSummaryContent } from './WarSummaryContent';
import { RecordsContent } from './RecordsContent';
import { PersonnelContent } from './PersonnelContent';
import { Z } from '../../../shared/zIndex';
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

const EMERGENCY_POSTURE_LABELS: Record<string, string> = {
    defensive: 'All Defensive',
    balanced: 'All Balanced',
    offensive: 'All Offensive',
    reorganize: 'All Reorganize',
};

export function ArmyHQModal() {
    const open = useGameStore((s) => s.armyHQOpen);
    const setOpen = useGameStore((s) => s.setArmyHQOpen);
    const faction = useGameStore((s) => s.selectedArmyId);
    const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId);
    const state = useGameStore((s) => s.loadedGameState);
    const activeTab = useGameStore((s) => s.armyHQTab);
    const setActiveTab = useGameStore((s) => s.setArmyHQTab);
    const expandedCorpsId = useGameStore((s) => s.armyHQExpandedCorpsId);
    const setExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);
    const [pendingEmergencyPosture, setPendingEmergencyPosture] = useState<string | null>(null);
    // These remain available for future use but briefing navigation now stays inside HQ

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

        const briefingItems = state.commandBriefing?.items ?? [];

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
            eff, commander, factionBattles, briefingItems
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

    const handleBriefingNavigate = useCallback((target: BriefingTarget) => {
        switch (target.type) {
            case 'corps':
                if (target.corpsId) navigateToCorps(target.corpsId);
                break;
            case 'enclaves':
            case 'officer_events':
            case 'summary':
            case 'settlement':
            case 'none':
                break;
            case 'sector': {
                const sector = data?.sectors.find((entry) => entry.sector_id === target.sectorId);
                if (sector) navigateToCorps(sector.corps_id);
                break;
            }
            case 'operation': {
                const corpsId = target.operationKey?.split('|')[0];
                if (corpsId) navigateToCorps(corpsId);
                break;
            }
        }
    }, [data, navigateToCorps]);

    const handleOpenArmyReserve = useCallback(() => {
        if (!data) return;
        const armyReserveFormation = data.formations.find((formation) =>
            formation.faction === faction && formation.kind === 'army_hq',
        );
        if (!armyReserveFormation) return;
        setSelectedArmyHqId(armyReserveFormation.id);
        setOpen(false);
    }, [data, faction, setOpen, setSelectedArmyHqId]);

    /**
     * A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C — tablist arrow-key navigation.
     * ArrowLeft / ArrowRight cycle (with wrap-around). Home / End jump to first / last tab.
     */
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const handleTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
        const len = HQ_TABS.length;
        let nextIdx: number | null = null;
        if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % len;
        else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + len) % len;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = len - 1;
        if (nextIdx == null) return;
        e.preventDefault();
        const nextTab = HQ_TABS[nextIdx];
        setActiveTab(nextTab.id);
        tabRefs.current[nextTab.id]?.focus();
    }, [setActiveTab]);

    if (!open || !faction || !state || !data) return null;

    const crestSrc = getArmyCrest(faction);

    return (
        <div className="fixed inset-0 flex overflow-hidden font-mono" style={{ zIndex: Z.MODAL }} role="dialog" aria-modal="true" aria-label="Army Headquarters">
            {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: backdrop is now a real <button> for keyboard activation. */}
            <button
                type="button"
                aria-label="Close Army Headquarters"
                className="absolute inset-0 bg-black/85 cursor-default"
                onClick={() => setOpen(false)}
            />

            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-panel-bg text-text-primary">

                <div className="flex items-center justify-between px-3 py-1 shrink-0 border-b border-panel-border bg-panel-card">
                    {/* Left: back/close + warroom return + crest + title */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (expandedCorpsId) {
                                    setExpandedCorpsId(null);
                                } else {
                                    setOpen(false);
                                }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-text-secondary border border-panel-border rounded-md hover:bg-panel-hover hover:text-text-primary transition-colors"
                            title={expandedCorpsId ? 'Back to army overview' : 'Return to field observation'}
                        >
                            {expandedCorpsId ? '← BACK' : '← FIELD'}
                        </button>
                        {!expandedCorpsId && shouldShowWarroomReturn(
                            typeof window !== 'undefined' ? window.location.search : '',
                            ipc.isAvailable,
                        ) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    if (isEmbeddedTacticalMap(window.location.search)) {
                                        window.parent.postMessage({ type: 'awwv-back-to-hq' }, '*');
                                    } else {
                                        void ipc.focusWarroom();
                                    }
                                }}
                                className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400/70 border border-amber-400/20 rounded-md hover:bg-amber-400/10 hover:text-amber-400 transition-colors"
                                title="Return to president's desk"
                            >
                                WARROOM
                            </button>
                        )}
                        {crestSrc && (
                            <img src={crestSrc} alt="" className="w-8 h-8 object-contain opacity-80" draggable={false} />
                        )}
                        <div>
                            <div className="text-[8px] uppercase tracking-[0.22em] text-text-secondary font-bold">
                                {expandedCorpsId ? `${getArmyName(faction) ?? faction} HQ` : (FACTION_DISPLAY[faction] ?? faction)}
                            </div>
                            <div className="text-[14px] font-bold uppercase tracking-[0.04em] text-text-primary leading-tight">
                                {expandedCorpsId
                                    ? getPlayerSafeCorpsName(
                                        data?.corpsFormations.find(c => c.id === expandedCorpsId)?.name,
                                        expandedCorpsId,
                                    )
                                    : `${getArmyName(faction) ?? faction} MAIN STAFF`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Right: emergency posture + situation + close */}
                    <div className="flex items-center gap-2">
                        {!expandedCorpsId && ipc.isAvailable && (
                            <select
                                defaultValue=""
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setPendingEmergencyPosture(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="text-[9px] font-bold uppercase bg-panel-bg text-amber-400 border border-amber-400/50 rounded-md px-2 py-0.5 cursor-pointer focus:outline-none focus:border-amber-400 hover:bg-amber-400/10 transition-colors"
                            >
                                <option value="" disabled>EMERGENCY POSTURE</option>
                                <option value="defensive">ALL DEFENSIVE</option>
                                <option value="balanced">ALL BALANCED</option>
                                <option value="offensive">ALL OFFENSIVE</option>
                                <option value="reorganize">ALL REORGANIZE</option>
                            </select>
                        )}
                        <div className="text-right">
                            <div className="text-[8px] uppercase tracking-[0.22em] text-text-secondary font-bold">
                                STRATEGIC SITUATION
                            </div>
                            <div className="text-[12px] font-bold text-text-primary tabular-nums">
                                Week {state.turn} {`\u2014 ${turnToDateString(state.turn ?? 0)}`}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setExpandedCorpsId(null); setOpen(false); }}
                            className="text-text-secondary hover:text-text-primary text-[18px] leading-none transition-colors px-1"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <Modal
                    isOpen={pendingEmergencyPosture != null}
                    onClose={() => setPendingEmergencyPosture(null)}
                    ariaLabel="Confirm emergency posture order"
                    panelClassName="w-[min(92vw,28rem)] rounded-lg border border-amber-400/35 bg-panel-card p-4 text-text-primary shadow-2xl"
                    backdropClassName="bg-black/55"
                >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        Confirm Bulk Order
                    </div>
                    <div className="mt-2 text-[16px] font-bold uppercase tracking-[0.04em] text-text-primary">
                        {pendingEmergencyPosture ? EMERGENCY_POSTURE_LABELS[pendingEmergencyPosture] : 'Emergency Posture'}
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
                        This will stage the same posture order for all {data.corpsFormations.length} corps in this army.
                        Corps commanders will interpret the directive through their existing command chain.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPendingEmergencyPosture(null)}
                            className="rounded border border-panel-border bg-panel-bg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary hover:bg-panel-hover hover:text-text-primary"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (pendingEmergencyPosture) {
                                    void handleEmergencyPosture(pendingEmergencyPosture);
                                }
                                setPendingEmergencyPosture(null);
                            }}
                            className="rounded border border-amber-400/45 bg-amber-400/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200 hover:bg-amber-400/25"
                        >
                            Stage Orders
                        </button>
                    </div>
                </Modal>

                {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: tablist semantics + arrow-key navigation. */}
                <div
                    data-tutorial-step="army-hq-tabs"
                    role="tablist"
                    aria-label="Army HQ sections"
                    className="flex items-center gap-0.5 px-3 py-0.5 bg-panel-bg border-b border-panel-border shrink-0"
                >
                    {HQ_TABS.map(({ id, label }, idx) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                id={`army-hq-tab-${id}`}
                                ref={(el) => { tabRefs.current[id] = el; }}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`army-hq-tabpanel-${id}`}
                                tabIndex={isActive ? 0 : -1}
                                data-tutorial-step={`army-hq-tab-${id}`}
                                onClick={() => setActiveTab(id)}
                                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md transition-all ${
                                    isActive
                                        ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                <div
                    className="relative flex-1 overflow-y-auto px-3 pt-2 pb-3"
                    role="tabpanel"
                    id={`army-hq-tabpanel-${activeTab}`}
                    aria-labelledby={`army-hq-tab-${activeTab}`}
                >

                    {/* ═══ BRIEFING TAB ═══ */}
                    {activeTab === 'briefing' && (
                        <>
                            {/* Top section: CoS Brief | Commander | Crest | Strategic Position */}
                            {!expandedCorpsId && (
                                <div className="grid grid-cols-1 gap-1.5 mb-2 items-start lg:grid-cols-12 lg:gap-2">
                                    {/* Chief of Staff Briefing */}
                                    <div className="lg:col-span-4">
                                        <ChiefOfStaffBriefing
                                            briefingItems={data.briefingItems}
                                            gameState={state}
                                            faction={faction}
                                            onCorpsClick={navigateToCorps}
                                        />
                                    </div>

                                    {/* Commander */}
                                    <div className="bg-panel-card border border-panel-border rounded-lg p-2 lg:col-span-3">
                                        <div className="text-[8px] uppercase tracking-[0.22em] text-text-secondary font-bold mb-1 pb-1 border-b border-panel-border">
                                            COMMANDER
                                        </div>
                                        {data.commander ? (
                                            <OfficerProfile officer={data.commander} label="" compact={true} emphasis="defense" />
                                        ) : (
                                            <div className="text-text-secondary text-[12px] py-4 text-center italic">
                                                No commander data available
                                            </div>
                                        )}
                                            <div className="mt-1 grid grid-cols-3 gap-1">
                                            <div className="rounded border border-panel-border bg-panel-bg px-1.5 py-1">
                                                <div className="text-[8px] uppercase tracking-wide text-text-secondary">Critical</div>
                                                <div className="text-[11px] font-bold text-red-400">
                                                    {data.briefingItems.filter((item) => item.severity === 'critical').length}
                                                </div>
                                            </div>
                                            <div className="rounded border border-panel-border bg-panel-bg px-1.5 py-1">
                                                <div className="text-[8px] uppercase tracking-wide text-text-secondary">Warnings</div>
                                                <div className="text-[11px] font-bold text-amber-400">
                                                    {data.briefingItems.filter((item) => item.severity === 'warning').length}
                                                </div>
                                            </div>
                                            <div className="rounded border border-panel-border bg-panel-bg px-1.5 py-1">
                                                <div className="text-[8px] uppercase tracking-wide text-text-secondary">Active Ops</div>
                                                <div className="text-[11px] font-bold text-text-primary">
                                                    {data.operations.length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Army Crest */}
                                    <div className="flex flex-col items-center justify-center px-1 py-0.5 select-none lg:col-span-1">
                                        {crestSrc && (
                                            <img
                                                src={crestSrc}
                                                alt={`${FACTION_DISPLAY[faction] ?? faction} crest`}
                                                className="w-[72px] h-[72px] lg:w-[84px] lg:h-[84px] object-contain drop-shadow-lg"
                                                draggable={false}
                                            />
                                        )}
                                        <div className="text-[8px] uppercase tracking-[0.13em] text-text-secondary mt-1 text-center leading-relaxed">
                                            {FACTION_DISPLAY[faction] ?? faction}
                                        </div>
                                    </div>

                                    {/* Exhaustion Clock */}
                                    <div className="lg:col-span-2">
                                        <ExhaustionClock
                                            exhaustion={state.warPhaseExhaustion?.[faction] ?? 0}
                                            faction={faction}
                                        />
                                    </div>

                                    {/* Strategic Position — 6 dimension bars */}
                                    <div className="lg:col-span-2">
                                        <StrategicPosition
                                            dimensions={state.strategicDimensions?.[faction]}
                                            faction={faction}
                                            compositeScore={state.negotiatingCapital?.[faction]}
                                        />
                                    </div>
                                </div>
                            )}

                            {!expandedCorpsId && (
                                <PresidentialDecisionRoomPanel />
                            )}

                            {!expandedCorpsId && (
                                <PresidentialAttentionPanel
                                    gameState={state}
                                    playerFaction={faction}
                                    onOpenArmyReserve={handleOpenArmyReserve}
                                />
                            )}

                            {/* Situation Briefing */}
                            {!expandedCorpsId && (
                                <SituationBriefing
                                    items={data.briefingItems}
                                    onNavigate={handleBriefingNavigate}
                                />
                            )}

                            {/* Corps Cards */}
                            <div>
                                <div className="text-[8px] uppercase tracking-[0.22em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                                    ALL CORPS ({data.corpsFormations.length})
                                </div>

                                <div className={`grid gap-2 ${expandedCorpsId
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
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ═══ SUMMARY TAB ═══ */}
                    {activeTab === 'summary' && (
                        <WarSummaryContent />
                    )}

                    {/* ═══ RECORDS TAB ═══ */}
                    {activeTab === 'records' && (
                        <RecordsContent />
                    )}

                    {/* ═══ PERSONNEL TAB ═══ */}
                    {activeTab === 'personnel' && (
                        <PersonnelContent />
                    )}
                </div>
            </div>
        </div>
    );
}


