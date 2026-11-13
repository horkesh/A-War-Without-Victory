/**
 * One layout pass for tactical-map unit counters (R8, 2026-11-10 rework).
 *
 * Every consumer — the Deck icon layer that paints counters and stack badges, the DOM
 * hit-target overlay, and click picking — reads the SAME `FormationCounterLayout`, so a
 * badge can never be drawn, moved or hidden apart from its counter.
 *
 * Rules (the owner's readability bar):
 * - A stack is the set of counters at one settlement (`location_osid`). It draws as a short
 *   cascade (at most STACK_CASCADE_MAX counters, each step up-left behind the top counter)
 *   plus a count badge printed on the top counter's top-right corner. Members past the
 *   cascade are carried by the badge count, never silently dropped.
 * - Its top counter always covers its settlement point: a stack may shift at most
 *   0.85 counter-height sideways and 0.4 counter-height up or down to clear panels,
 *   screen edges and neighbouring stacks, and every drawn cascade counter must still
 *   cover the settlement point. No leader lines, no relocation.
 * - A stack is drawn only when its settlement point is on the canvas and not under a
 *   panel (`[data-awwv-counter-occluder]`); a stack that still touches a panel or the
 *   edge after the allowed shift (and after collapsing its cascade) is hidden whole —
 *   never a sliver.
 * - Neighbouring stacks are separated within the shift limits. A stack that would still
 *   bury more than MAX_SHARED_OVERLAP of a same-side neighbour joins that neighbour
 *   (its units are added to the neighbour's badge count) instead of drawing over it.
 *   Opposing sides never merge; the player's own stacks are drawn above contacts.
 * - Draw order is low priority first, so higher-priority stacks paint on top, and inside
 *   a stack the cascade paints first and the top counter (then its badge) last.
 */
import type { Feature } from 'geojson';

export type CounterRect = { left: number; top: number; right: number; bottom: number };

export type CounterViewportClip = {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    occluders?: CounterRect[];
    project: (coordinates: [number, number]) => { x: number; y: number } | null | undefined;
};

export const STACK_CASCADE_MAX = 3;
/** Largest stack shift, in counter heights, that still keeps the top counter over its settlement. */
export const STACK_MAX_SHIFT_X = 0.85;
export const STACK_MAX_SHIFT_Y = 0.4;
/** Share of a neighbour's top counter a stack may cover before it joins that neighbour instead. */
export const MAX_SHARED_OVERLAP = 0.3;
const EDGE_MARGIN_PX = 4;
const STACK_GAP_PX = 2;

export type PlacedCounter = {
    feature: Feature;
    id: string;
    /** Pixel offset from the settlement point (the feature's own coordinates). */
    offset: [number, number];
    role: 'stack-top' | 'stack-member';
};

export type PlacedStackBadge = {
    /** Pixel offset of the badge centre from the settlement point. */
    offset: [number, number];
    diameter: number;
    count: number;
};

export type PlacedStack = {
    key: string;
    osid: string | null;
    side: 'own' | 'contact';
    /** Counters in paint order: cascade members first, top counter last. */
    counters: PlacedCounter[];
    top: Feature;
    /** Units this stack stands for: its own members plus any stacks merged into it. */
    count: number;
    mergedOsids: string[];
    badge: PlacedStackBadge | null;
    /** Settlement point in screen pixels (null without a viewport). */
    anchor: { x: number; y: number } | null;
    shift: [number, number];
};

export type FormationCounterLayout = {
    iconHeight: number;
    /** Drawn stacks in paint order (lowest priority first). */
    stacks: PlacedStack[];
    /** Stacks whose settlement is visible but that could not be drawn clear of panels/edges. */
    blockedOsids: string[];
};

export function getStackCascadeStep(iconHeight: number): number {
    return Math.max(2, Math.round(iconHeight * 0.12));
}

export function getStackBadgeDiameter(iconHeight: number): number {
    return Math.min(19, Math.max(13, Math.round(iconHeight * 0.62)));
}

/** Badge centre relative to the top counter's centre: on its top-right corner, mostly inside the body. */
export function getStackBadgeOffset(iconHeight: number): [number, number] {
    const diameter = getStackBadgeDiameter(iconHeight);
    return [Math.round(iconHeight - diameter * 0.45), Math.round(-iconHeight / 2 + diameter * 0.45)];
}

/** Cascade offset of a stack member relative to the top counter (slot 0 = top). */
export function getStackCascadeOffset(slot: number, iconHeight: number): [number, number] {
    if (slot <= 0) return [0, 0];
    const step = getStackCascadeStep(iconHeight);
    return [-slot * step, -slot * step];
}

function strictCompare(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function pointOf(feature: Feature): [number, number] | null {
    if (feature.geometry?.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
        return null;
    }
    return [coordinates[0], coordinates[1]];
}

function idOf(feature: Feature): string {
    return String(feature.properties?.id ?? '');
}

function isContact(feature: Feature): boolean {
    return feature.properties?.is_enemy_contact === true || feature.properties?.kind === 'enemy_contact';
}

const overlapArea = (a: CounterRect, b: CounterRect) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

const rectsTouch = (a: CounterRect, b: CounterRect) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

const shiftRect = (rect: CounterRect, dx: number, dy: number): CounterRect => ({
    left: rect.left + dx, right: rect.right + dx, top: rect.top + dy, bottom: rect.bottom + dy,
});

type Group = { key: string; osid: string | null; members: Feature[]; side: 'own' | 'contact' };

function groupStacks(features: readonly Feature[]): Group[] {
    const groups = new Map<string, Feature[]>();
    for (const feature of features) {
        const id = idOf(feature);
        if (!id || !pointOf(feature)) continue;
        const osid = typeof feature.properties?.location_osid === 'string' ? feature.properties.location_osid : null;
        const key = osid ?? `formation:${id}`;
        const group = groups.get(key) ?? [];
        group.push(feature);
        groups.set(key, group);
    }
    return [...groups.entries()].map(([key, members]) => {
        // Own units before contacts, then the builder's stack order, then id.
        members.sort((left, right) => {
            const contactDelta = Number(isContact(left)) - Number(isContact(right));
            if (contactDelta !== 0) return contactDelta;
            const leftIndex = Number(left.properties?.stack_index ?? 0);
            const rightIndex = Number(right.properties?.stack_index ?? 0);
            if (leftIndex !== rightIndex) return leftIndex - rightIndex;
            return strictCompare(idOf(left), idOf(right));
        });
        const top = members[0] as Feature;
        return {
            key,
            osid: typeof top.properties?.location_osid === 'string' ? top.properties.location_osid : null,
            members,
            side: isContact(top) ? 'contact' as const : 'own' as const,
        };
    });
}

/** Placement priority: the player's own stacks first, then bigger stacks, then settlement id. */
function comparePriority(left: Group, right: Group): number {
    if (left.side !== right.side) return left.side === 'own' ? -1 : 1;
    if (left.members.length !== right.members.length) return right.members.length - left.members.length;
    return strictCompare(left.key, right.key);
}

/** Footprint of a stack around its top counter centre (0,0): drawn counters plus badge. */
function stackFootprint(shown: number, count: number, iconHeight: number): { all: CounterRect; top: CounterRect } {
    const top = { left: -iconHeight, right: iconHeight, top: -iconHeight / 2, bottom: iconHeight / 2 };
    const all = { ...top };
    for (let slot = 1; slot < shown; slot += 1) {
        const [x, y] = getStackCascadeOffset(slot, iconHeight);
        all.left = Math.min(all.left, x - iconHeight);
        all.top = Math.min(all.top, y - iconHeight / 2);
    }
    if (count > 1) {
        const [bx, by] = getStackBadgeOffset(iconHeight);
        const radius = getStackBadgeDiameter(iconHeight) / 2;
        all.right = Math.max(all.right, bx + radius);
        all.top = Math.min(all.top, by - radius);
    }
    return { all, top };
}

function buildPlacedStack(
    group: Group,
    shown: number,
    count: number,
    iconHeight: number,
    anchor: { x: number; y: number } | null,
    shift: [number, number],
): PlacedStack {
    const top = group.members[0] as Feature;
    const counters: PlacedCounter[] = [];
    for (let slot = shown - 1; slot >= 0; slot -= 1) {
        const feature = group.members[slot] as Feature;
        const [cx, cy] = getStackCascadeOffset(slot, iconHeight);
        counters.push({
            feature,
            id: idOf(feature),
            offset: [cx + shift[0], cy + shift[1]],
            role: slot === 0 ? 'stack-top' : 'stack-member',
        });
    }
    const [bx, by] = getStackBadgeOffset(iconHeight);
    return {
        key: group.key,
        osid: group.osid,
        side: group.side,
        counters,
        top,
        count,
        mergedOsids: [],
        badge: count > 1 ? { offset: [bx + shift[0], by + shift[1]], diameter: getStackBadgeDiameter(iconHeight), count } : null,
        anchor,
        shift,
    };
}

/** True when every drawn counter of the stack (top and cascade) still covers the settlement point. */
function everyShownCounterCoversAnchor(shown: number, dx: number, dy: number, iconHeight: number): boolean {
    const inset = iconHeight * 0.075;
    const halfWidth = iconHeight - inset - 1;
    const halfHeight = iconHeight / 2 - inset - 1;
    for (let slot = 0; slot < shown; slot += 1) {
        const [cx, cy] = getStackCascadeOffset(slot, iconHeight);
        if (Math.abs(dx + cx) > halfWidth || Math.abs(dy + cy) > halfHeight) return false;
    }
    return true;
}

function shiftCandidates(iconHeight: number, around: CounterRect, blockers: CounterRect[], safe: CounterRect): Array<[number, number]> {
    const maxX = Math.round(iconHeight * STACK_MAX_SHIFT_X);
    const maxY = Math.round(iconHeight * STACK_MAX_SHIFT_Y);
    const xs = new Set<number>([0, maxX, -maxX, Math.round(maxX / 2), -Math.round(maxX / 2)]);
    const ys = new Set<number>([0, maxY, -maxY, Math.round(maxY / 2), -Math.round(maxY / 2)]);
    // Exact shifts that just clear each nearby blocker and each safe edge.
    for (const blocker of blockers) {
        xs.add(Math.ceil(blocker.right - around.left + STACK_GAP_PX));
        xs.add(Math.floor(blocker.left - around.right - STACK_GAP_PX));
        ys.add(Math.ceil(blocker.bottom - around.top + STACK_GAP_PX));
        ys.add(Math.floor(blocker.top - around.bottom - STACK_GAP_PX));
    }
    xs.add(Math.ceil(safe.left - around.left));
    xs.add(Math.floor(safe.right - around.right));
    ys.add(Math.ceil(safe.top - around.top));
    ys.add(Math.floor(safe.bottom - around.bottom));
    const candidates: Array<[number, number]> = [];
    for (const dx of xs) {
        if (Math.abs(dx) > maxX) continue;
        for (const dy of ys) {
            if (Math.abs(dy) > maxY) continue;
            candidates.push([dx, dy]);
        }
    }
    candidates.sort((a, b) => (Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1])) || (a[0] - b[0]) || (a[1] - b[1]));
    return candidates;
}

/**
 * Lay out every counter stack for one camera. `features` are the player-visible
 * formation features (fog already applied by the builder). Without a viewport each stack
 * sits on its settlement with no separation (tests, pre-map renders).
 */
export function layoutFormationCounters(
    features: readonly Feature[],
    iconHeight: number,
    clip: CounterViewportClip | null | undefined,
): FormationCounterLayout {
    const groups = groupStacks(features).sort(comparePriority);
    if (!clip) {
        const stacks = groups.map((group) => {
            const shown = Math.min(group.members.length, STACK_CASCADE_MAX);
            return buildPlacedStack(group, shown, group.members.length, iconHeight, null, [0, 0]);
        });
        return { iconHeight, stacks: stacks.reverse(), blockedOsids: [] };
    }

    const occluders = clip.occluders ?? [];
    const safe: CounterRect = {
        left: EDGE_MARGIN_PX,
        top: EDGE_MARGIN_PX,
        right: clip.width - EDGE_MARGIN_PX,
        bottom: clip.height - EDGE_MARGIN_PX,
    };
    const insideSafe = (rect: CounterRect) => rect.left >= safe.left && rect.right <= safe.right
        && rect.top >= safe.top && rect.bottom <= safe.bottom;
    const clearOfPanels = (rect: CounterRect) => !occluders.some((occluder) => rectsTouch(rect, occluder));
    const anchorVisible = (point: { x: number; y: number }) => point.x >= 0 && point.x <= clip.width
        && point.y >= 0 && point.y <= clip.height
        && !occluders.some((o) => point.x >= o.left && point.x <= o.right && point.y >= o.top && point.y <= o.bottom);

    type Placed = { stack: PlacedStack; all: CounterRect; top: CounterRect; badge: CounterRect; side: 'own' | 'contact' };
    const placed: Placed[] = [];
    const blockedOsids: string[] = [];
    const [badgeX, badgeY] = getStackBadgeOffset(iconHeight);
    const badgeRadius = getStackBadgeDiameter(iconHeight) / 2;
    const badgeLocal: CounterRect = {
        left: badgeX - badgeRadius, right: badgeX + badgeRadius, top: badgeY - badgeRadius, bottom: badgeY + badgeRadius,
    };
    const badgeArea = (2 * badgeRadius) ** 2;

    for (const group of groups) {
        const coordinates = pointOf(group.members[0] as Feature);
        const anchor = coordinates ? clip.project(coordinates) : null;
        if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) || !anchorVisible(anchor)) continue;

        const count = group.members.length;
        let chosen: { shift: [number, number]; shown: number; all: CounterRect; top: CounterRect; worstShare: number } | null = null;
        let mergeTarget: Placed | null = null;
        // Try the full cascade first, then the top counter alone (smaller footprint near panels).
        const cascadeOptions = [...new Set([Math.min(count, STACK_CASCADE_MAX), 1])];
        for (const shown of cascadeOptions) {
            // Always reserve the badge corner: a later merge can give a lone counter a badge.
            const local = stackFootprint(shown, Math.max(2, count), iconHeight);
            const around = shiftRect(local.all, anchor.x, anchor.y);
            const reach = iconHeight * 3;
            const nearby = placed.filter((other) => other.all.right > around.left - reach && other.all.left < around.right + reach
                && other.all.bottom > around.top - reach && other.all.top < around.bottom + reach);
            const blockers = [...occluders, ...nearby.map((other) => other.all)];
            let best: { shift: [number, number]; cost: number; worstShare: number; worstNeighbour: Placed | null } | null = null;
            for (const [dx, dy] of shiftCandidates(iconHeight, around, blockers, safe)) {
                if (!everyShownCounterCoversAnchor(shown, dx, dy, iconHeight)) continue;
                const all = shiftRect(around, dx, dy);
                if (!insideSafe(all) || !clearOfPanels(all)) continue;
                const top = shiftRect(local.top, anchor.x + dx, anchor.y + dy);
                let cost = 0;
                let worstShare = 0;
                let worstNeighbour: Placed | null = null;
                for (const other of nearby) {
                    const area = overlapArea(all, other.all);
                    if (area <= 0) continue;
                    cost += area;
                    const otherTopArea = (other.top.right - other.top.left) * (other.top.bottom - other.top.top);
                    const ownTopArea = (top.right - top.left) * (top.bottom - top.top);
                    let share = Math.max(overlapArea(all, other.top) / otherTopArea, overlapArea(top, other.all) / ownTopArea);
                    // A covered count badge is as unreadable as a covered counter.
                    if (other.stack.count > 1) share = Math.max(share, overlapArea(all, other.badge) / badgeArea);
                    if (count > 1) share = Math.max(share, overlapArea(shiftRect(badgeLocal, anchor.x + dx, anchor.y + dy), other.all) / badgeArea);
                    if (share > worstShare) {
                        worstShare = share;
                        worstNeighbour = other;
                    }
                }
                if (!best || cost < best.cost) best = { shift: [dx, dy], cost, worstShare, worstNeighbour };
                if (cost === 0) break;
            }
            if (!best) continue;
            if (best.worstShare > MAX_SHARED_OVERLAP && best.worstNeighbour) {
                if (best.worstNeighbour.side === group.side) {
                    mergeTarget = best.worstNeighbour;
                    break;
                }
                // Opposing sides never share a badge. A stack that would bury (or be buried
                // by) an opposing stack joins its nearest same-side stack within three counter
                // heights instead; with none that close it is drawn with the least overlap.
                const anchorPoint = anchor;
                const sameSide = placed
                    .filter((other) => other.side === group.side && other.stack.anchor)
                    .map((other) => ({
                        other,
                        distance: Math.hypot(
                            (other.top.left + other.top.right) / 2 - anchorPoint.x,
                            (other.top.top + other.top.bottom) / 2 - anchorPoint.y,
                        ),
                    }))
                    .filter((entry) => entry.distance <= iconHeight * 3)
                    .sort((a, b) => a.distance - b.distance || strictCompare(a.other.stack.key, b.other.stack.key));
                if (sameSide[0]) {
                    mergeTarget = sameSide[0].other;
                    break;
                }
            }
            const option = {
                shift: best.shift,
                shown,
                all: shiftRect(around, best.shift[0], best.shift[1]),
                top: shiftRect(local.top, anchor.x + best.shift[0], anchor.y + best.shift[1]),
                worstShare: best.worstShare,
            };
            if (!chosen || option.worstShare < chosen.worstShare) chosen = option;
            // Still burying an opposing stack: see whether the top counter alone fits better.
            if (option.worstShare <= MAX_SHARED_OVERLAP) break;
        }

        if (mergeTarget) {
            const target = mergeTarget.stack;
            target.count += count;
            if (group.osid) target.mergedOsids.push(group.osid);
            const [bx, by] = getStackBadgeOffset(iconHeight);
            target.badge = {
                offset: [bx + target.shift[0], by + target.shift[1]],
                diameter: getStackBadgeDiameter(iconHeight),
                count: target.count,
            };
            continue;
        }
        if (!chosen) {
            if (group.osid) blockedOsids.push(group.osid);
            continue;
        }
        const stack = buildPlacedStack(group, chosen.shown, count, iconHeight, anchor, chosen.shift);
        placed.push({
            stack,
            all: chosen.all,
            top: chosen.top,
            badge: shiftRect(badgeLocal, anchor.x + chosen.shift[0], anchor.y + chosen.shift[1]),
            side: group.side,
        });
    }

    // Every footprint reserved its badge corner, so a badge added by a merge needs no
    // re-check. Paint lowest priority first.
    return { iconHeight, stacks: placed.map((entry) => entry.stack).reverse(), blockedOsids: blockedOsids.sort(strictCompare) };
}
