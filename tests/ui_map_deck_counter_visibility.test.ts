import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
    buildTacticalDeckLayers,
    getBaseFormationIconId,
    getHighlightedFormationIconId,
    getFormationStackPixelOffset,
    isStackBadgeRow,
} from '../src/ui/map/layers/buildTacticalDeckLayers.js';
import { buildFormationCounterDomOverlayItems } from '../src/ui/map/layers/formationCounterDomOverlay.js';
import {
    STACK_CASCADE_MAX,
    STACK_MAX_SHIFT_X,
    STACK_MAX_SHIFT_Y,
    getStackBadgeDiameter,
    layoutFormationCounters,
} from '../src/ui/map/layers/formationCounterLayout.js';

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

it('keeps auto-packed formation icon atlas owners mounted across focus and visibility transitions', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [makeFeature('b_focus', true)],
    } as any;
    const iconLayerIds = (layers: any[]) => layers
        .filter((layer: any) => layer.id.startsWith('deck-formations-') && layer.constructor.layerName === 'IconLayer')
        .map((layer: any) => layer.id);

    const focused = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, ['b_focus']);
    const cleared = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, []);
    const hidden = buildTacticalDeckLayers(formationsGeoJson, false, false, 10, []);

    expect(iconLayerIds(focused)).toEqual(['deck-formations-icons', 'deck-formations-highlighted']);
    expect(iconLayerIds(cleared)).toEqual(iconLayerIds(focused));
    expect(iconLayerIds(hidden)).toEqual(iconLayerIds(focused));
    expect(cleared.find((layer: any) => layer.id === 'deck-formations-highlighted')?.props.data).toEqual([]);
    expect(hidden.find((layer: any) => layer.id === 'deck-formations-icons')?.props.data).toEqual([]);
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

    const palette = readFileSync('src/ui/map/map/mapPaperPalette.ts', 'utf8');

    // The halo and body inks are owned by the paper palette; the painter reads them.
    expect(palette).toContain('export const COUNTER_HALO_RGB: Rgb = [235, 225, 205]');
    expect(palette).toContain('haloFill: rgbaString(COUNTER_HALO_RGB, 0.98)');
    expect(palette).toContain("haloBorder: 'rgba(18, 14, 10, 0.72)'");
    expect(source).toContain('ctx.fillStyle = COUNTER_PRINT.haloFill');
    expect(source).toContain('ctx.strokeStyle = COUNTER_PRINT.haloBorder');
    expect(source).toContain('roundedRect(ctx, 0, 0, ICON_WIDTH, ICON_HEIGHT, CORNER_RADIUS + 4)');
    expect(source).toContain('roundedRect(ctx, COUNTER_BODY_X, COUNTER_BODY_Y, COUNTER_BODY_WIDTH, COUNTER_BODY_HEIGHT, CORNER_RADIUS)');
    // Faction bodies are fully opaque projections of the canonical palette (alpha 1).
    expect(source).toContain("const fill = isWhiteVariant ? 'rgba(255, 255, 255, 1)' : forming ? COUNTER_PRINT.formingFill : rgbaString(factionInk(canonicalFaction), 1)");
    expect(source).toContain("const border = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : forming ? COUNTER_PRINT.formingBorder : rgbaString(factionBorderInk(canonicalFaction), 1)");
    expect(source).toContain("const symbolColor = isWhiteVariant ? 'rgba(20, 20, 20, 1)' : COUNTER_PRINT.symbol");
    expect(palette).toContain("symbol: 'rgba(240, 232, 214, 1)'");
    expect(source).not.toContain('0.92');
});

it('forming counters use a gray fill, dashed border, and explicit label', () => {
    const source = readFileSync('src/ui/map/map/formationIcons.ts', 'utf8');
    const palette = readFileSync('src/ui/map/map/mapPaperPalette.ts', 'utf8');

    expect(palette).toContain("formingFill: 'rgba(104, 108, 112, 1)'");
    expect(source).toContain('forming ? COUNTER_PRINT.formingFill');
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

it('the retained operation map guards collapsed fitBounds calls', () => {
    const opsModalSource = readFileSync('src/ui/map/components/ops_modal/OpsMap.tsx', 'utf8');

    expect(opsModalSource).toContain('function fitOpsBoundsOrEaseTo');
    expect(opsModalSource).toContain('lngCollapsed || latCollapsed');
    expect(opsModalSource).toContain('fitOpsBoundsOrEaseTo(map, [[minLng, minLat], [maxLng, maxLat]], {');
    expect(opsModalSource).not.toContain('map.fitBounds([[minLng, minLat], [maxLng, maxLat]]');
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
    const inboxSource = readFileSync('src/ui/map/components/PresidentialInbox.tsx', 'utf8');

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
    expect(inboxSource).toContain('data-awwv-counter-occluder="true"');
});

// ---------------------------------------------------------------------------------------
// Counter layout (R8 rework, 2026-11-10): one layout pass feeds the Deck icon layer and
// the DOM hit targets; badges are rows of the same icon layer, painted after their own
// counter; a stack never leaves its settlement and never draws under a panel.
// ---------------------------------------------------------------------------------------

type Clip = Parameters<typeof layoutFormationCounters>[2];

function stackFeature(id: string, osid: string, stackIndex: number, stackCount: number, coordinates: [number, number] = [17.8, 44.1], extra: Record<string, unknown> = {}) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates },
        properties: {
            id,
            name: id,
            icon_id: `brigade__RBiH__h100__m100_${id}`,
            white_icon_id: `white__brigade__RBiH__h100__m100_${id}`,
            location_osid: osid,
            stack_index: stackIndex,
            stack_count: stackCount,
            is_stack_top: stackIndex === 0,
            ...extra,
        },
    } as any;
}

function bodyCovers(item: { x: number; y: number; width: number; height: number }, point: { x: number; y: number }) {
    const inset = item.height * 0.075;
    return point.x >= item.x - item.width / 2 + inset && point.x <= item.x + item.width / 2 - inset
        && point.y >= item.y - item.height / 2 + inset && point.y <= item.y + item.height / 2 - inset;
}

it('paints each stack badge in the counter icon layer right after its own top counter', () => {
    const features = [
        stackFeature('a1', 'op:t:a', 0, 3),
        stackFeature('a2', 'op:t:a', 1, 3),
        stackFeature('a3', 'op:t:a', 2, 3),
    ];
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: () => ({ x: 400, y: 300 }) };
    const layers = buildTacticalDeckLayers({ type: 'FeatureCollection', features } as any, false, true, 10, [], clip);
    const icons = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(layers.some((layer: any) => /stack-(circle|text)/.test(layer.id))).toBe(false);
    const rows = icons.props.data;
    expect(rows.map((row: any) => (isStackBadgeRow(row) ? `badge:${row.properties.stack_count}` : row.properties.id)))
        .toEqual(['a3', 'a2', 'a1', 'badge:3']);
    // The badge sits on the top counter's corner, mostly inside its body.
    const top = icons.props.getPixelOffset(rows[2]);
    const badge = icons.props.getPixelOffset(rows[3]);
    const h = icons.props.getSize(rows[2]);
    expect(Math.abs(badge[0] - top[0])).toBeLessThan(h);
    expect(Math.abs(badge[1] - top[1])).toBeLessThan(h / 2);
    expect(icons.props.getSize(rows[3])).toBe(getStackBadgeDiameter(h));
});

it('keeps every stack top over its own settlement while separating neighbours', () => {
    const features = [
        stackFeature('a', 'op:t:a', 0, 1, [17.8, 44.1]),
        stackFeature('b', 'op:t:b', 0, 1, [17.81, 44.1]),
        stackFeature('c', 'op:t:c', 0, 1, [17.82, 44.1]),
    ];
    const points: Record<number, { x: number; y: number }> = { 17.8: { x: 400, y: 300 }, 17.81: { x: 418, y: 302 }, 17.82: { x: 400, y: 318 } };
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: (c) => points[c[0]] };
    const items = buildFormationCounterDomOverlayItems({ formationsGeoJson: { type: 'FeatureCollection', features } as any, formationsVisible: true, zoom: 8, viewportClip: clip });

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
        const feature = features.find((candidate) => candidate.properties.id === item.id);
        expect(bodyCovers(item, points[feature.geometry.coordinates[0]]), `${item.id} off its settlement`).toBe(true);
    }
});

it('never shifts a stack farther than the layout limits', () => {
    const h = 24;
    const crowd = Array.from({ length: 9 }, (_, index) => stackFeature(`s${index}`, `op:t:${index}`, 0, 1, [17 + index / 100, 44]));
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: (c) => ({ x: 400 + (c[0] - 17) * 300, y: 300 }) };
    const layout = layoutFormationCounters(crowd, h, clip);
    for (const stack of layout.stacks) {
        expect(Math.abs(stack.shift[0])).toBeLessThanOrEqual(Math.round(h * STACK_MAX_SHIFT_X));
        expect(Math.abs(stack.shift[1])).toBeLessThanOrEqual(Math.round(h * STACK_MAX_SHIFT_Y));
    }
    // Every unit is drawn or carried by a drawn stack's badge.
    expect(layout.stacks.reduce((sum, stack) => sum + stack.count, 0)).toBe(9);
});

it('merges a same-side stack it would bury into its neighbour badge instead of hiding it', () => {
    const features = [
        stackFeature('a1', 'op:t:a', 0, 2),
        stackFeature('a2', 'op:t:a', 1, 2),
        stackFeature('b1', 'op:t:b', 0, 1),
    ];
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: () => ({ x: 400, y: 300 }) };
    const layout = layoutFormationCounters(features, 24, clip);

    expect(layout.stacks).toHaveLength(1);
    expect(layout.stacks[0]?.osid).toBe('op:t:a');
    expect(layout.stacks[0]?.count).toBe(3);
    expect(layout.stacks[0]?.badge?.count).toBe(3);
    expect(layout.stacks[0]?.mergedOsids).toEqual(['op:t:b']);
});

it('never merges opposing sides and paints the player\'s own stack above a contact', () => {
    const features = [
        stackFeature('own', 'op:t:a', 0, 1),
        stackFeature('enemy_contact:op:t:b:0', 'op:t:b', 0, 1, [17.8, 44.1], { kind: 'enemy_contact', is_enemy_contact: true }),
    ];
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: () => ({ x: 400, y: 300 }) };
    const layout = layoutFormationCounters(features, 24, clip);

    expect(layout.stacks.map((stack) => stack.side)).toEqual(['contact', 'own']);
});

it('hides a stack whose settlement is under a panel and never pulls one in from off-canvas', () => {
    const features = [
        stackFeature('covered', 'op:t:a', 0, 1, [17.8, 44.1]),
        stackFeature('offscreen', 'op:t:b', 0, 1, [16, 44.1]),
        stackFeature('visible', 'op:t:c', 0, 1, [18.5, 44.1]),
    ];
    const clip: Clip = {
        width: 800,
        height: 600,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        occluders: [{ left: 0, top: 0, right: 300, bottom: 600 }],
        project: (c) => (c[0] === 17.8 ? { x: 150, y: 300 } : c[0] === 16 ? { x: -30, y: 300 } : { x: 600, y: 300 }),
    };
    const items = buildFormationCounterDomOverlayItems({ formationsGeoJson: { type: 'FeatureCollection', features } as any, formationsVisible: true, zoom: 10, viewportClip: clip });

    expect(items.map((item) => item.id)).toEqual(['visible']);
});

it('nudges a stack clear of a panel it grazes while still covering its settlement', () => {
    const grazing = stackFeature('grazing', 'op:t:a', 0, 1);
    const clip: Clip = {
        width: 800,
        height: 600,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        occluders: [{ left: 430, top: 0, right: 800, bottom: 600 }],
        project: () => ({ x: 410, y: 300 }),
    };
    const items = buildFormationCounterDomOverlayItems({ formationsGeoJson: { type: 'FeatureCollection', features: [grazing] } as any, formationsVisible: true, zoom: 10, viewportClip: clip });

    expect(items.map((item) => item.id)).toEqual(['grazing']);
    expect((items[0]?.x ?? NaN) + (items[0]?.width ?? NaN) / 2).toBeLessThanOrEqual(430);
    expect(bodyCovers(items[0] ?? { x: NaN, y: NaN, width: 0, height: 0 }, { x: 410, y: 300 })).toBe(true);
});

it('hides a stack whole when its settlement hugs a panel too closely to clear it', () => {
    const tight = stackFeature('tight', 'op:t:a', 0, 1);
    const clip: Clip = {
        width: 800,
        height: 600,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        occluders: [{ left: 402, top: 0, right: 800, bottom: 600 }],
        project: () => ({ x: 400, y: 300 }),
    };
    const layout = layoutFormationCounters([tight], 24, clip);

    expect(layout.stacks).toEqual([]);
    expect(layout.blockedOsids).toEqual(['op:t:a']);
});

it('caps the drawn cascade and carries the rest in the badge count', () => {
    const features = Array.from({ length: 20 }, (_, index) => stackFeature(`stack-${String(index).padStart(2, '0')}`, 'op:t:big', index, 20));
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: () => ({ x: 400, y: 350 }) };
    const layers = buildTacticalDeckLayers({ type: 'FeatureCollection', features } as any, false, true, 10, [], clip);
    const icons = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const counters = icons.props.data.filter((row: any) => !isStackBadgeRow(row));
    const badges = icons.props.data.filter((row: any) => isStackBadgeRow(row));

    expect(counters).toHaveLength(STACK_CASCADE_MAX);
    expect(counters[counters.length - 1].properties.id).toBe('stack-00');
    expect(badges.map((row: any) => row.properties.stack_count)).toEqual([20]);
});

it('uses bounded up-left cascade offsets for stacked counters', () => {
    const member = (stackIndex: number) => ({ properties: { id: 'm', stack_index: stackIndex, stack_count: 12 } });
    expect(getFormationStackPixelOffset(member(0) as any, 40)).toEqual([0, 0]);
    expect(getFormationStackPixelOffset(member(1) as any, 40)).toEqual([-5, -5]);
    expect(getFormationStackPixelOffset(member(2) as any, 40)).toEqual([-10, -10]);
    // Past the cascade: under the top counter, carried by the badge.
    expect(getFormationStackPixelOffset(member(7) as any, 40)).toEqual([0, 0]);
});

it('keeps DOM hit targets on the drawn counters and transparent once Deck paints them', () => {
    const features = [stackFeature('a1', 'op:t:a', 0, 2), stackFeature('a2', 'op:t:a', 1, 2)];
    const clip: Clip = { width: 800, height: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, project: () => ({ x: 400, y: 300 }) };
    const layers = buildTacticalDeckLayers({ type: 'FeatureCollection', features } as any, false, true, 10, [], clip);
    const icons = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const items = buildFormationCounterDomOverlayItems({ formationsGeoJson: { type: 'FeatureCollection', features } as any, formationsVisible: true, zoom: 10, viewportClip: clip });

    for (const item of items) {
        const row = icons.props.data.find((candidate: any) => !isStackBadgeRow(candidate) && candidate.properties.id === item.id);
        const offset = icons.props.getPixelOffset(row);
        expect([item.x, item.y]).toEqual([400 + offset[0], 300 + offset[1]]);
    }
    const top = items.find((item) => item.id === 'a1');
    const badgeRow = icons.props.data.find((row: any) => isStackBadgeRow(row));
    const badgeOffset = icons.props.getPixelOffset(badgeRow);
    expect(top?.badge).toEqual({ x: 400 + badgeOffset[0], y: 300 + badgeOffset[1], diameter: icons.props.getSize(badgeRow) });

    const overlaySource = readFileSync('src/ui/map/layers/formationCounterDomOverlay.ts', 'utf8');
    expect(overlaySource).toContain("badge.style.opacity = args.visualMode === 'fallback' ? '1' : '0'");
});

it('settlement labels stay on their settlement instead of sliding away from panels', () => {
    const source = readFileSync('src/ui/map/layers/buildTacticalDeckLayers.ts', 'utf8');
    const labelStart = source.indexOf("id: 'deck-settlement-labels'");
    const labelBlock = source.slice(labelStart, source.indexOf('})', labelStart));
    expect(labelBlock).not.toContain('getPixelOffset');
});
