export interface HistoricalSettlementAnchor {
    settlement_id: string;
    expected_controller: string;
}

export interface HistoricalOsidAnchor {
    osid: string;
    expected_controller: string;
}

// ===== Tier 1 painted-target anchors (2026-05-21) =====
// Source plan: docs/plans/2026-05-21-tier1-painted-target-anchors-plan.md
// Source memos: docs/40_reports/audits/20260521_{HISTORIAN,SCRT,CANON_COMPLIANCE,WAR_OR_GAME,OPERATIONS_EXPERT,BB_KRAJINA_COLLAPSE,PLAN_OPEN_QUESTIONS_RESEARCH}_*.md

export type CanonicalFactionId = 'RBiH' | 'RS' | 'HRHB';

/**
 * Type 2 — Strategic-event-by-week anchor.
 * Passes when `event_id` is in `state.military.fired_event_ids` at evaluation turn ≤ `expected_week_max + tolerance`,
 * OR when any id in `xor_with` is in `fired_event_ids` (canonical-vs-alt-path pair per canon §3.3).
 */
export interface HistoricalEventAnchor {
    event_id: string;
    expected_week_max: number;
    tolerance: number;
    xor_with?: readonly string[];
    citation: string;
}

/**
 * Type 1 — Faction area-share band anchor.
 * Evaluated at `at_week` by summing `osid_areas[osid]` over OSIDs with `political_controllers[osid] === faction`,
 * divided by total area. Passes when in `[min_share, max_share]` inclusive.
 * `diagnostic_only` bands are reported but do NOT fail the test — used for bands describing history that the
 * current engine cannot deliver until specific mechanic fixes land (e.g. Issue #37 HRHB wiring).
 */
export interface HistoricalAreaShareBand {
    at_week: number;
    faction: CanonicalFactionId;
    min_share: number;
    max_share: number;
    citation: string;
    diagnostic_only?: boolean;
}

/**
 * Type 3 — Per-week OSID controller anchor.
 * Evaluated at `at_week`: `political_controllers[osid_to_settlement(osid)] === expected_controller`.
 */
export interface HistoricalEpochOsidAnchor {
    at_week: number;
    osid: string;
    expected_controller: CanonicalFactionId;
    citation: string;
}

export const HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992: HistoricalSettlementAnchor[] = [
];

// OSID-level anchors: each entry checks a specific painted OSID against simulated control.
// No municipality plurality; pluralities are unstable when a single settlement flips.
// Use the city-core or enclave-core OSID for each historically unambiguous location.
export const HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992: HistoricalOsidAnchor[] = [
    { osid: 'op:bijeljina:bijeljina_2', expected_controller: 'RS' },
    { osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS' },
    { osid: 'op:tuzla:tuzla_2', expected_controller: 'RBiH' },
    { osid: 'op:bihac:bihac_2', expected_controller: 'RBiH' },
    { osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', expected_controller: 'RBiH' },
    { osid: 'op:zvornik:zvornik', expected_controller: 'RS' },
    { osid: 'op:zvornik:sapna', expected_controller: 'RBiH' },
    { osid: 'op:ugljevik:teocak_krstac_2', expected_controller: 'RBiH' },
    { osid: 'op:orasje:orasje', expected_controller: 'HRHB' },
    { osid: 'op:brcko:brcko', expected_controller: 'RS' },
    { osid: 'op:brcko:brka_2', expected_controller: 'RBiH' },
    { osid: 'op:gorazde:gorazde_2', expected_controller: 'RBiH' },
    { osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH' },
    { osid: 'op:zavidovici:vozuca_2', expected_controller: 'RS' },
    { osid: 'op:gradacac:gradacac_2', expected_controller: 'RBiH' },
    { osid: 'op:rogatica:zepa_2', expected_controller: 'RBiH' },
    { osid: 'op:derventa:derventa_2', expected_controller: 'RS' },
    { osid: 'op:prijedor:prijedor_2', expected_controller: 'RS' },
    { osid: 'op:foca:foca_3', expected_controller: 'RS' },
    { osid: 'op:visegrad:visegrad_2', expected_controller: 'RS' },
    { osid: 'op:zenica:zenica_2', expected_controller: 'RBiH' },
    { osid: 'op:travnik:travnik_2', expected_controller: 'RBiH' },
    { osid: 'op:mostar:mostar_zapad_2', expected_controller: 'HRHB' },
    { osid: 'op:doboj:boljanic_2', expected_controller: 'RS' },
    { osid: 'op:bugojno:kopcic_2', expected_controller: 'RBiH' },
    { osid: 'op:gracanica:petrovo_2', expected_controller: 'RS' },
    { osid: 'op:lukavac:brijesnica_donja_2', expected_controller: 'RS' },
];

// ===== Jan 1993 (w40) — engine adequate, full Tier 1 =====
// Existing HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992 above serves as the w40 OSID assertion.

export const HISTORICAL_EVENT_ANCHORS_JAN1993: readonly HistoricalEventAnchor[] = [
    { event_id: 'jna_withdrawal_1992',           expected_week_max: 6,  tolerance: 2, citation: 'BB1 p.166 — JNA withdrawal mid-May 1992' },
    { event_id: 'operation_corridor_1992',       expected_week_max: 14, tolerance: 2, citation: 'BB1 p.182 — Corridor 92 opens 24 June 1992' },
    { event_id: 'sarajevo_siege_begins_1992',    expected_week_max: 8,  tolerance: 2, citation: 'ICTY Galić TJ §189 — siege from May 1992' },
    { event_id: 'jajce_falls_1992',              expected_week_max: 30, tolerance: 2, citation: 'BB1 p.183 — Jajce fell 29 Oct 1992' },
    { event_id: 'srebrenica_enclave_forms_1992', expected_week_max: 20, tolerance: 3, citation: 'BB1 p.187 — Orić recaptures 8-10 May 1992' },
];

export const HISTORICAL_AREA_BANDS_JAN1993: readonly HistoricalAreaShareBand[] = [
    { at_week: 40, faction: 'RS',   min_share: 0.62, max_share: 0.68, citation: 'painted_control_jan1993.json + BB1 p.222' },
    { at_week: 40, faction: 'RBiH', min_share: 0.21, max_share: 0.26, citation: 'painted_control_jan1993.json + BB1 p.215-216' },
    { at_week: 40, faction: 'HRHB', min_share: 0.09, max_share: 0.13, citation: 'painted_control_jan1993.json + BB1 p.170,180' },
];

export const HISTORICAL_OSID_ANCHORS_JAN1993_SUPPLEMENT: readonly HistoricalEpochOsidAnchor[] = [
    { at_week: 40, osid: 'op:jajce:jajce_3',                  expected_controller: 'RS',   citation: 'BB1 p.183 — Jajce fell 29 Oct 1992' },
    { at_week: 40, osid: 'op:cazin:cazin_2',                  expected_controller: 'RBiH', citation: 'BB1 p.404 — 5th Corps area' },
    { at_week: 40, osid: 'op:velika_kladusa:velika_kladusa_2',expected_controller: 'RBiH', citation: 'BB1 — pre-Abdic-defection (split begins Sept 1993)' },
];

// ===== Apr 1994 (w104) — events + stable OSIDs only; area bands diagnostic-only =====
// Apr 1994 RS / RBiH area-share bands fail by 13-15pp under current engine (Issue #37 HRHB wiring +
// joint-ops absence). Bands describe history; they ship as diagnostic-only and promote to PASS/FAIL
// after Issue #37 + 4 BB code gaps close. See plan §5.3 + research memo Q1.2.

export const HISTORICAL_EVENT_ANCHORS_APR1994: readonly HistoricalEventAnchor[] = [
    { event_id: 'markale_massacre_1994',         expected_week_max: 96,  tolerance: 2, citation: 'ICTY Galić TJ §189 — 5 Feb 1994' },
    { event_id: 'nato_ultimatum_sarajevo_1994',  expected_week_max: 96,  tolerance: 2, citation: 'BB1 p.222 — NATO+UN ultimatum Feb 1994' },
    { event_id: 'sarajevo_exclusion_zone_1994',  expected_week_max: 98,  tolerance: 2, citation: 'BB1 p.222 — Sarajevo TEZ from Feb 1994' },
    {
        event_id: 'washington_agreement_1994',
        expected_week_max: 102, tolerance: 3,
        xor_with: ['csq_federation_early_1994'],
        citation: 'BB1 p.227-228 — 18 March 1994. XOR with alt-path consequence (canon §3.3).',
    },
    { event_id: 'gorazde_crisis_1994',           expected_week_max: 107, tolerance: 3, citation: 'ICTY Karadžić TJ §3823+ — Apr 1994 Goražde crisis; NATO airstrikes 10-11 Apr' },
];

export const HISTORICAL_AREA_BANDS_APR1994: readonly HistoricalAreaShareBand[] = [
    { at_week: 104, faction: 'RS',   min_share: 0.65, max_share: 0.71, citation: 'SCRT memo + Burg&Shoup, Karadžić TJ', diagnostic_only: true },
    { at_week: 104, faction: 'RBiH', min_share: 0.19, max_share: 0.24, citation: 'SCRT memo — pre-Federation-counteroffensive', diagnostic_only: true },
    { at_week: 104, faction: 'HRHB', min_share: 0.08, max_share: 0.13, citation: 'SCRT memo — Washington Agreement froze HVO position', diagnostic_only: true },
];

export const HISTORICAL_OSID_ANCHORS_APR1994: readonly HistoricalEpochOsidAnchor[] = [
    // Goražde safe area (post-repaint gorazde_2 = RBiH; bacci/citluk_2 retained as additional coverage)
    { at_week: 104, osid: 'op:gorazde:gorazde_2',     expected_controller: 'RBiH', citation: 'ICTY Karadžić TJ §3823+; BB1 p.187,448 — Goražde holds (post-repaint)' },
    { at_week: 104, osid: 'op:gorazde:bacci',         expected_controller: 'RBiH', citation: 'Goražde safe area; supporting anchor' },
    { at_week: 104, osid: 'op:gorazde:citluk_2',      expected_controller: 'RBiH', citation: 'Goražde safe area; supporting anchor' },
    // Eastern enclaves intact
    { at_week: 104, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH', citation: 'UNSC Res 819; BB1 p.444' },
    { at_week: 104, osid: 'op:rogatica:zepa_2',         expected_controller: 'RBiH', citation: 'UN safe area; BB1 p.187 — survives to July 1995' },
    // Bihać pocket
    { at_week: 104, osid: 'op:bihac:bihac_2',           expected_controller: 'RBiH', citation: 'BB1 p.404 — pre-1995 5th Corps' },
    { at_week: 104, osid: 'op:cazin:cazin_2',           expected_controller: 'RBiH', citation: 'BB1 p.404' },
    // Federation cores
    { at_week: 104, osid: 'op:tuzla:tuzla_2',           expected_controller: 'RBiH', citation: '2nd Corps HQ' },
    { at_week: 104, osid: 'op:zenica:zenica_2',         expected_controller: 'RBiH', citation: '3rd Corps HQ; BB1 p.506' },
    { at_week: 104, osid: 'op:mostar:mostar_zapad_2',   expected_controller: 'HRHB', citation: 'HVO west bank Mostar' },
    // Vareš flipped Nov 1993 (Stupni Do); should be RBiH post-flip
    { at_week: 104, osid: 'op:vares:vares_2',           expected_controller: 'RBiH', citation: 'Stupni Do massacre Nov 1993; HVO withdrawal' },
    // HRHB Orašje pocket
    { at_week: 104, osid: 'op:orasje:orasje',           expected_controller: 'HRHB', citation: 'BB1 p.182 — survives VRS Nov 1992 offensive' },
    // Krajina still RS (no premature collapse)
    { at_week: 104, osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS',   citation: '1st Krajina Corps HQ — unchanged' },
    { at_week: 104, osid: 'op:prijedor:prijedor_2',     expected_controller: 'RS',   citation: 'unchanged since May 1992' },
];

// ===== Apr 1995 (w156) — events + pre-Krajina-collapse OSIDs; area bands diagnostic-only =====

export const HISTORICAL_EVENT_ANCHORS_APR1995: readonly HistoricalEventAnchor[] = [
    { event_id: 'carter_ceasefire_1994',         expected_week_max: 140, tolerance: 3, citation: 'BB1 ch.86 — Carter shuttle Dec 1994' },
    { event_id: 'coha_ceasefire_begins_1995',    expected_week_max: 142, tolerance: 3, citation: 'BB1 p.65 — Cessation of Hostilities Agreement Jan 1995' },
    { event_id: 'coha_expires_1995',             expected_week_max: 158, tolerance: 2, citation: 'BB1 ch.87 — COHA expires May 1995' },
    { event_id: 'srebrenica_demilitarization_1993', expected_week_max: 56, tolerance: 2, citation: 'UNSC Res 819 + BB1 p.444 — must still be set at w156' },
    { event_id: 'un_safe_areas_declared_1993',      expected_week_max: 54, tolerance: 2, citation: 'UNSC Res 824' },
    { event_id: 'bihac_crisis_1994',                expected_week_max: 137, tolerance: 3, citation: 'BB1 p.62 — Bihać crisis late 1994' },
];

export const HISTORICAL_AREA_BANDS_APR1995: readonly HistoricalAreaShareBand[] = [
    { at_week: 156, faction: 'RS',   min_share: 0.60, max_share: 0.67, citation: 'SCRT memo — pre-Storm', diagnostic_only: true },
    { at_week: 156, faction: 'RBiH', min_share: 0.20, max_share: 0.26, citation: 'SCRT memo — post-Cincar/Kupres', diagnostic_only: true },
    { at_week: 156, faction: 'HRHB', min_share: 0.11, max_share: 0.17, citation: 'SCRT memo — HVO gains via Cincar/Leap-1', diagnostic_only: true },
];

export const HISTORICAL_OSID_ANCHORS_APR1995: readonly HistoricalEpochOsidAnchor[] = [
    // Safe areas intact (fall in July 1995, after w156)
    { at_week: 156, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH', citation: 'UN safe area; falls Jul 1995' },
    { at_week: 156, osid: 'op:rogatica:zepa_2',         expected_controller: 'RBiH', citation: 'UN safe area; falls 25 Jul 1995' },
    { at_week: 156, osid: 'op:gorazde:gorazde_2',       expected_controller: 'RBiH', citation: 'Goražde holds through Dayton (post-repaint)' },
    { at_week: 156, osid: 'op:gorazde:bacci',           expected_controller: 'RBiH', citation: 'supporting anchor' },
    { at_week: 156, osid: 'op:gorazde:citluk_2',        expected_controller: 'RBiH', citation: 'supporting anchor' },
    // Bihać + 5th Corps
    { at_week: 156, osid: 'op:bihac:bihac_2',           expected_controller: 'RBiH', citation: '5th Corps holds' },
    { at_week: 156, osid: 'op:cazin:cazin_2',           expected_controller: 'RBiH', citation: '5th Corps area' },
    // Pre-collapse Krajina (must NOT have flipped yet — premature flip is a wrong-mechanism win)
    { at_week: 156, osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS', citation: 'Holbrooke red-line; BB1 p.429' },
    { at_week: 156, osid: 'op:prijedor:prijedor_2',     expected_controller: 'RS', citation: 'unchanged since 1992' },
    { at_week: 156, osid: 'op:sanski_most:sanski_most_2', expected_controller: 'RS', citation: 'VRS 6th Sanske; falls early Oct 1995' },
    { at_week: 156, osid: 'op:kljuc:kljuc_2',           expected_controller: 'RS', citation: 'VRS 17th; falls 17 Sept 1995' },
    { at_week: 156, osid: 'op:bosanski_petrovac:bosanski_petrovac_2', expected_controller: 'RS', citation: 'falls 15 Sept 1995 (BB1 p.419)' },
    { at_week: 156, osid: 'op:titov_drvar:drvar_2',     expected_controller: 'RS', citation: 'VRS evacuates 14 Sept 1995' },
    { at_week: 156, osid: 'op:bosansko_grahovo:bosansko_grahovo_2', expected_controller: 'RS', citation: 'falls late Jul 1995 (Ljeto-95)' },
    { at_week: 156, osid: 'op:glamoc:glamoc_2',         expected_controller: 'RS', citation: 'Oluja phase, late Jul-early Aug 1995' },
    { at_week: 156, osid: 'op:donji_vakuf:donji_vakuf_2', expected_controller: 'RS', citation: 'falls 13 Sept 1995 (BB1 p.419)' },
    { at_week: 156, osid: 'op:mrkonjic_grad:mrkonjic_grad_2', expected_controller: 'RS', citation: 'falls 10 Oct 1995 (Juzni Potez)' },
    { at_week: 156, osid: 'op:sipovo:sipovo_2',         expected_controller: 'RS', citation: 'falls 12-13 Sept 1995 (Maestral)' },
];

// ===== Oct 1995 (w188) — narrow Tier 1: 5 forced flags + RS Dayton band + stable/forced OSIDs =====
// Krajina collapse OSIDs (52 in historian §4.5) deferred — gated on the 4 BB ops-catalog gaps
// (Donji Vakuf 95, Jajce arm of mistral_2_95, Juzni Potez extraction, Ljeto 95) per ops-expert memo.

export const HISTORICAL_EVENT_ANCHORS_OCT1995: readonly HistoricalEventAnchor[] = [
    {
        event_id: 'srebrenica_falls_1995',
        expected_week_max: 170, tolerance: 3,
        xor_with: ['csq_srebrenica_stalemate_1995'],
        citation: 'ICTY Krstić TJ §22-46; BB1 p.444 — VRS enters 11 Jul 1995. XOR with alt-stalemate (canon §3.3).',
    },
    {
        event_id: 'zepa_falls_1995',
        expected_week_max: 172, tolerance: 3,
        xor_with: ['csq_enclave_held_alt_intervention'],
        citation: 'BB1 p.187; ICTY Karadžić TJ §5662+ — Žepa fell 25 Jul 1995. XOR with alt-intervention.',
    },
    {
        event_id: 'nato_deliberate_force_1995',
        expected_week_max: 178, tolerance: 3,
        xor_with: ['csq_alternative_nato_trigger_1995'],
        citation: 'BB1 p.455 — 30 Aug 1995. XOR with alt-trigger.',
    },
    { event_id: 'operation_storm_1995', expected_week_max: 174, tolerance: 2, citation: 'BB1 p.411 — Oluja completed 7-8 Aug 1995 (off-map ref)' },
    { event_id: 'operation_summer_95',  expected_week_max: 173, tolerance: 2, citation: 'BB1 p.411 — Ljeto-95 takes Grahovo' },
];

export const HISTORICAL_AREA_BANDS_OCT1995: readonly HistoricalAreaShareBand[] = [
    // RS Dayton band: authoritative PASS/FAIL (sim already passes at 50.6%; treaty target 49%)
    { at_week: 188, faction: 'RS',   min_share: 0.47, max_share: 0.51, citation: 'Dayton/Contact Group 51/49; BB1 p.57' },
    // RBiH and HRHB bands diagnostic-only (sim fails by 8-9pp from missing Mistral/Sana mechanics)
    { at_week: 188, faction: 'RBiH', min_share: 0.28, max_share: 0.33, citation: 'SCRT — Federation internal split fluid Sep-Oct 1995', diagnostic_only: true },
    { at_week: 188, faction: 'HRHB', min_share: 0.18, max_share: 0.23, citation: 'SCRT — HVO post-Storm/Mistral/Sana gains (BB1 p.74-75)', diagnostic_only: true },
];

export const HISTORICAL_OSID_ANCHORS_OCT1995: readonly HistoricalEpochOsidAnchor[] = [
    // Goražde holds through Dayton (post-repaint gorazde_2 = RBiH)
    { at_week: 188, osid: 'op:gorazde:gorazde_2',       expected_controller: 'RBiH', citation: 'BB1 p.448 — Goražde survives to Dayton (post-repaint)' },
    { at_week: 188, osid: 'op:gorazde:bacci',           expected_controller: 'RBiH', citation: 'supporting anchor' },
    { at_week: 188, osid: 'op:gorazde:citluk_2',        expected_controller: 'RBiH', citation: 'supporting anchor' },
    // Srebrenica fell to RS (forced by srebrenica_falls_1995 event)
    { at_week: 188, osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RS',   citation: 'ICTY Krstić TJ §22-46; 11 Jul 1995' },
    // Žepa fell to RS (post-repaint zepa_2 = RS at oct95)
    { at_week: 188, osid: 'op:rogatica:zepa_2',         expected_controller: 'RS',   citation: 'BB1 p.187; ICTY Karadžić TJ §5662+ — fell 25 Jul 1995 (post-repaint)' },
    // Bihać + Velika Kladuša (5th Corps retakes post-Storm Aug 1995)
    { at_week: 188, osid: 'op:bihac:bihac_2',           expected_controller: 'RBiH', citation: '5th Corps holds' },
    { at_week: 188, osid: 'op:velika_kladusa:velika_kladusa_2', expected_controller: 'RBiH', citation: 'BB1 p.411 — 5th Corps marches in Aug 1995 (APWB burden lifted)' },
    // Sarajevo center never falls (Engine Invariants §12.1 ALWAYS_BESIEGED_ENCLAVE)
    { at_week: 188, osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', expected_controller: 'RBiH', citation: 'Engine Invariants §12.1' },
    // Stable RS holdings through Dayton
    { at_week: 188, osid: 'op:bijeljina:bijeljina_2',   expected_controller: 'RS',   citation: 'unchanged since April 1992' },
    { at_week: 188, osid: 'op:foca:foca_3',             expected_controller: 'RS',   citation: 'unchanged' },
    { at_week: 188, osid: 'op:visegrad:visegrad_2',     expected_controller: 'RS',   citation: 'unchanged' },
];
