/**
 * Operation parameters — op name, type, tempo, tolerance, artillery prep.
 * NO checkboxes — option buttons (aria-pressed) for radio selections, toggle for artillery.
 * Each group: a muted label, a plain description, then its options.
 */
import type { OpType, Tempo, Tolerance, OpsPlanState } from './types';
import { t, type MessageKey } from '../../i18n';
import { SURFACE_LABEL_MUTED } from '../surface/Surface';
import { opsOptionClass } from './opsSurface';

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
const PILL_TITLE_KEYS: Record<string, MessageKey> = {
    sector_attack: 'opsPlanning.param.title.sectorAttack',
    general_offensive: 'opsPlanning.param.title.generalOffensive',
    strategic_defense: 'opsPlanning.param.title.strategicDefense',
    reorganization: 'opsPlanning.param.title.reorganization',
    feint: 'opsPlanning.param.title.feint',
    probe: 'opsPlanning.param.title.probe',
    methodical: 'opsPlanning.param.title.methodical',
    standard: 'opsPlanning.param.title.standard',
    all_out: 'opsPlanning.param.title.allOut',
    decisive_victory: 'opsPlanning.param.title.decisiveVictory',
    victory: 'opsPlanning.param.title.victory',
    costly_victory: 'opsPlanning.param.title.costlyVictory',
    stalemate: 'opsPlanning.param.title.stalemate',
    repulsed: 'opsPlanning.param.title.repulsed',
};

const PILL_LABEL_KEYS: Record<string, MessageKey> = {
    sector_attack: 'opsPlanning.param.label.sectorAttack',
    general_offensive: 'opsPlanning.param.label.generalOffensive',
    strategic_defense: 'opsPlanning.param.label.strategicDefense',
    reorganization: 'opsPlanning.param.label.reorganization',
    feint: 'opsPlanning.param.label.feint',
    probe: 'opsPlanning.param.label.probe',
    methodical: 'opsPlanning.param.label.methodical',
    standard: 'opsPlanning.param.label.standard',
    all_out: 'opsPlanning.param.label.allOut',
    decisive_victory: 'opsPlanning.param.label.decisiveVictory',
    victory: 'opsPlanning.param.label.victory',
    costly_victory: 'opsPlanning.param.label.costlyVictory',
    stalemate: 'opsPlanning.param.label.stalemate',
    repulsed: 'opsPlanning.param.label.repulsed',
};

const OPTION_BUTTON = 'flex min-w-[8.5rem] flex-1 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition';

/** One parameter: label, plain description, then its options. */
function ParamGroup({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
                <span className={SURFACE_LABEL_MUTED}>{label}</span>
                <span className="text-[15px] text-[#c2b69c]">{description}</span>
            </div>
            <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-col gap-5">
            {/* Operation name */}
            <div className="flex flex-col gap-2">
                <label htmlFor="plan-params-op-name" className={SURFACE_LABEL_MUTED}>
                    {t('opsPlanning.param.name')}
                </label>
                <input
                    id="plan-params-op-name"
                    type="text"
                    value={plan.opName}
                    onChange={(e) => onUpdate({ opName: e.target.value })}
                    className="h-11 w-full rounded-md border border-[#3a4150] bg-[#1b2029] px-3 text-[17px] text-[#f1e6c8] focus:border-accent-gold/70 focus:outline-none"
                />
            </div>

            {/* Operation type */}
            <ParamGroup label={t('opsPlanning.param.type')} description={t('opsPlanning.param.typeDescription')}>
                {OP_TYPES.map((opType) => (
                    <button
                        key={opType}
                        type="button"
                        onClick={() => onUpdate({ opType })}
                        aria-pressed={plan.opType === opType}
                        title={t(PILL_TITLE_KEYS[opType])}
                        className={`${OPTION_BUTTON} ${opsOptionClass(plan.opType === opType)}`}
                    >
                        <span className="text-[15px] font-semibold">{t(OP_TYPE_MESSAGE_KEYS[opType])}</span>
                        <span className="text-[14px] text-[#b9ad94]">
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
                        aria-pressed={plan.tempo === tempo}
                        title={t(PILL_TITLE_KEYS[tempo])}
                        className={`${OPTION_BUTTON} ${opsOptionClass(plan.tempo === tempo)}`}
                    >
                        <span className="text-[15px] font-semibold">{t(TEMPO_MESSAGE_KEYS[tempo])}</span>
                        <span className="text-[14px] text-[#b9ad94]">
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
                            aria-pressed={isActive}
                            title={t(PILL_TITLE_KEYS[tolerance])}
                            className={`${OPTION_BUTTON} ${opsOptionClass(isActive, isDanger)}`}
                        >
                            <span className="text-[15px] font-semibold">{t(TOLERANCE_MESSAGE_KEYS[tolerance])}</span>
                            <span className={`text-[14px] ${isDanger ? 'text-red-200' : 'text-[#b9ad94]'}`}>
                                {t(PILL_SUBTITLES[tolerance])}
                            </span>
                        </button>
                    );
                })}
            </ParamGroup>

            {/* Artillery prep toggle */}
            <ParamGroup label={t('opsPlanning.param.support')} description={t('opsPlanning.param.supportDescription')}>
                <button
                    type="button"
                    onClick={() => onUpdate({ artilleryPreparation: !plan.artilleryPreparation })}
                    aria-pressed={plan.artilleryPreparation}
                    title={plan.artilleryPreparation
                        ? t('opsPlanning.param.artyOnTitle')
                        : t('opsPlanning.param.artyOffTitle')}
                    className={`${OPTION_BUTTON} ${opsOptionClass(plan.artilleryPreparation, plan.artilleryPreparation)}`}
                >
                    <span className="text-[15px] font-semibold">
                        {plan.artilleryPreparation ? `◆ ${t('opsPlanning.param.artyOn')}` : `◇ ${t('opsPlanning.param.artyOff')}`}
                    </span>
                    {/* WP1e: Artillery prep info text */}
                    <span className={`text-[14px] ${plan.artilleryPreparation ? 'text-red-200' : 'text-[#b9ad94]'}`}>
                        {plan.artilleryPreparation ? t('opsPlanning.param.artyOnDetail') : t('opsPlanning.param.artyOffDetail')}
                    </span>
                </button>
            </ParamGroup>
        </div>
    );
}
