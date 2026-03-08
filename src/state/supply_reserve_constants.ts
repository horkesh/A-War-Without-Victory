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
/**
 * Per-formation per-turn general supply drain.
 * History: 0.04 (RS hit 0 by w40) → 0.025 (RS/RBiH sat at 100 — no drain)
 *   → 0.045 (tuned for ~70 RS fmns) → 0.035 (RS grew to ~112 fmns via OOB expansion).
 * At 0.045 + 112 fmns: RS drain=5.04/turn vs ~4.0 patron income → hit 0 by w40.
 * At 0.035: RS (112 fmns) = 3.92/turn drain vs ~4.0/turn patron → net ~+0.08,
 * combat+siege drain brings RS to ~20-40 range by w40 (strained, not collapsed).
 * RBiH (105 fmns) = 3.68/turn drain; still under genuine embargo pressure.
 * RS lighter drain justified: JNA inheritance included pre-positioned supply depots.
 */
export const MAINTENANCE_DRAIN_PER_FORMATION = 0.035;
/**
 * Per-heavy-weapon per-turn heavy munitions drain (tanks + artillery).
 * Represents ammunition expenditure for training/readiness, barrel wear,
 * spare parts consumption, and fuel for armored vehicles.
 * RS starts with 794 heavy weapons (400T+394A from JNA): drain ~0.8/turn.
 * Combined with combat + patron income, RS heavy transitions 100→~43 (strained) by w40.
 * History of reductions: 0.003 (n413, pre-sector-defense) → 0.002 (RS→11.2) → 0.001.
 * Sector-pooled defense (a288b17) roughly doubled battle count vs n413, increasing
 * combat expenditure drain substantially. At 0.001 maintenance drain = 31.75 pts/40w;
 * combined with ~25 pts net combat/siege drain, RS ends near the 43-pt strained target.
 * n413 calibration target: RS heavy≈43 (strained), E2 bombardment mult 0.75×.
 */
export const HEAVY_MAINTENANCE_PER_WEAPON = 0.001;

// ── Consumption: Combat ──────────────────────────────────────────────────────
/**
 * Heavy munitions deducted per battle (scaled by intensity = attackerCount × powerRatio).
 * Reduced from 2.0 to 1.2: sector-pooled defense (a288b17) roughly doubled the number of
 * combat expenditure events by making every frontline OSID contested. At 2.0 RS heavy ran
 * to 0 by w40 (was calibrated to ~43 at w40 in n413 pre-sector-defense). At 1.2 per-battle
 * drain is reduced; combined with HEAVY_MAINTENANCE_PER_WEAPON=0.002 keeps RS strained.
 */
export const COMBAT_HEAVY_MUNITIONS_RATE = 1.2;
/** General supply deducted per battle (secondary). */
export const COMBAT_GENERAL_SUPPLY_RATE = 0.5;

// ── Consumption: Siege ───────────────────────────────────────────────────────
/** Per-turn general supply drain for each besieged (critical) OSID. */
export const SIEGE_BASE_RATE = 0.3;
/** Per-turn escalation multiplier for siege drain. */
export const SIEGE_ESCALATION_RATE = 0.1;
/** Maximum siege drain rate per OSID. */
export const MAX_SIEGE_PRESSURE_RATE = 2.0;
/**
 * Maximum total general supply siege drain per faction per turn.
 * Prevents early-war cascade where many ephemeral isolated OSIDs (before
 * corridors are secured) drain reserves to 0 before patron income stabilises.
 * At cap=2.5: RS net ≈ 0 late-war (ends ~60-76 general, adequate).
 */
export const MAX_SIEGE_DRAIN_GENERAL_PER_FACTION = 2.5;
/** Maximum total heavy munitions siege drain per faction per turn. */
export const MAX_SIEGE_DRAIN_HEAVY_PER_FACTION = 1.0;
/**
 * Minimum connected-component size for escalating siege drain.
 * Critical OSIDs in pockets smaller than this get their counter frozen at 1
 * (flat drain, no escalation). Genuine siege pockets (Srebrenica, Central Bosnia)
 * with ≥ this many connected critical OSIDs escalate normally.
 * Distinguishes scattered outposts from actual besieged territory.
 *
 * Raised from 5→8: the Ozren/Maglaj RS pocket (6 OSIDs) was escalating to
 * counter=40 (1.05/turn each = 6.3/turn total general drain), causing RS general
 * supply to deplete to 0 by w15 despite adequate patron income. At 8, the 6-OSID
 * RS pocket is frozen at counter=1 (0.231/turn each = 1.39/turn total).
 * Large genuine enclaves (Srebrenica ~20+, Goražde ~15+) continue to escalate.
 */
export const SIEGE_MIN_POCKET_SIZE = 8;

// ── Replenishment ────────────────────────────────────────────────────────────
/** Global multiplier for production facility income. */
export const PRODUCTION_SCALE = 1.0;
/** Global multiplier for patron aid income. */
export const PATRON_AID_SCALE = 10;

/**
 * Faction-specific patron aid efficiency.
 * RBiH: embargo blocks most external supply; only smuggling/black market.
 * RS: direct land border with Serbia; most efficient pipeline.
 * HRHB: Croatia has corridor constraints but active support.
 */
export const PATRON_AID_FACTION_EFFICIENCY: Record<string, number> = {
    RBiH: 0.3,
    RS: 1.0,
    HRHB: 0.8
};

/**
 * Maximum general supply reserve achievable under embargo conditions.
 * RBiH: never had adequate supply — always strained/critical under arms embargo.
 * RS: Serbia provided steady resupply with slight logistical friction.
 * HRHB: Croatia provided material but limited by corridor access.
 */
export const EMBARGO_SUPPLY_CAP: Record<string, number> = {
    RBiH: 45,
    RS: 90,
    HRHB: 70
};

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

// ── UN Airdrops (Phase D) ────────────────────────────────────────────────────
/**
 * Consecutive isolation turns an enclave must be isolated before UN airdrops begin.
 * Historically: US C-130 drops to Srebrenica/Goražde/Žepa/Bihać started ~Feb 1993
 * (after ~40 weeks of siege). Set low so shorter runs see the effect.
 */
export const AIRDROP_ISOLATION_THRESHOLD = 4;
/** General supply added per eligible enclave per turn (humanitarian: food/medical only).
 * Reduced from 1.5: reflects limited cargo capacity of C-130 drops to dispersed enclaves.
 */
export const AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE = 0.5;
/** Max total general supply injected per turn across all airdrops (prevents stacking with many enclaves).
 * Reduced from 15: airdrops were humanitarian (food/medical), not military resupply.
 * At 15/turn, RBiH sat at 100% general supply despite low patron support — unrealistic.
 * At 3/turn: meaningful relief for enclaves without eliminating supply pressure.
 */
export const AIRDROP_MAX_SUPPLY_PER_TURN = 3;
/** Only RBiH enclaves receive UN airdrops. */
export const AIRDROP_ELIGIBLE_FACTION = 'RBiH';

// ── JNA Inheritance (Phase E1) ───────────────────────────────────────────────
/** Faction that receives JNA inheritance heavy munitions bonus at scenario start. */
export const JNA_INHERITANCE_FACTION = 'RS';
/**
 * Extra heavy munitions added to RS at start.
 * Represents JNA ammunition warehouses captured April 1992.
 * Base INIT_HEAVY_MUNITIONS_RESERVE = 60; RS effectively starts at 100.
 */
export const JNA_INHERITANCE_HEAVY_BONUS = 40;

// ── Init Values ──────────────────────────────────────────────────────────────
/** Default starting general supply reserve per faction. */
export const INIT_GENERAL_SUPPLY_RESERVE = 80;
/** Default starting heavy munitions reserve per faction. */
export const INIT_HEAVY_MUNITIONS_RESERVE = 60;

/**
 * Per-faction overrides for initial supply reserves.
 * Historical basis:
 *   RS  = inherits JNA stocks → 80 general / 100 heavy (60 + JNA_INHERITANCE_HEAVY_BONUS)
 *   HRHB = Croatian backing, some HV weaponry → adequate but not flush
 *   RBiH = territorial defense units, almost no logistics in April 1992 → critical
 */
export const INIT_GENERAL_SUPPLY_RESERVE_BY_FACTION: Partial<Record<string, number>> = {
    RS: 80,
    HRHB: 75,   // Croatian supply pipeline open; higher than default
    RBiH: 10,   // critical (< RESERVE_STRAINED_THRESHOLD=20) → brigades forced to defend
};
export const INIT_HEAVY_MUNITIONS_RESERVE_BY_FACTION: Partial<Record<string, number>> = {
    RS: 60,     // +40 more from JNA_INHERITANCE_HEAVY_BONUS applied separately
    HRHB: 25,
    RBiH: 5,    // essentially no heavy munitions stocks
};
