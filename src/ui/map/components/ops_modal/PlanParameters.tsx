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

// WP1b: Per-pill subtitles
const PILL_SUBTITLES: Record<string, string> = {
    // OpType
    sector_attack: 'One sector push',
    general_offensive: 'Corps-wide assault',
    strategic_defense: 'Hold and absorb',
    reorganization: 'Rest and refit',
    feint: 'Fake attack, draw reserves',
    probe: 'Recon in force',
    // Tempo
    methodical: 'Slower, fewer losses',
    standard: 'Balanced approach',
    all_out: 'Fast, heavy casualties',
    // Tolerance
    decisive_victory: 'Only if overwhelming (2.0x)',
    victory: 'Only if clear win (1.5x)',
    costly_victory: 'Continue through losses (1.0x)',
    stalemate: 'Continue through draws (0.7x)',
    repulsed: '\u26A0 Attack into defeat (0.5x)',
};

// WP1c: title attributes for each pill
const PILL_TITLES: Record<string, string> = {
    sector_attack: 'Sector Attack \u2014 Commits 3-8 brigades to push on a single sector front. Lowest risk. 4-8 turns typical.',
    general_offensive: 'General Offensive \u2014 Corps-wide multi-axis assault. High risk, high reward. All sectors engaged.',
    strategic_defense: 'Strategic Defense \u2014 Hold current positions and absorb enemy attacks. Minimal offensive action.',
    reorganization: 'Reorganization \u2014 Pull back to rest and refit. No combat operations. Recovers cohesion and fatigue.',
    feint: 'Feint \u2014 Simulated attack to draw enemy reserves away from the real schwerpunkt.',
    probe: 'Probe \u2014 Reconnaissance in force. Tests enemy strength with limited commitment.',
    methodical: 'Methodical \u2014 Deliberate pace with thorough preparation. Lower casualties but slower progress.',
    standard: 'Standard \u2014 Normal operational tempo. Balanced between speed and losses.',
    all_out: 'All-Out \u2014 Maximum speed and aggression. Heavy casualties expected.',
    decisive_victory: 'Decisive Only \u2014 Brigades only attack when force ratio exceeds 2.0x. Very conservative.',
    victory: 'Victory Required \u2014 Brigades attack when force ratio exceeds 1.5x. Conservative.',
    costly_victory: 'Accept Costly \u2014 Brigades continue attacking through costly outcomes (1.0x ratio). Standard tolerance.',
    stalemate: 'Accept Stalemate \u2014 Brigades press even through inconclusive outcomes (0.7x ratio). Aggressive.',
    repulsed: 'REGARDLESS \u2014 Brigades attack even into predicted defeat (0.5x ratio). Expect heavy losses. Last resort only.',
};

function pillClass(isActive: boolean): string {
    return isActive
        ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/40 shadow-[0_0_6px_rgba(196,163,90,0.15)]'
        : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]';
}

// WP1d: REGARDLESS danger pill class
function dangerPillClass(isActive: boolean): string {
    return isActive
        ? 'bg-red-500/15 text-red-400 border border-red-400/30 shadow-[0_0_6px_rgba(239,68,68,0.15)] animate-[dangerPulse_2s_ease-in-out_infinite]'
        : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]';
}

/** Wrapper for each parameter group — bordered box with header label + description. */
function ParamGroup({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-md border border-[rgba(180,160,130,0.12)]
                        bg-[rgba(20,18,15,0.4)] px-2.5 py-1.5">
            <div className="flex items-baseline gap-2">
                <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-text-secondary/50">
                    {label}
                </span>
                <span className="text-[7px] text-text-secondary/30 italic">
                    {description}
                </span>
            </div>
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
            {/* WP1d: CSS keyframe for REGARDLESS pulse */}
            <style>{`
                @keyframes dangerPulse {
                    0%, 100% { box-shadow: 0 0 4px rgba(239,68,68,0.1); }
                    50% { box-shadow: 0 0 12px rgba(239,68,68,0.3); }
                }
            `}</style>

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
            <ParamGroup label="Type" description="What kind of operation?">
                {OP_TYPES.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onUpdate({ opType: t })}
                        title={PILL_TITLES[t]}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                            ${pillClass(plan.opType === t)}`}
                    >
                        <span>{OP_TYPE_LABELS[t]}</span>
                        <span className="text-[7px] font-normal normal-case tracking-normal text-text-secondary/50">
                            {PILL_SUBTITLES[t]}
                        </span>
                    </button>
                ))}
            </ParamGroup>

            {/* Tempo */}
            <ParamGroup label="Tempo" description="Speed vs. casualties tradeoff">
                {TEMPOS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onUpdate({ tempo: t })}
                        title={PILL_TITLES[t]}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                            ${pillClass(plan.tempo === t)}`}
                    >
                        <span>{TEMPO_LABELS[t]}</span>
                        <span className="text-[7px] font-normal normal-case tracking-normal text-text-secondary/50">
                            {PILL_SUBTITLES[t]}
                        </span>
                    </button>
                ))}
            </ParamGroup>

            {/* Tolerance */}
            <ParamGroup label="Tolerance" description="When do brigades stop attacking?">
                {TOLERANCES.map((t) => {
                    const isDanger = t === 'repulsed';
                    const isActive = plan.tolerance === t;
                    return (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onUpdate({ tolerance: t })}
                            title={PILL_TITLES[t]}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                                ${isDanger ? dangerPillClass(isActive) : pillClass(isActive)}`}
                        >
                            <span>{TOLERANCE_LABELS[t]}</span>
                            <span className={`text-[7px] font-normal normal-case tracking-normal ${
                                isDanger ? 'text-red-400/70' : 'text-text-secondary/50'
                            }`}>
                                {PILL_SUBTITLES[t]}
                            </span>
                        </button>
                    );
                })}
            </ParamGroup>

            {/* Artillery prep toggle */}
            <ParamGroup label="Support" description="Pre-assault fire support">
                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={() => onUpdate({ artilleryPreparation: !plan.artilleryPreparation })}
                        title={plan.artilleryPreparation
                            ? 'Artillery Preparation ON \u2014 Bombardment before assault. ~200 rounds expended, +15% attack power.'
                            : 'Artillery Preparation OFF \u2014 No pre-assault bombardment. Saves ammunition but no fire support bonus.'}
                        className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                            ${plan.artilleryPreparation
                                ? 'bg-red-500/15 text-red-400 border border-red-400/30 shadow-[0_0_6px_rgba(239,68,68,0.12)]'
                                : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]'
                            }`}
                    >
                        {plan.artilleryPreparation ? '\u25C6 ARTY PREP' : '\u25C7 ARTY PREP'}
                    </button>
                    {/* WP1e: Artillery prep info text */}
                    <span className={`text-[7px] mt-0.5 ${
                        plan.artilleryPreparation ? 'text-red-400/60' : 'text-text-secondary/40'
                    }`}>
                        {plan.artilleryPreparation ? '~200 rounds \u00B7 +15% attack' : 'No bombardment'}
                    </span>
                </div>
            </ParamGroup>
        </div>
    );
}
