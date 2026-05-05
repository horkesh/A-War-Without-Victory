import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { generateWrappedSlides } from './generateWrappedSlides.js';
import { WrappedSlideComponent } from './WrappedSlide.js';
import { getPlayerFacingFaction } from '../../../shared/playerFacingLabels.js';
import { Z } from '../../../shared/zIndex.js';

export function WrappedOverlay() {
    const open = useGameStore(s => s.wrappedOpen);
    const setOpen = useGameStore(s => s.setWrappedOpen);
    const state = useGameStore(s => s.loadedGameState);
    const setChronicleOpen = useGameStore(s => s.setChronicleOpen);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = useMemo(() => (state ? generateWrappedSlides(state) : []), [state]);

    const faction = getPlayerFacingFaction(state);

    const goNext = useCallback(() => {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
    }, [slides.length]);

    const goPrev = useCallback(() => {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
    }, []);

    const handleClose = useCallback(() => {
        setOpen(false);
        setCurrentSlide(0);
    }, [setOpen]);

    const handleViewChronicle = useCallback(() => {
        setOpen(false);
        setCurrentSlide(0);
        setChronicleOpen(true);
    }, [setOpen, setChronicleOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                goNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                goPrev();
            }
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [open, handleClose, goNext, goPrev]);

    // Reset slide index when opening
    useEffect(() => {
        if (open) setCurrentSlide(0);
    }, [open]);

    if (!open || slides.length === 0) return null;

    const isLastSlide = currentSlide === slides.length - 1;

    const handleClick = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const half = rect.width / 2;

        if (x >= half) {
            if (isLastSlide) return; // Don't advance past last slide
            goNext();
        } else {
            goPrev();
        }
    };

    return (
        <div
            className="fixed inset-0 cursor-pointer"
            style={{ zIndex: Z.MODAL_RAISED }}
            onClick={handleClick}
        >
            <WrappedSlideComponent
                slide={slides[currentSlide]}
                index={currentSlide}
                total={slides.length}
                faction={faction ?? undefined}
            />

            {/* "VIEW CHRONICLE" button on final slide */}
            {isLastSlide && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewChronicle();
                        }}
                        className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors cursor-pointer"
                    >
                        View Chronicle
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                        className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded border border-white/20 bg-white/5 text-white/50 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
