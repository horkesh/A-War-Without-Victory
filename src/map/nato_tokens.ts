/**
 * NATO Tactical Map color tokens (1990s NATO C2 / CIA ops center aesthetic).
 * Single source of truth for A1 Base Map and Warroom rendering.
 * Visual identity: Dark navy backgrounds, phosphor-green accents, CRT glow.
 * Spec: GUI_DESIGN_BLUEPRINT.md §1, §21.
 */
export const NATO_TOKENS = {
    /** Map canvas background — deep dark navy */
    paper: '#0d0d1a',
    /** RS (Serb) — Deep Crimson */
    RS: 'rgb(180, 50, 50)',
    /** RBiH (Bosniak) — Forest Green */
    RBiH: 'rgb(55, 140, 75)',
    /** HRHB (Croat) — Steel Blue */
    HRHB: 'rgb(50, 110, 170)',
    /** Elevation contours — subdued teal */
    contours: 'rgb(40, 70, 80)',
    /** Hydrography (rivers, water) — dim steel blue */
    hydrography: 'rgb(45, 75, 110)',
    /** Major Supply Routes — dim gray */
    MSR: 'rgb(55, 55, 70)',
    /** Secondary roads / infrastructure — faint */
    secondaryRoad: 'rgb(40, 40, 55)',
    /** City marker (major cities Pop > 50k) */
    cityMarker: 'rgb(220, 180, 80)',
    /** Grid and classification stamps */
    stamp: 'rgb(180, 50, 50)',
    /** Phosphor green accent (CRT glow) */
    phosphorGreen: '#00ff88',
    /** Amber warning */
    amber: '#ffab00',
    /** Signal red alert */
    signalRed: '#ff3d00',
    /** Cyan interactive / links */
    cyan: '#00bcd4',
    /** Off-white primary text */
    textPrimary: '#e0e0e0',
    /** Muted gray secondary text */
    textMuted: '#7a7a8a',
    /** Panel background */
    panelBg: '#12121f',
    /** Card/section background */
    cardBg: '#1a1a2e',
    /** Border color */
    border: '#2a2a3e',
    /** Hover/active state */
    hover: '#2a2a3e',
} as const;

/** Faction control fill with alpha for overlay */
export function factionFill(faction: 'RS' | 'RBiH' | 'HRHB', alpha = 0.4): string {
    const base: Record<string, string> = {
        RS: '180, 50, 50',
        RBiH: '55, 140, 75',
        HRHB: '50, 110, 170',
    };
    return `rgba(${base[faction]}, ${alpha})`;
}
