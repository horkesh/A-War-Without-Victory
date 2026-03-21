/**
 * Army HQ Corps Card — NATO Terminal Aesthetic (Option 1).
 * Displays corps info in a dark, tech-panel style.
 */
import { useMemo } from 'react';
import type { FormationView, CorpsFrontSectorView, OperationView, LoadedGameState } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { formatCorpsDisplayName } from '../../utils/formatters';
import { aggregateEffectiveness } from '../../utils/combatEffectiveness';
import { getFormationCommander } from '../../utils/officerUtils';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { CommanderSection } from './CommanderSection';
import { SectorsSection } from './SectorsSection';
import { OperationsSection } from './OperationsSection';
import { OrbatSection } from './OrbatSection';
import { CombatRecordSection } from './CombatRecordSection';

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

        return { totalPersonnel, avgCohesion, eff, commander, stance, activeOp, corpsBattles };
    }, [corps, brigades, sectors, operations, factionBattles, gameState]);

    const displayName = formatCorpsDisplayName(corps.name, corps.id);
    const isCritical = data.avgCohesion < 40;
    const noCommander = !data.commander;
    const stanceClass = STANCE_COLORS[data.stance] ?? STANCE_COLORS.balanced;
    const gradeColor = data.eff.grade === 'A' ? 'text-[#4af626]' : data.eff.grade === 'B' ? 'text-accent-gold' : data.eff.grade === 'C' ? 'text-amber-500' : 'text-red-500';

    // Compressed: single line when another card is expanded
    if (isCompressed) {
        return (
            <button
                type="button"
                onClick={onToggleExpand}
                className="bg-black/40 border border-[#4af626]/10 overflow-hidden hover:border-[#4af626]/40 transition-colors cursor-pointer group"
            >
                <div className="flex items-center justify-between px-3 py-2 bg-[#12110f]/50">
                    <span className="text-[11px] font-bold text-[#4af626]/80 uppercase tracking-widest font-mono">
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
                    <div className={`h-full ${data.avgCohesion >= 70 ? 'bg-[#4af626]/60' : data.avgCohesion >= 40 ? 'bg-accent-gold/60' : 'bg-red-500/60'}`}
                        style={{ width: `${Math.min(100, data.avgCohesion)}%` }} />
                </div>
            </button>
        );
    }

    // Expanded: full detail with drill-down sections
    if (isExpanded) {
        const handleStanceChange = async (newStance: string) => {
            if (!ipc.isAvailable) return;
            const result = await ipc.stageCorpsStanceOrder(corps.id, newStance);
            if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance.');
        };

        return (
            <div
                className={`col-span-full bg-black/60 border border-[#4af626]/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col
                    ${isCritical ? 'border-l-[4px] border-l-red-600' : noCommander ? 'border-l-[4px] border-l-amber-500' : ''}`}
            >
                {/* Header — clickable to collapse, with stance dropdown */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#12110f]/80 border-b border-[#4af626]/10">
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                    >
                        <div className="text-[18px] font-bold text-[#4af626] uppercase tracking-widest" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                            {displayName}
                        </div>
                        <span className={`text-[14px] font-bold font-mono px-2 py-0.5 border border-[#4af626]/20 bg-[#4af626]/5 ${gradeColor}`}>
                            EF: {data.eff.grade}
                        </span>
                        <span className="text-[#4af626]/40 text-[10px] tracking-widest mt-1">
                            [ CLICK TO COLLAPSE ]
                        </span>
                    </button>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-[12px] tabular-nums font-mono text-[#4af626]/70 uppercase">
                            <span><b className="text-[#4af626]">{data.totalPersonnel.toLocaleString()}</b> Pers</span>
                            <span><b className="text-[#4af626]">{brigades.length}</b> Brg</span>
                            <span><b className="text-[#4af626]">{sectors.length}</b> Sec</span>
                        </div>
                        {/* Stance dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#4af626]/40 uppercase tracking-widest">Stance:</span>
                            <select
                                value={data.stance}
                                onChange={(e) => { void handleStanceChange(e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-bold uppercase bg-black text-[#4af626] border border-[#4af626]/30 rounded px-2 py-1 cursor-pointer focus:outline-none focus:border-[#4af626]"
                            >
                                <option value="offensive">OFFENSIVE</option>
                                <option value="balanced">BALANCED</option>
                                <option value="defensive">DEFENSIVE</option>
                                <option value="reorganize">REORGANIZE</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sections wrapper - using a dark theme for sections */}
                <div className="flex flex-col gap-[1px] bg-[#4af626]/5">
                    <CommanderSection corps={corps} gameState={gameState} />
                    <SectorsSection corpsId={corps.id} sectors={sectors} factionBattles={factionBattles} />
                    <OperationsSection corpsId={corps.id} operations={operations} gameState={gameState} />
                    <OrbatSection corpsId={corps.id} brigades={brigades} />
                    <CombatRecordSection corpsId={corps.id} corps={corps} />
                </div>
            </div>
        );
    }

    // Collapsed (Normal): full card in terminal style
    return (
        <button
            type="button"
            onClick={onToggleExpand}
            className={`bg-black/60 border border-[#4af626]/20 shadow-[0_4px_10px_rgba(0,0,0,0.5)] overflow-hidden hover:border-[#4af626]/50 transition-all cursor-pointer relative flex flex-col
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
        >
            {/* Status Stamp */}
            <div className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 border ${stanceClass} z-10 font-mono shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                {STANCE_LABELS[data.stance] ?? data.stance}
            </div>

            <div className="px-5 py-5 flex-1 flex flex-col text-left">
                {/* Line 1: Corps name */}
                <div className="text-[16px] font-bold text-[#4af626] uppercase tracking-widest leading-tight pr-24" style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                    {displayName}
                </div>

                {/* Line 2: Commander + grade */}
                <div className="text-[12px] text-[#4af626]/60 mt-2 flex items-center gap-3 font-mono">
                    {data.commander ? (
                        <span className="truncate">{data.commander.name}</span>
                    ) : (
                        <span className="italic text-red-500/60">[!] UNASSIGNED</span>
                    )}
                    <div className="w-1 h-3 border-l border-[#4af626]/20" />
                    <span className={`font-bold ${gradeColor}`}>EF: {data.eff.grade}</span>
                </div>

                {/* Line 3: Stats */}
                <div className="flex items-center gap-4 mt-4 text-[12px] tabular-nums font-mono">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-[#4af626]/40 uppercase tracking-tighter">Personnel</span>
                        <span className={`font-bold ${data.totalPersonnel >= 8000 ? 'text-[#4af626]' : data.totalPersonnel >= 4000 ? 'text-accent-gold' : 'text-red-500'
                            }`}>
                            {data.totalPersonnel.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-[#4af626]/40 uppercase tracking-tighter">Orbat</span>
                        <span className="text-[#4af626]/80 font-bold">{brigades.length} BRG</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-[#4af626]/40 uppercase tracking-tighter">Front</span>
                        <span className="text-[#4af626]/80 font-bold">{sectors.length} SEC</span>
                    </div>
                </div>

                {/* Active op indicator */}
                {data.activeOp && (
                    <div className="mt-4 pt-3 border-t border-[#4af626]/10 flex flex-col gap-1">
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
            <div className="h-[4px] bg-black/40 w-full">
                <div className={`h-full transition-all duration-500 ${data.avgCohesion >= 70 ? 'bg-[#4af626]' : data.avgCohesion >= 40 ? 'bg-accent-gold' : 'bg-red-500'
                    } shadow-[0_0_5px_currentColor]`}
                    style={{ width: `${Math.min(100, data.avgCohesion)}%` }} />
            </div>
        </button>
    );
}
