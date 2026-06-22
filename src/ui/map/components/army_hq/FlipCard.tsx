/**
 * FlipCard — 3D card-flip container with front/back faces.
 * Uses CSS perspective + rotateY for a smooth flip animation.
 */
import type { ReactNode } from 'react';

interface FlipCardProps {
    isFlipped: boolean;
    front: ReactNode;
    back: ReactNode;
    className?: string;
}

export function FlipCard({ isFlipped, front, back, className }: FlipCardProps) {
    return (
        <div className={className} style={{ perspective: '1200px' }}>
            <div
                className="relative transition-transform duration-[600ms] ease-in-out"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                <div
                    className={isFlipped ? 'hidden' : 'relative'}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    aria-hidden={isFlipped}
                >
                    {front}
                </div>
                <div
                    className={isFlipped ? 'relative overflow-y-auto' : 'hidden'}
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        maxHeight: '70vh',
                    }}
                    aria-hidden={!isFlipped}
                >
                    {back}
                </div>
            </div>
        </div>
    );
}
