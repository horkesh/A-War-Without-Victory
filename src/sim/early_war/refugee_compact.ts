/**
 * A2b (B5, 2026-11-17): the HRHB refugee compact — a played cooperative HRHB President's lever on
 * the RBiH-HRHB alliance drift. Panel: game designer + historian, both GO-with-amendments; integrated
 * ruling `a2b_refugee_term_integrated.md` (orchestrator-approved).
 *
 * Driver probe (2026-11-16): after the pre-war floor lapses, a cooperative HRHB's alliance falls
 * ~0.025/week with no incidents — refugee pressure ~0.016 (the largest term), patron drag ~0.012 —
 * so no HRHB choice changed the outcome. Historian: refugees intensified the 1993 war, they did not
 * cause it. Sources are ICTY trial judgments, judgment names only (paragraph ranges not yet
 * verified; the copy panel pulls them): Blaškić TJ (IT-95-14-T), Kordić and Čerkez TJ (IT-95-14/2-T),
 * Hadžihasanović and Kubura TJ (IT-01-47-T, on displaced men filling ARBiH formations around Travnik
 * and Zenica), Prlić et al. TJ (IT-04-74-T). The earlier Balkan Battlegrounds Vol. I p.179 and p.189
 * cites did not support the claim (they cover the Patriotic League and Sarajevo) and are dropped.
 * A joint refugee administration under a settled state question can damp that friction; it cannot
 * remove the territorial contest.
 *
 * Derived entirely from `event_decision_log` (no new array; the precedent is Path A' in
 * washington_agreement.ts), so a run whose HRHB never makes a granting choice — every bot run —
 * reads exactly 1.0 everywhere and stays byte-identical.
 *
 * - GRANT: each of `hrhb_political_goal = united_front` and `hrhb_1992_graz_cooperation_collapse =
 *   formal_alliance_persists` opens one compact entry for REFUGEE_COMPACT_GRANT_TURNS.
 * - RENEW: a renewal answer extends every ACTIVE entry to at least turn + its duration. It never
 *   opens an entry (the federation-overture renewal is also the historical default, so a bot must not
 *   start a compact through it).
 * - LAPSE: a lapse answer ends every entry for good (later renewals find nothing active). The VOPP
 *   lapse is `resist_patron`; `acknowledge_pressure` (historical, neutral) neither renews nor lapses.
 * - PLAYER ONLY: only answers with `decision_source: 'player'` count; a bot's answer never opens,
 *   renews or lapses a compact (A2b follow-up, 2026-11-17).
 * - END: the compact ends at the Washington signing (`washington_signed`, `washington_turn`): the
 *   Federation locks the alliance, so nothing is left to damp and no price is left to pay.
 * - SUSPEND: a bilateral flip while an entry is active suspends the damping for
 *   REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS (`rbih_hrhb_state.refugee_compact_suspended_until`, written
 *   only while a compact is active; alliance_update.ts).
 *
 * Effects while active: refugee pressure × REFUGEE_COMPACT_MULTIPLIER per entry (unless suspended);
 * the price, HRHB recruitment × REFUGEE_COMPACT_RECRUITMENT_PRICE per entry, is paid whether or not
 * the damping is suspended. Patron drag × PATRON_DRAG_STANCE_MULTIPLIER per active entry, so Zagreb's
 * pull on the alliance is held back only while the compact stands (A2b PR-B amendment: it used to be
 * permanent per 1992 choice). `granting_choices` stays in the status as a count of the 1992 stance for
 * the record. patron_confidence costs are authored on the two grant options (war_1992.json).
 *
 * Binding copy rule (historian): no player-facing text may say or imply that refugees caused the
 * 1993 war.
 */

import type { FactionId, GameState } from '../../state/game_state.js';

/**
 * The slice of state the compact reads: the decision log and three bilateral fields. A GameState
 * satisfies it; the renderer builds it from the player-visible projection without a type escape.
 */
export interface RefugeeCompactInput {
    military?: {
        event_decision_log?: ReadonlyArray<{
            event_id: string;
            response_id: string;
            faction?: string | null;
            turn: number;
            decision_source?: string;
        }>;
    } | null;
    political?: {
        rbih_hrhb_state?: {
            washington_signed?: boolean;
            washington_turn?: number | null;
            refugee_compact_suspended_until?: number | null;
        } | null;
    } | null;
}

/** Refugee-pressure multiplier per active compact entry (historian amendment (d): 0.6, so friction remains). */
export const REFUGEE_COMPACT_MULTIPLIER = 0.6;
/**
 * Turns a 1992 grant lasts before it must be renewed: long enough to reach the first renewal window
 * (H6, t52-55) even when the political goal is answered ahead of firing at t0 (probe A, 2026-11-17:
 * at 52 the t0 entry expired on the renewal turn itself and the paying President still went to war).
 */
export const REFUGEE_COMPACT_GRANT_TURNS = 56;
/** Weeks the damping is suspended after a bilateral RBiH-HRHB flip (historian amendment (a)). */
export const REFUGEE_COMPACT_FLIP_SUSPENSION_TURNS = 8;
/** HRHB recruitment multiplier per active entry: the cost of absorbing the displaced. */
export const REFUGEE_COMPACT_RECRUITMENT_PRICE = 0.9;
/** Patron-drag multiplier per ACTIVE compact entry (A2b mechanism; no longer a permanent stance). */
export const PATRON_DRAG_STANCE_MULTIPLIER = 0.5;

const COMPACT_FACTION: FactionId = 'HRHB';

/** event_id -> response ids that GRANT one entry. */
const GRANTS: Readonly<Record<string, readonly string[]>> = {
    hrhb_1992_graz_cooperation_collapse: ['formal_alliance_persists'],
    hrhb_political_goal: ['united_front'],
};
/** event_id -> { response ids that RENEW active entries, turns }. */
const RENEWALS: Readonly<Record<string, { responses: readonly string[]; turns: number }>> = {
    gornji_vakuf_clashes_1993: { responses: ['negotiate'], turns: 30 },
    hrhb_central_bosnia_defense_1993: { responses: ['federate_early'], turns: 40 },
    hrhb_federation_overture_1993: { responses: ['extend_federation_overture'], turns: 30 },
};
/** event_id -> response ids that END every entry. */
const LAPSES: Readonly<Record<string, readonly string[]>> = {
    gornji_vakuf_clashes_1993: ['escalate'],
    hrhb_central_bosnia_defense_1993: ['breakout_offensive'],
    hrhb_federation_overture_1993: ['maintain_separate_state', 'reject_federation_path'],
    // VOPP (t46-54) is Zagreb RESTRAINING the HVO during the Vance-Owen window. `acknowledge_pressure`
    // (the documented historical answer) is neutral: it neither renews nor ends the compact. Only
    // `resist_patron`, pressing the provincial map against that restraint, ends it (A2b PR-B round 2,
    // game designer + historian, 2026-11-17; it used to be the other way round, which made a
    // cooperative President pick the aggressive counterfactual to keep the peace).
    zagreb_restrains_boban_vopp: ['resist_patron'],
};

/**
 * Every (event, response) pair this module reads. Exported for the guard in
 * tests/refugee_compact.test.ts: a content sweep that renames or retires one of these events would
 * otherwise silently kill the paying path (the compact would never open or renew).
 */
export const REFUGEE_COMPACT_DECISION_TABLE = { grants: GRANTS, renewals: RENEWALS, lapses: LAPSES } as const;

export interface RefugeeCompactStatus {
    /** Entries active at `turn` (each carries its expiry). */
    active_entries: number;
    /** 1992 granting choices made (permanent stance; drives the patron-drag multiplier). */
    granting_choices: number;
    /** True once a lapse answer ended the compact. */
    lapsed: boolean;
    /** Latest expiry turn among the active entries (the compact is in force until then); null when none is active. */
    latest_expiry: number | null;
}

interface CompactReplay {
    /** Every entry's final expiry (entries are kept after they run out; a lapse empties the list). */
    expiries: number[];
    granting: number;
    lapsed: boolean;
    /** Turn of the lapse answer, when one ended the compact. */
    lapsed_turn: number | null;
}

/**
 * Replay the HRHB decision log up to and including `turn`. Pure; the log is append-only in
 * resolution order, which is turn order.
 */
function replayCompact(state: RefugeeCompactInput, turn: number): CompactReplay {
    const log = state.military?.event_decision_log;
    if (!log || log.length === 0) return { expiries: [], granting: 0, lapsed: false, lapsed_turn: null };
    let expiries: number[] = [];
    let granting = 0;
    let lapsed = false;
    let lapsedTurn: number | null = null;
    for (const d of log) {
        if (d.turn > turn) continue;
        if (d.faction !== COMPACT_FACTION) continue;
        // Only the President's own answers count: a bot's answer (bot_political, bot_v1, bot_ai_default)
        // never opens, renews or lapses a compact, whatever it picks.
        if (d.decision_source !== 'player') continue;
        if (GRANTS[d.event_id]?.includes(d.response_id)) {
            granting += 1;
            if (!lapsed) expiries.push(d.turn + REFUGEE_COMPACT_GRANT_TURNS);
            continue;
        }
        if (LAPSES[d.event_id]?.includes(d.response_id)) {
            if (expiries.length > 0 && !lapsed) {
                lapsed = true;
                lapsedTurn = d.turn;
            }
            expiries = [];
            continue;
        }
        const renewal = RENEWALS[d.event_id];
        if (renewal && renewal.responses.includes(d.response_id)) {
            const until = d.turn + renewal.turns;
            expiries = expiries.map((e) => (e > d.turn ? Math.max(e, until) : e));
        }
    }
    return { expiries, granting, lapsed, lapsed_turn: lapsedTurn };
}

/** Turn the Washington Agreement was signed at (the compact ends there), or undefined. */
function washingtonSignedTurn(state: RefugeeCompactInput): number | undefined {
    const rhs = state.political?.rbih_hrhb_state;
    return rhs?.washington_signed === true ? (rhs.washington_turn ?? undefined) : undefined;
}

export function getRefugeeCompactStatus(state: RefugeeCompactInput, turn: number): RefugeeCompactStatus {
    const { expiries, granting, lapsed } = replayCompact(state, turn);
    // The compact ends at the Washington signing: the Federation locks the alliance, so there is no
    // friction left to damp and no price left to pay (A2b follow-up; the price used to run to t117).
    const signedAt = washingtonSignedTurn(state);
    const signed = signedAt != null && turn >= signedAt;
    const active = signed ? [] : expiries.filter((e) => e > turn);
    return {
        active_entries: active.length,
        granting_choices: granting,
        lapsed,
        latest_expiry: active.length > 0 ? Math.max(...active) : null,
    };
}

export type RefugeeCompactPhaseName = 'none' | 'active' | 'suspended' | 'lapsed' | 'ran_out' | 'signed';

export interface RefugeeCompactPhase {
    phase: RefugeeCompactPhaseName;
    /** While active or suspended: the turn the compact is in force until. */
    until: number | null;
    /** For an ended compact: the turn it ended (the lapse answer, the last expiry, or the signing). */
    ended_turn: number | null;
}

/**
 * Where the compact stands, for the player's own surfaces (the records-panel line): none (never
 * granted), active, suspended (the displacement damping is lifted for a few weeks after a bilateral
 * flip; the price and the held-back drag continue), or ended by a lapse answer, by running out, or by
 * the Washington signing. A compact that had already ended before the signing keeps its own ending.
 * Pure; reads the same log and state as the multipliers, so the line can never disagree with them.
 */
export function getRefugeeCompactPhase(state: RefugeeCompactInput, turn: number): RefugeeCompactPhase {
    const now = getRefugeeCompactStatus(state, turn);
    if (now.active_entries > 0) {
        const suspendedUntil = state.political?.rbih_hrhb_state?.refugee_compact_suspended_until;
        const suspended = suspendedUntil != null && turn < suspendedUntil;
        return { phase: suspended ? 'suspended' : 'active', until: now.latest_expiry, ended_turn: null };
    }
    if (now.granting_choices === 0) return { phase: 'none', until: null, ended_turn: null };
    const signedAt = washingtonSignedTurn(state);
    if (signedAt != null && turn >= signedAt && getRefugeeCompactStatus(state, signedAt - 1).active_entries > 0) {
        return { phase: 'signed', until: null, ended_turn: signedAt };
    }
    // Ended before the signing (or no signing): a lapse answer, else the entries ran out.
    const replay = replayCompact(state, turn);
    if (replay.lapsed) return { phase: 'lapsed', until: null, ended_turn: replay.lapsed_turn };
    return { phase: 'ran_out', until: null, ended_turn: replay.expiries.length > 0 ? Math.max(...replay.expiries) : null };
}

/** Refugee-pressure multiplier: 0.6 per active entry, 1.0 when none or while suspended. */
export function getRefugeeCompactPressureMultiplier(state: GameState, turn: number): number {
    const { active_entries } = getRefugeeCompactStatus(state, turn);
    if (active_entries === 0) return 1.0;
    const suspendedUntil = state.political?.rbih_hrhb_state?.refugee_compact_suspended_until;
    if (suspendedUntil != null && turn < suspendedUntil) return 1.0;
    return REFUGEE_COMPACT_MULTIPLIER ** active_entries;
}

/** HRHB recruitment price: 0.9 per active entry; exactly 1.0 for any other faction or with none. */
export function getRefugeeCompactRecruitmentMultiplier(state: GameState, faction: FactionId, turn: number): number {
    if (faction !== COMPACT_FACTION) return 1.0;
    const { active_entries } = getRefugeeCompactStatus(state, turn);
    return active_entries === 0 ? 1.0 : REFUGEE_COMPACT_RECRUITMENT_PRICE ** active_entries;
}

/**
 * Patron-drag multiplier: 0.5 per ACTIVE compact entry, exactly 1.0 with none. Like the pressure and
 * recruitment multipliers it rests on continued payment: it returns to 1.0 when the entries run out,
 * lapse or end at the Washington signing. (It was permanent per 1992 choice, which let two choices
 * buy a one-week war; amended in A2b PR-B, game designer + historian, 2026-11-17.)
 */
export function getPatronDragStanceMultiplier(state: GameState, turn: number): number {
    const { active_entries } = getRefugeeCompactStatus(state, turn);
    return active_entries === 0 ? 1.0 : PATRON_DRAG_STANCE_MULTIPLIER ** active_entries;
}

/** True while at least one compact entry is active (gates the flip-suspension write). */
export function isRefugeeCompactActive(state: GameState, turn: number): boolean {
    return getRefugeeCompactStatus(state, turn).active_entries > 0;
}
