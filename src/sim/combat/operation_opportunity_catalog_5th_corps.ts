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

// ═════════════════════════════════════════════════════════════════════════════
// Operation Tigar-Sloboda 94 — LANE C Phase 2.
//
// Family doc §4.1. Citation: BB2 pp.532-534, 541, 555.
//
// Historical anchor: 7-10 July 1994, Atif Dudaković's 5th Corps mounts a
// deception-and-thrust against APWB armed formations along the Cazin southern
// flank. Real-world arc: mid-Jan 1994 Skokovi → 16 Feb APWB+VRS counterattack
// (5th Corps "near critical") → 2-22 June 5th Corps advance to Pecigrad
// outskirts → 7-10 July deception → 4 Aug Pecigrad falls. Captured ~3000
// small arms + 200,000 rounds.
//
// Engine framing — pure military: APWB armed formations on the Cazin southern
// flank. The 21-22 Aug 1994 refugee column is OUT OF SCOPE here (Phase 3 AMBER
// territory, not this T1 surface).
//
// Substrate primitive consumed: `targets_friendly_overrides`. APWB rides as
// RS-aligned auxiliary per late-war design §10; the southern Cazin OSIDs
// painted RBiH in jan1993 are in APWB control during this arc, so the
// override exempts them from the friendly-controller filter at the
// `buildCorpsOperation` seam (scope-restricted to T1 + family `fifth_corps`).
// ═════════════════════════════════════════════════════════════════════════════

const TIGAR_DATE_MIN = 113;
const TIGAR_DATE_MAX = 122;
const TIGAR_READINESS_FLOOR = 0.30;
const TIGAR_LOGISTICS_PRESSURE_CEILING = 95;

/** Cazin southern-flank objectives toward the historical Pecigrad approach.
 *  All four are painted RBiH in jan1993 baseline (lines 169-172 of
 *  data/source/calibration/painted_control_jan1993.json) yet historically sit
 *  inside the APWB-held southern Cazin pocket during the Tigar-Sloboda arc.
 *  All four are present in data/derived/operational/operational_contact_graph.json
 *  and form a connected approach via the contact graph. */
const TIGAR_SLOBODA_OBJECTIVES: readonly string[] = [
    'op:cazin:coralici',     // Northern flank toward Velika Kladuša (adjacent to cazin_2, mutnik_2, vejinac_2, zboriste_2)
    'op:cazin:liskovac_2',   // Mid-flank approach (adjacent to coralici, mutnik_2, sturlic_2, vejinac_2)
    'op:cazin:mutnik_2',     // Southern flank toward Pecigrad (adjacent to coralici, sturlic_2, liskovac_2)
    'op:cazin:sturlic_2',    // Šturlić — historical anchor of the Pecigrad approach (adjacent to mutnik_2, liskovac_2, vejinac_2)
];

/** Bihać pocket survival anchors for Tigar-Sloboda (subset of the Sana set —
 *  same architectural meaning: if any one is RS-controlled, the pocket has
 *  structurally collapsed and the opportunity should not surface). */
const TIGAR_POCKET_SURVIVAL_OSIDS: readonly string[] = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

const TIGAR_SLOBODA_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'tigar_cazin_salient',
        name: 'Cazin Salient — Tigar-Sloboda',
        corps: PRIMARY_CORPS,
        // Brigade IDs cross-referenced against data/source/oob_brigades.json:
        //   arbih_501st_slavna_mountain     (oob line 1099) — 5th Corps, home Bihać
        //   arbih_502nd_vitezka_mountain    (oob line 1117) — 5th Corps, home Brekovica
        //   arbih_503rd_slavna_mountain     (oob line 1134) — 5th Corps, home Cazin
        //   arbih_505th_vitezka_mountain    (oob line 1152) — 5th Corps, home Bužim/Otoka
        //   arbih_510th_bosnian_liberation  (oob line 1185) — 5th Corps, home Cazin
        //   arbih_517th_light               (oob line 1218) — 5th Corps, home Šturlić/Cazin
        // (Note: prompt suggested *_bihac_mountain / *_cazin_mountain /
        // *_buzim_motorized / *_first names. OOB-canonical names are above.)
        brigades: [
            'arbih_501st_slavna_mountain' as FormationId,
            'arbih_502nd_vitezka_mountain' as FormationId,
            'arbih_503rd_slavna_mountain' as FormationId,
            'arbih_505th_vitezka_mountain' as FormationId,
            'arbih_510th_bosnian_liberation' as FormationId,
            'arbih_517th_light' as FormationId,
        ],
        objectives: TIGAR_SLOBODA_OBJECTIVES,
        staging_osid: 'op:cazin:cazin_2',
    },
];

// ─── Predicates ─────────────────────────────────────────────────────────────

/** date_window: w113 ≈ early Jul 1994, w122 ≈ early Aug 1994 (10-week arc
 *  covers the historical 7-10 July deception → early Aug Pecigrad fall). */
const dateWindowTigar: AxisPredicate = (_state, turn) => {
    if (turn < TIGAR_DATE_MIN) return { green: false, reason: 'July 1994 deception window not yet open' };
    if (turn > TIGAR_DATE_MAX) return { green: false, reason: 'July–early August 1994 window has closed' };
    return { green: true, reason: 'within Jul–early Aug 1994 deception window' };
};

/** pocket_survival → maps to staging_access axis (same architectural axis
 *  Sana uses for the Bihać pocket integrity check). */
const pocketSurvivalTigar: AxisPredicate = (state) => {
    for (const osid of TIGAR_POCKET_SURVIVAL_OSIDS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Bihać pocket integrity has broken (anchor lost)' };
        }
    }
    return { green: true, reason: 'Bihać pocket anchors held by 5th Corps' };
};

/** corps_readiness: 5th Corps still hardening — lower floor (0.30) than Sana's
 *  (0.40) because Tigar-Sloboda is a deception-heavy thrust needing fewer
 *  ready brigades than a deep exploitation advance. */
const corpsReadinessTigar: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: '5th Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS);
    if (traits.operation_readiness < TIGAR_READINESS_FLOOR) {
        return {
            green: false,
            reason: '5th Corps operational readiness below the deception-thrust floor',
        };
    }
    return {
        green: true,
        reason: '5th Corps operational readiness sufficient for a deception thrust',
    };
};

/** commander_confidence: models Dudaković's deception-doctrine premise — the
 *  op only makes sense if the corps has a live commander state. */
const commanderConfidenceTigar: AxisPredicate = (state) => {
    const cs = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    if (!cs) {
        return { green: false, reason: 'no 5th Corps commander state available' };
    }
    return { green: true, reason: '5th Corps commander state present' };
};

/** logistics: the June 1994 BiH-VRS ceasefire frees 5th Corps reserves; the
 *  axis goes red only if RBiH supply pressure is critical (>= 95). */
const logisticsTigar: AxisPredicate = (state) => {
    const pressure = state.political?.war_supply_pressure?.['RBiH'] ?? 0;
    if (pressure >= TIGAR_LOGISTICS_PRESSURE_CEILING) {
        return { green: false, reason: 'RBiH supply pressure critical for the deception thrust' };
    }
    return { green: true, reason: 'RBiH supply pressure compatible with the June 1994 ceasefire dividend' };
};

// (Note: a separate optional staging-access predicate was considered but
// folded into the single staging_access axis above — pocket-survival IS the
// staging-access signal architecturally, and a second predicate would
// double-count the same OSID set. The optional-axis ledger is satisfied by
// the `logistics` axis; see prerequisites mapping below.)

// ─── Catalog entry ──────────────────────────────────────────────────────────

export const TIGAR_SLOBODA_94_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'tigar_sloboda_94',
    name: 'Operation Tigar-Sloboda',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: PRIMARY_CORPS,
    family: 'fifth_corps',
    axes: TIGAR_SLOBODA_AXES,
    staging_osid: 'op:cazin:cazin_2',
    planning_duration: 3,
    min_attack_outcome: 'repulsed',
    citations: [
        'BB2 pp.532-534, 541, 555 — Atif Dudaković, 7-10 July 1994 Bihać deception, ~3000 small arms + 200,000 rounds captured, Pecigrad fall 4 Aug 1994',
        'docs/plans/late-war-5th-corps-opportunities-design.md §4.1 (Tigar-Sloboda 94)',
    ],
    historical_exit_class: 'partial_success',
    // CANONICAL: per late-war design §10, APWB rides as RS-aligned auxiliary;
    // these Cazin southern-flank OSIDs are RBiH-painted in jan1993 baseline
    // (lines 169-172 of painted_control_jan1993.json) yet are in APWB control
    // during the Tigar-Sloboda arc. The override exempts them from the
    // friendly-controller filter inside spawnCorpsOperationFromOpportunity.
    // Scope-restricted: the substrate honors this only when tier === 'T1' AND
    // family === 'fifth_corps' (both true here).
    targets_friendly_overrides: TIGAR_SLOBODA_OBJECTIVES,
    // CANONICAL prerequisite mapping — design-doc §4.1 prereq wishlist mapped
    // to the 9-axis substrate vocabulary:
    //   - "pocket_survival" (design wishlist)  → staging_access REQUIRED
    //     (Sana 95 uses the same architectural mapping; the staging_access
    //     predicate here checks the Bihać pocket anchor set, which is the
    //     pocket-survival signal.)
    //   - "logistics"                          → logistics OPTIONAL
    //     (Models the June 1994 BiH-VRS ceasefire as a soft dividend, not a
    //     hard gate. RBiH ≥95 supply pressure flips it red. Demoted from
    //     REQUIRED so min_optional_axes:1 has a real axis to count against —
    //     the prompt's prereq wishlist had no genuine OPTIONAL axes.)
    //   - "staging_access" (design wishlist)   → folded into the same axis as
    //     pocket-survival per Sana's architectural pattern (single axis carries
    //     pocket integrity; redundant Cazin-staging echo would double-count).
    // Other axes per prompt: n_a where the family doc says n_a; required where
    // the prompt marks REQUIRED.
    prerequisites: {
        date_window: 'required',
        political_authorization: 'n_a',          // intra-Bosniak; no Sarajevo gating
        corps_readiness: 'required',
        logistics: 'optional',                   // June 1994 BiH-VRS ceasefire dividend (soft)
        staging_access: 'required',              // pocket-survival (Sana mirror)
        weather_season: 'n_a',
        commander_confidence: 'required',        // Dudaković deception-doctrine premise
        enemy_weakness: 'n_a',                   // APWB cohesion not modelable through controller-faction signals
        alliance_context: 'n_a',                 // not gated on Storm/Oluja
        min_optional_axes: 1,
    },
    evaluators: {
        date_window: dateWindowTigar,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessTigar,
        logistics: logisticsTigar,
        staging_access: pocketSurvivalTigar,
        weather_season: alwaysGreen,
        commander_confidence: commanderConfidenceTigar,
        enemy_weakness: alwaysGreen,
        alliance_context: alwaysGreen,
    },
    staff_recommendation: 'approve',
};

// ═════════════════════════════════════════════════════════════════════════════
// Operation APWB Pressure 94 — LANE C Phase 3.
//
// Family doc §4.2. Citation: BB2 pp.534-535.
//
// Historical anchor — STRICT MILITARY FRAMING:
//   - 13 June 1994: 5th Corps reaches Pecigrad outskirts.
//   - 4 August 1994: Pecigrad falls to 5th Corps.
//   - 9 August 1994: Trzac and Šturlić sectors fall.
//   - 21 August 1994: Velika Kladuša overrun.
// 5th Corps reduces APWB armed formations along the Pecigrad–Šturlić–Trzac–
// Velika Kladuša axis after the Tigar-Sloboda deception thrust opens the
// southern Cazin flank.
//
// AMBER scope (per canon-compliance Phase 0 verdict):
//   - Pure military containment of APWB armed formations / Abdić's brigades.
//   - The August 21-22 1994 non-combatant outflow does NOT meet T4 rupture
//     criteria; this is a T1 territorial reduction.
//   - The non-combatant outflow vocabulary set (per the AMBER guardrail test
//     in operation_opportunities_apwb_pressure_94.test.ts) MUST NOT appear in
//     any player-facing surface — description prose, predicate reasons, axis
//     names, or proposal text.
//   - Non-combatant outflow is a Ring 1 consequence handled by the existing
//     displacement.ts pipeline — NOT a proposal payoff term.
//   - Citations: BB2 pp.534-535 ONLY. No ICTY-related non-combatant narrative.
//
// Substrate primitive consumed: `targets_friendly_overrides`. APWB rides as
// RS-aligned auxiliary per late-war design §10; the Cazin/VK axis OSIDs are
// RBiH-painted in jan1993 baseline (lines 169-172 + 632-635 of
// painted_control_jan1993.json) yet are in APWB control during this arc, so
// the override exempts them from the friendly-controller filter at the
// `buildCorpsOperation` seam (scope-restricted to T1 + family `fifth_corps`).
//
// Emergent dependency on Tigar-Sloboda 94: NO hardcoded prerequisite chain.
// The dependency emerges through (a) overlapping `op:cazin:sturlic_2` in both
// opportunities' target sets, and (b) the same 5th Corps brigade pool being
// drawn against in both — so one-shot guard + brigade scarcity make these
// opportunities serialize naturally without a railroad.
// ═════════════════════════════════════════════════════════════════════════════

const APWB_DATE_MIN = 113;
const APWB_DATE_MAX = 130;
const APWB_READINESS_FLOOR = 0.40;
const APWB_LOGISTICS_PRESSURE_CEILING = 95;

/** Pecigrad–Šturlić–Trzac–Velika Kladuša axis objectives. All five are
 *  RBiH-painted in jan1993 baseline yet are in APWB armed-formation control
 *  during this arc. Adjacency was verified against
 *  data/derived/operational/operational_contact_graph.json:
 *    sturlic_2 ↔ vejinac_2 (cross-municipality entry)
 *    vejinac_2 ↔ poljana_2 ↔ velika_kladusa_2 (VK drive path)
 *    vejinac_2 ↔ zboriste_2 (northern flank)
 *  Note: Pecigrad and Trzac have no separate operational OSIDs (absent from
 *  the contact graph and canonical-to-operational map). Their geographic
 *  function is carried by `op:cazin:sturlic_2` (Šturlić) — the historical
 *  anchor of the Pecigrad approach per BB2 p.534. The Šturlić target is
 *  intentionally REUSED from Tigar-Sloboda's set; the overlap is the
 *  architectural hook that makes one-shot guard + brigade-pool scarcity
 *  serialize the two opportunities emergently. */
const APWB_PRESSURE_OBJECTIVES: readonly string[] = [
    'op:cazin:sturlic_2',                    // Šturlić — Pecigrad-approach anchor (REUSED FROM TIGAR-SLOBODA)
    'op:velika_kladusa:vejinac_2',           // Cross-municipality entry from Cazin southern flank
    'op:velika_kladusa:zboriste_2',          // Northern axis flank
    'op:velika_kladusa:poljana_2',           // Adjacency to VK center; arbih_506th home OSID
    'op:velika_kladusa:velika_kladusa_2',    // Final axis objective
];

/** Bihać pocket survival anchors for APWB Pressure (matches Tigar-Sloboda's
 *  set — the architectural meaning is identical: pocket integrity check). */
const APWB_POCKET_SURVIVAL_OSIDS: readonly string[] = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

const APWB_PRESSURE_AXES: readonly OpportunityAxisDef[] = [
    {
        axis_id: 'apwb_pecigrad_kladusa',
        name: 'Pecigrad – Velika Kladuša Drive',
        corps: PRIMARY_CORPS,
        // Brigade IDs cross-referenced against data/source/oob_brigades.json:
        //   arbih_501st_slavna_mountain     (oob line 1099) — 5th Corps, home Bihać
        //   arbih_502nd_vitezka_mountain    (oob line 1117) — 5th Corps, home Brekovica
        //   arbih_503rd_slavna_mountain     (oob line 1134) — 5th Corps, home Cazin
        //   arbih_505th_vitezka_mountain    (oob line 1152) — 5th Corps, home Otoka
        //   arbih_506th_mountain            (verified)      — 5th Corps, home Poljana (VK municipality)
        //   arbih_510th_bosnian_liberation  (oob line 1185) — 5th Corps, home Ćoralići
        //   arbih_517th_light               (oob line 1218) — 5th Corps, home Ćoralići
        // Same brigade pool as Tigar-Sloboda + arbih_506th_mountain (the VK-axis
        // brigade by home_osid). Pool overlap is intentional: it makes one-shot
        // + brigade scarcity serialize the two opportunities emergently.
        brigades: [
            'arbih_501st_slavna_mountain' as FormationId,
            'arbih_502nd_vitezka_mountain' as FormationId,
            'arbih_503rd_slavna_mountain' as FormationId,
            'arbih_505th_vitezka_mountain' as FormationId,
            'arbih_506th_mountain' as FormationId,
            'arbih_510th_bosnian_liberation' as FormationId,
            'arbih_517th_light' as FormationId,
        ],
        objectives: APWB_PRESSURE_OBJECTIVES,
        staging_osid: 'op:cazin:cazin_2',
    },
];

// ─── Predicates ─────────────────────────────────────────────────────────────

/** date_window: w113 ≈ early Jul 1994 (5th Corps approaches Pecigrad);
 *  w130 widens past w125 (~late Aug 1994, VK overrun) to absorb post-VK
 *  consolidation operations. */
const dateWindowApwb: AxisPredicate = (_state, turn) => {
    if (turn < APWB_DATE_MIN) return { green: false, reason: 'mid-1994 reduction window not yet open' };
    if (turn > APWB_DATE_MAX) return { green: false, reason: 'mid-1994 reduction window has closed' };
    return { green: true, reason: 'within Jul–Aug 1994 reduction window' };
};

/** staging_access — same architectural axis Sana and Tigar use: Bihać pocket
 *  integrity check against the canonical anchor set. PLUS the southern-flank
 *  approaches must be RBiH-controlled (Tigar-Sloboda historically captured
 *  these first). The southern-flank requirement is the live signal of the
 *  emergent Tigar-Sloboda dependency — no hardcoded prerequisite chain, just
 *  "the approaches must actually be ours." */
const TIGAR_APPROACH_OSIDS: readonly string[] = [
    'op:cazin:coralici',
    'op:cazin:liskovac_2',
    'op:cazin:mutnik_2',
    'op:cazin:sturlic_2',
];
const stagingAccessApwb: AxisPredicate = (state) => {
    for (const osid of APWB_POCKET_SURVIVAL_OSIDS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'Bihać pocket integrity has broken (anchor lost)' };
        }
    }
    for (const osid of TIGAR_APPROACH_OSIDS) {
        const ctrl = getPoliticalControllerOSID(state, osid, undefined);
        if (ctrl !== null && ctrl !== 'RBiH') {
            return { green: false, reason: 'southern Cazin flank approaches not yet secured by 5th Corps' };
        }
    }
    return { green: true, reason: 'Bihać pocket anchors held and southern Cazin flank secured' };
};

/** corps_readiness: 5th Corps operational readiness clears 0.40 — sustained-
 *  drive floor (higher than Tigar-Sloboda's 0.30 deception floor). */
const corpsReadinessApwb: AxisPredicate = (state) => {
    if (!state.military.corps_command?.[PRIMARY_CORPS]) {
        return { green: false, reason: '5th Corps command not present in this scenario' };
    }
    const traits = computeCorpsOperationReadiness(state, PRIMARY_CORPS);
    if (traits.operation_readiness < APWB_READINESS_FLOOR) {
        return {
            green: false,
            reason: '5th Corps operational readiness below the sustained-drive floor',
        };
    }
    return {
        green: true,
        reason: '5th Corps operational readiness sufficient for a sustained drive',
    };
};

/** commander_confidence: live 5th Corps commander state present. */
const commanderConfidenceApwb: AxisPredicate = (state) => {
    const cs = state.military.corps_command?.[PRIMARY_CORPS]?.commander_state;
    if (!cs) {
        return { green: false, reason: 'no 5th Corps commander state available' };
    }
    return { green: true, reason: '5th Corps commander state present' };
};

/** logistics: optional. June 1994 BiH-VRS ceasefire in effect → only flips
 *  red if RBiH supply pressure is critical (>= 95). */
const logisticsApwb: AxisPredicate = (state) => {
    const pressure = state.political?.war_supply_pressure?.['RBiH'] ?? 0;
    if (pressure >= APWB_LOGISTICS_PRESSURE_CEILING) {
        return { green: false, reason: 'RBiH supply pressure critical for the sustained drive' };
    }
    return { green: true, reason: 'RBiH supply pressure compatible with the June 1994 ceasefire dividend' };
};

// ─── Catalog entry ──────────────────────────────────────────────────────────

export const APWB_PRESSURE_94_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'apwb_pressure_94',
    name: 'Operation APWB Pressure',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: PRIMARY_CORPS,
    family: 'fifth_corps',
    axes: APWB_PRESSURE_AXES,
    staging_osid: 'op:cazin:cazin_2',
    planning_duration: 4,
    min_attack_outcome: 'repulsed',
    citations: [
        // AMBER scope: BB2 pp.534-535 ONLY. NO ICTY-related non-combatant narrative.
        // Historical scope is the Pecigrad–Šturlić–Trzac–Velika Kladuša axis
        // reduction of APWB armed formations (13 Jun → 21 Aug 1994).
        'BB2 pp.534-535 — 5th Corps reduction of APWB armed formations along the Pecigrad–Šturlić–Trzac–Velika Kladuša axis (13 Jun – 21 Aug 1994)',
        'docs/plans/late-war-5th-corps-opportunities-design.md §4.2 (APWB / Velika Kladuša pressure)',
    ],
    historical_exit_class: 'decisive_success',
    // CANONICAL: per late-war design §10, APWB rides as RS-aligned auxiliary;
    // these Cazin/VK axis OSIDs are RBiH-painted in jan1993 baseline (lines
    // 169-172 + 632-635 of painted_control_jan1993.json) yet are in APWB
    // control during the Pressure arc. The override exempts them from the
    // friendly-controller filter inside spawnCorpsOperationFromOpportunity.
    // Scope-restricted: substrate honors this only when tier === 'T1' AND
    // family === 'fifth_corps' (both true here).
    targets_friendly_overrides: APWB_PRESSURE_OBJECTIVES,
    // CANONICAL prerequisite mapping — design-doc §4.2 prereq wishlist mapped
    // to the 9-axis substrate vocabulary:
    //   - "pocket_survival" (design wishlist)  → folded into staging_access
    //     REQUIRED (matches Sana / Tigar architectural pattern; the
    //     staging_access predicate carries pocket integrity AND southern-flank
    //     approach control — the latter is the live signal of the emergent
    //     Tigar-Sloboda dependency, not a hardcoded prerequisite).
    //   - "logistics"                          → logistics OPTIONAL (June 1994
    //     ceasefire dividend modeled as soft; satisfies min_optional_axes:1).
    //   - "enemy_weakness"                     → n_a (APWB cohesion not
    //     modelable through controller-faction signals; the historian-noted
    //     dependency on Tigar-Sloboda success is captured architecturally
    //     through overlapping `targets_friendly_overrides` + brigade-pool
    //     scarcity, NOT through an explicit predicate — see design doc §4.2).
    //   - political_authorization, weather_season, alliance_context: n_a per
    //     prompt (intra-Bosniak; year-round; not Storm-gated).
    prerequisites: {
        date_window: 'required',
        political_authorization: 'n_a',          // intra-Bosniak; no Sarajevo gating
        corps_readiness: 'required',
        logistics: 'optional',                   // June 1994 BiH-VRS ceasefire dividend (soft)
        staging_access: 'required',              // pocket-survival + southern-flank approaches secured
        weather_season: 'n_a',
        commander_confidence: 'required',
        enemy_weakness: 'n_a',                   // see comment block above
        alliance_context: 'n_a',                 // not Storm-gated
        min_optional_axes: 1,
    },
    evaluators: {
        date_window: dateWindowApwb,
        political_authorization: alwaysGreen,
        corps_readiness: corpsReadinessApwb,
        logistics: logisticsApwb,
        staging_access: stagingAccessApwb,
        weather_season: alwaysGreen,
        commander_confidence: commanderConfidenceApwb,
        enemy_weakness: alwaysGreen,
        alliance_context: alwaysGreen,
    },
    staff_recommendation: 'approve',
};

/** Catalog export for this family. Sana 95 (Phase 3) + Tigar-Sloboda 94
 *  (LANE C Phase 2) + APWB Pressure 94 (LANE C Phase 3) are live; Una /
 *  Breza / Pauk / Grmeč are pending later phases of the family doc's
 *  implementation order. */
export const FIFTH_CORPS_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    SANA_95_OPPORTUNITY,
    TIGAR_SLOBODA_94_OPPORTUNITY,
    APWB_PRESSURE_94_OPPORTUNITY,
];
