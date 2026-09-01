/**
 * Cumulative casualty tracking across the war.
 *
 * Records killed, wounded, missing/captured per faction and per formation,
 * plus equipment losses. Updated after each battle resolution step.
 *
 * Deterministic: no randomness, no timestamps.
 */

import type { FactionId, FormationId } from './game_state.js';

// --- Types ---

export interface FormationCasualties {
    killed: number;
    wounded: number;
    missing_captured: number;
}

export interface FactionEquipmentLosses {
    tanks: number;
    artillery: number;
    aa_systems: number;
}

export interface FactionCasualtyLedger {
    killed: number;
    wounded: number;
    missing_captured: number;
    equipment_lost: FactionEquipmentLosses;
    per_formation: Record<FormationId, FormationCasualties>;
    /**
     * Schema v38: casualties taken by militia defenders, keyed by the canonical militia
     * pool key `${mun_id}:${faction}` (src/state/militia_pool_key.ts).
     *
     * Militia defenders have no formation id, so before v38 their losses were reported by
     * the resolver and then dropped — 42 battles / 3,844 raw casualties went unrecorded in
     * the 40-week artifact. They are kept SEPARATE from `per_formation` so a pool key can
     * never be mistaken for a formation id, and the invariant
     * `killed = sum(per_formation) + sum(per_militia_pool)` holds after every write.
     */
    per_militia_pool: Record<string, FormationCasualties>;
}

export type CasualtyLedger = Record<FactionId, FactionCasualtyLedger>;

// --- Casualty realism (ledger/territory decouple, 2026-08-10) ---

/**
 * The casualty ledger records CUMULATIVE gross battle personnel-removed. Because
 * formations RECONSTITUTE between battles, the same soldier can be removed, returned,
 * and removed again — each removal is recorded, but only the NON-reconstituted share
 * is a PERMANENT casualty. The sim therefore over-produces cumulative casualties
 * (~2.3× historical for RBiH, which fights the most battles → most reconstitution
 * churn) which saturates the Pyrrhic `war_cost_index` (all factions → grade C).
 *
 * This per-faction fraction scales the RECORDED ledger casualties to the permanent
 * share, so scoring + UI report realistic totals (target KIA: RBiH ~30k / RS ~24k /
 * HRHB ~8k; the realistic ~1:3.8:0.4 KIA:WIA:MIA split is preserved by scaling all
 * three uniformly). **TERRITORY-NEUTRAL by construction** (proven byte-flat 0/188 weeks,
 * runs n176/n177): the two territory/power drivers are SEPARATE, upstream, and unscaled —
 * (a) `applyPersonnelLoss` removes personnel at the call site; (b) the `pool.exhausted +=
 * (killed+mia)*0.75` demographic feed (frontline_attrition.ts:370, siege_attrition.ts:193)
 * reads the LOCAL killed/mia computed at the call site, NOT this ledger's accumulation.
 * This lane RESOLVES the `casualty_realism_v2_gate.ts:50-54` "changing a total couples to
 * territory" wall: that coupling is through the LOCAL killed+mia → pool.exhausted, so
 * scaling here (at ledger accumulation, downstream of and orthogonal to that feed) is
 * territory-free — the split-vs-total distinction the V2 lane needed. The V2 gate owns the
 * KIA/WIA/MIA SPLIT at distribution; this owns the TOTAL realism SCALE at the ledger — two
 * necessarily-separate pipeline stages, not overlapping ownership. Default 1.0 ⇒
 * byte-identical (the ledger feeds only scoring/endgame/UI, never the combat/territory loop).
 *
 * Env override (per-faction, else the global, else 1.0), read once at module load:
 *   AWWV_CASUALTY_REALISM_FRACTION (global), AWWV_CASUALTY_REALISM_{RBIH,RS,HRHB}.
 */
function parseCasualtyRealismFraction(): Record<string, number> {
    // DEFAULT-ON (owner-adopted 2026-08-10): per-faction permanent-casualty fractions that
    // bring the double-counted gross ledger to historical totals (RBiH 140k / RS 95k /
    // HRHB 35k = KIA+WIA+MIA). Territory byte-flat (proven n176/n177). The global
    // AWWV_CASUALTY_REALISM_FRACTION or per-faction AWWV_CASUALTY_REALISM_{RBIH,RS,HRHB}
    // env vars override; explicit 1.0 restores the legacy (inflated) ledger.
    const DEFAULT: Record<string, number> = { RBiH: 0.39, RS: 0.50, HRHB: 0.75 };
    const env = typeof process !== 'undefined' && process?.env ? process.env : {};
    const g = Number(env.AWWV_CASUALTY_REALISM_FRACTION);
    const globalOverride = Number.isFinite(g) && g > 0 ? g : undefined;
    const per = (k: string, faction: string): number => {
        const v = Number(env[`AWWV_CASUALTY_REALISM_${k}`]);
        if (Number.isFinite(v) && v > 0) return v;
        return globalOverride ?? DEFAULT[faction]!;
    };
    return { RBiH: per('RBIH', 'RBiH'), RS: per('RS', 'RS'), HRHB: per('HRHB', 'HRHB') };
}
const CASUALTY_REALISM_FRACTION: Record<string, number> = parseCasualtyRealismFraction();

/**
 * Test/experiment override (mirrors the V2 gate idiom). Distribution/split UNIT tests
 * that assert exact recorded values set an all-1.0 map here to isolate their concern
 * from the realism scaling, then reset in afterEach. Null ⇒ use the module default.
 */
let _casualtyRealismOverride: Record<string, number> | null = null;
export function setCasualtyRealismFractionOverride(map: Record<string, number> | null): void {
    _casualtyRealismOverride = map;
}
export function resetCasualtyRealismFractionOverride(): void {
    _casualtyRealismOverride = null;
}
function activeRealismFraction(faction: string): number {
    return (_casualtyRealismOverride ?? CASUALTY_REALISM_FRACTION)[faction] ?? 1.0;
}

/** Scale a casualty count by a faction's permanent-casualty fraction (1.0 ⇒ unchanged). */
function applyRealismFraction(value: number, frac: number): number {
    return frac === 1.0 ? value : Math.round(value * frac);
}

// --- Helpers ---

/** Create a zeroed-out casualty ledger for the given factions. */
export function initializeCasualtyLedger(factionIds: readonly string[]): CasualtyLedger {
    const ledger: CasualtyLedger = {};
    for (const fid of factionIds) {
        ledger[fid] = {
            killed: 0,
            wounded: 0,
            missing_captured: 0,
            equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
            per_formation: {},
            per_militia_pool: {}
        };
    }
    return ledger;
}

/** Ensure a faction entry exists in the ledger. */
function ensureFaction(ledger: CasualtyLedger, factionId: string): FactionCasualtyLedger {
    if (!ledger[factionId]) {
        ledger[factionId] = {
            killed: 0,
            wounded: 0,
            missing_captured: 0,
            equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
            per_formation: {},
            per_militia_pool: {}
        };
    }
    // Repair runtime-created and pre-v38 ledgers so the accounting invariant can hold.
    const faction = ledger[factionId]!;
    if (!faction.per_militia_pool) faction.per_militia_pool = {};
    return faction;
}

/** Ensure a formation entry exists within a faction ledger. */
function ensureFormation(factionLedger: FactionCasualtyLedger, formationId: string): FormationCasualties {
    if (!factionLedger.per_formation[formationId]) {
        factionLedger.per_formation[formationId] = { killed: 0, wounded: 0, missing_captured: 0 };
    }
    return factionLedger.per_formation[formationId]!;
}

/** Record personnel casualties for a formation in the ledger. */
export function recordBattleCasualties(
    ledger: CasualtyLedger,
    factionId: string,
    formationId: string,
    casualties: FormationCasualties
): void {
    const faction = ensureFaction(ledger, factionId);
    const formation = ensureFormation(faction, formationId);

    // Casualty realism (ledger/territory decouple): scale the RECORDED casualties to
    // the permanent share. TERRITORY-NEUTRAL — applyPersonnelLoss is a separate call.
    const frac = activeRealismFraction(factionId);
    const killed = applyRealismFraction(casualties.killed, frac);
    const wounded = applyRealismFraction(casualties.wounded, frac);
    const missing = applyRealismFraction(casualties.missing_captured, frac);

    faction.killed += killed;
    faction.wounded += wounded;
    faction.missing_captured += missing;

    formation.killed += killed;
    formation.wounded += wounded;
    formation.missing_captured += missing;
}

/** Ensure a militia-pool entry exists within a faction ledger. */
function ensureMilitiaPool(factionLedger: FactionCasualtyLedger, poolKey: string): FormationCasualties {
    if (!factionLedger.per_militia_pool[poolKey]) {
        factionLedger.per_militia_pool[poolKey] = { killed: 0, wounded: 0, missing_captured: 0 };
    }
    return factionLedger.per_militia_pool[poolKey]!;
}

/**
 * Record personnel casualties taken by militia defenders, keyed by militia pool.
 *
 * The militia counterpart of recordBattleCasualties: same faction totals, same realism
 * scaling applied exactly ONCE, but the per-source breakdown lands in `per_militia_pool`
 * rather than `per_formation`, because a militia defender has no formation id and a pool
 * key must never be laundered into the formation record.
 *
 * `casualties` are RAW battle losses; the realism fraction converts them to the permanent
 * share the historical ledger records. Callers that also debit pool manpower must use the
 * RAW values for that — the two quantities are not interchangeable.
 */
export function recordMilitiaCasualties(
    ledger: CasualtyLedger,
    factionId: string,
    poolKey: string,
    casualties: FormationCasualties
): void {
    const faction = ensureFaction(ledger, factionId);
    const pool = ensureMilitiaPool(faction, poolKey);

    const frac = activeRealismFraction(factionId);
    const killed = applyRealismFraction(casualties.killed, frac);
    const wounded = applyRealismFraction(casualties.wounded, frac);
    const missing = applyRealismFraction(casualties.missing_captured, frac);

    faction.killed += killed;
    faction.wounded += wounded;
    faction.missing_captured += missing;

    pool.killed += killed;
    pool.wounded += wounded;
    pool.missing_captured += missing;
}

/** Record equipment losses for a faction in the ledger. */
export function recordEquipmentLoss(
    ledger: CasualtyLedger,
    factionId: string,
    losses: Partial<FactionEquipmentLosses>
): void {
    const faction = ensureFaction(ledger, factionId);
    faction.equipment_lost.tanks += losses.tanks ?? 0;
    faction.equipment_lost.artillery += losses.artillery ?? 0;
    faction.equipment_lost.aa_systems += losses.aa_systems ?? 0;
}

/** Get total casualties (all categories) for a faction. */
export function getFactionTotalCasualties(ledger: CasualtyLedger, factionId: string): number {
    const f = ledger[factionId];
    if (!f) return 0;
    return f.killed + f.wounded + f.missing_captured;
}
