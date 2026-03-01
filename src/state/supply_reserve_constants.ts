/**
 * Supply Reserve Constants (Phase A — SUPPLY_AMMO_SYSTEM_PLAN.md §3.7)
 *
 * Two categories: general supply + heavy munitions.
 * Faction-level reserves [0..100]. Consumed by maintenance, combat, siege.
 * Replenished by production facilities, patron aid; reduced by embargo.
 *
 * All constants collected here for calibration.
 */

// ── Consumption: Maintenance ─────────────────────────────────────────────────
/** Per-formation per-turn general supply drain. */
export const MAINTENANCE_DRAIN_PER_FORMATION = 0.15;

// ── Consumption: Combat ──────────────────────────────────────────────────────
/** Heavy munitions deducted per battle (scaled by intensity = attackerCount × powerRatio). */
export const COMBAT_HEAVY_MUNITIONS_RATE = 2.0;
/** General supply deducted per battle (secondary). */
export const COMBAT_GENERAL_SUPPLY_RATE = 0.5;

// ── Consumption: Siege ───────────────────────────────────────────────────────
/** Per-turn general supply drain for each besieged (critical) OSID. */
export const SIEGE_BASE_RATE = 0.3;
/** Per-turn escalation multiplier for siege drain. */
export const SIEGE_ESCALATION_RATE = 0.1;
/** Maximum siege drain rate per OSID. */
export const MAX_SIEGE_PRESSURE_RATE = 2.0;

// ── Replenishment ────────────────────────────────────────────────────────────
/** Global multiplier for production facility income. */
export const PRODUCTION_SCALE = 1.0;
/** Global multiplier for patron aid income. */
export const PATRON_AID_SCALE = 1.0;

// ── Reserve → Effective Supply State Thresholds ──────────────────────────────
/** Reserve level at or above which faction supply is considered adequate (if OSID reachable). */
export const RESERVE_ADEQUATE_THRESHOLD = 50;
/** Reserve level below which faction supply is considered critical (regardless of reachability). */
export const RESERVE_STRAINED_THRESHOLD = 20;

// ── Production Split ─────────────────────────────────────────────────────────
/** Fraction of total production income allocated to general supply. */
export const PRODUCTION_GENERAL_FRACTION = 0.6;
/** Fraction of total production income allocated to heavy munitions. */
export const PRODUCTION_HEAVY_FRACTION = 0.4;

// ── Replenishment: Patron Aid Split ──────────────────────────────────────────
/** Fraction of patron aid income allocated to general supply. */
export const PATRON_AID_GENERAL_FRACTION = 0.5;
/** Fraction of patron aid income allocated to heavy munitions. */
export const PATRON_AID_HEAVY_FRACTION = 0.5;

// ── Facility Damage ─────────────────────────────────────────────────────────
/** Condition loss per battle occurring in the facility's municipality. */
export const FACILITY_COMBAT_DAMAGE_RATE = 0.05;

// ── Enclave Resilience ──────────────────────────────────────────────────────
/** Maximum enclave resilience value. */
export const MAX_ENCLAVE_RESILIENCE = 30;
/** Resilience growth per turn when enclave supply is critical. */
export const RESILIENCE_GROWTH_CRITICAL = 2;
/** Resilience growth per turn when enclave supply is strained. */
export const RESILIENCE_GROWTH_STRAINED = 1;
/** Resilience decay per turn when enclave has adequate supply (no longer besieged). */
export const RESILIENCE_DECAY_ADEQUATE = 1;
/** Exhaustion reduction per resilience point (multiplicative). */
export const RESILIENCE_EFFECT_SCALE = 0.01;
/** Consecutive isolation turns needed to activate hardening. */
export const HARDENING_THRESHOLD = 8;
/** Defense bonus multiplier when hardened (+5%). */
export const HARDENING_DEFENSE_BONUS = 0.05;

// ── Init Values ──────────────────────────────────────────────────────────────
/** Default starting general supply reserve per faction. */
export const INIT_GENERAL_SUPPLY_RESERVE = 80;
/** Default starting heavy munitions reserve per faction. */
export const INIT_HEAVY_MUNITIONS_RESERVE = 60;
