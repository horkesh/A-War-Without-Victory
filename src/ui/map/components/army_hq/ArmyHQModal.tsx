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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useIPC } from '../../desktop/useIPC';
import { shouldShowWarroomReturn, isEmbeddedTacticalMap } from '../../utils/warroomReturn';
import { getFactionArmyCommander } from '../../utils/officerUtils';
import { OfficerProfile } from '../OfficerProfile';
import { ArmyHQCorpsCard } from './ArmyHQCorpsCard';
import { generateForceReadiness, readinessGradeLabel, type ReadinessGrade } from './ForceReadiness';
import { generateThreatAssessment } from './generateThreatAssessment';
import { SituationBriefing, type BriefingTarget } from './SituationBriefing';
import { PresidentialAttentionPanel } from './PresidentialAttentionPanel';
import { StrategicPosition } from './StrategicPosition';
import { ChiefOfStaffBriefing } from './ChiefOfStaffBriefing';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getArmyCrest, getArmyName } from '../../utils/factionAssets';
import { turnToDateString } from '../../utils/formatters';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';
import { formatReportedPersonnel, sumReportedPersonnel } from '../../utils/reportedMetrics';
import { t } from '../../i18n';
import { WarSummaryContent } from './WarSummaryContent';
import { RecordsContent } from './RecordsContent';
import { RootErrorBoundary } from '../RootErrorBoundary';
import { PersonnelContent } from './PersonnelContent';
import { Z } from '../../../shared/zIndex';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';
import type { CorpsFrontSectorView, FormationView, NamedOfficerView, OperationView } from '../../data/types';
import type { PresidentialDecisionRoomNavigationTarget } from '../../data/presidentialDecisionRoom';
import type { EventDefinition } from '../../../../sim/events/event_types';
import { projectOperationLifecycle } from '../../data/operationLifecycleProjection';
import osidAreasData from '../../../../../data/derived/operational/osid_areas.json';

const HQ_TABS = [
    { id: 'briefing' as const, labelKey: 'armyHq.tab.briefing' as const },
    { id: 'summary' as const, labelKey: 'armyHq.tab.summary' as const },
    { id: 'records' as const, labelKey: 'armyHq.tab.records' as const },
    { id: 'personnel' as const, labelKey: 'armyHq.tab.personnel' as const },
];

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

export interface ArmyHQModalProps {
    onDecisionRoomNavigateTarget?: (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    onOpenRecruitment?: () => void;
    onOpenAutonomy?: () => void;
}

const FACTION_DISPLAY: Record<string, string> = {
    RS: 'Vojska Republike Srpske',
    RBiH: 'Armija Republike Bosne i Hercegovine',
    HRHB: 'Hrvatsko Vijeće Obrane',
};

function DecisionRoomHandoff({
    onNavigateTarget,
}: {
    onNavigateTarget?: (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;
}) {
    const disabled = !onNavigateTarget;
    return (
        <section
            data-testid="army-hq-decision-room-handoff"
            className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-3"
        >
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
                {t('armyHq.decisionRoomHandoff.title')}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-text-secondary">
                {t('armyHq.decisionRoomHandoff.detail')}
            </div>
            <button
                type="button"
                data-testid="army-hq-decision-room-open"
                disabled={disabled}
                onClick={() => onNavigateTarget?.({ kind: 'decision-room', lens: 'all' })}
                className="mt-2 h-8 rounded border border-amber-400/35 bg-amber-400/12 px-3 text-xs font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-default disabled:border-panel-border/55 disabled:bg-panel-bg/50 disabled:text-text-muted"
            >
                {t('armyHq.openDecisionRoom')}
            </button>
        </section>
    );
}

function OfficerMiniBio({ officer }: { officer: NamedOfficerView }) {
    return (
        <div className="mt-1.5 space-y-1 border-t border-panel-border/30 pt-1.5 text-xs leading-snug">
            <div className="text-text-primary">{officer.bio_short ?? t('armyHq.officer.servicePending')}</div>
            {(officer.command_style || officer.known_for || officer.political_alignment_note || officer.sensitive_history_note) && (
                <div className="grid grid-cols-1 gap-0.5">
                    {officer.command_style && (
                        <div><span className="text-text-secondary uppercase tracking-wide">{t('armyHq.officer.style')} </span><span className="text-text-primary">{officer.command_style}</span></div>
                    )}
                    {officer.known_for && (
                        <div><span className="text-text-secondary uppercase tracking-wide">{t('armyHq.officer.known')} </span><span className="text-text-primary">{officer.known_for}</span></div>
                    )}
                    {officer.political_alignment_note && (
                        <div><span className="text-text-secondary uppercase tracking-wide">{t('armyHq.officer.command')} </span><span className="text-text-primary">{officer.political_alignment_note}</span></div>
                    )}
                    {officer.sensitive_history_note && (
                        <div><span className="text-text-secondary uppercase tracking-wide">{t('armyHq.officer.note')} </span><span className="text-text-primary">{officer.sensitive_history_note}</span></div>
                    )}
                </div>
            )}
        </div>
    );
}

function CommandAccessStrip({
    corpsFormations,
    sectorsByCorps,
    opsByCorps,
    readinessByCorps,
    onSelect,
}: {
    corpsFormations: FormationView[];
    sectorsByCorps: Map<string, CorpsFrontSectorView[]>;
    opsByCorps: Map<string, OperationView[]>;
    readinessByCorps: Map<string, { grade?: ReadinessGrade; hasThreat?: boolean }>;
    onSelect: (corpsId: string) => void;
}) {
    if (corpsFormations.length === 0) return null;
    return (
        <div data-testid="army-hq-corps-index" className="mb-3 border-y border-panel-border bg-panel-card/70 px-2 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-text-secondary">
                    {t('armyHq.commandAccess')}
                </div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
                    {t('armyHq.commandAccessHint')}
                </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(21rem,1fr))] gap-1.5">
                {corpsFormations.map((corps) => {
                    const readiness = readinessByCorps.get(corps.id);
                    return (
                        <button
                            key={corps.id}
                            type="button"
                            data-testid={`army-hq-corps-${corps.id}`}
                            data-corps-id={corps.id}
                            onClick={() => onSelect(corps.id)}
                            className="min-w-0 rounded-md border border-panel-border/70 bg-panel-bg px-2 py-1.5 text-left transition-colors hover:border-amber-400/40 hover:bg-amber-400/5"
                        >
                            <div className="flex items-start gap-2">
                                <span className={`h-2 w-2 rounded-full ${readiness?.hasThreat ? 'bg-red-500' : 'bg-emerald-400'}`} />
                                <span className="min-w-0 flex-1 break-words text-xs font-bold uppercase leading-tight text-text-primary">
                                    {getPlayerSafeCorpsName(corps.name, corps.id)}
                                </span>
                                <span className="shrink-0 rounded border border-panel-border bg-panel-card px-1.5 py-0.5 text-xs font-bold text-accent-gold">
                                    {t('armyHq.commandAccessReadiness', { grade: readiness?.grade ? readinessGradeLabel(readiness.grade) : '--' })}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function ArmyHQModal({
    onDecisionRoomNavigateTarget,
    eventCatalog,
    onOpenRecruitment,
    onOpenAutonomy,
}: ArmyHQModalProps = {}) {
    const open = useGameStore((s) => s.armyHQOpen);
    const setOpen = useGameStore((s) => s.setArmyHQOpen);
    const faction = useGameStore((s) => s.selectedArmyId);
    const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId);
    const state = useGameStore((s) => s.loadedGameState);
    const activeTab = useGameStore((s) => s.armyHQTab);
    const setActiveTab = useGameStore((s) => s.setArmyHQTab);
    const expandedCorpsId = useGameStore((s) => s.armyHQExpandedCorpsId);
    const setExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);
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

    // Observer / no-faction saves can still reach the read-only RECORDS tab (#122).
    // In that case there is no selected army, so the faction-derived `data` below
    // stays null and only the records-only observer view renders.
    const isObserver = !faction;

    const data = useMemo(() => {
        if (!open || !state || !faction) return null;

        const formations = state.formations.filter((f) => f.faction === faction);
        const brigades = formations.filter((f) => isFieldedTacticalFormation(f));
        const corpsFormations = formations.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset');
        const totalPersonnelSummary = sumReportedPersonnel(brigades);
        const totalPersonnelLabel = formatReportedPersonnel(totalPersonnelSummary, {
            partial: (personnel) => t('corpsFront.partialPersonnel', { personnel }),
            unreported: t('corpsFront.unreported'),
        });
        const sectors = (state.corpsFrontSectors ?? []).filter((s) => s.faction === faction);
        const operations = (state.operations ?? []).filter((op) =>
            corpsFormations.some(c => c.id === op.corps_id)
        );
        const executingOperationCount = projectOperationLifecycle(state).counts.executing;

        const cbs = state.controlBySettlement ?? {};
        let factionArea = 0;
        for (const [osid, ctrl] of Object.entries(cbs)) {
            if (ctrl === faction) factionArea += osidAreas.areas[osid] ?? 0;
        }
        const territoryPct = osidAreas.total_area_km2 > 0 ? (factionArea / osidAreas.total_area_km2) * 100 : 0;

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
        const threatItems = generateThreatAssessment(state, faction);
        const threatCorpsIds = new Set(
            threatItems
                .map((item) => item.friendlyCorpsId)
                .filter((id): id is string => typeof id === 'string' && id.length > 0),
        );
        const readinessByCorps = new Map(
            generateForceReadiness(formations, operations, faction, threatCorpsIds)
                .map((item) => [item.corpsId, item]),
        );

        return {
            formations, brigades, corpsFormations, totalPersonnelLabel, sectors, operations, executingOperationCount,
            sectorsByCorps, opsByCorps, readinessByCorps,
            territoryPct, reserves,
            eff, commander, factionBattles, briefingItems
        };
    }, [open, state, faction]);

    const ipc = useIPC();

    const navigateToCorps = useCallback((corpsId: string) => {
        setActiveTab('briefing');
        setExpandedCorpsId(corpsId);
    }, [setActiveTab, setExpandedCorpsId]);

    const handleBriefingNavigate = useCallback((target: BriefingTarget) => {
        switch (target.type) {
            case 'corps':
                if (target.corpsId) navigateToCorps(target.corpsId);
                break;
            case 'summary':
                setActiveTab('summary');
                break;
            case 'officer_events':
                setActiveTab(target.officerFocus === 'personnel' ? 'personnel' : 'briefing');
                break;
            case 'enclaves':
                onDecisionRoomNavigateTarget?.({ kind: 'enclave-dashboard' });
                break;
            case 'peace_plan':
                onDecisionRoomNavigateTarget?.({ kind: 'inbox' });
                break;
            case 'settlement':
                if (target.osid) {
                    onDecisionRoomNavigateTarget?.({ kind: 'field', target: { kind: 'field-settlement', osid: target.osid } });
                }
                break;
            case 'none':
                break;
            case 'sector': {
                if (target.sectorId) {
                    onDecisionRoomNavigateTarget?.({
                        kind: 'field',
                        target: target.corpsId
                            ? { kind: 'field-sector-in-corps', sectorId: target.sectorId, corpsId: target.corpsId }
                            : { kind: 'field-sector', sectorId: target.sectorId },
                    });
                }
                break;
            }
            case 'operation': {
                if (target.operationKey) {
                    onDecisionRoomNavigateTarget?.({ kind: 'field', target: { kind: 'field-operation', operationKey: target.operationKey } });
                }
                break;
            }
        }
    }, [navigateToCorps, onDecisionRoomNavigateTarget]);

    const handleOpenArmyReserve = useCallback(() => {
        if (!data) return;
        const armyReserveFormation = data.formations.find((formation) =>
            formation.faction === faction && formation.kind === 'army_hq',
        );
        if (!armyReserveFormation) return;
        setSelectedArmyHqId(armyReserveFormation.id);
        setOpen(false);
    }, [data, faction, setOpen, setSelectedArmyHqId]);

    const handleOpenRecruitment = useCallback(() => {
        setOpen(false);
        onOpenRecruitment?.();
    }, [onOpenRecruitment, setOpen]);

    const handleOpenAutonomy = useCallback(() => {
        setOpen(false);
        onOpenAutonomy?.();
    }, [onOpenAutonomy, setOpen]);

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

    // Observer / no-faction read-only view (#122): there is no army to command,
    // so we host only The War's Record (campaign history sourced from loadedGameState).
    if (open && state && isObserver) {
        return (
            <div className="fixed inset-0 flex overflow-hidden font-mono" style={{ zIndex: Z.MODAL }} role="dialog" aria-modal="true" aria-label={t('armyHq.dialogTitle')}>
                <button
                    type="button"
                    aria-label={t('armyHq.dismissBackdrop')}
                    className="absolute inset-0 bg-black/85 cursor-default"
                    onClick={() => setOpen(false)}
                />
                <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-panel-bg text-text-primary">
                    <div className="flex items-center justify-between px-3 py-1 shrink-0 border-b border-panel-border bg-panel-card">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary border border-panel-border rounded-md hover:bg-panel-hover hover:text-text-primary transition-colors"
                                title={t('armyHq.returnFieldTitle')}
                            >
                                ← FIELD
                            </button>
                            <div>
                                <div className="text-xs uppercase tracking-[0.22em] text-text-secondary font-bold">
                                    {t('armyHq.observerLabel')}
                                </div>
                                <div className="text-[14px] font-bold uppercase tracking-[0.04em] text-text-primary leading-tight">
                                    {t('armyHq.tab.records')}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-[0.22em] text-text-secondary font-bold">
                                {t('armyHq.strategicSituation')}
                            </div>
                            <div className="text-[12px] font-bold text-text-primary tabular-nums">
                                {turnToDateString(state.turn ?? 0)}
                            </div>
                        </div>
                    </div>
                    <div
                        className="relative flex-1 overflow-y-auto px-3 pt-2 pb-3"
                        role="tabpanel"
                        id="army-hq-tabpanel-records"
                        aria-label={t('armyHq.tab.records')}
                    >
                        <RecordsContent eventCatalog={eventCatalog} />
                    </div>
                </div>
            </div>
        );
    }

    if (!open || !faction || !state || !data) return null;

    const crestSrc = getArmyCrest(faction);

    return (
        <div
            data-testid="army-hq-modal"
            data-expanded-corps-id={expandedCorpsId ?? ''}
            className="fixed inset-0 flex overflow-hidden font-mono"
            style={{ zIndex: Z.MODAL }}
            role="dialog"
            aria-modal="true"
            aria-label={t('armyHq.dialogTitle')}
        >
            {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: backdrop is now a real <button> for keyboard activation. */}
            <button
                type="button"
                aria-label={t('armyHq.dismissBackdrop')}
                className="absolute inset-0 bg-black/85 cursor-default"
                onClick={() => setOpen(false)}
            />

            <div className="relative flex-1 flex flex-col h-full overflow-hidden bg-panel-bg text-text-primary">

                <div className="flex items-center justify-between px-3 py-1 shrink-0 border-b border-panel-border bg-panel-card">
                    {/* Left: back/close + warroom return + crest + title */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            data-testid={expandedCorpsId ? 'army-hq-corps-back' : 'army-hq-field-return'}
                            onClick={() => {
                                if (expandedCorpsId) {
                                    setExpandedCorpsId(null);
                                } else {
                                    setOpen(false);
                                }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-text-secondary border border-panel-border rounded-md hover:bg-panel-hover hover:text-text-primary transition-colors"
                            title={expandedCorpsId ? t('armyHq.backOverviewTitle') : t('armyHq.returnFieldTitle')}
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
                                className="px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-amber-300 border border-amber-400/20 rounded-md hover:bg-amber-400/10 hover:text-amber-200 transition-colors"
                                title={t('armyHq.returnWarroomTitle')}
                            >
                                WARROOM
                            </button>
                        )}
                        {crestSrc && (
                            <img src={crestSrc} alt="" className="w-8 h-8 object-contain opacity-80" draggable={false} />
                        )}
                        <div>
                            <div className="text-xs uppercase tracking-[0.22em] text-text-secondary font-bold">
                                {expandedCorpsId ? `${getArmyName(faction) ?? faction} HQ` : (FACTION_DISPLAY[faction] ?? faction)}
                            </div>
                            <div className="text-[14px] font-bold uppercase tracking-[0.04em] text-text-primary leading-tight">
                                {expandedCorpsId
                                    ? getPlayerSafeCorpsName(
                                        data?.corpsFormations.find(c => c.id === expandedCorpsId)?.name,
                                        expandedCorpsId,
                                    )
                                    : t('armyHq.mainStaff', { army: getArmyName(faction) ?? faction })
                                }
                            </div>
                        </div>
                    </div>

                    {/* Right: situation + close */}
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-[0.22em] text-text-secondary font-bold">
                                {t('armyHq.strategicSituation')}
                            </div>
                            <div className="text-[12px] font-bold text-text-primary tabular-nums">
                                {turnToDateString(state.turn ?? 0)}
                            </div>
                            <div
                                data-testid="army-hq-personnel-reporting"
                                className="mt-0.5 text-xs uppercase tracking-[0.12em] text-text-secondary"
                            >
                                <span>{t('personnel.totalPersonnel')}</span>
                                <span className="ml-1 font-bold text-text-primary tabular-nums">{data.totalPersonnelLabel}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setExpandedCorpsId(null); setOpen(false); }}
                            aria-label={t('armyHq.close')}
                            className="text-text-secondary hover:text-text-primary text-[18px] leading-none transition-colors px-1"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: tablist semantics + arrow-key navigation. */}
                <div
                    data-tutorial-step="army-hq-tabs"
                    role="tablist"
                    aria-label={t('armyHq.tablist')}
                    className="flex items-center gap-0.5 px-3 py-0.5 bg-panel-bg border-b border-panel-border shrink-0"
                >
                    {HQ_TABS.map(({ id, labelKey }, idx) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                id={`army-hq-tab-${id}`}
                                data-testid={`army-hq-tab-${id}`}
                                ref={(el) => { tabRefs.current[id] = el; }}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`army-hq-tabpanel-${id}`}
                                tabIndex={isActive ? 0 : -1}
                                data-tutorial-step={`army-hq-tab-${id}`}
                                onClick={() => setActiveTab(id)}
                                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.15em] rounded-md transition-all ${
                                    isActive
                                        ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                {t(labelKey)}
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
                            {/*
                             * Top section: two-band layout.
                             *   Briefing band (left, lg:col-span-7) — paper Chief of Staff briefing.
                             *   Evidence/Action band (right, lg:col-span-5) — commander, mini-bio,
                             *   counts row, and Strategic Position (when dimensions exist).
                             * Palette: gold = command/action; blue-green = friendly state; red =
                             * threat/critical; paper = authored briefing; gray = secondary metadata.
                             * War Exhaustion is intentionally NOT a standalone Army HQ widget —
                             * the underlying mechanic stays alive in Chief of Staff prose, War
                             * Summary, OOB summaries, and Command Relationship.
                             */}
                            {!expandedCorpsId && (
                                <>
                                <CommandAccessStrip
                                    corpsFormations={data.corpsFormations}
                                    sectorsByCorps={data.sectorsByCorps}
                                    opsByCorps={data.opsByCorps}
                                    readinessByCorps={data.readinessByCorps}
                                    onSelect={navigateToCorps}
                                />
                                <div className="grid grid-cols-1 gap-3 mb-3 items-start xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
                                    {/* Briefing band — Chief of Staff (primary document) */}
                                    <div className="min-w-0 space-y-3">
                                        <ChiefOfStaffBriefing
                                            briefingItems={data.briefingItems}
                                            gameState={state}
                                            faction={faction}
                                            onCorpsClick={navigateToCorps}
                                        />

                                        <DecisionRoomHandoff onNavigateTarget={onDecisionRoomNavigateTarget} />

                                        <RootErrorBoundary zone="presidential decisions">
                                            <PresidentialAttentionPanel
                                                gameState={state}
                                                playerFaction={faction}
                                                onOpenArmyReserve={handleOpenArmyReserve}
                                            />
                                        </RootErrorBoundary>
                                    </div>

                                    {/* Evidence / Action band */}
                                    <div className="min-w-0 flex flex-col gap-2">
                                        {/* Commander dossier — friendly identity + mini-bio */}
                                        <div className="bg-panel-card border border-emerald-500/20 rounded-lg p-2.5">
                                            <div className="text-xs uppercase tracking-[0.22em] text-emerald-300 font-bold mb-1 pb-1 border-b border-emerald-500/15">
                                                {t('armyHq.armyCommander')}
                                            </div>
                                            <div
                                                data-testid="army-hq-command-role"
                                                className="mb-2 text-xs leading-snug text-text-secondary"
                                            >
                                                {t('armyHq.armyCommander.role')}
                                            </div>
                                            {data.commander ? (
                                                <>
                                                    <OfficerProfile officer={data.commander} label="" compact={true} emphasis="defense" showOriginBadge={false} />
                                                    <OfficerMiniBio officer={data.commander} />
                                                </>
                                            ) : (
                                                <div className="text-text-secondary text-xs py-3 text-center italic">
                                                    {t('armyHq.noCommander')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Counts row — red threat / amber warning / blue-green active ops */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-lg border border-red-500/25 bg-red-500/[0.04] px-2 py-1.5">
                                                <div className="text-xs uppercase tracking-[0.18em] text-red-300 font-bold">{t('armyHq.critical')}</div>
                                                <div className="text-[16px] font-bold text-red-400 tabular-nums leading-tight">
                                                    {data.briefingItems.filter((item) => item.severity === 'critical').length}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.04] px-2 py-1.5">
                                                <div className="text-xs uppercase tracking-[0.18em] text-amber-300 font-bold">{t('armyHq.warnings')}</div>
                                                <div className="text-[16px] font-bold text-amber-300 tabular-nums leading-tight">
                                                    {data.briefingItems.filter((item) => item.severity === 'warning').length}
                                                </div>
                                            </div>
                                            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] px-2 py-1.5">
                                                <div className="text-xs uppercase tracking-[0.18em] text-emerald-300 font-bold">{t('armyHq.executingOps')}</div>
                                                <div className="text-[16px] font-bold text-emerald-300 tabular-nums leading-tight">
                                                    {data.executingOperationCount}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Strategic Position — renders null when dimensions absent */}
                                        <StrategicPosition
                                            dimensions={state.strategicDimensions?.[faction]}
                                            faction={faction}
                                            compositeScore={state.negotiatingCapital?.[faction]}
                                        />

                                        <SituationBriefing
                                            items={data.briefingItems}
                                            onNavigate={handleBriefingNavigate}
                                        />
                                    </div>
                                </div>
                                </>
                            )}

                            {/* Corps Cards */}
                            <div>
                                <div className="text-xs uppercase tracking-[0.22em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                                    {t('armyHq.allCorps', { count: data.corpsFormations.length })}
                                </div>

                                <div className={`grid gap-2 ${expandedCorpsId
                                    ? 'grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]'
                                    : 'grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]'
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
                                            readinessGrade={data.readinessByCorps.get(corps.id)?.grade}
                                            hasThreat={data.readinessByCorps.get(corps.id)?.hasThreat ?? false}
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
                        <RecordsContent eventCatalog={eventCatalog} />
                    )}

                    {/* ═══ PERSONNEL TAB ═══ */}
                    {activeTab === 'personnel' && (
                        <PersonnelContent
                            onOpenRecruitment={handleOpenRecruitment}
                            onOpenAutonomy={handleOpenAutonomy}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
