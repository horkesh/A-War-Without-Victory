/**
 * Tutorial overlay — floating instruction panel showing current objective.
 * Renders bottom-center above BottomStatusStrip when tutorial is active.
 */
import type { TutorialObjective } from '../../../sim/tutorial/tutorial_objectives';

interface TutorialOverlayProps {
    objective: TutorialObjective;
    progress: number;
    total: number;
    onSkip: () => void;
}

export function TutorialOverlay({ objective, progress, total, onSkip }: TutorialOverlayProps) {
    return (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[7000] w-[90%] max-w-[420px]">
            <div className="rounded-lg border-2 border-[#c4a35a]/40 shadow-2xl p-4"
                 style={{
                     background: 'rgba(26, 24, 21, 0.95)',
                     backdropFilter: 'blur(8px)',
                 }}>
                {/* Progress */}
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold">
                        Tutorial — Objective {progress}/{total}
                    </div>
                    <button type="button" onClick={onSkip}
                        className="text-[9px] uppercase tracking-wider text-[#8a7a60] hover:text-[#c4a35a] transition-colors"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        Skip Tutorial
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[#2a2720] rounded overflow-hidden mb-3">
                    <div className="h-full bg-[#c4a35a] rounded transition-all duration-500"
                         style={{ width: `${(progress / total) * 100}%` }} />
                </div>

                {/* Objective */}
                <div className="text-[14px] font-bold text-[#d5c9bc] mb-1"
                     style={{ fontFamily: 'Georgia, serif' }}>
                    {objective.title}
                </div>
                <div className="text-[12px] text-[#8a7a60] leading-relaxed">
                    {objective.description}
                </div>
            </div>
        </div>
    );
}
