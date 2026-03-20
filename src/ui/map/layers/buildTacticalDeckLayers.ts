/**
 * Deck.gl formation stack — only used when `DeckLayerCapabilities.deckFormationCounters` is true
 * (see `composeTacticalDeckLayers`). Default remains MapLibre markers/labels for pixel parity + picking.
 */
import { IconLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { FeatureCollection } from 'geojson';
import { getIconDataUrl } from '../map/formationIcons';

export function buildTacticalDeckLayers(
    formationsGeoJson: FeatureCollection,
    labelsVisible: boolean,
    formationsVisible: boolean,
    zoom: number
) {
    if (!formationsVisible) return [];

    const layers = [];

    // MapLibre equivalent scaling:
    // icon-size: [6, 0.4], [9, 0.6], [12, 0.8], [14, 1.0]
    // Since base CSS height is 40px (80px / 2 pixelRatio):
    let iconHeight = 40;
    if (zoom <= 6) iconHeight = 16;
    else if (zoom >= 14) iconHeight = 40;
    else {
        // Simple linear interpolation between the keyframes
        if (zoom < 9) iconHeight = 16 + (zoom - 6) * (24 - 16) / 3;
        else if (zoom < 12) iconHeight = 24 + (zoom - 9) * (32 - 24) / 3;
        else iconHeight = 32 + (zoom - 12) * (40 - 32) / 2;
    }

    // text-size: [9, 10], [14, 12]
    let textSize = 12;
    if (zoom <= 9) textSize = 10;
    else if (zoom >= 14) textSize = 12;
    else textSize = 10 + (zoom - 9) * (12 - 10) / 5;

    // 1. Base Counter Icons
    layers.push(
        new IconLayer({
            id: 'deck-formations-icons',
            data: formationsGeoJson.features,
            getIcon: (d: any) => {
                const iconId = d.properties.icon_id;
                return {
                    url: getIconDataUrl(iconId),
                    width: 160,
                    height: 80,
                };
            },
            getPosition: (d: any) => d.geometry.coordinates,
            getSize: iconHeight,
            sizeUnits: 'pixels',
            sizeScale: 1,
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 80],
            parameters: { depthTest: false },
            updateTriggers: {
                getSize: zoom
            }
        })
    );

    // 1.5 Counter Enrichments
    const topStackFeatures = formationsGeoJson.features.filter(f => f.properties?.is_stack_top);
    const enrichmentScale = iconHeight / 40; // Scale enrichment dots/badges relative to main icon

    // Orders Indicator (Emoji)
    layers.push(
        new TextLayer({
            id: 'deck-formations-orders',
            data: topStackFeatures.filter((f: any) => {
                const props = f.properties;
                return props && props.posture && (props.posture === 'attack' || props.posture === 'assault' || props.posture === 'defend_at_all_costs');
            }),
            getPosition: (d: any) => d.geometry.coordinates,
            getText: (d: any) => d.properties?.posture === 'attack' || d.properties?.posture === 'assault' ? '⚔️' : '🛡️',
            getSize: 14 * enrichmentScale,
            getPixelOffset: [-28 * enrichmentScale, -20 * enrichmentScale],
            parameters: { depthTest: false },
            updateTriggers: {
                getSize: zoom,
                getPixelOffset: zoom
            }
        })
    );

    // Supply Dot
    layers.push(
        new ScatterplotLayer({
            id: 'deck-formations-supply-dot',
            data: topStackFeatures,
            getPosition: (d: any) => d.geometry.coordinates,
            getFillColor: (d: any) => (d.properties?.home_distance_mult ?? 1) > 0.8 ? [40, 200, 40, 255] : [200, 160, 40, 255],
            getRadius: 4 * enrichmentScale,
            radiusUnits: 'pixels',
            parameters: { depthTest: false },
            updateTriggers: {
                getRadius: zoom
            }
        })
    );

    // Stack Badge Circle
    const stackedFeatures = topStackFeatures.filter((f: any) => (f.properties?.stack_count ?? 0) > 1);
    layers.push(
        new ScatterplotLayer({
            id: 'deck-formations-stack-circle',
            data: stackedFeatures,
            getPosition: (d: any) => d.geometry.coordinates,
            getFillColor: [30, 30, 35, 240],
            getLineColor: [200, 200, 200, 200],
            getLineWidth: 1.5,
            lineWidthUnits: 'pixels',
            stroked: true,
            getRadius: 9 * enrichmentScale,
            radiusUnits: 'pixels',
            parameters: { depthTest: false },
            updateTriggers: {
                getRadius: zoom
            }
        })
    );

    // Stack Badge Text
    layers.push(
        new TextLayer({
            id: 'deck-formations-stack-text',
            data: stackedFeatures,
            getPosition: (d: any) => d.geometry.coordinates,
            getText: (d: any) => String(d.properties?.stack_count ?? 1),
            getSize: 11 * enrichmentScale,
            getColor: [255, 255, 255, 255],
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 'normal',
            getPixelOffset: [0, 1 * enrichmentScale],
            parameters: { depthTest: false },
            updateTriggers: {
                getSize: zoom,
                getPixelOffset: zoom
            }
        })
    );

    // 2. Labels — match MapLibre formation-labels.minzoom (awwv_map_style.json)
    const FORMATION_LABELS_MIN_ZOOM = 9;
    if (labelsVisible && zoom >= FORMATION_LABELS_MIN_ZOOM) {
        layers.push(
            new TextLayer({
                id: 'deck-formations-labels',
                data: formationsGeoJson.features,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => d.properties?.title || d.properties?.name || '',
                getSize: textSize,
                getColor: [20, 20, 20, 230], // Matches rgba(20, 20, 20, 0.9)
                getPixelOffset: [0, 22 * enrichmentScale],
                fontFamily: 'Open Sans, sans-serif',
                fontWeight: 'normal',
                outlineWidth: 2,
                outlineColor: [235, 225, 205, 220], // Matches background halo color
                parameters: { depthTest: false },
                updateTriggers: {
                    getSize: zoom,
                    getPixelOffset: zoom
                }
            })
        );
    }


    return layers;
}

