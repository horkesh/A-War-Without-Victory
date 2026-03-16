/**
 * AiAdvisorPanel — overlay panel showing AI commander advisor response.
 * Displays commander name, situation assessment, and numbered recommendations.
 */
import { GlassPanel } from './GlassPanel';

export interface AiAdvisorPanelProps {
    response: any;
    loading?: boolean;
    onClose: () => void;
}

export function AiAdvisorPanel({ response, loading, onClose }: AiAdvisorPanelProps) {
    if (loading) {
        return (
            <GlassPanel position="overlay" title="AI Advisor" width="520px" onClose={onClose}>
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-8 h-8 border-2 border-[#c4a04a]/40 border-t-[#c4a04a] rounded-full animate-spin" />
                    <span className="text-[11px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                        Awaiting commander assessment...
                    </span>
                </div>
            </GlassPanel>
        );
    }

    if (!response) return null;

    const commanderName = response.commander_name ?? 'Unknown Commander';
    const assessment = response.assessment ?? 'No assessment available.';
    const recommendations: Array<{ priority: number; action: string; reasoning: string }> =
        response.recommendations ?? [];

    return (
        <GlassPanel position="overlay" title="AI Advisor" width="520px" onClose={onClose}>
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
                    <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em] mb-1">
                        Assessment
                    </div>
                    <p className="text-[11px] text-[#d4d0c8] leading-relaxed">
                        {assessment}
                    </p>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                            Recommendations
                        </div>
                        {recommendations.map((rec, i) => (
                            <div
                                key={i}
                                className="flex gap-3 bg-black/20 rounded px-3 py-2 border border-white/5"
                            >
                                <span className="text-[14px] font-mono text-[#c4a04a] font-bold shrink-0 w-5 text-center">
                                    {rec.priority}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-[#d4d0c8] font-medium">
                                        {rec.action}
                                    </span>
                                    <span className="text-[10px] text-[#8a8578] leading-snug">
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
                        className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] bg-black/40 hover:bg-[#c4a04a]/20 text-[#d4d0c8] border border-white/10 rounded transition-all hover:border-[#c4a04a]/40"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </GlassPanel>
    );
}

export default AiAdvisorPanel;
