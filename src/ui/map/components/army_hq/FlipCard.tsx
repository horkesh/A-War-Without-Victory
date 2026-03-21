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
                className="relative grid transition-transform duration-[600ms] ease-in-out"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', gridArea: '1/1' }}>
                    {front}
                </div>
                <div
                    className="overflow-y-auto"
                    style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        gridArea: '1/1',
                        maxHeight: '70vh',
                    }}
                >
                    {back}
                </div>
            </div>
        </div>
    );
}
