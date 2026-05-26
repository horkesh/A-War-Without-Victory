import { validateState, ValidationIssue } from '../validate/validate.js';
import { CURRENT_SCHEMA_VERSION, GameState } from './game_state.js';
import { canonicalizePoliticalSideId } from './identity.js';
import { applyMigrations } from './save_migration.js';
import { serializeGameState } from './serializeGameState.js';
import { validateGameStateShape } from './validateGameState.js';

export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
}

export function serializeState(state: GameState): string {
    const canonicalState = migrateState({ ...state, schema_version: 0 });
    assertNoErrors(validateState(canonicalState), 'State failed validation before serialize');

    const withVersion: GameState = {
        ...canonicalState,
        schema_version: CURRENT_SCHEMA_VERSION,
    };

    return serializeGameState(withVersion, 2);
}

export function deserializeState(payload: string): GameState {
    const parsed: unknown = JSON.parse(payload);
    const migrated = migrateState(parsed);
    assertShapeNoErrors(
        validateGameStateShape(migrated, { requireVersion: CURRENT_SCHEMA_VERSION }),
        'Save schema validation failed after migration'
    );
    assertNoErrors(validateState(migrated), 'State failed validation after deserialize');

    return migrated;
}

function assertNoErrors(issues: ValidationIssue[], prefix: string): void {
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length === 0) return;

    const details = errors
        .map((issue) => `${issue.code}${issue.path ? ` @ ${issue.path}` : ''}: ${issue.message}`)
        .join('; ');
    throw new Error(`${prefix}: ${details}`);
}

function assertShapeNoErrors(result: ReturnType<typeof validateGameStateShape>, prefix: string): void {
    if (result.ok) return;
    throw new Error(`${prefix}:\n${result.errors.join('\n')}`);
}

function structuredClonePolyfill<T>(input: T): T {
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(input);
    }

    return JSON.parse(JSON.stringify(input)) as T;
}

function rescueLegacyTopLevelFields(
    candidate: Record<string, any>,
    parent: Record<string, any> | undefined,
    keys: readonly string[]
): void {
    if (!parent || typeof parent !== 'object') return;

    for (const key of keys) {
        if (!(key in candidate)) continue;
        if (parent[key] === undefined) {
            parent[key] = candidate[key];
        }
        delete candidate[key];
    }
}

function sweepLegacyTopLevelFields(
    candidate: Record<string, any>,
    parent: Record<string, any> | undefined,
    keys: readonly string[]
): void {
    if (!parent || typeof parent !== 'object') return;

    for (const key of keys) {
        if (key in candidate && !(key in parent)) {
            parent[key] = candidate[key];
        }
        delete candidate[key];
    }
}

function deleteLegacyTopLevelFields(candidate: Record<string, any>, keys: readonly string[]): void {
    for (const key of keys) {
        delete candidate[key];
    }
}

function migrateState(raw: unknown): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Cannot migrate: state is not an object');
    }

    // BATCH C §3.8: candidate carries both the typed GameState shape (consumed
    // by applyMigrations + return) and the free-form Record<string, any> shape
    // needed for legacy-field rescue/sweep + ad-hoc `delete candidate.brigade_aor`
    // path. Declaring the intersection lets us drop the prior pair of widening
    // casts at the applyMigrations call + the return statement without changing
    // applyMigrations' signature. The cast itself is from `unknown`
    // (structuredClonePolyfill propagates `T = unknown` through), so it does
    // not introduce a new boundary widening site.
    const candidate = structuredClonePolyfill(raw) as GameState & Record<string, any>;
    const version = candidate.schema_version;
    if (version !== undefined && (!Number.isInteger(version) || version < 0 || version > CURRENT_SCHEMA_VERSION)) {
        throw new Error(`Unsupported schema_version ${String(version)}`);
    }

    const mil = candidate.military;
    if (!mil || typeof mil !== 'object' || Array.isArray(mil)) {
        throw new Error('Cannot migrate: missing military block');
    }
    const pol = candidate.political;
    const disp = candidate.displacement;
    const phaseFCapacityKeys = [
        'settlement_displacement_started_turn',
        'municipality_displacement',
        'settlement_displacement',
    ] as const;
    const allowLegacyPhaseFCapacityTopLevel = version === undefined || version < 16;
    const displacementOperationalKeys = [
        'war_displacement_initiated',
        'hostile_takeover_timers',
        'displacement_camp_state',
    ] as const;
    const allowLegacyDisplacementOperationalTopLevel = version === undefined || version < 17;
    const displacementLazyMapKeys = [
        'displacement_state',
        'minority_flight_state',
        'sustainability_state',
    ] as const;
    const allowLegacyDisplacementLazyMapTopLevel = version === undefined || version < 18;

    rescueLegacyTopLevelFields(candidate, mil, [
        'theatres',
        'army_theatre_assignment',
        'formations',
        'front_posture',
        'front_posture_regions',
        'front_pressure',
        'assignable_front_segments',
        'brigade_front_assignment',
        'militia_pools',
        'war_militia_strength',
        'war_jna',
    ]);
    rescueLegacyTopLevelFields(candidate, pol, [
        'negotiation_status',
        'ceasefire',
        'negotiation_ledger',
        'supply_rights',
        'war_consolidation_until',
        'war_control_strain',
        'war_alliance_rbih_hrhb',
        'municipalities',
        'war_supply_pressure',
        'war_supply_condition',
        'war_exhaustion',
        'war_exhaustion_local',
    ]);
    rescueLegacyTopLevelFields(candidate, disp, [
        'displacement_humanitarian_aggregates',
        'displacement_origin_dest_arrivals',
        'displacement_recent_by_turn',
    ]);
    if (allowLegacyDisplacementOperationalTopLevel) {
        rescueLegacyTopLevelFields(candidate, disp, displacementOperationalKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, displacementOperationalKeys);
    }
    if (allowLegacyDisplacementLazyMapTopLevel) {
        rescueLegacyTopLevelFields(candidate, disp, displacementLazyMapKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, displacementLazyMapKeys);
    }
    if (allowLegacyPhaseFCapacityTopLevel) {
        rescueLegacyTopLevelFields(candidate, disp, phaseFCapacityKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, phaseFCapacityKeys);
    }

    applyMigrations(candidate);
    canonicalizeCurrentFields(candidate, {
        allowDisplacementOperationalDefaults: allowLegacyDisplacementOperationalTopLevel,
    });

    delete candidate.brigade_aor;
    delete candidate.brigade_aor_orders;
    delete candidate.brigade_mun_orders;
    delete candidate.brigade_municipality_assignment;

    sweepLegacyTopLevelFields(candidate, candidate.military, [
        'theatres',
        'army_theatre_assignment',
        'formations',
        'front_posture',
        'front_posture_regions',
        'front_pressure',
        'assignable_front_segments',
        'brigade_front_assignment',
        'militia_pools',
        'war_militia_strength',
        'war_jna',
    ]);
    sweepLegacyTopLevelFields(candidate, candidate.political, [
        'negotiation_status',
        'ceasefire',
        'negotiation_ledger',
        'supply_rights',
        'war_consolidation_until',
        'war_control_strain',
        'war_alliance_rbih_hrhb',
        'municipalities',
        'war_supply_pressure',
        'war_supply_condition',
        'war_exhaustion',
        'war_exhaustion_local',
    ]);
    sweepLegacyTopLevelFields(candidate, candidate.displacement, [
        'displacement_humanitarian_aggregates',
        'displacement_origin_dest_arrivals',
        'displacement_recent_by_turn',
    ]);
    if (allowLegacyDisplacementOperationalTopLevel) {
        sweepLegacyTopLevelFields(candidate, candidate.displacement, displacementOperationalKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, displacementOperationalKeys);
    }
    if (allowLegacyDisplacementLazyMapTopLevel) {
        sweepLegacyTopLevelFields(candidate, candidate.displacement, displacementLazyMapKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, displacementLazyMapKeys);
    }
    if (allowLegacyPhaseFCapacityTopLevel) {
        sweepLegacyTopLevelFields(candidate, candidate.displacement, phaseFCapacityKeys);
    } else {
        deleteLegacyTopLevelFields(candidate, phaseFCapacityKeys);
    }

    return candidate;
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function sortedKeys(record: Record<string, unknown>): string[] {
    return Object.keys(record).sort(strictCompare);
}

function canonicalizeCurrentFields(
    candidate: Record<string, any>,
    options: { allowDisplacementOperationalDefaults: boolean },
): void {
    const mil = candidate.military;
    const pol = candidate.political;
    const disp = candidate.displacement;

    if (mil && typeof mil === 'object') {
        for (const key of ['front_posture', 'front_posture_regions'] as const) {
            const rec = mil[key];
            if (!rec || typeof rec !== 'object' || Array.isArray(rec)) continue;
            const next: Record<string, any> = {};
            for (const oldKey of sortedKeys(rec)) {
                next[canonicalizePoliticalSideId(oldKey)] = rec[oldKey];
            }
            mil[key] = next;
        }

        const pools = mil.militia_pools;
        if (pools && typeof pools === 'object' && !Array.isArray(pools)) {
            for (const key of sortedKeys(pools)) {
                const pool = pools[key];
                if (!pool || typeof pool !== 'object' || Array.isArray(pool)) continue;
                if (pool.faction !== null && typeof pool.faction === 'string') {
                    pool.faction = canonicalizePoliticalSideId(pool.faction);
                }
                if (!Number.isInteger(pool.fatigue) || pool.fatigue < 0) pool.fatigue = 0;
            }
        }
    }

    if (pol && typeof pol === 'object') {
        if (Array.isArray(pol.negotiation_ledger)) {
            for (const entry of pol.negotiation_ledger) {
                if (entry && typeof entry === 'object' && typeof entry.faction_id === 'string') {
                    entry.faction_id = canonicalizePoliticalSideId(entry.faction_id);
                }
            }
        }
        if (pol.supply_rights && typeof pol.supply_rights === 'object' && Array.isArray(pol.supply_rights.corridors)) {
            for (const corridor of pol.supply_rights.corridors) {
                if (corridor && typeof corridor === 'object' && typeof corridor.beneficiary === 'string') {
                    corridor.beneficiary = canonicalizePoliticalSideId(corridor.beneficiary);
                }
            }
            pol.supply_rights.corridors.sort((a: any, b: any) => strictCompare(a?.id ?? '', b?.id ?? ''));
        }
    }

    const hasAnyPhaseI =
        (mil && mil.war_militia_strength !== undefined) ||
        (mil && mil.war_jna !== undefined) ||
        (pol && pol.war_alliance_rbih_hrhb !== undefined) ||
        (disp && disp.war_displacement_initiated !== undefined);
    if (hasAnyPhaseI) {
        if (mil && mil.war_militia_strength === undefined) mil.war_militia_strength = {};
        if (mil && mil.war_jna === undefined) {
            mil.war_jna = { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 };
        }
        if (options.allowDisplacementOperationalDefaults && disp && disp.war_displacement_initiated === undefined) {
            disp.war_displacement_initiated = {};
        }
    }

}
