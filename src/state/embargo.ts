import type { EmbargoProfile, FactionId, GameState } from './game_state.js';
import { clamp01 } from '../utils/math.js';

export const SMUGGLING_EFFICIENCY_GROWTH = 0.0015;

export const EMBARGO_PHASE_IDS = [
    'phase_0_none',
    'phase_1_full',
    'phase_2_croatia',
    'phase_3_black_flights',
    'phase_4_unenforced',
    'phase_5_lifted',
] as const;

export type EmbargoPhaseId = typeof EMBARGO_PHASE_IDS[number];

export interface EmbargoCap {
    general: number;
    heavy: number;
}

export const EMBARGO_PHASE_CAPS: Record<EmbargoPhaseId, Record<FactionId, EmbargoCap>> = {
    phase_0_none: {
        RBiH: { general: 1.0, heavy: 1.0 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
    phase_1_full: {
        RBiH: { general: 0.6, heavy: 0.6 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
    phase_2_croatia: {
        RBiH: { general: 0.65, heavy: 0.65 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
    phase_3_black_flights: {
        // PENDING /historian Lane H4 follow-up: keep equal to phase 2 until cited.
        RBiH: { general: 0.65, heavy: 0.65 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
    phase_4_unenforced: {
        RBiH: { general: 0.8, heavy: 0.8 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
    phase_5_lifted: {
        // PENDING /historian Lane H4 follow-up: post-Dayton formal lift is narrative-only until cited.
        RBiH: { general: 0.8, heavy: 0.8 },
        RS: { general: 1.0, heavy: 1.0 },
        HRHB: { general: 1.0, heavy: 1.0 },
    },
};

const EMBARGO_PHASE_FLAGS: Array<{ flag: string; phase: EmbargoPhaseId }> = [
    { flag: 'arms_embargo_active', phase: 'phase_1_full' },
    { flag: 'embargo_croatia_transit', phase: 'phase_2_croatia' },
    { flag: 'embargo_black_flights', phase: 'phase_3_black_flights' },
    { flag: 'embargo_lifted', phase: 'phase_4_unenforced' },
    { flag: 'embargo_formal_lift', phase: 'phase_5_lifted' },
];

export function resolveActiveEmbargoPhase(state: GameState): EmbargoPhaseId {
    const flags = state.military.event_flags ?? {};
    let activePhase: EmbargoPhaseId = 'phase_0_none';
    for (const entry of EMBARGO_PHASE_FLAGS) {
        if (flags[entry.flag] === true) {
            activePhase = entry.phase;
        }
    }
    return activePhase;
}

function defaultEmbargoProfile(factionId: FactionId): EmbargoProfile {
    if (factionId === 'RS') {
        return {
            heavy_equipment_access: 0.9,
            ammunition_resupply_rate: 0.8,
            maintenance_capacity: 0.7,
            smuggling_efficiency: 0.0,
            external_pipeline_status: 0.9
        };
    }
    if (factionId === 'HRHB') {
        return {
            heavy_equipment_access: 0.6,
            ammunition_resupply_rate: 0.6,
            maintenance_capacity: 0.6,
            smuggling_efficiency: 0.0,
            external_pipeline_status: 0.7
        };
    }
    return {
        heavy_equipment_access: 0.2,
        ammunition_resupply_rate: 0.3,
        maintenance_capacity: 0.4,
        smuggling_efficiency: 0.0,
        external_pipeline_status: 0.4
    };
}

export function ensureEmbargoProfiles(state: GameState): void {
    for (const faction of state.factions) {
        if (!faction.embargo_profile) {
            faction.embargo_profile = defaultEmbargoProfile(faction.id);
        }
    }
}

export function updateEmbargoProfiles(state: GameState): void {
    ensureEmbargoProfiles(state);
    for (const faction of state.factions) {
        const embargo = faction.embargo_profile!;
        const base = embargo.smuggling_efficiency ?? 0;
        const growth = faction.id === 'RBiH' ? SMUGGLING_EFFICIENCY_GROWTH : 0;
        embargo.smuggling_efficiency = Math.min(0.3, clamp01(base + growth));
        embargo.heavy_equipment_access = clamp01(embargo.heavy_equipment_access);
        embargo.ammunition_resupply_rate = clamp01(embargo.ammunition_resupply_rate);
        embargo.maintenance_capacity = clamp01(embargo.maintenance_capacity);
        embargo.external_pipeline_status = clamp01(embargo.external_pipeline_status);
    }
}

export function getEffectiveHeavyEquipmentAccess(profile: EmbargoProfile | undefined): number {
    if (!profile) return 1;
    const smuggle = profile.smuggling_efficiency ?? 0;
    return clamp01(profile.heavy_equipment_access * (0.7 + 0.3 * smuggle) * profile.external_pipeline_status);
}
