import type { PlayerFacingFaction } from '../../../shared/playerFacingLabels';
import {
  WARROOM_SCENE_HEIGHT,
  WARROOM_SCENE_WIDTH,
} from '../warroom/WarroomScenePlate';
import { WARROOM_1992_SCENE_URLS } from '../warroom/warroom-asset-urls';

interface WarroomMapAnchorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OpeningWarroomScene {
  id: PlayerFacingFaction;
  src: string;
  transformOrigin: string;
}

export const WARROOM_MAP_ANCHOR_BOUNDS = {
  RBiH: { x: 854, y: 576, width: 602, height: 325 },
  RS: { x: 925, y: 502, width: 518, height: 315 },
  HRHB: { x: 1115, y: 534, width: 460, height: 267 },
} satisfies Record<PlayerFacingFaction, WarroomMapAnchorBounds>;

function transformOriginFromBounds(bounds: WarroomMapAnchorBounds): string {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return `${(centerX / WARROOM_SCENE_WIDTH) * 100}% ${(centerY / WARROOM_SCENE_HEIGHT) * 100}%`;
}

export const OPENING_WARROOM_SCENES = {
  RBiH: {
    id: 'RBiH',
    src: WARROOM_1992_SCENE_URLS.RBiH,
    transformOrigin: transformOriginFromBounds(WARROOM_MAP_ANCHOR_BOUNDS.RBiH),
  },
  RS: {
    id: 'RS',
    src: WARROOM_1992_SCENE_URLS.RS,
    transformOrigin: transformOriginFromBounds(WARROOM_MAP_ANCHOR_BOUNDS.RS),
  },
  HRHB: {
    id: 'HRHB',
    src: WARROOM_1992_SCENE_URLS.HRHB,
    transformOrigin: transformOriginFromBounds(WARROOM_MAP_ANCHOR_BOUNDS.HRHB),
  },
} satisfies Record<PlayerFacingFaction, OpeningWarroomScene>;
