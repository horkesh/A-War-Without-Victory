import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPhase, OpsPlanState, AxisState } from './types';
import { PHASE_ORDER } from './types';
import { CommanderPhase } from './CommanderPhase';
import { PlanPhase } from './PlanPhase';
import { G2Phase } from './G2Phase';
import { AuthorizePhase } from './AuthorizePhase';
import { OpsMap } from './OpsMap';
import { usePrediction } from './usePrediction';
import { OPERATION_NAMES, simpleHash } from '../../../../sim/combat/operation_names';
import { Z } from '../../../shared/zIndex';
import { getOpsPhaseAdvanceMessage, getOpsPhaseGateMessage, planHasObjectiveAndBrigade } from './phaseGate';
import { t } from '../../i18n';
import { getNextAxisId, hasOpsPlanningDraftAssignments } from './opsPlanningDraft';
import { formatCorpsDisplayName } from '../../utils/formatters';
import {
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceDetail,
    SurfaceHeader,
    SURFACE_MODAL_PANEL_FULL,
    SURFACE_SECONDARY_BUTTON,
} from '../surface/Surface';

const PHASE_LABEL_KEYS: Record<OpsPhase, Parameters<typeof t>[0]> = {
    commander: 'opsPlanning.phaseLabel.commander',
    plan: 'opsPlanning.phaseLabel.plan',
    g2_assessment: 'opsPlanning.phaseLabel.g2',
    authorize: 'opsPlanning.phaseLabel.authorize',
};

function generateOpName(corpsId: string, turn: number, faction: string): string {
    // Use faction-specific names if available, else all names
    const factionNames = OPERATION_NAMES[faction];
    const names = factionNames && factionNames.length > 0
        ? factionNames
        : Object.values(OPERATION_NAMES).flat();
    if (names.length === 0) return 'Operacija Alfa';
    const idx = simpleHash(`${corpsId}_${turn}`) % names.length;
    return names[idx]; // Names already include "Operacija" prefix
}

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const corpsId = useGameStore((s) => s.opsPlanningCorpsId);
    const originSectorId = useGameStore((s) => s.opsPlanningOriginSectorId);
    const selectedOfficerId = useGameStore((s) => s.opsPlanningSelectedOfficerId);
    const clearContext = useGameStore((s) => s.clearOpsPlanningContext);
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    const [phase, setPhase] = useState<OpsPhase>('commander');
    const [highestPhase, setHighestPhase] = useState(0);
    const [g2AssessmentViewed, setG2AssessmentViewed] = useState(false);
    const [phaseGateMessage, setPhaseGateMessage] = useState<string | null>(null);
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
    const phaseGateTimeoutRef = useRef<number | null>(null);
    const [centroidLookup, setCentroidLookup] = useState<Map<string, [number, number]>>(new Map());

    // --- Plan state (lifted to shell for cross-phase access) ---
    const defaultStagingOsid = useMemo(() => {
        if (!loadedGameState?.corpsFrontSectors || !corpsId) return '';
        const sectors = loadedGameState.corpsFrontSectors.filter((s) => s.corps_id === corpsId);
        const originSector = sectors.find((sector) => sector.sector_id === originSectorId);
        if (originSector) {
            for (const sub of (originSector.sub_segments ?? [])) {
                if (sub.friendly_osids.length > 0) return sub.friendly_osids[0];
            }
        }
        for (const sec of sectors) {
            for (const sub of (sec.sub_segments ?? [])) {
                if (sub.friendly_osids.length > 0) return sub.friendly_osids[0];
            }
        }
        return '';
    }, [loadedGameState, corpsId, originSectorId]);

    const [plan, setPlan] = useState<OpsPlanState>(() => {
        const initialAxisId = getNextAxisId([]);
        return {
            opName: '',
            opType: 'sector_attack',
            tempo: 'standard',
            tolerance: 'costly_victory',
            artilleryPreparation: false,
            schwerpunktOsid: '',
            axes: [{ id: initialAxisId, name: 'Main Axis', brigadeIds: [], objectives: [], stagingOsid: undefined }],
            activeAxisId: initialAxisId,
            defaultStagingOsid: '',
        };
    });

    // Reset plan when modal opens
    useEffect(() => {
        if (isOpen && corpsId) {
            const initialAxis: AxisState = { id: getNextAxisId([]), name: 'Main Axis', brigadeIds: [], objectives: [] };
            setPlan({
                opName: generateOpName(corpsId, loadedGameState?.turn ?? 0,
                    loadedGameState?.formations.find((f) => f.id === corpsId)?.faction ?? ''),
                opType: 'sector_attack',
                tempo: 'standard',
                tolerance: 'costly_victory',
                artilleryPreparation: false,
                schwerpunktOsid: '',
                axes: [initialAxis],
                activeAxisId: initialAxis.id,
                defaultStagingOsid,
            });
            setPhase('commander');
            setHighestPhase(0);
            setG2AssessmentViewed(false);
            setPhaseGateMessage(null);
            setDiscardConfirmOpen(false);
        }
    }, [isOpen, corpsId, defaultStagingOsid, loadedGameState?.turn]);

    // Track highest reached phase for backtracking
    useEffect(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        setHighestPhase((prev) => Math.max(prev, idx));
        if (phase === 'g2_assessment') setG2AssessmentViewed(true);
    }, [phase]);

    const requestCloseOpsPlanning = useCallback(() => {
        if (discardConfirmOpen) {
            setDiscardConfirmOpen(false);
            return;
        }
        if (hasOpsPlanningDraftAssignments(plan)) {
            setDiscardConfirmOpen(true);
            return;
        }
        clearContext();
    }, [clearContext, discardConfirmOpen, plan]);

    const confirmDiscardOpsPlanning = useCallback(() => {
        setDiscardConfirmOpen(false);
        clearContext();
    }, [clearContext]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { requestCloseOpsPlanning(); return; }
            const currentIdx = PHASE_ORDER.indexOf(phase);
            if (e.key === 'ArrowRight' && currentIdx < highestPhase) {
                setPhase(PHASE_ORDER[currentIdx + 1]);
            }
            if (e.key === 'ArrowLeft' && currentIdx > 0) {
                setPhase(PHASE_ORDER[currentIdx - 1]);
            }
            const num = parseInt(e.key);
            if (num >= 1 && num <= 4 && num - 1 <= highestPhase) {
                setPhase(PHASE_ORDER[num - 1]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, phase, highestPhase, requestCloseOpsPlanning]);

    const hasCommander = selectedOfficerId != null && selectedOfficerId.length > 0;

    const showPhaseGateMessage = useCallback((message: string) => {
        if (phaseGateTimeoutRef.current != null) {
            window.clearTimeout(phaseGateTimeoutRef.current);
        }
        setPhaseGateMessage(message);
        phaseGateTimeoutRef.current = window.setTimeout(() => {
            setPhaseGateMessage(null);
            phaseGateTimeoutRef.current = null;
        }, 2000);
    }, []);

    useEffect(() => () => {
        if (phaseGateTimeoutRef.current != null) {
            window.clearTimeout(phaseGateTimeoutRef.current);
        }
    }, []);

    const advancePhase = useCallback(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        if (idx >= PHASE_ORDER.length - 1) return;
        const message = getOpsPhaseAdvanceMessage(phase, hasCommander, plan, g2AssessmentViewed);
        if (message) {
            showPhaseGateMessage(message);
            return;
        }
        setPhase(PHASE_ORDER[idx + 1]);
        setPhaseGateMessage(null);
    }, [g2AssessmentViewed, hasCommander, phase, plan, showPhaseGateMessage]);

    const goToPhase = useCallback((target: OpsPhase) => {
        const targetIdx = PHASE_ORDER.indexOf(target);
        const message = getOpsPhaseGateMessage(target, hasCommander, plan, g2AssessmentViewed);
        if (message) {
            showPhaseGateMessage(message);
            return;
        }
        if (targetIdx <= highestPhase || targetIdx <= PHASE_ORDER.indexOf(phase) + 1) {
            setPhase(target);
            setPhaseGateMessage(null);
        }
    }, [g2AssessmentViewed, hasCommander, highestPhase, phase, plan, showPhaseGateMessage]);

    // Map click handler — adds objectives or sets staging
    const handleOsidClick = useCallback((osid: string, isFriendly: boolean) => {
        if (phase !== 'plan') return;
        setPlan((prev) => {
            const activeAxis = prev.axes.find((a) => a.id === prev.activeAxisId) ?? prev.axes[0];
            if (!activeAxis) return prev;

            if (isFriendly) {
                // Set staging OSID
                return {
                    ...prev,
                    axes: prev.axes.map((a) =>
                        a.id === activeAxis.id ? { ...a, stagingOsid: osid } : a
                    ),
                };
            } else {
                // Toggle objective
                const existing = activeAxis.objectives.includes(osid);
                const newObjectives = existing
                    ? activeAxis.objectives.filter((o) => o !== osid)
                    : [...activeAxis.objectives, osid];
                const newSchwerpunkt = !prev.schwerpunktOsid && newObjectives.length === 1
                    ? newObjectives[0]
                    : prev.schwerpunktOsid;
                return {
                    ...prev,
                    schwerpunktOsid: newSchwerpunkt,
                    axes: prev.axes.map((a) =>
                        a.id === activeAxis.id ? { ...a, objectives: newObjectives } : a
                    ),
                };
            }
        });
    }, [phase]);

    // Update plan fields (used by PlanPhase sub-components)
    const updatePlan = useCallback((partial: Partial<OpsPlanState>) => {
        setPlan((prev) => ({ ...prev, ...partial }));
    }, []);

    // G2 prediction
    const { prediction, loading: predLoading, error: predError } = usePrediction(
        corpsId, plan, selectedOfficerId, phase === 'g2_assessment' || phase === 'plan'
    );

    // Corps faction for map arrows + phase components
    const faction = useMemo(() => {
        return loadedGameState?.formations.find((f) => f.id === corpsId)?.faction ?? '';
    }, [loadedGameState, corpsId]);

    const allObjectives = useMemo(() => plan.axes.flatMap((a) => a.objectives), [plan.axes]);

    // Front adjacency maps: friendly↔enemy OSID pairs from front edges
    const { friendlyToEnemy, enemyToFriendly, allFrontFriendly, allFrontEnemy } = useMemo(() => {
        const f2e = new Map<string, Set<string>>(); // friendly OSID → adjacent enemy OSIDs
        const e2f = new Map<string, Set<string>>(); // enemy OSID → adjacent friendly OSIDs
        const allFriendly = new Set<string>();
        const allEnemy = new Set<string>();
        if (!loadedGameState?.frontEdgesOsid || !loadedGameState?.corpsFrontSectors) {
            return { friendlyToEnemy: f2e, enemyToFriendly: e2f, allFrontFriendly: allFriendly, allFrontEnemy: allEnemy };
        }
        const sectors = loadedGameState.corpsFrontSectors.filter((s) => s.corps_id === corpsId);
        const corpsFriendlyOsids = new Set<string>();
        const corpsEnemyOsids = new Set<string>();
        for (const sec of sectors) {
            for (const sub of (sec.sub_segments ?? [])) {
                for (const osid of sub.friendly_osids) corpsFriendlyOsids.add(osid);
                for (const osid of sub.enemy_osids) corpsEnemyOsids.add(osid);
            }
        }
        // Build adjacency from front edges that touch this corps
        for (const edge of loadedGameState.frontEdgesOsid) {
            const aFriendly = corpsFriendlyOsids.has(edge.a);
            const bFriendly = corpsFriendlyOsids.has(edge.b);
            const aEnemy = corpsEnemyOsids.has(edge.a);
            const bEnemy = corpsEnemyOsids.has(edge.b);
            if (aFriendly && bEnemy) {
                if (!f2e.has(edge.a)) f2e.set(edge.a, new Set());
                f2e.get(edge.a)!.add(edge.b);
                if (!e2f.has(edge.b)) e2f.set(edge.b, new Set());
                e2f.get(edge.b)!.add(edge.a);
                allFriendly.add(edge.a);
                allEnemy.add(edge.b);
            }
            if (bFriendly && aEnemy) {
                if (!f2e.has(edge.b)) f2e.set(edge.b, new Set());
                f2e.get(edge.b)!.add(edge.a);
                if (!e2f.has(edge.a)) e2f.set(edge.a, new Set());
                e2f.get(edge.a)!.add(edge.b);
                allFriendly.add(edge.b);
                allEnemy.add(edge.a);
            }
        }
        return { friendlyToEnemy: f2e, enemyToFriendly: e2f, allFrontFriendly: allFriendly, allFrontEnemy: allEnemy };
    }, [loadedGameState, corpsId]);

    // Valid target OSIDs — all enemy OSIDs adjacent to corps front
    const validTargetOsids = useMemo(() => allFrontEnemy, [allFrontEnemy]);

    // Selectable OSIDs — constrained by current staging/objective selection
    const selectableOsids = useMemo(() => {
        const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
        const currentStaging = activeAxis?.stagingOsid ?? plan.defaultStagingOsid;
        const currentObjectives = activeAxis?.objectives ?? [];

        // If staging is set → only enemy OSIDs adjacent to that staging are selectable objectives
        // Plus all front-friendly OSIDs remain selectable (to change staging)
        if (currentStaging && currentObjectives.length === 0) {
            const reachableEnemies = friendlyToEnemy.get(currentStaging) ?? new Set();
            return new Set([...reachableEnemies, ...allFrontFriendly]);
        }

        // If objectives are set but no explicit staging → only friendly OSIDs adjacent to
        // at least one objective are selectable for staging, plus existing objectives stay selectable
        if (currentObjectives.length > 0 && !activeAxis?.stagingOsid) {
            const validStaging = new Set<string>();
            for (const obj of currentObjectives) {
                const adjacentFriendly = enemyToFriendly.get(obj);
                if (adjacentFriendly) {
                    for (const f of adjacentFriendly) validStaging.add(f);
                }
            }
            return new Set([...validStaging, ...allFrontEnemy]);
        }

        // Both set → objectives reachable from staging, plus all front-friendly for staging change
        if (currentStaging && currentObjectives.length > 0) {
            const reachableEnemies = friendlyToEnemy.get(currentStaging) ?? new Set();
            return new Set([...reachableEnemies, ...currentObjectives.map(o => o), ...allFrontFriendly]);
        }

        // Nothing set → everything on the front is selectable
        return new Set([...allFrontFriendly, ...allFrontEnemy]);
    }, [plan.axes, plan.activeAxisId, plan.defaultStagingOsid, friendlyToEnemy, enemyToFriendly, allFrontFriendly, allFrontEnemy]);

    const activeAxis = plan.axes.find((a) => a.id === plan.activeAxisId) ?? plan.axes[0];
    const availableObjectiveOsids = useMemo(() => {
        const currentObjectives = new Set(plan.axes.flatMap((axis) => axis.objectives));
        return [...validTargetOsids]
            .filter((osid) => selectableOsids.has(osid) && !currentObjectives.has(osid))
            .sort();
    }, [plan.axes, selectableOsids, validTargetOsids]);
    const canAdvanceToG2 = planHasObjectiveAndBrigade(plan);

    const corpsDisplayName = (() => {
        const corpsFormation = loadedGameState?.formations.find((f) => f.id === corpsId);
        return corpsFormation ? formatCorpsDisplayName(corpsFormation.name, corpsFormation.id) : '';
    })();

    if (!isOpen || !corpsId) return null;

    const currentIdx = PHASE_ORDER.indexOf(phase);

    return (
        <div
            className="fixed inset-0 bg-[#05070a]/80"
            style={{ zIndex: Z.MODAL }}
            data-testid="ops-planning-modal"
            data-corps-id={corpsId}
            data-origin-sector-id={originSectorId ?? ''}
            data-phase={phase}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ops-planning-title"
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${SURFACE_MODAL_PANEL_FULL}`}
            >
                <SurfaceHeader
                    eyebrow={corpsDisplayName
                        ? t('opsPlanning.surface.eyebrowCorps', { corps: corpsDisplayName })
                        : t('opsPlanning.surface.eyebrow')}
                    title={plan.opName || t('opsPlanning.surface.untitled')}
                    titleId="ops-planning-title"
                    close={(
                        <SurfaceCloseButton
                            onClick={requestCloseOpsPlanning}
                            title={t('opsModal.closePlanningTitle')}
                            data-testid="ops-planning-close"
                        />
                    )}
                >
                    {/* Phase stepper: four numbered steps; later steps unlock in order. */}
                    <nav aria-label={t('opsPlanning.surface.stepsAria')} className="flex flex-wrap items-center gap-2">
                        {PHASE_ORDER.map((p, i) => {
                            const phaseLabel = t(PHASE_LABEL_KEYS[p]);
                            const locked = i > highestPhase;
                            const current = i === currentIdx;
                            const phaseAriaLabel = locked
                                ? t('opsPlanning.phaseNav.lockedAria', { phase: phaseLabel, step: i + 1 })
                                : t('opsPlanning.phaseNav.aria', { phase: phaseLabel, step: i + 1 });
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => goToPhase(p)}
                                    data-testid={`ops-planning-phase-${p}`}
                                    data-phase={p}
                                    data-locked={locked ? 'true' : undefined}
                                    aria-label={phaseAriaLabel}
                                    title={phaseAriaLabel}
                                    aria-current={i === currentIdx ? 'step' : undefined}
                                    className={`flex h-11 items-center gap-2.5 rounded-md border px-3.5 transition ${
                                        current
                                            ? 'border-[#c9a75c] bg-[#232936] text-[#f1e6c8]'
                                            : locked
                                                ? 'border-[#262b35] bg-[#12161e] text-[#8a806c]'
                                                : 'border-[#3a4150] bg-[#1b2029] text-[#e2d6b8] hover:border-accent-gold/60'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[14px] font-semibold ${
                                            current
                                                ? 'bg-[#c9a75c] text-[#15120b]'
                                                : i <= highestPhase
                                                    ? 'border border-[#c9a75c]/60 text-[#e0c27a]'
                                                    : 'border border-[#3a4150] text-[#8a806c]'
                                        }`}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="text-[16px] font-semibold">{phaseLabel}</span>
                                </button>
                            );
                        })}
                    </nav>
                </SurfaceHeader>

                <SurfaceColumns layout="content-wide-detail">
                    {/* Planning map: the corps front, objectives, staging and axes. */}
                    <div className="relative min-h-0 overflow-hidden bg-[#0b0d12]">
                        <OpsMap
                            corpsId={corpsId}
                            onOsidClick={handleOsidClick}
                            objectives={allObjectives}
                            validTargetOsids={validTargetOsids}
                            selectableOsids={selectableOsids}
                            availableObjectiveOsids={availableObjectiveOsids}
                            stagingOsid={plan.axes.find((a) => a.id === plan.activeAxisId)?.stagingOsid ?? plan.defaultStagingOsid}
                            schwerpunktOsid={plan.schwerpunktOsid}
                            axes={plan.axes}
                            faction={faction}
                            enabled={phase === 'plan'}
                            onCentroidLookupReady={setCentroidLookup}
                        />

                        {phaseGateMessage && (
                            <div
                                role="status"
                                className="absolute left-1/2 top-4 z-30 max-w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-[#c9a75c]/70
                                           bg-[#1b2029] px-5 py-3 text-[16px] font-semibold text-[#f1e6c8] shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
                            >
                                {phaseGateMessage}
                            </div>
                        )}

                        {discardConfirmOpen && (
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="ops-planning-discard-title"
                                className="absolute right-4 top-4 z-40 flex w-[min(28rem,calc(100%-2rem))] flex-col gap-3 rounded-lg border border-red-400/50
                                           bg-[#141821] p-5 text-text-primary shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                            >
                                <div id="ops-planning-discard-title" className="text-[19px] font-semibold text-red-100">
                                    {t('opsPlanning.discard.title')}
                                </div>
                                <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">
                                    {t('opsPlanning.discard.body')}
                                </p>
                                <div className="flex flex-wrap justify-end gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setDiscardConfirmOpen(false)}
                                        className={SURFACE_SECONDARY_BUTTON}
                                    >
                                        {t('opsPlanning.discard.keepPlanning')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDiscardOpsPlanning}
                                        className="h-12 rounded-md border border-red-400/60 bg-red-950/60 px-5 text-[16px] font-semibold text-red-100 transition hover:bg-red-900/70"
                                    >
                                        {t('opsPlanning.discard.discardDraft')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Phase content: scrolling body and a fixed action footer. */}
                    <SurfaceDetail>
                        {phase === 'commander' && (
                            <div className="flex min-h-0 flex-1 flex-col" data-testid="ops-planning-phase-panel" data-phase="commander">
                                <CommanderPhase onAdvance={advancePhase} />
                            </div>
                        )}
                        {phase === 'plan' && (
                            <div className="flex min-h-0 flex-1 flex-col" data-testid="ops-planning-phase-panel" data-phase="plan">
                                <PlanPhase
                                    plan={plan}
                                    onUpdate={updatePlan}
                                    corpsId={corpsId}
                                    onAdvance={advancePhase}
                                    centroidLookup={centroidLookup}
                                    availableObjectiveOsids={availableObjectiveOsids}
                                    canSuggestPlan={hasCommander}
                                    canAdvanceToG2={canAdvanceToG2}
                                />
                            </div>
                        )}
                        {phase === 'g2_assessment' && (
                            <div className="flex min-h-0 flex-1 flex-col" data-testid="ops-planning-phase-panel" data-phase="g2_assessment">
                                <G2Phase
                                    plan={plan}
                                    prediction={prediction}
                                    loading={predLoading}
                                    error={predError}
                                    corpsId={corpsId}
                                    onAdvance={advancePhase}
                                />
                            </div>
                        )}
                        {phase === 'authorize' && (
                            <div className="flex min-h-0 flex-1 flex-col" data-testid="ops-planning-phase-panel" data-phase="authorize">
                                <AuthorizePhase
                                    plan={plan}
                                    prediction={prediction}
                                    corpsId={corpsId}
                                    officerId={selectedOfficerId}
                                    originSectorId={originSectorId}
                                />
                            </div>
                        )}
                    </SurfaceDetail>
                </SurfaceColumns>
            </div>
        </div>
    );
}
