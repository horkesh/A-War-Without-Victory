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
                className="relative w-full transition-transform duration-[600ms] ease-in-out"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                {/* Front face */}
                <div style={{ backfaceVisibility: 'hidden' }}>
                    {front}
                </div>
                {/* Back face */}
                <div
                    className="absolute inset-0 overflow-y-auto"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        maxHeight: '600px',
                    }}
                >
                    {back}
                </div>
            </div>
        </div>
    );
}
