/**
 * Peace-phase §4.8: Washington Agreement evaluator (precondition-driven).
 *
 * TWO trigger pathways (either fires the agreement):
 *
 * Path A — Diplomatic preconditions (ALL must be true):
 *   W1: ceasefire active
 *   W2: ceasefire duration >= WASH_CEASEFIRE_DURATION turns
 *   W3: IVP negotiation_momentum > WASH_IVP_THRESHOLD
 *   W4: HRHB patron_state.constraint_severity > WASH_PATRON_CONSTRAINT
 *   W5: RS territorial control share > WASH_RS_THREAT_SHARE
 *   W6: combined RBiH + HRHB exhaustion > WASH_COMBINED_EXHAUSTION
 *
 * Path B — Patron override (ALL must be true):
 *   P1: alliance < WASH_ALLIANCE_WAR_THRESHOLD (-0.30) — bilateral war ongoing
 *   P2: bilateral war duration > WASH_MIN_WAR_DURATION (40 weeks)
 *   P3: HRHB patron override_authority > WASH_PATRON_OVERRIDE_THRESHOLD (50)
 *
 * Effects (when fired by either path):
 *   - Alliance set to WASH_ALLIANCE_LOCK_VALUE (0.80) and locked
 *   - Bilateral ceasefire activated
 *   - HRHB capability profiles shift (equipment_access 0.65, croatian_support 0.90)
 *   - HRHB embargo enhanced (external_pipeline_status 0.85, heavy_equipment_access 0.65)
 *   - COORDINATED_STRIKE "HV coordination enabled" flag set
 *   - Joint ops vs RS get POST_WASH_JOINT_PRESSURE_BONUS (1.15)
 *   - Mixed municipalities restored to joint status
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Systems_Manual §10; Engine_Invariants §J.
 */

import type { GameState } from '../../state/game_state.js';
import { parseMilitiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';
import { ALLIED_THRESHOLD, DEFAULT_MIXED_MUNICIPALITIES } from './alliance_update.js';
import { lastEventResponse, ZAGREB_CEASEFIRE_EVENT, ZAGREB_RESTRAINT_RESPONSE } from './bilateral_ceasefire.js';

// ── Tunable Washington precondition thresholds ──

/** W2: Minimum ceasefire duration (turns). */
export const WASH_CEASEFIRE_DURATION = 4;
/** W3: IVP negotiation_momentum threshold. */
export const WASH_IVP_THRESHOLD = 0.50;
/** W4: HRHB patron constraint_severity threshold. */
export const WASH_PATRON_CONSTRAINT = 0.55;
/** W5: RS territorial control share threshold (fraction of total settlements). */
export const WASH_RS_THREAT_SHARE = 0.40;
/** W6: Combined RBiH + HRHB exhaustion threshold.
 *  2026-05-22: rescaled 55 → 5500 alongside war_exhaustion cap 100 → 10000 per
 *  forensics memo `20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md`. Uniform
 *  100× rescale preserves the original "combined exhaustion at 55% of cap"
 *  semantics that this threshold was authored against. */
export const WASH_COMBINED_EXHAUSTION = 5500;

/** Alliance value set and locked when Washington fires. */
export const WASH_ALLIANCE_LOCK_VALUE = 0.80;

/** Post-Washington HRHB capability: equipment_access. */
export const POST_WASH_EQUIPMENT_ACCESS = 0.65;
/** Post-Washington HRHB capability: croatian_support. */
export const POST_WASH_CROATIAN_SUPPORT = 0.90;
/** Post-Washington HRHB embargo: external_pipeline_status. */
export const POST_WASH_EXTERNAL_PIPELINE = 0.85;
/** Post-Washington HRHB embargo: heavy_equipment_access. */
export const POST_WASH_HEAVY_EQUIPMENT = 0.65;
/** Post-Washington joint pressure bonus vs RS on shared fronts. */
export const POST_WASH_JOINT_PRESSURE_BONUS = 1.15;

// ── Path B: Patron override trigger thresholds ──

/** P1: Alliance must be below this value (bilateral war active). */
export const WASH_ALLIANCE_WAR_THRESHOLD = -0.30;
/** P2: Minimum bilateral war duration in turns (weeks). */
export const WASH_MIN_WAR_DURATION = 40;
/** P3: HRHB patron override_authority threshold (from negotiation system). */
export const WASH_PATRON_OVERRIDE_THRESHOLD = 50;

export interface WashingtonPatronOverrideResult {
    p1_alliance_below_threshold: boolean;
    p2_war_duration_met: boolean;
    p3_patron_override_met: boolean;
    all_met: boolean;
}

export interface WashingtonPreconditionResult {
    w1_ceasefire_active: boolean;
    w2_ceasefire_duration: boolean;
    w3_ivp_momentum: boolean;
    w4_patron_constraint: boolean;
    w5_rs_territorial_threat: boolean;
    w6_combined_exhaustion: boolean;
    all_met: boolean;
}

export interface WashingtonCheckReport {
    preconditions: WashingtonPreconditionResult;
    patron_override?: WashingtonPatronOverrideResult;
    /** Which trigger path fired: 'diplomatic' (Path A), 'patron_override' (Path B), 'quiet_front' (Path A'), 'consent' (Path C), or null. */
    trigger_path?: 'diplomatic' | 'patron_override' | 'quiet_front' | 'consent' | null;
    fired: boolean;
    already_signed: boolean;
}

function munFromOsid(osid: string | undefined): string | null {
    if (!osid) return null;
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : null;
}

function normalizeMun(mun: string): string {
    return mun.trim().toLowerCase();
}

export function restoreAlliedMixedMunicipalities(state: GameState): string[] {
    const byMun = new Map<string, Set<string>>();
    const add = (mun: string | null, faction: string | undefined): void => {
        if (!mun || (faction !== 'RBiH' && faction !== 'HRHB')) return;
        const key = normalizeMun(mun);
        const current = byMun.get(key) ?? new Set<string>();
        current.add(faction);
        byMun.set(key, current);
    };

    for (const formationId of Object.keys(state.military.formations ?? {}).sort(strictCompare)) {
        const formation = state.military.formations?.[formationId];
        if (!formation || formation.status !== 'active') continue;
        add(munFromOsid((formation as { location_osid?: string }).location_osid), formation.faction);
    }

    for (const key of Object.keys(state.military.militia_pools ?? {}).sort(strictCompare)) {
        const parsed = parseMilitiaPoolKey(key);
        if (!parsed) continue;
        const pool = state.military.militia_pools?.[key];
        if (!pool || ((pool.available ?? 0) + (pool.committed ?? 0)) <= 0) continue;
        add(parsed.mun_id, parsed.faction);
    }

    const restored = new Set<string>(DEFAULT_MIXED_MUNICIPALITIES.map(normalizeMun));
    for (const [mun, factions] of [...byMun.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        if (factions.has('RBiH') && factions.has('HRHB')) restored.add(mun);
    }
    return [...restored].sort(strictCompare);
}

export function getPostWashingtonJointPressureMultiplier(
    state: GameState,
    defenderFaction: string | null | undefined,
    attackerFaction: string | null | undefined,
    targetOsid: string | null | undefined,
): number {
    if (state.political.rbih_hrhb_state?.washington_signed !== true) return 1;
    if (attackerFaction !== 'RS') return 1;
    if (defenderFaction !== 'RBiH' && defenderFaction !== 'HRHB') return 1;
    const mun = targetOsid ? munFromOsid(targetOsid) : null;
    if (!mun) return 1;
    const mixed = new Set((state.political.rbih_hrhb_state.allied_mixed_municipalities ?? []).map(normalizeMun));
    return mixed.has(normalizeMun(mun)) ? POST_WASH_JOINT_PRESSURE_BONUS : 1;
}

/**
 * Compute RS territorial control share (fraction of total settlements controlled by RS).
 * Deterministic: counts settlements keyed in political_controllers.
 */
function computeRsTerritorialShare(state: GameState): number {
    const pc = state.political.political_controllers;
    if (!pc) return 0;
    const entries = Object.values(pc);
    if (entries.length === 0) return 0;
    let rsCount = 0;
    for (const controller of entries) {
        if (controller === 'RS') rsCount++;
    }
    return rsCount / entries.length;
}

/**
 * Evaluate Washington preconditions. Pure function of state.
 */
export function evaluateWashingtonPreconditions(state: GameState): WashingtonPreconditionResult {
    const rhs = state.political.rbih_hrhb_state;
    const turn = state.meta.turn;

    // W1: ceasefire active
    const w1 = rhs?.ceasefire_active === true;

    // W2: ceasefire duration
    const ceasefireSince = rhs?.ceasefire_since_turn ?? null;
    const ceasefireDuration = (ceasefireSince !== null && w1) ? turn - ceasefireSince : 0;
    const w2 = ceasefireDuration >= WASH_CEASEFIRE_DURATION;

    // W3: IVP negotiation_momentum
    const ivp = state.political.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;
    const w3 = negotiationMomentum > WASH_IVP_THRESHOLD;

    // W4: HRHB patron constraint_severity
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    const constraintSeverity = hrhbFaction?.patron_state?.constraint_severity ?? 0;
    const w4 = constraintSeverity > WASH_PATRON_CONSTRAINT;

    // W5: RS territorial control share
    const rsShare = computeRsTerritorialShare(state);
    const w5 = rsShare > WASH_RS_THREAT_SHARE;

    // W6: Combined exhaustion
    const rbihExhaustion = state.political.war_exhaustion?.['RBiH'] ?? 0;
    const hrhbExhaustion = state.political.war_exhaustion?.['HRHB'] ?? 0;
    const combinedExhaustion = rbihExhaustion + hrhbExhaustion;
    const w6 = combinedExhaustion > WASH_COMBINED_EXHAUSTION;

    return {
        w1_ceasefire_active: w1,
        w2_ceasefire_duration: w2,
        w3_ivp_momentum: w3,
        w4_patron_constraint: w4,
        w5_rs_territorial_threat: w5,
        w6_combined_exhaustion: w6,
        all_met: w1 && w2 && w3 && w4 && w5 && w6
    };
}

/**
 * Evaluate Path B: Patron override trigger.
 * When bilateral war has lasted long enough and Zagreb's override authority is high,
 * Washington fires regardless of ceasefire/IVP preconditions.
 */
export function evaluateWashingtonPatronOverride(state: GameState): WashingtonPatronOverrideResult {
    const rhs = state.political.rbih_hrhb_state;
    const allianceValue = state.political.war_alliance_rbih_hrhb ?? 0;

    // P1: Alliance below war threshold
    const p1 = allianceValue < WASH_ALLIANCE_WAR_THRESHOLD;

    // P2: Bilateral war duration > threshold
    const warStartedTurn = rhs?.war_started_turn ?? null;
    const warDuration = warStartedTurn !== null ? state.meta.turn - warStartedTurn : 0;
    const p2 = warDuration > WASH_MIN_WAR_DURATION;

    // P3: HRHB patron override_authority from negotiation system
    const neg = state.military?.negotiation;
    const hrhbPatron = neg?.patron_relationships?.['HRHB'];
    const overrideAuthority = hrhbPatron?.override_authority ?? 0;
    const p3 = overrideAuthority > WASH_PATRON_OVERRIDE_THRESHOLD;

    return {
        p1_alliance_below_threshold: p1,
        p2_war_duration_met: p2,
        p3_patron_override_met: p3,
        all_met: p1 && p2 && p3,
    };
}

// ── Path C: Federation by consent (B5 A2, 2026-11-16) ──

/**
 * Week of the Washington framework (1 March 1994; the Washington event cards' turn_min).
 * Single owner: political_peace_plan.ts reads it for the HRHB Contact Group / Dayton alignment.
 */
export const WASHINGTON_AGREEMENT_WEEK = 102;

/**
 * Path C — Federation by consent. A President who never broke the RBiH-HRHB alliance must not be
 * treated worse than one who broke it and mended it (Paths A and B both need a prior war). Fires
 * once when ALL hold: not yet signed; the bilateral war never started (`war_started_turn` null,
 * the engine's record of it); the alliance is above ALLIED_THRESHOLD (0.20, the isAllied rule);
 * and the calendar has reached the Washington week. Game designer + historian 2026-11-16:
 * coherent only as the formalising of an existing alliance (BB2 pp.450-451; BB1 p.54), so it
 * carries the Federation benefits but none of the war-ending effects (no ceasefire to start, no
 * cut to an alliance already above the lock). Never fires left alone: the war starts ~t49-57.
 * A2b (2026-11-17): there is no consent once HRHB has answered the 1993 federation overture with
 * a refusal (`reject_federation_path` / `maintain_separate_state`); the bots answer
 * `extend_federation_overture`, so this changes nothing left alone.
 */
export function evaluateWashingtonByConsent(state: GameState): boolean {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs || rhs.washington_signed) return false;
    if (rhs.war_started_turn != null) return false;
    if (!((state.political.war_alliance_rbih_hrhb ?? 0) > ALLIED_THRESHOLD)) return false;
    const overture = lastEventResponse(state, FEDERATION_OVERTURE_EVENT);
    if (overture !== null && FEDERATION_REFUSALS.includes(overture)) return false;
    return state.meta.turn >= WASHINGTON_AGREEMENT_WEEK;
}

const FEDERATION_OVERTURE_EVENT = 'hrhb_federation_overture_1993';
const FEDERATION_REFUSALS: readonly string[] = ['maintain_separate_state', 'reject_federation_path'];

// ── Path A': the cards' agreement on a quiet front (B5, 2026-11-16) ──

/** Weeks the front must be quiet (stalemate or a held ceasefire); matches W2. */
export const WASH_QUIET_FRONT_TURNS = WASH_CEASEFIRE_DURATION;

/**
 * First week Path A' can fire: the week after the Washington week. A Path A signing in the Washington
 * week itself (t102, 18 Mar 1994: the 23 Feb ceasefire plus the four-week W2 hold) is the historical
 * outcome, so Path A' waits until it has been missed (orchestrator ruling, 2026-11-19). Only Path A'
 * reads this; WASHINGTON_AGREEMENT_WEEK stays the boundary for Path C and the peace plan.
 */
export const WASH_QUIET_FRONT_OPENS_WEEK = WASHINGTON_AGREEMENT_WEEK + 1;

/** Responses that sign each Washington card (both options of each card sign). */
const WASHINGTON_SIGNING_RESPONSES: Readonly<Record<string, readonly string[]>> = {
    hrhb_washington_agreement_1994: ['accept', 'reluctant'],
    rbih_washington_agreement_1994: ['accept', 'reluctant'],
};

export interface WashingtonQuietFrontResult {
    war_fought: boolean;
    calendar_reached: boolean;
    front_quiet: boolean;
    zagreb_restraint: boolean;
    cards_signed: boolean;
    alliance_restored: boolean;
    all_met: boolean;
}

/**
 * Path A' — the agreement the cards record, on a quiet front. Both Washington cards can be answered
 * at t102 while Path A still waits for an engine ceasefire whose start is keyed to how long the war
 * ran, so for weeks the cards say "signed" and the engine withholds the Federation. Path A' fires
 * once when ALL hold: not yet signed; a bilateral war was fought (`war_started_turn` set); the
 * Washington week has passed (WASH_QUIET_FRONT_OPENS_WEEK); the front is quiet (stalemate_turns, or a held ceasefire, at least
 * WASH_QUIET_FRONT_TURNS); HRHB acknowledged Zagreb's ceasefire order (the patron price); both
 * Washington cards were signed (accept or reluctant); and the alliance is above ALLIED_THRESHOLD.
 * Effects are Path A's, ceasefire included. Game designer + historian 2026-11-16 (the real
 * ceasefire → framework → signing gap was 1-3.5 weeks: 23 Feb, 1 Mar, 18 Mar 1994; BB2 pp.450-451).
 * Never fires left alone: the historical run signs through Path A by t102, before Path A' opens,
 * which the baseline runner asserts (tools/scenario_runner/run_baseline_regression.ts).
 */
export function evaluateWashingtonQuietFront(state: GameState): WashingtonQuietFrontResult {
    const rhs = state.political.rbih_hrhb_state;
    const turn = state.meta.turn;
    const warFought = rhs?.war_started_turn != null;
    const calendarReached = turn >= WASH_QUIET_FRONT_OPENS_WEEK;
    const ceasefireSince = rhs?.ceasefire_since_turn ?? null;
    const ceasefireHeld = rhs?.ceasefire_active === true && ceasefireSince !== null
        ? turn - ceasefireSince
        : 0;
    const frontQuiet = (rhs?.stalemate_turns ?? 0) >= WASH_QUIET_FRONT_TURNS
        || ceasefireHeld >= WASH_QUIET_FRONT_TURNS;
    const zagrebRestraint = lastEventResponse(state, ZAGREB_CEASEFIRE_EVENT) === ZAGREB_RESTRAINT_RESPONSE;
    const cardsSigned = Object.keys(WASHINGTON_SIGNING_RESPONSES).sort(strictCompare).every((eventId) => {
        const response = lastEventResponse(state, eventId);
        return response !== null && WASHINGTON_SIGNING_RESPONSES[eventId].includes(response);
    });
    const allianceRestored = (state.political.war_alliance_rbih_hrhb ?? 0) > ALLIED_THRESHOLD;
    return {
        war_fought: warFought,
        calendar_reached: calendarReached,
        front_quiet: frontQuiet,
        zagreb_restraint: zagrebRestraint,
        cards_signed: cardsSigned,
        alliance_restored: allianceRestored,
        all_met: !!rhs && !rhs.washington_signed && warFought && calendarReached && frontQuiet
            && zagrebRestraint && cardsSigned && allianceRestored,
    };
}

/**
 * Apply post-Washington effects to HRHB capabilities, embargo, and alliance.
 * `byConsent` (Path C): the alliance is raised to the lock value but never cut below its current
 * value, and no bilateral ceasefire is started (there is no war to end).
 */
function applyWashingtonEffects(state: GameState, byConsent = false): void {
    const rhs = state.political.rbih_hrhb_state!;

    // Lock alliance.
    //
    // 2026-05-22: ALSO push an `alliance_lock` floor onto state.military.alliance_locks
    // so subsequent `alliance_change` event effects (apply_effects.ts:applyAllianceChange)
    // clamp at the floor. Without the lock-floor, applyAllianceChange writes deltas
    // directly without checking `washington_signed` — meaning post-WA territorial
    // incidents, refugee pressure, or other event-driven alliance_change deltas can
    // and do drop alliance from 0.80 back down to 0.10+ across the 188w window,
    // bricking FEDERATION_ALLIANCE_FLOOR=0.50 catalog gates downstream (mistral_2_95,
    // kupres_cincar_94, vlasic_ridge_95). Forensics:
    // docs/40_reports/audits/20260522_FORENSICS_5_BLOCKED_ARBIH_OPS.md alliance line.
    //
    // The peace-phase per-turn alliance_update.ts:260 already respects washington_signed
    // and exits early; this commit closes the symmetric gap on the event-effect path.
    state.political.war_alliance_rbih_hrhb = byConsent
        ? Math.max(state.political.war_alliance_rbih_hrhb ?? 0, WASH_ALLIANCE_LOCK_VALUE)
        : WASH_ALLIANCE_LOCK_VALUE;
    if (!state.military.alliance_locks) {
        state.military.alliance_locks = [];
    }
    // 2026-05-22 Wave 3F: evict ceiling locks that would block WA's 0.80 floor.
    // Discovered via n1959 forensics
    // (docs/40_reports/audits/20260522_FORENSICS_N1959_FED_OPS_STILL_BLOCKED.md):
    // csq_croat_bosniak_war pushes `alliance_lock ceiling=0.10 duration=60`
    // when HVO-ARBiH war fires (~t48-56), and other consequence events push
    // ceilings as low as 0.10 / 0.45. Wave 3E added the WA floor=0.80 but
    // applyAllianceChange (apply_effects.ts:170) applies ceiling AFTER floor,
    // so an active ceiling=0.10 silently overrides our floor=0.80 on the
    // very next `alliance_change` event, dropping alliance back to 0.10.
    //
    // Historical: Washington Agreement is the formal end of the Croat-Bosniak
    // war. Any alliance ceiling locks tied to that war should be cleared on
    // WA signature. The floor lock the engine pushes for WA's institutional
    // commitment is preserved by keeping all FLOOR locks at or above 0.80,
    // and all ceiling locks at or above 0.80 (otherwise they'd block the WA
    // floor and contradict the agreement). Locks at or above 0.80 are kept
    // (a stricter Federation lock could in principle exist; the current event
    // catalog has none, so this is forward-compatible).
    state.military.alliance_locks = state.military.alliance_locks.filter(lock => {
        if (lock.mode === 'ceiling' && lock.value < WASH_ALLIANCE_LOCK_VALUE) {
            return false;
        }
        return true;
    });
    state.military.alliance_locks.push({
        mode: 'floor',
        value: WASH_ALLIANCE_LOCK_VALUE,
        expires_turn: state.meta.turn + 9999,
    });
    rhs.washington_signed = true;
    rhs.washington_turn = state.meta.turn;

    // Activate bilateral ceasefire (if not already active). Not for Path C: no war was fought.
    if (!byConsent && !rhs.ceasefire_active) {
        rhs.ceasefire_active = true;
        rhs.ceasefire_since_turn = state.meta.turn;
    }

    // HRHB capability shift
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    if (hrhbFaction) {
        if (hrhbFaction.capability_profile) {
            hrhbFaction.capability_profile.equipment_access = POST_WASH_EQUIPMENT_ACCESS;
            hrhbFaction.capability_profile.croatian_support = POST_WASH_CROATIAN_SUPPORT;
        }
        // Embargo enhancement
        if (hrhbFaction.embargo_profile) {
            hrhbFaction.embargo_profile.external_pipeline_status = Math.max(
                hrhbFaction.embargo_profile.external_pipeline_status,
                POST_WASH_EXTERNAL_PIPELINE
            );
            hrhbFaction.embargo_profile.heavy_equipment_access = Math.max(
                hrhbFaction.embargo_profile.heavy_equipment_access,
                POST_WASH_HEAVY_EQUIPMENT
            );
        }
    }

    // Enable COORDINATED_STRIKE for HRHB formations
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const f = formations[fid];
        if (f.faction === 'HRHB' && f.doctrine_state) {
            f.doctrine_state.eligible['COORDINATED_STRIKE'] = true;
        }
    }

    rhs.allied_mixed_municipalities = restoreAlliedMixedMunicipalities(state);
}

/**
 * Check and apply Washington Agreement if all preconditions met.
 * Must run AFTER ceasefire check.
 */
export function checkAndApplyWashington(state: GameState): WashingtonCheckReport {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs) {
        return {
            preconditions: {
                w1_ceasefire_active: false,
                w2_ceasefire_duration: false,
                w3_ivp_momentum: false,
                w4_patron_constraint: false,
                w5_rs_territorial_threat: false,
                w6_combined_exhaustion: false,
                all_met: false
            },
            fired: false,
            already_signed: false
        };
    }

    if (rhs.washington_signed) {
        return {
            preconditions: evaluateWashingtonPreconditions(state),
            patron_override: evaluateWashingtonPatronOverride(state),
            trigger_path: null,
            fired: false,
            already_signed: true
        };
    }

    const preconditions = evaluateWashingtonPreconditions(state);
    const patronOverride = evaluateWashingtonPatronOverride(state);

    // Path A: Diplomatic preconditions
    if (preconditions.all_met) {
        applyWashingtonEffects(state);
        return { preconditions, patron_override: patronOverride, trigger_path: 'diplomatic', fired: true, already_signed: false };
    }

    // Path B: Patron override
    if (patronOverride.all_met) {
        applyWashingtonEffects(state);
        return { preconditions, patron_override: patronOverride, trigger_path: 'patron_override', fired: true, already_signed: false };
    }

    // Path A': the signed cards on a quiet front (a war was fought, so Path A's effects)
    if (evaluateWashingtonQuietFront(state).all_met) {
        applyWashingtonEffects(state);
        return { preconditions, patron_override: patronOverride, trigger_path: 'quiet_front', fired: true, already_signed: false };
    }

    // Path C: Federation by consent (the alliance never broke)
    if (evaluateWashingtonByConsent(state)) {
        applyWashingtonEffects(state, true);
        return { preconditions, patron_override: patronOverride, trigger_path: 'consent', fired: true, already_signed: false };
    }

    return { preconditions, patron_override: patronOverride, trigger_path: null, fired: false, already_signed: false };
}

