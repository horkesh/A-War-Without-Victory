/**
 * Phase A1.1: Canonical GameState shape validation (foundation-only).
 * Lightweight validator: no derived state, political_controller presence, weekly turn invariant.
 * Engine Invariants §9.1, §11, §13.
 */


import type { PhaseName } from './game_state.js';


/** Known phase names (must match PhaseName in game_state.ts). */
const KNOWN_PHASES: readonly PhaseName[] = ['peace', 'war'];
const CANONICAL_PLAYER_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

/**
 * Strict comparator for deterministic ordering (Engine Invariants §11.3).
 * No localeCompare; avoids locale-dependent behavior.
 */
export function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Stable key ordering for records/maps (Engine Invariants §11.3).
 * Use when producing arrays from Record<Id, T> for output or deterministic comparison.
 */
export function sortedKeysForRecord<K extends string>(record: Record<K, unknown>): K[] {
    return (Object.keys(record) as K[]).slice().sort(strictCompare);
}

/**
 * Top-level keys that must NOT appear in GameState (derived state; Engine Invariants §13.1).
 * Conservative denylist: do not serialize these; they must be recomputed each turn.
 */
const DERIVED_STATE_DENYLIST: readonly string[] = [
    'fronts',
    'corridors',
    'derived',
    'cache',
    // Phase E: AoR and rear zone are derived each turn; must not be serialized (Engine Invariants §13.1).
    'phase_e_aor_membership',
    'phase_e_aor_influence',
    'phase_e_rear_zone'
];

export type ValidateGameStateShapeResult =
    | { ok: true }
    | { ok: false; errors: string[] };

export interface ValidateGameStateShapeOptions {
    /**
     * When supplied, fields introduced by migrations up through this version
     * are required if state.schema_version is at least the introducing version.
     */
    requireVersion?: number;
}

interface VersionRequiredField {
    version: number;
    path: string;
    check: (value: unknown) => boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCanonicalPlayerFaction(value: unknown): boolean {
    return typeof value === 'string' && CANONICAL_PLAYER_FACTIONS.includes(value as typeof CANONICAL_PLAYER_FACTIONS[number]);
}

function getPathValue(root: unknown, path: string): unknown {
    let current: unknown = root;
    for (const part of path.split('.')) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

const VERSION_REQUIRED_FIELDS: readonly VersionRequiredField[] = [
    { version: 3, path: 'meta.referendum_held', check: (v) => typeof v === 'boolean' },
    { version: 3, path: 'meta.referendum_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.war_start_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_scheduled_referendum_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_scheduled_war_start_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.peace_war_start_control_path', check: (v) => v === null || typeof v === 'string' },
    { version: 3, path: 'meta.referendum_eligible_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.referendum_deadline_turn', check: (v) => v === null || Number.isInteger(v) },
    { version: 3, path: 'meta.game_over', check: (v) => typeof v === 'boolean' },
    { version: 4, path: 'political.negotiation_status', check: isRecord },
    { version: 4, path: 'political.ceasefire', check: isRecord },
    { version: 4, path: 'political.negotiation_ledger', check: Array.isArray },
    { version: 4, path: 'political.supply_rights', check: isRecord },
    { version: 5, path: 'military.front_segments', check: isRecord },
    { version: 5, path: 'military.theatres', check: isRecord },
    { version: 5, path: 'military.army_theatre_assignment', check: isRecord },
    { version: 5, path: 'military.formations', check: isRecord },
    { version: 5, path: 'military.front_posture', check: isRecord },
    { version: 5, path: 'military.front_posture_regions', check: isRecord },
    { version: 5, path: 'military.front_pressure', check: isRecord },
    { version: 5, path: 'military.assignable_front_segments', check: Array.isArray },
    { version: 5, path: 'military.brigade_front_assignment', check: isRecord },
    { version: 5, path: 'military.militia_pools', check: isRecord },
    { version: 10, path: 'military.army_co_decision_traces', check: isRecord },
    { version: 10, path: 'military.army_corps_directives_by_faction', check: isRecord },
];

/**
 * Validates Phase A1.1 canonical GameState shape (foundation-only).
 * - current_turn (meta.turn) is integer >= 0
 * - phase (if present) is one of known PhaseName
 * - Every settlement in political_controllers has political_controller defined (value may be null)
 * - No denylisted derived-state keys at top level
 */
export function validateGameStateShape(
    state: unknown,
    options: ValidateGameStateShapeOptions = {},
): ValidateGameStateShapeResult {
    const errors: string[] = [];

    if (state == null || typeof state !== 'object') {
        return { ok: false, errors: ['State must be an object'] };
    }

    const s = state as Record<string, unknown>;
    const stateVersion = typeof s.schema_version === 'number' && Number.isInteger(s.schema_version)
        ? s.schema_version
        : 0;

    // Denylist: no derived-state keys at top level
    for (const key of DERIVED_STATE_DENYLIST) {
        if (Object.prototype.hasOwnProperty.call(s, key)) {
            errors.push(`Top-level key "${key}" is denylisted (derived state must not be stored; Engine Invariants §13.1)`);
        }
    }

    if (options.requireVersion !== undefined) {
        for (const field of VERSION_REQUIRED_FIELDS) {
            if (stateVersion < field.version || field.version > options.requireVersion) continue;
            const value = getPathValue(s, field.path);
            if (value === undefined || !field.check(value)) {
                errors.push(`v${field.version} required field missing or invalid: ${field.path}`);
            }
        }
    }

    if (!Object.prototype.hasOwnProperty.call(s, 'meta')) {
        errors.push('Missing required field: meta');
    } else {
        const meta = s.meta;
        if (meta == null || typeof meta !== 'object') {
            errors.push('meta must be an object');
        } else {
            const m = meta as Record<string, unknown>;
            if (!('turn' in m)) {
                errors.push('meta.turn is required');
            } else {
                const turn = m.turn;
                if (typeof turn !== 'number' || !Number.isInteger(turn) || turn < 0) {
                    errors.push('meta.turn must be a non-negative integer (weeks)');
                }
            }
            if ('phase' in m && m.phase !== undefined) {
                const phase = m.phase;
                if (typeof phase !== 'string' || !KNOWN_PHASES.includes(phase as PhaseName)) {
                    errors.push(`meta.phase must be one of: ${KNOWN_PHASES.join(', ')}`);
                }
            }
            // player_faction is required for current loaded gameplay state. Scenario JSON may remain neutral;
            // legacy saves receive the desktop default through save migration v14.
            // Headless harness exemption: scenario_runner sets headless_scenario_auto_control=true and
            // leaves player_faction undefined so the event evaluator routes all events through bot
            // auto-respond. Don't require player_faction in this case (matches save-migration v14 exemption).
            const requirePlayerFaction = stateVersion >= 14 || (options.requireVersion !== undefined && options.requireVersion >= 14);
            const isHeadlessHarness = m.headless_scenario_auto_control === true;
            if (requirePlayerFaction && !isHeadlessHarness) {
                if (!isCanonicalPlayerFaction(m.player_faction)) {
                    errors.push('meta.player_faction is required and must be one of: RBiH, RS, HRHB');
                }
            } else if ('player_faction' in m && m.player_faction !== undefined) {
                if (!isCanonicalPlayerFaction(m.player_faction)) {
                    errors.push('meta.player_faction must be one of: RBiH, RS, HRHB when present');
                }
            }
            // Phase 0: Referendum and war-start fields (optional; validate type when present)
            if ('referendum_held' in m && m.referendum_held !== undefined && typeof m.referendum_held !== 'boolean') {
                errors.push('meta.referendum_held must be boolean when present');
            }
            if ('referendum_turn' in m && m.referendum_turn !== undefined && m.referendum_turn !== null && (typeof m.referendum_turn !== 'number' || !Number.isInteger(m.referendum_turn) || m.referendum_turn < 0)) {
                errors.push('meta.referendum_turn must be null or a non-negative integer when present');
            }
            if ('war_start_turn' in m && m.war_start_turn !== undefined && m.war_start_turn !== null && (typeof m.war_start_turn !== 'number' || !Number.isInteger(m.war_start_turn) || m.war_start_turn < 0)) {
                errors.push('meta.war_start_turn must be null or a non-negative integer when present');
            }
            if ('peace_scheduled_referendum_turn' in m && m.peace_scheduled_referendum_turn !== undefined && m.peace_scheduled_referendum_turn !== null && (typeof m.peace_scheduled_referendum_turn !== 'number' || !Number.isInteger(m.peace_scheduled_referendum_turn) || m.peace_scheduled_referendum_turn < 0)) {
                errors.push('meta.peace_scheduled_referendum_turn must be null or a non-negative integer when present');
            }
            if ('peace_scheduled_war_start_turn' in m && m.peace_scheduled_war_start_turn !== undefined && m.peace_scheduled_war_start_turn !== null && (typeof m.peace_scheduled_war_start_turn !== 'number' || !Number.isInteger(m.peace_scheduled_war_start_turn) || m.peace_scheduled_war_start_turn < 0)) {
                errors.push('meta.peace_scheduled_war_start_turn must be null or a non-negative integer when present');
            }
            if ('peace_war_start_control_path' in m && m.peace_war_start_control_path !== undefined && m.peace_war_start_control_path !== null && typeof m.peace_war_start_control_path !== 'string') {
                errors.push('meta.peace_war_start_control_path must be string or null when present');
            }
            if ('referendum_eligible_turn' in m && m.referendum_eligible_turn !== undefined && m.referendum_eligible_turn !== null && (typeof m.referendum_eligible_turn !== 'number' || !Number.isInteger(m.referendum_eligible_turn) || m.referendum_eligible_turn < 0)) {
                errors.push('meta.referendum_eligible_turn must be null or a non-negative integer when present');
            }
            if ('referendum_deadline_turn' in m && m.referendum_deadline_turn !== undefined && m.referendum_deadline_turn !== null && (typeof m.referendum_deadline_turn !== 'number' || !Number.isInteger(m.referendum_deadline_turn) || m.referendum_deadline_turn < 0)) {
                errors.push('meta.referendum_deadline_turn must be null or a non-negative integer when present');
            }
            if ('game_over' in m && m.game_over !== undefined && typeof m.game_over !== 'boolean') {
                errors.push('meta.game_over must be boolean when present');
            }
            if ('outcome' in m && m.outcome !== undefined && m.outcome !== null && typeof m.outcome !== 'string') {
                errors.push('meta.outcome must be string or null when present');
            }
            // Phase 0→I transition audit (§8 Output Contract; optional when present)
            if ('peace_end_turn' in m && m.peace_end_turn !== undefined && m.peace_end_turn !== null && (typeof m.peace_end_turn !== 'number' || !Number.isInteger(m.peace_end_turn) || m.peace_end_turn < 0)) {
                errors.push('meta.peace_end_turn must be null or a non-negative integer when present');
            }
            if ('war_start_lifecycle_phase_turn' in m && m.war_start_lifecycle_phase_turn !== undefined && m.war_start_lifecycle_phase_turn !== null && (typeof m.war_start_lifecycle_phase_turn !== 'number' || !Number.isInteger(m.war_start_lifecycle_phase_turn) || m.war_start_lifecycle_phase_turn < 0)) {
                errors.push('meta.war_start_lifecycle_phase_turn must be null or a non-negative integer when present');
            }
            if ('escalation_reason' in m && m.escalation_reason !== undefined && m.escalation_reason !== null && typeof m.escalation_reason !== 'string') {
                errors.push('meta.escalation_reason must be string or null when present');
            }
            // D0.9.1: Peace phase opposing-edges streak (optional; non-negative integer when present)
            if (
                'war_opposing_edges_streak' in m &&
                m.war_opposing_edges_streak !== undefined &&
                (typeof m.war_opposing_edges_streak !== 'number' ||
                    !Number.isInteger(m.war_opposing_edges_streak) ||
                    m.war_opposing_edges_streak < 0)
            ) {
                errors.push('meta.war_opposing_edges_streak must be a non-negative integer when present');
            }
            if (
                'rbih_hrhb_war_earliest_turn' in m &&
                m.rbih_hrhb_war_earliest_turn !== undefined &&
                m.rbih_hrhb_war_earliest_turn !== null &&
                (typeof m.rbih_hrhb_war_earliest_turn !== 'number' ||
                    !Number.isInteger(m.rbih_hrhb_war_earliest_turn) ||
                    m.rbih_hrhb_war_earliest_turn < 0)
            ) {
                errors.push('meta.rbih_hrhb_war_earliest_turn must be null or a non-negative integer when present');
            }
        }
    }

    // Partition root validation: military, political, displacement
    if (!Object.prototype.hasOwnProperty.call(s, 'military') || s.military == null || typeof s.military !== 'object' || Array.isArray(s.military)) {
        errors.push('state.military must be a non-null object');
    }
    if (!Object.prototype.hasOwnProperty.call(s, 'political') || s.political == null || typeof s.political !== 'object' || Array.isArray(s.political)) {
        errors.push('state.political must be a non-null object');
    } else {
        const pol = s.political as Record<string, unknown>;
        if (!Object.prototype.hasOwnProperty.call(pol, 'political_controllers') || pol.political_controllers == null || typeof pol.political_controllers !== 'object' || Array.isArray(pol.political_controllers)) {
            errors.push('state.political.political_controllers must be a non-null object');
        }
    }
    // displacement is optional (may be undefined for pre-displacement saves)
    if (Object.prototype.hasOwnProperty.call(s, 'displacement') && s.displacement !== undefined) {
        if (s.displacement === null || typeof s.displacement !== 'object' || Array.isArray(s.displacement)) {
            errors.push('state.displacement must be an object when present');
        }
    }

    // Peace phase: optional early-war fields live under state.military/state.political
    const military = s.military as Record<string, unknown>;
    if (military && typeof military === 'object' && !Array.isArray(military) && 'pending_event_notifications' in military && military.pending_event_notifications !== undefined) {
        const notifications = military.pending_event_notifications;
        if (!Array.isArray(notifications)) {
            errors.push('military.pending_event_notifications must be an array when present');
        } else {
            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];
                if (notification == null || typeof notification !== 'object' || Array.isArray(notification)) {
                    errors.push(`military.pending_event_notifications[${i}] must be an object`);
                    continue;
                }
                const n = notification as Record<string, unknown>;
                for (const key of ['notification_id', 'event_id', 'source_faction', 'target_faction', 'response_id', 'headline', 'body']) {
                    if (typeof n[key] !== 'string' || (n[key] as string).length === 0) {
                        errors.push(`military.pending_event_notifications[${i}].${key} must be a non-empty string`);
                    }
                }
                if (!isCanonicalPlayerFaction(n.source_faction)) {
                    errors.push(`military.pending_event_notifications[${i}].source_faction must be one of: RBiH, RS, HRHB`);
                }
                if (!isCanonicalPlayerFaction(n.target_faction)) {
                    errors.push(`military.pending_event_notifications[${i}].target_faction must be one of: RBiH, RS, HRHB`);
                }
                if (
                    typeof n.surfaced_on_turn !== 'number' ||
                    !Number.isInteger(n.surfaced_on_turn) ||
                    n.surfaced_on_turn < 0
                ) {
                    errors.push(`military.pending_event_notifications[${i}].surfaced_on_turn must be a non-negative integer`);
                }
                if (typeof n.consumed !== 'boolean') {
                    errors.push(`military.pending_event_notifications[${i}].consumed must be boolean`);
                }
            }
        }
    }

    if (military && typeof military === 'object' && !Array.isArray(military) && 'war_jna' in military && military.war_jna !== undefined) {
        const jna = military.war_jna;
        if (jna !== null && typeof jna === 'object') {
            const j = jna as Record<string, unknown>;
            if (typeof j.transition_begun !== 'boolean') {
                errors.push('military.war_jna.transition_begun must be boolean when present');
            }
            if (typeof j.withdrawal_progress !== 'number' || j.withdrawal_progress < 0 || j.withdrawal_progress > 1) {
                errors.push('military.war_jna.withdrawal_progress must be a number in [0, 1] when present');
            }
            if (typeof j.asset_transfer_rs !== 'number' || j.asset_transfer_rs < 0 || j.asset_transfer_rs > 1) {
                errors.push('military.war_jna.asset_transfer_rs must be a number in [0, 1] when present');
            }
        } else {
            errors.push('military.war_jna must be an object when present');
        }
    }

    // War phase: optional supply pressure and exhaustion live under state.political
    const political = s.political as Record<string, unknown>;
    if (political && typeof political === 'object' && !Array.isArray(political)) {
        if ('war_alliance_rbih_hrhb' in political && political.war_alliance_rbih_hrhb !== undefined) {
            const v = political.war_alliance_rbih_hrhb;
            if (typeof v !== 'number' || v < -1 || v > 1) {
                errors.push('political.war_alliance_rbih_hrhb must be a number in [-1, 1] when present');
            }
        }
        if ('war_supply_pressure' in political && political.war_supply_pressure !== undefined) {
            const pp = political.war_supply_pressure;
            if (pp !== null && typeof pp === 'object' && !Array.isArray(pp)) {
                for (const [fid, val] of Object.entries(pp)) {
                    if (typeof val !== 'number' || val < 0 || val > 100) {
                        errors.push(`political.war_supply_pressure.${fid} must be a number in [0, 100] when present`);
                    }
                }
            } else {
                errors.push('political.war_supply_pressure must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_supply_condition' in political && political.war_supply_condition !== undefined) {
            const sc = political.war_supply_condition;
            if (sc !== null && typeof sc === 'object' && !Array.isArray(sc)) {
                for (const [fid, val] of Object.entries(sc)) {
                    if (typeof val !== 'number' || val < 0 || val > 100) {
                        errors.push(`political.war_supply_condition.${fid} must be a number in [0, 100] when present`);
                    }
                }
            } else {
                errors.push('political.war_supply_condition must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_exhaustion' in political && political.war_exhaustion !== undefined) {
            const ex = political.war_exhaustion;
            if (ex !== null && typeof ex === 'object' && !Array.isArray(ex)) {
                for (const [fid, val] of Object.entries(ex)) {
                    if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
                        errors.push(`political.war_exhaustion.${fid} must be a non-negative finite number when present`);
                    }
                }
            } else {
                errors.push('political.war_exhaustion must be an object (Record<FactionId, number>) when present');
            }
        }
        if ('war_exhaustion_local' in political && political.war_exhaustion_local !== undefined) {
            const loc = political.war_exhaustion_local;
            if (loc !== null && typeof loc === 'object' && !Array.isArray(loc)) {
                for (const [sid, val] of Object.entries(loc)) {
                    if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
                        errors.push(`political.war_exhaustion_local.${sid} must be a non-negative finite number when present`);
                    }
                }
            } else {
                errors.push('political.war_exhaustion_local must be an object (Record<SettlementId, number>) when present');
            }
        }
    }

    // War phase: AoR keys removed (brigade_municipality_assignment, brigade_mun_orders not validated; legacy load may strip)

    // Phase F: displacement state (stored; monotonic [0, 1]; missing maps treated as empty)
    const displacement = s.displacement;
    if (isRecord(displacement)) {
        if ('settlement_displacement' in displacement && displacement.settlement_displacement !== undefined) {
            const sd = displacement.settlement_displacement;
            if (sd !== null && typeof sd === 'object' && !Array.isArray(sd)) {
                for (const [sid, val] of Object.entries(sd)) {
                    if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
                        errors.push(`displacement.settlement_displacement.${sid} must be a number in [0, 1] when present`);
                    }
                }
            } else {
                errors.push('displacement.settlement_displacement must be an object (Record<SettlementId, number>) when present');
            }
        }
        if ('settlement_displacement_started_turn' in displacement && displacement.settlement_displacement_started_turn !== undefined) {
            const st = displacement.settlement_displacement_started_turn;
            if (st !== null && typeof st === 'object' && !Array.isArray(st)) {
                for (const [sid, val] of Object.entries(st)) {
                    if (!Number.isInteger(val) || (val as number) < 0) {
                        errors.push(`displacement.settlement_displacement_started_turn.${sid} must be a non-negative integer when present`);
                    }
                }
            } else {
                errors.push('displacement.settlement_displacement_started_turn must be an object (Record<SettlementId, number>) when present');
            }
        }
        if ('municipality_displacement' in displacement && displacement.municipality_displacement !== undefined) {
            const md = displacement.municipality_displacement;
            if (md !== null && typeof md === 'object' && !Array.isArray(md)) {
                for (const [munId, val] of Object.entries(md)) {
                    if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
                        errors.push(`displacement.municipality_displacement.${munId} must be a number in [0, 1] when present`);
                    }
                }
            } else {
                errors.push('displacement.municipality_displacement must be an object (Record<MunicipalityId, number>) when present');
            }
        }
        if ('hostile_takeover_timers' in displacement && displacement.hostile_takeover_timers !== undefined) {
            const timers = displacement.hostile_takeover_timers;
            if (timers !== null && typeof timers === 'object' && !Array.isArray(timers)) {
                for (const [munId, raw] of Object.entries(timers)) {
                    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
                        errors.push(`displacement.hostile_takeover_timers.${munId} must be an object when present`);
                        continue;
                    }
                    const rec = raw as Record<string, unknown>;
                    if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.mun_id must be a non-empty string`);
                    }
                    if (typeof rec.from_faction !== 'string' || rec.from_faction.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.from_faction must be a non-empty string`);
                    }
                    if (typeof rec.to_faction !== 'string' || rec.to_faction.length === 0) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.to_faction must be a non-empty string`);
                    }
                    if (
                        typeof rec.started_turn !== 'number' ||
                        !Number.isInteger(rec.started_turn) ||
                        rec.started_turn < 0
                    ) {
                        errors.push(`displacement.hostile_takeover_timers.${munId}.started_turn must be a non-negative integer`);
                    }
                }
            } else {
                errors.push('displacement.hostile_takeover_timers must be an object (Record<string, HostileTakeoverTimerState>) when present');
            }
        }
    }
    if (displacement && typeof displacement === 'object' && !Array.isArray(displacement) && 'displacement_camp_state' in displacement && displacement.displacement_camp_state !== undefined) {
        const camps = displacement.displacement_camp_state;
        if (camps !== null && typeof camps === 'object' && !Array.isArray(camps)) {
            for (const [munId, raw] of Object.entries(camps)) {
                if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
                    errors.push(`displacement.displacement_camp_state.${munId} must be an object when present`);
                    continue;
                }
                const rec = raw as Record<string, unknown>;
                if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
                    errors.push(`displacement.displacement_camp_state.${munId}.mun_id must be a non-empty string`);
                }
                if (typeof rec.population !== 'number' || !Number.isFinite(rec.population) || rec.population < 0) {
                    errors.push(`displacement.displacement_camp_state.${munId}.population must be a non-negative number`);
                }
                if (
                    typeof rec.started_turn !== 'number' ||
                    !Number.isInteger(rec.started_turn) ||
                    rec.started_turn < 0
                ) {
                    errors.push(`displacement.displacement_camp_state.${munId}.started_turn must be a non-negative integer`);
                }
                const byFaction = rec.by_faction;
                if (byFaction !== undefined) {
                    if (byFaction == null || typeof byFaction !== 'object' || Array.isArray(byFaction)) {
                        errors.push(`displacement.displacement_camp_state.${munId}.by_faction must be an object when present`);
                    } else {
                        for (const [fid, val] of Object.entries(byFaction as Record<string, unknown>)) {
                            if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
                                errors.push(`displacement.displacement_camp_state.${munId}.by_faction.${fid} must be a non-negative number`);
                            }
                        }
                    }
                }
            }
        } else {
            errors.push('displacement.displacement_camp_state must be an object (Record<MunicipalityId, DisplacementCampState>) when present');
        }
    }

    if ('recruitment_state' in s && s.recruitment_state !== undefined) {
        const recruitment = s.recruitment_state;
        if (recruitment !== null && typeof recruitment === 'object' && !Array.isArray(recruitment)) {
            const r = recruitment as Record<string, unknown>;
            const capital = r.recruitment_capital;
            const equipment = r.equipment_pools;
            const recruited = r.recruited_brigade_ids;
            if (capital == null || typeof capital !== 'object' || Array.isArray(capital)) {
                errors.push('recruitment_state.recruitment_capital must be an object when recruitment_state is present');
            }
            if (equipment == null || typeof equipment !== 'object' || Array.isArray(equipment)) {
                errors.push('recruitment_state.equipment_pools must be an object when recruitment_state is present');
            }
            if (!Array.isArray(recruited)) {
                errors.push('recruitment_state.recruited_brigade_ids must be string[] when recruitment_state is present');
            }
            const capTrickle = r.recruitment_capital_trickle;
            if (capTrickle !== undefined && (capTrickle == null || typeof capTrickle !== 'object' || Array.isArray(capTrickle))) {
                errors.push('recruitment_state.recruitment_capital_trickle must be an object when present');
            }
            const equipTrickle = r.equipment_points_trickle;
            if (equipTrickle !== undefined && (equipTrickle == null || typeof equipTrickle !== 'object' || Array.isArray(equipTrickle))) {
                errors.push('recruitment_state.equipment_points_trickle must be an object when present');
            }
            const maxPerTurn = r.max_recruits_per_faction_per_turn;
            if (
                maxPerTurn !== undefined &&
                (typeof maxPerTurn !== 'number' || !Number.isInteger(maxPerTurn) || maxPerTurn < 0)
            ) {
                errors.push('recruitment_state.max_recruits_per_faction_per_turn must be a non-negative integer when present');
            }
        } else {
            errors.push('recruitment_state must be an object when present');
        }
    }

    // Army HQ Gathering: campaign_plans and last_gathering_turn (nested under military)
    const mil = s.military as Record<string, unknown>;
    if (mil && typeof mil === 'object') {
        if ('campaign_plans' in mil && mil.campaign_plans !== undefined) {
            const cp = mil.campaign_plans;
            if (cp === null || typeof cp !== 'object' || Array.isArray(cp)) {
                errors.push('military.campaign_plans must be an object (Record<FactionId, CampaignPlan | null>) when present');
            } else {
                for (const [fid, plan] of Object.entries(cp)) {
                    if (plan === null) continue; // null is valid (cleared plan)
                    if (typeof plan !== 'object' || Array.isArray(plan)) {
                        errors.push(`military.campaign_plans.${fid} must be null or a CampaignPlan object`);
                        continue;
                    }
                    const p = plan as Record<string, unknown>;
                    if (typeof p.issued_turn !== 'number' || !Number.isInteger(p.issued_turn) || p.issued_turn < 0) {
                        errors.push(`military.campaign_plans.${fid}.issued_turn must be a non-negative integer`);
                    }
                    if (typeof p.valid_until_turn !== 'number' || !Number.isInteger(p.valid_until_turn) || p.valid_until_turn < 0) {
                        errors.push(`military.campaign_plans.${fid}.valid_until_turn must be a non-negative integer`);
                    }
                    if (!Array.isArray(p.front_priorities)) {
                        errors.push(`military.campaign_plans.${fid}.front_priorities must be an array`);
                    }
                    if (!Array.isArray(p.synchronized_operations)) {
                        errors.push(`military.campaign_plans.${fid}.synchronized_operations must be an array`);
                    }
                    if (!Array.isArray(p.force_transfers)) {
                        errors.push(`military.campaign_plans.${fid}.force_transfers must be an array`);
                    }
                    if (!Array.isArray(p.excluded_corps)) {
                        errors.push(`military.campaign_plans.${fid}.excluded_corps must be an array`);
                    }
                    if (typeof p.emergency !== 'boolean') {
                        errors.push(`military.campaign_plans.${fid}.emergency must be a boolean`);
                    }
                    if (typeof p.trigger_reason !== 'string') {
                        errors.push(`military.campaign_plans.${fid}.trigger_reason must be a string`);
                    }
                }
            }
        }

        if ('last_gathering_turn' in mil && mil.last_gathering_turn !== undefined) {
            const lgt = mil.last_gathering_turn;
            if (lgt === null || typeof lgt !== 'object' || Array.isArray(lgt)) {
                errors.push('military.last_gathering_turn must be an object (Record<FactionId, number>) when present');
            } else {
                for (const [fid, val] of Object.entries(lgt)) {
                    if (typeof val !== 'number' || !Number.isInteger(val) || (val as number) < 0) {
                        errors.push(`military.last_gathering_turn.${fid} must be a non-negative integer`);
                    }
                }
            }
        }

        // ── A2 substrate (LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE) ──────────
        // DDR-cited per audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md
        // (eee308e0). Top-level record is required as of v10; nested metadata stays optional.

        // army_co_decision_traces: per-faction append-only "why" log.
        if ('army_co_decision_traces' in mil && mil.army_co_decision_traces !== undefined) {
            const traces = mil.army_co_decision_traces;
            if (traces === null || typeof traces !== 'object' || Array.isArray(traces)) {
                errors.push('military.army_co_decision_traces must be an object (Record<FactionId, DecisionTraceEntry[]>) when present');
            } else {
                for (const [fid, list] of Object.entries(traces)) {
                    if (!Array.isArray(list)) {
                        errors.push(`military.army_co_decision_traces.${fid} must be an array`);
                        continue;
                    }
                    for (let i = 0; i < list.length; i++) {
                        const entry = list[i] as Record<string, unknown>;
                        if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}] must be an object`);
                            continue;
                        }
                        if (typeof entry.turn !== 'number' || !Number.isInteger(entry.turn) || entry.turn < 0) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].turn must be a non-negative integer`);
                        }
                        if (typeof entry.campaign_role !== 'string' || entry.campaign_role.length === 0) {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].campaign_role must be a non-empty string`);
                        }
                        if (typeof entry.rationale !== 'string') {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].rationale must be a string`);
                        }
                        if (entry.raw_directive_id !== undefined && typeof entry.raw_directive_id !== 'string') {
                            errors.push(`military.army_co_decision_traces.${fid}[${i}].raw_directive_id must be a string when present`);
                        }
                    }
                }
            }
        }

        // ── C1 substrate (LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE) ───
        // DDR: docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md
        // (57cec91c). Top-level record is required as of v10; nested metadata stays optional.
        // Per-faction × per-corps directive map written by A3, read by briefing.
        if ('army_corps_directives_by_faction' in mil && mil.army_corps_directives_by_faction !== undefined) {
            const slot = mil.army_corps_directives_by_faction;
            if (slot === null || typeof slot !== 'object' || Array.isArray(slot)) {
                errors.push('military.army_corps_directives_by_faction must be an object (Record<FactionId, Record<corpsId, ArmyCorpsDirective>>) when present');
            } else {
                const validRoles = new Set(['primary', 'secondary', 'economy', 'contain']);
                for (const [fid, factionMap] of Object.entries(slot)) {
                    if (factionMap === null || typeof factionMap !== 'object' || Array.isArray(factionMap)) {
                        errors.push(`military.army_corps_directives_by_faction.${fid} must be an object`);
                        continue;
                    }
                    // Q2 (LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON):
                    // optional `deviation_reason` field when `deviated=true`.
                    // Closed enum; field is omitted when `deviated=false`.
                    // Validator is permissive: allows `deviation_reason` even
                    // when `deviated=false` (back-compat) but if the field is
                    // present it MUST be one of the canonical codes.
                    const validDeviationReasons = new Set([
                        'aggressive_preference',
                        'cautious_preference',
                        'compliance_score_low',
                    ]);
                    const validMagnitudes = new Set(['limited', 'standard', 'maximum']);
                    const validPermissionFlags = new Set([
                        'authorize_offensive',
                        'authorize_reserve_commitment',
                        'preserve_reserve',
                        'avoid_escalation',
                    ]);
                    for (const [corpsId, cd] of Object.entries(factionMap as Record<string, unknown>)) {
                        if (cd == null || typeof cd !== 'object' || Array.isArray(cd)) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId} must be an object`);
                            continue;
                        }
                        const entry = cd as {
                            corps_id?: unknown;
                            role?: unknown;
                            directive_magnitude?: unknown;
                            permission_flags?: unknown;
                            deviated?: unknown;
                            deviation_reason?: unknown;
                        };
                        if (typeof entry.corps_id !== 'string' || entry.corps_id.length === 0) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.corps_id must be a non-empty string`);
                        }
                        if (typeof entry.role !== 'string' || !validRoles.has(entry.role)) {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.role must be one of 'primary'|'secondary'|'economy'|'contain'`);
                        }
                        if (typeof entry.deviated !== 'boolean') {
                            errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.deviated must be a boolean`);
                        }
                        if (entry.directive_magnitude !== undefined) {
                            if (typeof entry.directive_magnitude !== 'string' || !validMagnitudes.has(entry.directive_magnitude)) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.directive_magnitude must be one of 'limited'|'standard'|'maximum' when present`);
                            }
                        }
                        if (entry.permission_flags !== undefined) {
                            if (!Array.isArray(entry.permission_flags) || entry.permission_flags.some(flag => typeof flag !== 'string' || !validPermissionFlags.has(flag))) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.permission_flags must contain only canonical political directive permission flags when present`);
                            }
                        }
                        if (entry.deviation_reason !== undefined) {
                            if (typeof entry.deviation_reason !== 'string' || !validDeviationReasons.has(entry.deviation_reason)) {
                                errors.push(`military.army_corps_directives_by_faction.${fid}.${corpsId}.deviation_reason must be one of 'aggressive_preference'|'cautious_preference'|'compliance_score_low' when present`);
                            }
                        }
                    }
                }
            }
        }

        // named_officer_data: stubbornness + override_tolerance bounds (1-5 inclusive).
        if ('named_officer_data' in mil && mil.named_officer_data !== undefined) {
            const data = mil.named_officer_data;
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    const o = data[i] as Record<string, unknown>;
                    if (o == null || typeof o !== 'object') continue; // existing officer-shape validator owns this
                    if (o.stubbornness !== undefined) {
                        if (typeof o.stubbornness !== 'number' || !Number.isInteger(o.stubbornness) || o.stubbornness < 1 || o.stubbornness > 5) {
                            errors.push(`military.named_officer_data[${i}].stubbornness must be an integer in [1,5] when present`);
                        }
                    }
                    if (o.override_tolerance !== undefined) {
                        if (typeof o.override_tolerance !== 'number' || !Number.isInteger(o.override_tolerance) || o.override_tolerance < 1 || o.override_tolerance > 5) {
                            errors.push(`military.named_officer_data[${i}].override_tolerance must be an integer in [1,5] when present`);
                        }
                    }
                }
            }
        }

        // named_officers: last_autonomous_launch_turn + recent_overrides.
        if ('named_officers' in mil && mil.named_officers !== undefined) {
            const officers = mil.named_officers;
            if (officers !== null && typeof officers === 'object' && !Array.isArray(officers)) {
                for (const [oid, st] of Object.entries(officers)) {
                    const s2 = st as Record<string, unknown>;
                    if (s2 == null || typeof s2 !== 'object') continue;
                    if (s2.last_autonomous_launch_turn !== undefined) {
                        if (typeof s2.last_autonomous_launch_turn !== 'number' || !Number.isInteger(s2.last_autonomous_launch_turn) || s2.last_autonomous_launch_turn < 0) {
                            errors.push(`military.named_officers.${oid}.last_autonomous_launch_turn must be a non-negative integer when present`);
                        }
                    }
                    if (s2.recent_overrides !== undefined) {
                        if (!Array.isArray(s2.recent_overrides)) {
                            errors.push(`military.named_officers.${oid}.recent_overrides must be an array when present`);
                        } else {
                            for (let i = 0; i < s2.recent_overrides.length; i++) {
                                const ro = s2.recent_overrides[i];
                                if (ro == null || typeof ro !== 'object' || Array.isArray(ro)) {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}] must be an object`);
                                    continue;
                                }
                                if (typeof ro.turn !== 'number' || !Number.isInteger(ro.turn) || ro.turn < 0) {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}].turn must be a non-negative integer`);
                                }
                                if (ro.resolution !== 'accept' && ro.resolution !== 'override' && ro.resolution !== 'relieve') {
                                    errors.push(`military.named_officers.${oid}.recent_overrides[${i}].resolution must be 'accept'|'override'|'relieve'`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // political_controllers: every entry must have value defined (can be null)
    if (Object.prototype.hasOwnProperty.call(s, 'political_controllers')) {
        const pc = isRecord(s.political) ? s.political.political_controllers : undefined;
        if (pc !== null && typeof pc === 'object' && !Array.isArray(pc)) {
            for (const [sid, val] of Object.entries(pc)) {
                if (val !== null && typeof val !== 'string') {
                    errors.push(`Settlement ${sid}: political_controller must be FactionId or null, got ${typeof val}`);
                }
            }
        }
    }

    // contested_control: boolean flag per settlement
    if (Object.prototype.hasOwnProperty.call(s, 'contested_control')) {
        const cc = s.contested_control;
        if (cc !== null && typeof cc === 'object' && !Array.isArray(cc)) {
            for (const [sid, val] of Object.entries(cc)) {
                if (typeof val !== 'boolean') {
                    errors.push(`Settlement ${sid}: contested_control must be boolean, got ${typeof val}`);
                }
            }
        } else if (cc !== undefined) {
            errors.push('contested_control must be an object (Record<SettlementId, boolean>) when present');
        }
    }

    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true };
}

