/**
 * Sandbox Scenarios — Predefined region definitions for the tactical sandbox viewer.
 * Each region is defined by a bounding box (WGS84 lon/lat) that clips settlements,
 * edges, and formations from the full dataset.
 */

export interface RegionDef {
    id: string;
    name: string;
    /** [minLon, minLat, maxLon, maxLat] WGS84 */
    bbox: [number, number, number, number];
    description: string;
}

/**
 * Predefined regions for the sandbox.
 * Travnik-Sarajevo: wide three-faction belt, ~150 settlements.
 * Sarajevo: three-faction contact zone, urban terrain, ~40 settlements.
 * Posavina: RS corridor, linear front, RBiH/RS contact, ~50 settlements.
 * Central Bosnia: RBiH/HRHB contact zone (Travnik, Vitez, Zenica).
 */
export const SANDBOX_REGIONS: RegionDef[] = [
    {
        id: 'travnik_sarajevo',
        name: 'Travnik \u2014 Sarajevo',
        bbox: [17.50, 43.72, 18.58, 44.10],
        description: 'Wide three-faction belt from Travnik through Zenica to Sarajevo. Mixed terrain, ~150 settlements.',
    },
    {
        id: 'sarajevo',
        name: 'Sarajevo Environs',
        bbox: [18.20, 43.75, 18.55, 43.92],
        description: 'Three-faction contact zone around Sarajevo. Urban terrain, siege conditions.',
    },
    {
        id: 'posavina',
        name: 'Posavina Corridor',
        bbox: [17.90, 44.70, 18.60, 45.10],
        description: 'RS corridor in northern Bosnia. Linear front, Posavina pocket.',
    },
    {
        id: 'central_bosnia',
        name: 'Central Bosnia',
        bbox: [17.50, 44.00, 18.10, 44.40],
        description: 'RBiH/HRHB contact zone. Travnik, Vitez, Zenica area.',
    },
];

export const DEFAULT_REGION = 'travnik_sarajevo';
