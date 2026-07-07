import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
    buildTacticalDeckLayers,
    filterViewportClampablePointFeatures,
    filterViewportSafePointFeatures,
    getBaseFormationIconId,
    getCounterFootprintHalfSize,
    getHighlightedFormationIconId,
    getFormationStackPixelOffset,
    getViewportSafePixelOffset,
} from '../src/ui/map/layers/buildTacticalDeckLayers.js';

function makeFeature(id: string, isStackTop: boolean) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.8, 44.1] },
        properties: {
            id,
            icon_id: `brigade__RS__h100__m100_${id}`,
            white_icon_id: `white__brigade__RS__h100__m100_${id}`,
            is_stack_top: isStackTop,
        },
    };
}

it('deck formation layer keeps all formation counters visible in normal state', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('b_top', true),
            makeFeature('b_hidden_1', false),
            makeFeature('b_hidden_2', false),
        ],
    } as any;

    const layers = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, []);
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(baseLayer, 'expected base Deck icon layer').toBeTruthy();
    expect(baseLayer.props.data.length, 'base Deck layer should render every formation feature').toBe(3);
});

it('highlight overlay remains a styling layer, not a visibility backdoor', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('b_top', true),
            makeFeature('b_hidden', false),
        ],
    } as any;

    const layers = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, ['b_hidden']);
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const highlightedLayer = layers.find((layer: any) => layer.id === 'deck-formations-highlighted') as any;

    expect(baseLayer, 'expected base Deck icon layer').toBeTruthy();
    expect(highlightedLayer, 'expected highlighted Deck icon layer').toBeTruthy();
    expect(baseLayer.props.data.length, 'normal visibility should already include highlighted formations').toBe(2);
    expect(
        highlightedLayer.props.data.map((feature: any) => feature.properties.id),
        'highlight layer should only restyle requested formations',
    ).toEqual(['b_hidden']);
});

it('base deck counters stay faction-colored while selected formations get a white overlay', () => {
    const feature = makeFeature('b_selected', false) as any;

    expect(
        getBaseFormationIconId(feature),
        'base layer should keep the selected formation in faction colors',
    ).toBe('brigade__RS__h100__m100_b_selected');
    expect(
        getHighlightedFormationIconId(feature),
        'highlight overlay should provide the white selected counter',
    ).toBe('white__brigade__RS__h100__m100_b_selected');
});

it('formation counter bodies are opaque so terrain and labels cannot bleed through unit icons', () => {
    const source = readFileSync('src/ui/map/map/formationIcons.ts', 'utf8');

    expect(source).toContain("const COUNTER_HALO_FILL = 'rgba(235, 225, 205, 0.98)'");
    expect(source).toContain("const COUNTER_HALO_BORDER = 'rgba(18, 14, 10, 0.72)'");
    expect(source).toContain('roundedRect(ctx, 0, 0, ICON_WIDTH, ICON_HEIGHT, CORNER_RADIUS + 4)');
    expect(source).toContain('roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS)');
    expect(source).toContain("RS: 'rgba(178, 60, 60, 1)'");
    expect(source).toContain("RBiH: 'rgba(55, 135, 70, 1)'");
    expect(source).toContain("HRHB: 'rgba(50, 108, 168, 1)'");
    expect(source).toContain("RS: 'rgba(120, 30, 30, 1)'");
    expect(source).toContain("RBiH: 'rgba(30, 90, 45, 1)'");
    expect(source).toContain("HRHB: 'rgba(25, 65, 115, 1)'");
    expect(source).toContain("const fill = isWhiteVariant ? 'rgba(255, 255, 255, 1)' : (FACTION_FILL[canonicalFaction] ?? 'rgba(90, 90, 100, 1)')");
    expect(source).toContain("const border = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : (FACTION_BORDER[canonicalFaction] ?? 'rgba(50, 50, 60, 1)')");
    expect(source).toContain("const symbolColor = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : 'rgba(255, 255, 255, 1)'");
    expect(source).not.toContain('0.92');
});

it('deck counters and labels do not write depth into the pitched 2.5D map scene', () => {
    const source = readFileSync('src/ui/map/layers/buildTacticalDeckLayers.ts', 'utf8');

    expect(source.match(/parameters: \{ depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' \}/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('parameters: { depthTest: false }');
    expect(source).not.toContain('depthWriteEnabled: true');
});

it('tactical Deck overlay is not interleaved with the pitched MapLibre terrain stack', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).toContain('new MapboxOverlay({');
    expect(source).toContain('interleaved: false');
    expect(source).not.toContain('interleaved: true');
});

it('tactical map camera reserves screen-edge padding for labels and unit counters', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).toContain('TACTICAL_MAP_EDGE_PADDING');
    expect(source).toContain('top: 124');
    expect(source).toContain('right: 420');
    expect(source).toContain('bottom: 184');
    expect(source).toContain('left: 380');
    expect(source).toContain('map.setPadding(buildCounterAwareCameraPadding(map))');
    expect(source).toContain('padding: buildCounterAwareCameraPadding(map)');
});

it('deck counter ownership hides native MapLibre formation symbol layers', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');

    expect(source).toContain('function hideNativeFormationSymbolLayersWhenDeckOwnsCounters');
    expect(source).toContain('safeSetLayoutVisibility(map, FORMATION_MARKERS_LAYER_ID, false)');
    expect(source).toContain('safeSetLayoutVisibility(map, FORMATION_LABELS_LAYER_ID, false)');
    expect(source).toContain('safeSetLayoutVisibility(map, FORMATION_WHITE_OVERLAY_LAYER_ID, false)');
    expect(source).toContain("map.setPaintProperty(FORMATION_MARKERS_LAYER_ID, 'icon-opacity', 0)");
    expect(source).toContain("map.setPaintProperty(FORMATION_LABELS_LAYER_ID, 'text-opacity', 0)");
    expect(source).toContain("map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', 0)");
    expect(source).toContain('DEFAULT_DECK_LAYER_CAPABILITIES.deckFormationCounters ? EMPTY_GEOJSON : formationsGeoJson');
    expect(source.match(/hideNativeFormationSymbolLayersWhenDeckOwnsCounters/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
});

it('deck counters derive clipping bounds from visible panel occluders', () => {
    const mapSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const oobSource = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');
    const corpsSource = readFileSync('src/ui/map/components/CorpsDetail.tsx', 'utf8');
    const sectorSource = readFileSync('src/ui/map/components/CorpsFrontPanel.tsx', 'utf8');
    const minimapSource = readFileSync('src/ui/map/components/Minimap.tsx', 'utf8');
    const bottomStripSource = readFileSync('src/ui/map/components/BottomStatusStrip.tsx', 'utf8');
    const toolbarSource = readFileSync('src/ui/map/components/PresidentialToolbar.tsx', 'utf8');
    const briefingSource = readFileSync('src/ui/map/components/CommandBriefingLayer.tsx', 'utf8');

    expect(mapSource).toContain('function buildDeckCounterViewportPadding');
    expect(mapSource).toContain('function buildDeckCounterViewportOccluders');
    expect(mapSource).toContain('[data-awwv-counter-occluder="true"]');
    expect(mapSource).toContain('blockedHorizontalIntervals');
    expect(mapSource).toContain('bestGap');
    expect(mapSource).toContain('buildDeckCounterViewportPadding(map.getCanvas())');
    expect(mapSource).toContain('buildDeckCounterViewportOccluders(canvas)');
    expect(mapSource).toContain('occluders: counterViewportOccluders');
    expect(mapSource).toContain('counterViewportPadding.top');
    expect(mapSource).toContain('window.setTimeout(reapplyAfterLayout, 120)');
    expect(mapSource).toContain('window.setTimeout(reapplyAfterLayout, 320)');
    expect(mapSource).toContain('lastDeckLayerInputsRef.current = null');
    expect(mapSource).toContain('minimapVisible');
    expect(oobSource).toContain('data-awwv-counter-occluder="true"');
    expect(corpsSource).toContain('data-awwv-counter-occluder="true"');
    expect(sectorSource).toContain('data-awwv-counter-occluder="true"');
    expect(minimapSource).toContain('data-awwv-counter-occluder="true"');
    expect(bottomStripSource).toContain('data-awwv-counter-occluder="true"');
    expect(toolbarSource).toContain('data-awwv-counter-occluder="true"');
    expect(briefingSource).toContain('data-awwv-counter-occluder="true"');
});

it('filters deck point features that would render clipped against the viewport edge', () => {
    const inside = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.8, 44.1] },
        properties: { id: 'inside' },
    };
    const edge = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.9, 44.2] },
        properties: { id: 'edge' },
    };

    const filtered = filterViewportSafePointFeatures([inside, edge] as any, {
        width: 400,
        height: 300,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        project: (coordinates) => coordinates[0] === 17.8 ? { x: 200, y: 150 } : { x: 392, y: 150 },
    }, { halfWidth: 44, halfHeight: 24 });

    expect(filtered.map((feature: any) => feature.properties.id)).toEqual(['inside']);
});

it('filters deck counters whose footprint would intersect floating UI occluders', () => {
    const clear = makeFeature('clear', true);
    const covered = makeFeature('covered', true);
    (covered.geometry as any).coordinates = [18.8, 44.9];

    const filtered = filterViewportSafePointFeatures([clear, covered] as any, {
        width: 900,
        height: 600,
        padding: { top: 32, right: 32, bottom: 32, left: 32 },
        occluders: [{ left: 450, top: 180, right: 650, bottom: 360 }],
        project: (coordinates) => coordinates[0] === 17.8 ? { x: 220, y: 220 } : { x: 520, y: 240 },
    }, { halfWidth: 68, halfHeight: 48 });

    expect(filtered.map((feature: any) => feature.properties.id)).toEqual(['clear']);
});

it('keeps deck counters renderable by offsetting edge points inward instead of hiding them', () => {
    const edge = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.9, 44.2] },
        properties: { id: 'edge' },
    };

    expect(getViewportSafePixelOffset(edge as any, {
        width: 400,
        height: 300,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        project: () => ({ x: 392, y: 10 }),
    }, { halfWidth: 44, halfHeight: 24 })).toEqual([-52, 30]);
});

it('keeps Deck counter layers inside the current uncluttered map band by filtering edge-near counters', () => {
    const safe = makeFeature('safe', true);
    const underPanel = makeFeature('under-panel', true);
    (underPanel.geometry as any).coordinates = [18.8, 44.9];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [safe, underPanel],
    } as any;

    const layers = buildTacticalDeckLayers(
        formationsGeoJson,
        false,
        true,
        10,
        ['safe', 'under-panel'],
        {
            width: 400,
            height: 300,
            padding: { top: 16, right: 16, bottom: 80, left: 180 },
            project: (coordinates) => coordinates[0] === 17.8 ? { x: 280, y: 120 } : { x: 40, y: 260 },
        },
    );
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const highlightedLayer = layers.find((layer: any) => layer.id === 'deck-formations-highlighted') as any;

    expect(baseLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['safe']);
    expect(highlightedLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['safe']);
});

it('uses an expanded rendered-counter footprint and filters top-edge counters', () => {
    const topEdge = makeFeature('top-edge', true);
    const safe = makeFeature('safe-top', true);
    (safe.geometry as any).coordinates = [18.8, 44.9];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [topEdge, safe],
    } as any;

    const layers = buildTacticalDeckLayers(
        formationsGeoJson,
        false,
        true,
        10,
        [],
        {
            width: 500,
            height: 360,
            padding: { top: 72, right: 24, bottom: 64, left: 24 },
            project: (coordinates) => coordinates[0] === 17.8 ? { x: 240, y: 96 } : { x: 240, y: 132 },
        },
    );
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(getCounterFootprintHalfSize(40)).toEqual({ halfWidth: 68, halfHeight: 48 });
    expect(baseLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['safe-top']);
});

it('filters only counters too far outside the viewport to clamp honestly', () => {
    const nearLeft = makeFeature('near-left', true);
    const farLeft = makeFeature('far-left', true);
    (farLeft.geometry as any).coordinates = [16, 44.1];

    const filtered = filterViewportClampablePointFeatures([nearLeft, farLeft] as any, {
        width: 500,
        height: 360,
        padding: { top: 124, right: 420, bottom: 184, left: 380 },
        project: (coordinates) => coordinates[0] === 17.8 ? { x: 250, y: 160 } : { x: -260, y: 160 },
    }, getCounterFootprintHalfSize(40));

    expect(filtered.map((feature: any) => feature.properties.id)).toEqual(['near-left']);
});

it('uses bounded pixel offsets for stacked counters instead of map-coordinate drift', () => {
    const stacked = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.9, 44.2] },
        properties: { id: 'stacked', stack_index: 7, stack_count: 12 },
    };

    expect(getFormationStackPixelOffset(stacked as any, 40)).toEqual([14, -16]);
    expect(getViewportSafePixelOffset(stacked as any, {
        width: 400,
        height: 300,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        project: () => ({ x: 392, y: 10 }),
    }, { halfWidth: 44, halfHeight: 24 }, getFormationStackPixelOffset(stacked as any, 40))).toEqual([-52, 30]);
});

it('clamps bottom-edge Deck counters with negative Y offsets in screen coordinates', () => {
    const edge = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.9, 44.2] },
        properties: { id: 'bottom-edge' },
    };

    expect(getViewportSafePixelOffset(edge as any, {
        width: 400,
        height: 300,
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        project: () => ({ x: 200, y: 292 }),
    }, { halfWidth: 44, halfHeight: 24 })).toEqual([0, -32]);
});
