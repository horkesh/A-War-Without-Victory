import { describe, expect, it } from 'vitest';

import { resolveDeckFormationClickTarget } from '../src/ui/map/map/clickSelectionPriority.js';

describe('deck click selection priority', () => {
  it('keeps an exact brigade click on the brigade even when a nearby sector hit exists', () => {
    const result = resolveDeckFormationClickTarget({
      deckObjectProperties: {
        id: 'vrs_herzegovina_brigade',
        location_osid: 'op:foca:donje_zesce',
      },
      nearbyFrontFeature: {
        properties: {
          sector_id: 'sector:vrs_herzegovina:0',
        },
      },
    });

    expect(result).toEqual({
      kind: 'formation',
      formationId: 'vrs_herzegovina_brigade',
    });
  });

  it('falls back to sector selection when no brigade was actually clicked', () => {
    const result = resolveDeckFormationClickTarget({
      deckObjectProperties: null,
      nearbyFrontFeature: {
        properties: {
          sector_id: 'sector:vrs_herzegovina:0',
        },
      },
    });

    expect(result).toEqual({
      kind: 'sector',
      sectorId: 'sector:vrs_herzegovina:0',
    });
  });
});
