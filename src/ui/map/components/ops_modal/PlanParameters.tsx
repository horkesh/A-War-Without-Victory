/**
 * Operation parameters strip — op name, type, tempo, tolerance, artillery prep.
 * NO checkboxes — pill buttons for radio selections, toggle for artillery.
 * Each group in a visually distinct bordered box.
 */
import type { OpType, Tempo, Tolerance, OpsPlanState } from './types';
import { t, type MessageKey } from '../../i18n';

interface PlanParametersProps {
    plan: OpsPlanState;
    onUpdate: (partial: Partial<OpsPlanState>) => void;
}

// WP1b: Per-pill subtitles
const PILL_SUBTITLES: Record<string, MessageKey> = {
    // OpType
    sector_attack: 'opsPlanning.param.subtitle.sector_attack',
    general_offensive: 'opsPlanning.param.subtitle.general_offensive',
    strategic_defense: 'opsPlanning.param.subtitle.strategic_defense',
    reorganization: 'opsPlanning.param.subtitle.reorganization',
    feint: 'opsPlanning.param.subtitle.feint',
    probe: 'opsPlanning.param.subtitle.probe',
    // Tempo
    methodical: 'opsPlanning.param.subtitle.methodical',
    standard: 'opsPlanning.param.subtitle.standard',
    all_out: 'opsPlanning.param.subtitle.all_out',
    // Tolerance
    decisive_victory: 'opsPlanning.param.subtitle.decisive_victory',
    victory: 'opsPlanning.param.subtitle.victory',
    costly_victory: 'opsPlanning.param.subtitle.costly_victory',
    stalemate: 'opsPlanning.param.subtitle.stalemate',
    repulsed: 'opsPlanning.param.subtitle.repulsed',
};

const OP_TYPE_MESSAGE_KEYS: Record<OpType, MessageKey> = {
    sector_attack: 'opsPlanning.param.opType.sector_attack',
    general_offensive: 'opsPlanning.param.opType.general_offensive',
    strategic_defense: 'opsPlanning.param.opType.strategic_defense',
    reorganization: 'opsPlanning.param.opType.reorganization',
    feint: 'opsPlanning.param.opType.feint',
    probe: 'opsPlanning.param.opType.probe',
};

const TEMPO_MESSAGE_KEYS: Record<Tempo, MessageKey> = {
    methodical: 'opsPlanning.param.tempo.methodical',
    standard: 'opsPlanning.param.tempo.standard',
    all_out: 'opsPlanning.param.tempo.all_out',
};

const TOLERANCE_MESSAGE_KEYS: Record<Tolerance, MessageKey> = {
    decisive_victory: 'opsPlanning.param.tolerance.decisive_victory',
    victory: 'opsPlanning.param.tolerance.victory',
    costly_victory: 'opsPlanning.param.tolerance.costly_victory',
    stalemate: 'opsPlanning.param.tolerance.stalemate',
    repulsed: 'opsPlanning.param.tolerance.repulsed',
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
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-secondary/60">
                    {label}
                </span>
                <span className="text-[9px] text-text-secondary/45 italic">
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
                <label
                    htmlFor="plan-params-op-name"
                    className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-secondary/60"
                >
                    {t('opsPlanning.param.name')}
                </label>
                <input
                    id="plan-params-op-name"
                    type="text"
                    value={plan.opName}
                    onChange={(e) => onUpdate({ opName: e.target.value })}
                    className="bg-[rgba(40,36,30,0.5)] border border-[rgba(180,160,130,0.1)] rounded px-2 py-0.5
                               text-[11px] text-white w-52 focus:border-accent-gold/40 focus:outline-none"
                    style={{ fontFamily: "'Courier New', monospace" }}
                />
            </div>

            {/* Operation type */}
            <ParamGroup label={t('opsPlanning.param.type')} description={t('opsPlanning.param.typeDescription')}>
                {OP_TYPES.map((opType) => (
                    <button
                        key={opType}
                        type="button"
                        onClick={() => onUpdate({ opType })}
                        title={PILL_TITLES[opType]}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                            ${pillClass(plan.opType === opType)}`}
                    >
                        <span>{t(OP_TYPE_MESSAGE_KEYS[opType])}</span>
                        <span className="text-[9px] font-normal normal-case tracking-normal text-text-secondary/55">
                            {t(PILL_SUBTITLES[opType])}
                        </span>
                    </button>
                ))}
            </ParamGroup>

            {/* Tempo */}
            <ParamGroup label={t('opsPlanning.param.tempo')} description={t('opsPlanning.param.tempoDescription')}>
                {TEMPOS.map((tempo) => (
                    <button
                        key={tempo}
                        type="button"
                        onClick={() => onUpdate({ tempo })}
                        title={PILL_TITLES[tempo]}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                            ${pillClass(plan.tempo === tempo)}`}
                    >
                        <span>{t(TEMPO_MESSAGE_KEYS[tempo])}</span>
                        <span className="text-[9px] font-normal normal-case tracking-normal text-text-secondary/55">
                            {t(PILL_SUBTITLES[tempo])}
                        </span>
                    </button>
                ))}
            </ParamGroup>

            {/* Tolerance */}
            <ParamGroup label={t('opsPlanning.param.tolerance')} description={t('opsPlanning.param.toleranceDescription')}>
                {TOLERANCES.map((tolerance) => {
                    const isDanger = tolerance === 'repulsed';
                    const isActive = plan.tolerance === tolerance;
                    return (
                        <button
                            key={tolerance}
                            type="button"
                            onClick={() => onUpdate({ tolerance })}
                            title={PILL_TITLES[tolerance]}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex flex-col items-center
                                ${isDanger ? dangerPillClass(isActive) : pillClass(isActive)}`}
                        >
                            <span>{t(TOLERANCE_MESSAGE_KEYS[tolerance])}</span>
                            <span className={`text-[9px] font-normal normal-case tracking-normal ${
                                isDanger ? 'text-red-400/70' : 'text-text-secondary/50'
                            }`}>
                                {t(PILL_SUBTITLES[tolerance])}
                            </span>
                        </button>
                    );
                })}
            </ParamGroup>

            {/* Artillery prep toggle */}
            <ParamGroup label={t('opsPlanning.param.support')} description={t('opsPlanning.param.supportDescription')}>
                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={() => onUpdate({ artilleryPreparation: !plan.artilleryPreparation })}
                        title={plan.artilleryPreparation
                            ? t('opsPlanning.param.artyOnTitle')
                            : t('opsPlanning.param.artyOffTitle')}
                        className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all
                            ${plan.artilleryPreparation
                                ? 'bg-red-500/15 text-red-400 border border-red-400/30 shadow-[0_0_6px_rgba(239,68,68,0.12)]'
                                : 'bg-transparent text-text-secondary/70 border border-transparent hover:text-text-secondary hover:bg-[rgba(180,160,130,0.06)]'
                            }`}
                    >
                        {plan.artilleryPreparation ? `\u25C6 ${t('opsPlanning.param.artyOn')}` : `\u25C7 ${t('opsPlanning.param.artyOff')}`}
                    </button>
                    {/* WP1e: Artillery prep info text */}
                    <span className={`text-[9px] mt-0.5 ${
                        plan.artilleryPreparation ? 'text-red-400/60' : 'text-text-secondary/40'
                    }`}>
                        {plan.artilleryPreparation ? t('opsPlanning.param.artyOnDetail') : t('opsPlanning.param.artyOffDetail')}
                    </span>
                </div>
            </ParamGroup>
        </div>
    );
}
