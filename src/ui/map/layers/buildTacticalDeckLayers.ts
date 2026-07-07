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

export type DeckViewportClip = {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    occluders?: Array<{ left: number; top: number; right: number; bottom: number }>;
    project: (coordinates: [number, number]) => { x: number; y: number } | null | undefined;
};

export type DeckPointHalfSize = {
    halfWidth: number;
    halfHeight: number;
};

const COUNTER_EDGE_CLEARANCE_PX = 28;
const COUNTER_EDGE_CLAMP_REACH_PX = 180;

/** Highlighted formations render as a dedicated overlay so non-top-stack selections stay visible. */
function getHighlightedFeatures(features: Feature[], highlightedFormationIdSet: Set<string>): Feature[] {
    return features.filter(f => highlightedFormationIdSet.has(f.properties?.id));
}

function getPointCoordinates(feature: Feature): [number, number] | null {
    if (feature.geometry?.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
        return null;
    }
    return [coordinates[0], coordinates[1]];
}

export function filterViewportSafePointFeatures(
    features: Feature[],
    clip: DeckViewportClip | null | undefined,
    size: DeckPointHalfSize,
    getPixelOffset: (feature: Feature) => [number, number] = () => [0, 0],
): Feature[] {
    if (!clip) return features;
    const minX = clip.padding.left + size.halfWidth;
    const maxX = clip.width - clip.padding.right - size.halfWidth;
    const minY = clip.padding.top + size.halfHeight;
    const maxY = clip.height - clip.padding.bottom - size.halfHeight;
    if (maxX < minX || maxY < minY) return [];

    return features.filter((feature) => {
        const coordinates = getPointCoordinates(feature);
        if (!coordinates) return false;
        const point = clip.project(coordinates);
        if (!point) return false;
        const pixelOffset = getPixelOffset(feature);
        const centerX = point.x + pixelOffset[0];
        const centerY = point.y + pixelOffset[1];
        if (centerX < minX || centerX > maxX || centerY < minY || centerY > maxY) return false;
        const left = centerX - size.halfWidth;
        const right = centerX + size.halfWidth;
        const top = centerY - size.halfHeight;
        const bottom = centerY + size.halfHeight;
        return !(clip.occluders ?? []).some((occluder) => (
            right > occluder.left
            && left < occluder.right
            && bottom > occluder.top
            && top < occluder.bottom
        ));
    });
}

export function filterViewportClampablePointFeatures(
    features: Feature[],
    clip: DeckViewportClip | null | undefined,
    size: DeckPointHalfSize,
    reachPx = COUNTER_EDGE_CLAMP_REACH_PX,
): Feature[] {
    if (!clip) return features;
    const minX = clip.padding.left - reachPx;
    const maxX = clip.width - clip.padding.right + reachPx;
    const minY = clip.padding.top - reachPx;
    const maxY = clip.height - clip.padding.bottom + reachPx;
    if (maxX < minX || maxY < minY) return [];

    return features.filter((feature) => {
        const coordinates = getPointCoordinates(feature);
        if (!coordinates) return false;
        const point = clip.project(coordinates);
        if (!point) return false;
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
    });
}

export function getViewportSafePixelOffset(
    feature: Feature,
    clip: DeckViewportClip | null | undefined,
    size: DeckPointHalfSize,
    baseOffset: [number, number] = [0, 0],
): [number, number] {
    if (!clip) return baseOffset;
    const coordinates = getPointCoordinates(feature);
    if (!coordinates) return baseOffset;
    const point = clip.project(coordinates);
    if (!point) return baseOffset;

    const minX = clip.padding.left + size.halfWidth;
    const maxX = clip.width - clip.padding.right - size.halfWidth;
    const minY = clip.padding.top + size.halfHeight;
    const maxY = clip.height - clip.padding.bottom - size.halfHeight;
    if (maxX < minX || maxY < minY) return baseOffset;

    const renderedX = point.x + baseOffset[0];
    const renderedY = point.y + baseOffset[1];
    const offsetX = renderedX < minX ? minX - renderedX : renderedX > maxX ? maxX - renderedX : 0;
    const offsetY = renderedY < minY ? minY - renderedY : renderedY > maxY ? maxY - renderedY : 0;
    return [baseOffset[0] + offsetX, baseOffset[1] + offsetY];
}

export function getFormationStackPixelOffset(feature: Feature, iconHeight: number): [number, number] {
    const stackIndex = typeof feature.properties?.stack_index === 'number'
        ? Math.max(0, Math.floor(feature.properties.stack_index))
        : 0;
    const stackCount = typeof feature.properties?.stack_count === 'number'
        ? Math.max(1, Math.floor(feature.properties.stack_count))
        : 1;
    if (stackIndex === 0 || stackCount <= 1) return [0, 0];

    const slot = Math.min(stackIndex - 1, 5);
    const column = slot % 3;
    const row = Math.floor(slot / 3);
    const horizontalStep = Math.max(8, Math.round(iconHeight * 0.35));
    const verticalStep = Math.max(6, Math.round(iconHeight * 0.2));
    return [(column - 1) * horizontalStep, -(row + 1) * verticalStep];
}

export function getCounterFootprintHalfSize(iconHeight: number): DeckPointHalfSize {
    return {
        halfWidth: Math.ceil(iconHeight + COUNTER_EDGE_CLEARANCE_PX),
        halfHeight: Math.ceil(iconHeight / 2 + COUNTER_EDGE_CLEARANCE_PX),
    };
}

export function getBaseFormationIconId(feature: any): string {
    return feature.properties.icon_id;
}

export function getHighlightedFormationIconId(feature: any): string {
    return feature.properties.white_icon_id ?? feature.properties.icon_id;
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
    viewportClip?: DeckViewportClip,
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
        const labelHalfSize = { halfWidth: Math.max(84, fontSize * 7), halfHeight: Math.max(16, fontSize) };
        const labelFeatures = _labelFeatures;

        if (labelFeatures.length > 0) layers.push(
            new TextLayer({
                id: 'deck-settlement-labels',
                data: labelFeatures,
                getPosition: (d: any) => d.geometry.coordinates,
                getPixelOffset: (d: Feature) => getViewportSafePixelOffset(d, viewportClip, labelHalfSize),
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
                parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
                updateTriggers: { getSize: zoom, getPixelOffset: viewportClip },
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

    const iconHalfSize = getCounterFootprintHalfSize(iconHeight);
    const getFormationPixelOffset = (feature: Feature) => getFormationStackPixelOffset(feature, iconHeight);
    const visibleFormationFeatures = filterViewportSafePointFeatures(
        formationsGeoJson.features,
        viewportClip,
        iconHalfSize,
        getFormationPixelOffset,
    );
    const highlightedFeatures = highlightedFormationIds.length > 0
        ? getHighlightedFeatures(visibleFormationFeatures, highlightedFormationIdSet)
        : [];

    layers.push(
        new IconLayer({
            id: 'deck-formations-icons',
            data: visibleFormationFeatures,
            getIcon: (d: any) => ({
                url: getIconDataUrl(getBaseFormationIconId(d)),
                width: 160,
                height: 80,
            }),
            getPosition: (d: any) => d.geometry.coordinates,
            getPixelOffset: (d: Feature) => getViewportSafePixelOffset(
                d,
                viewportClip,
                iconHalfSize,
                getFormationPixelOffset(d),
            ),
            getSize: iconHeight,
            sizeUnits: 'pixels',
            sizeScale: 1,
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 80],
            parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
            updateTriggers: {
                getSize: zoom,
                getPixelOffset: viewportClip,
            }
        }),
    );

    if (highlightedFeatures.length > 0) {
        layers.push(
            new IconLayer({
                id: 'deck-formations-highlighted',
                data: highlightedFeatures,
                getIcon: (d: any) => ({
                    url: getIconDataUrl(getHighlightedFormationIconId(d)),
                    width: 160,
                    height: 80,
                }),
                getPosition: (d: any) => d.geometry.coordinates,
                getPixelOffset: (d: Feature) => getViewportSafePixelOffset(
                    d,
                    viewportClip,
                    getCounterFootprintHalfSize(iconHeight + 2),
                    getFormationStackPixelOffset(d, iconHeight + 2),
                ),
                getSize: iconHeight + 2,
                sizeUnits: 'pixels',
                sizeScale: 1,
                pickable: false,
                parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
                updateTriggers: {
                    getSize: zoom,
                    getIcon: highlightedFormationKey,
                    getPixelOffset: viewportClip,
                }
            }),
        );
    }

    return layers;
}
