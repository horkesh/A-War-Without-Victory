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

    if (!isOpen || !corpsId) return null;

    const currentIdx = PHASE_ORDER.indexOf(phase);

    return (
        <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: Z.MODAL }}
            data-testid="ops-planning-modal"
            data-corps-id={corpsId}
            data-origin-sector-id={originSectorId ?? ''}
            data-phase={phase}
        >
            {/* Full-bleed map background */}
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

            {/* Phase indicator — top center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                            bg-[rgba(20,18,15,0.88)] backdrop-blur-xl rounded-full px-4 py-2
                            border border-[rgba(180,160,130,0.15)]">
                {PHASE_ORDER.map((p, i) => {
                    const phaseLabel = t(PHASE_LABEL_KEYS[p]);
                    const locked = i > highestPhase;
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
                        className="flex items-center gap-2 group"
                    >
                        {/* WP4c: Enlarged phase dots */}
                        <div className={`w-3.5 h-3.5 rounded-full transition-all ${
                            i === currentIdx
                                ? 'bg-accent-gold shadow-[0_0_8px_rgba(196,163,90,0.5)]'
                                : i <= highestPhase
                                    ? 'bg-accent-gold/40 group-hover:bg-accent-gold/70'
                                    : 'bg-[rgba(180,160,130,0.15)]'
                        }`} />
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${
                            i === currentIdx ? 'text-accent-gold' : i <= highestPhase ? 'text-text-secondary' : 'text-text-secondary/30'
                        }`}>
                            {phaseLabel}
                            <span aria-hidden="true" className="text-[7px] text-text-secondary/30 ml-1">{` ${i + 1}`}</span>
                        </span>
                        {i < PHASE_ORDER.length - 1 && (
                            <div aria-hidden="true" className={`w-6 h-px ${i < currentIdx ? 'bg-accent-gold/40' : 'bg-[rgba(180,160,130,0.1)]'}`} />
                        )}
                    </button>
                    );
                })}
            </div>

            {phaseGateMessage && (
                <div
                    role="status"
                    className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded-md border border-accent-gold/25
                               bg-[rgba(20,18,15,0.92)] px-3 py-2 text-[11px] font-semibold text-accent-gold shadow-lg"
                >
                    {phaseGateMessage}
                </div>
            )}

            {discardConfirmOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ops-planning-discard-title"
                    className="absolute top-16 right-4 z-40 w-[320px] rounded-lg border border-red-400/30
                               bg-[rgba(20,18,15,0.96)] p-4 text-text-primary shadow-2xl backdrop-blur-xl"
                >
                    <div
                        id="ops-planning-discard-title"
                        className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-300"
                    >
                        {t('opsPlanning.discard.title')}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                        {t('opsPlanning.discard.body')}
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDiscardConfirmOpen(false)}
                            className="rounded border border-[rgba(180,160,130,0.2)] px-3 py-1.5
                                       text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary
                                       hover:border-accent-gold/35 hover:text-white"
                        >
                            {t('opsPlanning.discard.keepPlanning')}
                        </button>
                        <button
                            type="button"
                            onClick={confirmDiscardOpsPlanning}
                            className="rounded border border-red-400/35 bg-red-500/15 px-3 py-1.5
                                       text-[10px] font-bold uppercase tracking-[0.14em] text-red-200
                                       hover:bg-red-500/25"
                        >
                            {t('opsPlanning.discard.discardDraft')}
                        </button>
                    </div>
                </div>
            )}

            {/* Phase content */}
            {phase === 'commander' && (
                <div data-testid="ops-planning-phase-panel" data-phase="commander">
                    <CommanderPhase onAdvance={advancePhase} />
                </div>
            )}
            {phase === 'plan' && (
                <div data-testid="ops-planning-phase-panel" data-phase="plan">
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
                <div data-testid="ops-planning-phase-panel" data-phase="g2_assessment">
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
                <div data-testid="ops-planning-phase-panel" data-phase="authorize">
                <AuthorizePhase
                    plan={plan}
                    prediction={prediction}
                    corpsId={corpsId}
                    officerId={selectedOfficerId}
                    originSectorId={originSectorId}
                />
                </div>
            )}

            {/* Close button — top right */}
            {/* WP4d: Enlarged close button with title */}
            <button
                type="button"
                onClick={requestCloseOpsPlanning}
                title={t('opsModal.closePlanningTitle')}
                data-testid="ops-planning-close"
                className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center
                           text-text-secondary hover:text-white rounded-full
                           bg-[rgba(20,18,15,0.6)] hover:bg-[rgba(20,18,15,0.9)]
                           backdrop-blur-sm transition-colors border border-[rgba(180,160,130,0.1)]"
            >
                &#10005;
            </button>
        </div>
    );
}
