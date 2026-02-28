/**
 * Control data key normalization.
 * Handles dual key formats: S-prefixed ("S100013") and mun:census ("10014:100013").
 */

export function controlKey(sid: string): string {
    return sid.startsWith('S') ? sid : `S${sid}`;
}

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

export function censusIdFromSid(sid: string): string {
    return sid.startsWith('S') ? sid.slice(1) : sid;
}
