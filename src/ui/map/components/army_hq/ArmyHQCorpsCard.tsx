/**
 * Army HQ Corps Card — Warroom Panel.
 * Uses FlipCard for front (summary) / back (detail) with 3D flip animation.
 * Compressed mode stays as a single-line mini card when another card is flipped.
 */
import { useMemo } from 'react';
import type { FormationView, CorpsFrontSectorView, OperationView, LoadedGameState } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { formatCorpsDisplayName } from '../../utils/formatters';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getFormationCommander } from '../../utils/officerUtils';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { Icon } from '../icons/Icon';
import { CommanderSection } from './CommanderSection';
import { SectorsSection } from './SectorsSection';
import { OperationsSection } from './OperationsSection';
import { OrbatSection } from './OrbatSection';
import { CombatRecordSection } from './CombatRecordSection';
import { FlipCard } from './FlipCard';

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
}

const COHESION_CRITICAL = 40;
const COHESION_HEALTHY = 70;

const GRADE_COLORS: Record<string, string> = {
    A: 'text-emerald-400', B: 'text-accent-gold', C: 'text-amber-500', D: 'text-red-500', F: 'text-red-600',
};

const STANCE_LABELS: Record<string, string> = {
    offensive: '[OFFENSIVE]', defensive: '[DEFENSIVE]', balanced: '[BALANCED]', reorganize: '[REORGANIZE]',
};
const STANCE_COLORS: Record<string, string> = {
    offensive: 'text-red-500 border-red-500/30 bg-red-500/5',
    defensive: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    balanced: 'text-accent-gold border-accent-gold/30 bg-accent-gold/5',
    reorganize: 'text-neutral-400 border-neutral-400/30 bg-neutral-400/5',
};

export function ArmyHQCorpsCard({
    corps, brigades, sectors, operations, factionBattles, gameState,
    isExpanded, isCompressed, onToggleExpand,
}: ArmyHQCorpsCardProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);

    const data = useMemo(() => {
        const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const avgCohesion = brigades.length > 0
            ? brigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / brigades.length
            : 100;
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

        const equipment = brigades.reduce((acc, b) => {
            const c = b.composition;
            if (!c) return acc;
            acc.tanksOp += c.tank_condition?.operational ?? 0;
            acc.tanksTotal += c.tanks ?? 0;
            acc.artyOp += c.artillery_condition?.operational ?? 0;
            acc.artyTotal += c.artillery ?? 0;
            return acc;
        }, { tanksOp: 0, tanksTotal: 0, artyOp: 0, artyTotal: 0 });

        return { totalPersonnel, avgCohesion, eff, commander, stance, activeOp, corpsBattles, equipment };
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
                className="bg-panel-card border border-panel-border rounded-lg overflow-hidden hover:border-amber-400/40 transition-colors cursor-pointer group"
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

    const handleStanceChange = async (newStance: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stageCorpsStanceOrder(corps.id, newStance);
        if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance.');
    };

    // Front face: summary card (clickable to flip)
    const cardFront = (
        <button
            type="button"
            onClick={onToggleExpand}
            className={`min-h-[280px] w-full bg-panel-card border border-panel-border rounded-lg overflow-hidden hover:border-amber-400/50 transition-all cursor-pointer relative flex flex-col text-left
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Status Stamp */}
            <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 border ${stanceClass} z-10 font-mono`}>
                {STANCE_LABELS[data.stance] ?? data.stance}
            </div>

            <div className="px-5 py-5 flex-1 flex flex-col">
                {/* Line 1: Corps name */}
                <div className="text-[16px] font-bold text-amber-400 uppercase tracking-widest leading-tight pr-24" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                    {displayName}
                </div>

                {/* Line 2: Commander + grade */}
                <div className="text-[12px] text-text-secondary mt-2 flex items-center gap-3 font-mono">
                    {data.commander ? (
                        <span className="truncate">{data.commander.name}</span>
                    ) : (
                        <span className="italic text-red-500/60">[!] UNASSIGNED</span>
                    )}
                    <div className="w-1 h-3 border-l border-panel-border" />
                    <span className={`font-bold ${gradeColor}`}>EF: {data.eff.grade}</span>
                </div>

                {/* Equipment */}
                <div className="flex items-center gap-4 mt-2 text-[12px]">
                    <span className="flex items-center gap-1 cursor-help" title={`Tanks: ${Math.round(data.equipment.tanksOp)} operational / ${Math.round(data.equipment.tanksTotal)} total`}>
                        <Icon name="tanks" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{Math.round(data.equipment.tanksOp)}</span>
                        <span className="text-text-secondary/60">/{Math.round(data.equipment.tanksTotal)}</span>
                    </span>
                    <span className="flex items-center gap-1 cursor-help" title={`Artillery: ${Math.round(data.equipment.artyOp)} operational / ${Math.round(data.equipment.artyTotal)} total`}>
                        <Icon name="artillery" size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-bold tabular-nums">{Math.round(data.equipment.artyOp)}</span>
                        <span className="text-text-secondary/60">/{Math.round(data.equipment.artyTotal)}</span>
                    </span>
                </div>

                {/* Line 3: Stats */}
                <div className="flex items-center gap-4 mt-4 text-[12px] tabular-nums font-mono">
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
                    <div className="mt-4 pt-3 border-t border-panel-border flex flex-col gap-1">
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
                    <div className="mt-3 flex gap-2">
                        <div className="px-2 py-0.5 bg-red-900/40 border border-red-500/40 text-red-400 text-[9px] font-bold tracking-widest animate-pulse">
                            CONTACT: {data.corpsBattles.length} ENGAGEMENTS
                        </div>
                    </div>
                )}
            </div>

            {/* Cohesion bar (Bottom) */}
            <div className="h-[4px] bg-panel-bg w-full">
                <div className={`h-full transition-all duration-500 ${data.avgCohesion >= COHESION_HEALTHY ? 'bg-emerald-400' : data.avgCohesion >= COHESION_CRITICAL ? 'bg-accent-gold' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, data.avgCohesion)}%` }} />
            </div>
        </button>
    );

    // Back face: full detail sections (scrollable)
    const cardBack = (
        <div
            className={`min-h-[280px] bg-panel-card border border-panel-border rounded-lg overflow-hidden flex flex-col
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Header with back button + stance dropdown */}
            <div className="flex items-center justify-between px-6 py-4 bg-panel-card border-b border-panel-border">
                <button
                    type="button"
                    onClick={onToggleExpand}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                >
                    <span className="text-[12px] text-text-secondary font-mono">&larr; Back</span>
                    <div className="text-[18px] font-bold text-amber-400 uppercase tracking-widest" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                        {displayName}
                    </div>
                    <span className={`text-[14px] font-bold font-mono px-2 py-0.5 border border-panel-border bg-panel-bg ${gradeColor}`}>
                        EF: {data.eff.grade}
                    </span>
                </button>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-[12px] tabular-nums font-mono text-text-secondary uppercase">
                        <span><b className="text-text-primary">{data.totalPersonnel.toLocaleString()}</b> Pers</span>
                        <span><b className="text-text-primary">{brigades.length}</b> Brg</span>
                        <span><b className="text-text-primary">{sectors.length}</b> Sec</span>
                    </div>
                    {/* Stance dropdown */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary/60 uppercase tracking-widest">Stance:</span>
                        <select
                            value={data.stance}
                            onChange={(e) => { void handleStanceChange(e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold uppercase bg-panel-bg text-text-primary border border-panel-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-amber-400"
                        >
                            <option value="offensive">OFFENSIVE</option>
                            <option value="balanced">BALANCED</option>
                            <option value="defensive">DEFENSIVE</option>
                            <option value="reorganize">REORGANIZE</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sections wrapper */}
            <div className="flex flex-col gap-[1px] bg-panel-bg">
                <CommanderSection corps={corps} gameState={gameState} />
                <SectorsSection corpsId={corps.id} sectors={sectors} factionBattles={factionBattles} />
                <OperationsSection corpsId={corps.id} operations={operations} gameState={gameState} />
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
