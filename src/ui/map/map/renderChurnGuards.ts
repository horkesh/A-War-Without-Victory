import type { FeatureCollection } from 'geojson';
import type { LoadedGameState } from '../data/types.js';
import type { OsidCentroidLookup } from './builders/geojsonLookup.js';
import type { GhostMapDatum } from '../layers/buildGhostMapLayer.js';

export interface DeckLayerRenderInputs {
    formationsGeoJson: FeatureCollection | null;
    labelsVisible: boolean;
    formationsVisible: boolean;
    zoom: number;
    loadedGameState: LoadedGameState | null;
    centroidLookup: OsidCentroidLookup;
    ghostMapVisible: boolean;
    ghostMapData?: GhostMapDatum[];
    selectedFormationId: string | null;
    selectedCorpsId: string | null;
    selectedCorpsFrontSectorId: string | null;
    hoveredSectorId: string | null;
    hoveredCorpsId: string | null;
}

export function deckLayerRenderInputsChanged(
    previous: DeckLayerRenderInputs | null,
    next: DeckLayerRenderInputs,
): boolean {
    if (!previous) return true;
    return previous.formationsGeoJson !== next.formationsGeoJson
        || previous.labelsVisible !== next.labelsVisible
        || previous.formationsVisible !== next.formationsVisible
        || previous.zoom !== next.zoom
        || previous.loadedGameState !== next.loadedGameState
        || previous.centroidLookup !== next.centroidLookup
        || previous.ghostMapVisible !== next.ghostMapVisible
        || previous.ghostMapData !== next.ghostMapData
        || previous.selectedFormationId !== next.selectedFormationId
        || previous.selectedCorpsId !== next.selectedCorpsId
        || previous.selectedCorpsFrontSectorId !== next.selectedCorpsFrontSectorId
        || previous.hoveredSectorId !== next.hoveredSectorId
        || previous.hoveredCorpsId !== next.hoveredCorpsId;
}

export function shouldRunPulseAnimation(args: {
    mapReady: boolean;
    stagedOrderCount: number;
    ghostLineActive: boolean;
    battlesVisible: boolean;
    recentCombatEventCount: number;
    currentTurnBattleCount: number;
}): boolean {
    if (!args.mapReady) return false;
    if (args.stagedOrderCount > 0) return true;
    if (args.ghostLineActive) return true;
    if (!args.battlesVisible) return false;
    return args.recentCombatEventCount > 0 || args.currentTurnBattleCount > 0;
}
