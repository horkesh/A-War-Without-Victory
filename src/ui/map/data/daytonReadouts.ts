/**
 * Dayton negotiation — client-side read-model helpers (Dayton Phase-4 UI).
 *
 * These are PURE, display-only mirrors of the shipped sim read-models so the
 * negotiation modal can show LIVE readouts (entity autonomy, a peace-dysfunction
 * preview, the outcome-class cap warning) as the player toggles packages —
 * without an IPC round-trip on every click. They consume the same constants the
 * engine uses; the AUTHORITATIVE values still come from the engine when the
 * player submits (or via the read-only `previewDayton` IPC, which runs the real
 * resolver on a throwaway clone).
 *
 * They intentionally compute only the components a thinking player can know
 * BEFORE the bots respond:
 *   - autonomy        — fully determined by the player's institutional choices.
 *   - brcko           — determined by whether Brčko is demanded / conceded / left.
 *   - fragmentation   — bounded estimate from the live split the player is shaping.
 * Refugees + condemnation are war-history terms the player cannot change at the
 * table, so the live preview labels itself a *floor* and defers the exact index
 * to the engine. Honest framing: a dysfunctional peace never reads as a clean win.
 *
 * Determinism: pure arithmetic, no Date.now / Math.random, integer-rounded.
 * Mirrors:
 *   - institutional_packages.ts  AUTONOMY_DIMENSION_WEIGHTS + computeEntityAutonomyIndex
 *   - peace_dysfunction.ts       DYSFUNCTION_WEIGHTS, AUTONOMY_FUNCTIONAL_FLOOR,
 *                                brckoComponent, fragmentationComponent, cap threshold
 */

export type InstitutionChoice = 'centralized' | 'decentralized';
export type BrckoOutcome = 'federation' | 'rs' | 'arbitration';

/** Per-dimension autonomy weights — mirror of institutional_packages.ts. */
const AUTONOMY_DIMENSION_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
    military: 0.25,
    economy: 0.20,
    police: 0.18,
    judiciary: 0.15,
    presidency: 0.12,
    education: 0.10,
});

/** The 6 canonical institutional dimension ids, sorted (matches engine). */
const INSTITUTION_IDS: readonly string[] = Object.freeze(
    Object.keys(AUTONOMY_DIMENSION_WEIGHTS).slice().sort(stableCompare),
);

/** Dysfunction blend weights — mirror of peace_dysfunction.ts DYSFUNCTION_WEIGHTS. */
const DYSFUNCTION_WEIGHTS = Object.freeze({
    autonomy: 0.30,
    fragmentation: 0.25,
    brcko: 0.10,
    refugees: 0.20,
    condemnation: 0.15,
});

/** Autonomy below this is "functional" → 0 dysfunction (mirror of engine floor). */
const AUTONOMY_FUNCTIONAL_FLOOR = 40;

/** Dysfunction index at/above which a clean win collapses to hollow victory. */
export const OUTCOME_CAP_THRESHOLD = 60;

const CANONICAL_FACTIONS = ['HRHB', 'RBiH', 'RS'] as const;

function stableCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function clamp0to100(v: number): number {
    if (!Number.isFinite(v) || v <= 0) return 0;
    return v >= 100 ? 100 : v;
}

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

/**
 * Live entity-autonomy index (0-100). Mirror of computeEntityAutonomyIndex:
 * decentralized = high autonomy; an unset dimension defaults to decentralized
 * (the historical Dayton default), so an empty map reads as maximally autonomous.
 */
export function computeAutonomyPreview(
    choices: Readonly<Record<string, InstitutionChoice>>,
): number {
    let weighted = 0;
    let totalWeight = 0;
    for (const id of INSTITUTION_IDS) {
        const weight = AUTONOMY_DIMENSION_WEIGHTS[id] ?? 0;
        if (weight <= 0) continue;
        const choice = choices?.[id] ?? 'decentralized';
        const autonomy = choice === 'decentralized' ? 100 : 0;
        weighted += autonomy * weight;
        totalWeight += weight;
    }
    if (totalWeight <= 0) return 100;
    // weighted/totalWeight is already on a 0-100 scale (each autonomy term is 0 or 100).
    return round1(weighted / totalWeight);
}

/** Autonomy sub-component (0-100): distance above the functional floor. */
function autonomyComponent(autonomyIndex: number): number {
    if (autonomyIndex <= AUTONOMY_FUNCTIONAL_FLOOR) return 0;
    const span = 100 - AUTONOMY_FUNCTIONAL_FLOOR;
    return clamp0to100(((autonomyIndex - AUTONOMY_FUNCTIONAL_FLOOR) / span) * 100);
}

/** Brčko sub-component (0-100): 100 when left to arbitration, else a residual. */
function brckoComponent(brcko: BrckoOutcome): number {
    return brcko === 'arbitration' ? 100 : 20;
}

/**
 * Territorial fragmentation sub-component (0-100): normalized Shannon evenness of
 * the live three-faction split. Mirror of peace_dysfunction.ts. A balanced split
 * is maximally fragmenting; a single dominant holder is cohesive (low).
 */
function fragmentationComponent(split: Readonly<Record<string, number>>): number {
    const shares: number[] = [];
    let sum = 0;
    for (const f of [...CANONICAL_FACTIONS].sort(stableCompare)) {
        const v = split[f];
        const s = typeof v === 'number' && v > 0 ? v : 0;
        shares.push(s);
        sum += s;
    }
    if (sum <= 0) return 0;
    let entropy = 0;
    for (const s of shares) {
        if (s <= 0) continue;
        const p = s / sum;
        entropy -= p * Math.log(p);
    }
    const evenness = entropy / Math.log(CANONICAL_FACTIONS.length);
    return clamp0to100(evenness * 100);
}

export interface DysfunctionPreview {
    /** Composite preview index (0-100). Labelled a FLOOR — refugee/condemnation
     *  war-history terms can only push the engine's authoritative index higher. */
    indexFloor: number;
    autonomyComponent: number;
    fragmentationComponent: number;
    brckoComponent: number;
    /** True when indexFloor >= OUTCOME_CAP_THRESHOLD: a clean win is already capped. */
    capsCleanWin: boolean;
}

/**
 * Live peace-dysfunction PREVIEW from the player's current selections. Computes
 * only the components knowable at the table (autonomy, fragmentation, Brčko) and
 * treats refugees + condemnation as 0 here — hence a FLOOR, not the final index.
 * The engine's authoritative value (returned by previewDayton / the resolver) folds
 * in the war-history terms and can only be >= this floor.
 */
export function computeDysfunctionPreview(
    choices: Readonly<Record<string, InstitutionChoice>>,
    split: Readonly<Record<string, number>>,
    brcko: BrckoOutcome,
): DysfunctionPreview {
    const autonomyIndex = computeAutonomyPreview(choices);
    const aComp = autonomyComponent(autonomyIndex);
    const fComp = fragmentationComponent(split);
    const bComp = brckoComponent(brcko);

    // Refugees + condemnation are unknown-at-table war-history terms → 0 in the floor.
    const indexFloor = clamp0to100(
        aComp * DYSFUNCTION_WEIGHTS.autonomy +
        fComp * DYSFUNCTION_WEIGHTS.fragmentation +
        bComp * DYSFUNCTION_WEIGHTS.brcko,
    );

    return {
        indexFloor: round1(indexFloor),
        autonomyComponent: round1(aComp),
        fragmentationComponent: round1(fComp),
        brckoComponent: round1(bComp),
        capsCleanWin: indexFloor >= OUTCOME_CAP_THRESHOLD,
    };
}

export const BRCKO_PACKAGE_ID = 'brcko_district';

/**
 * Resolve the live Brčko outcome from the player's current selections, mirroring
 * dayton_negotiation.resolveBrckoStatus' demand/concede/leave logic. The
 * demanded-and-won branch is OPTIMISTIC here (we don't know the bot answer until
 * preview/submit), so a demand previews as the player's side; an unraised /
 * conceded-by-no-one Brčko previews as the arbitration district (the real default).
 */
export function previewBrckoOutcome(
    playerFaction: string | null | undefined,
    demands: ReadonlySet<string>,
    concessions: ReadonlySet<string>,
): BrckoOutcome {
    const playerSide: BrckoOutcome = playerFaction === 'RS' ? 'rs' : 'federation';
    const otherSide: BrckoOutcome = playerSide === 'rs' ? 'federation' : 'rs';
    if (concessions.has(BRCKO_PACKAGE_ID)) return otherSide;
    if (demands.has(BRCKO_PACKAGE_ID)) return playerSide;
    return 'arbitration';
}
