/**
 * Operation parameters strip — op name, type, tempo, tolerance, artillery prep.
 * NO checkboxes — pill buttons for radio selections, toggle for artillery.
 */
import type { OpType, Tempo, Tolerance, OpsPlanState } from './types';
import { OP_TYPE_LABELS, TEMPO_LABELS, TOLERANCE_LABELS } from './types';

interface PlanParametersProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
}

function pillClass(isActive: boolean): string {
    return isActive
        ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
        : 'bg-[rgba(40,36,30,0.4)] text-text-secondary border border-transparent hover:bg-[rgba(60,54,44,0.5)]';
}

const OP_TYPES: OpType[] = ['sector_attack', 'general_offensive', 'feint', 'probe'];
const TEMPOS: Tempo[] = ['methodical', 'standard', 'all_out'];
const TOLERANCES: Tolerance[] = ['decisive_victory', 'victory', 'costly_victory', 'stalemate', 'repulsed'];

export function PlanParameters({ plan, onUpdate }: PlanParametersProps) {
    return (
        <div className="flex items-center gap-4 flex-wrap">
            {/* Operation name */}
            <div className="flex items-center gap-2">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">Name</label>
                <input
                    type="text"
                    value={plan.opName}
                    onChange={(e) => onUpdate({ opName: e.target.value })}
                    className="bg-[rgba(40,36,30,0.6)] border border-[rgba(180,160,130,0.12)] rounded px-2 py-1
                               text-[11px] text-white w-48 focus:border-accent-gold/40 focus:outline-none"
                    style={{ fontFamily: "'Courier New', monospace" }}
                />
            </div>

            {/* Operation type */}
            <div className="flex items-center gap-1.5">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">Type</label>
                <div className="flex gap-0.5">
                    {OP_TYPES.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onUpdate({ opType: t })}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${pillClass(plan.opType === t)}`}
                        >
                            {OP_TYPE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tempo */}
            <div className="flex items-center gap-1.5">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">Tempo</label>
                <div className="flex gap-0.5">
                    {TEMPOS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onUpdate({ tempo: t })}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${pillClass(plan.tempo === t)}`}
                        >
                            {TEMPO_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tolerance */}
            <div className="flex items-center gap-1.5">
                <label className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">Tolerance</label>
                <div className="flex gap-0.5">
                    {TOLERANCES.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onUpdate({ tolerance: t })}
                            className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition-colors
                                ${pillClass(plan.tolerance === t)}`}
                        >
                            {TOLERANCE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Artillery prep toggle */}
            <button
                type="button"
                onClick={() => onUpdate({ artilleryPreparation: !plan.artilleryPreparation })}
                className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                    ${plan.artilleryPreparation
                        ? 'bg-red-400/20 text-red-400 border border-red-400/30'
                        : 'bg-[rgba(40,36,30,0.4)] text-text-secondary border border-transparent hover:bg-[rgba(60,54,44,0.5)]'
                    }`}
            >
                {plan.artilleryPreparation ? 'ARTY PREP ON' : 'ARTY PREP OFF'}
            </button>
        </div>
    );
}
