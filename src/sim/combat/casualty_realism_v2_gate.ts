/**
 * B1 Casualty-Model Realism V2 — feature gate (default OFF).
 *
 * Task #69 (Pyrrhic Historian must-have B1). The shipped casualty model over-produces
 * the *missing/captured* bucket by ~30× (proposal
 * docs/40_reports/proposals/20260608_CASUALTY_MODEL_REALISM.md §5.3): the per-path
 * MIA fractions (siege 0.15, undefended 0.35, surrender-cascade 0.50) write durable
 * "missing/captured" casualties on top of an inflated gross, and there is no
 * POW-exchange/return model. Historically the *durable* military missing was small
 * (ICTY-DU durable-missing ~10,500 across ALL categories incl. civilians; the
 * durable military-missing fraction is ~2–4k — owner-confirm target). The WIA:KIA
 * re-anchor of the same proposal (KIA 0.30→0.22) was already landed by PR-1 v2 #316,
 * so the main-path killed:wounded is already ~1:3.4; B1's remaining lever is the MIA
 * over-production.
 *
 * CRITICAL: this gate defaults OFF so the calibration floor stays byte-identical until
 * D1 finalization deliberately enables it. When OFF, every accessor returns the exact
 * shipped per-path fractions (verified byte-identical by
 * casualty_realism_v2_gate.test.ts). The activation is the D1 finalization decision —
 * this lane builds + measures + HOLDS.
 *
 * Idiom mirrors src/sim/combat/intel_ambush_depth_gate.ts: module-local override
 * (set/reset for tests) layered over an env read, no Date.now / Math.random —
 * deterministic. Env var `AWWV_CASUALTY_REALISM_V2`: "1"/"true"/"on"/"yes" enables;
 * any other value (or unset) leaves the default-OFF (shipped) behavior intact.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shipped (flag-OFF) per-path KIA/WIA/MIA fractions. MIA is always the remainder
// (1 - KIA - WIA) in every consumer, so we encode KIA/WIA and the implied MIA in
// comments. These MUST equal the live constants so flag-OFF is byte-identical.
//
//   main path (frontline + battle defaults): KIA 0.22 / WIA 0.74  → MIA 0.04
//     (attack_casualty_distribution.ts KIA_FRACTION/WIA_FRACTION, imported by
//      frontline_attrition / battle_resolution / paramilitary_sweep)
//   siege bombardment:                       KIA 0.20 / WIA 0.65  → MIA 0.15
//   undefended-OSID defender:                KIA 0.15 / WIA 0.50  → MIA 0.35
//   surrender cascade defender:              KIA 0.10 / WIA 0.40  → MIA 0.50
//
// V2 (flag-ON, EH-2 DEFAULT-ON) fractions: hold KIA EVERYWHERE (never touched — the
// ~1:3.74 killed:wounded is already on the RDC/ICTY target), and collapse the inflated
// MIA into WIA on the paths where capture is historically nonsensical:
//   main      0.04 → 0.02 MIA   (small-contact losses; mostly KIA-body-unrecovered)
//   siege     0.15 → 0.02 MIA   (encircled defenders are not captured en masse)
//   undefended 0.35 → 0.35 MIA  (UNCHANGED — historian: excess here was predominantly
//                                KILLED, not wounded; MIA→WIA would be the most wrong
//                                move. Reserved for a post-1.0 MIA→KIA rebalance.)
//   surrender 0.50 → 0.15 MIA   (organized surrender DOES produce real captures, so it
//                                keeps a trimmed durable-POW share, not ~0.02.)
// We do NOT touch any *total* casualty count (e.g. the surrender-cascade forced
// `defenderTotal = 50% personnel`), only the K/W/M split: changing a total would couple
// to territory; the split is reporting-only except for the
// `pool.exhausted += (killed+mia)*0.75` demographic feed, whose OSID impact is proven
// byte-identical (control_delta unchanged) — the explicit measured deliverable.
// ─────────────────────────────────────────────────────────────────────────────

export interface CasualtySplitFractions {
    /** Killed-in-action fraction of total casualties. */
    kia: number;
    /** Wounded-in-action fraction of total casualties. MIA = max(0, 1 - kia - wia). */
    wia: number;
}

/** Shipped (flag-OFF) main-path split: KIA 0.22 / WIA 0.74 / MIA 0.04. */
const SHIPPED_MAIN: CasualtySplitFractions = { kia: 0.22, wia: 0.74 };
/** Shipped (flag-OFF) siege split: KIA 0.20 / WIA 0.65 / MIA 0.15. */
const SHIPPED_SIEGE: CasualtySplitFractions = { kia: 0.20, wia: 0.65 };
/** Shipped (flag-OFF) undefended-defender split: KIA 0.15 / WIA 0.50 / MIA 0.35. */
const SHIPPED_UNDEFENDED: CasualtySplitFractions = { kia: 0.15, wia: 0.50 };
/** Shipped (flag-OFF) surrender-cascade defender split: KIA 0.10 / WIA 0.40 / MIA 0.50. */
const SHIPPED_SURRENDER: CasualtySplitFractions = { kia: 0.10, wia: 0.40 };

/** V2 main-path split: KIA 0.22 / WIA 0.76 / MIA 0.02 (halve durable-missing). */
const V2_MAIN: CasualtySplitFractions = { kia: 0.22, wia: 0.76 };
/** V2 siege split: KIA 0.20 / WIA 0.78 / MIA 0.02 (0.15→0.02 MIA, shelling rarely captures). */
const V2_SIEGE: CasualtySplitFractions = { kia: 0.20, wia: 0.78 };
/**
 * V2 undefended split: KIA 0.15 / WIA 0.50 / MIA 0.35 — UNCHANGED from shipped.
 *
 * EH-2 historian correction (20260611_casualty_historian_validation.md §5.2, §6):
 * collapsing the undefended-OSID MIA into WIA is "the single most historically wrong
 * move" — the excess "missing" on early-war undefended village takeovers (Prijedor /
 * Foča / Višegrad / Zvornik, 1992) was predominantly KILLED, not wounded. The
 * historically-ideal destination is KIA (~0.20–0.25), but raising KIA is territory-
 * coupled (feeds `pool.exhausted += (killed+mia)*0.75`) and is forbidden at 1.0. So we
 * leave the undefended split UNCHANGED rather than over-convert mass-grave-KIA "missing"
 * into "wounded". Post-1.0 lane: split this ~70% KIA / ~30% WIA once Lane-3 volume lands.
 */
const V2_UNDEFENDED: CasualtySplitFractions = { kia: 0.15, wia: 0.50 };
/**
 * V2 surrender-cascade split: KIA 0.10 / WIA 0.75 / MIA 0.15 (0.50→0.15; split-only).
 *
 * Organized surrender genuinely produces captures, so this path KEEPS a real (but
 * trimmed) MIA share rather than collapsing to ~0.02. 0.50 over-booked a *durable*
 * capture with no POW-return/exchange model; 0.15 is a realistic durable-POW share
 * (diagnosis 20260611_mc_leak_diagnosis.md §3). KIA + the forced
 * `defenderTotal = 0.5 × personnel` total knob are LEFT UNCHANGED (territory-coupled).
 */
const V2_SURRENDER: CasualtySplitFractions = { kia: 0.10, wia: 0.75 };

let _casualtyRealismV2Override: boolean | null = null;

function readEnvCasualtyRealismV2(): boolean {
    // EH-2 (2026-06-11): DEFAULT-ON. The MC-leak ledger fix is now the standard
    // casualty-split behavior (territory-orthogonal: control_delta byte-identical,
    // KIA + all casualty TOTALS untouched — only the MIA→WIA partition moves).
    // Explicit OFF values still disable it (rollback / flag-OFF byte-identity test).
    const raw = process.env.AWWV_CASUALTY_REALISM_V2;
    if (raw === undefined) return true; // default ON — EH-2 MC-leak fix is standard behavior
    const normalized = raw.trim().toLowerCase();
    if (normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no') {
        return false;
    }
    return true;
}

/**
 * Whether the B1 casualty-realism V2 re-anchor is active.
 * Default: TRUE (EH-2 — the MC-leak ledger fix is the standard split; territory-orthogonal).
 * Explicit env OFF ("0"/"false"/"off"/"no") disables it. Module-local override wins over env.
 */
export function isCasualtyRealismV2Enabled(): boolean {
    return _casualtyRealismV2Override !== null
        ? _casualtyRealismV2Override
        : readEnvCasualtyRealismV2();
}

/** Test/experiment hook: force the flag on or off, bypassing env. */
export function setCasualtyRealismV2Override(value: boolean): void {
    _casualtyRealismV2Override = value;
}

/** Test/experiment hook: clear the override, reverting to env-default (OFF when unset). */
export function resetCasualtyRealismV2Override(): void {
    _casualtyRealismV2Override = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-path split accessors. Each returns the shipped fractions when the flag is OFF
// (byte-identical) and the V2 fractions when ON. Consumers derive MIA as the
// remainder, exactly as they do today.
// ─────────────────────────────────────────────────────────────────────────────

/** Main-path (frontline attrition + standard battle) KIA/WIA split. */
export function getMainCasualtySplit(): CasualtySplitFractions {
    return isCasualtyRealismV2Enabled() ? V2_MAIN : SHIPPED_MAIN;
}

/** Siege-bombardment KIA/WIA split. */
export function getSiegeCasualtySplit(): CasualtySplitFractions {
    return isCasualtyRealismV2Enabled() ? V2_SIEGE : SHIPPED_SIEGE;
}

/** Undefended-OSID defender KIA/WIA split. */
export function getUndefendedCasualtySplit(): CasualtySplitFractions {
    return isCasualtyRealismV2Enabled() ? V2_UNDEFENDED : SHIPPED_UNDEFENDED;
}

/** Surrender-cascade defender KIA/WIA split. */
export function getSurrenderCascadeCasualtySplit(): CasualtySplitFractions {
    return isCasualtyRealismV2Enabled() ? V2_SURRENDER : SHIPPED_SURRENDER;
}
