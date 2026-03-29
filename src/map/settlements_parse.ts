/**
 * Browser-safe pure parser for settlement graph data.
 * No Node/fs imports. Used by warroom to build LoadedSettlementGraph from fetched JSON.
 * Same JSON in → same LoadedSettlementGraph out; deterministic (settlements Map built from sorted keys).
 */

export interface SettlementRecord {
    sid: string;
    source_id: string;
    mun_code: string;
    mun: string;
    mun1990_id?: string;
    name?: string;
    properties?: {
        is_orphan?: boolean;
        usesFallbackGeometry?: boolean;
        [key: string]: unknown;
    };
}

export interface EdgeRecord {
    a: string;
    b: string;
    one_way?: boolean;
    allow_self_loop?: boolean;
    /** Contact type from the operational contact graph (shared_border, distance_contact, point_touch). */
    type?: string;
    /** Minimum distance between polygon boundaries (0 = shared boundary, >0 = distance contact). */
    min_dist?: number;
    /** Count of consecutive shared vertex pairs (boundary segments) between OSID polygons.
     *  0 = point-only contact (artifact). >=1 = real boundary. */
    shared_segments?: number;
}

export interface LoadedSettlementGraph {
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Parse settlements from JSON. Expected format: { settlements: [{ sid, source_id, mun_code, mun, name?, mun1990_id? }, ...] }.
 */
export function parseSettlements(json: unknown): Map<string, SettlementRecord> {
    const map = new Map<string, SettlementRecord>();

    // Support either old { settlements: [...] } or GeoJSON { type: "FeatureCollection", features: [...] }
    let featuresArray: any[] | null = null;

    if (isRecord(json)) {
        if (Array.isArray(json.settlements)) {
            featuresArray = json.settlements;
        } else if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
            featuresArray = json.features;
        }
    }

    if (!featuresArray) {
        throw new Error('Unsupported settlements format (expected { settlements: [...] } or GeoJSON FeatureCollection)');
    }

    for (const item of featuresArray) {
        // If it's a GeoJSON feature, extract properties
        const isGeoJsonFeature = isRecord(item) && item.type === 'Feature' && isRecord(item.properties);
        const props = isGeoJsonFeature ? item.properties : item;

        // In operational layer, sid is 'osid' mapped to 'sid' in memory to satisfy SettlementRecord interface
        const sidVal = (props.osid as string) || (props.sid as string);

        if (typeof sidVal !== 'string') {
            throw new Error(`Invalid settlement record: missing sid/osid (got ${JSON.stringify(props).substring(0, 100)})`);
        }

        if (typeof props.mun1990_id !== 'string') {
            throw new Error(`Invalid settlement record: missing mun1990_id (sid: ${sidVal})`);
        }

        const record: SettlementRecord = {
            sid: sidVal,
            source_id: (props.source_id as string) || sidVal,
            mun_code: (props.mun_code as string) || props.mun1990_id,
            mun: (props.mun as string) || (props.mun1990_name as string) || props.mun1990_id,
            mun1990_id: props.mun1990_id
        };

        if (typeof props.settlement_name === 'string') record.name = props.settlement_name;
        else if (typeof props.name === 'string') record.name = props.name;

        // Preserve properties for other systems
        record.properties = { ...props, is_orphan: false, usesFallbackGeometry: false } as Record<string, unknown>;

        map.set(record.sid, record);
    }
    return map;
}

/**
 * Parse edges from JSON. Supports { edges: [...] } or array of { a, b, one_way?, allow_self_loop? }.
 */
export function parseEdges(json: unknown): EdgeRecord[] {
    const edgesArray =
        isRecord(json) && Array.isArray(json.edges)
            ? json.edges
            : Array.isArray(json)
                ? json
                : null;
    if (!edgesArray) throw new Error('Unsupported edges format');
    return edgesArray.map((item) => {
        if (!isRecord(item) || typeof item.a !== 'string' || typeof item.b !== 'string') {
            throw new Error('Invalid edge record (expected {a: string, b: string, ...})');
        }
        const edge: EdgeRecord = { a: item.a, b: item.b };
        if (typeof item.one_way === 'boolean') edge.one_way = item.one_way;
        if (typeof item.allow_self_loop === 'boolean') edge.allow_self_loop = item.allow_self_loop;
        if (typeof item.type === 'string') edge.type = item.type;
        if (typeof item.min_dist === 'number') edge.min_dist = item.min_dist;
        if (typeof item.shared_segments === 'number') edge.shared_segments = item.shared_segments;
        return edge;
    });
}

/**
 * Build LoadedSettlementGraph from parsed JSON. Deterministic: settlements Map is built from entries sorted by sid.
 */
export function buildGraphFromJSON(
    settlementsJson: unknown,
    edgesJson: unknown
): LoadedSettlementGraph {
    const settlementsUnsorted = parseSettlements(settlementsJson);
    const edges = parseEdges(edgesJson);
    const sortedSids = Array.from(settlementsUnsorted.keys()).sort((a, b) => a.localeCompare(b));
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of sortedSids) {
        const r = settlementsUnsorted.get(sid);
        if (r) settlements.set(sid, r);
    }
    return { settlements, edges };
}
