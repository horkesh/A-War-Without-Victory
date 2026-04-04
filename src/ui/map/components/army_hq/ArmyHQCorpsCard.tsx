/**
 * Army HQ Corps Card — Warroom Panel.
 * Uses FlipCard for front (summary) / back (detail) with 3D flip animation.
 * Compressed mode stays as a single-line mini card when another card is flipped.
 */
import { useMemo, useState } from 'react';
import type { FormationView, FrictionEventView, CorpsFrontSectorView, OperationView, LoadedGameState } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { formatCorpsDisplayName } from '../../utils/formatters';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getFormationCommander } from '../../utils/officerUtils';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { Icon } from '../icons/Icon';
import { CommanderSection } from './CommanderSection';
import { CommandManagementSection } from './CommandManagementSection';
import { SectorsSection } from './SectorsSection';
import { OperationsSection } from './OperationsSection';
import { OrbatSection } from './OrbatSection';
import { CombatRecordSection } from './CombatRecordSection';
import { FlipCard } from './FlipCard';
import { deriveStanceInterpretation } from '../../data/command_strain';

import type { ReadinessGrade } from './ForceReadiness';

interface ArmyHQCorpsCardProps {
    corps: FormationView;
    brigades: FormationView[];
    sectors: CorpsFrontSectorView[];
    operations: OperationView[];
    factionBattles: TurnBattle[];
    gameState: LoadedGameState;
    isExpanded: boolean;
    isCompressed: boolean;
    onToggleExpand: () => void;
    /** Corps readiness grade from ForceReadiness computation. */
    readinessGrade?: ReadinessGrade;
    /** Whether enemy offensive preparation is detected facing this corps. */
    hasThreat?: boolean;
}

const COHESION_CRITICAL = 40;
const COHESION_HEALTHY = 70;

const GRADE_COLORS: Record<string, string> = {
    A: 'text-emerald-400', B: 'text-accent-gold', C: 'text-amber-500', D: 'text-red-500', F: 'text-red-600',
};

const STANCE_LABELS: Record<string, string> = {
    offensive: 'OFF', defensive: 'DEF', balanced: 'BAL', reorganize: 'REORG',
};
const STANCE_COLORS: Record<string, string> = {
    offensive: 'text-red-500 border-red-500/30 bg-red-500/5',
    defensive: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    balanced: 'text-accent-gold border-accent-gold/30 bg-accent-gold/5',
    reorganize: 'text-neutral-400 border-neutral-400/30 bg-neutral-400/5',
};

const READINESS_BORDER: Record<string, string> = {
    'COMBAT READY': 'border-l-emerald-400',
    'ADEQUATE': '',
    'STRAINED': 'border-l-amber-500',
    'DEGRADED': 'border-l-red-500',
    'INEFFECTIVE': 'border-l-red-600',
};

export function ArmyHQCorpsCard({
    corps, brigades, sectors, operations, factionBattles, gameState,
    isExpanded, isCompressed, onToggleExpand,
    readinessGrade, hasThreat,
}: ArmyHQCorpsCardProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const [pendingStance, setPendingStance] = useState<string | null>(null);

    const data = useMemo(() => {
        const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const avgCohesion = brigades.length > 0
            ? brigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / brigades.length
            : 100;
        const avgFatigue = brigades.length > 0
            ? brigades.reduce((s, b) => s + (b.fatigue ?? 0), 0) / brigades.length
            : 0;
        const eff = aggregateEffectiveness(brigades);
        const commander = getFormationCommander(corps, gameState);
        const stance = corps.corpsStance ?? 'balanced';
        const activeOp = operations.find((op) => op.phase === 'execution');

        // This-week battles: count battles in this corps' territory
        const corpsTerritoryOsids = new Set<string>();
        for (const sec of sectors) {
            for (const sub of (sec.sub_segments ?? [])) {
                for (const osid of sub.friendly_osids) corpsTerritoryOsids.add(osid);
            }
        }
        const corpsBattles = factionBattles.filter((b) => corpsTerritoryOsids.has(b.osid));

        const rawEquip = brigades.reduce((acc, b) => {
            const c = b.composition;
            if (!c) return acc;
            acc.tanksOp += c.tank_condition?.operational ?? 0;
            acc.tanksTotal += c.tanks ?? 0;
            acc.artyOp += c.artillery_condition?.operational ?? 0;
            acc.artyTotal += c.artillery ?? 0;
            return acc;
        }, { tanksOp: 0, tanksTotal: 0, artyOp: 0, artyTotal: 0 });
        const equipment = {
            tanksOp: Math.round(rawEquip.tanksOp),
            tanksTotal: Math.round(rawEquip.tanksTotal),
            artyOp: Math.round(rawEquip.artyOp),
            artyTotal: Math.round(rawEquip.artyTotal),
        };

        const strain = corps.commandStrain ?? 0;
        const strainLabel = corps.commandStrainLabel ?? 'healthy';
        const frictionTypes = corps.activeFrictionTypes ?? [];
        const frictionEvents = corps.frictionEvents ?? [];
        const stabilizationAvailable = corps.stabilizationAvailable ?? false;
        const stabilizationCooldownUntil = corps.stabilizationCooldownUntil;
        const stabilizationCostCA = corps.stabilizationCostCA ?? 0;
        const currentTurn = gameState.turn ?? 0;

        return { totalPersonnel, avgCohesion, avgFatigue, eff, commander, stance, activeOp, corpsBattles, equipment, strain, strainLabel, frictionTypes, frictionEvents, stabilizationAvailable, stabilizationCooldownUntil, stabilizationCostCA, currentTurn };
    }, [corps, brigades, sectors, operations, factionBattles, gameState]);

    const displayName = formatCorpsDisplayName(corps.name, corps.id);
    const isCritical = data.avgCohesion < COHESION_CRITICAL;
    const noCommander = !data.commander;
    const stanceClass = STANCE_COLORS[data.stance] ?? STANCE_COLORS.balanced;
    const gradeColor = GRADE_COLORS[data.eff.grade] ?? 'text-text-secondary';

    // Compressed: single line when another card is flipped
    if (isCompressed) {
        return (
            <button
                type="button"
                onClick={onToggleExpand}
                className="bg-panel-card border border-panel-border overflow-hidden hover:border-amber-400/40 transition-colors cursor-pointer group"
            >
                <div className="flex items-center justify-between px-3 py-2 bg-panel-card">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest font-mono">
                        {displayName}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold tabular-nums font-mono ${gradeColor}`}>
                            {data.eff.grade}
                        </span>
                    </div>
                </div>
                {/* Thin cohesion bar */}
                <div className="h-[1px] bg-white/5">
                    <div className={`h-full ${data.avgCohesion >= COHESION_HEALTHY ? 'bg-emerald-400/60' : data.avgCohesion >= COHESION_CRITICAL ? 'bg-accent-gold/60' : 'bg-red-500/60'}`}
                        style={{ width: `${Math.min(100, data.avgCohesion)}%` }} />
                </div>
            </button>
        );
    }

    const handleStanceChange = (newStance: string) => {
        const { severity } = deriveStanceInterpretation(data.strain, data.strainLabel, newStance);
        if (severity === 'normal') {
            // Immediate commit — silence = healthy
            if (!ipc.isAvailable) return;
            void ipc.stageCorpsStanceOrder(corps.id, newStance).then((result) => {
                if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance.');
            });
        } else {
            // Show preview panel — player must confirm (or cancel for constrained)
            setPendingStance(newStance);
        }
    };

    const handleConfirmStance = async () => {
        if (!pendingStance || !ipc.isAvailable) return;
        const result = await ipc.stageCorpsStanceOrder(corps.id, pendingStance);
        if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance.');
        setPendingStance(null);
    };

    const handleCancelStance = () => {
        setPendingStance(null);
    };

    const handleAcknowledgeFriction = async (event: FrictionEventView) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.acknowledgeFrictionEvent({
            corpsId: corps.id,
            officerId: event.officerId,
            eventTurn: event.turn,
            eventType: event.compositeKey.split(':')[2] ?? '',
        });
        if (!result.ok) setLoadError(result.error ?? 'Failed to acknowledge friction event.');
    };

    // Front face: summary card (clickable to flip)
    const cardFront = (
        <button
            type="button"
            onClick={onToggleExpand}
            className={`min-h-[256px] w-full bg-panel-card border border-panel-border overflow-hidden hover:border-amber-400/50 transition-all cursor-pointer relative flex flex-col text-left
                ${readinessGrade && READINESS_BORDER[readinessGrade] ? `border-l-[3px] ${READINESS_BORDER[readinessGrade]}` : isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Threat badge */}
            {hasThreat && (
                <div className="absolute top-2 left-2 text-[8px] text-red-400 font-bold animate-pulse tracking-[0.15em] bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 z-10">
                    ⚠ INCOMING
                </div>
            )}

            {/* Status Stamp */}
            <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 border ${stanceClass} z-10 font-mono`}>
                {STANCE_LABELS[data.stance] ?? data.stance}
            </div>

            <div className="px-4 py-4 flex-1 flex flex-col">
                {/* Line 1: Corps name */}
                <div className="text-[16px] font-bold text-amber-400 uppercase tracking-widest leading-tight pr-24" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                    {displayName}
                </div>

                {/* Line 2: Commander + grade */}
                <div className="text-[12px] text-text-secondary mt-1.5 flex items-center gap-2.5 font-mono">
                    {data.commander ? (
                        <span>{data.commander.name}</span>
                    ) : (
                        <span className="italic text-red-500/60">[!] UNASSIGNED</span>
                    )}
                    <div className="w-1 h-3 border-l border-panel-border" />
                    <span className={`font-bold ${gradeColor}`}>EF: {data.eff.grade}</span>
                </div>

                {/* Equipment icons */}
                <div className="flex items-center gap-4 mt-1.5 text-[12px]">
                    <span className="flex items-center gap-1">
                        <Icon name="tanks" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{data.equipment.tanksOp}</span>
                        <span className="text-text-secondary/60">/{data.equipment.tanksTotal}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Icon name="artillery" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{data.equipment.artyOp}</span>
                        <span className="text-text-secondary/60">/{data.equipment.artyTotal}</span>
                    </span>
                </div>

                {/* Line 3: Stats */}
                <div className="flex items-center gap-4 mt-3 text-[12px] tabular-nums font-mono">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-tighter">Personnel</span>
                        <span className={`font-bold ${data.totalPersonnel >= 8000 ? 'text-emerald-400' : data.totalPersonnel >= 4000 ? 'text-accent-gold' : 'text-red-500'
                            }`}>
                            {data.totalPersonnel.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-tighter">Orbat</span>
                        <span className="text-text-secondary font-bold">{brigades.length} BRG</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-text-secondary/60 uppercase tracking-tighter">Front</span>
                        <span className="text-text-secondary font-bold">{sectors.length} SEC</span>
                    </div>
                </div>

                {/* Active op indicator */}
                {data.activeOp && (
                    <div className="mt-3 pt-2.5 border-t border-panel-border flex flex-col gap-1">
                        <span className="text-[9px] text-red-500 font-bold tracking-[0.2em] uppercase">ACTIVE OPERATION</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[11px] text-red-400 font-bold truncate uppercase font-mono">
                                {data.activeOp.name}
                            </span>
                        </div>
                    </div>
                )}

                {/* This-week battles */}
                {data.corpsBattles.length > 0 && (
                    <div className="mt-2.5 flex gap-2">
                        <div className="px-2 py-0.5 bg-red-900/40 border border-red-500/40 text-red-400 text-[9px] font-bold tracking-widest animate-pulse">
                            CONTACT: {data.corpsBattles.length} ENGAGEMENTS
                        </div>
                    </div>
                )}

                {/* Command Strain indicator — only when strain > 0 */}
                {data.strain > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <div
                            className={`px-2 py-0.5 text-[9px] font-bold tracking-widest border ${
                                data.strainLabel === 'compromised'
                                    ? 'bg-red-900/30 border-red-500/40 text-red-400'
                                    : 'bg-amber-900/30 border-amber-500/40 text-amber-400'
                            }`}
                            title={
                                data.strainLabel === 'compromised'
                                    ? 'Repeated presidential intervention has severely undermined command cohesion. Flip card to review and acknowledge friction events.'
                                    : 'Presidential overrides have strained this command relationship. Flip card to review and acknowledge friction events.'
                            }
                        >
                            {data.strainLabel === 'compromised' ? '⚠ COMMAND COMPROMISED' : '⚠ COMMAND STRAINED'}
                        </div>
                        {/* Friction dot — demoted from badge to dot indicator (back face owns the detail list) */}
                        {data.frictionTypes.length > 0 && (
                            <div
                                className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-widest border bg-amber-900/20 border-amber-600/40 text-amber-500"
                                title="Warlord friction active — flip card to review and acknowledge."
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                FRICTION
                            </div>
                        )}
                    </div>
                )}
                {/* Warlord friction dot — shown even when strain = 0, signals "flip to see" */}
                {data.strain === 0 && data.frictionTypes.length > 0 && (
                    <div className="mt-2.5">
                        <div
                            className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-widest border bg-amber-900/20 border-amber-600/40 text-amber-500 inline-flex"
                            title="Warlord friction active — flip card to review and acknowledge."
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            FRICTION
                        </div>
                    </div>
                )}
            </div>

            {/* Health stripe: cohesion (green/amber/red) + fatigue (blue) */}
            <div className="flex h-[4px] bg-panel-bg w-full">
                <div className={`h-full transition-all duration-500 ${data.avgCohesion >= COHESION_HEALTHY ? 'bg-emerald-400' : data.avgCohesion >= COHESION_CRITICAL ? 'bg-accent-gold' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(70, data.avgCohesion * 0.7)}%` }} />
                <div className="h-full bg-blue-500/60 transition-all duration-500"
                    style={{ width: `${Math.min(30, ((data.avgFatigue ?? 0) / 30) * 30)}%` }} />
            </div>
        </button>
    );

    // Back face: full detail sections (scrollable)
    const cardBack = (
        <div
            className={`min-h-[256px] bg-panel-card border border-panel-border overflow-hidden flex flex-col
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Header with back button + stance dropdown */}
            <div className="flex items-center justify-between px-4 py-3 bg-panel-card border-b border-panel-border">
                <button
                    type="button"
                    onClick={onToggleExpand}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <span className="text-[12px] text-text-secondary font-mono">&larr; Back</span>
                    <div className="text-[18px] font-bold text-amber-400 uppercase tracking-widest" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                        {displayName}
                    </div>
                    <span className={`text-[14px] font-bold font-mono px-2 py-0.5 border border-panel-border bg-panel-bg ${gradeColor}`}>
                        EF: {data.eff.grade}
                    </span>
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-[12px] tabular-nums font-mono text-text-secondary uppercase">
                        <span><b className="text-text-primary">{data.totalPersonnel.toLocaleString()}</b> Pers</span>
                        <span><b className="text-text-primary">{brigades.length}</b> Brg</span>
                        <span><b className="text-text-primary">{sectors.length}</b> Sec</span>
                    </div>
                    {/* Stance dropdown — offensive disabled when command is compromised (strain >= 6) */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary/60 uppercase tracking-widest">Stance:</span>
                        <select
                            value={pendingStance ?? data.stance}
                            onChange={(e) => { handleStanceChange(e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold uppercase bg-panel-bg text-text-primary border border-panel-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-400"
                        >
                            <option
                                value="offensive"
                                disabled={data.strainLabel === 'compromised'}
                                title={data.strainLabel === 'compromised' ? 'Not available — command is compromised. Stabilize the command relationship first.' : undefined}
                            >
                                OFFENSIVE{data.strainLabel === 'compromised' ? ' [LOCKED]' : ''}
                            </option>
                            <option value="balanced">BALANCED</option>
                            <option value="defensive">DEFENSIVE</option>
                            <option value="reorganize">REORGANIZE</option>
                        </select>
                    </div>
                </div>
            </div>
            {/* Stance interpretation preview — Wave 6. Shown when pendingStance requires confirmation. */}
            {pendingStance !== null && pendingStance !== data.stance && (() => {
                const { severity, notice, isBlocked } = deriveStanceInterpretation(data.strain, data.strainLabel, pendingStance);
                if (severity === 'normal') return null;
                const isConstrained = severity === 'constrained';
                return (
                    <div className={`px-4 py-2 border-b ${isConstrained ? 'border-red-500/20 bg-red-900/10' : 'border-amber-500/20 bg-amber-900/10'}`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] uppercase font-bold tracking-wider opacity-80 shrink-0 ${isConstrained ? 'text-red-400' : 'text-amber-400'}`}>
                                Army HQ Interpretation
                            </span>
                        </div>
                        <p className={`text-[10px] leading-snug mt-1 mb-1.5 ${isConstrained ? 'text-red-300' : 'text-amber-300'}`}>
                            {notice}
                        </p>
                        {!isBlocked && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void handleConfirmStance(); }}
                                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 border border-amber-600/50 text-amber-400 bg-amber-900/20 hover:bg-amber-900/40 transition-colors"
                                >
                                    Confirm Stance Order
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleCancelStance(); }}
                                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 border border-panel-border text-text-secondary hover:border-panel-border/80 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        {isBlocked && (
                            <p className="text-[9px] text-text-secondary/60 italic">
                                Restore the command relationship to unlock this option.
                            </p>
                        )}
                    </div>
                );
            })()}

            {/* Command Strain / Friction panel — back face (Wave 3: full resolution surface) */}
            {(data.strain > 0 || data.frictionEvents.length > 0) && (
                <div className="px-4 py-2 border-b border-panel-border bg-panel-bg/60 flex flex-col gap-1.5">
                    {/* Strain score row */}
                    {data.strain > 0 && (
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-[9px] font-bold tracking-widest uppercase ${
                                    data.strainLabel === 'compromised' ? 'text-red-400' : 'text-amber-400'
                                }`}
                                title={
                                    data.strainLabel === 'compromised'
                                        ? 'Repeated presidential intervention has severely undermined command cohesion.'
                                        : 'Presidential overrides have strained this command relationship.'
                                }
                            >
                                Command Strain: {data.strainLabel === 'compromised' ? 'Compromised' : 'Strained'} [{data.strain}]
                            </span>
                        </div>
                    )}
                    {/* Friction event list — unresolved events with Acknowledge buttons */}
                    {data.frictionEvents.filter(e => !e.resolved).length > 0 && (
                        <div className="flex flex-col gap-1">
                            {data.frictionEvents.filter(e => !e.resolved).map(event => (
                                <div
                                    key={event.compositeKey}
                                    className="flex items-center justify-between gap-2 py-0.5"
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-amber-500 text-[9px]">·</span>
                                        <span className="text-[10px] text-amber-400 font-mono truncate">
                                            {event.typeLabel}
                                        </span>
                                        <span className="text-[9px] text-text-secondary/60 font-mono shrink-0">
                                            Wk {event.turn}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); void handleAcknowledgeFriction(event); }}
                                        className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-amber-600/40 text-amber-500 bg-amber-900/20 hover:bg-amber-900/40 hover:border-amber-500/60 transition-colors"
                                        title="Acknowledge this friction event to reduce command strain over time."
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            ))}
                            <p className="text-[9px] text-text-secondary/50 italic mt-0.5">
                                Acknowledging friction events reduces command strain over time.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Sections wrapper */}
            <div className="flex flex-col gap-[1px] bg-panel-bg">
                {/* Command Management — Wave 4: stabilize action + stance constraint notice */}
                {data.strain > 0 && (
                    <CommandManagementSection
                        corpsId={corps.id}
                        commandStrain={data.strain}
                        commandStrainLabel={data.strainLabel}
                        stabilizationAvailable={data.stabilizationAvailable}
                        stabilizationCooldownUntil={data.stabilizationCooldownUntil}
                        stabilizationCostCA={data.stabilizationCostCA}
                        currentTurn={data.currentTurn}
                    />
                )}
                <CommanderSection corps={corps} gameState={gameState} />
                <SectorsSection corpsId={corps.id} sectors={sectors} factionBattles={factionBattles} />
                <OperationsSection corpsId={corps.id} operations={operations} gameState={gameState} commandStrain={data.strain} commandStrainLabel={data.strainLabel} />
                <OrbatSection corpsId={corps.id} brigades={brigades} />
                <CombatRecordSection corpsId={corps.id} corps={corps} />
            </div>
        </div>
    );

    return (
        <FlipCard
            isFlipped={isExpanded}
            className={isExpanded ? 'col-span-full' : ''}
            front={cardFront}
            back={cardBack}
        />
    );
}
