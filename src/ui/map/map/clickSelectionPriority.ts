type FrontFeatureLike = { properties?: Record<string, unknown> } | null | undefined;

type ResolveDeckFormationClickTargetArgs = {
  deckObjectProperties: Record<string, unknown> | null | undefined;
  nearbyFrontFeature: FrontFeatureLike;
};

export type DeckFormationClickTarget =
  | { kind: 'formation'; formationId: string }
  | { kind: 'sector'; sectorId: string }
  | { kind: 'none' };

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
