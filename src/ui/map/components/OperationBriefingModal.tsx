/**
 * Operation Briefing Modal — triggered when a player's operation reaches the assessment sub-phase.
 * Shows commander's assessment, intel summary, force ratio, supply status, and go/no-go decision buttons.
 */
import { useMemo } from 'react';
import type { NamedOfficerView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { formatRank, getArchetype, formatPips, getRatingColor } from '../utils/officerCharacter';
import { getPlayerSafeCorpsName, getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { findPlayerFacingOperationByKey } from '../../shared/playerVisibility';

const FORCE_LAUNCH_COST = 15;
const RECOVERY_PER_TURN = 2;

interface OperationBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Player decision callbacks. */
    onLaunch?: () => void;
    onPostpone?: () => void;
    onAbort?: () => void;
    onOrderProbe?: () => void;
    /** Level 3 Direct Intervention — force-launch overriding the commander's recommendation. */
    onForceLaunch?: () => void;
}

function ReadinessBar({ label, value, thresholdLabel }: { label: string; value: number; thresholdLabel?: string }) {
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="mb-2">
            <div className="flex justify-between text-[9px] mb-0.5">
                <span className="uppercase font-bold text-neutral-600">{label}</span>
                <span className="text-neutral-500">{pct}%{thresholdLabel ? ` (need ${thresholdLabel})` : ''}</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-sm overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function AssessmentBadge({ assessment }: { assessment?: string }) {
    switch (assessment) {
        case 'launch':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-green-100 text-green-800 border border-green-300">Recommends Launch</span>;
        case 'postpone':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 border border-amber-300">Recommends Postpone</span>;
        case 'abort':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-100 text-red-800 border border-red-300">Recommends Abort</span>;
        default:
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">Pending Assessment</span>;
    }
}

/** Shown on operations in execution/recovery that were force-launched. */
function ForceLaunchBadge({ caCost }: { caCost: number }) {
    return (
        <div className="mx-4 mt-3 mb-1 px-3 py-1.5 border border-amber-400/40 bg-amber-50 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800">⚠ Presidential Override — Direct Intervention</span>
            <span className="text-[9px] text-amber-600" style={{ opacity: 0.7 }}>Cost: {caCost} CA</span>
        </div>
    );
}

/** Direct Intervention section — shown when the commander does NOT recommend launch. */
function DirectInterventionSection({ assessment, currentAuth, onForceLaunch }: {
    assessment: string;
    currentAuth: number;
    onForceLaunch?: () => void;
}) {
    const canAfford = currentAuth >= FORCE_LAUNCH_COST;
    const remaining = currentAuth - FORCE_LAUNCH_COST;

    const explanation = assessment === 'abort'
        ? 'The commander recommends aborting. Forcing launch overrides that assessment.'
        : 'The commander recommends waiting. Forcing launch overrides that judgment.';

    return (
        <div className="mx-4 my-3 border border-amber-400/40 bg-amber-50">
            <div className="px-3 py-2 border-b border-amber-300/60 bg-amber-100/60 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Direct Intervention</span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-600">Level 3</span>
            </div>
            <div className="px-3 py-2 space-y-2">
                <p className="text-[10px] text-amber-900 leading-relaxed">{explanation}</p>
                <div className="flex items-center gap-4 text-[10px] font-mono tabular-nums">
                    <span className="text-neutral-600">
                        Command Authority: <b className="text-neutral-800">{currentAuth}</b> → <b className={canAfford ? 'text-amber-700' : 'text-red-600'}>{canAfford ? remaining : currentAuth}</b> after
                    </span>
                    <span className="text-neutral-500">Cost: {FORCE_LAUNCH_COST} | Recovery: +{RECOVERY_PER_TURN}/turn</span>
                </div>
                <button
                    type="button"
                    onClick={onForceLaunch}
                    disabled={!canAfford}
                    className={`w-full mt-1 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider border transition-colors ${
                        canAfford
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-400 cursor-pointer'
                            : 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed'
                    }`}
                    title={canAfford
                        ? `Spend ${FORCE_LAUNCH_COST} Command Authority to override the command chain`
                        : `Insufficient Command Authority (${currentAuth}/${FORCE_LAUNCH_COST})`
                    }
                >
                    {canAfford
                        ? `Force Launch — Override Command Chain`
                        : `Insufficient Command Authority (${currentAuth}/${FORCE_LAUNCH_COST})`
                    }
                </button>
            </div>
        </div>
    );
}

export function OperationBriefingModal({ isOpen, onClose, onLaunch, onPostpone, onAbort, onOrderProbe, onForceLaunch }: OperationBriefingModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const context = useGameStore((s) => s.operationBriefingContext);

    const { operation, commander } = useMemo(() => {
        if (!loadedGameState || !context) return { operation: null, commander: null };
        const op = findPlayerFacingOperationByKey(
            loadedGameState,
            `${context.corpsId}|${context.operationName}`,
        );
        let cdr: NamedOfficerView | null = null;
        if (op?.commander_officer_id && loadedGameState.namedOfficerData) {
            cdr = loadedGameState.namedOfficerData.find((o) => o.id === op.commander_officer_id) ?? null;
        }
        return { operation: op, commander: cdr };
    }, [loadedGameState, context]);

    if (!isOpen || !context || !operation) return null;

    const intelConf = operation.intel_confidence_at_assessment ?? operation.readiness?.intel ?? 0;
    const supplyReady = operation.supply_readiness_at_assessment ?? operation.readiness?.supply ?? 0;
    const forceRatio = operation.force_ratio_estimate;
    const assessment = operation.commander_assessment;
    const postponements = operation.postponement_count ?? 0;
    const corpsLabel = getPlayerSafeCorpsName(
        operation.corps_name ?? null,
        operation.corps_id,
        'This corps',
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="bg-white border-2 border-neutral-400 shadow-xl max-w-lg w-full">
                {/* Header — operation name + stamp */}
                <div className="px-4 py-3 border-b-2 border-neutral-300 bg-neutral-100 relative">
                    <div className={`absolute top-1 right-3 opacity-15 font-black text-2xl -rotate-12 select-none uppercase ${assessment === 'launch' ? 'text-green-700' : assessment === 'abort' ? 'text-red-700' : 'text-amber-700'}`}>
                        BRIEFING
                    </div>
                    <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Operations Briefing</div>
                    <div className="text-sm font-bold mt-0.5">{operation.name}</div>
                    <div className="text-[10px] text-neutral-500">{corpsLabel} / {getPlayerSafeMilitaryFactionName(operation.faction)}</div>
                </div>

                {/* Presidential Override badge — only on executing/recovery ops that were force-launched */}
                {operation.was_force_launched && operation.phase !== 'planning' && (
                    <ForceLaunchBadge caCost={FORCE_LAUNCH_COST} />
                )}

                {/* Commander info */}
                {commander && (
                    <div className="px-4 py-2 border-b border-neutral-200 bg-neutral-50">
                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">Ops Commander</div>
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="text-[11px] font-bold">{formatRank(commander.rank)} {commander.name}</div>
                                <div className="text-[9px] text-neutral-500 italic">{getArchetype(commander)}</div>
                            </div>
                            <div className="flex gap-2 text-[8px]">
                                <span className={`font-mono ${getRatingColor(commander.competence)}`}>{formatPips(commander.competence)}</span>
                                <span className={`font-mono ${getRatingColor(commander.aggressiveness)}`}>{formatPips(commander.aggressiveness)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Readiness gauges */}
                <div className="px-4 py-3 space-y-1">
                    <ReadinessBar label="Intelligence" value={intelConf} />
                    <ReadinessBar label="Supply" value={supplyReady} />
                    {operation.readiness?.cohesion != null && (
                        <ReadinessBar label="Force Cohesion" value={operation.readiness.cohesion} />
                    )}

                    {forceRatio != null && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-200">
                            <span className="text-[9px] uppercase font-bold text-neutral-600">Force Ratio Estimate</span>
                            <span className={`text-[11px] font-bold ${forceRatio >= 1.5 ? 'text-green-700' : forceRatio >= 1.0 ? 'text-amber-700' : 'text-red-700'}`}>
                                {forceRatio.toFixed(2)}:1
                            </span>
                            <span className="text-[8px] text-neutral-400">
                                {forceRatio >= 2.0 ? '(overwhelming)' : forceRatio >= 1.5 ? '(favorable)' : forceRatio >= 1.0 ? '(marginal)' : '(unfavorable)'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Assessment badge */}
                <div className="px-4 py-2 border-t border-neutral-200 flex items-center gap-3">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">Commander Assessment:</span>
                    <AssessmentBadge assessment={assessment} />
                    {postponements > 0 && (
                        <span className="text-[8px] text-neutral-400">({postponements} prior postponement{postponements > 1 ? 's' : ''})</span>
                    )}
                </div>

                {/* Direct Intervention — only when commander does NOT recommend launch */}
                {assessment !== 'launch' && onForceLaunch && (
                    <DirectInterventionSection
                        assessment={assessment ?? 'postpone'}
                        currentAuth={loadedGameState?.commandAuthority?.current ?? 0}
                        onForceLaunch={onForceLaunch}
                    />
                )}

                {/* Action buttons */}
                <div className="px-4 py-3 border-t-2 border-neutral-300 bg-neutral-50 flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={onLaunch}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-green-600 hover:bg-green-700 text-white border border-green-700 transition-colors"
                    >
                        Launch Operation
                    </button>
                    <button
                        type="button"
                        onClick={onOrderProbe}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 transition-colors"
                    >
                        Order Probe
                    </button>
                    <button
                        type="button"
                        onClick={onPostpone}
                        disabled={postponements >= 2}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Postpone{postponements >= 2 ? ' (max reached)' : ''}
                    </button>
                    <button
                        type="button"
                        onClick={onAbort}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 transition-colors"
                    >
                        Abort Operation
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 border border-neutral-400 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
