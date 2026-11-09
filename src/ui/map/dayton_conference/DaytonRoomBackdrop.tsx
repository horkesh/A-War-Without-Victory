import { useLayoutEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import standardBlocking from './room-blocking.json';
import wideBlocking from './room-blocking-ultrawide.json';
import standardBoard from './art/board-registration-4k.json';
import wideBoard from './art/board-registration-ultrawide.json';
import standardRoom from './art/room-board-4k.webp';
import wideRoom from './art/room-board-ultrawide.webp';
import './room.css';
import './boundary.css';

export const roomObjects = ['folder', 'draft', 'map', 'binder'] as const;
export type DaytonRoomObject = typeof roomObjects[number];

const wideRoomQuery = '(min-aspect-ratio: 11/5)';

interface DaytonRoomBackdropProps {
    labels: Record<DaytonRoomObject, string>;
    onOpen: (id: DaytonRoomObject, event: MouseEvent<HTMLButtonElement>) => void;
    showBounds?: boolean;
    /** Drawn onto the board paper at its registered rectangle (DC A3: the live line). */
    board?: ReactNode;
}

/** The photograph framing and the registered hit areas use the same coordinate space. */
export function DaytonRoomBackdrop({ labels, onOpen, showBounds, board }: DaytonRoomBackdropProps) {
    const [wide, setWide] = useState(() => window.matchMedia?.(wideRoomQuery).matches ?? false);
    useLayoutEffect(() => {
        const media = window.matchMedia?.(wideRoomQuery);
        if (!media) return;
        const update = () => setWide(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    const blocking = wide ? wideBlocking : standardBlocking;
    const paper = (wide ? wideBoard : standardBoard).imagePixels;
    return (
        <div className="dayton-room-window room-window" data-wide={wide}>
            <div className="dayton-room-frame room-frame" data-bounds={showBounds}>
                <img src={wide ? wideRoom : standardRoom} alt="" />
                {board && (
                    <div className="dayton-room-board" data-testid="dayton-room-board" style={{
                        left: paper.x / blocking.width * 100 + '%',
                        top: paper.y / blocking.height * 100 + '%',
                        width: paper.width / blocking.width * 100 + '%',
                        height: paper.height / blocking.height * 100 + '%',
                    }}>{board}</div>
                )}
                {roomObjects.map(id => {
                    const { center, outline } = blocking.hotspots.find(hotspot => hotspot.id === id)!;
                    const xs = outline.map(([x]) => x);
                    const ys = outline.map(([, y]) => y);
                    const left = Math.min(...xs);
                    const top = Math.min(...ys);
                    const width = Math.max(...xs) - left;
                    const height = Math.max(...ys) - top;
                    const polygon = outline.map(([x, y]) => `${(x - left) / width * 100}% ${(y - top) / height * 100}%`);
                    return (
                        <button
                            key={id}
                            type="button"
                            className="dayton-room-hotspot hotspot"
                            data-dayton-hotspot={id}
                            data-testid={`dayton-hotspot-${id}`}
                            onClick={event => onOpen(id, event)}
                            style={{
                                left: left / blocking.width * 100 + '%',
                                top: top / blocking.height * 100 + '%',
                                width: width / blocking.width * 100 + '%',
                                height: height / blocking.height * 100 + '%',
                                clipPath: `polygon(${polygon.join(', ')})`,
                            }}
                        >
                            <svg viewBox={`${left} ${top} ${width} ${height}`} aria-hidden="true">
                                <polygon points={outline.map(point => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
                            </svg>
                            <span style={{ left: (center[0] - left) / width * 100 + '%', top: (center[1] - top) / height * 100 + '%' }}>
                                {labels[id]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
