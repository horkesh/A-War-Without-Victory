/**
 * Operation parameters strip — op name, type, tempo, tolerance, artillery prep.
 * NO checkboxes — pill buttons for radio selections, toggle for artillery.
 * Each group in a visually distinct bordered box.
 */
import type { OpType, Tempo, Tolerance, OpsPlanState } from './types';
import { OP_TYPE_LABELS, TEMPO_LABELS, TOLERANCE_LABELS } from './types';

interface PlanParametersProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
}

function pillClass(isActive: boolean): string {
    return isActive
        ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/40 shadow-[0_0_6px_rgba(196,163,90,0.15)]'
        : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]';
}

/** Wrapper for each parameter group — bordered box with header label. */
function ParamGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-md border border-[rgba(180,160,130,0.12)]
                        bg-[rgba(20,18,15,0.4)] px-2.5 py-1.5">
            <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-text-secondary/50">
                {label}
            </span>
            <div className="flex gap-0.5">
                {children}
            </div>
        </div>
    );
}

const OP_TYPES: OpType[] = ['sector_attack', 'general_offensive', 'strategic_defense', 'reorganization', 'feint', 'probe'];
const TEMPOS: Tempo[] = ['methodical', 'standard', 'all_out'];
const TOLERANCES: Tolerance[] = ['decisive_victory', 'victory', 'costly_victory', 'stalemate', 'repulsed'];

export function PlanParameters({ plan, onUpdate }: PlanParametersProps) {
    return (
        <div className="flex items-stretch gap-2 flex-wrap">
            {/* Operation name */}
            <div className="flex flex-col gap-1.5 rounded-md border border-[rgba(180,160,130,0.12)]
                            bg-[rgba(20,18,15,0.4)] px-2.5 py-1.5">
                <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-text-secondary/50">
                    Name
                </span>
                <input
                    type="text"
                    value={plan.opName}
                    onChange={(e) => onUpdate({ opName: e.target.value })}
                    className="bg-[rgba(40,36,30,0.5)] border border-[rgba(180,160,130,0.1)] rounded px-2 py-0.5
                               text-[11px] text-white w-52 focus:border-accent-gold/40 focus:outline-none"
                    style={{ fontFamily: "'Courier New', monospace" }}
                />
            </div>

            {/* Operation type */}
            <ParamGroup label="Type">
                {OP_TYPES.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onUpdate({ opType: t })}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                            ${pillClass(plan.opType === t)}`}
                    >
                        {OP_TYPE_LABELS[t]}
                    </button>
                ))}
            </ParamGroup>

            {/* Tempo */}
            <ParamGroup label="Tempo">
                {TEMPOS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onUpdate({ tempo: t })}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                            ${pillClass(plan.tempo === t)}`}
                    >
                        {TEMPO_LABELS[t]}
                    </button>
                ))}
            </ParamGroup>

            {/* Tolerance */}
            <ParamGroup label="Tolerance">
                {TOLERANCES.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onUpdate({ tolerance: t })}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                            ${pillClass(plan.tolerance === t)}`}
                    >
                        {TOLERANCE_LABELS[t]}
                    </button>
                ))}
            </ParamGroup>

            {/* Artillery prep toggle */}
            <div className="flex flex-col gap-1.5 rounded-md border border-[rgba(180,160,130,0.12)]
                            bg-[rgba(20,18,15,0.4)] px-2.5 py-1.5">
                <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-text-secondary/50">
                    Support
                </span>
                <button
                    type="button"
                    onClick={() => onUpdate({ artilleryPreparation: !plan.artilleryPreparation })}
                    className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                        ${plan.artilleryPreparation
                            ? 'bg-red-500/15 text-red-400 border border-red-400/30 shadow-[0_0_6px_rgba(239,68,68,0.12)]'
                            : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]'
                        }`}
                >
                    {plan.artilleryPreparation ? '◆ ARTY PREP' : '◇ ARTY PREP'}
                </button>
            </div>
        </div>
    );
}
