/**
 * Phase A1.1: Canonical GameState shape validation (foundation-only).
 * Lightweight validator: no derived state, political_controller presence, weekly turn invariant.
 * Engine Invariants §9.1, §11, §13.
 */


import type { GameState, PhaseName } from './game_state.js';


/** Known phase names (must match PhaseName in game_state.ts). */
const KNOWN_PHASES: readonly PhaseName[] = ['phase_0', 'phase_i', 'phase_ii'];

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

/**
 * Validates Phase A1.1 canonical GameState shape (foundation-only).
 * - current_turn (meta.turn) is integer >= 0
 * - phase (if present) is one of known PhaseName
 * - Every settlement in political_controllers has political_controller defined (value may be null)
 * - No denylisted derived-state keys at top level
 */
export function validateGameStateShape(state: unknown): ValidateGameStateShapeResult {
  const errors: string[] = [];

  if (state == null || typeof state !== 'object') {
    return { ok: false, errors: ['State must be an object'] };
  }

  const s = state as Record<string, unknown>;

  // Denylist: no derived-state keys at top level
  for (const key of DERIVED_STATE_DENYLIST) {
    if (Object.prototype.hasOwnProperty.call(s, key)) {
      errors.push(`Top-level key "${key}" is denylisted (derived state must not be stored; Engine Invariants §13.1)`);
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
      if ('phase_0_scheduled_referendum_turn' in m && m.phase_0_scheduled_referendum_turn !== undefined && m.phase_0_scheduled_referendum_turn !== null && (typeof m.phase_0_scheduled_referendum_turn !== 'number' || !Number.isInteger(m.phase_0_scheduled_referendum_turn) || m.phase_0_scheduled_referendum_turn < 0)) {
        errors.push('meta.phase_0_scheduled_referendum_turn must be null or a non-negative integer when present');
      }
      if ('phase_0_scheduled_war_start_turn' in m && m.phase_0_scheduled_war_start_turn !== undefined && m.phase_0_scheduled_war_start_turn !== null && (typeof m.phase_0_scheduled_war_start_turn !== 'number' || !Number.isInteger(m.phase_0_scheduled_war_start_turn) || m.phase_0_scheduled_war_start_turn < 0)) {
        errors.push('meta.phase_0_scheduled_war_start_turn must be null or a non-negative integer when present');
      }
      if ('phase_0_war_start_control_path' in m && m.phase_0_war_start_control_path !== undefined && m.phase_0_war_start_control_path !== null && typeof m.phase_0_war_start_control_path !== 'string') {
        errors.push('meta.phase_0_war_start_control_path must be string or null when present');
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
      // D0.9.1: Phase I opposing-edges streak (optional; non-negative integer when present)
      if (
        'phase_i_opposing_edges_streak' in m &&
        m.phase_i_opposing_edges_streak !== undefined &&
        (typeof m.phase_i_opposing_edges_streak !== 'number' ||
          !Number.isInteger(m.phase_i_opposing_edges_streak) ||
          m.phase_i_opposing_edges_streak < 0)
      ) {
        errors.push('meta.phase_i_opposing_edges_streak must be a non-negative integer when present');
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

  // Phase I: optional top-level Phase I state (validate type when present)
  if ('phase_i_jna' in s && s.phase_i_jna !== undefined) {
    const jna = s.phase_i_jna;
    if (jna !== null && typeof jna === 'object') {
      const j = jna as Record<string, unknown>;
      if (typeof j.transition_begun !== 'boolean') {
        errors.push('phase_i_jna.transition_begun must be boolean when present');
      }
      if (typeof j.withdrawal_progress !== 'number' || j.withdrawal_progress < 0 || j.withdrawal_progress > 1) {
        errors.push('phase_i_jna.withdrawal_progress must be a number in [0, 1] when present');
      }
      if (typeof j.asset_transfer_rs !== 'number' || j.asset_transfer_rs < 0 || j.asset_transfer_rs > 1) {
        errors.push('phase_i_jna.asset_transfer_rs must be a number in [0, 1] when present');
      }
    } else {
      errors.push('phase_i_jna must be an object when present');
    }
  }
  if ('phase_i_alliance_rbih_hrhb' in s && s.phase_i_alliance_rbih_hrhb !== undefined) {
    const v = s.phase_i_alliance_rbih_hrhb;
    if (typeof v !== 'number' || v < -1 || v > 1) {
      errors.push('phase_i_alliance_rbih_hrhb must be a number in [-1, 1] when present');
    }
  }

  // Phase II: optional supply pressure and exhaustion (validate type when present)
  if ('phase_ii_supply_pressure' in s && s.phase_ii_supply_pressure !== undefined) {
    const pp = s.phase_ii_supply_pressure;
    if (pp !== null && typeof pp === 'object' && !Array.isArray(pp)) {
      for (const [fid, val] of Object.entries(pp)) {
        if (typeof val !== 'number' || val < 0 || val > 100) {
          errors.push(`phase_ii_supply_pressure.${fid} must be a number in [0, 100] when present`);
        }
      }
    } else {
      errors.push('phase_ii_supply_pressure must be an object (Record<FactionId, number>) when present');
    }
  }
  if ('phase_ii_exhaustion' in s && s.phase_ii_exhaustion !== undefined) {
    const ex = s.phase_ii_exhaustion;
    if (ex !== null && typeof ex === 'object' && !Array.isArray(ex)) {
      for (const [fid, val] of Object.entries(ex)) {
        if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
          errors.push(`phase_ii_exhaustion.${fid} must be a non-negative finite number when present`);
        }
      }
    } else {
      errors.push('phase_ii_exhaustion must be an object (Record<FactionId, number>) when present');
    }
  }
  if ('phase_ii_exhaustion_local' in s && s.phase_ii_exhaustion_local !== undefined) {
    const loc = s.phase_ii_exhaustion_local;
    if (loc !== null && typeof loc === 'object' && !Array.isArray(loc)) {
      for (const [sid, val] of Object.entries(loc)) {
        if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
          errors.push(`phase_ii_exhaustion_local.${sid} must be a non-negative finite number when present`);
        }
      }
    } else {
      errors.push('phase_ii_exhaustion_local must be an object (Record<SettlementId, number>) when present');
    }
  }

  // Phase II: municipality supra-layer (optional)
  if ('brigade_municipality_assignment' in s && s.brigade_municipality_assignment !== undefined) {
    const assignment = s.brigade_municipality_assignment;
    if (assignment !== null && typeof assignment === 'object' && !Array.isArray(assignment)) {
      for (const [formationId, munIds] of Object.entries(assignment)) {
        if (!Array.isArray(munIds)) {
          errors.push(`brigade_municipality_assignment.${formationId} must be MunicipalityId[] when present`);
          continue;
        }
        for (const munId of munIds) {
          if (typeof munId !== 'string' || munId.length === 0) {
            errors.push(`brigade_municipality_assignment.${formationId} must contain non-empty municipality ids`);
            break;
          }
        }
      }
    } else {
      errors.push('brigade_municipality_assignment must be an object (Record<FormationId, MunicipalityId[]>) when present');
    }
  }
  if ('brigade_mun_orders' in s && s.brigade_mun_orders !== undefined) {
    const orders = s.brigade_mun_orders;
    if (orders !== null && typeof orders === 'object' && !Array.isArray(orders)) {
      for (const [formationId, munIdsOrNull] of Object.entries(orders)) {
        if (munIdsOrNull === null) continue;
        if (!Array.isArray(munIdsOrNull)) {
          errors.push(`brigade_mun_orders.${formationId} must be MunicipalityId[] | null when present`);
          continue;
        }
        for (const munId of munIdsOrNull) {
          if (typeof munId !== 'string' || munId.length === 0) {
            errors.push(`brigade_mun_orders.${formationId} must contain non-empty municipality ids`);
            break;
          }
        }
      }
    } else {
      errors.push('brigade_mun_orders must be an object (Record<FormationId, MunicipalityId[] | null>) when present');
    }
  }

  // Phase F: displacement state (stored; monotonic [0, 1]; missing maps treated as empty)
  if ('settlement_displacement' in s && s.settlement_displacement !== undefined) {
    const sd = s.settlement_displacement;
    if (sd !== null && typeof sd === 'object' && !Array.isArray(sd)) {
      for (const [sid, val] of Object.entries(sd)) {
        if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
          errors.push(`settlement_displacement.${sid} must be a number in [0, 1] when present`);
        }
      }
    } else {
      errors.push('settlement_displacement must be an object (Record<SettlementId, number>) when present');
    }
  }
  if ('settlement_displacement_started_turn' in s && s.settlement_displacement_started_turn !== undefined) {
    const st = s.settlement_displacement_started_turn;
    if (st !== null && typeof st === 'object' && !Array.isArray(st)) {
      for (const [sid, val] of Object.entries(st)) {
        if (!Number.isInteger(val) || val < 0) {
          errors.push(`settlement_displacement_started_turn.${sid} must be a non-negative integer when present`);
        }
      }
    } else {
      errors.push('settlement_displacement_started_turn must be an object (Record<SettlementId, number>) when present');
    }
  }
  if ('municipality_displacement' in s && s.municipality_displacement !== undefined) {
    const md = s.municipality_displacement;
    if (md !== null && typeof md === 'object' && !Array.isArray(md)) {
      for (const [munId, val] of Object.entries(md)) {
        if (typeof val !== 'number' || val < 0 || val > 1 || !Number.isFinite(val)) {
          errors.push(`municipality_displacement.${munId} must be a number in [0, 1] when present`);
        }
      }
    } else {
      errors.push('municipality_displacement must be an object (Record<MunicipalityId, number>) when present');
    }
  }
  if ('hostile_takeover_timers' in s && s.hostile_takeover_timers !== undefined) {
    const timers = s.hostile_takeover_timers;
    if (timers !== null && typeof timers === 'object' && !Array.isArray(timers)) {
      for (const [munId, raw] of Object.entries(timers)) {
        if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
          errors.push(`hostile_takeover_timers.${munId} must be an object when present`);
          continue;
        }
        const rec = raw as Record<string, unknown>;
        if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
          errors.push(`hostile_takeover_timers.${munId}.mun_id must be a non-empty string`);
        }
        if (typeof rec.from_faction !== 'string' || rec.from_faction.length === 0) {
          errors.push(`hostile_takeover_timers.${munId}.from_faction must be a non-empty string`);
        }
        if (typeof rec.to_faction !== 'string' || rec.to_faction.length === 0) {
          errors.push(`hostile_takeover_timers.${munId}.to_faction must be a non-empty string`);
        }
        if (
          typeof rec.started_turn !== 'number' ||
          !Number.isInteger(rec.started_turn) ||
          rec.started_turn < 0
        ) {
          errors.push(`hostile_takeover_timers.${munId}.started_turn must be a non-negative integer`);
        }
      }
    } else {
      errors.push('hostile_takeover_timers must be an object (Record<MunicipalityId, HostileTakeoverTimerState>) when present');
    }
  }
  if ('displacement_camp_state' in s && s.displacement_camp_state !== undefined) {
    const camps = s.displacement_camp_state;
    if (camps !== null && typeof camps === 'object' && !Array.isArray(camps)) {
      for (const [munId, raw] of Object.entries(camps)) {
        if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
          errors.push(`displacement_camp_state.${munId} must be an object when present`);
          continue;
        }
        const rec = raw as Record<string, unknown>;
        if (typeof rec.mun_id !== 'string' || rec.mun_id.length === 0) {
          errors.push(`displacement_camp_state.${munId}.mun_id must be a non-empty string`);
        }
        if (typeof rec.population !== 'number' || !Number.isFinite(rec.population) || rec.population < 0) {
          errors.push(`displacement_camp_state.${munId}.population must be a non-negative number`);
        }
        if (
          typeof rec.started_turn !== 'number' ||
          !Number.isInteger(rec.started_turn) ||
          rec.started_turn < 0
        ) {
          errors.push(`displacement_camp_state.${munId}.started_turn must be a non-negative integer`);
        }
        const byFaction = rec.by_faction;
        if (byFaction !== undefined) {
          if (byFaction == null || typeof byFaction !== 'object' || Array.isArray(byFaction)) {
            errors.push(`displacement_camp_state.${munId}.by_faction must be an object when present`);
          } else {
            for (const [fid, val] of Object.entries(byFaction as Record<string, unknown>)) {
              if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
                errors.push(`displacement_camp_state.${munId}.by_faction.${fid} must be a non-negative number`);
              }
            }
          }
        }
      }
    } else {
      errors.push('displacement_camp_state must be an object (Record<MunicipalityId, DisplacementCampState>) when present');
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

  // political_controllers: every entry must have value defined (can be null)
  if (Object.prototype.hasOwnProperty.call(s, 'political_controllers')) {
    const pc = s.political_controllers;
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
