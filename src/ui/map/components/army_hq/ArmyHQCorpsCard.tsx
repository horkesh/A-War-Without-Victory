/**
 * Army HQ Corps Card — collapsed and compressed states.
 * Collapsed: full card with commander, personnel, cohesion bar, stance stamp, op indicator.
 * Compressed: single-line name + grade when another corps is expanded.
 */
import { useMemo } from 'react';
import type { FormationView, CorpsFrontSectorView, OperationView, LoadedGameState } from '../../data/types';
import type { TurnBattle } from '../../../../state/turn_summary';
import { FACTION_COLORS } from '../../utils/theme';
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
    offensive: 'OFFENSIVE', defensive: 'DEFENSIVE', balanced: 'BALANCED', reorganize: 'REORGANIZE',
};
const STANCE_COLORS: Record<string, string> = {
    offensive: 'text-red-600 border-red-700/50', defensive: 'text-blue-600 border-blue-700/50',
    balanced: 'text-amber-600 border-amber-700/50', reorganize: 'text-neutral-500 border-neutral-500/50',
};

export function ArmyHQCorpsCard({
    corps, brigades, sectors, operations, factionBattles, gameState,
    isExpanded, isCompressed, onToggleExpand,
}: ArmyHQCorpsCardProps) {
    const data = useMemo(() => {
        const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);
        const avgCohesion = brigades.length > 0
            ? brigades.reduce((s, b) => s + (b.cohesion ?? 0), 0) / brigades.length
            : 100;
        const eff = aggregateEffectiveness(brigades);
        const commander = getFormationCommander(corps, gameState);
        const stance = corps.corpsStance ?? 'balanced';
        const activeOp = operations.find((op) => op.phase === 'execution');

        // This-week badges: count battles in this corps' territory
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
    const gradeColor = data.eff.grade === 'A' ? '#4a9a55' : data.eff.grade === 'B' ? '#c4a35a' : data.eff.grade === 'C' ? '#c28040' : '#c24040';

    // Compressed: single line when another card is expanded
    if (isCompressed) {
        return (
            <button
                type="button"
                onClick={onToggleExpand}
                className="rounded-lg shadow-[1px_2px_4px_rgba(0,0,0,0.3)] overflow-hidden hover:shadow-[2px_3px_8px_rgba(0,0,0,0.4)] transition-shadow cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f0e8d8 0%, #e4dcc8 100%)' }}
            >
                <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[12px] font-bold text-[#2a2016] uppercase tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                        {displayName}
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tabular-nums" style={{ fontFamily: 'Courier New, monospace', color: gradeColor }}>
                            {data.eff.grade}
                        </span>
                        <span className="text-[10px] text-[#8a7a60] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                            {data.totalPersonnel.toLocaleString()}
                        </span>
                    </div>
                </div>
                {/* Thin cohesion bar */}
                <div className="h-[2px]" style={{
                    background: `linear-gradient(to right, ${
                        data.avgCohesion >= 70 ? '#4a9a55' : data.avgCohesion >= 40 ? '#c4a35a' : '#c24040'
                    } ${Math.min(100, data.avgCohesion)}%, #d4ccc0 ${Math.min(100, data.avgCohesion)}%)`
                }} />
            </button>
        );
    }

    // Expanded: full detail with drill-down sections
    if (isExpanded) {
        const ipc = useIPC();
        const setLoadError = useGameStore((s) => s.setLoadError);

        const handleStanceChange = async (newStance: string) => {
            if (!ipc.isAvailable) return;
            const result = await ipc.stageCorpsStanceOrder(corps.id, newStance);
            if (!result.ok) setLoadError(result.error ?? 'Failed to stage corps stance.');
        };

        return (
            <div
                className={`rounded-lg shadow-[2px_3px_8px_rgba(0,0,0,0.4)] overflow-hidden col-span-full
                    ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
                style={{ background: 'linear-gradient(135deg, #f0e8d8 0%, #e4dcc8 100%)' }}
            >
                {/* Header — clickable to collapse, with stance dropdown */}
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                        <div className="text-[14px] font-bold text-[#2a2016] uppercase tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                            {displayName}
                        </div>
                        <span className="text-[10px] font-bold" style={{ fontFamily: 'Courier New, monospace', color: gradeColor }}>
                            {data.eff.grade}
                        </span>
                        <span className="text-[10px] text-[#8a7a60]">▼</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[11px] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                            <span className="text-[#6a5a40]">{data.totalPersonnel.toLocaleString()}</span>
                            <span className="text-[#8a7a60]">{brigades.length}b · {sectors.length}s</span>
                        </div>
                        {/* Stance dropdown */}
                        <select
                            value={data.stance}
                            onChange={(e) => { void handleStanceChange(e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold uppercase bg-[#e8dcc4] border border-[#c8b898] rounded px-1.5 py-0.5 text-[#2a2016] cursor-pointer"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            <option value="offensive">Offensive</option>
                            <option value="balanced">Balanced</option>
                            <option value="defensive">Defensive</option>
                            <option value="reorganize">Reorganize</option>
                        </select>
                    </div>
                </div>

                {/* Sections */}
                <CommanderSection corps={corps} gameState={gameState} />
                <SectorsSection corpsId={corps.id} sectors={sectors} factionBattles={factionBattles} />
                <OperationsSection corpsId={corps.id} operations={operations} gameState={gameState} />
                <OrbatSection corpsId={corps.id} brigades={brigades} />
                <CombatRecordSection corpsId={corps.id} corps={corps} />
            </div>
        );
    }

    // Collapsed: full card
    return (
        <button
            type="button"
            onClick={onToggleExpand}
            className={`rounded-lg shadow-[2px_3px_8px_rgba(0,0,0,0.4)] overflow-hidden hover:shadow-[3px_4px_12px_rgba(0,0,0,0.5)] transition-shadow cursor-pointer relative
                ${isCritical ? 'border-l-[3px] border-l-red-600' : noCommander ? 'border-l-[3px] border-l-amber-500' : ''}`}
            style={{ background: 'linear-gradient(135deg, #f0e8d8 0%, #e4dcc8 100%)' }}
        >
            {/* Stamp overlay */}
            <div className={`absolute top-3 right-3 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded border-2 opacity-60 ${stanceClass}`}
                 style={{ transform: 'rotate(-3deg)' }}>
                {STANCE_LABELS[data.stance] ?? data.stance}
            </div>

            <div className="px-4 py-3">
                {/* Line 1: Corps name */}
                <div className="text-[14px] font-bold text-[#2a2016] uppercase tracking-wide pr-20" style={{ fontFamily: 'Georgia, serif' }}>
                    {displayName}
                </div>

                {/* Line 2: Commander + grade */}
                <div className="text-[11px] text-[#6a5a40] mt-1 flex items-center gap-2" style={{ fontFamily: 'Courier New, monospace' }}>
                    {data.commander ? (
                        <span>{data.commander.name}</span>
                    ) : (
                        <span className="italic text-amber-700">No named commander</span>
                    )}
                    <span className="font-bold" style={{ color: gradeColor }}>{data.eff.grade}</span>
                </div>

                {/* Line 3: Stats */}
                <div className="flex items-center gap-3 mt-2 text-[11px] tabular-nums" style={{ fontFamily: 'Courier New, monospace' }}>
                    <span className={`font-bold ${
                        data.totalPersonnel >= 8000 ? 'text-[#4a9a55]' : data.totalPersonnel >= 4000 ? 'text-[#8a7a60]' : 'text-[#c24040]'
                    }`}>
                        {data.totalPersonnel.toLocaleString()}
                    </span>
                    <span className="text-[#8a7a60]">{brigades.length} brg</span>
                    <span className="text-[#8a7a60]">{sectors.length} sec</span>
                </div>

                {/* Active op indicator */}
                {data.activeOp && (
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-red-900/20 text-red-700 font-bold border border-red-800/20 uppercase">
                            {data.activeOp.phase}
                        </span>
                        <span className="text-[#6a5a40] truncate" style={{ fontFamily: 'Courier New, monospace' }}>
                            {data.activeOp.name}
                        </span>
                    </div>
                )}

                {/* This-week badges */}
                {data.corpsBattles.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-900/20 text-red-700 border border-red-800/20">
                            {data.corpsBattles.length} BATTLE{data.corpsBattles.length !== 1 ? 'S' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Cohesion bar */}
            <div className="h-[3px]" style={{
                background: `linear-gradient(to right, ${
                    data.avgCohesion >= 70 ? '#4a9a55' : data.avgCohesion >= 40 ? '#c4a35a' : '#c24040'
                } ${Math.min(100, data.avgCohesion)}%, #d4ccc0 ${Math.min(100, data.avgCohesion)}%)`
            }} />
        </button>
    );
}
