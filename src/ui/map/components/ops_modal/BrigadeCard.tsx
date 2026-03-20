/**
 * Brigade card for the ops planning tray.
 * NO CHECKBOXES — click the card to toggle assignment.
 */
import { memo, useCallback } from 'react';
import type { FormationView } from '../../data/types';

interface BrigadeCardProps {
    brigade: FormationView;
    isAssigned: boolean;
    isAutoProposed: boolean;
    marchTurns: number | null;
    factionColor: string;
    onToggle: (brigadeId: string) => void;
}

function getMarchColor(turns: number | null): string {
    if (turns === null || turns === 99) return 'text-text-secondary/50';
    if (turns <= 1) return 'text-green-400';
    if (turns <= 3) return 'text-amber-400';
    return 'text-red-400';
}

export const BrigadeCard = memo(function BrigadeCard({ brigade, isAssigned, isAutoProposed, marchTurns, factionColor, onToggle }: BrigadeCardProps) {
    const personnel = brigade.personnel ?? 0;
    const isCombatIneffective = personnel < 400;
    const isDisrupted = !!brigade.disrupted_turns;
    const isUnavailable = isCombatIneffective || isDisrupted;
    const tanks = brigade.composition?.tanks ?? 0;
    const arty = brigade.composition?.artillery ?? 0;
    const cohesion = brigade.cohesion ?? 50;
    const fatigue = brigade.fatigue ?? 0;

    return (
        <button
            type="button"
            onClick={isUnavailable ? undefined : () => onToggle(brigade.id)}
            disabled={isUnavailable}
            className={`
                relative w-[160px] min-w-[160px] h-[140px] rounded-md border p-2.5 text-left transition-all
                ${isUnavailable
                    ? 'opacity-30 cursor-not-allowed border-[rgba(180,160,130,0.05)] bg-[rgba(20,18,15,0.4)]'
                    : isAssigned
                        ? 'border-l-[3px] shadow-lg bg-[rgba(40,36,30,0.8)] hover:bg-[rgba(50,46,38,0.9)]'
                        : 'border-[rgba(180,160,130,0.08)] bg-[rgba(30,28,24,0.5)] hover:bg-[rgba(40,36,30,0.7)] hover:border-[rgba(180,160,130,0.2)]'
                }
            `}
            style={isAssigned && !isUnavailable ? { borderLeftColor: factionColor } : undefined}
        >
            {/* Suggested badge */}
            {isAutoProposed && isAssigned && (
                <div className="absolute top-1 right-1 text-[7px] font-bold uppercase tracking-wider
                                px-1 py-0.5 rounded bg-accent-gold/15 text-accent-gold">
                    Suggested
                </div>
            )}

            {/* Unavailable overlay */}
            {isUnavailable && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/60 rotate-[-15deg]">
                        {isCombatIneffective ? 'COMBAT INEFFECTIVE' : 'DISRUPTED'}
                    </span>
                </div>
            )}

            {/* Brigade name */}
            <div className="text-[10px] font-bold text-white truncate" style={{ fontFamily: "'Courier New', monospace" }}>
                {brigade.name}
            </div>

            {/* Personnel */}
            <div className="text-[18px] font-bold text-white mt-1 leading-none">
                {personnel.toLocaleString()}
            </div>

            {/* Equipment */}
            <div className="flex gap-2 mt-1.5 text-[9px] text-text-secondary">
                {tanks > 0 && <span>T: <span className="text-white font-bold">{tanks}</span></span>}
                {arty > 0 && <span>A: <span className="text-white font-bold">{arty}</span></span>}
            </div>

            {/* Cohesion bar */}
            <div className="mt-1.5">
                <div className="h-1 bg-[rgba(180,160,130,0.08)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${Math.min(100, Math.max(0, cohesion))}%`,
                            backgroundColor: cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040',
                        }}
                    />
                </div>
                <div className="flex justify-between text-[7px] text-text-secondary/50 mt-0.5">
                    <span>COH {Math.round(cohesion)}</span>
                    <span>FAT {Math.round(fatigue)}</span>
                </div>
            </div>

            {/* March time */}
            <div className={`text-[10px] font-bold mt-1 ${getMarchColor(marchTurns)}`}>
                {marchTurns === null || marchTurns === 99
                    ? '—'
                    : marchTurns === 0
                        ? 'In position'
                        : `${marchTurns} turn${marchTurns > 1 ? 's' : ''} march`
                }
            </div>
        </button>
    );
});
