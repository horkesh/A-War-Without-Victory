import type {
    PoliticalDirectiveMagnitude,
    PoliticalDirectivePermissionFlag,
    PoliticalDirectiveVerb as CanonicalPoliticalDirectiveVerb,
} from '../../src/sim/combat/army_order_interpretation.js';

export interface CanonicalPresidentDirective {
    verb: CanonicalPoliticalDirectiveVerb;
    magnitude: PoliticalDirectiveMagnitude;
    permission_flags: PoliticalDirectivePermissionFlag[];
}

type PresidentDirectiveBridgeEntry = CanonicalPresidentDirective | null;

export const PRESIDENT_TO_CANONICAL_DIRECTIVE: Readonly<Record<string, PresidentDirectiveBridgeEntry>> = Object.freeze({
    hold_corridor: {
        verb: 'MAINTAIN_CORRIDOR',
        magnitude: 'standard',
        permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
    },
    consolidate_drina: {
        verb: 'PRESS_OFFENSIVE',
        magnitude: 'maximum',
        permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
    },
    maintain_siege: {
        verb: 'HOLD_AT_ALL_COSTS',
        magnitude: 'standard',
        permission_flags: ['authorize_reserve_commitment'],
    },
    reject_partition_plan: {
        verb: 'PREPARE_RESERVE',
        magnitude: 'standard',
        permission_flags: ['preserve_reserve'],
    },
    selective_advance: {
        verb: 'PRESS_OFFENSIVE',
        magnitude: 'standard',
        permission_flags: ['authorize_offensive'],
    },
    defend_enclave: {
        verb: 'HOLD_AT_ALL_COSTS',
        magnitude: 'maximum',
        permission_flags: ['authorize_reserve_commitment'],
    },
    negotiate: {
        verb: 'HONOR_TRUCE',
        magnitude: 'limited',
        permission_flags: ['avoid_escalation'],
    },
    preserve_republic: {
        verb: 'BALANCE_FRONTS',
        magnitude: 'standard',
        permission_flags: ['preserve_reserve'],
    },
    accept_ceasefire: {
        verb: 'HONOR_TRUCE',
        magnitude: 'limited',
        permission_flags: ['avoid_escalation'],
    },
    mobilize_general: {
        verb: 'PRESS_OFFENSIVE',
        magnitude: 'maximum',
        permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
    },
    consolidate_herzegovina: {
        verb: 'PRESS_OFFENSIVE',
        magnitude: 'standard',
        permission_flags: ['authorize_offensive'],
    },
    hold_central_bosnia: {
        verb: 'HOLD_AT_ALL_COSTS',
        magnitude: 'standard',
        permission_flags: ['authorize_reserve_commitment'],
    },
    screen_arbih_axis: {
        verb: 'MAINTAIN_CORRIDOR',
        magnitude: 'standard',
        permission_flags: ['authorize_offensive', 'authorize_reserve_commitment'],
    },
    accept_zagreb_directive: {
        verb: 'BALANCE_FRONTS',
        magnitude: 'standard',
        permission_flags: ['preserve_reserve'],
    },
    accept_washington_framework: {
        verb: 'HONOR_TRUCE',
        magnitude: 'limited',
        permission_flags: ['avoid_escalation'],
    },
    no_directive: null,
});

const VALID_MAGNITUDES: ReadonlySet<string> = new Set(['limited', 'standard', 'maximum']);
const VALID_PERMISSION_FLAGS: ReadonlySet<string> = new Set([
    'authorize_offensive',
    'authorize_reserve_commitment',
    'preserve_reserve',
    'avoid_escalation',
]);

export function canonicalizePresidentDirective(
    richVerb: string,
    metadata: {
        magnitude?: string;
        permission_flags?: readonly string[];
    } = {},
): CanonicalPresidentDirective | null {
    const fallback = PRESIDENT_TO_CANONICAL_DIRECTIVE[richVerb];
    if (!fallback) return null;
    const magnitude = metadata.magnitude && VALID_MAGNITUDES.has(metadata.magnitude)
        ? metadata.magnitude as PoliticalDirectiveMagnitude
        : fallback.magnitude;
    const permission_flags = metadata.permission_flags
        && metadata.permission_flags.length > 0
        && metadata.permission_flags.every(flag => VALID_PERMISSION_FLAGS.has(flag))
        ? [...metadata.permission_flags] as PoliticalDirectivePermissionFlag[]
        : [...fallback.permission_flags];
    return {
        verb: fallback.verb,
        magnitude,
        permission_flags,
    };
}
