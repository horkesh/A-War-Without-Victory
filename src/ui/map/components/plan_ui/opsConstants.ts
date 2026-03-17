import type { TempoType } from './TempoSelector';

/** Axis colors: warm military tones matching faction palette */
export const AXIS_COLORS = ['#c24040', '#4a9a55', '#4080b8', '#c4a35a', '#9a6fbf'];

/** Maps internal tempo values to IPC payload tempo values */
export const TEMPO_IPC_MAP: Record<TempoType, 'all_out' | 'standard' | 'methodical'> = {
    fast: 'all_out',
    normal: 'standard',
    slow: 'methodical',
};

/** Faction hex colors for inline styles */
export const FACTION_HEX_COLORS: Record<string, string> = {
    RS: '#c24040', RBiH: '#4a9a55', HRHB: '#4080b8',
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
