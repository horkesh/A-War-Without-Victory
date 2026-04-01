/**
 * Deck.gl formation stack + settlement labels.
 * Formation counters: only when `DeckLayerCapabilities.deckFormationCounters` is true.
 * Settlement labels: always rendered via Deck.gl TextLayer (MapLibre symbol rendering
 * is broken — "Unimplemented type: 4" errors from OSM PMTiles poison the symbol pipeline,
 * causing ALL symbol layers to render 0 features).
 */
import { IconLayer, TextLayer } from '@deck.gl/layers';
import type { FeatureCollection, Feature } from 'geojson';
import { getIconDataUrl } from '../map/formationIcons';

/** Extract top-of-stack features for rendering. */
function getTopStack(features: Feature[]): Feature[] {
    return features.filter(f => f.properties?.is_stack_top);
}

/** Settlement label data — set externally by MapContainer when label GeoJSON is built. */
let _labelFeatures: Feature[] = [];
export function setSettlementLabelData(features: Feature[]) {
    _labelFeatures = features;
}

export function buildTacticalDeckLayers(
    formationsGeoJson: FeatureCollection,
    _labelsVisible: boolean,
    formationsVisible: boolean,
    zoom: number,
    highlightedFormationIds: readonly string[] = [],
) {
    const layers: any[] = [];
    const highlightedFormationIdSet = new Set(highlightedFormationIds);
    const highlightedFormationKey = highlightedFormationIds.join('|');

    // Settlement labels via Deck.gl TextLayer (bypasses broken MapLibre symbol pipeline)
    if (_labelFeatures.length > 0 && zoom >= 7) {
        let fontSize = 10;
        if (zoom >= 14) fontSize = 20;
        else if (zoom >= 11) fontSize = 12 + (zoom - 11) * (20 - 12) / 3;
        else if (zoom >= 9) fontSize = 10 + (zoom - 9) * (12 - 10) / 2;

        layers.push(
            new TextLayer({
                id: 'deck-settlement-labels',
                data: _labelFeatures,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => (d.properties?.name ?? '').toUpperCase(),
                getSize: fontSize,
                getColor: [235, 225, 205, 240],
                outlineColor: [10, 8, 6, 230],
                outlineWidth: 3,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 'bold',
                fontSettings: { sdf: true },
                characterSet: 'auto',
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
                sizeUnits: 'pixels',
                parameters: { depthTest: false },
                updateTriggers: { getSize: zoom },
            })
        );
    }

    if (!formationsVisible) return layers;

    let iconHeight = 40;
    if (zoom <= 6) iconHeight = 16;
    else if (zoom >= 14) iconHeight = 40;
    else {
        if (zoom < 9) iconHeight = 16 + (zoom - 6) * (24 - 16) / 3;
        else if (zoom < 12) iconHeight = 24 + (zoom - 9) * (32 - 24) / 3;
        else iconHeight = 32 + (zoom - 12) * (40 - 32) / 2;
    }

    const topStack = getTopStack(formationsGeoJson.features);

    layers.push(
        new IconLayer({
            id: 'deck-formations-icons',
            data: topStack,
            getIcon: (d: any) => ({
                url: getIconDataUrl(
                    highlightedFormationIdSet.has(d.properties.id)
                        ? (d.properties.white_icon_id ?? d.properties.icon_id)
                        : d.properties.icon_id
                ),
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
            updateTriggers: {
                getSize: zoom,
                getIcon: highlightedFormationKey,
            }
        }),
    );

    return layers;
}
