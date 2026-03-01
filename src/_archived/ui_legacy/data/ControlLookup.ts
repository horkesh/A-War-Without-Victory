/**
 * Control data key normalization.
 * Handles dual key formats: S-prefixed ("S100013") and mun:census ("10014:100013").
 * Ported from map_viewer_app.ts.
 */

/** Normalize a settlement SID to S-prefixed format for political_control_data lookup. */
export function controlKey(sid: string): string {
    return sid.startsWith('S') ? sid : `S${sid}`;
}

/**
 * Build a unified control lookup that works with both key formats.
 * Input may have keys like "10014:100013" (mun:census) or "S100013" (S-prefixed).
 * Output always has S-prefixed keys for consistent lookup.
 */
export function buildControlLookup(
    bySettlementId: Record<string, string | null>
): Record<string, string | null> {
    const out: Record<string, string | null> = { ...bySettlementId };
    for (const [k, v] of Object.entries(bySettlementId)) {
        if (k.includes(':')) {
            const census = k.split(':')[1];
            if (census != null) {
                const sKey = census.startsWith('S') ? census : `S${census}`;
                if (out[sKey] === undefined) out[sKey] = v;
            }
        }
    }
    return out;
}

/**
 * Build a unified status lookup (CONTESTED / HIGHLY_CONTESTED / CONSOLIDATED).
 * Same dual-key normalization as buildControlLookup.
 */
export function buildStatusLookup(
    statusBySettlementId: Record<string, string>
): Record<string, string> {
    const out: Record<string, string> = { ...statusBySettlementId };
    for (const [k, v] of Object.entries(statusBySettlementId)) {
        if (k.includes(':')) {
            const census = k.split(':')[1];
            if (census != null) {
                const sKey = census.startsWith('S') ? census : `S${census}`;
                if (out[sKey] === undefined) out[sKey] = v;
            }
        }
    }
    return out;
}

/** Extract the census ID from a SID (strips the 'S' prefix). */
export function censusIdFromSid(sid: string): string {
    return sid.startsWith('S') ? sid.slice(1) : sid;
}
