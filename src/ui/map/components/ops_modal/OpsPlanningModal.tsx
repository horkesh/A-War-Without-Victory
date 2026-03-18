import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPhase } from './types';
import { PHASE_ORDER, PHASE_LABELS } from './types';
import { CommanderPhase } from './CommanderPhase';

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const corpsId = useGameStore((s) => s.opsPlanningCorpsId);
    const clearContext = useGameStore((s) => s.clearOpsPlanningContext);

    const [phase, setPhase] = useState<OpsPhase>('commander');
    const [highestPhase, setHighestPhase] = useState(0);

    // Track highest reached phase for backtracking
    useEffect(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        setHighestPhase((prev) => Math.max(prev, idx));
    }, [phase]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPhase('commander');
            setHighestPhase(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { clearContext(); return; }
            const currentIdx = PHASE_ORDER.indexOf(phase);
            if (e.key === 'ArrowRight' && currentIdx < highestPhase) {
                setPhase(PHASE_ORDER[currentIdx + 1]);
            }
            if (e.key === 'ArrowLeft' && currentIdx > 0) {
                setPhase(PHASE_ORDER[currentIdx - 1]);
            }
            // Number keys for direct phase jump (backtracking only)
            const num = parseInt(e.key);
            if (num >= 1 && num <= 4 && num - 1 <= highestPhase) {
                setPhase(PHASE_ORDER[num - 1]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, phase, highestPhase, clearContext]);

    const advancePhase = useCallback(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        if (idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1]);
    }, [phase]);

    const goToPhase = useCallback((target: OpsPhase) => {
        const targetIdx = PHASE_ORDER.indexOf(target);
        if (targetIdx <= highestPhase) setPhase(target);
    }, [highestPhase]);

    if (!isOpen || !corpsId) return null;

    const currentIdx = PHASE_ORDER.indexOf(phase);

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60">
            {/* Full-bleed map background — populated by OpsMap in Task 5 */}
            <div className="absolute inset-0" />

            {/* Phase indicator — top center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                            bg-[rgba(20,18,15,0.88)] backdrop-blur-xl rounded-full px-4 py-2
                            border border-[rgba(180,160,130,0.15)]">
                {PHASE_ORDER.map((p, i) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => goToPhase(p)}
                        disabled={i > highestPhase}
                        className="flex items-center gap-2 group"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === currentIdx
                                ? 'bg-accent-gold shadow-[0_0_8px_rgba(196,163,90,0.5)]'
                                : i <= highestPhase
                                    ? 'bg-accent-gold/40 group-hover:bg-accent-gold/70'
                                    : 'bg-[rgba(180,160,130,0.15)]'
                        }`} />
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${
                            i === currentIdx ? 'text-accent-gold' : i <= highestPhase ? 'text-text-secondary' : 'text-text-secondary/30'
                        }`}>
                            {PHASE_LABELS[p]}
                        </span>
                        {i < PHASE_ORDER.length - 1 && (
                            <div className={`w-6 h-px ${i < currentIdx ? 'bg-accent-gold/40' : 'bg-[rgba(180,160,130,0.1)]'}`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Phase content */}
            {phase === 'commander' && <CommanderPhase onAdvance={advancePhase} />}
            {phase === 'plan' && <div />}
            {phase === 'g2_assessment' && <div />}
            {phase === 'authorize' && <div />}

            {/* Close button — top right */}
            <button
                type="button"
                onClick={clearContext}
                className="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center
                           text-text-secondary hover:text-white rounded-full
                           bg-[rgba(20,18,15,0.6)] hover:bg-[rgba(20,18,15,0.9)]
                           backdrop-blur-sm transition-colors border border-[rgba(180,160,130,0.1)]"
            >
                &#10005;
            </button>
        </div>
    );
}
