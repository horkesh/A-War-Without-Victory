/**
 * B1 Event registry: historical and random events in deterministic order.
 * Order is stable (array index); same scenario + seed + turn → same events evaluated in same order.
 */

import type { EventDefinition } from './event_types.js';

/** Historical events (turn-based; no probability). Order stable. */
export const HISTORICAL_EVENTS: EventDefinition[] = [
    {
        id: 'srebrenica_enclave',
        trigger: { turn_min: 0, turn_max: 200, phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'Srebrenica enclave under pressure; humanitarian concerns mount.' }
    },
    {
        id: 'markale_market',
        trigger: { turn_min: 80, turn_max: 120, phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Markale market shelling draws international condemnation.' }
    },
    {
        id: 'sarajevo_siege',
        trigger: { turn_min: 0, turn_max: 260, phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'Sarajevo siege continues; civilian casualties and supply shortages.' }
    },
    {
        id: 'un_safe_areas',
        trigger: { turn_min: 90, turn_max: 200, phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'UN safe areas declared; peacekeeping presence increases.' }
    },
    {
        id: 'vrs_offensive',
        trigger: { turn_min: 0, turn_max: 80, phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'VRS offensive operations expand across northern Bosnia.' }
    },
    {
        id: 'arabh_organization',
        trigger: { turn_min: 40, turn_max: 150, phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'ARBiH reorganization and brigade formation accelerate.' }
    },
    {
        id: 'hrhb_croat_rep',
        trigger: { turn_min: 0, turn_max: 120, phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'HVO/HRHB operations in Herzegovina and central Bosnia.' }
    },
    {
        id: 'washington_agreement',
        trigger: { turn_min: 100, turn_max: 140, phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Washington Agreement signals RBiH–Croat alignment against VRS.' }
    },
    {
        id: 'gorazde_enclave',
        trigger: { turn_min: 50, turn_max: 180, phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Goražde enclave under siege; humanitarian corridor contested.' }
    },
    {
        id: 'bihac_pocket',
        trigger: { turn_min: 60, turn_max: 200, phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Bihać pocket isolated; UN and ARBiH forces under pressure.' }
    }
];

/** Random events (probability per turn). Order stable. */
export const RANDOM_EVENTS: EventDefinition[] = [
    {
        id: 'convoy_ambush',
        trigger: { phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Supply convoy ambushed; logistics disrupted.' },
        probability: 0.08
    },
    {
        id: 'local_defection',
        trigger: { phase: 'phase_i' },
        effect: { kind: 'narrative', text: 'Reports of local defections and shifting loyalties.' },
        probability: 0.05
    },
    {
        id: 'ceasefire_breach',
        trigger: { phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Ceasefire breached along a contested front.' },
        probability: 0.06
    },
    {
        id: 'humanitarian_aid',
        trigger: { phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Humanitarian aid convoy reaches besieged area.' },
        probability: 0.04
    },
    {
        id: 'sniper_incident',
        trigger: { phase: 'phase_ii' },
        effect: { kind: 'narrative', text: 'Sniper fire reported in urban area; casualties.' },
        probability: 0.05
    }
];

/** Full registry: historical first, then random. Stable order for determinism. */
export const EVENT_REGISTRY: EventDefinition[] = [...HISTORICAL_EVENTS, ...RANDOM_EVENTS];
