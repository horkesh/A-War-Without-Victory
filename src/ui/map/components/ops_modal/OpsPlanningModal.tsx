import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPhase, OpsPlanState, AxisState } from './types';
import { PHASE_ORDER, PHASE_LABELS } from './types';
import { CommanderPhase } from './CommanderPhase';
import { PlanPhase } from './PlanPhase';
import { G2Phase } from './G2Phase';
import { AuthorizePhase } from './AuthorizePhase';
import { OpsMap } from './OpsMap';
import { usePrediction } from './usePrediction';
import { OPERATION_NAMES, simpleHash } from '../../../../sim/combat/operation_names';

let nextAxisCounter = 0;
function makeAxisId(): string { return `axis_${++nextAxisCounter}`; }

function generateOpName(corpsId: string, turn: number): string {
    // OPERATION_NAMES is Record<string, readonly string[]> — flatten all names
    const allNames = Object.values(OPERATION_NAMES).flat();
    if (allNames.length === 0) return 'Operation Alpha';
    const idx = simpleHash(`${corpsId}_${turn}`) % allNames.length;
    return `Operation ${allNames[idx]}`;
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
    const [centroidLookup, setCentroidLookup] = useState<Map<string, [number, number]>>(new Map());

    // --- Plan state (lifted to shell for cross-phase access) ---
    const defaultStagingOsid = useMemo(() => {
        if (!loadedGameState?.corpsFrontSectors || !corpsId) return '';
        const sectors = loadedGameState.corpsFrontSectors.filter((s) => s.corps_id === corpsId);
        // Get first friendly OSID from sub-segments
        const firstSub = sectors[0]?.sub_segments?.[0];
        return firstSub?.friendly_osids?.[0] ?? '';
    }, [loadedGameState, corpsId]);

    const [plan, setPlan] = useState<OpsPlanState>(() => ({
        opName: '',
        opType: 'sector_attack',
        tempo: 'standard',
        tolerance: 'costly_victory',
        artilleryPreparation: false,
        schwerpunktOsid: '',
        axes: [{ id: makeAxisId(), name: 'Main Axis', brigadeIds: [], objectives: [], stagingOsid: undefined }],
        activeAxisId: '',
        defaultStagingOsid: '',
    }));

    // Reset plan when modal opens
    useEffect(() => {
        if (isOpen && corpsId) {
            const initialAxis: AxisState = { id: makeAxisId(), name: 'Main Axis', brigadeIds: [], objectives: [] };
            setPlan({
                opName: generateOpName(corpsId, loadedGameState?.turn ?? 0),
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
        }
    }, [isOpen, corpsId, defaultStagingOsid, loadedGameState?.turn]);

    // Track highest reached phase for backtracking
    useEffect(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        setHighestPhase((prev) => Math.max(prev, idx));
    }, [phase]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { clearContext(); return; }
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
    }, [isOpen, phase, highestPhase, clearContext]);

    const advancePhase = useCallback(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        if (idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1]);
    }, [phase]);

    const goToPhase = useCallback((target: OpsPhase) => {
        const targetIdx = PHASE_ORDER.indexOf(target);
        if (targetIdx <= highestPhase) setPhase(target);
    }, [highestPhase]);

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

    if (!isOpen || !corpsId) return null;

    const currentIdx = PHASE_ORDER.indexOf(phase);
    const allObjectives = plan.axes.flatMap((a) => a.objectives);

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60">
            {/* Full-bleed map background */}
            <OpsMap
                corpsId={corpsId}
                onOsidClick={handleOsidClick}
                objectives={allObjectives}
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
                {PHASE_ORDER.map((p, i) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => goToPhase(p)}
                        disabled={i > highestPhase}
                        className="flex items-center gap-2 group"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === currentIdx
                                ? 'bg-accent-gold shadow-[0_0_8px_rgba(196,163,90,0.5)]'
                                : i <= highestPhase
                                    ? 'bg-accent-gold/40 group-hover:bg-accent-gold/70'
                                    : 'bg-[rgba(180,160,130,0.15)]'
                        }`} />
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${
                            i === currentIdx ? 'text-accent-gold' : i <= highestPhase ? 'text-text-secondary' : 'text-text-secondary/30'
                        }`}>
                            {PHASE_LABELS[p]}
                        </span>
                        {i < PHASE_ORDER.length - 1 && (
                            <div className={`w-6 h-px ${i < currentIdx ? 'bg-accent-gold/40' : 'bg-[rgba(180,160,130,0.1)]'}`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Phase content */}
            {phase === 'commander' && <CommanderPhase onAdvance={advancePhase} />}
            {phase === 'plan' && (
                <PlanPhase
                    plan={plan}
                    onUpdate={updatePlan}
                    corpsId={corpsId}
                    onAdvance={advancePhase}
                    centroidLookup={centroidLookup}
                />
            )}
            {phase === 'g2_assessment' && (
                <G2Phase
                    plan={plan}
                    prediction={prediction}
                    loading={predLoading}
                    error={predError}
                    corpsId={corpsId}
                    onAdvance={advancePhase}
                />
            )}
            {phase === 'authorize' && (
                <AuthorizePhase
                    plan={plan}
                    prediction={prediction}
                    corpsId={corpsId}
                    officerId={selectedOfficerId}
                    originSectorId={originSectorId}
                />
            )}

            {/* Close button — top right */}
            <button
                type="button"
                onClick={clearContext}
                className="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center
                           text-text-secondary hover:text-white rounded-full
                           bg-[rgba(20,18,15,0.6)] hover:bg-[rgba(20,18,15,0.9)]
                           backdrop-blur-sm transition-colors border border-[rgba(180,160,130,0.1)]"
            >
                &#10005;
            </button>
        </div>
    );
}
