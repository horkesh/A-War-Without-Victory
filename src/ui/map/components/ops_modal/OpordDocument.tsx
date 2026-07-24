/**
 * OPORD document — formal Operations Order.
 * Cream paper style with faction army crest, sections in Bosnian/Serbian/Croatian.
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

    return (
        <div className="relative bg-[#f0e8d8] rounded-lg border border-[#c0b090] p-8 max-w-[600px] mx-auto shadow-2xl"
             style={{
                 fontFamily: "'Courier New', monospace",
                 backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23c0b09020\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             }}>
            {/* Stamp overlay */}
            {isStamped && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-[#2d6a4f] text-5xl font-bold uppercase tracking-[0.2em] rotate-[-20deg]
                                    border-4 border-[#2d6a4f] px-8 py-3 rounded-md opacity-60
                                    animate-[stamp_0.3s_ease-out]"
                         style={{ textShadow: '0 0 4px rgba(45,106,79,0.3)' }}>
                        {t('opsPlanning.opord.approvedStamp')}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-6 space-y-1">
                <div className="text-3xl mb-2">{headers.crest}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.republic}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.army}</div>
                <div className="text-xs font-bold text-[#3a3228] mt-3">{corpsName}</div>
                <div className="text-[12px] font-bold text-[#3a3228] mt-2 border-b border-t border-[#c0b090] py-2">
                    {t('opsPlanning.opord.orderTitle', { date: date.replace(/-/g, '') })}
                </div>
                <div className="text-xs text-[#6a5e4e]">{date}</div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
                {/* 1. ZADAĆA (Mission) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.mission')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {t('opsPlanning.opord.missionLine', {
                            opName: plan.opName,
                            opType: t(OP_TYPE_KEYS[plan.opType]),
                            tempo: t(TEMPO_KEYS[plan.tempo]),
                            tolerance: t(TOLERANCE_KEYS[plan.tolerance]),
                        })}
                        {plan.artilleryPreparation ? t('opsPlanning.opord.artilleryAuthorized') : ''}
                    </div>
                </div>

                {/* 2. SNAGE (Forces) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.forces')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {t('opsPlanning.opord.forcesLine', {
                            brigades: allBrigades.length,
                            brigadeWord: pluralWord(allBrigades.length, 'opsPlanning.word.brigade.one', 'opsPlanning.word.brigade.many'),
                            axes: plan.axes.length,
                            axisWord: pluralWord(plan.axes.length, 'opsPlanning.word.axis.one', 'opsPlanning.word.axis.many'),
                        })}
                        {forceBalance && (
                            <>{t('opsPlanning.opord.staffBalance', { summary: forceBalance.summary })}</>
                        )}
                    </div>
                </div>

                {/* 3. ZAPOVJEDNIK (Commander) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.commander')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {t('opsPlanning.opord.commanderLine')} <span className="font-bold">{commanderName}</span>
                    </div>
                </div>

                {/* 4. PROVEDBA (Execution) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.execution')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {display.axes.map((axis, idx) => (
                            <div key={axis.id} className="mb-1">
                                <span className="font-bold">
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. CILJEVI (Objectives) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.objectives')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {t('opsPlanning.opord.objectiveLine', {
                            count: allObjectives.length,
                            objectiveWord: pluralWord(allObjectives.length, 'opsPlanning.word.objective.one', 'opsPlanning.word.objective.many'),
                        })}
                        {display.schwerpunktLabel && (
                            <> {t('opsPlanning.opord.schwerpunkt')} <span className="font-bold">{display.schwerpunktLabel}</span>.</>
                        )}
                    </div>
                </div>

                {/* 6. LOGISTIKA (Logistics) */}
                <div>
                    <div className="text-xs font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        {t('opsPlanning.opord.section.logistics')}
                    </div>
                    <div className="text-xs text-[#4a4238] leading-relaxed">
                        {prediction && prediction.overall.estimatedCasualties != null
                            ? t('opsPlanning.opord.casualties', { count: prediction.overall.estimatedCasualties.toLocaleString() })
                            : t('opsPlanning.opord.casualtiesPending')
                        }
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="border-t border-[#c0b090] mt-6 pt-4 flex justify-between items-end">
                <div>
                    <div className="text-xs text-[#6a5e4e]">{t('opsPlanning.opord.signature')}</div>
                    <div className="text-xs font-bold text-[#3a3228] mt-1">{commanderName}</div>
                </div>
                {isStamped && (
                    <div className="text-xs text-[#6a5e4e]">
                        {t('opsPlanning.opord.approvalDate', { date })}
                    </div>
                )}
            </div>
        </div>
    );
}
