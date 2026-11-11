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
import { COUNTER_HALO_RGB, INK_TEXT_RGB, PAPER_HALO_RGB } from '../map/mapPaperPalette';
import { getFormationStackPixelOffset } from '../map/clickSelectionPriority';
import { UI_COMMAND_FONT_FAMILY, UI_DATA_FONT_FAMILY } from '../styles/typography';

export { getFormationStackPixelOffset } from '../map/clickSelectionPriority';

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
const COUNTER_EDGE_CLAMP_REACH_PX = 96;
const MAX_VISIBLE_STACK_FAN_MEMBERS = 12;

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

export function selectViewportFormationCounterFeatures(
    features: Feature[],
    clip: DeckViewportClip | null | undefined,
    size: DeckPointHalfSize,
    getPixelOffset: (feature: Feature) => [number, number] = () => [0, 0],
): Feature[] {
    const boundedFanFeatures = features.filter((feature) => {
        const stackIndex = feature.properties?.stack_index;
        return typeof stackIndex !== 'number'
            || Math.max(0, Math.floor(stackIndex)) < MAX_VISIBLE_STACK_FAN_MEMBERS;
    });
    // Only drop counters whose position is off the canvas here. Panels and the safe
    // margin are judged per STACK by filterFinalFormationCounterFeatures, which can nudge
    // a stack clear instead of hiding it; filtering them here per counter removed them
    // before that step could (R8, 2026-11-10).
    if (!clip) return boundedFanFeatures;
    return boundedFanFeatures.filter((feature) => {
        const coordinates = getPointCoordinates(feature);
        const point = coordinates ? clip.project(coordinates) : null;
        if (!point) return false;
        const offset = getPixelOffset(feature);
        const x = point.x + offset[0];
        const y = point.y + offset[1];
        return x >= -size.halfWidth && x <= clip.width + size.halfWidth
            && y >= -size.halfHeight && y <= clip.height + size.halfHeight;
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

export function getCounterFootprintHalfSize(iconHeight: number): DeckPointHalfSize {
    return {
        halfWidth: Math.ceil(iconHeight + COUNTER_EDGE_CLEARANCE_PX),
        halfHeight: Math.ceil(iconHeight / 2 + COUNTER_EDGE_CLEARANCE_PX),
    };
}

export function buildFormationCounterPixelOffsets(
    features: Feature[],
    iconHeight: number,
    clip: DeckViewportClip | null | undefined,
): Map<string, [number, number]> {
    const result = new Map<string, [number, number]>();
    const groups = new Map<string, Feature[]>();
    for (const feature of features) {
        const id = String(feature.properties?.id ?? '');
        if (!id) continue;
        const groupId = typeof feature.properties?.location_osid === 'string'
            ? feature.properties.location_osid
            : `formation:${id}`;
        const group = groups.get(groupId) ?? [];
        group.push(feature);
        groups.set(groupId, group);
    }

    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const candidates = [
        [0, 0], [0, -1.5], [0, 1.5], [-2.25, 0], [2.25, 0],
        [-2.25, -1.5], [2.25, -1.5], [-2.25, 1.5], [2.25, 1.5],
        [0, -3], [0, 3], [-4.5, 0], [4.5, 0],
    ] as const;
    const overlaps = (
        left: { left: number; right: number; top: number; bottom: number },
        right: { left: number; right: number; top: number; bottom: number },
    ) => left.right + 4 > right.left
        && left.left - 4 < right.right
        && left.bottom + 4 > right.top
        && left.top - 4 < right.bottom;

    for (const groupId of [...groups.keys()].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) {
        const group = groups.get(groupId)!
            .sort((left, right) => {
                const leftIndex = Number(left.properties?.stack_index ?? 0);
                const rightIndex = Number(right.properties?.stack_index ?? 0);
                if (leftIndex !== rightIndex) return leftIndex - rightIndex;
                const leftId = String(left.properties?.id ?? '');
                const rightId = String(right.properties?.id ?? '');
                return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
            });
        const top = group[0];
        const coordinates = top?.geometry?.type === 'Point' ? top.geometry.coordinates : null;
        const point = Array.isArray(coordinates)
            && typeof coordinates[0] === 'number'
            && typeof coordinates[1] === 'number'
            ? clip?.project([coordinates[0], coordinates[1]])
            : null;
        if (!point) {
            for (const feature of group) {
                const id = String(feature.properties?.id ?? '');
                if (id) result.set(id, getFormationStackPixelOffset(feature, iconHeight));
            }
            continue;
        }

        const baseOffsets = group.map((feature) => getFormationStackPixelOffset(feature, iconHeight));
        const localLeft = Math.min(...baseOffsets.map(([x]) => x - iconHeight));
        const localRight = Math.max(
            ...baseOffsets.map(([x]) => x + iconHeight),
            Math.round(iconHeight * 0.72) + 12,
        );
        const localTop = Math.min(
            ...baseOffsets.map(([, y]) => y - iconHeight / 2),
            -Math.round(iconHeight * 0.42) - 12,
        );
        const localBottom = Math.max(...baseOffsets.map(([, y]) => y + iconHeight / 2));
        let selected: [number, number] = [0, 0];
        let selectedRect = {
            left: point.x + localLeft,
            right: point.x + localRight,
            top: point.y + localTop,
            bottom: point.y + localBottom,
        };
        for (const [xUnits, yUnits] of candidates) {
            const extra: [number, number] = [Math.round(xUnits * iconHeight), Math.round(yUnits * iconHeight)];
            const rect = {
                left: point.x + localLeft + extra[0],
                right: point.x + localRight + extra[0],
                top: point.y + localTop + extra[1],
                bottom: point.y + localBottom + extra[1],
            };
            const insideViewport = !clip || (
                rect.left >= clip.padding.left
                && rect.right <= clip.width - clip.padding.right
                && rect.top >= clip.padding.top
                && rect.bottom <= clip.height - clip.padding.bottom
            );
            if (insideViewport && !placed.some((other) => overlaps(rect, other))) {
                selected = extra;
                selectedRect = rect;
                break;
            }
        }
        placed.push(selectedRect);
        for (let index = 0; index < group.length; index += 1) {
            const feature = group[index]!;
            const id = String(feature.properties?.id ?? '');
            const base = baseOffsets[index]!;
            if (id) result.set(id, [base[0] + selected[0], base[1] + selected[1]]);
        }
    }
    return result;
}

type Rect = { left: number; right: number; top: number; bottom: number };

const rectsOverlap = (left: Rect, right: Rect) => left.right > right.left
    && left.left < right.right
    && left.bottom > right.top
    && left.top < right.bottom;

/**
 * Keep every stack whose footprint (counters plus stack badge) sits in the safe viewport
 * clear of panels. A stack that touches a panel or the safe edge is first NUDGED as one
 * unit by the smallest shift (at most two counter heights) that clears every panel and
 * stays in the safe viewport; the shift is written into `pixelOffsets` so the caller
 * draws it there. Only a stack that cannot be cleared that way is hidden. Before
 * 2026-11-10 any touch hid the whole stack, so brigades near the inbox, the top bar or
 * the minimap blinked out while mostly in view (R8, owner's ultrawide).
 */
export function filterFinalFormationCounterFeatures(
    features: Feature[],
    pixelOffsets: Map<string, [number, number]>,
    iconHeight: number,
    clip: DeckViewportClip | null | undefined,
): Feature[] {
    if (!clip) return features;
    const groupBroken = new Set<string>();
    const groupFootprint = new Map<string, Rect>();
    // The drawn counters only (no edge clearance): what neighbouring stacks must not overlap.
    const groupCore = new Map<string, Rect>();
    const groupAnchor = new Map<string, { x: number; y: number }>();
    const groupMembers = new Map<string, Array<{ id: string; offset: [number, number] }>>();
    // The rendered counter's full footprint, edge clearance included (the size the
    // viewport filter used before 2026-11-10), so a kept counter never crowds a panel.
    const half = getCounterFootprintHalfSize(iconHeight);
    const groupIdOf = (feature: Feature, id: string) => (typeof feature.properties?.location_osid === 'string'
        ? feature.properties.location_osid
        : `formation:${id}`);

    for (const feature of features) {
        const id = String(feature.properties?.id ?? '');
        const groupId = groupIdOf(feature, id);
        if (groupBroken.has(groupId)) continue;
        const coordinates = getPointCoordinates(feature);
        const point = coordinates ? clip.project(coordinates) : null;
        if (!id || !point) {
            groupBroken.add(groupId);
            continue;
        }
        const offset = pixelOffsets.get(id) ?? getFormationStackPixelOffset(feature, iconHeight);
        const centerX = point.x + offset[0];
        const centerY = point.y + offset[1];
        if (!groupAnchor.has(groupId)) groupAnchor.set(groupId, { x: point.x, y: point.y });
        const footprint = {
            left: centerX - half.halfWidth,
            right: centerX + half.halfWidth,
            top: centerY - half.halfHeight,
            bottom: centerY + half.halfHeight,
        };
        const stackIndex = Number(feature.properties?.stack_index ?? 0);
        const stackCount = Number(feature.properties?.stack_count ?? 1);
        if (stackIndex === 0 && stackCount > 1) {
            const badgeCenterX = centerX + Math.round(iconHeight * 0.72);
            const badgeCenterY = centerY - Math.round(iconHeight * 0.42);
            footprint.left = Math.min(footprint.left, badgeCenterX - 12);
            footprint.right = Math.max(footprint.right, badgeCenterX + 12);
            footprint.top = Math.min(footprint.top, badgeCenterY - 12);
            footprint.bottom = Math.max(footprint.bottom, badgeCenterY + 12);
        }
        const core = {
            left: centerX - iconHeight,
            right: centerX + iconHeight,
            top: centerY - iconHeight / 2,
            bottom: centerY + iconHeight / 2,
        };
        const coreUnion = groupCore.get(groupId);
        groupCore.set(groupId, coreUnion
            ? {
                left: Math.min(coreUnion.left, core.left),
                right: Math.max(coreUnion.right, core.right),
                top: Math.min(coreUnion.top, core.top),
                bottom: Math.max(coreUnion.bottom, core.bottom),
            }
            : core);
        const union = groupFootprint.get(groupId);
        groupFootprint.set(groupId, union
            ? {
                left: Math.min(union.left, footprint.left),
                right: Math.max(union.right, footprint.right),
                top: Math.min(union.top, footprint.top),
                bottom: Math.max(union.bottom, footprint.bottom),
            }
            : footprint);
        const members = groupMembers.get(groupId) ?? [];
        members.push({ id, offset: [offset[0], offset[1]] });
        groupMembers.set(groupId, members);
    }

    const occluders = clip.occluders ?? [];
    const placementOk = (rect: Rect) => rect.left >= clip.padding.left
        && rect.right <= clip.width - clip.padding.right
        && rect.top >= clip.padding.top
        && rect.bottom <= clip.height - clip.padding.bottom
        && !occluders.some((occluder) => rectsOverlap(rect, occluder));
    const shifted = (rect: Rect, dx: number, dy: number): Rect => ({
        left: rect.left + dx, right: rect.right + dx, top: rect.top + dy, bottom: rect.bottom + dy,
    });
    const maxShift = iconHeight * 2;
    const keep = new Set<string>();
    const placed: Rect[] = [];
    // A stack is drawn only when its settlement point itself is in the safe viewport and
    // not under a panel: a counter is never pulled in from a settlement the player cannot see.
    const anchorVisible = (anchor: { x: number; y: number } | undefined) => anchor !== undefined
        && anchor.x >= clip.padding.left && anchor.x <= clip.width - clip.padding.right
        && anchor.y >= clip.padding.top && anchor.y <= clip.height - clip.padding.bottom
        && !occluders.some((occluder) => anchor.x >= occluder.left && anchor.x <= occluder.right
            && anchor.y >= occluder.top && anchor.y <= occluder.bottom);
    const ordered = [...groupFootprint]
        .filter(([groupId]) => !groupBroken.has(groupId) && anchorVisible(groupAnchor.get(groupId)))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const needsNudge: Array<[string, Rect]> = [];
    const coreOf = (groupId: string, fallback: Rect) => groupCore.get(groupId) ?? fallback;
    for (const [groupId, rect] of ordered) {
        if (placementOk(rect)) {
            keep.add(groupId);
            placed.push(coreOf(groupId, rect));
        } else {
            needsNudge.push([groupId, rect]);
        }
    }
    const coversAnchor = (rect: Rect, anchor: { x: number; y: number } | undefined) => anchor !== undefined
        && anchor.x >= rect.left && anchor.x <= rect.right && anchor.y >= rect.top && anchor.y <= rect.bottom;
    for (const [groupId, rect] of needsNudge) {
        const anchor = groupAnchor.get(groupId);
        const core = coreOf(groupId, rect);
        // Candidate shifts: just past each panel edge and each safe-viewport edge, on
        // either axis; take the smallest that clears everything (deterministic order).
        const xs = new Set<number>([0]);
        const ys = new Set<number>([0]);
        for (const occluder of occluders) {
            if (!rectsOverlap(rect, occluder)) continue;
            xs.add(occluder.left - rect.right - 1);
            xs.add(occluder.right - rect.left + 1);
            ys.add(occluder.top - rect.bottom - 1);
            ys.add(occluder.bottom - rect.top + 1);
        }
        xs.add(clip.padding.left - rect.left);
        xs.add(clip.width - clip.padding.right - rect.right);
        ys.add(clip.padding.top - rect.top);
        ys.add(clip.height - clip.padding.bottom - rect.bottom);
        // Also step just past nearby stacks, so a crowded stack can slide beside its
        // neighbours when the space straight off the edge is already taken.
        for (const other of placed) {
            if (other.right < core.left - 2 * maxShift || other.left > core.right + 2 * maxShift) continue;
            if (other.bottom < core.top - 2 * maxShift || other.top > core.bottom + 2 * maxShift) continue;
            xs.add(other.left - core.right - 1);
            xs.add(other.right - core.left + 1);
            ys.add(other.top - core.bottom - 1);
            ys.add(other.bottom - core.top + 1);
        }
        let best: [number, number] | null = null;
        for (const dx of [...xs].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)) {
            for (const dy of [...ys].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)) {
                if (Math.abs(dx) > maxShift || Math.abs(dy) > maxShift) continue;
                const candidate = shifted(rect, dx, dy);
                // A nudged stack must still cover its own settlement (never drawn away from
                // its OSID), clear every panel, and not land on another stack.
                if (!coversAnchor(candidate, anchor)) continue;
                if (!placementOk(candidate)) continue;
                const candidateCore = shifted(core, dx, dy);
                if (placed.some((other) => rectsOverlap(candidateCore, other))) continue;
                if (!best || Math.hypot(dx, dy) < Math.hypot(best[0], best[1])) best = [dx, dy];
            }
        }
        if (!best) continue;
        for (const member of groupMembers.get(groupId) ?? []) {
            pixelOffsets.set(member.id, [member.offset[0] + best[0], member.offset[1] + best[1]]);
        }
        keep.add(groupId);
        placed.push(shifted(core, best[0], best[1]));
    }

    return features.filter((feature) => {
        const id = String(feature.properties?.id ?? '');
        return keep.has(groupIdOf(feature, id));
    });
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
                updateTriggers: { getSize: zoom, getPixelOffset: viewportClip },
            })
        );
    }

    let iconHeight = 40;
    if (zoom <= 6) iconHeight = 16;
    else if (zoom >= 14) iconHeight = 40;
    else {
        if (zoom < 9) iconHeight = 16 + (zoom - 6) * (24 - 16) / 3;
        else if (zoom < 12) iconHeight = 24 + (zoom - 9) * (32 - 24) / 3;
        else iconHeight = 32 + (zoom - 12) * (40 - 32) / 2;
    }

    const iconHalfSize = getCounterFootprintHalfSize(iconHeight);
    const getBaseFormationPixelOffset = (feature: Feature) => getFormationStackPixelOffset(feature, iconHeight);
    const visibleFormationFeatures = formationsVisible
        ? selectViewportFormationCounterFeatures(
            formationsGeoJson.features,
            viewportClip,
            iconHalfSize,
            getBaseFormationPixelOffset,
        )
        : [];
    const formationPixelOffsets = buildFormationCounterPixelOffsets(visibleFormationFeatures, iconHeight, viewportClip);
    const finalVisibleFormationFeatures = filterFinalFormationCounterFeatures(
        visibleFormationFeatures,
        formationPixelOffsets,
        iconHeight,
        viewportClip,
    );
    const getFormationPixelOffset = (feature: Feature): [number, number] => (
        formationPixelOffsets.get(String(feature.properties?.id ?? ''))
        ?? getBaseFormationPixelOffset(feature)
    );
    const highlightedFeatures = highlightedFormationIds.length > 0
        ? getHighlightedFeatures(finalVisibleFormationFeatures, highlightedFormationIdSet)
        : [];
    const stackBadgeFeatures = finalVisibleFormationFeatures.filter((feature) => (
        feature.properties?.is_stack_top === true
        && typeof feature.properties?.stack_count === 'number'
        && feature.properties.stack_count > 1
    ));
    const getStackBadgePixelOffset = (feature: Feature): [number, number] => {
        const counterOffset = getFormationPixelOffset(feature);
        return [
            counterOffset[0] + Math.round(iconHeight * 0.72),
            counterOffset[1] - Math.round(iconHeight * 0.42),
        ];
    };

    layers.push(
        new IconLayer({
            id: 'deck-formations-icons',
            data: finalVisibleFormationFeatures,
            getIcon: (d: any) => ({
                url: getIconDataUrl(getBaseFormationIconId(d)),
                width: 160,
                height: 80,
            }),
            getPosition: (d: any) => d.geometry.coordinates,
            getPixelOffset: getFormationPixelOffset,
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

    // Keep both auto-packed IconLayer owners mounted for the life of the retained
    // Deck overlay. IconManager does not cancel pending image loads when a layer
    // finalizes; removing the transient highlight layer can therefore let a late
    // upload target its deleted atlas texture during dossier -> map -> dossier.
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
            getPixelOffset: getFormationPixelOffset,
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

    if (stackBadgeFeatures.length > 0) {
        layers.push(
            new TextLayer({
                id: 'deck-formations-stack-circle',
                data: stackBadgeFeatures,
                getPosition: (d: any) => d.geometry.coordinates,
                getPixelOffset: getStackBadgePixelOffset,
                getText: () => '\u25cf',
                getSize: Math.max(18, Math.round(iconHeight * 0.58)),
                getColor: [15, 19, 26, 255],
                outlineColor: [...COUNTER_HALO_RGB, 255],
                outlineWidth: 1,
                fontSettings: { sdf: true },
                characterSet: ['\u25cf'],
                fontFamily: UI_DATA_FONT_FAMILY,
                fontWeight: 'bold',
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
                sizeUnits: 'pixels',
                pickable: false,
                parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
                updateTriggers: { getSize: zoom, getPixelOffset: viewportClip },
            }),
            new TextLayer({
                id: 'deck-formations-stack-text',
                data: stackBadgeFeatures,
                getPosition: (d: any) => d.geometry.coordinates,
                getPixelOffset: getStackBadgePixelOffset,
                getText: (d: Feature) => String(d.properties?.stack_count ?? ''),
                getSize: Math.max(10, Math.round(iconHeight * 0.28)),
                getColor: [255, 255, 255, 255],
                fontFamily: UI_DATA_FONT_FAMILY,
                fontWeight: 'bold',
                getTextAnchor: 'middle',
                getAlignmentBaseline: 'center',
                sizeUnits: 'pixels',
                pickable: false,
                parameters: { depthTest: false, depthMask: false, depthWriteEnabled: false, depthCompare: 'always' },
                updateTriggers: { getSize: zoom, getPixelOffset: viewportClip },
            }),
        );
    }

    return layers;
}
