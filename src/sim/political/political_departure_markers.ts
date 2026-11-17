/**
 * B5 political gate (2026-11-16): the war has left history POLITICALLY, per faction.
 *
 * The territory gate (historical_territory_band.ts) opens only when the map leaves history's
 * band. A player who diverges politically without moving the map (keeps the RBiH-HRHB alliance,
 * rejects a plan the record shows accepted) would otherwise face bots replaying a history the
 * player has made impossible. These markers open the divergence gate for the bot factions whose
 * history a departure rules out (game-designer + historian panel, 2026-11-16).
 *
 * - CHOICE markers: the PLAYER's own pick of a listed departure response, read from
 *   `military.event_decision_log` rows with decision_source 'player' (headless and Observer runs
 *   write none). A pick that merely differs from the default does not count: only the listed
 *   responses are "this history is now impossible" markers.
 * - STATE marker: the 1993 Croat-Bosniak war has not begun by its last possible turn.
 *
 * Recomputed at every decision from append-only logs: no state, no migration. Left alone (no
 * player rows; the 1993 war fires at t49 in hands-off runs) every marker stays closed.
 *
 * §6 carve-out: the political opening never applies to §6-sensitive decisions
 * (POLITICAL_GATE_EXCLUDED_EVENT_IDS); only the §6-approved territory gate can move them.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { isCampExposureFamily, isRing3SensitiveFamily } from '../events/event_families.js';

export interface PoliticalDepartureMarker {
    /** Event whose player response is read. */
    event_id: string;
    /** Faction that answers it (the player's faction when the row is a player row). */
    responder: FactionId;
    /** Responses that make the record impossible (not every non-default response). */
    departure_response_ids: readonly string[];
    /** Bot factions whose history the departure rules out. */
    opens: readonly FactionId[];
    /** Historian's basis. */
    basis: string;
}

export const POLITICAL_DEPARTURE_MARKERS: readonly PoliticalDepartureMarker[] = [
    {
        event_id: 'vance_owen_plan_1993', responder: 'RBiH', departure_response_ids: ['reject'], opens: ['HRHB', 'RS'],
        basis: 'Sarajevo signed Vance-Owen; RS was the holdout (BB1 p.44; terms BB1 p.218).',
    },
    {
        event_id: 'hrhb_vance_owen_acceptance_1993', responder: 'HRHB', departure_response_ids: ['reject_plan'], opens: ['RBiH', 'RS'],
        basis: 'The HVO 1993 provincial claims rested on the plan (ICTY Prlić IT-04-74-T).',
    },
    {
        event_id: 'rs_assembly_rejects_voplan_1993', responder: 'RS', departure_response_ids: ['override_assembly'], opens: ['RBiH', 'HRHB'],
        basis: 'Pale Assembly rejected Vance-Owen 51-2 on 6 May 1993 (BB1 p.44).',
    },
    {
        event_id: 'os_rbih_tactical_acceptance_1993', responder: 'RBiH', departure_response_ids: ['accept_for_optics'], opens: ['RS', 'HRHB'],
        basis: 'The RBiH Assembly rejected Owen-Stoltenberg; Sarajevo negotiated only from abandonment (BB1 p.219).',
    },
    {
        event_id: 'rs_contact_group_response_1994', responder: 'RS', departure_response_ids: ['accept_51_49_plan'], opens: ['RBiH', 'HRHB'],
        basis: 'RS rejected the Contact Group plan twice (BB1 p.59).',
    },
    // §6 E3a2: contact_group_plan_1994 is a no-choice presentation card; Sarajevo's answer
    // (and its departure) is rbih_contact_group_response_1994 below.
    {
        event_id: 'rbih_contact_group_response_1994', responder: 'RBiH', departure_response_ids: ['reject_51_49_plan'], opens: ['RS', 'HRHB'],
        basis: 'Sarajevo accepted the Contact Group plan (BB1 p.59).',
    },
    {
        event_id: 'hrhb_contact_group_response_1994', responder: 'HRHB', departure_response_ids: ['reject_51_49_plan'], opens: ['RBiH', 'RS'],
        basis: 'The Federation partners accepted the Contact Group plan (BB1 p.59).',
    },
    {
        event_id: 'hrhb_federation_overture_1993', responder: 'HRHB', departure_response_ids: ['reject_federation_path'], opens: ['RBiH', 'RS'],
        basis: 'The Federation was "essentially imposed from outside" and HRHB took it (BB2 p.470).',
    },
] as const;

/** STATE marker: the 1993 Croat-Bosniak war. Its window closes at turn 80 (war_1993.json). */
export const CROAT_BOSNIAK_WAR_EVENT_ID = 'croat_bosniak_war_begins_1993';
export const CROAT_BOSNIAK_WAR_LAST_TURN = 80;
const CROAT_BOSNIAK_WAR_OPENS: readonly FactionId[] = ['RBiH', 'HRHB'];

/**
 * §6 carve-out: decisions the political opening never applies to (game-designer + historian,
 * 2026-11-16; ratified by the §6 seats, unanimous, after two rounds on PR #735). Camp-exposure
 * family rows, HVO detention-camp rows and every Ring-3 sensitive family are excluded as well.
 */
export const POLITICAL_GATE_EXCLUDED_EVENT_IDS: ReadonlySet<string> = new Set([
    'rs_paramilitary_policy_1992',
    'rbih_paramilitary_policy_1992',
    'concentration_camps_revealed_1992',
    'rbih_minority_retention_1992',
    'srebrenica_demilitarization_1993',
    'hrhb_camp_exposure_response_1993',
    'drina_cleansing_decision_1992',
    // §6 seats on #735 (2026-11-16): adjudicated crimes in the same class.
    'un_hostage_crisis_1995', // UN peacekeepers as human shields (Karadžić IT-95-5/18-T; Mladić IT-09-92-T)
    'deliberate_force_rs_compliance_1995', // the Sarajevo siege guns (Galić IT-98-29)
    'rbih_nato_ultimatum_compliance_1994', // the Sarajevo heavy-weapons exclusion zone
    'rs_strategic_goals', // Strategic Goal 1, the separation of peoples (not reachable in time; safeguard)
]);

/**
 * Events reviewed by the §6 seats as reachable by the gate and flagged sensitive by the §4
 * classifier (`isSensitiveDecisionEvent`), whose options depict no atrocity, so the political
 * opening may apply. A completeness test requires every flagged event to be carved out or here.
 */
export const POLITICAL_GATE_REVIEWED_ALLOWED_EVENT_IDS: ReadonlySet<string> = new Set([
    // Peace-plan and negotiation answers: options are accept/reject; the sensitive words are context.
    'london_conference_1992', // accept_principles / reject
    'owen_stoltenberg_plan_1993', // accept / reject ("enclave" in context)
    'os_rbih_tactical_acceptance_1993', // reject_via_assembly / accept_for_optics
    'rbih_contact_group_response_1994', // accept / reject / accept with reservations
    'dayton_talks_begin_1995', // accept / hardline
    'rs_dayton_acceptance_1995', // accept / hardline
    'rbih_washington_agreement_1994', // accept / reluctant
    // Political or posture decisions whose options depict no atrocity.
    'abdic_apwb_declared_1993', // suppress / tolerate / federation offer / autonomy for Bihać APWB
    'strategic_posture_review_hrhb', // press objectives / coordinate / consolidate / sue for peace
    'rbih_late_war_offensive_1995', // offensives / consolidation / wait / accept partition
]);

/** True when the political opening may apply to this event (it is not §6-carved-out). */
export function isPoliticalGateEligible(eventId: string, family?: string): boolean {
    if (POLITICAL_GATE_EXCLUDED_EVENT_IDS.has(eventId)) return false;
    if (eventId.startsWith('hvo_detention_camps_')) return false;
    if (isCampExposureFamily(family)) return false;
    if (isRing3SensitiveFamily(family) || isRing3SensitiveFamily(eventId)) return false;
    return true;
}

/** True when a political departure has ruled out `faction`'s history. */
export function isPoliticsOffHistoryFor(state: GameState, faction: FactionId): boolean {
    const turn = state.meta?.turn ?? 0;
    // The engine's own record of the war (rbih_hrhb_state.war_started_turn), not the event
    // receipt: a war that starts by another route still counts (engine seat, #735).
    if (
        CROAT_BOSNIAK_WAR_OPENS.includes(faction)
        && turn > CROAT_BOSNIAK_WAR_LAST_TURN
        && state.political?.rbih_hrhb_state?.war_started_turn == null
    ) {
        return true;
    }

    const log = state.military?.event_decision_log ?? [];
    // Last player row per event (a log is append-only; a later row supersedes an earlier one).
    const lastPlayerPick = new Map<string, { faction: string | null | undefined; response_id: string }>();
    for (const row of log) {
        if (row.decision_source !== 'player') continue;
        lastPlayerPick.set(row.event_id, { faction: row.faction, response_id: row.response_id });
    }
    for (const marker of POLITICAL_DEPARTURE_MARKERS) {
        if (!marker.opens.includes(faction)) continue;
        const pick = lastPlayerPick.get(marker.event_id);
        if (!pick || pick.faction !== marker.responder) continue;
        if (marker.departure_response_ids.includes(pick.response_id)) return true;
    }
    return false;
}
