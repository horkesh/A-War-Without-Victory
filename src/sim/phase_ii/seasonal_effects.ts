/**
 * Seasonal effects on military operations.
 *
 * Deterministic: depends only on turn number and scenario start date.
 * No randomness, no timestamps.
 *
 * Historical basis: Bosnian War operations showed strong seasonal rhythm.
 * Major offensives launched Apr-Oct; near-total stasis Dec-Feb.
 * Mountain terrain amplifies winter effects.
 *
 * BB2 p.445: "For the remainder of the winter, both sides dug in..."
 * BB2 p.486: "The war of maneuver was over, at least until the following spring."
 * BB2 p.499: "...as winter set in" (marking end of offensive season)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SeasonalModifiers {
    /** [0.5, 1.0] multiplier on attacker power */
    attack_mult: number;
    /** [1.0, 1.05] multiplier on defender power */
    defense_mult: number;
    /** [-0.20, 0.00] additive modifier to bot aggression */
    aggression_adj: number;
    /** Human-readable season label */
    season_label: 'summer' | 'spring' | 'autumn' | 'late_autumn' | 'winter' | 'deep_winter' | 'mud_season';
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants — all tunable
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base seasonal attack multiplier by calendar month (1-indexed).
 * Lowland/flat terrain values.
 */
const BASE_ATTACK_MULT: Record<number, number> = {
    1: 0.70,   // January — deep winter
    2: 0.75,   // February — deep winter
    3: 0.85,   // March — thaw/mud
    4: 0.95,   // April — spring thaw/mud
    5: 1.00,   // May — full capability
    6: 1.00,   // June
    7: 1.00,   // July
    8: 1.00,   // August
    9: 1.00,   // September
    10: 0.95,  // October — autumn rain
    11: 0.85,  // November — winter onset
    12: 0.75,  // December — deep winter
};

/**
 * Mountain terrain attack multiplier by calendar month (1-indexed).
 * Applied at slope_index >= MOUNTAIN_SLOPE_THRESHOLD.
 */
const MOUNTAIN_ATTACK_MULT: Record<number, number> = {
    1: 0.50,   // January — peak cold, mountain passes blocked
    2: 0.55,   // February
    3: 0.65,   // March — mountain still frozen
    4: 0.90,   // April — high-altitude thaw
    5: 1.00,   // May
    6: 1.00,   // June
    7: 1.00,   // July
    8: 1.00,   // August
    9: 0.95,   // September — early mountain autumn
    10: 0.85,  // October — early mountain snow
    11: 0.70,  // November — mountain winter onset
    12: 0.55,  // December — deep mountain winter
};

/** Defense bonus in winter months (Nov-Mar) */
const WINTER_DEFENSE_MULT = 1.05;

/** Bot aggression reduction by month */
const AGGRESSION_ADJ: Record<number, number> = {
    1: -0.20,  // January
    2: -0.20,  // February
    3: -0.10,  // March
    4: 0.00,
    5: 0.00,
    6: 0.00,
    7: 0.00,
    8: 0.00,
    9: 0.00,
    10: -0.05, // October
    11: -0.10, // November
    12: -0.20, // December
};

/** Slope index threshold for full mountain penalty */
const MOUNTAIN_SLOPE_THRESHOLD = 0.50;

// ═══════════════════════════════════════════════════════════════════════════
// Calendar helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the calendar month (1-12) for a given turn.
 * Each turn = 1 week. Month is 0-indexed in scenario_start_date.
 */
export function getCalendarMonth(
    turn: number,
    scenarioStartDate: { year: number; month: number; day: number }
): number {
    // month is 0-indexed in the scenario start date
    const startMonth0 = scenarioStartDate.month; // 0-indexed
    const startDay = scenarioStartDate.day;

    // Compute approximate date: start date + turn * 7 days
    const totalDays = startDay + turn * 7;

    // Approximate month advancement (30.44 avg days per month)
    const monthsAdvanced = Math.floor((totalDays - 1) / 30.44);
    const month0 = (startMonth0 + monthsAdvanced) % 12;

    return month0 + 1; // Return 1-indexed
}

/**
 * Get the season label for a calendar month.
 */
function getSeasonLabel(month: number): SeasonalModifiers['season_label'] {
    if (month >= 6 && month <= 8) return 'summer';
    if (month === 4 || month === 5) return 'spring';
    if (month === 9 || month === 10) return 'autumn';
    if (month === 11) return 'late_autumn';
    if (month === 12 || month === 1 || month === 2) return 'deep_winter';
    if (month === 3) return 'mud_season';
    return 'summer'; // fallback
}

// ═══════════════════════════════════════════════════════════════════════════
// Main API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute seasonal modifiers for a given turn and terrain.
 *
 * @param turn - Current simulation turn (0-based weeks)
 * @param scenarioStartDate - Calendar anchor (month is 0-indexed)
 * @param slopeIndex - Terrain slope index [0,1]. Higher = more mountainous.
 *                     Use 0 for non-terrain-specific queries (e.g., aggression).
 */
export function getSeasonalModifiers(
    turn: number,
    scenarioStartDate: { year: number; month: number; day: number } | undefined,
    slopeIndex: number = 0
): SeasonalModifiers {
    // No seasonal effects if no start date
    if (!scenarioStartDate) {
        return {
            attack_mult: 1.0,
            defense_mult: 1.0,
            aggression_adj: 0,
            season_label: 'summer',
        };
    }

    const month = getCalendarMonth(turn, scenarioStartDate);

    // Interpolate attack multiplier between base (lowland) and mountain
    const baseMult = BASE_ATTACK_MULT[month] ?? 1.0;
    const mountainMult = MOUNTAIN_ATTACK_MULT[month] ?? 1.0;
    const mountainFactor = Math.min(1.0, Math.max(0, slopeIndex / MOUNTAIN_SLOPE_THRESHOLD));
    const attack_mult = baseMult + (mountainMult - baseMult) * mountainFactor;

    // Defense bonus: Nov (11) through Mar (3)
    const isWinterMonth = month >= 11 || month <= 3;
    const defense_mult = isWinterMonth ? WINTER_DEFENSE_MULT : 1.0;

    // Aggression adjustment
    const aggression_adj = AGGRESSION_ADJ[month] ?? 0;

    return {
        attack_mult,
        defense_mult,
        aggression_adj,
        season_label: getSeasonLabel(month),
    };
}
