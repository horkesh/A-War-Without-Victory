/**
 * Faction-asymmetric Tactical Group / Operational Group naming (ADR-0006 Phase 3A).
 *
 * Generates the human-readable identity for a forming TG (and, by projection, the
 * standing sector display_name). Naming doctrine is faction-asymmetric DATA over a
 * faction-symmetric mechanism — every faction names its groups, but the STYLE differs:
 *
 *   - VRS (RS):   geographic OG/TG names keyed off terrain feature / objective town.
 *                 e.g. "TG Drina", "Majevica OG". (VRS named groups after the ground.)
 *   - ARBiH (RBiH): numbered OGs scoped to their sector / direction.
 *                 e.g. "1. OG (Tuzla)". (ARBiH used numbered operativna grupa.)
 *   - HVO (HRHB): operational zones (Operativna Zona / OZ).
 *                 e.g. "OZ Mostar". (HVO organised around fixed operational zones.)
 *
 * DETERMINISM (sacred): pure functions, no Math.random / Date.now / timestamps. All
 * derivation is a pure function of (faction, corps_id, anchor_osid, ordinal); any
 * iteration is sorted via strictCompare. Same inputs → same name, byte-stable.
 *
 * This module is consumed ONLY inside the flag-gated TG-formation path
 * (ENABLE_TG_FORMATION); flag-off it is never called, so flag-off state is untouched.
 */

import type { FactionId } from '../../state/game_state.js';

/**
 * Humanize an OSID / corps id segment for display: split on _ / : / -, drop a trailing
 * numeric suffix (e.g. "drina_2" → "Drina"), title-case each remaining word.
 * Pure + deterministic.
 */
export function humanizeToken(raw: string): string {
    const parts = raw
        .split(/[_:\-]/)
        .filter(p => p.length > 0)
        // Drop a pure-numeric trailing micro-OSID suffix ("foca_2" → "Foca").
        .filter((p, i, arr) => !(i === arr.length - 1 && /^\d+$/.test(p) && arr.length > 1));
    if (parts.length === 0) return raw;
    return parts
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Convert a 1-based ordinal into the ARBiH numbered-OG prefix form. Deterministic.
 * 1 → "1.", 2 → "2.", etc. (ARBiH wrote numbered groups as "1. OG", "2. OG").
 */
function ordinalPrefix(ordinal: number): string {
    const n = ordinal >= 1 ? Math.floor(ordinal) : 1;
    return `${n}.`;
}

export interface TgNameParams {
    faction: FactionId;
    /** Owning corps formation id (used for ARBiH scoping + deterministic fallback). */
    corps_id: string;
    /** Anchor brigade's location / objective OSID — the geographic seed. */
    anchor_osid: string;
    /**
     * 1-based ordinal among this corps's active TGs (deterministic count of existing TGs
     * for the corps + 1). Disambiguates same-anchor reuse and drives ARBiH numbering.
     */
    ordinal: number;
}

/**
 * Generate a faction-asymmetric display name for a forming Tactical Group / standing OG.
 *
 * Pure + deterministic: a function of (faction, corps_id, anchor_osid, ordinal) only.
 * No randomness, no clock, no global state.
 */
export function generateTacticalGroupName(params: TgNameParams): string {
    const { faction, corps_id, anchor_osid, ordinal } = params;
    const place = humanizeToken(anchor_osid);

    switch (faction) {
        case 'RS':
            // VRS: geographic OG/TG. "TG <Place>" for the first group anchored on a feature,
            // "<Place> OG" for subsequent groups — deterministic split on ordinal parity so the
            // two canonical VRS forms ("TG Drina" / "Majevica OG") both appear without RNG.
            return ordinal <= 1 ? `TG ${place}` : `${place} OG`;
        case 'RBiH':
            // ARBiH: numbered operativna grupa scoped to its corps/direction.
            // "<n>. OG (<Place>)".
            return `${ordinalPrefix(ordinal)} OG (${place})`;
        case 'HRHB':
            // HVO: operational zone (Operativna Zona). "OZ <Place>".
            return `OZ ${place}`;
        default:
            // Faction-symmetric fallback (should be unreachable — canonical factions only).
            return `OG ${place} (${humanizeToken(corps_id)})`;
    }
}
