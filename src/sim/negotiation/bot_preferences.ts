/**
 * Bot ideological preference vectors for the Dayton institutional dimensions
 * (Phase 2 of the institutional-architecture expansion, build spec §3.1).
 *
 * Each faction has an IDEAL POINT per dimension grounded in its real 1994-95 stance:
 *
 *   - RS    → entity sovereignty / confederation, tripartite-veto, three-peoples,
 *             OHR-gone. (Pale's Contact-Group-plan rejection, 3 Aug 1994.)
 *   - RBiH  → strong central state / unitary, civic citizens, simple-majority,
 *             OHR-backstop retained. (Sarajevo's unitary-state preference.)
 *   - HRHB  → entity autonomy where Croat-relevant, BUT ALIGNS WITH RS on the
 *             ethnic-bloc constitutional choices (tripartite presidency, vital-
 *             interest veto, three constituent peoples) — the Croat constituent-
 *             people status secured at the Washington Agreement (Mar 1994).
 *
 * `prefDelta(faction, dim, choice)` returns a signed distance in [-1, +1]:
 *   -1 = exactly the faction's ideal (loves it), +1 = the faction's anathema.
 * The bot's adjusted cost (bot_negotiation.ts) scales the base cost by this delta
 * and adds a floor political objection for anathema choices that don't directly
 * bill the faction (so RS objects to civic-citizens even when it is "free" to RS).
 *
 * Determinism: constant tables, no RNG/clock. Pure lookups.
 */

import type { CompetencyOwner } from './competency_packages.js';
import { getCompetencyById } from './competency_packages.js';
import type { EntityAutonomySetting } from '../../state/negotiation_types.js';

type Faction = 'RBiH' | 'RS' | 'HRHB';

// ── Dial ideal point per faction ──────────────────────────────────────────────
const DIAL_IDEAL: Readonly<Record<Faction, EntityAutonomySetting>> = Object.freeze({
    RS: 'confederation', // maximal entity sovereignty
    RBiH: 'unitary', // strong central state
    HRHB: 'federalized', // entity-relevant autonomy, but inside the Federation
});

// Ordered axis for the dial so one-step counters + distance are well-defined.
// unitary (most central) → federalized → dayton-historical → confederation (most devolved).
const DIAL_AXIS: readonly EntityAutonomySetting[] = ['unitary', 'federalized', 'dayton-historical', 'confederation'];

function dialIndex(d: EntityAutonomySetting): number {
    const i = DIAL_AXIS.indexOf(d);
    return i < 0 ? DIAL_AXIS.indexOf('dayton-historical') : i;
}

/**
 * Signed preference delta [-1,+1] of a dial setting for a faction. 0 distance maps
 * to -1 (ideal), the full axis span maps to +1 (anathema). Pure.
 */
export function dialPrefDelta(faction: string, dial: EntityAutonomySetting): number {
    const ideal = DIAL_IDEAL[faction as Faction];
    if (!ideal) return 0;
    const span = DIAL_AXIS.length - 1; // 3
    const dist = Math.abs(dialIndex(dial) - dialIndex(ideal));
    return clampDelta((dist / span) * 2 - 1);
}

/**
 * One-step counter-dial toward the faction's ideal, given the current dial. Returns
 * the same dial when already at the ideal. Used by the counter-offer generator.
 */
export function counterDialTowardIdeal(faction: string, current: EntityAutonomySetting): EntityAutonomySetting {
    const ideal = DIAL_IDEAL[faction as Faction];
    if (!ideal) return current;
    const ci = dialIndex(current);
    const ti = dialIndex(ideal);
    if (ci === ti) return current;
    const step = ci < ti ? 1 : -1;
    return DIAL_AXIS[ci + step];
}

// ── Competency ideal owner per faction ────────────────────────────────────────
// RS wants everything sovereign-relevant at the ENTITY (it IS the entity). RBiH
// wants the state to hold real competencies (centralize). HRHB tracks RS on the
// ethnic-bloc / coercive competencies (entity), but is neutral on the connective/
// shared plumbing. Unlisted competencies fall back to the Annex-4 default (neutral).
const COMPETENCY_IDEAL_OWNER: Readonly<Record<Faction, Readonly<Record<string, CompetencyOwner>>>> = Object.freeze({
    RS: Object.freeze({
        comp_defense: 'entity', comp_police: 'entity', comp_taxation: 'entity',
        comp_judiciary: 'entity', comp_education: 'entity', comp_health_social: 'entity',
        comp_foreign_policy: 'entity', comp_monetary: 'entity', comp_customs: 'entity',
    }),
    RBiH: Object.freeze({
        comp_defense: 'state', comp_police: 'state', comp_taxation: 'state',
        comp_judiciary: 'state', comp_education: 'state', comp_health_social: 'state',
        comp_foreign_policy: 'state', comp_monetary: 'state', comp_customs: 'state',
    }),
    HRHB: Object.freeze({
        // Croat-relevant entity autonomy: defense/police/education/taxation at entity.
        comp_defense: 'entity', comp_police: 'entity', comp_education: 'entity', comp_taxation: 'entity',
    }),
});

/**
 * Signed preference delta [-1,+1] of a competency owner choice for a faction. The
 * faction's ideal owner is -1; the opposite pole is +1; a shared/intermediate or an
 * unlisted competency is 0 (neutral). Pure.
 */
export function competencyPrefDelta(faction: string, compId: string, choice: CompetencyOwner): number {
    const ideal = COMPETENCY_IDEAL_OWNER[faction as Faction]?.[compId];
    if (!ideal) return 0; // no strong stance → neutral
    if (choice === ideal) return -1;
    // The pole opposite the ideal (state↔entity) is anathema; shared is the midpoint.
    if (choice === 'shared') return 0;
    return +1;
}

/**
 * The faction's ideal owner for a competency, or the Annex-4 default when the
 * faction has no strong stance (used by the counter-offer generator to drive the
 * allocation toward the ideal). Pure.
 */
export function competencyIdealOwner(faction: string, compId: string): CompetencyOwner {
    const ideal = COMPETENCY_IDEAL_OWNER[faction as Faction]?.[compId];
    if (ideal) return ideal;
    return getCompetencyById(compId)?.default_owner ?? 'shared';
}

// ── Constitutional / return-justice ideal option per faction ──────────────────
// RS + HRHB align on the ethnic-bloc protections; RBiH wants the civic/centralized
// pole. Each faction's ideal option per slot; the default option is the neutral
// midpoint when a faction has no listed ideal. Unlisted slot → neutral (delta 0).
const CONSTITUTIONAL_IDEAL: Readonly<Record<Faction, Readonly<Record<string, string>>>> = Object.freeze({
    RS: Object.freeze({
        arch_presidency: 'tripartite_rotating',
        arch_veto_regime: 'vital_interest_entity',
        arch_constituent_model: 'three_peoples',
        arch_const_court: 'domestic_only',
        arch_ohr_authority: 'none',
        rj_refugee_return: 'frozen_lines',
        rj_icty_cooperation: 'non_cooperation',
    }),
    HRHB: Object.freeze({
        // Aligns with RS on the ethnic-bloc constitutional choices.
        arch_presidency: 'tripartite_rotating',
        arch_veto_regime: 'vital_interest_entity',
        arch_constituent_model: 'three_peoples',
        arch_const_court: 'international_judges',
        arch_ohr_authority: 'monitoring_only',
        rj_refugee_return: 'voluntary_only',
        rj_icty_cooperation: 'conditional',
    }),
    RBiH: Object.freeze({
        arch_presidency: 'collective_civic',
        arch_veto_regime: 'simple_majority',
        arch_constituent_model: 'civic_citizens',
        arch_const_court: 'international_judges',
        arch_ohr_authority: 'bonn_powers',
        rj_refugee_return: 'full_right_of_return',
        rj_icty_cooperation: 'full',
    }),
});

/**
 * Signed preference delta [-1,+1] of a constitutional / return-justice OPTION for a
 * faction. The faction's ideal option is -1; the option furthest along the slot's
 * axis from the ideal is +1; intermediate options scale linearly. A slot the
 * faction has no stance on → 0 (neutral). Pure.
 *
 * The slot axis is the authored option order (default-first in the data), treated as
 * an ideological spectrum; distance is normalized by the slot's option span.
 */
export function constitutionalPrefDelta(
    faction: string,
    slotId: string,
    optionId: string,
    slotOptionOrder: readonly string[],
): number {
    const ideal = CONSTITUTIONAL_IDEAL[faction as Faction]?.[slotId];
    if (!ideal) return 0;
    const span = Math.max(1, slotOptionOrder.length - 1);
    const oi = slotOptionOrder.indexOf(optionId);
    const ti = slotOptionOrder.indexOf(ideal);
    if (oi < 0 || ti < 0) return 0;
    const dist = Math.abs(oi - ti);
    return clampDelta((dist / span) * 2 - 1);
}

/** The faction's ideal option id for a constitutional / return-justice slot, if any. */
export function constitutionalIdealOption(faction: string, slotId: string): string | undefined {
    return CONSTITUTIONAL_IDEAL[faction as Faction]?.[slotId];
}

// ── adjusted-cost lerp + objection floor (build spec §3) ──────────────────────

/** Linear interpolation. */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Map a base cost + a faction's preference delta to the bot's ADJUSTED cost:
 *   adjustedCost = baseCost × lerp(0.6, 1.8, (prefDelta+1)/2)
 *                + 8 × max(0, prefDelta)   ← floor political objection
 * The floor term makes a bot OBJECT to a choice it hates even when the asymmetric
 * model bills it nothing (prefDelta>0, baseCost may be 0). The discount (delta<0)
 * never goes below 0.6× and never adds a floor. Integer-rounded. Pure.
 */
export function adjustedCost(baseCost: number, prefDelta: number): number {
    const d = clampDelta(prefDelta);
    const scaled = baseCost * lerp(0.6, 1.8, (d + 1) / 2);
    const floor = 8 * Math.max(0, d);
    return Math.round(scaled + floor);
}

function clampDelta(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return v < -1 ? -1 : v > 1 ? 1 : v;
}
