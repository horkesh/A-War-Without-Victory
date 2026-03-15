import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import type { CorpsFrontSectorView } from '../../data/types';

interface OsidProperties {
    osid: string;
    controller: string | null;
    [key: string]: unknown;
}

interface CorpsGlowProperties {
    lineType: 'glow';
    faction: string;
    corps_id: string;
    sector_id?: string;
    offset_side?: 1 | -1;
    pressure_intensity?: number;
}

interface CorpsFrontProperties {
    lineType: 'front';
    factionA: string;
    factionB: string;
    corps_id: string;
    sector_id?: string;
    avg_entrenchment?: number;
    tooth_rotation?: number;
    brigade_count?: number;
    threat_intensity?: number;
}

type CorpsLineProperties = CorpsGlowProperties | CorpsFrontProperties;

// ═══════════════════════════════════════════════════════════════════════════
// Corps color palettes — 4 shades per faction, derived from faction base.
// ═══════════════════════════════════════════════════════════════════════════

const FACTION_CORPS_PALETTES: Record<string, string[]> = {
    RS: ['#c24040', '#d46a4a', '#a83030', '#e08858'],
    RBiH: ['#4a9a55', '#3a8a70', '#5aaa40', '#2a7a60'],
    HRHB: ['#4080b8', '#5070a0', '#3090d0', '#6060c0'],
};

export const FACTION_GLOW_COLORS: Record<string, string> = {
    RS: 'rgba(180, 50, 50, 0.6)',
    RBiH: 'rgba(55, 140, 75, 0.6)',
    HRHB: 'rgba(50, 110, 170, 0.6)',
};

/**
 * Build a plain Record<corpsId, hexColor> for use in UI panels/badges.
 */
export function buildCorpsColorMap(sectors: CorpsFrontSectorView[]): Record<string, string> {
    const byFaction: Record<string, string[]> = {};
    for (const s of sectors) {
        if (!byFaction[s.faction]) byFaction[s.faction] = [];
        if (!byFaction[s.faction].includes(s.corps_id)) {
            byFaction[s.faction].push(s.corps_id);
        }
    }
    for (const ids of Object.values(byFaction)) ids.sort((a, b) => a.localeCompare(b));

    const map: Record<string, string> = {};
    for (const [faction, ids] of Object.entries(byFaction)) {
        const palette = FACTION_CORPS_PALETTES[faction] ?? ['#888888'];
        for (let i = 0; i < ids.length; i++) {
            map[ids[i]] = palette[i % palette.length];
        }
    }
    return map;
}

/**
 * Build a MapLibre expression for line-color that colors by corps_id when available,
 * falling back to faction color for features without corps_id.
 */
export function buildCorpsColorExpression(
    sectors: CorpsFrontSectorView[]
): unknown[] {
    const colorMap = buildCorpsColorMap(sectors);
    const corpsIds = Object.keys(colorMap).sort((a, b) => a.localeCompare(b));

    // ["case", ["has", "corps_id"], ["match", ["get", "corps_id"], id1, c1, id2, c2, ..., fallback],
    //   ["match", ["get", "faction"], "RS", ..., fallback]]
    const matchArgs: (string | unknown[])[] = ['match', ['get', 'corps_id']];
    for (const id of corpsIds) {
        matchArgs.push(id, colorMap[id]);
    }
    matchArgs.push('#888888'); // fallback for unknown corps

    const factionMatch: (string | unknown[])[] = ['match', ['get', 'faction'],
        'RS', FACTION_GLOW_COLORS.RS,
        'RBiH', FACTION_GLOW_COLORS.RBiH,
        'HRHB', FACTION_GLOW_COLORS.HRHB,
        'rgba(60, 60, 70, 0.3)',
    ];

    return ['case', ['has', 'corps_id'], matchArgs, factionMatch];
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// Helpers for property calculation
// ═══════════════════════════════════════════════════════════════════════════

function calculateAvgEntrenchment(
    sector: CorpsFrontSectorView | undefined,
    formationsById: Record<string, { entrenchment_turns?: number }> | undefined
): number {
    if (!sector || !formationsById) return 0;
    const ids = sector.assigned_brigade_ids;
    if (ids.length === 0) return 0;
    const total = ids.reduce((sum, brigadeId) => {
        const formation = formationsById[brigadeId];
        return sum + (typeof formation?.entrenchment_turns === 'number' ? formation.entrenchment_turns : 0);
    }, 0);
    return total / ids.length;
}

function createGlowProperties(
    faction: string,
    corpsId: string,
    sectorId: string | undefined,
    offset: 1 | -1 | undefined,
    pressureIntensity: number
): CorpsGlowProperties {
    const props: CorpsGlowProperties = {
        lineType: 'glow',
        faction,
        corps_id: corpsId,
        pressure_intensity: pressureIntensity
    };
    if (offset != null) props.offset_side = offset;
    if (sectorId) props.sector_id = sectorId;
    return props;
}

/** Merge consecutive segments that share endpoints into longer LineStrings. */
function mergeLineSegments<P extends CorpsLineProperties>(
    segments: Feature<LineString, P>[]
): Feature<LineString, P>[] {
    if (segments.length === 0) return [];

    const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const endpointMap = new Map<string, number[]>();

    segments.forEach((seg, i) => {
        const coords = seg.geometry.coordinates;
        const startKey = coordKey(coords[0]);
        const endKey = coordKey(coords[coords.length - 1]);
        if (!endpointMap.has(startKey)) endpointMap.set(startKey, []);
        if (!endpointMap.has(endKey)) endpointMap.set(endKey, []);
        endpointMap.get(startKey)!.push(i);
        endpointMap.get(endKey)!.push(i);
    });

    const used = new Set<number>();
    const merged: Feature<LineString, P>[] = [];

    for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        used.add(i);
        const props = segments[i].properties;
        let coords = [...segments[i].geometry.coordinates];
        let changed = true;

        while (changed) {
            changed = false;
            const endKey = coordKey(coords[coords.length - 1]);
            const candidates = endpointMap.get(endKey) || [];
            for (const j of candidates) {
                if (used.has(j)) continue;
                const seg = segments[j].geometry.coordinates;
                const segStart = coordKey(seg[0]);
                const segEnd = coordKey(seg[seg.length - 1]);
                if (segStart === endKey) {
                    coords.push(...seg.slice(1));
                    used.add(j);
                    changed = true;
                    break;
                } else if (segEnd === endKey) {
                    coords.push(...[...seg].reverse().slice(1));
                    used.add(j);
                    changed = true;
                    break;
                }
            }
        }

        merged.push({
            type: 'Feature',
            properties: props,
            geometry: { type: 'LineString', coordinates: coords },
        });
    }
    return merged;
}

/**
 * Build a mapping from (OSID-pair edge key, faction) → corps info.
 * Keyed as "pairKey\0faction" so both sides of a front edge resolve to
 * the correct corps for their respective faction.
 */
function buildEdgeFactionToCorps(
    sectors: CorpsFrontSectorView[]
): Map<string, string> {
    const map = new Map<string, string>();
    for (const sector of sectors) {
        for (const edgeId of sector.edge_ids) {
            const key = `${edgeId}\0${sector.faction}`;
            if (!map.has(key)) map.set(key, sector.corps_id);
        }
    }
    return map;
}

/**
 * Build a plain Record<corpsId, hexColor> for use in UI panels/badges.
 */
export function buildCorpsFrontLinesGeoJSON(
    osidGeoJson: FeatureCollection,
    corpsFrontSectors: CorpsFrontSectorView[],
    rbihHrhbAllied?: boolean,
    osidCentroids?: Map<string, [number, number]>,
    frontPressureByEdge?: Record<string, { value: number; max_abs: number }>,
    frontEdgesOsid?: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[],
    formationsById?: Record<string, { entrenchment_turns?: number }>
): FeatureCollection<LineString> {
    const features = osidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];

    const controllerMap = new Map<string, string | null>();
    for (const f of features) {
        controllerMap.set(f.properties.osid, f.properties.controller);
    }

    const edgeFactionToCorps = buildEdgeFactionToCorps(corpsFrontSectors);
    const sectorByEdgeAndFaction = new Map<string, CorpsFrontSectorView>();
    for (const sector of corpsFrontSectors) {
        for (const edgeId of sector.edge_ids) {
            sectorByEdgeAndFaction.set(`${edgeId}\0${sector.faction}`, sector);
        }
    }

    const authoritativePairs = new Set<string>();
    if (frontEdgesOsid) {
        for (const edge of frontEdgesOsid) {
            authoritativePairs.add(edge.edge_id);
        }
    }

    const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const edgeMap = new Map<string, Set<string>>();

    for (const feature of features) {
        const osid = feature.properties.osid;
        const rings = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates
            : feature.geometry.coordinates.flat();

        for (const ring of rings) {
            for (let i = 0; i < ring.length - 1; i++) {
                const a = ring[i];
                const b = ring[i + 1];
                const keyA = coordKey(a);
                const keyB = coordKey(b);
                const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

                if (!edgeMap.has(edgeKey)) edgeMap.set(edgeKey, new Set());
                edgeMap.get(edgeKey)!.add(osid);
            }
        }
    }

    const glowFeatures: Feature<LineString, CorpsGlowProperties>[] = [];
    const frontSegmentsByGroup = new Map<string, Feature<LineString, CorpsFrontProperties>[]>();

    for (const [edgeKey, osids] of edgeMap) {
        if (osids.size !== 2) continue;
        const [osidA, osidB] = [...osids];
        const ctrlA = controllerMap.get(osidA);
        const ctrlB = controllerMap.get(osidB);
        if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;
        if (rbihHrhbAllied && ((ctrlA === 'RBiH' && ctrlB === 'HRHB') || (ctrlA === 'HRHB' && ctrlB === 'RBiH'))) continue;

        const pairKey = osidA < osidB ? `${osidA}__${osidB}` : `${osidB}__${osidA}`;
        if (authoritativePairs.size > 0 && !authoritativePairs.has(pairKey)) continue;

        const [partA, partB] = edgeKey.split('|');
        const [ax, ay] = partA.split(',').map(Number);
        const [bx, by] = partB.split(',').map(Number);
        const coords: [number, number][] = [[ax, ay], [bx, by]];

        const corpsA = edgeFactionToCorps.get(`${pairKey}\0${ctrlA}`) ?? 'unknown';
        const corpsB = edgeFactionToCorps.get(`${pairKey}\0${ctrlB}`) ?? 'unknown';
        const sectorA = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlA}`);
        const sectorB = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlB}`);

        const avgEntrenchment = calculateAvgEntrenchment(sectorA, formationsById);

        let offsetA: 1 | -1 | undefined;
        let offsetB: 1 | -1 | undefined;
        let toothRotation: number | undefined;
        if (osidCentroids) {
            const centA = osidCentroids.get(osidA);
            const centB = osidCentroids.get(osidB);
            if (centA && centB) {
                const dx = bx - ax;
                const dy = by - ay;
                const crossA = dx * (centA[1] - ay) - dy * (centA[0] - ax);
                offsetA = crossA > 0 ? -1 : 1;
                offsetB = crossA > 0 ? 1 : -1;
                toothRotation = crossA > 0 ? 180 : 0;
            }
        }

        const pressureData = frontPressureByEdge?.[pairKey];
        const pressureIntensity = pressureData && pressureData.max_abs > 0 ? Math.abs(pressureData.value) / pressureData.max_abs : 0;

        glowFeatures.push({
            type: 'Feature',
            properties: createGlowProperties(ctrlA, corpsA, sectorA?.sector_id, offsetA, pressureIntensity),
            geometry: { type: 'LineString', coordinates: coords },
        });
        glowFeatures.push({
            type: 'Feature',
            properties: createGlowProperties(ctrlB, corpsB, sectorB?.sector_id, offsetB, pressureIntensity),
            geometry: { type: 'LineString', coordinates: coords },
        });

        const pairFactionKey = [ctrlA, ctrlB].sort().join('-');
        const groupKey = sectorA?.sector_id ? `${sectorA.sector_id}:${pairFactionKey}` : `${corpsA}:${pairFactionKey}`;
        if (!frontSegmentsByGroup.has(groupKey)) frontSegmentsByGroup.set(groupKey, []);

        const frontProps: CorpsFrontProperties = {
            lineType: 'front',
            factionA: ctrlA,
            factionB: ctrlB,
            corps_id: corpsA,
            avg_entrenchment: avgEntrenchment,
            brigade_count: sectorA ? sectorA.assigned_brigade_ids.length : 0,
            threat_intensity: pressureIntensity
        };
        if (sectorA?.sector_id) frontProps.sector_id = sectorA.sector_id;
        if (toothRotation != null) frontProps.tooth_rotation = toothRotation;

        frontSegmentsByGroup.get(groupKey)!.push({
            type: 'Feature',
            properties: frontProps,
            geometry: { type: 'LineString', coordinates: coords },
        });
    }

    const mergedFront: Feature<LineString, CorpsFrontProperties>[] = [];
    for (const segments of frontSegmentsByGroup.values()) {
        mergedFront.push(...mergeLineSegments(segments));
    }

    const allFeatures: Feature<LineString>[] = [...glowFeatures, ...mergedFront];
    return { type: 'FeatureCollection', features: allFeatures as any };
}
