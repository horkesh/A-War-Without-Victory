import type { ReactNode } from 'react';

export const WARROOM_SCENE_WIDTH = 2752;
export const WARROOM_SCENE_HEIGHT = 1536;
export const WARROOM_SCENE_ASPECT = WARROOM_SCENE_WIDTH / WARROOM_SCENE_HEIGHT;

export interface WarroomScenePlateProps {
  src: string;
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
  state = 'current',
  transformOrigin,
  className,
  children,
}: WarroomScenePlateProps) {
  return (
    <div
      className={className}
      data-testid="warroom-scene-plate"
      data-scene-state={state}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: `min(100%, calc(100vh * ${WARROOM_SCENE_ASPECT}))`,
        height: `min(100%, calc(100vw / ${WARROOM_SCENE_ASPECT}))`,
        aspectRatio: `${WARROOM_SCENE_ASPECT}`,
        transform: 'translate(-50%, -50%)',
        transformOrigin,
      }}
    >
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
