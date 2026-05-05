import type { TempoType } from './TempoSelector';
import { factionHex } from '../../../shared/factionPalette';

/**
 * Axis colors: warm military tones. The first three slots derive from the
 * canonical faction palette (`FACTION_GLOW_RGB`); slots 4–5 are neutral
 * accents reserved for non-faction axes.
 */
export const AXIS_COLORS = [factionHex('RS'), factionHex('RBiH'), factionHex('HRHB'), '#c4a35a', '#9a6fbf'];

/** Maps internal tempo values to IPC payload tempo values */
export const TEMPO_IPC_MAP: Record<TempoType, 'all_out' | 'standard' | 'methodical'> = {
    fast: 'all_out',
    normal: 'standard',
    slow: 'methodical',
};

/**
 * Faction hex colors for inline styles. Derived projection of the canonical
 * `FACTION_GLOW_RGB` table — single source of truth across all UI shells.
 * See `src/ui/shared/factionPalette.ts`.
 */
export const FACTION_HEX_COLORS: Record<string, string> = {
    RS: factionHex('RS'),
    RBiH: factionHex('RBiH'),
    HRHB: factionHex('HRHB'),
};

// ─── G-2 Briefing Thresholds ──────────────────────────────────────────────

export const INTEL_LABELS: Array<[number, string]> = [
    [0.8, 'Confirmed'], [0.6, 'Reliable'], [0.4, 'Partial'],
    [0.2, 'Fragmentary'], [0, 'Blind'],
];

export const SUPPLY_LABELS: Array<[number, string]> = [
    [0.9, 'Full'], [0.7, 'Strong'], [0.5, 'Adequate'],
    [0.3, 'Strained'], [0, 'Critical'],
];

export const FORCE_RATIO_LABELS: Array<[number, string]> = [
    [1.8, 'Overwhelming'], [1.2, 'Favorable'], [0.8, 'Contested'], [0, 'Inferior'],
];

export const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    decisive_victory: { bg: 'bg-[#4a9a55]/20', text: 'text-[#4a9a55]', label: 'DECISIVE VICTORY' },
    victory: { bg: 'bg-[#4a9a55]/15', text: 'text-[#5aaa65]', label: 'VICTORY' },
    costly_victory: { bg: 'bg-[#c4a35a]/15', text: 'text-[#c4a35a]', label: 'COSTLY VICTORY' },
    stalemate: { bg: 'bg-[#c4a35a]/10', text: 'text-[#9a9080]', label: 'STALEMATE' },
    repulsed: { bg: 'bg-[#c24040]/15', text: 'text-[#c24040]', label: 'REPULSED' },
    catastrophic: { bg: 'bg-[#c24040]/20', text: 'text-[#ff5555]', label: 'CATASTROPHIC' },
};

export function labelFromThresholds(value: number, thresholds: Array<[number, string]>): string {
    for (const [threshold, label] of thresholds) {
        if (value >= threshold) return label;
    }
    return thresholds[thresholds.length - 1][1];
}

export function getCasualtySeverityColor(casualties: number): string {
    if (casualties >= 1000) return '#c24040';
    if (casualties >= 500) return '#d4804a';
    if (casualties >= 200) return '#c4a35a';
    return '#9a9080';
}
