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
import { buildFormationCounterDomOverlayItems } from '../src/ui/map/layers/formationCounterDomOverlay.js';

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

function makeEnemyContactFeature(id: string, isStackTop: boolean) {
    const feature = makeFeature(id, isStackTop);
    return {
        ...feature,
        properties: {
            ...feature.properties,
            kind: 'enemy_contact',
            is_enemy_contact: true,
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
    expect(source).toContain("const fill = isWhiteVariant ? 'rgba(255, 255, 255, 1)' : forming ? FORMING_FILL : (FACTION_FILL[canonicalFaction] ?? 'rgba(90, 90, 100, 1)')");
    expect(source).toContain("const border = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : forming ? FORMING_BORDER : (FACTION_BORDER[canonicalFaction] ?? 'rgba(50, 50, 60, 1)')");
    expect(source).toContain("const symbolColor = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : 'rgba(255, 255, 255, 1)'");
    expect(source).not.toContain('0.92');
});

it('forming counters use a gray fill, dashed border, and explicit label', () => {
    const source = readFileSync('src/ui/map/map/formationIcons.ts', 'utf8');

    expect(source).toContain("const FORMING_FILL = 'rgba(104, 108, 112, 1)'");
    expect(source).toContain('ctx.setLineDash([10, 8])');
    expect(source).toContain("ctx.fillText('FORMING'");
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

it('clamps counter-aware camera padding before fitBounds so MapLibre can fit the canvas', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const helperStart = source.indexOf('function buildCounterAwareCameraPadding');
    const helperEnd = source.indexOf('function stripPmtilesSourcesForCiFallback', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(source).toContain('function clampCameraPaddingForFit');
    expect(source).toContain('const CAMERA_MIN_VISIBLE_BAND');
    expect(helper).toContain('return clampCameraPaddingForFit(');
    expect(helper).toContain('map.getCanvas()');
});

it('selects a real unoccluded horizontal gap before deriving side padding', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const helperStart = source.indexOf('function buildDeckCounterViewportPadding');
    const helperEnd = source.indexOf('const CAMERA_MIN_VISIBLE_BAND', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helper).toContain('let bestGap: [number, number] = [0, 0];');
    expect(helper).not.toContain('let bestGap: [number, number] = [padding.left, mapRect.width - padding.right];');
});

it('falls back to centered camera motion when fitBounds would collapse to a point', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const panEffectStart = source.indexOf('// Prefer pan to a selected formation/navigation anchor');
    const panEffectEnd = source.indexOf('// OSID selection:', panEffectStart);
    const panEffect = source.slice(panEffectStart, panEffectEnd);

    expect(source).toContain('const MIN_CAMERA_BOUNDS_DELTA');
    expect(source).toContain('function fitBoundsOrEaseTo');
    expect(source).toContain('Math.abs(maxLng - minLng) < MIN_CAMERA_BOUNDS_DELTA');
    expect(source).toContain('map.easeTo({ center');
    expect(panEffect.match(/fitBoundsOrEaseTo\(map,/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(panEffect).not.toContain('map.fitBounds(');
});

it('operation map surfaces also guard collapsed fitBounds calls', () => {
    const opsModalSource = readFileSync('src/ui/map/components/ops_modal/OpsMap.tsx', 'utf8');
    const planRendererSource = readFileSync('src/ui/map/components/plan_ui/OpsMapRenderer.ts', 'utf8');

    expect(opsModalSource).toContain('function fitOpsBoundsOrEaseTo');
    expect(opsModalSource).toContain('lngCollapsed || latCollapsed');
    expect(opsModalSource).toContain('fitOpsBoundsOrEaseTo(map, [[minLng, minLat], [maxLng, maxLat]], {');
    expect(opsModalSource).not.toContain('map.fitBounds([[minLng, minLat], [maxLng, maxLat]]');
    expect(planRendererSource).toContain('function fitOpsBoundsOrEaseTo');
    expect(planRendererSource).toContain('fitOpsBoundsOrEaseTo(this.map, bounds, { padding: 60, maxZoom: 12 });');
    expect(planRendererSource).not.toContain('this.map.fitBounds(bounds');
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

it('does not block formation counter rendering on optional ghost-path source readiness', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const gateStart = source.indexOf("const osidSource = m.getSource('osid-control')");
    const gateEnd = source.indexOf('const needsUpdate =', gateStart);
    const gate = source.slice(gateStart, gateEnd);

    expect(gateStart).toBeGreaterThanOrEqual(0);
    expect(gateEnd).toBeGreaterThan(gateStart);
    expect(gate).toContain("m.getSource('osid-control')");
    expect(gate).toContain("m.getSource('front-lines')");
    expect(gate).toContain("m.getSource('formations')");
    expect(gate).toContain("m.getSource('order-arrows')");
    expect(gate).not.toContain('GHOST_PATH_SOURCE_ID');
    expect(source).toContain('safeEnsureSource(m, GHOST_PATH_SOURCE_ID');
});

it('renders DOM formation counters before the front-line rebuild stage', () => {
    const source = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const controlFailure = source.indexOf("console.error('[MapContainer] overlay control failed:'");
    const earlyStage = source.indexOf("awwvFormationCounterStage = 'early-counters'", controlFailure);
    const frontStage = source.indexOf("awwvFormationCounterStage = 'front'", controlFailure);

    expect(controlFailure).toBeGreaterThanOrEqual(0);
    expect(earlyStage).toBeGreaterThan(controlFailure);
    expect(frontStage).toBeGreaterThan(earlyStage);
    const controlToFront = source.slice(controlFailure, frontStage);
    expect(controlToFront).toContain('buildFormationsGeoJSON');
    expect(controlToFront).toContain('renderFormationCounters');
});

it('makes each visible DOM counter an exact accessible interaction target', () => {
    const mapSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const overlaySource = readFileSync('src/ui/map/layers/formationCounterDomOverlay.ts', 'utf8');

    expect(overlaySource).toContain('button.dataset.awwvFormationCounterId = control.item.id');
    expect(overlaySource).toContain("intent: 'exact'");
    expect(overlaySource).toContain('button.dataset.awwvFormationStackOsid');
    expect(overlaySource).not.toContain('container.replaceChildren(...items.map');
    expect(mapSource).toContain('onCounterSelect: (item, intent) => handleFormationCounterSelection(item.id, item.properties, intent)');
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
    expect(mapSource).toContain('const spansHorizontalBand');
    expect(mapSource).toContain('if (spansHorizontalBand && rect.top <= mapRect.top + 96)');
    expect(mapSource).toContain('if (spansHorizontalBand && rect.bottom >= mapRect.bottom - 96)');
    expect(mapSource).toContain('buildDeckCounterViewportPadding(map.getCanvas())');
    expect(mapSource).toContain('buildDeckCounterViewportOccluders(canvas)');
    expect(mapSource).toContain('function buildFormationCounterViewportClip');
    const clipStart = mapSource.indexOf('function buildFormationCounterViewportClip');
    const clipEnd = mapSource.indexOf('export function MapContainer', clipStart);
    const clipSource = mapSource.slice(clipStart, clipEnd);
    expect(clipSource).toContain('padding: buildDeckCounterViewportPadding(canvas)');
    expect(clipSource).not.toContain('buildCounterAwareCameraPadding(map)');
    expect(mapSource).toContain('occluders: buildDeckCounterViewportOccluders(canvas)');
    expect(mapSource).toContain('counterViewportPadding.top');
    expect(mapSource).toContain('window.setTimeout(reapplyAfterLayout, 120)');
    expect(mapSource).toContain('window.setTimeout(reapplyAfterLayout, 320)');
    expect(mapSource).toContain('installFormationCounterOccluderObserver(document.body, reapplyAfterLayout)');
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

it('keeps owned Deck counters visible by clamping them into the current uncluttered map band', () => {
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

it('keeps enemy contact clutter out of the clamped counter band when safe counters already exist', () => {
    const safe = makeFeature('safe', true);
    const underPanelContact = makeEnemyContactFeature('enemy-under-panel', true);
    (underPanelContact.geometry as any).coordinates = [18.8, 44.9];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [safe, underPanelContact],
    } as any;

    const layers = buildTacticalDeckLayers(
        formationsGeoJson,
        false,
        true,
        10,
        ['safe', 'enemy-under-panel'],
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

it('uses an expanded rendered-counter footprint and omits covered top-edge counters', () => {
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

it('does not pull formations hundreds of pixels outside the southern viewport onto the visible edge', () => {
    const safe = makeFeature('safe', true);
    const nearSouth = makeFeature('near-south', true);
    (nearSouth.geometry as any).coordinates = [18.8, 44.9];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [safe, nearSouth],
    } as any;

    const layers = buildTacticalDeckLayers(
        formationsGeoJson,
        false,
        true,
        8,
        [],
        {
            width: 1386,
            height: 837,
            padding: { top: 72, right: 24, bottom: 64, left: 264 },
            project: (coordinates) => coordinates[0] === 17.8 ? { x: 700, y: 300 } : { x: 872, y: 1040 },
        },
    );
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(baseLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['safe']);
});

it('does not relocate an owned counter whose footprint is beyond the southern viewport edge', () => {
    const safe = makeFeature('safe', true);
    const nearSouth = makeFeature('near-south', true);
    (nearSouth.geometry as any).coordinates = [18.8, 44.9];
    const layers = buildTacticalDeckLayers({ type: 'FeatureCollection', features: [safe, nearSouth] } as any, false, true, 8, [], {
        width: 1386,
        height: 837,
        padding: { top: 72, right: 24, bottom: 64, left: 264 },
        project: (coordinates) => coordinates[0] === 17.8 ? { x: 700, y: 300 } : { x: 872, y: 810 },
    });
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(baseLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['safe']);
});

it('filters only counters too far outside the viewport to clamp honestly', () => {
    const nearLeft = makeFeature('near-left', true);
    const farLeft = makeFeature('far-left', true);
    (farLeft.geometry as any).coordinates = [16, 44.1];

    const filtered = filterViewportClampablePointFeatures([nearLeft, farLeft] as any, {
        width: 500,
        height: 360,
        padding: { top: 40, right: 80, bottom: 40, left: 80 },
        project: (coordinates) => coordinates[0] === 17.8 ? { x: 20, y: 160 } : { x: -260, y: 160 },
    }, getCounterFootprintHalfSize(40));

    expect(filtered.map((feature: any) => feature.properties.id)).toEqual(['near-left']);
});

it('does not relocate counters into the safe band when their OSID is outside it', () => {
    const nearLeft = makeFeature('near-left', true);
    const farLeft = makeFeature('far-left', true);
    (farLeft.geometry as any).coordinates = [16, 44.1];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [nearLeft, farLeft],
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
            padding: { top: 40, right: 80, bottom: 40, left: 80 },
            project: (coordinates) => coordinates[0] === 17.8 ? { x: 20, y: 160 } : { x: -260, y: 160 },
        },
    );
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(baseLayer.props.data).toEqual([]);
});

it('does not create DOM counter hit targets away from the formation OSID', () => {
    const nearLeft = makeFeature('near-left', true);
    const farLeft = makeFeature('far-left', true);
    (farLeft.geometry as any).coordinates = [16, 44.1];
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [nearLeft, farLeft],
    } as any;

    const items = buildFormationCounterDomOverlayItems({
        formationsGeoJson,
        formationsVisible: true,
        zoom: 10,
        viewportClip: {
            width: 500,
            height: 360,
            padding: { top: 40, right: 80, bottom: 40, left: 80 },
            project: (coordinates) => coordinates[0] === 17.8 ? { x: 20, y: 160 } : { x: -260, y: 160 },
        },
    });

    expect(items).toEqual([]);
});

it('caps the visible exact-member fan while preserving the full stack count badge', () => {
    const features = Array.from({ length: 20 }, (_, index) => ({
        ...makeFeature(`stack-${index}`, true),
        properties: {
            ...makeFeature(`stack-${index}`, true).properties,
            stack_index: index,
            stack_count: 20,
            is_stack_top: index === 0,
        },
    }));
    const layers = buildTacticalDeckLayers(
        { type: 'FeatureCollection', features } as any,
        false,
        true,
        10,
        [],
        {
            width: 800,
            height: 600,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            project: () => ({ x: 400, y: 350 }),
        },
    );
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const countLayer = layers.find((layer: any) => layer.id === 'deck-formations-stack-text') as any;

    expect(baseLayer.props.data).toHaveLength(12);
    expect(baseLayer.props.data.map((feature: any) => feature.properties.stack_index)).toEqual(
        Array.from({ length: 12 }, (_, index) => index),
    );
    expect(countLayer.props.getText(countLayer.props.data[0])).toBe('20');
});

it('does not expose a clamped owned counter underneath a live UI occluder', () => {
    const covered = makeFeature('covered', true);
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [covered],
    } as any;

    const items = buildFormationCounterDomOverlayItems({
        formationsGeoJson,
        formationsVisible: true,
        zoom: 10,
        viewportClip: {
            width: 500,
            height: 360,
            padding: { top: 20, right: 20, bottom: 20, left: 20 },
            occluders: [{ left: 50, top: 100, right: 120, bottom: 200 }],
            project: () => ({ x: -20, y: 150 }),
        },
    });

    expect(items).toEqual([]);
});

it('drops an entire stack when collision separation would move its final hit targets under UI chrome', () => {
    const stacked = (id: string, osid: string, stackIndex: number) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.8, 44.1] },
        properties: {
            id,
            name: id,
            icon_id: `counter-${id}`,
            location_osid: osid,
            stack_index: stackIndex,
            stack_count: 2,
            is_stack_top: stackIndex === 0,
        },
    });
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            stacked('a1', 'op:test:a', 0),
            stacked('a2', 'op:test:a', 1),
            stacked('b1', 'op:test:b', 0),
            stacked('b2', 'op:test:b', 1),
        ],
    } as any;
    const viewportClip = {
        width: 800,
        height: 600,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        occluders: [{ left: 350, top: 195, right: 450, bottom: 240 }],
        project: () => ({ x: 400, y: 300 }),
    };
    const items = buildFormationCounterDomOverlayItems({
        formationsGeoJson,
        formationsVisible: true,
        zoom: 10,
        viewportClip,
    });
    const layers = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, [], viewportClip);
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(items.map((item) => item.id)).toEqual(['a1', 'a2']);
    expect(baseLayer.props.data.map((feature: any) => feature.properties.id)).toEqual(['a1', 'a2']);
});

it('uses bounded pixel offsets for stacked counters instead of map-coordinate drift', () => {
    const stacked = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.9, 44.2] },
        properties: { id: 'stacked', stack_index: 7, stack_count: 12 },
    };

    expect(getFormationStackPixelOffset(stacked as any, 40)).toEqual([7, -16]);
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
