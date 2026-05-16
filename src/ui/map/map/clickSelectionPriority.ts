type FrontFeatureLike = { properties?: Record<string, unknown> } | null | undefined;

type ScreenPoint = { x: number; y: number };

type ResolveDeckFormationClickTargetArgs = {
  deckObjectProperties: Record<string, unknown> | null | undefined;
  nearbyFrontFeature: FrontFeatureLike;
};

export type DeckFormationClickTarget =
  | { kind: 'formation'; formationId: string }
  | { kind: 'sector'; sectorId: string }
  | { kind: 'none' };

export type FormationClickFallback = {
  id: string;
  properties: Record<string, unknown>;
};

type FormationFeatureLike = {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown> | null;
};

type PickNearestFormationAtPointArgs = {
  formations: readonly FormationFeatureLike[] | null | undefined;
  point: ScreenPoint;
  zoom: number;
  project: (coordinates: [number, number]) => ScreenPoint | null | undefined;
};

function strictCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function getFormationIconScreenSize(zoom: number): { width: number; height: number } {
  let height = 40;
  if (zoom <= 6) height = 16;
  else if (zoom >= 14) height = 40;
  else if (zoom < 9) height = 16 + ((zoom - 6) * (24 - 16)) / 3;
  else if (zoom < 12) height = 24 + ((zoom - 9) * (32 - 24)) / 3;
  else height = 32 + ((zoom - 12) * (40 - 32)) / 2;

  return { width: height * 2, height };
}

export function pickNearestFormationAtPoint(
  args: PickNearestFormationAtPointArgs,
): FormationClickFallback | null {
  const { formations, point, project } = args;
  if (!formations || formations.length === 0) return null;

  const iconSize = getFormationIconScreenSize(args.zoom);
  const halfWidth = iconSize.width / 2;
  const halfHeight = iconSize.height / 2;
  const slackPx = 18;
  const maxDx = halfWidth + slackPx;
  const maxDy = halfHeight + slackPx;

  let best:
    | {
      id: string;
      properties: Record<string, unknown>;
      score: number;
    }
    | null = null;

  for (const feature of formations) {
    if (feature.geometry?.type !== 'Point') continue;
    const coordinates = feature.geometry.coordinates;
    if (
      !Array.isArray(coordinates)
      || typeof coordinates[0] !== 'number'
      || typeof coordinates[1] !== 'number'
    ) {
      continue;
    }

    const properties = feature.properties ?? {};
    const id = typeof properties.id === 'string' ? properties.id : null;
    if (!id) continue;

    const screen = project([coordinates[0], coordinates[1]]);
    if (!screen) continue;

    const dx = Math.abs(point.x - screen.x);
    const dy = Math.abs(point.y - screen.y);
    if (dx > maxDx || dy > maxDy) continue;

    const score = (dx / maxDx) ** 2 + (dy / maxDy) ** 2;
    if (
      !best
      || score < best.score
      || (score === best.score && strictCompare(id, best.id) < 0)
    ) {
      best = { id, properties, score };
    }
  }

  return best ? { id: best.id, properties: best.properties } : null;
}

export function resolveDeckFormationClickTarget(
  args: ResolveDeckFormationClickTargetArgs,
): DeckFormationClickTarget {
  const formationId = typeof args.deckObjectProperties?.id === 'string'
    ? args.deckObjectProperties.id
    : null;
  if (formationId) {
    return { kind: 'formation', formationId };
  }

  const sectorId = typeof args.nearbyFrontFeature?.properties?.sector_id === 'string'
    ? args.nearbyFrontFeature.properties.sector_id
    : null;
  if (sectorId) {
    return { kind: 'sector', sectorId };
  }

  return { kind: 'none' };
}
