/**
 * FlipCard — 3D card-flip container with front/back faces.
 * Keeps inactive faces hidden and unable to intercept pointer events.
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
        <div className={className}>
            <div
                className="relative transition-opacity duration-200 ease-in-out"
            >
                <div
                    className={isFlipped ? 'hidden' : 'relative'}
                    style={{ pointerEvents: isFlipped ? 'none' : 'auto' }}
                    aria-hidden={isFlipped}
                    hidden={isFlipped}
                    tabIndex={isFlipped ? -1 : undefined}
                >
                    {front}
                </div>
                <div
                    className={isFlipped ? 'relative overflow-y-auto' : 'hidden'}
                    style={{
                        pointerEvents: isFlipped ? 'auto' : 'none',
                        maxHeight: '70vh',
                    }}
                    aria-hidden={!isFlipped}
                    hidden={!isFlipped}
                    tabIndex={isFlipped ? undefined : -1}
                >
                    {back}
                </div>
            </div>
        </div>
    );
}
