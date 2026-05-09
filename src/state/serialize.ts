import { validateState, ValidationIssue } from '../validate/validate.js';
import {
    AuthorityProfile,
    CURRENT_SCHEMA_VERSION,
    FactionState,
    GameState,
    StateMeta
} from './game_state.js';
import { canonicalizePoliticalSideId, defaultArmyLabelForSide, POLITICAL_SIDES, type ArmyLabel, type PoliticalSideId } from './identity.js';
import { applyMigrations } from './save_migration.js';
import { serializeGameState } from './serializeGameState.js';

export interface ValidationResult {
    ok: boolean;
    issues: ValidationIssue[];
}

export function serializeState(state: GameState): string {
    const canonicalState = migrateState(state as unknown);
    assertNoErrors(validateState(canonicalState), 'State failed validation before serialize');

    const withVersion: GameState = {
        ...canonicalState,
        schema_version: CURRENT_SCHEMA_VERSION
    };

    return serializeGameState(withVersion, 2);
}

export function deserializeState(payload: string): GameState {
    const parsed = JSON.parse(payload) as unknown;
    const migrated = migrateState(parsed);
    // Apply versioned migrations from the save_migration registry
    applyMigrations(migrated);
    assertNoErrors(validateState(migrated), 'State failed validation after deserialize');

    return migrated;
}

function validateMeta(meta: StateMeta, issues: ValidationIssue[]): void {
    if (!meta || typeof meta !== 'object') {
        issues.push({ severity: 'error', code: 'meta.missing', path: 'meta', message: 'Missing meta block' });
        return;
    }

    if (!Number.isInteger(meta.turn) || meta.turn < 0) {
        issues.push({ severity: 'error', code: 'meta.turn.invalid', path: 'meta.turn', message: 'turn must be a non-negative integer' });
    }

    if (!meta.seed || typeof meta.seed !== 'string') {
        issues.push({ severity: 'error', code: 'meta.seed.invalid', path: 'meta.seed', message: 'seed must be a non-empty string' });
    }
}

function validateAuthorityProfile(profile: AuthorityProfile, path: string, issues: ValidationIssue[]): void {
    if (!profile || typeof profile !== 'object') {
        issues.push({ severity: 'error', code: 'profile.missing', path, message: 'authority profile missing' });
        return;
    }

    const keys: (keyof AuthorityProfile)[] = ['authority', 'legitimacy', 'control', 'logistics', 'exhaustion'];
    for (const key of keys) {
        const value = profile[key];
        if (!Number.isFinite(value)) {
            issues.push({ severity: 'error', code: 'profile.value.invalid', path: `${path}.${key}`, message: 'must be a finite number' });
        }
    }
}

function validateFactions(factions: FactionState[], issues: ValidationIssue[]): void {
    if (!Array.isArray(factions)) {
        issues.push({ severity: 'error', code: 'factions.invalid', path: 'factions', message: 'factions must be an array' });
        return;
    }

    factions.forEach((faction, index) => {
        const basePath = `factions[${index}]`;
        if (!faction || typeof faction !== 'object') {
            issues.push({ severity: 'error', code: 'faction.invalid', path: basePath, message: 'faction must be an object' });
            return;
        }

        if (!faction.id || typeof faction.id !== 'string') {
            issues.push({ severity: 'error', code: 'faction.id.invalid', path: `${basePath}.id`, message: 'id must be a non-empty string' });
        }

        validateAuthorityProfile(faction.profile, `${basePath}.profile`, issues);

        if (!Array.isArray(faction.areasOfResponsibility)) {
            issues.push({
                severity: 'error',
                code: 'faction.aor.invalid',
                path: `${basePath}.areasOfResponsibility`,
                message: 'areasOfResponsibility must be an array'
            });
        } else if (!faction.areasOfResponsibility.every((id) => typeof id === 'string')) {
            issues.push({
                severity: 'error',
                code: 'faction.aor.invalid_item',
                path: `${basePath}.areasOfResponsibility`,
                message: 'areasOfResponsibility must contain strings'
            });
        }

        // command_capacity validation (Phase 9)
        const commandCapacity = (faction as any).command_capacity;
        if (commandCapacity !== undefined) {
            if (!Number.isInteger(commandCapacity) || commandCapacity < 0) {
                issues.push({
                    severity: 'error',
                    code: 'faction.command_capacity.invalid',
                    path: `${basePath}.command_capacity`,
                    message: 'command_capacity must be an integer >= 0'
                });
            }
        }

        // negotiation validation (Phase 11A)
        const negotiation = (faction as any).negotiation;
        if (negotiation !== undefined) {
            if (!negotiation || typeof negotiation !== 'object') {
                issues.push({
                    severity: 'error',
                    code: 'faction.negotiation.invalid',
                    path: `${basePath}.negotiation`,
                    message: 'negotiation must be an object'
                });
            } else {
                const pressure = negotiation.pressure;
                if (!Number.isInteger(pressure) || pressure < 0) {
                    issues.push({
                        severity: 'error',
                        code: 'faction.negotiation.pressure.invalid',
                        path: `${basePath}.negotiation.pressure`,
                        message: 'negotiation.pressure must be an integer >= 0'
                    });
                }
                const lastChangeTurn = negotiation.last_change_turn;
                if (lastChangeTurn !== null && !Number.isInteger(lastChangeTurn)) {
                    issues.push({
                        severity: 'error',
                        code: 'faction.negotiation.last_change_turn.invalid',
                        path: `${basePath}.negotiation.last_change_turn`,
                        message: 'negotiation.last_change_turn must be null or an integer'
                    });
                }
            }
        }
    });
}

function assertNoErrors(issues: ValidationIssue[], prefix: string): void {
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length === 0) return;

    const details = errors
        .map((issue) => `${issue.code}${issue.path ? ` @ ${issue.path}` : ''}: ${issue.message}`)
        .join('; ');
    throw new Error(`${prefix}: ${details}`);
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

function migrateState(raw: unknown): GameState {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Cannot migrate: state is not an object');
    }

    const candidate = structuredClonePolyfill(raw) as unknown as any;
    const version = candidate.schema_version;

    switch (version) {
        case undefined:
        case CURRENT_SCHEMA_VERSION: {
            // Default new fields for older saves.
            const mil = (candidate as any).military;
            if (!mil || typeof mil !== 'object') {
                throw new Error('Cannot migrate: missing military block');
            }
            if (!('front_segments' in mil) || mil.front_segments === undefined) {
                mil.front_segments = {};
            }
            if (mil.theatres === undefined) mil.theatres = {};
            if (mil.army_theatre_assignment === undefined) mil.army_theatre_assignment = {};
            if (mil.formations === undefined) mil.formations = {};
            if (mil.front_posture === undefined) mil.front_posture = {};
            if (mil.front_posture_regions === undefined) mil.front_posture_regions = {};
            if (mil.front_pressure === undefined) mil.front_pressure = {};
            if (mil.assignable_front_segments === undefined) mil.assignable_front_segments = [];
            if (mil.brigade_front_assignment === undefined) mil.brigade_front_assignment = {};
            if (mil.militia_pools === undefined) mil.militia_pools = {};
            // Phase 0: Default meta referendum/war-start fields for older saves
            const meta = candidate.meta as any | undefined;
            if (meta && typeof meta === 'object') {
                if (!('referendum_held' in meta) || meta.referendum_held === undefined) meta.referendum_held = false;
                if (!('referendum_turn' in meta) || meta.referendum_turn === undefined) meta.referendum_turn = null;
                if (!('war_start_turn' in meta) || meta.war_start_turn === undefined) meta.war_start_turn = null;
                if (!('peace_scheduled_referendum_turn' in meta) || meta.peace_scheduled_referendum_turn === undefined) meta.peace_scheduled_referendum_turn = null;
                if (!('peace_scheduled_war_start_turn' in meta) || meta.peace_scheduled_war_start_turn === undefined) meta.peace_scheduled_war_start_turn = null;
                if (!('peace_war_start_control_path' in meta) || meta.peace_war_start_control_path === undefined) meta.peace_war_start_control_path = null;
                if (!('referendum_eligible_turn' in meta) || meta.referendum_eligible_turn === undefined) meta.referendum_eligible_turn = null;
                if (!('referendum_deadline_turn' in meta) || meta.referendum_deadline_turn === undefined) meta.referendum_deadline_turn = null;
                if (!('game_over' in meta) || meta.game_over === undefined) meta.game_over = false;
                if (!('outcome' in meta)) meta.outcome = undefined;
                // war_opposing_edges_streak: do not default on load (preserve round-trip; readers use ?? 0)
            }
            // Phase 11B: Default negotiation_status and ceasefire on political
            const pol = (candidate as any).political;
            const disp = (candidate as any).displacement;

            // Rescue legacy top-level residue into the canonical nested owner before any defaults run.
            // This preserves old-save compatibility without depending on later sweep cleanup.
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
                'war_exhaustion',
                'war_exhaustion_local',
            ]);
            rescueLegacyTopLevelFields(candidate, disp, [
                'war_displacement_initiated',
                'settlement_displacement_started_turn',
                'municipality_displacement',
                'hostile_takeover_timers',
                'displacement_camp_state',
                'settlement_displacement',
            ]);

            if (pol) {
                if (!pol.negotiation_status || typeof pol.negotiation_status !== 'object') {
                    pol.negotiation_status = { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null };
                } else {
                    const ns = pol.negotiation_status;
                    if (typeof ns.ceasefire_active !== 'boolean') ns.ceasefire_active = false;
                    const currentTurn = (candidate.meta as any)?.turn ?? 0;
                    if (ns.ceasefire_since_turn !== null && (!Number.isInteger(ns.ceasefire_since_turn) || ns.ceasefire_since_turn > currentTurn)) {
                        ns.ceasefire_since_turn = null;
                    }
                    if (ns.last_offer_turn !== null && (!Number.isInteger(ns.last_offer_turn) || ns.last_offer_turn > currentTurn)) {
                        ns.last_offer_turn = null;
                    }
                }
                if (!pol.ceasefire || typeof pol.ceasefire !== 'object') {
                    pol.ceasefire = {};
                } else {
                    // Validate and clean ceasefire entries
                    const ceasefire = pol.ceasefire;
                    const currentTurn = (candidate.meta as any)?.turn ?? 0;
                    const keysSorted = Object.keys(ceasefire).sort();
                    for (const edgeId of keysSorted) {
                        const entry = ceasefire[edgeId];
                        if (!entry || typeof entry !== 'object') {
                            delete ceasefire[edgeId];
                            continue;
                        }
                        if (!Number.isInteger(entry.since_turn) || entry.since_turn < 0 || entry.since_turn > currentTurn) {
                            delete ceasefire[edgeId];
                            continue;
                        }
                        if (entry.until_turn !== null && (!Number.isInteger(entry.until_turn) || entry.until_turn < entry.since_turn)) {
                            entry.until_turn = null;
                        }
                        // Remove expired entries
                        if (entry.until_turn !== null && entry.until_turn <= currentTurn) {
                            delete ceasefire[edgeId];
                        }
                    }
                }
            }

            // Ensure deterministic defaulting for new FrontSegmentState fields.
            const segments = (candidate as any).military.front_segments as unknown;
            if (segments && typeof segments === 'object') {
                const segRec = segments as Record<string, any>;
                const keysSorted = Object.keys(segRec).sort();
                for (const key of keysSorted) {
                    const seg = segRec[key];
                    if (!seg || typeof seg !== 'object') continue;
                    if (!Number.isInteger(seg.active_streak) || seg.active_streak < 0) seg.active_streak = 0;
                    if (!Number.isInteger(seg.max_active_streak) || seg.max_active_streak < 0) seg.max_active_streak = 0;
                    if (!Number.isInteger(seg.friction) || seg.friction < 0) seg.friction = 0;
                    if (!Number.isInteger(seg.max_friction) || seg.max_friction < 0) seg.max_friction = 0;
                }
            }

            // Canonicalize faction IDs and ensure deterministic defaulting for new FactionState fields.
            const factions = candidate.factions as unknown;
            if (factions && Array.isArray(factions)) {
                const factionsSorted = [...factions].sort((a: any, b: any) => {
                    const idA = a?.id ?? '';
                    const idB = b?.id ?? '';
                    return idA.localeCompare(idB);
                });
                for (const f of factionsSorted) {
                    if (!f || typeof f !== 'object') continue;
                    // Canonicalize faction ID
                    if (typeof f.id === 'string') {
                        f.id = canonicalizePoliticalSideId(f.id);
                    }
                    if (!Array.isArray(f.supply_sources)) f.supply_sources = [];
                    if (!Number.isInteger(f.command_capacity) || f.command_capacity < 0) f.command_capacity = 0;
                    // Phase 11A: Default negotiation state
                    if (!f.negotiation || typeof f.negotiation !== 'object') {
                        f.negotiation = { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null };
                    } else {
                        if (!Number.isInteger(f.negotiation.pressure) || f.negotiation.pressure < 0) {
                            f.negotiation.pressure = 0;
                        }
                        const currentTurn = (candidate.meta as any)?.turn ?? 0;
                        if (f.negotiation.last_change_turn !== null && (!Number.isInteger(f.negotiation.last_change_turn) || f.negotiation.last_change_turn > currentTurn)) {
                            f.negotiation.last_change_turn = null;
                        }
                        // Phase 12A: Default capital fields
                        if (!Number.isInteger(f.negotiation.capital) || f.negotiation.capital < 0) {
                            f.negotiation.capital = 0;
                        }
                        if (!Number.isInteger(f.negotiation.spent_total) || f.negotiation.spent_total < 0) {
                            f.negotiation.spent_total = 0;
                        }
                        if (f.negotiation.last_capital_change_turn !== null && (!Number.isInteger(f.negotiation.last_capital_change_turn) || f.negotiation.last_capital_change_turn > currentTurn)) {
                            f.negotiation.last_capital_change_turn = null;
                        }
                    }
                }
                // Phase 0: Default faction declaration/prewar fields for older saves
                for (const f of factionsSorted) {
                    if (!f || typeof f !== 'object') continue;
                    if (f.declaration_pressure === undefined) f.declaration_pressure = 0;
                    if (f.declared === undefined) f.declared = false;
                    if (f.declaration_turn === undefined) f.declaration_turn = null;
                }
            }

            // Phase 10: Ensure deterministic defaulting for FormationState ops fields.
            // Also canonicalize formation faction IDs and preserve army labels as force_label.
            const formations = (candidate as any).military?.formations as unknown;
            if (formations && typeof formations === 'object') {
                const formRec = formations as Record<string, any>;
                const keysSorted = Object.keys(formRec).sort();
                for (const key of keysSorted) {
                    const form = formRec[key];
                    if (!form || typeof form !== 'object') continue;

                    // Canonicalize faction ID and preserve army label
                    if (typeof form.faction === 'string') {
                        const oldFaction = form.faction;
                        const canonicalFaction = canonicalizePoliticalSideId(oldFaction);
                        form.faction = canonicalFaction;

                        // If old faction was an army label (ARBiH/VRS/HVO), preserve it as force_label
                        if (oldFaction === "ARBiH" || oldFaction === "VRS" || oldFaction === "HVO") {
                            if (!form.force_label) {
                                form.force_label = oldFaction as ArmyLabel;
                            }
                        }

                        // If faction is now canonical and force_label is missing, set default
                        if (POLITICAL_SIDES.includes(canonicalFaction as PoliticalSideId) && !form.force_label) {
                            // Default rule: always set when missing and faction is known
                            form.force_label = defaultArmyLabelForSide(canonicalFaction as PoliticalSideId);
                        }
                    }

                    if (!form.ops || typeof form.ops !== 'object') {
                        form.ops = { fatigue: 0, last_supplied_turn: null };
                    } else {
                        if (!Number.isInteger(form.ops.fatigue) || form.ops.fatigue < 0) form.ops.fatigue = 0;
                        if (form.ops.last_supplied_turn !== null && (!Number.isInteger(form.ops.last_supplied_turn) || form.ops.last_supplied_turn > ((candidate.meta as any)?.turn ?? 0))) {
                            form.ops.last_supplied_turn = null;
                        }
                    }

                    // Peace phase.0: Initialize formation lifecycle fields with defaults if missing
                    // kind: default 'brigade' for backward compatibility
                    if (form.kind === undefined) {
                        form.kind = 'brigade';
                    }
                    // readiness: default 'active' for backward compatibility (will be derived on next turn)
                    if (form.readiness === undefined) {
                        form.readiness = 'active';
                    }
                    // cohesion: default BRIGADE_BASE_COHESION (60) for backward compatibility
                    if (form.cohesion === undefined) {
                        form.cohesion = 60;
                    }
                    // morale: default 60 for backward compatibility; clamp to [0, 100]
                    if (form.morale === undefined || form.morale === null) {
                        form.morale = 60;
                    }
                    form.morale = Math.max(0, Math.min(100, form.morale));
                    // activation_gated: default false for backward compatibility
                    if (form.activation_gated === undefined) {
                        form.activation_gated = false;
                    }
                    // activation_turn: default null (unknown activation time for existing formations)
                    if (form.activation_turn === undefined) {
                        form.activation_turn = null;
                    }
                }
            }

            // Phase 10: Ensure deterministic defaulting for MilitiaPoolState fatigue field.
            // Also canonicalize militia pool faction IDs.
            const militiaPools = mil.militia_pools as unknown;
            if (militiaPools && typeof militiaPools === 'object') {
                const poolRec = militiaPools as Record<string, any>;
                const keysSorted = Object.keys(poolRec).sort();
                for (const key of keysSorted) {
                    const pool = poolRec[key];
                    if (!pool || typeof pool !== 'object') continue;
                    // Canonicalize faction ID (null is allowed)
                    if (pool.faction !== null && typeof pool.faction === 'string') {
                        pool.faction = canonicalizePoliticalSideId(pool.faction);
                    }
                    if (!Number.isInteger(pool.fatigue) || pool.fatigue < 0) pool.fatigue = 0;
                }
            }

            // Phase 12A: Default negotiation_ledger and canonicalize faction_id in entries
            if (pol) {
                if (!('negotiation_ledger' in pol) || pol.negotiation_ledger === undefined) {
                    pol.negotiation_ledger = [];
                } else if (!Array.isArray(pol.negotiation_ledger)) {
                    pol.negotiation_ledger = [];
                } else {
                // Canonicalize faction_id in ledger entries
                    const ledger = pol.negotiation_ledger as any[];
                    for (const entry of ledger) {
                        if (entry && typeof entry === 'object' && typeof entry.faction_id === 'string') {
                            entry.faction_id = canonicalizePoliticalSideId(entry.faction_id);
                        }
                    }
                }
            }

            // Phase 12C.3: Default supply_rights
            if (pol) {
                if (!('supply_rights' in pol) || pol.supply_rights === undefined) {
                    pol.supply_rights = { corridors: [] };
                } else {
                    const supplyRights = pol.supply_rights as any;
                if (!supplyRights || typeof supplyRights !== 'object') {
                        pol.supply_rights = { corridors: [] };
                } else {
                    if (!Array.isArray(supplyRights.corridors)) {
                        supplyRights.corridors = [];
                    } else {
                        // Canonicalize beneficiary in corridor rights
                        const corridors = supplyRights.corridors as any[];
                        for (const corridor of corridors) {
                            if (corridor && typeof corridor === 'object' && typeof corridor.beneficiary === 'string') {
                                corridor.beneficiary = canonicalizePoliticalSideId(corridor.beneficiary);
                            }
                        }
                        // Ensure corridors are sorted by id (deterministic ordering)
                        supplyRights.corridors.sort((a: any, b: any) => {
                            const idA = a?.id ?? '';
                            const idB = b?.id ?? '';
                            return idA.localeCompare(idB);
                        });
                    }
                }
            }
            }

            // Canonicalize faction IDs in front_posture and front_posture_regions keys
            if (mil.front_posture && typeof mil.front_posture === 'object') {
                const posture = mil.front_posture as Record<string, any>;
                const oldKeys = Object.keys(posture).sort();
                const newPosture: Record<string, any> = {};
                for (const oldKey of oldKeys) {
                    const canonicalKey = canonicalizePoliticalSideId(oldKey);
                    newPosture[canonicalKey] = posture[oldKey];
                }
                mil.front_posture = newPosture;
            }

            if (mil.front_posture_regions && typeof mil.front_posture_regions === 'object') {
                const postureRegions = mil.front_posture_regions as Record<string, any>;
                const oldKeys = Object.keys(postureRegions).sort();
                const newPostureRegions: Record<string, any> = {};
                for (const oldKey of oldKeys) {
                    const canonicalKey = canonicalizePoliticalSideId(oldKey);
                    newPostureRegions[canonicalKey] = postureRegions[oldKey];
                }
                mil.front_posture_regions = newPostureRegions;
            }

            // Phase 0: Default municipalities for older saves
            if (pol && (!('municipalities' in pol) || pol.municipalities === undefined)) {
                pol.municipalities = {};
            }

            // Phase 0: Default event log and relationships for older saves (do not inject if absent)
            // phase0_events_log and phase0_relationships are optional; leave undefined if not present

            // Peace phase: Default Peace phase optional state for determinism when present (do not inject for old saves).
            // When any peace-phase key exists, ensure others have deterministic defaults for round-trip.
            const hasAnyPhaseI =
                (pol && pol.war_consolidation_until !== undefined) ||
                (mil && mil.war_militia_strength !== undefined) ||
                (pol && pol.war_control_strain !== undefined) ||
                (mil && mil.war_jna !== undefined) ||
                (pol && pol.war_alliance_rbih_hrhb !== undefined) ||
                (disp && disp.war_displacement_initiated !== undefined);
            if (hasAnyPhaseI) {
                if (pol && (!('war_consolidation_until' in pol) || pol.war_consolidation_until === undefined)) {
                    pol.war_consolidation_until = {};
                }
                if (!('war_militia_strength' in mil) || mil.war_militia_strength === undefined) {
                    mil.war_militia_strength = {};
                }
                if (pol && (!('war_control_strain' in pol) || pol.war_control_strain === undefined)) {
                    pol.war_control_strain = {};
                }
                if (!('war_jna' in mil) || mil.war_jna === undefined) {
                    mil.war_jna = { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 };
                } else {
                    const jna = mil.war_jna as any;
                    if (typeof jna.transition_begun !== 'boolean') jna.transition_begun = false;
                    if (typeof jna.withdrawal_progress !== 'number' || jna.withdrawal_progress < 0 || jna.withdrawal_progress > 1) {
                        jna.withdrawal_progress = 0;
                    }
                    if (typeof jna.asset_transfer_rs !== 'number' || jna.asset_transfer_rs < 0 || jna.asset_transfer_rs > 1) {
                        jna.asset_transfer_rs = 0;
                    }
                }
                // war_alliance_rbih_hrhb: leave undefined if absent; valid range [-1, 1]
                if (disp && (!('war_displacement_initiated' in disp) || disp.war_displacement_initiated === undefined)) {
                    disp.war_displacement_initiated = {};
                }
            }

            // War phase: Default War phase optional state for determinism when present (do not inject for old saves).
            // Fields are nested under `political` or `displacement` – check and write to the correct parent.
            const polWar = pol;
            const dispWar = disp;
            const hasAnyPhaseII =
                (polWar && polWar.war_supply_pressure !== undefined) ||
                (polWar && polWar.war_exhaustion !== undefined) ||
                (polWar && polWar.war_exhaustion_local !== undefined) ||
                (dispWar && dispWar.hostile_takeover_timers !== undefined) ||
                (dispWar && dispWar.displacement_camp_state !== undefined);
            if (hasAnyPhaseII) {
                if (polWar) {
                    if (!('war_supply_pressure' in polWar) || polWar.war_supply_pressure === undefined) polWar.war_supply_pressure = {};
                    if (!('war_exhaustion' in polWar) || polWar.war_exhaustion === undefined) polWar.war_exhaustion = {};
                    if (!('war_exhaustion_local' in polWar) || polWar.war_exhaustion_local === undefined) polWar.war_exhaustion_local = {};
                }
                if (dispWar) {
                    if (!('hostile_takeover_timers' in dispWar) || dispWar.hostile_takeover_timers === undefined) dispWar.hostile_takeover_timers = {};
                    if (!('displacement_camp_state' in dispWar) || dispWar.displacement_camp_state === undefined) dispWar.displacement_camp_state = {};
                }
            }

            // Phase F: Default Phase F displacement state when present (missing maps = empty).
            const hasAnyPhaseF =
                (disp && disp.settlement_displacement !== undefined) ||
                (disp && disp.settlement_displacement_started_turn !== undefined) ||
                (disp && disp.municipality_displacement !== undefined);
            if (hasAnyPhaseF) {
                if (disp && (!('settlement_displacement' in disp) || disp.settlement_displacement === undefined)) {
                    disp.settlement_displacement = {};
                }
                if (disp && (!('settlement_displacement_started_turn' in disp) || disp.settlement_displacement_started_turn === undefined)) {
                    disp.settlement_displacement_started_turn = {};
                }
                if (disp && (!('municipality_displacement' in disp) || disp.municipality_displacement === undefined)) {
                    disp.municipality_displacement = {};
                }
            }

            // Displacement event log: default to empty array
            if (disp && !Array.isArray(disp.displacement_event_log)) {
                disp.displacement_event_log = [];
            }

            // LANE D-PRE substrate: humanitarian aggregates + origin-dest arrivals.
            // Default-empty for old saves so deserialize is byte-stable; new saves
            // populate via appendDisplacementEvent. D-PRE consumers do NOT read
            // these yet, so absence in old saves is invisible to scenario output.
            if (disp && (disp.displacement_humanitarian_aggregates === undefined
                || disp.displacement_humanitarian_aggregates === null
                || typeof disp.displacement_humanitarian_aggregates !== 'object'
                || Array.isArray(disp.displacement_humanitarian_aggregates))) {
                disp.displacement_humanitarian_aggregates = {};
            }
            if (disp && (disp.displacement_origin_dest_arrivals === undefined
                || disp.displacement_origin_dest_arrivals === null
                || typeof disp.displacement_origin_dest_arrivals !== 'object'
                || Array.isArray(disp.displacement_origin_dest_arrivals))) {
                disp.displacement_origin_dest_arrivals = {};
            }
            if (disp && (disp.displacement_recent_by_turn === undefined
                || disp.displacement_recent_by_turn === null
                || typeof disp.displacement_recent_by_turn !== 'object'
                || Array.isArray(disp.displacement_recent_by_turn))) {
                disp.displacement_recent_by_turn = {};
            }

            // Migrate corps_command active_operation → active_operations
            const corpsCommand = mil?.corps_command;
            if (corpsCommand && typeof corpsCommand === 'object') {
                const ccRec = corpsCommand as Record<string, any>;
                const ccKeys = Object.keys(ccRec).sort();
                for (const corpsId of ccKeys) {
                    const cmd = ccRec[corpsId];
                    if (!cmd || typeof cmd !== 'object') continue;
                    if (!cmd.active_operations) {
                        cmd.active_operations = cmd.active_operation
                            ? [cmd.active_operation]
                            : [];
                        delete cmd.active_operation;
                    }
                }
            }

            // AoR phase-out: strip legacy keys so serialization allowlist passes (War phase uses location_osid only)
            delete candidate.brigade_aor;
            delete candidate.brigade_aor_orders;
            delete candidate.brigade_mun_orders;
            delete candidate.brigade_municipality_assignment;

            // Sweep: move any stray fields that migration wrote to top-level back to their correct parents.
            // Military fields:
            const milSweep = (candidate as any).military;
            if (milSweep) {
                for (const k of ['theatres', 'army_theatre_assignment', 'formations', 'front_posture',
                    'front_posture_regions', 'front_pressure', 'assignable_front_segments',
                    'brigade_front_assignment', 'militia_pools', 'war_militia_strength', 'war_jna'] as const) {
                    if (k in candidate && !(k in milSweep)) {
                        milSweep[k] = (candidate as any)[k];
                    }
                    delete (candidate as any)[k];
                }
            }
            // Political fields:
            const polSweep = (candidate as any).political;
            if (polSweep) {
                for (const k of ['negotiation_status', 'ceasefire', 'negotiation_ledger', 'supply_rights',
                    'war_consolidation_until', 'war_control_strain', 'war_alliance_rbih_hrhb',
                    'municipalities', 'war_supply_pressure', 'war_exhaustion', 'war_exhaustion_local'] as const) {
                    if (k in candidate && !(k in polSweep)) {
                        polSweep[k] = (candidate as any)[k];
                    }
                    delete (candidate as any)[k];
                }
            }
            // Displacement fields:
            const dispSweep = (candidate as any).displacement;
            if (dispSweep) {
                for (const k of ['war_displacement_initiated', 'settlement_displacement_started_turn',
                    'municipality_displacement', 'hostile_takeover_timers', 'displacement_camp_state',
                    'settlement_displacement'] as const) {
                    if (k in candidate && !(k in dispSweep)) {
                        dispSweep[k] = (candidate as any)[k];
                    }
                    delete (candidate as any)[k];
                }
            }

            return candidate as unknown as GameState;
        }
        default:
            throw new Error(`Unsupported schema_version ${String(version)}`);
    }
}

