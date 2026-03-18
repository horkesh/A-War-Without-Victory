/**
 * WarDispatchPanel — shows war dispatches from outside perspectives.
 * Cosmetic flavor panel: UNHCR, NATO analyst, Bosnian civilian, UN mediator.
 * Props: { dispatches, onClose }
 * COSMETIC ONLY — never affects gameplay.
 */

import type { WarDispatch, DispatchPerspective } from '../../../sim/ai_commander/war_dispatches.js';

export interface WarDispatchPanelProps {
    dispatches: WarDispatch[];
    onClose?: () => void;
}

const PERSPECTIVE_STYLES: Record<DispatchPerspective, { border: string; label: string; labelColor: string }> = {
    humanitarian: {
        border: 'border-l-blue-400',
        label: 'Humanitarian',
        labelColor: 'text-blue-400',
    },
    military: {
        border: 'border-l-red-400',
        label: 'Military',
        labelColor: 'text-red-400',
    },
    civilian: {
        border: 'border-l-green-400',
        label: 'Civilian',
        labelColor: 'text-green-400',
    },
    diplomatic: {
        border: 'border-l-amber-400',
        label: 'Diplomatic',
        labelColor: 'text-amber-400',
    },
};

function DispatchCard({ dispatch }: { dispatch: WarDispatch }) {
    const style = PERSPECTIVE_STYLES[dispatch.perspective] ?? PERSPECTIVE_STYLES.humanitarian;

    return (
        <div
            className={`bg-black/30 rounded px-3 py-2 border border-white/5 border-l-2 ${style.border} space-y-1`}
        >
            {/* Header row: perspective label + source + week */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-mono uppercase tracking-[0.2em] font-bold ${style.labelColor}`}>
                    {style.label}
                </span>
                <span className="text-[10px] font-mono text-[#c4a04a] flex-1 truncate">
                    {dispatch.source}
                </span>
                <span className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.15em] flex-shrink-0">
                    Wk {dispatch.turn}
                </span>
            </div>

            {/* Headline */}
            <p className="text-[11px] font-mono text-[#e8e4dc] font-bold leading-tight">
                {dispatch.headline}
            </p>

            {/* Body */}
            <p className="text-[10px] text-[#b8b4ac] leading-relaxed whitespace-pre-line">
                {dispatch.body}
            </p>
        </div>
    );
}

export function WarDispatchPanel({ dispatches, onClose }: WarDispatchPanelProps) {
    // Show latest first
    const ordered = [...dispatches].reverse();

    return (
        <div className="flex flex-col gap-2">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                    War Dispatches
                </span>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-[9px] font-mono text-[#8a8578] hover:text-[#c4a04a] uppercase tracking-[0.15em] transition-colors"
                        aria-label="Close dispatches"
                    >
                        ✕
                    </button>
                )}
            </div>

            {ordered.length === 0 ? (
                <div className="text-[10px] font-mono text-[#8a8578] uppercase tracking-[0.15em] py-2">
                    No dispatches yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {ordered.map((d, idx) => (
                        <DispatchCard key={`${d.turn}-${d.perspective}-${idx}`} dispatch={d} />
                    ))}
                </div>
            )}
        </div>
    );
}
