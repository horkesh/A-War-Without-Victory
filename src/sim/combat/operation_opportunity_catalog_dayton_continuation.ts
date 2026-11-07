/**
 * operation_opportunity_catalog_dayton_continuation.ts — counterfactual continuation
 * operations that exist ONLY after a player declines Dayton (owner, 2026-11-07:
 * "declining Dayton would reopen the war and the ops would continue"; chosen option:
 * "Resume halted 1995 pushes").
 *
 * Design (operations-expert + historian seats): docs/40_reports/20261107_DAYTON_CONTINUATION_OPERATIONS.md.
 * Direction-of-effort authority: Balkan Battlegrounds I, KB digital pages 420-429, 462
 * (5th Corps toward Prijedor / Ljubija / Bosanski Novi; HV-HVO Southern Move phase 2 toward
 * Manjača with the US red line short of Banja Luka; the VRS counter-punches of
 * 24 Sep - 9 Oct 1995 around Ključ and Krasulje; the last ARBiH Ozren drive).
 *
 * ═══════════════════════════════════════════════════════════════
 * GATE: every operation here is gated on `daytonContinuationWindow` in `date_window`
 * ('required'). It is true only while a recorded Dayton decline is open:
 * negotiation.dayton_decline exists, event flag `dayton_declined_by` names the same
 * faction, no settlement exists, the game is not over, and
 * declined_turn < turn <= imposition_turn. A red date_window writes no proposal,
 * diagnostic or trace, so a campaign without a decline — every calibration run — is
 * unaffected by construction. The decline flag is written only by
 * dayton_negotiation.ts recordDaytonDecline (player-only paths).
 * ═══════════════════════════════════════════════════════════════
 *
 * Counterfactual by design: several objectives are painted RS at every checkpoint. They
 * are lawful only because these operations can never run on the calibrated line.
 * Prijedor town and Kozarac are military objectives (owner, 2026-11-07): canon refuses a
 * camp system and atrocity targeting (SENSITIVE_HISTORY_DESIGN_GATE §1, Ring 3 #1-#2), not
 * the capture of a town; the Prijedor camps closed in August 1992 (Ring 2 essays, ICTY
 * Tadić/Stakić/Kvočka/Sikirica) and BB1 p.383 names Prijedor the 5th Corps' objective.
 * Omarska and Kamičani are not authored (no BB military authority). Banja Luka and Kola
 * stay excluded (the US red line, BB1 p.392). Player text names towns only; any framing of
 * a capture as redress for 1992, or any score keyed to it, needs the §6 panel.
 *
 * MUST NOT: write control, force outcomes, or add atrocity / sensitive-history levers.
 */

import type { GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { AxisPredicate, OperationOpportunityDef } from './operation_opportunities.js';

/** Mirrors dayton_negotiation.ts DAYTON_DECLINED_BY_FLAG (kept local to avoid an import cycle). */
const DAYTON_DECLINED_BY_FLAG = 'dayton_declined_by';
const FAMILY = 'dayton_continuation';
const CITATION_BB = 'Balkan Battlegrounds I, KB pp.420-429, 462 (late-1995 western Bosnia and Ozren)';
const CITATION_DESIGN = 'docs/40_reports/20261107_DAYTON_CONTINUATION_OPERATIONS.md; round 2: docs/40_reports/20261107_DAYTON_CONTINUATION_OPERATIONS_R2.md';
const CITATION_SARAJEVO = 'Balkan Battlegrounds I, printed pp.309-316 (PDF pp.346-353; outside the KB page extraction) and endnotes 197-204, printed p.404 (KB dig. p.441)';

/** True only while a recorded Dayton decline is open (see file header). */
export function isDaytonContinuationWindowOpen(state: GameState, turn: number): boolean {
    const neg = state.military?.negotiation;
    const decline = neg?.dayton_decline;
    const by = state.military?.event_flags?.[DAYTON_DECLINED_BY_FLAG];
    return !!decline
        && typeof by === 'string'
        && by === decline.faction
        && !neg?.dayton_result
        && state.meta?.game_over !== true
        && turn > decline.declined_turn
        && turn <= decline.imposition_turn;
}

function declinedBy(state: GameState): string | null {
    const by = state.military?.event_flags?.[DAYTON_DECLINED_BY_FLAG];
    return typeof by === 'string' ? by : null;
}

const windowOpen: AxisPredicate = (state, turn) => isDaytonContinuationWindowOpen(state, turn)
    ? { green: true, reason: 'The settlement was refused; the war has reopened.' }
    : { green: false, reason: 'Only available while a refused settlement is not yet imposed.' };

/** HV units fight only when Zagreb is not the power imposing the settlement (owner ruling). */
const windowOpenNotHrhbDecline: AxisPredicate = (state, turn, def) => {
    const base = windowOpen(state, turn, def);
    if (!base.green) return base;
    return declinedBy(state) === 'HRHB'
        ? { green: false, reason: 'Zagreb is forcing the settlement on Mostar; the Croatian Army stands down.' }
        : base;
};
const windowOpenHrhbDecline: AxisPredicate = (state, turn, def) => {
    const base = windowOpen(state, turn, def);
    if (!base.green) return base;
    return declinedBy(state) === 'HRHB'
        ? base
        : { green: false, reason: 'Superseded by the joint HV-HVO push while Zagreb backs it.' };
};

const alwaysGreen: AxisPredicate = () => ({ green: true, reason: 'Not applicable.' });

/** Every axis staging cell is held by the operation's faction. */
const stagingHeld: AxisPredicate = (state, _turn, def) => {
    const cells = [def.staging_osid, ...def.axes.map((a) => a.staging_osid).filter((s): s is string => !!s)];
    const missing = cells.filter((o) => getPoliticalControllerOSID(state, o, undefined) !== def.faction);
    return missing.length === 0
        ? { green: true, reason: 'The staging areas are held.' }
        : { green: false, reason: 'A staging area has been lost.' };
};

/** At least one objective is still held by another party. */
const objectiveContested: AxisPredicate = (state, _turn, def) => {
    const open = def.axes.some((a) => a.objectives.some((o) => {
        const c = getPoliticalControllerOSID(state, o, undefined);
        return c !== null && c !== def.faction;
    }));
    return open
        ? { green: true, reason: 'Objectives remain in enemy hands.' }
        : { green: false, reason: 'Every objective is already held.' };
};

const PREREQS = {
    date_window: 'required',
    political_authorization: 'n_a',
    corps_readiness: 'n_a',
    logistics: 'n_a',
    staging_access: 'required',
    weather_season: 'n_a',
    commander_confidence: 'n_a',
    enemy_weakness: 'required',
    alliance_context: 'n_a',
    force_quality: 'n_a',
    min_optional_axes: 0,
} as const;

function evaluators(dateWindow: AxisPredicate): OperationOpportunityDef['evaluators'] {
    return {
        date_window: dateWindow,
        political_authorization: alwaysGreen,
        corps_readiness: alwaysGreen,
        logistics: alwaysGreen,
        staging_access: stagingHeld,
        weather_season: alwaysGreen,
        commander_confidence: alwaysGreen,
        enemy_weakness: objectiveContested,
        alliance_context: alwaysGreen,
        force_quality: alwaysGreen,
    };
}

// ─── C1. ARBiH 5th Corps: Sana continuation toward Prijedor, Kozarac and Bosanski Novi ──
// Takes over the live Operation Sana brigades (supersedes_live_operation). Oštra Luka first
// (Sana stalls there on objective sequencing), staged on the 506th's cell; Prijedor town is
// directly adjacent to Ljubija. Kozarac is reached through Marićka, adjacent to the same
// staging cell, so the two Prijedor axes share no objective. The 501st stays at Krasulje.
const SANA_CONTINUATION: OperationOpportunityDef = {
    opportunity_id: 'sana_continuation_95',
    name: 'Sana Continuation: Prijedor and Novi Grad',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: 'arbih_5th_corps',
    family: FAMILY,
    staging_osid: 'op:sanski_most:ilidza_2',
    planning_duration: 1,
    min_attack_outcome: 'repulsed',
    supersedes_live_operation: { corps_id: 'arbih_5th_corps', operation_name: 'Operation Sana' },
    axes: [
        {
            axis_id: 'ljubija',
            name: 'Ljubija and Prijedor',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_506th_mountain', 'arbih_517th_light', 'arbih_504th_cazin_light'],
            objectives: ['op:sanski_most:ostra_luka', 'op:prijedor:ljubija_2', 'op:prijedor:prijedor_2'],
            staging_osid: 'op:sanski_most:ilidza_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'kozarac',
            name: 'Kozarac',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_510th_bosnian_liberation', 'arbih_502nd_vitezka_mountain'],
            objectives: ['op:prijedor:maricka_2', 'op:prijedor:kozarac_2'],
            staging_osid: 'op:sanski_most:ilidza_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'novi_grad',
            name: 'Novi Grad',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_503rd_slavna_mountain', 'arbih_511th_slavna_mountain', 'arbih_505th_vitezka_mountain'],
            objectives: ['op:bosanski_novi:novi_grad_3', 'op:bosanski_novi:poljavnice', 'op:bosanski_novi:blagaj_japra'],
            staging_osid: 'op:bosanski_novi:matavazi_2',
            preserve_objective_sequence: true,
        },
    ],
    citations: [CITATION_BB + ' — OGs North and Center: Prijedor the eventual objective, Banja Luka the corps goal; 503rd/505th toward Ljubija and Prijedor (p.383); Dudaković fought on to 20 Oct (p.391)', CITATION_DESIGN],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};

// ─── C2. HV/HVO: Southern Move phase 2 toward the southern edge of Manjača ──────────
// Two mutually exclusive variants (owner ruling): HV Guards join only when Zagreb is not
// the power forcing the settlement; if HRHB itself declined, only HVO units push.
const MANJACA_OBJECTIVES_A = ['op:kljuc:cadjavica', 'op:banja_luka:pavici_2'];
const MANJACA_OBJECTIVES_B = ['op:banja_luka:rekavice_2'];
const SOUTHERN_MOVE_II: OperationOpportunityDef = {
    opportunity_id: 'southern_move_manjaca_95',
    name: 'Southern Move II: Manjača',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: 'hvo_tomislavgrad',
    family: FAMILY,
    staging_osid: 'op:mrkonjic_grad:mrkonjic_grad_2',
    planning_duration: 1,
    axes: [
        {
            axis_id: 'cadjavica_manjaca',
            name: 'Čađavica and Manjača',
            corps: 'hvo_tomislavgrad',
            brigades: ['hv_1st_guards_tigers', 'hrhb_kralj_petar_kreimir_iv_brigade'],
            objectives: MANJACA_OBJECTIVES_A,
            staging_osid: 'op:mrkonjic_grad:mrkonjic_grad_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'rekavice',
            name: 'Rekavice',
            corps: 'hvo_tomislavgrad',
            brigades: ['hrhb_kralj_tomislav_brigade', 'hvo_rama_brigade'],
            objectives: MANJACA_OBJECTIVES_B,
            staging_osid: 'op:mrkonjic_grad:baljvine_2',
        },
    ],
    citations: [CITATION_BB + ' — Southern Move phase 2: southern Manjača and Bočac; halt 25 km short of Banja Luka (pp.390-391); US red line on the city (p.392)', CITATION_DESIGN],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpenNotHrhbDecline),
    staff_recommendation: 'approve',
};
const SOUTHERN_MOVE_II_HVO_ONLY: OperationOpportunityDef = {
    ...SOUTHERN_MOVE_II,
    opportunity_id: 'southern_move_manjaca_hvo_95',
    name: 'Southern Move II: Manjača (HVO alone)',
    axes: [
        {
            axis_id: 'cadjavica_manjaca',
            name: 'Čađavica and Manjača',
            corps: 'hvo_tomislavgrad',
            brigades: ['hrhb_kralj_petar_kreimir_iv_brigade', 'hvo_rama_brigade'],
            objectives: MANJACA_OBJECTIVES_A,
            staging_osid: 'op:mrkonjic_grad:mrkonjic_grad_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'rekavice',
            name: 'Rekavice',
            corps: 'hvo_tomislavgrad',
            brigades: ['hrhb_kralj_tomislav_brigade'],
            objectives: MANJACA_OBJECTIVES_B,
            staging_osid: 'op:mrkonjic_grad:baljvine_2',
        },
    ],
    evaluators: evaluators(windowOpenHrhbDecline),
};

// ─── C3. VRS 1st Krajina: counterstroke ──────────────────────────────────────────────
// Axis A applies the documented October counter-punching pattern where the modelled VRS
// reserve stands (Kruščica); axis B is the sourced Ključ-Krasulje counterattack (BB1
// pp.389, 391). One operation, two axes: one op per corps.
const KRAJINA_COUNTERSTROKE: OperationOpportunityDef = {
    opportunity_id: 'krajina_counterstroke_95',
    name: 'Krajina Counterstroke',
    tier: 'T1',
    faction: 'RS',
    primary_corps: 'vrs_1st_krajina',
    family: FAMILY,
    staging_osid: 'op:jajce:kruscica',
    planning_duration: 1,
    axes: [
        {
            axis_id: 'jajce',
            name: 'Jajce',
            corps: 'vrs_1st_krajina',
            brigades: [
                'rs_1st_banja_luka_light_infantry', 'rs_2nd_banja_luka_light_infantry', 'rs_11th_mrkonji_light_infantry',
                'rs_31st_light_infantry', 'rs_5th_kozara_light_infantry', 'rs_6th_sanske_infantry',
            ],
            objectives: ['op:jajce:lupnica', 'op:jajce:jajce_3', 'op:jajce:barevo_2'],
            staging_osid: 'op:jajce:kruscica',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'kljuc_krasulje',
            name: 'Ključ and Krasulje',
            corps: 'vrs_1st_krajina',
            brigades: ['rs_2nd_krajina_infantry', 'rs_43rd_prijedor_motorized', 'rs_22nd_krajina_infantry'],
            objectives: ['op:kljuc:kljuc_2', 'op:kljuc:krasulje_2'],
            staging_osid: 'op:kljuc:donje_ratkovo_2',
            preserve_objective_sequence: true,
        },
    ],
    citations: [CITATION_BB + ' — VRS counteroffensive 24 Sep - 9 Oct: 5th Kozara and 6th Sanske toward Ključ, Krasulje 8-9 Oct (p.389). Axis A is a labelled counterfactual placement.', CITATION_DESIGN],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};

// ─── C4. ARBiH 3rd and 2nd Corps: Ozren continuation ────────────────────────────────
const OZREN_CONTINUATION: OperationOpportunityDef = {
    opportunity_id: 'uragan_continuation_95',
    name: 'Ozren Continuation',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: 'arbih_3rd_corps',
    family: FAMILY,
    staging_osid: 'op:maglaj:gornja_bocinja',
    planning_duration: 1,
    axes: [
        {
            axis_id: 'petrovo',
            name: 'Petrovo',
            corps: 'arbih_3rd_corps',
            brigades: ['arbih_351st_liberation', 'arbih_328th_mountain', 'arbih_7th_vitezka_muslim_liberation', 'arbih_327th_vitezka_mountain'],
            objectives: ['op:gracanica:petrovo_2', 'op:doboj:boljanic_2'],
            staging_osid: 'op:maglaj:gornja_bocinja',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'ozren_north',
            name: 'North Ozren',
            corps: 'arbih_2nd_corps',
            brigades: ['arbih_224th_mountain', 'arbih_221st_mountain'],
            objectives: ['op:doboj:zelinja_gornja_2', 'op:doboj:grapska_gornja_2'],
            staging_osid: 'op:doboj:brijesnica_velika',
            preserve_objective_sequence: true,
        },
    ],
    citations: [CITATION_BB + ' — last ARBiH Ozren drive 5-7 Oct, stopped by the ceasefire (p.388)', CITATION_DESIGN],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};

// ─── C5. ARBiH 1st Corps: Sarajevo breakout, renewed ────────────────────────────────
// The June 1995 plan's selected route (Visoko–Ilijaš–Vogošća, BB1 p.310): the largest effort
// from outside (Breza), a pincer from inside (Hotonj / Novi Grad), and the Hadžići attack
// that "fared better" (p.312). Ilidža, Nedžarići and Lukavica are deliberately not
// objectives: in the model each is a one-capture link, while historically they were the
// hardest points (Stup and Nedžarići "only limited gains", p.312). The June attempt failed
// with heavy losses (pp.313-316); a success here is a counterfactual of the hollow late VRS.
// No relieve-the-siege flag or score (sarajevo_lifeline.ts, Gate §3); Sarajevo stays
// ALWAYS_BESIEGED for supply (Engine Invariants §12.1).
const SARAJEVO_BREAKOUT: OperationOpportunityDef = {
    opportunity_id: 'sarajevo_breakout_95',
    name: 'Sarajevo Breakout: Ilijaš and Vogošća',
    tier: 'T1',
    faction: 'RBiH',
    primary_corps: 'arbih_1st_corps',
    family: FAMILY,
    staging_osid: 'op:breza:zupca_2',
    planning_duration: 1,
    axes: [
        {
            axis_id: 'ilijas',
            name: 'Ilijaš and Rečica',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_146th_light', 'arbih_164th_mountain', 'arbih_123rd_light', 'arbih_guards_brigade'],
            objectives: ['op:ilijas:podlugovi', 'op:novi_grad_sarajevo:recica'],
            staging_osid: 'op:breza:zupca_2',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'vogosca',
            name: 'Vogošća',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_1st_mountain', 'arbih_111th_vitezka_motorized', 'arbih_112th_vitezka_motorized'],
            objectives: ['op:vogosca:vogosca_3', 'op:vogosca:svrake'],
            staging_osid: 'op:vogosca:hotonj',
            preserve_objective_sequence: true,
        },
        {
            axis_id: 'hadzici',
            name: 'Hadžići',
            corps: 'arbih_1st_corps',
            brigades: ['arbih_104th_vitezka_motorized', 'arbih_109th_mountain', 'arbih_181st_mountain'],
            objectives: ['op:hadzici:misevici_2', 'op:ilidza:rakovica_2'],
            staging_osid: 'op:hadzici:binjezevo',
            preserve_objective_sequence: true,
        },
    ],
    citations: [
        CITATION_SARAJEVO + ' — break in from outside, largest effort outside (p.309); Visoko–Ilijaš–Vogošća the selected corridor (p.310); north route OG + 16th Division (p.311); Python cut, Hadžići gains, Stup/Nedžarići limited (p.312); stopped 17-22 June, a costly failure (pp.313-316; June reference outcome: failed)',
        CITATION_DESIGN,
    ],
    historical_exit_class: 'did_not_launch',
    prerequisites: PREREQS,
    evaluators: evaluators(windowOpen),
    staff_recommendation: 'approve',
};

export const DAYTON_CONTINUATION_OPPORTUNITIES: readonly OperationOpportunityDef[] = [
    SANA_CONTINUATION,
    SOUTHERN_MOVE_II,
    SOUTHERN_MOVE_II_HVO_ONLY,
    KRAJINA_COUNTERSTROKE,
    OZREN_CONTINUATION,
    SARAJEVO_BREAKOUT,
];
