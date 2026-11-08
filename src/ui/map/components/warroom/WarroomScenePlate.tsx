import type { ReactNode } from 'react';
import './warroom-scene-plate.css';

export const WARROOM_SCENE_WIDTH = 2752;
export const WARROOM_SCENE_HEIGHT = 1536;
export const WARROOM_SCENE_ASPECT = WARROOM_SCENE_WIDTH / WARROOM_SCENE_HEIGHT;

export interface WarroomScenePlateProps {
  src: string;
  wideSrc?: string;
  softenRightJoin?: boolean;
  state?: 'current' | 'incoming';
  transformOrigin?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Passive, aspect-fit Warroom image substrate shared by previews and play.
 * Faction selection, dates, interaction, and transition timing belong to callers.
 */
export function WarroomScenePlate({
  src,
  wideSrc,
  softenRightJoin,
  state = 'current',
  transformOrigin,
  className,
  children,
}: WarroomScenePlateProps) {
  // The live scene sits inside a scaled layer. Fit in its logical viewport so
  // interface scaling changes the chrome without reframing the artwork.
  const viewportWidth = wideSrc ? 'var(--interface-viewport-width, 100vw)' : '100vw';
  const viewportHeight = wideSrc ? 'var(--interface-viewport-height, 100vh)' : '100vh';
  return (
    <div
      className={className}
      data-testid="warroom-scene-plate"
      data-scene-state={state}
      data-soften-right-join={wideSrc && softenRightJoin ? true : undefined}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `min(100%, calc(${viewportHeight} * ${WARROOM_SCENE_ASPECT}))`,
        height: `min(100%, calc(${viewportWidth} / ${WARROOM_SCENE_ASPECT}))`,
        aspectRatio: `${WARROOM_SCENE_ASPECT}`,
        transform: 'translate(-50%, -50%)',
        transformOrigin,
      }}
    >
      {wideSrc && (['left', 'right'] as const).map(side => (
        <span
          key={side}
          className={`warroom-scene-wing warroom-scene-wing--${side}`}
          data-testid="warroom-scene-wing"
          aria-hidden="true"
          style={{ backgroundImage: `url("${wideSrc}")` }}
        />
      ))}
      <img
        src={src}
        alt=""
        role="presentation"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      {children}
    </div>
  );
}
