/**
 * operation_opportunity_catalog_5th_corps.ts — LANE B Phase 3 (Operation
 * Opportunity MVP): the first-content family — ARBiH 5th Corps / Bihać
 * pocket → Sana 95 exploitation opportunity.
 *
 * Family design: docs/plans/late-war-5th-corps-opportunities-design.md
 * Generic substrate: src/sim/combat/operation_opportunities.ts
 *
 * This is the MVP opportunity. It models the historical ARBiH 5th Corps
 * post-Storm/Oluja exploitation south-east into Una-Sana valley
 * (Sep–Oct 1995, BB1 pp.417, 419-420). Per the design doc:
 *
 *   - 5th Corps must be modelled as an isolated pocket family, not a generic
 *     ARBiH late-war buff.
 *   - Sana must be unlocked by THEATER, not by calendar.
 *   - Pocket survival, Storm-opened theater, corps readiness, staging access,
 *     and live enemy posture are the gating signals.
 *   - The opportunity may fail, stall, or be declined. Historical success is
 *     not forced.
 *
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Single owner of the Operation Sana opportunity.
 *            The legacy scripted Sana entry in `triggered_operations.ts`
 *            was REMOVED in this same Phase 3 commit so this file is the
 *            unique owner — there is no calendar-only fallback.
 * ═══════════════════════════════════════════════════════════════
 *
 * READS:     state.meta.turn, state.meta.operation_storm_triggered,
 *            state.political.political_controllers,
 *            state.military.formations[*].cohesion (for enemy_weakness proxy),
 *            corps_operation_readiness for arbih_5th_corps.
 * WRITES:    Nothing — only catalog.
 * MUST NOT:  Force the historical outcome. Override controllers. Rely on a
 *            painted-target signal. Add atrocity / sensitive-history levers.
 */

import type { GameState } from '../../state/game_state.js';
import type { FormationId } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type {
    AxisPredicate,
    OperationOpportunityDef,
    OpportunityAxisDef,
} from './operation_opportunities.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';

const PRIMARY_CORPS = 'arbih_5th_corps';

// ─── Staging anchors (5th Corps holds these throughout the pocket arc) ──────
const STAGING_BIHAC = 'op:bihac:bihac_2';
const STAGING_KRUPA_OTOKA = 'op:bosanska_krupa:otoka_2';

// ─── Sana objectives (BB1 pp.417, 419-420; identical roster to legacy
//     scripted Sana in triggered_operations.ts so painted-truth comparison
//     remains apples-to-apples). ────────────────────────────────────────────
const KRUPA_VALLEY_OBJECTIVES = [
    'op:bosanska_krupa:ivanjska_2',
    'op:bosanska_krupa:arapusa_2',
    'op:bosanska_krupa:donji_dubovik_2',
    'op:bosanska_krupa:vranjska_2',
    'op:bosanska_krupa:jasenica_2',
    'op:bosanska_krupa:gornja_suvaja',
];

const BIHAC_PETROVAC_OBJECTIVES = [
    'op:bihac:ripac',
    'op:bihac:racic',
    'op:bihac:trubar',
    'op:bihac:orasac_2',
    'op:bosanski_petrovac:vrtoce',
    'op:bosanski_petrovac:bosanski_petrovac_2',
    'op:bosanski_petrovac:dobro_selo_2',
    'op:bosanski_petrovac:kolonic_2',
    'op:bosanski_petrovac:vodjenica',
    'op:bosanski_petrovac:prkosi',
    'op:bosanski_petrovac:krnjeusa',
    'op:bosanski_petrovac:jasenovac_2',
];

const SANSKI_KLJUC_OBJECTIVES = [
    'op:sanski_most:lusci_palanka_2',
    'op:sanski_most:budimlic_japra_2',
    'op:sanski_most:sanski_most_2',
    'op:sanski_most:ilidza_2',
    'op:sanski_most:jelasinovci',
    'op:sanski_most:kljevci',
    'op:sanski_most:ostra_luka',
    'op:sanski_most:skucani_vakuf_2',
    'op:sanski_most:stari_majdan',
    'op:kljuc:hadzici',
    'op:kljuc:kljuc_2',
    'op:kljuc:krasulje_2',
    'op:kljuc:sanica_2',
];

/** Sana pocket-survival anchors. If any one is RS-controlled, the pocket
 *  has structurally collapsed and the opportunity should not surface. */
const POCKET_SURVIVAL_OSIDS: readonly string[] = [
    STAGING_BIHAC,
    'op:bihac:bihac_3',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    STAGING_KRUPA_OTOKA,
];

/** Petrovac/Sanski/Ključ approach OSIDs — used as the enemy_weakness proxy. */
const VRS_HELD_TARGETS_FOR_WEAKNESS: readonly string[] = [
    'op:bosanski_petrovac:bosanski_petrovac_2',
    'op:bosanski_petrovac:vrtoce',
    'op:sanski_most:sanski_most_2',
    'op:kljuc:kljuc_2',
];

// ─── Axis definitions (identical to legacy Sana so the post-approval
//     CorpsOperation has the same brigade/objective shape). ─────────────────
const SANA_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'sana_krupa',
        name: 'Krupa Una Valley',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_511th_slavna_mountain' as FormationId,
            'arbih_505th_vitezka_mountain' as FormationId,
        ],
        objectives: KRUPA_VALLEY_OBJECTIVES,
        staging_osid: STAGING_KRUPA_OTOKA,
    },
    {
        axis_id: 'sana_bihac_petrovac',
        name: 'Bihać–Petrovac Corridor',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_501st_slavna_mountain' as FormationId,
            'arbih_502nd_vitezka_mountain' as FormationId,
            'arbih_504th_cazin_light' as FormationId,
        ],
        objectives: BIHAC_PETROVAC_OBJECTIVES,
        staging_osid: STAGING_BIHAC,
    },
    {
        axis_id: 'sana_sanski_most_kljuc',
        name: 'Sanski Most + Ključ Liberation',
        corps: PRIMARY_CORPS,
        brigades: [
            'arbih_503rd_slavna_mountain' as FormationId,
            'arbih_506th_mountain' as FormationId,
            'arbih_510th_bosnian_liberation' as FormationId,
            'arbih_517th_light' as FormationId,
        ],
        objectives: SANSKI_KLJUC_OBJECTIVES,
        staging_osid: STAGING_KRUPA_OTOKA,
    },
];

// ─── Predicates (read live state only) ──────────────────────────────────────

/** date_window: late summer / autumn 1995. Wide enough that delay is meaningful. */
const dateWindowSana: AxisPredicate = (_state, turn) => {
    const min = 175;
    const max = 200;
    if (turn < min) return { green: false, reason: 'late-summer 1995 window not yet open' };
    if (turn > max) return { green: false, reason: 'autumn 1995 exploitation window has closed' };
    return { green: true, reason: 'within Aug–Oct 1995 exploitation window' };
};

/** alliance_context: Operation Storm has triggered (HV/HVO western theater open). */
const allianceContextSana: AxisPredicate = (state) => {
    if (state.meta.operation_storm_triggered === true) {
        return { green: true, reason: 'Operation Storm has opened the western theater' };
    }
    return { green: false, reason: 'western theater not yet opened (Operation Storm pending)' };
};

/** staging_access: 5th Corps still holds Bihać pocket staging anchors (pocket survived). */
const stagingAccessSana: AxisPredicate = (state) => {
    for (const osid of POCKET_SURVIVAL_OSIDS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Bihać pocket integrity has broken (anchor lost)' };
        }
    }
    return { green: true, reason: 'Bihać pocket staging anchors held by 5th Corps' };
};

/** corps_readiness: 5th Corps operation_readiness clears the soft floor. */
const SANA_READINESS_FLOOR = 0.40;
const corpsReadinessSana: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: '5th Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS);
    if (traits.operation_readiness < SANA_READINESS_FLOOR) {
        return {
            green: false,
            reason: '5th Corps operational readiness below threshold for an exploitation push',
        };
    }
    return {
        green: true,
        reason: '5th Corps operational readiness sufficient for an exploitation push',
    };
};

/** enemy_weakness: VRS Krajina still holds the operational targets but the
 *  front exists — at least one Petrovac/Sanski/Ključ anchor is RS-controlled
 *  (something to liberate) AND at least one is RBiH-controlled (front exists). */
const enemyWeaknessSana: AxisPredicate = (state) => {
    let rs = 0;
    let rbih = 0;
    for (const osid of VRS_HELD_TARGETS_FOR_WEAKNESS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl === 'RS') rs++;
        else if (ctrl === 'RBiH') rbih++;
    }
    if (rs === 0) {
        return { green: false, reason: 'no operational targets remain in enemy hands' };
    }
    return {
        green: true,
        reason: 'enemy western posture stretched — exploitation targets still in enemy hands',
    };
};

/** logistics: optional. 5th Corps faction supply pressure not in the bottom band. */
const logisticsSana: AxisPredicate = (state) => {
    const pressure = state.political?.war_supply_pressure?.['RBiH'] ?? 0;
    if (pressure >= 90) {
        return { green: false, reason: 'RBiH supply pressure critical for Sana logistics' };
    }
    return { green: true, reason: 'RBiH supply pressure within acceptable band' };
};

/** commander_confidence: optional. Soft check that 5th Corps has a commander state. */
const commanderConfidenceSana: AxisPredicate = (state) => {
    const cs = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    if (!cs) {
        return { green: false, reason: 'no 5th Corps commander state available' };
    }
    return { green: true, reason: '5th Corps commander state present' };
};

/** Always-green stub for axes the family marks n_a. Predicates must exist
 *  per evaluator contract; n_a mode skips the result. */
const alwaysGreen: AxisPredicate = () => ({ green: true, reason: 'not applicable for this family' });

// ─── Catalog entry ──────────────────────────────────────────────────────────

export const SANA_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'sana_95',
    name: 'Operation Sana',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: PRIMARY_CORPS,
    family: 'fifth_corps',
    axes: SANA_AXES,
    staging_osid: STAGING_BIHAC,
    planning_duration: 5,
    min_attack_outcome: 'repulsed',
    citations: [
        'BB1 pp.417, 419-420 — Sana 95 mission, operational groups, rapid Petrovac/Kljuc/Krupa gains',
        'docs/plans/late-war-5th-corps-opportunities-design.md §4.7 (Sana 95)',
    ],
    historical_exit_class: 'partial_success',
    prerequisites: {
        date_window: 'required',
        political_authorization: 'n_a',
        corps_readiness: 'required',
        logistics: 'optional',
        staging_access: 'required',
        weather_season: 'n_a',
        commander_confidence: 'optional',
        enemy_weakness: 'required',
        alliance_context: 'required',
        min_optional_axes: 1,
    },
    evaluators: {
        date_window: dateWindowSana,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessSana,
        logistics: logisticsSana,
        staging_access: stagingAccessSana,
        weather_season: alwaysGreen,
        commander_confidence: commanderConfidenceSana,
        enemy_weakness: enemyWeaknessSana,
        alliance_context: allianceContextSana,
    },
    staff_recommendation: 'approve',
};

/** Catalog export for this family. Other 5th Corps opportunities (Tigar-
 *  Sloboda, Pecigrad, Breza, Pauk, Grmec) are deferred per the family doc's
 *  implementation order; Sana is the MVP single-content for Phase 3. */
export const FIFTH_CORPS_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    SANA_95_OPPORTUNITY,
];
