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
  const settlementsArray =
    isRecord(json) && Array.isArray(json.settlements) ? json.settlements : null;
  if (!settlementsArray) {
    throw new Error('Unsupported settlements format (expected { settlements: [...] })');
  }
  const map = new Map<string, SettlementRecord>();
  for (const item of settlementsArray) {
    if (!isRecord(item) || typeof item.sid !== 'string') {
      throw new Error(`Invalid settlement record: missing sid (got ${JSON.stringify(item).substring(0, 100)})`);
    }
    if (typeof item.source_id !== 'string' || typeof item.mun_code !== 'string' || typeof item.mun !== 'string') {
      throw new Error(`Invalid settlement record: missing required fields (sid: ${item.sid})`);
    }
    const record: SettlementRecord = {
      sid: item.sid,
      source_id: item.source_id,
      mun_code: item.mun_code,
      mun: item.mun
    };
    if (typeof item.name === 'string') record.name = item.name;
    if (typeof item.mun1990_id === 'string') record.mun1990_id = item.mun1990_id;
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
