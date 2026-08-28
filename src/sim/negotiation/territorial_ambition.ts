/**
 * DIMENSION 7 — territorial ambition: buying map beyond what the packages give.
 *
 * Until now territory could only move one way: a package changes hands and the map
 * shifts by that package's real area. That makes the settlement's ceiling the
 * PACKAGE LIST, not the war — a faction that finished 1995 dominant could not press
 * its advantage past the last painted piece, and the 51/49 outcome was effectively
 * a floor and a cap at once.
 *
 * Ambition lets a delegation demand percentage points of the country outright, as
 * the historical delegations did between the package-by-package haggling. It is
 * priced to be the LAST thing you buy, not the first:
 *
 *   - the cost curve is superlinear (`POINT_COSTS`), so the first point is merely
 *     expensive and the fourth is ruinous;
 *   - it draws on the SAME capital as the institutional dimensions, so a faction
 *     that spent its war chest on a unitary frame and sovereign-core competencies
 *     has nothing left to buy map with, and vice versa. That competition is the
 *     point: `dayton_dial_cost.ts` calls it the anti-power-fantasy gate, and this
 *     dimension extends it to territory instead of exempting territory from it;
 *   - every point is still subject to the ordinary `survives()` objection gate, so
 *     the other delegations get to refuse if they can afford to.
 *
 * The cap is deliberate. `MAX_AMBITION_POINTS` is 5 — enough to turn 51/49 into
 * 56/44 for a faction that won decisively and spent nothing else, not enough to
 * partition the country by cheque. AWWV is a negative-sum game; the table is where
 * the war's result is ratified with a little argument at the margins, not a second
 * front where a rich loser can buy what the army could not take.
 *
 * Determinism: constant table, integer arithmetic, no RNG/clock.
 */

/** Hard ceiling on how many percentage points of BiH ambition can buy. */
export const MAX_AMBITION_POINTS = 5;

/**
 * Capital cost of the Nth point, 1-indexed. Superlinear: the marginal point gets
 * dearer, so a wide demand is not a scaled-up narrow one. Chosen so that one point
 * is comparable to a sovereign-core competency flip (20) and the full five costs
 * more than any plausible war chest.
 */
const POINT_COSTS: readonly number[] = Object.freeze([18, 30, 48, 74, 110]);

/**
 * Total capital to demand `points` percentage points of territory. Clamped to
 * [0, MAX_AMBITION_POINTS]; non-integer and non-finite input floors to 0 rather
 * than throwing, because a proposal can arrive from a save or a UI field.
 */
export function getTerritorialAmbitionCost(points: number): number {
    const n = clampAmbition(points);
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += POINT_COSTS[i] ?? 0;
    return sum;
}

/** Marginal cost of the next point beyond `points`. 0 once the cap is reached. */
export function getMarginalAmbitionCost(points: number): number {
    const n = clampAmbition(points);
    if (n >= MAX_AMBITION_POINTS) return 0;
    return POINT_COSTS[n] ?? 0;
}

/**
 * The most points a faction with `capital` could afford, ignoring everything else
 * it might want to buy. The UI uses this to show a reachable range; the resolution
 * path still charges each point through the ordinary objection gate.
 */
export function affordableAmbitionPoints(capital: number): number {
    if (!Number.isFinite(capital) || capital <= 0) return 0;
    let spent = 0;
    for (let i = 0; i < MAX_AMBITION_POINTS; i += 1) {
        const next = spent + (POINT_COSTS[i] ?? 0);
        if (next > capital) return i;
        spent = next;
    }
    return MAX_AMBITION_POINTS;
}

/** Normalize an ambition value to a whole number of points within the cap. */
export function clampAmbition(points: number): number {
    if (!Number.isFinite(points) || points <= 0) return 0;
    return Math.min(MAX_AMBITION_POINTS, Math.floor(points));
}
