/**
 * OPORD document — formal Operations Order.
 * Dark surface panel with faction army crest, sections in Bosnian/Serbian/Croatian.
 */
import type { OpsPlanState } from './types';
import { FACTION_ARMY_HEADERS } from './types';
import type { PredictionResult } from './usePrediction';
import { buildOpordDisplayModel } from './opordDisplay';
import { getPlayerSafeOperationBalancePresentation } from '../../../../shared/playerSafeOperationBalance';
import { t, type MessageKey } from '../../i18n';

interface OpordDocumentProps {
    plan: OpsPlanState;
    prediction: PredictionResult | null;
    commanderName: string;
    corpsName: string;
    faction: string;
    date: string;
    isStamped: boolean;
    osidDisplayNames: Record<string, string> | null;
}

const OP_TYPE_KEYS: Record<OpsPlanState['opType'], MessageKey> = {
    sector_attack: 'opsPlanning.param.opType.sector_attack',
    general_offensive: 'opsPlanning.param.opType.general_offensive',
    strategic_defense: 'opsPlanning.param.opType.strategic_defense',
    reorganization: 'opsPlanning.param.opType.reorganization',
    feint: 'opsPlanning.param.opType.feint',
    probe: 'opsPlanning.param.opType.probe',
};

const TEMPO_KEYS: Record<OpsPlanState['tempo'], MessageKey> = {
    methodical: 'opsPlanning.param.tempo.methodical',
    standard: 'opsPlanning.param.tempo.standard',
    all_out: 'opsPlanning.param.tempo.all_out',
};

const TOLERANCE_KEYS: Record<OpsPlanState['tolerance'], MessageKey> = {
    decisive_victory: 'opsPlanning.param.tolerance.decisive_victory',
    victory: 'opsPlanning.param.tolerance.victory',
    costly_victory: 'opsPlanning.param.tolerance.costly_victory',
    stalemate: 'opsPlanning.param.tolerance.stalemate',
    repulsed: 'opsPlanning.param.tolerance.repulsed',
};

function pluralWord(count: number, singularKey: MessageKey, pluralKey: MessageKey): string {
    return t(count === 1 ? singularKey : pluralKey);
}

export function OpordDocument({ plan, prediction, commanderName, corpsName, faction, date, isStamped, osidDisplayNames }: OpordDocumentProps) {
    const headers = FACTION_ARMY_HEADERS[faction] ?? FACTION_ARMY_HEADERS.RBiH;
    const allBrigades = plan.axes.flatMap((a) => a.brigadeIds);
    const display = buildOpordDisplayModel(plan, osidDisplayNames);
    const allObjectives = display.objectiveLabels;
    const forceBalance = prediction?.overall.forceRatio == null ? null : getPlayerSafeOperationBalancePresentation(prediction.overall.forceRatio);

    const sectionLabel = 'font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e0c27a]';
    const sectionBody = 'm-0 text-[17px] leading-relaxed text-[#ddd1b3]';

    return (
        <div className="relative flex flex-col gap-5 overflow-hidden rounded-md border border-[#2a303c] bg-[#161a22] px-6 py-6">
            {/* Approval stamp */}
            {isStamped && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="rotate-[-14deg] rounded-md border-4 border-emerald-400/80 bg-[#11141b]/85 px-8 py-3 text-[40px] font-bold uppercase tracking-[0.2em] text-emerald-200
                                    animate-[stamp_0.3s_ease-out]">
                        {t('opsPlanning.opord.approvedStamp')}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col items-center gap-1 text-center">
                <div className="text-[30px] leading-none" aria-hidden="true">{headers.crest}</div>
                <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[#b9ad94]">{headers.republic}</span>
                <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[#b9ad94]">{headers.army}</span>
                <span className="mt-2 text-[19px] font-semibold text-[#f1e6c8]">{corpsName}</span>
                <span className="mt-2 w-full border-y border-[#2a303c] py-2 text-[17px] font-semibold text-[#f1e6c8]">
                    {t('opsPlanning.opord.orderTitle', { date: date.replace(/-/g, '') })}
                </span>
                <span className="font-mono text-[14px] text-[#b9ad94]">{date}</span>
            </div>

            {/* 1. ZADAĆA (Mission) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.mission')}</span>
                <p className={sectionBody}>
                    {t('opsPlanning.opord.missionLine', {
                        opName: plan.opName,
                        opType: t(OP_TYPE_KEYS[plan.opType]),
                        tempo: t(TEMPO_KEYS[plan.tempo]),
                        tolerance: t(TOLERANCE_KEYS[plan.tolerance]),
                    })}
                    {plan.artilleryPreparation ? t('opsPlanning.opord.artilleryAuthorized') : ''}
                </p>
            </div>

            {/* 2. SNAGE (Forces) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.forces')}</span>
                <p className={sectionBody}>
                    {t('opsPlanning.opord.forcesLine', {
                        brigades: allBrigades.length,
                        brigadeWord: pluralWord(allBrigades.length, 'opsPlanning.word.brigade.one', 'opsPlanning.word.brigade.many'),
                        axes: plan.axes.length,
                        axisWord: pluralWord(plan.axes.length, 'opsPlanning.word.axis.one', 'opsPlanning.word.axis.many'),
                    })}
                    {forceBalance && (
                        <>{t('opsPlanning.opord.staffBalance', { summary: forceBalance.summary })}</>
                    )}
                </p>
            </div>

            {/* 3. ZAPOVJEDNIK (Commander) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.commander')}</span>
                <p className={sectionBody}>
                    {t('opsPlanning.opord.commanderLine')} <span className="font-semibold text-[#f1e6c8]">{commanderName}</span>
                </p>
            </div>

            {/* 4. PROVEDBA (Execution) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.execution')}</span>
                <div className="flex flex-col gap-1">
                    {display.axes.map((axis, idx) => (
                        <p key={axis.id} className={sectionBody}>
                            <span className="font-semibold text-[#f1e6c8]">
                                {t('opsPlanning.opord.axisLine', {
                                    index: idx + 1,
                                    name: axis.name,
                                    brigades: axis.brigadeCount,
                                    brigadeWord: pluralWord(axis.brigadeCount, 'opsPlanning.word.brigade.one', 'opsPlanning.word.brigade.many'),
                                    objectives: axis.objectiveCount,
                                    objectiveWord: pluralWord(axis.objectiveCount, 'opsPlanning.word.objective.one', 'opsPlanning.word.objective.many'),
                                })}
                            </span>
                            {axis.stagingLabel && <>{t('opsPlanning.opord.staging', { label: axis.stagingLabel })}</>}
                        </p>
                    ))}
                </div>
            </div>

            {/* 5. CILJEVI (Objectives) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.objectives')}</span>
                <p className={sectionBody}>
                    {t('opsPlanning.opord.objectiveLine', {
                        count: allObjectives.length,
                        objectiveWord: pluralWord(allObjectives.length, 'opsPlanning.word.objective.one', 'opsPlanning.word.objective.many'),
                    })}
                    {display.schwerpunktLabel && (
                        <> {t('opsPlanning.opord.schwerpunkt')} <span className="font-semibold text-[#f1e6c8]">{display.schwerpunktLabel}</span>.</>
                    )}
                </p>
            </div>

            {/* 6. LOGISTIKA (Logistics) */}
            <div className="flex flex-col gap-1.5">
                <span className={sectionLabel}>{t('opsPlanning.opord.section.logistics')}</span>
                <p className={sectionBody}>
                    {prediction && prediction.overall.estimatedCasualties != null
                        ? t('opsPlanning.opord.casualties', { count: prediction.overall.estimatedCasualties.toLocaleString() })
                        : t('opsPlanning.opord.casualtiesPending')
                    }
                </p>
            </div>

            {/* Signature */}
            <div className="flex items-end justify-between gap-4 border-t border-[#262b35] pt-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[15px] text-[#b9ad94]">{t('opsPlanning.opord.signature')}</span>
                    <span className="text-[17px] font-semibold text-[#f1e6c8]">{commanderName}</span>
                </div>
                {isStamped && (
                    <span className="text-[15px] text-[#b9ad94]">
                        {t('opsPlanning.opord.approvalDate', { date })}
                    </span>
                )}
            </div>
        </div>
    );
}
