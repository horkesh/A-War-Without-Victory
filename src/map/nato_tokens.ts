/**
 * NATO Tactical Map color tokens (1990s US JCS aesthetic).
 * Single source of truth for A1 Base Map and Warroom rendering.
 * Spec: A1 Map Development Handoff — NATO Tactical Aesthetic v1.0.
 */
export const NATO_TOKENS = {
    /** Aged paper base (beige/tan) */
    paper: '#ebe1cd',
    /** RS (Serb) — Crimson Red */
    RS: 'rgb(180, 50, 50)',
    /** RBiH (Bosniak) — Forest Green */
    RBiH: 'rgb(70, 120, 80)',
    /** HRHB (Croat) — Steel Blue */
    HRHB: 'rgb(60, 100, 140)',
    /** Elevation contours — Burnt Umber */
    contours: 'rgb(139, 90, 43)',
    /** Hydrography (rivers, water) — Dusty Blue */
    hydrography: 'rgb(100, 150, 200)',
    /** Major Supply Routes — tactical grey */
    MSR: '#A0A0A0',
    /** Secondary roads / infrastructure */
    secondaryRoad: '#D0D0D0',
    /** City marker (major cities Pop > 50k) */
    cityMarker: 'rgb(180, 50, 50)',
    /** Grid and classification stamps */
    stamp: 'rgb(180, 50, 50)',
} as const;

/** Faction control fill with alpha for overlay */
export function factionFill(faction: 'RS' | 'RBiH' | 'HRHB', alpha = 0.4): string {
    const base: Record<string, string> = {
        RS: '180, 50, 50',
        RBiH: '70, 120, 80',
        HRHB: '60, 100, 140',
    };
    return `rgba(${base[faction]}, ${alpha})`;
}
