/**
 * Deck.gl formation stack + settlement labels.
 * Formation counters: only when `DeckLayerCapabilities.deckFormationCounters` is true.
 * Settlement labels: always rendered via Deck.gl TextLayer (MapLibre symbol rendering
 * is broken — "Unimplemented type: 4" errors from OSM PMTiles poison the symbol pipeline,
 * causing ALL symbol layers to render 0 features).
 *
 * Counters and their stack badges come from ONE layout pass (`formationCounterLayout.ts`)
 * and are painted by ONE icon layer, stack by stack: cascade, top counter, then its badge.
 * Before 2026-11-10 badges were separate text layers (plus a visible DOM copy) drawn above
 * every counter, so a badge could float with no counter under it (R8, owner's screenshot).
 */
import { IconLayer, TextLayer } from '@deck.gl/layers';
import type { FeatureCollection, Feature } from 'geojson';
import {
    type CounterIconAtlasEntry,
    getCounterIconAtlas,
    getIconDataUrl,
    getStackBadgeIconDataUrl,
    getStackBadgeIconId,
    ICON_HEIGHT,
    ICON_WIDTH,
    STACK_BADGE_ICON_SIZE,
} from '../map/formationIcons';
import { INK_TEXT_RGB, PAPER_HALO_RGB } from '../map/mapPaperPalette';
import { UI_COMMAND_FONT_FAMILY } from '../styles/typography';
import {
    layoutFormationCounters,
    type CounterViewportClip,
    type FormationCounterLayout,
} from './formationCounterLayout';

export { getFormationStackPixelOffset } from '../map/clickSelectionPriority';

export type DeckViewportClip = CounterViewportClip;

function getPointCoordinates(feature: Feature): [number, number] | null {
    if (feature.geometry?.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
        return null;
    }
    return [coordinates[0], coordinates[1]];
}

/** Labels whose settlement point is on the canvas and not under a panel; never moved. */
export function filterSettlementLabelsOnVisibleMap(
    features: Feature[],
    clip: DeckViewportClip | null | undefined,
): Feature[] {
    if (!clip) return features;
    const occluders = clip.occluders ?? [];
    return features.filter((feature) => {
        const coordinates = getPointCoordinates(feature);
        const point = coordinates ? clip.project(coordinates) : null;
        if (!point) return false;
        if (point.x < 0 || point.x > clip.width || point.y < 0 || point.y > clip.height) return false;
        return !occluders.some((o) => point.x >= o.left && point.x <= o.right && point.y >= o.top && point.y <= o.bottom);
    });
}

export function getFormationCounterIconHeight(zoom: number): number {
    if (zoom <= 6) return 16;
    if (zoom >= 14) return 40;
    if (zoom < 9) return 16 + (zoom - 6) * (24 - 16) / 3;
    if (zoom < 12) return 24 + (zoom - 9) * (32 - 24) / 3;
    return 32 + (zoom - 12) * (40 - 32) / 2;
}

export function isStackBadgeRow(row: Feature): boolean {
    return row.properties?.counter_role === 'stack-badge';
}

/**
 * Flatten a layout into paint-ordered icon-layer rows plus each row's pixel offset and size.
 * Counter rows are the original features (so picking and highlight keep their identity);
 * badge rows copy the top counter's properties with `counter_role: 'stack-badge'` and the
 * displayed count in `stack_count`, so a click on a badge opens that stack.
 */
export function buildFormationCounterDeckRows(layout: FormationCounterLayout): {
    rows: Feature[];
    offsets: Map<Feature, [number, number]>;
    sizes: Map<Feature, number>;
} {
    const rows: Feature[] = [];
    const offsets = new Map<Feature, [number, number]>();
    const sizes = new Map<Feature, number>();
    for (const stack of layout.stacks) {
        for (const counter of stack.counters) {
            rows.push(counter.feature);
            offsets.set(counter.feature, counter.offset);
            sizes.set(counter.feature, layout.iconHeight);
        }
        if (stack.badge) {
            const badgeRow: Feature = {
                type: 'Feature',
                geometry: stack.top.geometry,
                properties: {
                    ...(stack.top.properties ?? {}),
                    counter_role: 'stack-badge',
                    stack_count: stack.badge.count,
                    merged_osids: stack.mergedOsids,
                },
            };
            rows.push(badgeRow);
            offsets.set(badgeRow, stack.badge.offset);
            sizes.set(badgeRow, stack.badge.diameter);
        }
    }
    return { rows, offsets, sizes };
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
        // A label stays on its settlement. Before 2026-11-10 labels were pushed into the
        // panel-free band, so they slid across the map whenever a panel opened or closed.
        const labelFeatures = filterSettlementLabelsOnVisibleMap(_labelFeatures, viewportClip);

        if (labelFeatures.length > 0) layers.push(
            new TextLayer({
                id: 'deck-settlement-labels',
                data: labelFeatures,
                getPosition: (d: any) => d.geometry.coordinates,
                getText: (d: any) => (d.properties?.name ?? '').toUpperCase(),
                getSize: fontSize,
                getColor: [...INK_TEXT_RGB, 235],
                outlineColor: [...PAPER_HALO_RGB, 235],
                outlineWidth: 3,
                fontFamily: UI_COMMAND_FONT_FAMILY,
                fontWeight: 'bold',
                fontSettings: { sdf: true },
                characterSet: 'auto',
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
                sizeUnits: 'pixels',
                parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
                updateTriggers: { getSize: zoom },
            })
        );
    }

    const iconHeight = getFormationCounterIconHeight(zoom);
    const layout: FormationCounterLayout = formationsVisible
        ? layoutFormationCounters(formationsGeoJson.features, iconHeight, viewportClip)
        : { iconHeight, stacks: [], blockedOsids: [] };
    const { rows, offsets, sizes } = buildFormationCounterDeckRows(layout);
    const getRowOffset = (row: Feature): [number, number] => offsets.get(row) ?? [0, 0];
    const getRowSize = (row: Feature): number => sizes.get(row) ?? iconHeight;
    const highlightedFeatures = highlightedFormationIds.length > 0
        ? rows.filter((row) => !isStackBadgeRow(row) && highlightedFormationIdSet.has(row.properties?.id))
        : [];
    const getRowIconKey = (row: Feature): string => (isStackBadgeRow(row)
        ? getStackBadgeIconId(Number(row.properties?.stack_count ?? 0))
        : getBaseFormationIconId(row));
    // Our own pre-packed atlas (see getCounterIconAtlas): Deck's auto-packing blanked every
    // counter whenever its atlas grew. Without a DOM (unit tests) fall back to auto-packing.
    const atlas = getCounterIconAtlas([
        ...rows.map(getRowIconKey),
        ...highlightedFeatures.map((row) => getHighlightedFormationIconId(row)),
    ]);
    // Deck's `iconAtlas` is an 'image' prop: at runtime it turns a canvas straight into a
    // texture, but its typings only list a URL or a Texture, hence the loose prop type.
    const atlasProps: { iconAtlas?: any; iconMapping?: Record<string, CounterIconAtlasEntry> } = atlas
        ? { iconAtlas: atlas.canvas, iconMapping: atlas.mapping }
        : {};

    layers.push(
        new IconLayer({
            id: 'deck-formations-icons',
            data: rows,
            ...atlasProps,
            getIcon: atlas
                ? getRowIconKey
                : (d: Feature) => (isStackBadgeRow(d)
                    ? {
                        url: getStackBadgeIconDataUrl(Number(d.properties?.stack_count ?? 0)),
                        width: STACK_BADGE_ICON_SIZE,
                        height: STACK_BADGE_ICON_SIZE,
                    }
                    : {
                        url: getIconDataUrl(getBaseFormationIconId(d)),
                        width: ICON_WIDTH,
                        height: ICON_HEIGHT,
                    }),
            getPosition: (d: any) => d.geometry.coordinates,
            getPixelOffset: getRowOffset,
            getSize: getRowSize,
            sizeUnits: 'pixels',
            sizeScale: 1,
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 80],
            parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
            updateTriggers: {
                getSize: [zoom, viewportClip],
                getPixelOffset: viewportClip,
                getIcon: viewportClip,
            }
        }),
    );

    // Keep both auto-packed IconLayer owners mounted for the life of the retained
    // Deck overlay. IconManager does not cancel pending image loads when a layer
    // finalizes; removing the transient highlight layer can therefore let a late
    // upload target its deleted atlas texture during dossier -> map -> dossier.
    layers.push(
        new IconLayer({
            id: 'deck-formations-highlighted',
            data: highlightedFeatures,
            ...atlasProps,
            getIcon: atlas
                ? (d: Feature) => getHighlightedFormationIconId(d)
                : (d: any) => ({
                    url: getIconDataUrl(getHighlightedFormationIconId(d)),
                    width: ICON_WIDTH,
                    height: ICON_HEIGHT,
                }),
            getPosition: (d: any) => d.geometry.coordinates,
            getPixelOffset: getRowOffset,
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

    return layers;
}
