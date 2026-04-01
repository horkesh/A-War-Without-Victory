import type { FeatureCollection } from 'geojson';
import type { LoadedGameState } from '../data/types';

export function collectHighlightedFormationIds(args: {
  formationsGeoJson: FeatureCollection | null;
  loadedGameState: LoadedGameState | null;
  selectedFormationId: string | null;
  selectedCorpsId: string | null;
  selectedCorpsFrontSectorId: string | null;
}): string[] {
  const {
    formationsGeoJson,
    loadedGameState,
    selectedFormationId,
    selectedCorpsId,
    selectedCorpsFrontSectorId,
  } = args;

  const highlightedFormationIds = new Set<string>();
  const activeSectorIds = new Set<string>();

  if (selectedCorpsFrontSectorId) activeSectorIds.add(selectedCorpsFrontSectorId);

  if (selectedCorpsId && loadedGameState?.corpsFrontSectors) {
    loadedGameState.corpsFrontSectors
      .filter((sector) => sector.corps_id === selectedCorpsId)
      .forEach((sector) => activeSectorIds.add(sector.sector_id));
  }

  if (selectedFormationId) highlightedFormationIds.add(selectedFormationId);

  if (formationsGeoJson) {
    for (const feature of formationsGeoJson.features) {
      const formationId = feature.properties?.id;
      if (typeof formationId !== 'string') continue;

      if (selectedCorpsId && feature.properties?.corps_id === selectedCorpsId) {
        highlightedFormationIds.add(formationId);
        continue;
      }

      const sectorId = feature.properties?.sector_id;
      if (typeof sectorId === 'string' && activeSectorIds.has(sectorId)) {
        highlightedFormationIds.add(formationId);
      }
    }
  }

  return [...highlightedFormationIds].sort((a, b) => a.localeCompare(b));
}
