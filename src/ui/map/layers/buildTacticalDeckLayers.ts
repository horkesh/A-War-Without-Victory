/**
 * Deck.gl formation stack — only used when `DeckLayerCapabilities.deckFormationCounters` is true
 * (see `composeTacticalDeckLayers`). Renders clean NATO counter icons only.
 */
import { IconLayer } from '@deck.gl/layers';
import type { FeatureCollection, Feature } from 'geojson';
import { getIconDataUrl } from '../map/formationIcons';

/** Extract top-of-stack features for rendering. */
function getTopStack(features: Feature[]): Feature[] {
    return features.filter(f => f.properties?.is_stack_top);
}

export function buildTacticalDeckLayers(
    formationsGeoJson: FeatureCollection,
    _labelsVisible: boolean,
    formationsVisible: boolean,
    zoom: number
) {
    if (!formationsVisible) return [];

    let iconHeight = 40;
    if (zoom <= 6) iconHeight = 16;
    else if (zoom >= 14) iconHeight = 40;
    else {
        if (zoom < 9) iconHeight = 16 + (zoom - 6) * (24 - 16) / 3;
        else if (zoom < 12) iconHeight = 24 + (zoom - 9) * (32 - 24) / 3;
        else iconHeight = 32 + (zoom - 12) * (40 - 32) / 2;
    }

    const topStack = getTopStack(formationsGeoJson.features);

    return [
        new IconLayer({
            id: 'deck-formations-icons',
            data: topStack,
            getIcon: (d: any) => ({
                url: getIconDataUrl(d.properties.icon_id),
                width: 160,
                height: 80,
            }),
            getPosition: (d: any) => d.geometry.coordinates,
            getSize: iconHeight,
            sizeUnits: 'pixels',
            sizeScale: 1,
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 80],
            parameters: { depthTest: false },
            updateTriggers: { getSize: zoom }
        }),
    ];
}
