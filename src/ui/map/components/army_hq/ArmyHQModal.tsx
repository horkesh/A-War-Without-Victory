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
import { useDialogFocus } from '../../../shared/Modal';
import { EquipmentSummary } from './EquipmentSummary';
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
import { DOSSIER_INK, DossierPaper } from './DossierPaper';
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
import {
    buildArmyHqPresidentialHandoff,
    type ArmyHqPresidentialHandoff,
} from '../../data/armyHqPresidentialHandoff';
import {
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceHeader,
    SurfaceRail,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_MODAL_PANEL_FULL,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
} from '../surface/Surface';
import osidAreasData from '../../../../../data/derived/operational/osid_areas.json';

const HQ_TABS = [
    { id: 'briefing' as const, labelKey: 'armyHq.tab.briefing' as const, blurbKey: 'armyHq.tabBlurb.briefing' as const },
    { id: 'summary' as const, labelKey: 'armyHq.tab.summary' as const, blurbKey: 'armyHq.tabBlurb.summary' as const },
    { id: 'records' as const, labelKey: 'armyHq.tab.records' as const, blurbKey: 'armyHq.tabBlurb.records' as const },
    { id: 'personnel' as const, labelKey: 'armyHq.tab.personnel' as const, blurbKey: 'armyHq.tabBlurb.personnel' as const },
];

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

export interface ArmyHQModalProps {
    onDecisionRoomNavigateTarget?: (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    onOpenRecruitment?: () => void;
    onOpenAutonomy?: () => void;
    onReturnToDesk?: () => void;
}

const FACTION_DISPLAY: Record<string, string> = {
    RS: 'Vojska Republike Srpske',
    RBiH: 'Armija Republike Bosne i Hercegovine',
    HRHB: 'Hrvatsko Vijeće Obrane',
};

/** Surface frame for Army HQ: one opaque gold-bordered surface over a dimmed backdrop. */
const ARMY_HQ_FRAME = `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${SURFACE_MODAL_PANEL_FULL}`;
/** Rail-button look shared by the tabs and the corps list. */
const RAIL_BUTTON = 'flex w-full items-center gap-3 rounded-md border px-3.5 py-2.5 text-left transition';
const RAIL_BUTTON_ACTIVE = 'border-[#c9a75c] bg-[#232936]';
const RAIL_BUTTON_IDLE = 'border-transparent hover:border-[#3a4150] hover:bg-[#171b23]';

function DecisionRoomHandoff({
    handoff,
    onNavigateTarget,
    onReturnToDesk,
}: {
    handoff: ArmyHqPresidentialHandoff;
    onNavigateTarget?: (target: PresidentialDecisionRoomNavigationTarget) => boolean | void;
    onReturnToDesk?: () => void;
}) {
    const routesToDesk = handoff.route === 'desk';
    const disabled = routesToDesk ? !onReturnToDesk : !onNavigateTarget;
    const detail = handoff.status === 'critical_hold'
        ? t('armyHq.decisionRoomHandoff.criticalHold', { count: handoff.criticalCommandCount })
        : handoff.status === 'filed_action'
            ? t('armyHq.decisionRoomHandoff.filedAction', { count: handoff.filedActionCount })
            : t('armyHq.decisionRoomHandoff.detail');
    return (
        <section
            data-testid="army-hq-decision-room-handoff"
            className="flex flex-col gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-5 py-4"
        >
            <div className={SURFACE_LABEL}>
                {t('armyHq.decisionRoomHandoff.title')}
            </div>
            <div className="text-[16px] leading-relaxed text-[#ddd1b3]">
                {detail}
            </div>
            <button
                type="button"
                data-testid="army-hq-decision-room-open"
                data-handoff-route={handoff.route}
                disabled={disabled}
                onClick={() => {
                    if (routesToDesk) onReturnToDesk?.();
                    else onNavigateTarget?.({ kind: 'decision-room', lens: 'all' });
                }}
                className={`self-start ${SURFACE_PRIMARY_BUTTON_COMPACT}`}
            >
                {routesToDesk ? t('armyHq.returnDesk') : t('armyHq.openDecisionRoom')}
            </button>
        </section>
    );
}

/** The commander's personnel note: prose on paper beneath the dark stat card. */
function OfficerMiniBio({ officer }: { officer: NamedOfficerView }) {
    const rows: Array<[string, string | undefined]> = [
        [t('armyHq.officer.style'), officer.command_style],
        [t('armyHq.officer.known'), officer.known_for],
        [t('armyHq.officer.command'), officer.political_alignment_note],
        [t('armyHq.officer.note'), officer.sensitive_history_note],
    ];
    const present = rows.filter((row): row is [string, string] => Boolean(row[1]));
    return (
        <DossierPaper testId="army-hq-officer-note" className="mt-2 px-4 py-3 text-[15px] leading-relaxed">
            <div className={DOSSIER_INK.body}>{officer.bio_short ?? t('armyHq.officer.servicePending')}</div>
            {present.length > 0 && (
                <div className={`mt-2 grid grid-cols-1 gap-1 border-t pt-2 ${DOSSIER_INK.rule}`}>
                    {present.map(([label, value]) => (
                        <div key={label}><span className={`uppercase tracking-wide ${DOSSIER_INK.muted}`}>{label} </span><span className={DOSSIER_INK.heading}>{value}</span></div>
                    ))}
                </div>
            )}
        </DossierPaper>
    );
}

/** The corps list in the left rail: one line per corps, its readiness in plain words. */
function CommandAccessStrip({
    corpsFormations,
    readinessByCorps,
    expandedCorpsId,
    onSelect,
}: {
    corpsFormations: FormationView[];
    sectorsByCorps: Map<string, CorpsFrontSectorView[]>;
    opsByCorps: Map<string, OperationView[]>;
    readinessByCorps: Map<string, { grade?: ReadinessGrade; hasThreat?: boolean }>;
    expandedCorpsId: string | null;
    onSelect: (corpsId: string) => void;
}) {
    if (corpsFormations.length === 0) return null;
    return (
        <div data-testid="army-hq-corps-index" className="flex flex-col gap-1.5 pt-3">
            <div className={`px-2 ${SURFACE_LABEL_MUTED}`}>
                {t('armyHq.commandAccess')}
            </div>
            <div className="px-2 pb-1 text-[14px] leading-snug text-[#9c917b]">
                {t('armyHq.commandAccessHint')}
            </div>
            {corpsFormations.map((corps) => {
                const readiness = readinessByCorps.get(corps.id);
                const selected = expandedCorpsId === corps.id;
                return (
                    <button
                        key={corps.id}
                        type="button"
                        data-testid={`army-hq-corps-${corps.id}`}
                        data-corps-id={corps.id}
                        aria-pressed={selected}
                        onClick={() => onSelect(corps.id)}
                        className={`${RAIL_BUTTON} ${selected ? RAIL_BUTTON_ACTIVE : RAIL_BUTTON_IDLE}`}
                    >
                        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${readiness?.hasThreat ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="break-words text-[16px] font-semibold leading-snug text-[#f1e6c8]">
                                {getPlayerSafeCorpsName(corps.name, corps.id)}
                            </span>
                            <span className="text-[14px] text-[#b9ad94]">
                                {t('armyHq.commandAccessReadiness', { grade: readiness?.grade ? readinessGradeLabel(readiness.grade) : '--' })}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function ArmyHQModal({
    onDecisionRoomNavigateTarget,
    eventCatalog,
    onOpenRecruitment,
    onOpenAutonomy,
    onReturnToDesk,
}: ArmyHQModalProps = {}) {
    const open = useGameStore((s) => s.armyHQOpen);
    const dialogFocus = useDialogFocus(open);
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
        const presidentialHandoff = buildArmyHqPresidentialHandoff({
            corpsFormations,
            readiness: [...readinessByCorps.values()],
            pendingReviewCount: state.presidentialReviewQueue?.pendingCount ?? 0,
            pendingReserveCount: state.armyReserveQueue?.pendingCount ?? 0,
        });

        return {
            formations, brigades, corpsFormations, totalPersonnelLabel, sectors, operations, executingOperationCount,
            sectorsByCorps, opsByCorps, readinessByCorps, presidentialHandoff,
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
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (currentIdx + 1) % len;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (currentIdx - 1 + len) % len;
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
            <div ref={dialogFocus.ref} onKeyDown={dialogFocus.onKeyDown} tabIndex={-1} className="fixed inset-0 overflow-hidden" style={{ zIndex: Z.MODAL }} role="dialog" aria-modal="true" aria-label={t('armyHq.dialogTitle')}>
                <button
                    type="button"
                    aria-label={t('armyHq.dismissBackdrop')}
                    tabIndex={-1}
                    className="absolute inset-0 cursor-default bg-[#05070a]/85"
                    onClick={() => setOpen(false)}
                />
                <div className={ARMY_HQ_FRAME}>
                    <SurfaceHeader
                        eyebrow={t('armyHq.observerLabel')}
                        title={t('armyHq.tab.records')}
                        trailing={<span className="font-mono text-[16px] font-semibold text-[#f1e6c8]">{turnToDateString(state.turn ?? 0)}</span>}
                        close={(
                            <SurfaceCloseButton onClick={() => setOpen(false)} title={t('armyHq.returnFieldTitle')}>
                                {t('armyHq.backToField')}
                            </SurfaceCloseButton>
                        )}
                    />
                    <div
                        className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip px-8 py-6 text-[15px]"
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
    const showWarroomReturn = !expandedCorpsId && shouldShowWarroomReturn(
        typeof window !== 'undefined' ? window.location.search : '',
        ipc.isAvailable,
    );
    const briefingCounts = [
        { label: t('armyHq.critical'), value: data.briefingItems.filter((item) => item.severity === 'critical').length, tone: 'text-red-300' },
        { label: t('armyHq.warnings'), value: data.briefingItems.filter((item) => item.severity === 'warning').length, tone: 'text-amber-200' },
        { label: t('armyHq.executingOps'), value: data.executingOperationCount, tone: 'text-emerald-200' },
    ];

    // Surface redesign (owner, 2026-11-10): Army HQ is one surface in the Command Surface's
    // style — header with the army, the staff or corps in view, the date and strength; the
    // four rooms of the HQ and the corps list in the left rail; the chosen room in the
    // middle column, which scrolls on its own.
    return (
        <div
            ref={dialogFocus.ref}
            onKeyDown={dialogFocus.onKeyDown}
            tabIndex={-1}
            data-testid="army-hq-modal"
            data-expanded-corps-id={expandedCorpsId ?? ''}
            className="fixed inset-0 overflow-hidden"
            style={{ zIndex: Z.MODAL }}
            role="dialog"
            aria-modal="true"
            aria-label={t('armyHq.dialogTitle')}
        >
            {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: backdrop is now a real <button> for keyboard activation. */}
            <button
                type="button"
                aria-label={t('armyHq.dismissBackdrop')}
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-[#05070a]/85"
                onClick={() => setOpen(false)}
            />

            <div className={ARMY_HQ_FRAME}>
                <SurfaceHeader
                    eyebrow={expandedCorpsId ? `${getArmyName(faction) ?? faction} HQ` : (FACTION_DISPLAY[faction] ?? faction)}
                    title={expandedCorpsId
                        ? getPlayerSafeCorpsName(
                            data?.corpsFormations.find(c => c.id === expandedCorpsId)?.name,
                            expandedCorpsId,
                        )
                        : t('armyHq.mainStaff', { army: getArmyName(faction) ?? faction })}
                    trailing={(
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-[16px] font-semibold text-[#f1e6c8]">{turnToDateString(state.turn ?? 0)}</span>
                            <span data-testid="army-hq-personnel-reporting" className="text-[15px] text-[#b9ad94]">
                                <span>{t('personnel.totalPersonnel')}</span>
                                <span className="ml-1.5 font-mono font-semibold tabular-nums text-[#f1e6c8]">{data.totalPersonnelLabel}</span>
                            </span>
                        </div>
                    )}
                    close={(
                        <SurfaceCloseButton
                            onClick={() => { setExpandedCorpsId(null); setOpen(false); }}
                            aria-label={t('armyHq.close')}
                        />
                    )}
                >
                    {crestSrc && (
                        <img data-testid="army-hq-crest" src={crestSrc} alt="" className="h-14 w-14 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" draggable={false} />
                    )}
                </SurfaceHeader>

                <SurfaceColumns layout="rail-content">
                    <SurfaceRail
                        as="div"
                        footer={(
                            <div className="flex flex-col gap-2 pt-3">
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
                                    className={SURFACE_SECONDARY_BUTTON}
                                    title={expandedCorpsId ? t('armyHq.backOverviewTitle') : t('armyHq.returnFieldTitle')}
                                >
                                    {expandedCorpsId ? t('armyHq.backToOverview') : t('armyHq.backToField')}
                                </button>
                                {!expandedCorpsId && onReturnToDesk && (
                                    <button
                                        type="button"
                                        data-testid="army-hq-desk-return"
                                        onClick={() => {
                                            setOpen(false);
                                            onReturnToDesk();
                                        }}
                                        className={SURFACE_SECONDARY_BUTTON}
                                        title={t('armyHq.returnDeskTitle')}
                                    >
                                        {t('armyHq.returnDesk')}
                                    </button>
                                )}
                                {showWarroomReturn && (
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
                                        className={SURFACE_SECONDARY_BUTTON}
                                        title={t('armyHq.returnWarroomTitle')}
                                    >
                                        {t('armyHq.backToWarroom')}
                                    </button>
                                )}
                            </div>
                        )}
                    >
                        {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: tablist semantics + arrow-key navigation. */}
                        <div
                            data-tutorial-step="army-hq-tabs"
                            role="tablist"
                            aria-label={t('armyHq.tablist')}
                            aria-orientation="vertical"
                            className="flex flex-col gap-1.5"
                        >
                            {HQ_TABS.map(({ id, labelKey, blurbKey }, idx) => {
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
                                        aria-label={t(labelKey)}
                                        aria-controls={`army-hq-tabpanel-${id}`}
                                        tabIndex={isActive ? 0 : -1}
                                        data-tutorial-step={`army-hq-tab-${id}`}
                                        onClick={() => setActiveTab(id)}
                                        onKeyDown={(e) => handleTabKeyDown(e, idx)}
                                        className={`${RAIL_BUTTON} ${isActive ? RAIL_BUTTON_ACTIVE : RAIL_BUTTON_IDLE}`}
                                    >
                                        <span className="flex min-w-0 flex-col gap-0.5">
                                            <span className="text-[18px] font-semibold leading-tight text-[#f1e6c8]">{t(labelKey)}</span>
                                            <span className="text-[14px] leading-snug text-[#b9ad94]">{t(blurbKey)}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {activeTab === 'briefing' && (
                            <CommandAccessStrip
                                corpsFormations={data.corpsFormations}
                                sectorsByCorps={data.sectorsByCorps}
                                opsByCorps={data.opsByCorps}
                                readinessByCorps={data.readinessByCorps}
                                expandedCorpsId={expandedCorpsId}
                                onSelect={navigateToCorps}
                            />
                        )}
                    </SurfaceRail>

                    <div
                        className="relative min-h-0 min-w-0 overflow-y-auto overflow-x-clip px-8 py-6 text-[15px]"
                        role="tabpanel"
                        id={`army-hq-tabpanel-${activeTab}`}
                        aria-labelledby={`army-hq-tab-${activeTab}`}
                    >

                    {/* ═══ BRIEFING TAB ═══ */}
                    {activeTab === 'briefing' && (
                        <>
                            {/*
                             * Two-band layout: the Chief of Staff's briefing (paper) with the
                             * presidential handoffs on the left; the commander, the week's
                             * counts, Strategic Position and the situation list on the right.
                             * War Exhaustion is intentionally NOT a standalone Army HQ widget.
                             */}
                            {!expandedCorpsId && (
                                <>
                                <EquipmentSummary summary={state.equipmentSummary} />
                                <div className="mb-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
                                    {/* Briefing band — Chief of Staff (primary document) */}
                                    <div className="min-w-0 space-y-4">
                                        <ChiefOfStaffBriefing
                                            briefingItems={data.briefingItems}
                                            gameState={state}
                                            faction={faction}
                                            onCorpsClick={navigateToCorps}
                                        />

                                        <DecisionRoomHandoff
                                            handoff={data.presidentialHandoff}
                                            onNavigateTarget={onDecisionRoomNavigateTarget}
                                            onReturnToDesk={onReturnToDesk}
                                        />

                                        <RootErrorBoundary zone="presidential decisions">
                                            <PresidentialAttentionPanel
                                                gameState={state}
                                                playerFaction={faction}
                                                onOpenArmyReserve={handleOpenArmyReserve}
                                            />
                                        </RootErrorBoundary>
                                    </div>

                                    {/* Evidence / Action band */}
                                    <div className="flex min-w-0 flex-col gap-4">
                                        {/* Commander dossier — friendly identity + mini-bio */}
                                        <div className="rounded-md border border-[#2a303c] bg-[#161a22] p-4">
                                            <div className={`mb-1 ${SURFACE_LABEL}`}>
                                                {t('armyHq.armyCommander')}
                                            </div>
                                            <div
                                                data-testid="army-hq-command-role"
                                                className="mb-3 text-[15px] leading-snug text-[#c2b69c]"
                                            >
                                                {t('armyHq.armyCommander.role')}
                                            </div>
                                            {data.commander ? (
                                                <>
                                                    <OfficerProfile officer={data.commander} label="" compact={true} emphasis="defense" showOriginBadge={false} />
                                                    <OfficerMiniBio officer={data.commander} />
                                                </>
                                            ) : (
                                                <div className="py-3 text-center text-[15px] italic text-[#c2b69c]">
                                                    {t('armyHq.noCommander')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Counts — threat / warning / operations under way */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {briefingCounts.map((count) => (
                                                <div key={count.label} className="rounded-md border border-[#2a303c] bg-[#161a22] px-3 py-2.5">
                                                    <div className="text-[14px] leading-snug text-[#b9ad94]">{count.label}</div>
                                                    <div className={`font-mono text-[22px] font-semibold tabular-nums ${count.tone}`}>
                                                        {count.value}
                                                    </div>
                                                </div>
                                            ))}
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
                                <div className={`mb-3 border-b border-[#262b35] pb-2 ${SURFACE_LABEL}`}>
                                    {t('armyHq.allCorps', { count: data.corpsFormations.length })}
                                </div>

                                <div className={`grid content-start gap-2 ${expandedCorpsId
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
                        <WarSummaryContent onNavigateTarget={onDecisionRoomNavigateTarget} />
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
                </SurfaceColumns>
            </div>
        </div>
    );
}
