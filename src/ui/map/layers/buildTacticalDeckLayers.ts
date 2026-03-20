/**
 * Deck.gl formation stack — only used when `DeckLayerCapabilities.deckFormationCounters` is true
 * (see `composeTacticalDeckLayers`). Default remains MapLibre markers/labels for pixel parity + picking.
 */
import { IconLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { FeatureCollection, Feature } from 'geojson';
import { getIconDataUrl } from '../map/formationIcons';

// --- Color constants for enrichment indicators ---
const COLOR_GREEN: [number, number, number, number] = [60, 180, 60, 255];
const COLOR_AMBER: [number, number, number, number] = [210, 170, 40, 255];
const COLOR_RED: [number, number, number, number] = [210, 60, 50, 255];
const COLOR_OPERATION: [number, number, number, number] = [255, 200, 60, 255];
const COLOR_DISRUPTED: [number, number, number, number] = [255, 80, 60, 255];
const COLOR_MARCH: [number, number, number, number] = [140, 180, 255, 255];

const HEALTH_BAR_CHARS = '━━━━━━━━━━'; // 10 chars = 100%

function getCohesionColor(cohesion: number): [number, number, number, number] {
    if (cohesion >= 70) return COLOR_GREEN;
    if (cohesion >= 40) return COLOR_AMBER;
    return COLOR_RED;
}

function getSupplyColor(state: string): [number, number, number, number] {
    if (state === 'cutoff') return COLOR_RED;
    if (state === 'strained') return COLOR_AMBER;
    return COLOR_GREEN;
}

/** Single-pass classification of features into rendering buckets. */
function classifyFeatures(features: Feature[]) {
    const topStack: Feature[] = [];
    const topStackOp: Feature[] = [];
    const topStackDisrupted: Feature[] = [];
    const topStackWithIndicator: Feature[] = [];
    const topStackStacked: Feature[] = [];

    for (const f of features) {
        const p = f.properties;
        if (!p?.is_stack_top) continue;
        topStack.push(f);
        if (p.is_in_operation) topStackOp.push(f);
        if (p.is_disrupted) topStackDisrupted.push(f);
        if (p.is_in_operation || p.is_disrupted || p.movement_stance === 'column') {
            topStackWithIndicator.push(f);
        }
        if ((p.stack_count ?? 0) > 1) topStackStacked.push(f);
    }
    return { topStack, topStackOp, topStackDisrupted, topStackWithIndicator, topStackStacked };
}

export function buildTacticalDeckLayers(
    formationsGeoJson: FeatureCollection,
    labelsVisible: boolean,
    formationsVisible: boolean,
    zoom: number
) {
    if (!formationsVisible) return [];

    const layers = [];

    // MapLibre equivalent scaling:
    let iconHeight = 40;
    if (zoom <= 6) iconHeight = 16;
    else if (zoom >= 14) iconHeight = 40;
    else {
        if (zoom < 9) iconHeight = 16 + (zoom - 6) * (24 - 16) / 3;
        else if (zoom < 12) iconHeight = 24 + (zoom - 9) * (32 - 24) / 3;
        else iconHeight = 32 + (zoom - 12) * (40 - 32) / 2;
    }

    let textSize = 12;
    if (zoom <= 9) textSize = 10;
    else if (zoom >= 14) textSize = 12;
    else textSize = 10 + (zoom - 9) * (12 - 10) / 5;

    const enrichmentScale = iconHeight / 40;
    const halfWidth = iconHeight; // NATO counter 2:1 aspect

    // Single-pass feature classification
    const { topStack, topStackOp, topStackDisrupted, topStackWithIndicator, topStackStacked } =
        classifyFeatures(formationsGeoJson.features);

    // 0.5 Operation/disruption glow — renders BEHIND counter icons (top-stack only)
    if (topStackOp.length > 0) {
        layers.push(
            new ScatterplotLayer({
                id: 'deck-formations-op-glow',
                data: topStackOp,
                getPosition: (d: any) => d.geometry.coordinates,
                getFillColor: [255, 200, 60, 45],
                getLineColor: [255, 200, 60, 120],
                getLineWidth: 1.5,
                lineWidthUnits: 'pixels',
                stroked: true,
                getRadius: iconHeight * 0.65,
                radiusUnits: 'pixels',
                parameters: { depthTest: false },
                updateTriggers: { getRadius: zoom }
            })
        );
    }

    if (topStackDisrupted.length > 0) {
        layers.push(
            new ScatterplotLayer({
                id: 'deck-formations-disrupted-glow',
                data: topStackDisrupted,
                getPosition: (d: any) => d.geometry.coordinates,
                getFillColor: [210, 50, 40, 30],
                getLineColor: [210, 50, 40, 100],
                getLineWidth: 1.5,
                lineWidthUnits: 'pixels',
                stroked: true,
                getRadius: iconHeight * 0.65,
                radiusUnits: 'pixels',
                parameters: { depthTest: false },
                updateTriggers: { getRadius: zoom }
            })
        );
    }

    // 1. Base Counter Icons — only top-of-stack (others are invisible behind and create artifacts)
    layers.push(
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
        })
    );

    // --- 1.5 Counter Enrichments (top-stack units only) ---

    // 1.5a Cohesion Health Bar
    layers.push(
        new TextLayer({
            id: 'deck-formations-health-bar',
            data: topStack,
            getPosition: (d: any) => d.geometry.coordinates,
            getText: (d: any) => {
                const charCount = Math.max(1, Math.round((d.properties?.cohesion ?? 50) / 10));
                return HEALTH_BAR_CHARS.slice(0, charCount);
            },
            getColor: (d: any) => getCohesionColor(d.properties?.cohesion ?? 50),
            getSize: 6 * enrichmentScale,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            getPixelOffset: [0, iconHeight * 0.28],
            characterSet: ['━'],
            parameters: { depthTest: false },
            updateTriggers: { getSize: zoom, getPixelOffset: zoom }
        })
    );

    // 1.5b Supply Indicator Dot — top-right corner
    layers.push(
        new ScatterplotLayer({
            id: 'deck-formations-supply-dot',
            data: topStack,
            getPosition: (d: any) => d.geometry.coordinates,
            getFillColor: (d: any) => getSupplyColor(d.properties?.supply_state ?? 'supplied'),
            getRadius: 3.5 * enrichmentScale,
            radiusUnits: 'pixels',
            getPixelOffset: [halfWidth * 0.42, -(iconHeight * 0.22)],
            parameters: { depthTest: false },
            updateTriggers: { getRadius: zoom, getPixelOffset: zoom }
        })
    );

    // 1.5c Orders/Status Indicator — top-left corner
    if (topStackWithIndicator.length > 0) {
        layers.push(
            new TextLayer({
                id: 'deck-formations-status-icon',
                data: topStackWithIndicator,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => {
                    const p = d.properties;
                    if (p?.is_disrupted) return '!';
                    if (p?.is_in_operation) return '+';
                    if (p?.movement_stance === 'column') return '>';
                    return '';
                },
                getColor: (d: any) => {
                    const p = d.properties;
                    if (p?.is_disrupted) return COLOR_DISRUPTED;
                    if (p?.is_in_operation) return COLOR_OPERATION;
                    return COLOR_MARCH;
                },
                getSize: 10 * enrichmentScale,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                getPixelOffset: [-(halfWidth * 0.42), -(iconHeight * 0.22)],
                parameters: { depthTest: false },
                updateTriggers: { getSize: zoom, getPixelOffset: zoom }
            })
        );
    }

    // 1.5d Stack Badge — bottom-right circle with count
    if (topStackStacked.length > 0) {
        layers.push(
            new ScatterplotLayer({
                id: 'deck-formations-stack-circle',
                data: topStackStacked,
                getPosition: (d: any) => d.geometry.coordinates,
                getFillColor: [30, 30, 35, 240],
                getLineColor: [200, 200, 200, 200],
                getLineWidth: 1.5,
                lineWidthUnits: 'pixels',
                stroked: true,
                getRadius: 9 * enrichmentScale,
                radiusUnits: 'pixels',
                getPixelOffset: [halfWidth * 0.38, iconHeight * 0.22],
                parameters: { depthTest: false },
                updateTriggers: { getRadius: zoom, getPixelOffset: zoom }
            })
        );

        layers.push(
            new TextLayer({
                id: 'deck-formations-stack-text',
                data: topStackStacked,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => String(d.properties?.stack_count ?? 1),
                getSize: 11 * enrichmentScale,
                getColor: [255, 255, 255, 255],
                fontFamily: 'Open Sans, sans-serif',
                fontWeight: 'normal',
                getPixelOffset: [halfWidth * 0.38, iconHeight * 0.22 + enrichmentScale],
                parameters: { depthTest: false },
                updateTriggers: { getSize: zoom, getPixelOffset: zoom }
            })
        );
    }

    // 2. Labels — top-of-stack only
    const FORMATION_LABELS_MIN_ZOOM = 9;
    if (labelsVisible && zoom >= FORMATION_LABELS_MIN_ZOOM) {
        layers.push(
            new TextLayer({
                id: 'deck-formations-labels',
                data: topStack,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => d.properties?.title || d.properties?.name || '',
                getSize: textSize,
                getColor: [20, 20, 20, 230],
                getPixelOffset: [0, 22 * enrichmentScale],
                fontFamily: 'Open Sans, sans-serif',
                fontWeight: 'normal',
                outlineWidth: 2,
                outlineColor: [235, 225, 205, 220],
                parameters: { depthTest: false },
                updateTriggers: { getSize: zoom, getPixelOffset: zoom }
            })
        );
    }

    return layers;
}
