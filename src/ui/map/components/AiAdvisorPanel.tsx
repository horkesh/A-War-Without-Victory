/**
 * AiAdvisorPanel — overlay panel showing AI commander advisor response.
 * Displays commander name, situation assessment, and numbered recommendations.
 */
import { GlassPanel } from './GlassPanel';
import { t } from '../i18n';
import { strictCompare } from '../../../state/validateGameState';

interface StaffRecommendation {
    priority: number;
    action: string;
    reasoning: string;
}

export interface AiAdvisorPanelProps {
    response: any;
    loading?: boolean;
    onClose: () => void;
}

export function AiAdvisorPanel({ response, loading, onClose }: AiAdvisorPanelProps) {
    if (loading) {
        return (
            <GlassPanel position="overlay" title={t('advisor.title')} width="520px" onClose={onClose}>
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-2 border-[#c4a04a]/40 border-t-[#c4a04a] rounded-full animate-spin" />
                    <span className="text-xs font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                        {t('advisor.awaitingAssessment')}
                    </span>
                </div>
            </GlassPanel>
        );
    }

    if (!response) return null;

    const commanderName = response.commander_name ?? t('advisor.unknownCommander');
    const assessment = response.assessment ?? t('advisor.noAssessment');
    const recommendations: StaffRecommendation[] = [...(response.recommendations ?? [])].sort((a, b) => (
        a.priority - b.priority
        || strictCompare(a.action, b.action)
        || strictCompare(a.reasoning, b.reasoning)
    ));

    return (
        <GlassPanel position="overlay" title={t('advisor.title')} width="520px" onClose={onClose}>
            <div className="space-y-4">
                {/* Commander identification */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-2 h-2 rounded-full bg-[#c4a04a] shadow-[0_0_6px_rgba(196,160,74,0.5)]" />
                    <span className="text-[12px] font-mono text-[#c4a04a] uppercase tracking-[0.15em] font-bold">
                        {commanderName}
                    </span>
                </div>

                {/* Situation assessment */}
                <div className="bg-black/30 rounded px-3 py-2 border border-white/5">
                    <div className="text-xs font-mono text-[#8a8578] uppercase tracking-[0.2em] mb-1">
                        {t('advisor.assessment')}
                    </div>
                    <p className="text-xs text-[#d4d0c8] leading-relaxed">
                        {assessment}
                    </p>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                            {t('advisor.recommendations')}
                        </div>
                        {recommendations.map((rec) => (
                            <div
                                key={`${rec.priority}:${rec.action}:${rec.reasoning}`}
                                className="flex gap-3 bg-black/20 rounded px-3 py-2 border border-white/5"
                            >
                                <span className="text-[14px] font-mono text-[#c4a04a] font-bold shrink-0 w-5 text-center">
                                    {rec.priority}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-[#d4d0c8] font-medium">
                                        {rec.action}
                                    </span>
                                    <span className="text-xs text-[#8a8578] leading-snug">
                                        {rec.reasoning}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Dismiss button */}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-mono uppercase tracking-[0.15em] bg-black/40 hover:bg-[#c4a04a]/20 text-[#d4d0c8] border border-white/10 rounded transition-all hover:border-[#c4a04a]/40"
                    >
                        {t('advisor.dismiss')}
                    </button>
                </div>
            </div>
        </GlassPanel>
    );
}

export default AiAdvisorPanel;
