import { initializeMilitiaPoolDefaults } from './militia_pool_defaults.js';
import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementRoutingRecord } from './displacement.js';
import {
    ASSAULTED_POCKET_FALL_KILL_RATIO,
    DISPLACEMENT_KILLED_FRACTION,
    getDisplacementKillFraction,
    getFactionFleeAbroadFraction
} from './displacement_loss_constants.js';
import {
    POSAVINA_MUN_IDS,
    getDisplacementRouteForMun,
    getReceivingCapacityFraction
} from './displacement_routing_data.js';
import { appendDisplacementEvent } from './displacement_event_log.js';
import { factionHasBrigadeInMunicipality, getMunicipalityIdFromRecord, getOrInitDisplacementState, recordCivilianDisplacementCasualties } from './displacement_state_utils.js';
import type {
    DisplacementCampState,
    DisplacementState,
    FactionId,
    GameState,
    HostileTakeoverTimerState,
    MunicipalityId
} from './game_state.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';
import { militiaPoolKey } from './militia_pool_key.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { getMunicipalityController } from '../sim/early_war/control_strain.js';
import { strictCompare } from './validateGameState.js';
import { recordWarCrime } from './war_crimes_record.js';

const TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4;
const CAMP_REROUTE_DELAY_TURNS = 4;

/** Sustained displacement: fraction of remaining minority displaced per OSID per turn after initial fire. */
const SUSTAINED_DISPLACEMENT_RATE = 0.03;
/** Stop sustained displacement when remaining minority in OSID falls below this threshold. */
const SUSTAINED_MIN_REMAINING = 10;
/** Fraction of minority displaced in the initial maturation wave. The rest trickles via sustained mode.
 *  Historically ~70% of minorities fled in the first weeks after takeover; 30% remained under duress. */
const INITIAL_DISPLACEMENT_FRACTION = 0.70;

/** HRHB-controlled OSIDs: 100% of Serbs expelled — no front gating (historic mass exodus). */
const HRHB_SERB_EXPULSION_FRACTION = 1.00;
/** RBiH-controlled front-adjacent OSIDs: 50% of Serbs displaced. */
const RBIH_SERB_DISPLACEMENT_FRACTION = 0.50;
/** RBiH-controlled Sarajevo urban OSIDs: only 10% displaced (gradual departure, no mass exodus). */
const SARAJEVO_SERB_DISPLACEMENT_FRACTION = 0.10;

/** Sarajevo urban municipalities: Serb displacement is historically lower. */
const SARAJEVO_URBAN_MUN_IDS = new Set<MunicipalityId>([
    'centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo',
    'ilidza', 'vogosca', 'hadzici',
]);

/** Posavina Croats: most flee to Croatia (canon: displacement redesign 2026-02-17). */
const POSAVINA_CROAT_FLEE_ABROAD = 0.70;
export const BILATERAL_KILL_FRACTION = 0.03;
export const BILATERAL_HRHB_FLEE_ABROAD = 0.35;

// ── RF-5B: policy-driven bilateral displacement (RBiH-HRHB war) ──────────────────────
// The 1993 HVO expulsions of Bosniaks took place inside ground the HVO already held
// (the Lašva valley, west Mostar, Stolac, Čapljina, Prozor; Prlić et al. TJ 2013, affirmed
// on appeal 2017), so takeover displacement, which needs a control change, never saw them.
// A faction whose historical policy was expulsion (BOT_MINORITY_EXPULSION_POLICY: HRHB) seeds,
// once, when the open bilateral war has begun, a timer for the other community in every OSID it
// holds inside the municipalities where the record finds the policy applied
// (POLICY_EXPULSION_SCOPE). A bot applies it; a human-controlled faction's staff apply it as the
// side's historical default on the turn a bot would (silence is the default: H-20, player-override
// model 2026-11-25), and only the player's own halt order refuses it (RB5, owner rule 2026-11-22).
// Each timer fires one bounded wave and never drains further.
// Control is never changed: an OSID the faction no longer holds is not seeded, and a
// recapture before the wave clears the timer.
export interface PolicyExpulsionScopeEntry {
    /** Share of the other community in the OSID displaced by the single wave. */
    fraction: number;
    /** 'A' fires TAKEOVER_DISPLACEMENT_DELAY_TURNS after the policy is applied; 'B' POLICY_WAVE_B_DELAY_TURNS later. */
    wave: 'A' | 'B';
}
/**
 * Where a faction's expulsion policy reaches, by municipality, with the share removed.
 * Historian seat, RF-5B (2026-11-14; side-session note rf5b_historian_sourcing.md):
 * - Wave A (Central Bosnia, Jablanica; mid-April 1993): Vitez ("5,000 expelled" of 11,514
 *   Muslims; Kordić TJ ¶646; Stari Vitez held out), Busovača (Kordić TJ ¶511), Kiseljak
 *   (BB2 p.444), Žepče (BB2 p.444; low confidence), Gornji Vakuf (Prlić TJ), Jablanica
 *   (Sovići/Doljani, the whole detained population moved 5 May; Prlić TJ).
 * - Wave B (Herzegovina, July-August 1993, after the 30 June arrest order): Mostar (west;
 *   chamber counts ~2,800-4,150; Prlić TJ v2 ¶¶814, 875, 922, 981), Stolac (Aladinići,
 *   transfer to Blagaj; ¶1936), Čapljina, Prozor (≥2,500 moved 28 Aug; ¶277), Ljubuški
 *   (arrests, departure abroad ordered via Croatia; Prlić TJ summary).
 * - Not in scope: Kakanj, Travnik, Bugojno, Fojnica, Konjic, Novi Travnik (the HVO lost these
 *   towns or was on the defensive; the record is Croat flight; BB1 p.217), Vareš (Oct-Nov,
 *   overlaps the ARBiH capture), Orašje (HVO and ARBiH fought together in Posavina), Livno
 *   and Tomislavgrad (no expulsion finding; low confidence).
 * RBiH has no entry: no ARBiH joint criminal enterprise or expulsion policy was charged or
 * found (Hadžihasanović and Kubura; Halilović).
 */
export const POLICY_EXPULSION_SCOPE: Partial<Record<FactionId, Record<MunicipalityId, PolicyExpulsionScopeEntry>>> = {
    HRHB: {
        vitez: { fraction: 0.50, wave: 'A' },
        busovaca: { fraction: 0.40, wave: 'A' },
        kiseljak: { fraction: 0.40, wave: 'A' },
        zepce: { fraction: 0.30, wave: 'A' },
        gornji_vakuf: { fraction: 0.40, wave: 'A' },
        jablanica: { fraction: 0.75, wave: 'A' },
        mostar: { fraction: 0.40, wave: 'B' },
        stolac: { fraction: 0.75, wave: 'B' },
        capljina: { fraction: 0.75, wave: 'B' },
        prozor: { fraction: 0.75, wave: 'B' },
        ljubuski: { fraction: 0.50, wave: 'B' },
    },
};
/** Wave B starts this many turns after the policy is applied (≈ mid-April → July 1993). */
export const POLICY_WAVE_B_DELAY_TURNS = 12;
/**
 * Historical minority policy of a faction in the RBiH-HRHB war (§6 panel 2026-11-14, then the
 * broader bright-line panel 2026-11-23 under the owner rule of 2026-11-22: a bot applies it; a
 * human side's staff apply it as the historical default; the player's only act is the halt card,
 * offered once at the start of the war; Ring 3 #5 unchanged). HRHB: the Prlić Trial Chamber found
 * a joint criminal enterprise from mid-January 1993 whose common purpose was domination by the
 * Herceg-Bosna Croats through the ethnic cleansing of the Muslim population (affirmed on appeal,
 * 2017). RBiH: no ARBiH joint criminal enterprise or expulsion policy was charged or found, so it
 * has none.
 */
export const BOT_MINORITY_EXPULSION_POLICY: Partial<Record<FactionId, true>> = { HRHB: true };
/**
 * RB5: the halt card per faction (data/scenarios/events/war_1993.json). It fires once, on the first
 * turn after the open bilateral war begins, and is answerable only then; its historical default is
 * MINORITY_POLICY_DEFAULT_RESPONSE_ID. The halt option is the sole writer of the halt flag.
 */
export const MINORITY_POLICY_CARD_ID_BY_FACTION: Partial<Record<FactionId, string>> = { HRHB: 'hrhb_minority_policy_1993' };
export const MINORITY_POLICY_HALT_FLAG_BY_FACTION: Partial<Record<FactionId, string>> = { HRHB: 'hrhb_minority_policy_halted' };
export const MINORITY_POLICY_DEFAULT_RESPONSE_ID = 'no_halt';
export const MINORITY_POLICY_HALT_RESPONSE_ID = 'order_halt';
/** Deterministic iteration order for the policy seed (strictCompare order of the pair). */
const BILATERAL_POLICY_HOLDER_ORDER: readonly FactionId[] = ['HRHB', 'RBiH'];

/** Event flag recording the turn on which a faction's expulsion policy was applied (seeded). */
export function minorityPolicyAppliedFlag(faction: FactionId): string {
    return `${faction.toLowerCase()}_minority_policy_applied_turn`;
}

/** Event flag set once the faction's first policy wave has been recorded as a war crime. */
export function minorityPolicyWarCrimeFlag(faction: FactionId): string {
    return `${faction.toLowerCase()}_minority_policy_war_crime_recorded`;
}

function getPolicyExpulsionEntry(faction: FactionId, munId: MunicipalityId): PolicyExpulsionScopeEntry | undefined {
    return POLICY_EXPULSION_SCOPE[faction]?.[munId];
}

/**
 * The human's halt-card decision for the faction: 'none' while no decision is on record (the card
 * has not fired, or it is unanswered), 'refused' when the player ordered a halt, 'default' when the
 * historical default stands (answered in person, by Observer's automatic answer, or by the staff
 * when the player left the card unanswered). Fails closed (RB5 item 1): the halt flag, or any player
 * row for the card other than the default (a malformed row included), is a refusal; an automatic
 * (non-player) row is never one. A filed, unapplied halt is not a decision: a player row filed
 * before the card fired (answer-ahead is disabled for this card, so such a row never applied).
 */
function minorityPolicyCardDecision(state: GameState, faction: FactionId): 'none' | 'default' | 'refused' {
    const cardId = MINORITY_POLICY_CARD_ID_BY_FACTION[faction];
    const haltFlag = MINORITY_POLICY_HALT_FLAG_BY_FACTION[faction];
    if (!cardId || !haltFlag) return 'none';
    const flags = state.military?.event_flags ?? {};
    if (flags[haltFlag] !== undefined && flags[haltFlag] !== false) return 'refused';
    const military = state.military;
    const fired = (military?.fired_event_ids ?? []).includes(cardId) || (military?.event_fire_counts?.[cardId] ?? 0) > 0;
    const firedTurnRaw = military?.event_last_fired_turn?.[cardId];
    const firedTurn = typeof firedTurnRaw === 'number' && Number.isFinite(firedTurnRaw) ? firedTurnRaw : null;
    let onRecord = false;
    for (const row of military?.event_decision_log ?? []) {
        if (row?.event_id !== cardId) continue;
        if (row.decision_source === 'player' && row.response_id !== MINORITY_POLICY_DEFAULT_RESPONSE_ID) {
            const rowTurn = Number(row.turn);
            const filedUnapplied = !fired || (firedTurn !== null && Number.isFinite(rowTurn) && rowTurn < firedTurn);
            if (filedUnapplied) continue;
            return 'refused';
        }
        onRecord = true;
    }
    return onRecord ? 'default' : 'none';
}

/**
 * True when the faction follows an expulsion policy: BOT_MINORITY_EXPULSION_POLICY records one,
 * and either a bot holds the side (no player_faction, or the headless harness), or the side is
 * human-controlled at any autonomy level and the player's own halt is not on record.
 *
 * H-20 (player-override model, owner 2026-11-25 "There should be no drift between live and headless
 * games"; §6 HOW ruling, lane C s8; RB5 9/9 as the broader panel of record for the HOW; orchestrator
 * settlement 2026-11-25): for a human side the read is `!== 'refused'`. Silence ('none') and the
 * default both apply the side's historical default on the turn headless applies it; only the
 * player's halt refuses it. This is the state-layer instance of the override rule
 * (`staffChoiceUnlessExplicit`, src/sim/player_override.ts), written inline because the state layer
 * does not import sim code. The halt outranks and persists (G1): it is a saved flag and log row,
 * level-free, never clamped, and it also retires a policy wave seeded before it was on record
 * (`processDisplacementTakeover`).
 */
export function hasMinorityExpulsionPolicy(state: GameState, faction: FactionId): boolean {
    if (BOT_MINORITY_EXPULSION_POLICY[faction] !== true) return false;
    const humanControlled = state.meta.player_faction === faction && state.meta.headless_scenario_auto_control !== true;
    if (!humanControlled) return true;
    return minorityPolicyCardDecision(state, faction) !== 'refused';
}

/** Krajina Bosniaks: ~55% ended abroad, largely via ICRC/UNHCR convoys to Croatia (Karlovac transit camp).
 * F4 (2026-11-14): was 0.35; ICTY OTP 47-municipality figures leave ~56% abroad for Muslims outside
 * the Drina valley (range 0.45-0.65). The Aug 1992 Vlašić convoys to Travnik stayed in the country.
 * This was the PRIMARY escape mechanism for Prijedor, Sanski Most, Bosanski Novi.
 * Convoys ran after international pressure forced camp closures (Aug 1992). */
const KRAJINA_BOSNIAK_CONVOY_MUN_IDS = new Set<MunicipalityId>([
    'prijedor', 'sanski_most', 'bosanski_novi',
    'bosanska_dubica', 'bosanska_kostajnica', 'bosanska_gradiska',
    'banja_luka', 'celinac', 'laktasi', 'prnjavor',
]);
const KRAJINA_BOSNIAK_FLEE_ABROAD = 0.55;

// F4b (panel round 1, War-or-Game and Historian seats; ICTY OTP 47-municipality report, Annex A6;
// Krstić TJ; Krajišnik TJ). Bosniak share abroad at the moment of displacement, by origin:
// - Eastern Bosnia and the Sarajevo ring: 0.08 (range 0.05-0.15). 1992 expellees went into
//   Srebrenica, Cerska, Žepa, Goražde, Sarajevo and Tuzla; the real exits (deportation through
//   Serbia, flight into Sandžak and Montenegro) were small. The OTP endpoints (Srebrenica 18%,
//   Zvornik 45%) are onward movement after flight, which the model does not have.
// - Bijeljina, Posavina, Čapljina and Stolac: 0.40. Semberija bordered Serbia; Posavina could
//   cross the Sava to Croatia; HVO detainees were released to third countries via Croatia (Prlić TJ).
// The former 0.10 border override is gone: below any realistic default it contradicted the record.
const BOSNIAK_EAST_SARAJEVO_RING_MUN_IDS = new Set<MunicipalityId>([
    'zvornik', 'bratunac', 'srebrenica', 'vlasenica', 'sekovici', 'han_pijesak', 'hanpijesak',
    'rogatica', 'visegrad', 'foca', 'rudo', 'cajnice', 'gorazde', 'kalinovik', 'sokolac',
    'pale', 'ilidza', 'hadzici', 'vogosca', 'ilijas', 'trnovo',
    'novo_sarajevo', 'novi_grad_sarajevo', 'centar_sarajevo', 'stari_grad_sarajevo',
    'olovo', 'kladanj',
]);
const BOSNIAK_EAST_SARAJEVO_RING_FLEE_ABROAD = 0.08;
const BOSNIAK_EXIT_MUN_IDS = new Set<MunicipalityId>([
    'bijeljina', 'brcko', 'bosanski_samac', 'odzak', 'derventa', 'modrica', 'bosanski_brod',
    'capljina', 'stolac',
]);
const BOSNIAK_EXIT_FLEE_ABROAD = 0.40;

// Enclave-overrun special case (historical high-lethality second displacement).
// A9 P0-A (SD13, 8-seat §6 ruling D3 and DISPLACEMENT_MASTER §10.1, 2026-11-25): the takeover writer's
// combat overrun of an enclave uses the same sourced ratio as the pocket-fall step (was 0.35, unsourced).
export const ENCLAVE_OVERRUN_KILL_FRACTION = ASSAULTED_POCKET_FALL_KILL_RATIO;

const REINFORCEMENT_RATE = 0.02;
/** Besieged enclaves: refugees arrive starving, unarmed, traumatized — far lower militarization rate. */
const ENCLAVE_REINFORCEMENT_RATE = 0.005;
const DISPLACED_CONTRIBUTION_CAP = 300;
const RBIH_HRHB_ALLIED_THRESHOLD = 0.20;

const ENCLAVE_MUN_IDS = new Set<MunicipalityId>(['srebrenica', 'gorazde', 'zepa']);

const FALLBACK_ROUTES_BY_FACTION: Record<string, MunicipalityId[]> = {
    RBiH: [
        'tuzla',
        'zenica',
        'travnik',
        'gorazde',
        'srebrenica',
        'centar_sarajevo',
        'novi_grad_sarajevo',
        'novo_sarajevo',
        'bihac'
    ],
    RS: ['banja_luka', 'bijeljina', 'doboj', 'prijedor', 'zvornik', 'brcko'],
    HRHB: ['mostar', 'livno', 'travnik', 'brcko']
};

/**
 * Seed a displacement timer for an OSID that changed control outside of battle resolution.
 * Called from: rear pocket consolidation, paramilitary sweep, null-OSID auto-claim, JNA phantom captures.
 *
 * Seeds timers for ALL hostile factions (e.g. RS capturing a mixed Bosniak/Croat OSID seeds both
 * RBiH and HRHB timers). Idempotent — skips if timer already exists for a given OSID+faction pair.
 *
 * Must be called AFTER political_controllers has been updated for the OSID.
 */
export function seedDisplacementTimerOnFlip(
    state: GameState,
    osid: string,
    fromFaction: FactionId,
    toFaction: FactionId,
): void {
    if (state.meta.phase !== 'war') return;
    if (!fromFaction || !toFaction || fromFaction === toFaction) return;

    if (!state.displacement.hostile_takeover_timers) state.displacement.hostile_takeover_timers = {};
    const timerMap = state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>;

    const parts = osid.split(':');
    const munId = parts.length >= 2 ? parts[1] as MunicipalityId : undefined;
    if (!munId) return;

    const currentTurn = state.meta.turn;
    const allFactions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
    for (const displaced of allFactions) {
        if (displaced === toFaction) continue;
        const timerKey = `${osid}|${displaced}`;
        // A stale RF-5B policy timer (the OSID changed hands) or a dormant one (RB9) yields to
        // the new holder's timer, which inherits the people already expelled.
        if (!isReplaceableTimer(timerMap[timerKey])) continue;
        timerMap[timerKey] = {
            mun_id: munId,
            from_faction: displaced,
            to_faction: toFaction,
            started_turn: currentTurn,
            ...carriedDisplacement(timerMap[timerKey]),
        };
    }
}

/**
 * RF-5B, extended to every timer by RB9: when a capture replaces a timer whose wave already
 * fired (a policy timer, or a dormant one), the new timer inherits the people already expelled,
 * so its own waves draw on the community that remains, never on the 1991 census again (the
 * same people cannot be expelled twice).
 */
function carriedDisplacement(
    existing: HostileTakeoverTimerState | undefined
): { cumulative_displaced?: number; cumulative_routed?: number; cumulative_pool_cut?: number } {
    if (!existing) return {};
    if (existing.cause !== 'policy_expulsion' && existing.dormant_since_turn === undefined) return {};
    // The count is carried whether or not this timer fired: a re-seeded timer that inherited a count
    // and was replaced again inside its delay still holds those people (red-team C1).
    const prior = existing.cumulative_displaced ?? 0;
    if (prior <= 0) return {};
    const carried: { cumulative_displaced: number; cumulative_routed?: number; cumulative_pool_cut?: number } = { cumulative_displaced: prior };
    const routed = Math.min(prior, Math.max(0, existing.cumulative_routed ?? 0));
    if (routed > 0) carried.cumulative_routed = routed;
    const poolCut = Math.max(0, existing.cumulative_pool_cut ?? 0);
    if (poolCut > 0) carried.cumulative_pool_cut = poolCut;
    return carried;
}

/**
 * RB9 return rule (historian seat, orchestrator ruling 2026-11-16): weeks a dormant record's OSID
 * must be held by the expelled group's own side, or a side not at war with it, before the routed
 * survivors come back. The historian seat picks and justifies the figure.
 */
export const RETURN_HOLD_WEEKS = 12;

/**
 * Whether two sides have fought each other at any point so far. RS has been at war with both from the
 * start; RBiH and HRHB only from the open bilateral war (`rbih_hrhb_state.war_started_turn`). A later
 * ceasefire or alliance (Washington) does not undo it.
 */
function haveEverBeenAtWar(state: GameState, a: FactionId, b: FactionId): boolean {
    if (!a || !b || a === b) return false;
    if (!isRbihHrhbPair(a, b)) return true;
    const started = state.political?.rbih_hrhb_state?.war_started_turn;
    return typeof started === 'number' && started <= state.meta.turn;
}

/**
 * A safe holder for a group's return (historian seat, round 2; it also closes red-team R1): the
 * group's own side, or a side that has never yet been at war with that group. The expeller is never
 * a safe holder. So people go home when their own side retakes the place, or under an ally that has
 * not fought them (Stolac Bosniaks under the HVO in 1992), but not across a front after a later peace
 * (cross-front returns before Dayton were negligible).
 */
function isSafeHolderForGroup(
    state: GameState,
    group: FactionId,
    expeller: FactionId,
    controller: FactionId | null | undefined,
): boolean {
    if (!controller) return false;
    if (controller === group) return true;
    if (controller === expeller) return false;
    return !haveEverBeenAtWar(state, group, controller);
}

/**
 * RB9 return rule. A dormant record whose OSID has been held safely for RETURN_HOLD_WEEKS brings its
 * routed survivors home: the same number leave that group's refugee population (the origin camp
 * first, then `displaced_in` in the order the cohort was routed), so each person is still counted once.
 * The killed and the fled abroad never return and stay on the record; people no longer found in
 * any refugee population are not invented. `refugees_created` is untouched: the expulsion happened.
 * Faction-blind, no named places. A record with nothing left on it is deleted.
 */
function applyBoundedReturn(
    state: GameState,
    timerMap: Record<string, HostileTakeoverTimerState>,
    timerKey: string,
    timer: HostileTakeoverTimerState,
    osid: string,
    controller: FactionId | null | undefined,
    currentTurn: number,
): void {
    if (!isSafeHolderForGroup(state, timer.from_faction, timer.to_faction, controller)) {
        delete timer.return_hold_since_turn;
        return;
    }
    if (timer.return_hold_since_turn === undefined) {
        timer.return_hold_since_turn = currentTurn;
        return;
    }
    if (currentTurn - timer.return_hold_since_turn < RETURN_HOLD_WEEKS) return;

    const group = timer.from_faction;
    let wanted = Math.min(Math.max(0, timer.cumulative_routed ?? 0), Math.max(0, timer.cumulative_displaced ?? 0));
    let returned = 0;
    const camps = (state.displacement.displacement_camp_state ?? {}) as Record<MunicipalityId, DisplacementCampState>;
    const camp = camps[timer.mun_id];
    if (wanted > 0 && camp) {
        const take = Math.min(wanted, Math.max(0, camp.by_faction[group] ?? 0), Math.max(0, camp.population));
        if (take > 0) {
            camp.by_faction[group] = (camp.by_faction[group] ?? 0) - take;
            camp.population -= take;
            wanted -= take;
            returned += take;
        }
    }
    const dispStates = state.displacement.displacement_state ?? {};
    // Draw returnees from where this cohort was routed: the same routing order the expulsion used
    // (engine seat E1; alphabetical order emptied whichever hosts sort first), then any other host.
    const routed = getBilateralRoutingOrder(timer.mun_id, group, timer.to_faction);
    const routedSet = new Set(routed);
    const rest = Object.keys(dispStates).filter((m) => !routedSet.has(m)).sort(strictCompare);
    for (const munId of [...routed, ...rest]) {
        if (wanted <= 0) break;
        if (munId === timer.mun_id) continue;
        const d = dispStates[munId];
        const byFaction = d?.displaced_in_by_faction;
        if (!d || !byFaction) continue;
        const take = Math.min(wanted, Math.max(0, Math.floor(byFaction[group] ?? 0)), Math.max(0, d.displaced_in));
        if (take <= 0) continue;
        byFaction[group] = (byFaction[group] ?? 0) - take;
        d.displaced_in -= take;
        d.last_updated_turn = currentTurn;
        // Codex P2 (#747): routing credited the host OSID's arrivals tally; reverse that credit so
        // the per-OSID panel does not show returnees at the host and at home. Same resolver as routing.
        const hostOsid = resolveRepresentativeDestOsid(state, munId, group);
        const hostFlow = hostOsid ? state.displacement.displacement_flows_by_osid?.[hostOsid] : undefined;
        if (hostFlow) hostFlow.in = Math.max(0, hostFlow.in - take);
        wanted -= take;
        returned += take;
    }
    if (returned > 0) {
        const origin = dispStates[timer.mun_id];
        if (origin) {
            origin.displaced_out = Math.max(0, origin.displaced_out - returned);
            origin.last_updated_turn = currentTurn;
        }
        // Red-team R2: the return is an event, so the per-OSID tally and the turn record see it too.
        // No expulsion fields are set, so refugees_created and casualties are untouched.
        appendDisplacementEvent(state, {
            turn: currentTurn,
            origin_mun: timer.mun_id,
            origin_osid: osid,
            dest_mun: timer.mun_id,
            ethnicity: group,
            displaced: 0,
            killed: 0,
            fled_abroad: 0,
            settled: 0,
            returned,
        });
        // Engine seat E3: the returnees' share of the militia the expulsion cut from the home pool goes
        // back to it (their share of everyone the record expelled, so the dead and the fled stay cut).
        const poolCut = Math.max(0, timer.cumulative_pool_cut ?? 0);
        const expelled = Math.max(1, timer.cumulative_displaced ?? 0);
        const restore = Math.min(poolCut, Math.floor((poolCut * returned) / expelled));
        if (restore > 0) {
            const homePool = state.military.militia_pools?.[militiaPoolKey(timer.mun_id, group)];
            if (homePool) {
                homePool.available += restore;
                homePool.updated_turn = currentTurn;
                timer.cumulative_pool_cut = poolCut - restore;
            }
        }
    }
    // The routed survivors have come home, or are no longer in any refugee population; either way
    // nobody routed remains to return. What is left on the record is the killed and the fled abroad.
    timer.cumulative_displaced = Math.max(0, (timer.cumulative_displaced ?? 0) - returned);
    timer.cumulative_routed = 0;
    delete timer.return_hold_since_turn;
    if (timer.cumulative_displaced <= 0) delete timerMap[timerKey];
}

/** A timer a new capture may replace: a policy timer (RF-5B) or a dormant one (RB9). */
function isReplaceableTimer(existing: HostileTakeoverTimerState | undefined): boolean {
    return !existing || existing.cause === 'policy_expulsion' || existing.dormant_since_turn !== undefined;
}

/**
 * RB9: retire a timer instead of forgetting it. A timer that holds a count of people already
 * expelled (its own fired wave, or a count it inherited and has not yet fired on) keeps it as a
 * dormant record that never fires; a timer with no count displaced nobody and is deleted, as before.
 */
function retireTimer(
    state: GameState,
    timerMap: Record<string, HostileTakeoverTimerState>,
    timerKey: string,
    currentTurn: number,
    controller: FactionId | null | undefined,
): void {
    const timer = timerMap[timerKey];
    if (timer && (timer.cumulative_displaced ?? 0) > 0) {
        timer.dormant_since_turn = currentTurn;
        // Codex P2: the return clock starts on the turn the safe holder takes over, not on the
        // next weekly pass (a recapture at t60 returns people at t72, after 12 weeks, not t73).
        if (isSafeHolderForGroup(state, timer.from_faction, timer.to_faction, controller)) {
            timer.return_hold_since_turn = currentTurn;
        }
        return;
    }
    delete timerMap[timerKey];
}

export interface TakeoverBattleRecord {
    settlement_flipped: boolean;
    location: string;
    osid?: string;
    attacker_faction: FactionId;
    defender_faction: FactionId;
}

export interface BattleResolutionLike {
    battles: TakeoverBattleRecord[];
}

export interface TakeoverDisplacementReport {
    timers_started: number;
    timers_matured: number;
    camps_created: number;
    camps_routed: number;
    displaced_total: number;
    killed_total: number;
    fled_abroad_total: number;
    routed_total: number;
    sustained_fires: number;
    sustained_displaced_total: number;
    source_municipalities: MunicipalityId[];
    routing: DisplacementRoutingRecord[];
}

function isRbihHrhbPair(a: FactionId, b: FactionId): boolean {
    return (a === 'RBiH' && b === 'HRHB') || (a === 'HRHB' && b === 'RBiH');
}

function areFactionsAtWar(state: GameState, a: FactionId, b: FactionId): boolean {
    if (!a || !b || a === b) return false;
    if (!isRbihHrhbPair(a, b)) return true;
    const currentTurn = state.meta.turn;
    const earliestTurn =
        typeof state.meta.rbih_hrhb_war_earliest_turn === 'number'
            ? state.meta.rbih_hrhb_war_earliest_turn
            : Number.MAX_SAFE_INTEGER;
    if (currentTurn < earliestTurn) return false;
    const alliance = typeof state.political.war_alliance_rbih_hrhb === 'number' ? state.political.war_alliance_rbih_hrhb : 0;
    return alliance <= RBIH_HRHB_ALLIED_THRESHOLD;
}

function getFleeAbroadFraction(sourceMun: MunicipalityId, fromFaction: FactionId, toFaction?: FactionId): number {
    // F4 amendment (panel round 1, Calibration seat): people driven out when a Drina enclave
    // falls go to own-side territory. Those forcibly transferred from Srebrenica and Žepa in
    // July 1995 went to Kladanj and Tuzla (Krstić TJ); Bosniaks driven from Goražde's villages
    // went into the pocket. Known limit: several hundred Žepa men crossed the Drina into Serbia.
    if (toFaction && isEnclaveOverrun(sourceMun, fromFaction, toFaction)) return 0;
    if (toFaction && isRbihHrhbPair(fromFaction, toFaction) && fromFaction === 'HRHB') return BILATERAL_HRHB_FLEE_ABROAD;
    if (fromFaction === 'HRHB' && POSAVINA_MUN_IDS.has(sourceMun)) return POSAVINA_CROAT_FLEE_ABROAD;
    if (fromFaction === 'RBiH' && KRAJINA_BOSNIAK_CONVOY_MUN_IDS.has(sourceMun)) return KRAJINA_BOSNIAK_FLEE_ABROAD;
    if (fromFaction === 'RBiH' && BOSNIAK_EXIT_MUN_IDS.has(sourceMun)) return BOSNIAK_EXIT_FLEE_ABROAD;
    if (fromFaction === 'RBiH' && BOSNIAK_EAST_SARAJEVO_RING_MUN_IDS.has(sourceMun)) return BOSNIAK_EAST_SARAJEVO_RING_FLEE_ABROAD;
    return getFactionFleeAbroadFraction(fromFaction);
}

function getPopulationTotal(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }): number {
    return Math.max(0, entry.total);
}

function getFactionAlignedPopulation(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }, faction: FactionId): number {
    if (faction === 'RBiH') return Math.max(0, entry.bosniak + entry.other);
    if (faction === 'RS') return Math.max(0, entry.serb);
    if (faction === 'HRHB') return Math.max(0, entry.croat);
    return 0;
}

/** Get actual population for an OSID from settlement census data. */
function getOsidCensusPopulation(rec: SettlementRecord | undefined): number {
    const pop = rec?.properties?.population_total;
    return typeof pop === 'number' && Number.isFinite(pop) && (pop as number) > 0 ? (pop as number) : 0;
}

/** Get per-OSID hostile share from census data. Returns null if data unavailable. */
function getOsidCensusHostileShare(rec: SettlementRecord | undefined, fromFaction: FactionId): number | null {
    const total = getOsidCensusPopulation(rec);
    if (total <= 0) return null;
    const props = rec?.properties;
    if (!props) return null;
    const b = typeof props.population_bosniaks === 'number' ? (props.population_bosniaks as number) : 0;
    const s = typeof props.population_serbs === 'number' ? (props.population_serbs as number) : 0;
    const c = typeof props.population_croats === 'number' ? (props.population_croats as number) : 0;
    const o = typeof props.population_others === 'number' ? (props.population_others as number) : 0;
    // Match getFactionAlignedPopulation logic: RBiH = bosniak + other
    let factionPop: number;
    if (fromFaction === 'RBiH') factionPop = b + o;
    else if (fromFaction === 'RS') factionPop = s;
    else if (fromFaction === 'HRHB') factionPop = c;
    else return null;
    const share = factionPop / total;
    return Number.isFinite(share) ? Math.max(0, Math.min(1, share)) : null;
}

/**
 * RF-5B: the community a recorded expulsion policy targets, as a share of the OSID's 1991
 * population. The standing convention counts "others" (largely 1991 Yugoslavs) with
 * Bosniaks; the policy the ICTY found targeted the Muslim population (Prlić TJ), so a
 * policy wave against RBiH-aligned people counts declared Bosniaks only. In urban Mostar
 * the convention would roughly double the wave. Falls back to the municipality share.
 */
function getPolicyTargetShare(
    rec: SettlementRecord | undefined,
    fromFaction: FactionId,
    munId: MunicipalityId,
    population1991ByMun?: MunicipalityPopulation1991Map
): number {
    if (fromFaction !== 'RBiH') {
        return getOsidCensusHostileShare(rec, fromFaction)
            ?? (() => {
                const entry = population1991ByMun?.[munId];
                const total = entry ? getPopulationTotal(entry) : 0;
                return entry && total > 0 ? getFactionAlignedPopulation(entry, fromFaction) / total : 0;
            })();
    }
    const total = getOsidCensusPopulation(rec);
    const b = rec?.properties?.population_bosniaks;
    if (total > 0 && typeof b === 'number' && Number.isFinite(b)) return Math.max(0, Math.min(1, b / total));
    const entry = population1991ByMun?.[munId];
    const munTotal = entry ? getPopulationTotal(entry) : 0;
    return entry && munTotal > 0 ? Math.max(0, Math.min(1, entry.bosniak / munTotal)) : 0;
}

/**
 * `fromFaction`'s people as a share of the municipality's 1991 census plus incoming displaced (1 when no census).
 * Exported unchanged for the A9 P1 convoy rule's besieger-intent predicate (`displacement.ts`).
 */
export function getDynamicHostileShare(
    munId: MunicipalityId,
    fromFaction: FactionId,
    dispState: DisplacementState,
    population1991ByMun?: MunicipalityPopulation1991Map
): number {
    const fallback = 1;
    if (!population1991ByMun) return fallback;
    const entry = population1991ByMun[munId];
    if (!entry) return fallback;
    const baseTotal = getPopulationTotal(entry);
    if (baseTotal <= 0) return fallback;
    const baseFaction = getFactionAlignedPopulation(entry, fromFaction);
    const incomingByFaction = dispState.displaced_in_by_faction ?? {};
    const incomingTotal = Object.values(incomingByFaction)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
        .reduce((sum, v) => sum + v, 0);
    const incomingFaction = incomingByFaction[fromFaction] ?? 0;
    const adjustedTotal = Math.max(1, baseTotal + incomingTotal);
    const adjustedFaction = Math.max(0, baseFaction + incomingFaction);
    const share = adjustedFaction / adjustedTotal;
    if (!Number.isFinite(share)) return fallback;
    return Math.max(0, Math.min(1, share));
}

function isEnclaveOverrun(munId: MunicipalityId, fromFaction: FactionId, toFaction: FactionId): boolean {
    if (!ENCLAVE_MUN_IDS.has(munId)) return false;
    return fromFaction === 'RBiH' && toFaction !== 'RBiH';
}

function getTakeoverKillFraction(munId: MunicipalityId, fromFaction: FactionId, toFaction: FactionId): number {
    if (isRbihHrhbPair(fromFaction, toFaction)) return BILATERAL_KILL_FRACTION;
    if (isEnclaveOverrun(munId, fromFaction, toFaction)) return ENCLAVE_OVERRUN_KILL_FRACTION;
    return getDisplacementKillFraction(fromFaction, toFaction);
}

function buildFriendlyMunicipalitiesByFaction(
    state: GameState,
    _settlements: Map<string, SettlementRecord>
): Record<FactionId, Set<MunicipalityId>> {
    const out: Record<FactionId, Set<MunicipalityId>> = {
        RBiH: new Set<MunicipalityId>(),
        RS: new Set<MunicipalityId>(),
        HRHB: new Set<MunicipalityId>()
    };
    // OSID-level political_controllers: extract municipality from OSID "op:mun:slug"
    const pc = state.political.political_controllers;
    if (pc && typeof pc === 'object') {
        const osids = Object.keys(pc).sort(strictCompare);
        for (const osid of osids) {
            const controller = pc[osid] as string | undefined;
            if (!controller || !out[controller]) continue;
            const parts = osid.split(':');
            const mun = parts.length >= 2 ? parts[1] : undefined;
            if (mun) out[controller].add(mun as MunicipalityId);
        }
    }
    return out;
}

function orderedUnique(items: MunicipalityId[]): MunicipalityId[] {
    const out: MunicipalityId[] = [];
    const seen = new Set<MunicipalityId>();
    for (const id of items) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function getRoutingOrder(sourceMun: MunicipalityId, faction: FactionId): MunicipalityId[] {
    const primary = getDisplacementRouteForMun(sourceMun, faction);
    const fallback = FALLBACK_ROUTES_BY_FACTION[faction] ?? [];
    return orderedUnique([...primary, ...fallback, ...LARGE_URBAN_MUN_IDS]);
}

export function getBilateralRoutingOrder(sourceMun: MunicipalityId, faction: FactionId, toFaction?: FactionId): MunicipalityId[] {
    if (!toFaction || !isRbihHrhbPair(faction, toFaction)) return getRoutingOrder(sourceMun, faction);
    const fallback = FALLBACK_ROUTES_BY_FACTION[faction] ?? [];
    if (faction === 'HRHB') return orderedUnique(['mostar', 'livno', ...fallback, ...LARGE_URBAN_MUN_IDS]);
    return orderedUnique(['zenica', 'travnik', 'tuzla', ...fallback, ...LARGE_URBAN_MUN_IDS]);
}

/**
 * T2-B (orphaned-wiring audit S6/N6): resolve a deterministic representative
 * destination OSID for a cross-municipality routed cohort, so the receive-side
 * attribution (`displacement_event_log.ts`) can credit `refugees_received` to
 * the faction that actually receives the displaced civilians. Picks the
 * strictCompare-first `op:<destMun>:*` OSID controlled by the receiving faction
 * (civilians route only to FRIENDLY municipalities, so such an OSID exists when
 * routing succeeds). Returns undefined when no controlled OSID is found, in
 * which case the event keeps `dest_osid` unset and the receive-side drops the
 * contribution exactly as before (graceful, no behavior change).
 */
export function resolveRepresentativeDestOsid(
    state: GameState,
    destMun: MunicipalityId,
    faction: FactionId,
): string | undefined {
    const pc = state.political?.political_controllers as Record<string, string> | undefined;
    if (!pc) return undefined;
    const prefix = `op:${destMun}:`;
    let best: string | undefined;
    for (const osid of Object.keys(pc)) {
        if (!osid.startsWith(prefix)) continue;
        if (pc[osid] !== faction) continue;
        if (best === undefined || strictCompare(osid, best) < 0) best = osid;
    }
    return best;
}

/**
 * Shared routing helper for displaced cohorts. Routes population from sourceMunId
 * to friendly municipalities in routing order, respecting capacity constraints.
 *
 * Three callers with different options:
 *  - Pass-through: no militia pool, no brigade check, no event logging
 *  - Sustained displacement: militia pool tracking, event logging
 *  - Camp reroute: militia pool tracking, brigade presence check, event logging
 */
function routeDisplacedCohort(
    state: GameState,
    sourceMunId: MunicipalityId,
    faction: FactionId,
    amount: number,
    friendlyMuns: Set<MunicipalityId>,
    settlements: Map<string, SettlementRecord>,
    routedByPoolKey: Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>,
    report: TakeoverDisplacementReport,
    options: {
        trackMilitiaPool?: boolean;
        requireBrigadePresence?: boolean;
        eventReason?: string;
        /**
         * A4: record each move as a turn-report row with this reason and the group, and write NO
         * displacement event (a second move of people already displaced must not feed
         * `displacement_origin_dest_arrivals`, which places brigade reconstitution, nor `refugees_received`).
         * Ignored when `eventReason` is set.
         */
        reportReason?: string;
        causedByFaction?: FactionId;
    }
): { routed: number; remaining: number } {
    const currentTurn = state.meta.turn;
    let remaining = amount;
    let totalRouted = 0;
    const routeOrder = getBilateralRoutingOrder(sourceMunId, faction, options.causedByFaction);
    for (const targetMunId of routeOrder) {
        if (remaining <= 0) break;
        if (!friendlyMuns?.has(targetMunId)) continue;
        if (targetMunId === sourceMunId) continue;
        if (options.requireBrigadePresence && !factionHasBrigadeInMunicipality(state, faction, targetMunId, settlements)) continue;
        const targetState = getOrInitDisplacementState(
            state,
            targetMunId,
            state.displacement.displacement_state?.[targetMunId]?.original_population ?? 10000
        );
        const targetCurrent = Math.max(
            0,
            targetState.original_population + targetState.displaced_in
            - targetState.displaced_out - targetState.lost_population
        );
        const targetCapacity = Math.floor(
            targetState.original_population * getReceivingCapacityFraction(targetMunId)
        );
        const availableCapacity = Math.max(0, targetCapacity - targetCurrent);
        if (availableCapacity <= 0) continue;
        const routed = Math.min(remaining, availableCapacity);
        if (routed <= 0) continue;

        targetState.displaced_in += routed;
        if (!targetState.displaced_in_by_faction) targetState.displaced_in_by_faction = {};
        targetState.displaced_in_by_faction[faction] =
            (targetState.displaced_in_by_faction[faction] ?? 0) + routed;
        targetState.last_updated_turn = currentTurn;

        if (options.trackMilitiaPool) {
            const poolKey = militiaPoolKey(targetMunId, faction);
            const current = routedByPoolKey.get(poolKey);
            if (current) {
                current.amount += routed;
            } else {
                routedByPoolKey.set(poolKey, { munId: targetMunId, faction, amount: routed });
            }
        }

        if (options.eventReason) {
            report.routing.push({
                from_mun: sourceMunId,
                to_mun: targetMunId,
                amount: routed,
                reason: options.eventReason
            });

            appendDisplacementEvent(state, {
                turn: currentTurn,
                origin_mun: sourceMunId,
                dest_mun: targetMunId,
                // T2-B: attribute the received cohort to the faction that
                // controls the destination municipality (refugees_received).
                dest_osid: resolveRepresentativeDestOsid(state, targetMunId, faction),
                ethnicity: faction,
                displaced: 0,
                killed: 0,
                fled_abroad: 0,
                settled: routed,
            });
        } else if (options.reportReason) {
            report.routing.push({
                from_mun: sourceMunId,
                to_mun: targetMunId,
                amount: routed,
                reason: options.reportReason,
                group: faction
            });
            // Ledger line 1 (A4): write-only display counter, never an event (s6_ledger12_ruling.md).
            if (options.reportReason === 'capture_pass_through') {
                const moved = Math.max(0, Math.floor(routed));
                if (moved > 0) {
                    const byPeople = (state.displacement.moved_on_at_capture_by_people ??= {});
                    byPeople[faction] = (byPeople[faction] ?? 0) + moved;
                }
            }
        }

        remaining -= routed;
        totalRouted += routed;
    }
    return { routed: totalRouted, remaining };
}

function addOneTurnPoolContribution(
    state: GameState,
    routedByPoolKey: Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>
): void {
    if (!state.military.militia_pools) state.military.militia_pools = {};
    const poolKeys = Array.from(routedByPoolKey.keys()).sort(strictCompare);
    for (const key of poolKeys) {
        const row = routedByPoolKey.get(key);
        if (!row) continue;
        const effectiveRate = ENCLAVE_MUN_IDS.has(row.munId) ? ENCLAVE_REINFORCEMENT_RATE : REINFORCEMENT_RATE;
        const contribution = Math.min(
            Math.floor(Math.max(0, row.amount) * effectiveRate),
            DISPLACED_CONTRIBUTION_CAP
        );
        if (contribution <= 0) continue;
        const currentTurn = state.meta.turn;
        const pool = state.military.militia_pools[key];
        if (pool) {
            pool.available += contribution;
            pool.updated_turn = currentTurn;
        } else {
            state.military.militia_pools[key] = {
                mun_id: row.munId,
                faction: row.faction,
                available: contribution,
                committed: 0,
                exhausted: 0,
                updated_turn: currentTurn
            };
            initializeMilitiaPoolDefaults(state.military.militia_pools[key]);
        }
    }
}

/**
 * Returns the initial-wave displacement fraction for a controller/displaced-faction pair.
 * Returns null to skip seeding entirely (e.g. deep-rear Serbs in RBiH territory).
 *
 * Canon rules (displacement redesign 2026-03-05):
 *  - Serbs in HRHB territory: 1.00 exodus — no front gating.
 *  - Serbs in RBiH territory: 0.10 in Sarajevo urban; 0.50 front-adjacent only; null for deep rear.
 *    (Front-adjacency gating applies only to this case — RS is not immune for minorities.)
 *  - Bosniaks or Croats in RS territory: always INITIAL_DISPLACEMENT_FRACTION (0.70), no front gating.
 *  - All other: INITIAL_DISPLACEMENT_FRACTION (0.70)
 */
function getInitialDisplacementFraction(
    toFaction: FactionId,
    fromFaction: FactionId,
    munId: MunicipalityId,
    isFrontAdjacent: boolean
): number | null {
    if (toFaction === 'HRHB' && fromFaction === 'RS') return HRHB_SERB_EXPULSION_FRACTION;
    if (toFaction === 'RBiH' && fromFaction === 'RS') {
        if (SARAJEVO_URBAN_MUN_IDS.has(munId)) return SARAJEVO_SERB_DISPLACEMENT_FRACTION;
        if (!isFrontAdjacent) return null;
        return RBIH_SERB_DISPLACEMENT_FRACTION;
    }
    return INITIAL_DISPLACEMENT_FRACTION;
}

/**
 * A9 B2 (SD13): where a capture pass-through group of `faction` sheltered in `munId` may be moved on.
 * `null` means the group stays (its side still holds a supplied settlement there); a set lists the
 * reachable destinations, and an empty set also means the group stays. Built by
 * `buildPassThroughDestinationResolver` (displacement.ts) from this turn's territorial bodies and supply.
 */
export type PassThroughDestinationResolver = (
    faction: string,
    munId: MunicipalityId,
    /**
     * A9 P0-A: test the link from these settlements only (a fallen enclave's own settlements), instead of
     * from every settlement of the municipality. The capture pass-through never passes it.
     */
    linkFrom?: readonly string[]
) => ReadonlySet<MunicipalityId> | null;

export function processDisplacementTakeover(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    battleReport?: BattleResolutionLike,
    population1991ByMun?: MunicipalityPopulation1991Map,
    /** Optional OSID-keyed settlements with per-OSID census data (population_total, population_bosniaks, etc.). */
    osidSettlements?: Map<string, SettlementRecord>,
    /**
     * A9 B2 (SD13): builds the pass-through reachability on first use (the turn pipeline passes it). Without
     * it (unit fixtures, legacy harnesses) the pass-through routes as B1 did.
     */
    passThroughReach?: () => PassThroughDestinationResolver
): TakeoverDisplacementReport {
    if (state.meta.phase !== 'war') {
        return {
            timers_started: 0,
            timers_matured: 0,
            camps_created: 0,
            camps_routed: 0,
            displaced_total: 0,
            killed_total: 0,
            fled_abroad_total: 0,
            routed_total: 0,
            sustained_fires: 0,
            sustained_displaced_total: 0,
            source_municipalities: [],
            routing: []
        };
    }

    if (!state.displacement.hostile_takeover_timers) state.displacement.hostile_takeover_timers = {};
    if (!state.displacement.displacement_camp_state) state.displacement.displacement_camp_state = {};
    if (!state.displacement.displacement_event_log) state.displacement.displacement_event_log = [];

    const report: TakeoverDisplacementReport = {
        timers_started: 0,
        timers_matured: 0,
        camps_created: 0,
        camps_routed: 0,
        displaced_total: 0,
        killed_total: 0,
        fled_abroad_total: 0,
        routed_total: 0,
        sustained_fires: 0,
        sustained_displaced_total: 0,
        source_municipalities: [],
        routing: []
    };

    const currentTurn = state.meta.turn;
    const timerMap = state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>;
    const allFactions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
    const campMap = state.displacement.displacement_camp_state as Record<MunicipalityId, DisplacementCampState>;

    // Build set of OSIDs on the front line (for front-adjacency gating in displacement seeding).
    // war_front_edges_osid.a/b are OSIDs in op:municipality:slug format.
    const frontOsids = new Set<string>();
    for (const fe of state.military.war_front_edges_osid ?? []) {
        if (fe.a) frontOsids.add(fe.a);
        if (fe.b) frontOsids.add(fe.b);
    }
    // Fallback: if no front edges computed yet (turn 1), treat all as front-adjacent.
    const allFrontAdjacent = frontOsids.size === 0;

    const battles = (battleReport?.battles ?? []).slice().sort((a, b) => {
        const byAttacker = strictCompare(a.attacker_faction, b.attacker_faction);
        if (byAttacker !== 0) return byAttacker;
        return strictCompare(a.location, b.location);
    });

    // 0) Seed displacement timers for ALL OSIDs at war start.
    //    Every OSID's minority population begins displacement on day one.
    //    NOTE: war_start_turn is set to the initial state's turn (e.g. 0), but runTurn()
    //    increments turn BEFORE executing phases. So the first executed war turn is always
    //    warStartTurn + 1. Use +1 here to fire on that actual first war turn.
    const warStartTurn = typeof state.meta.war_start_turn === 'number' ? state.meta.war_start_turn : 0;
    if (currentTurn === warStartTurn + 1) {
        const pc = state.political.political_controllers;
        if (pc) {
            const osids = Object.keys(pc).sort(strictCompare);
            for (const osid of osids) {
                if (!osid.startsWith('op:')) continue;
                const controller = pc[osid];
                if (!controller) continue;
                const parts = osid.split(':');
                const munId = parts.length >= 2 ? parts[1] as MunicipalityId : undefined;
                if (!munId) continue;
                for (const fromFaction of allFactions) {
                    if (fromFaction === controller) continue;
                    if (!areFactionsAtWar(state, fromFaction, controller)) continue;
                    const timerKey = `${osid}|${fromFaction}`;
                    if (timerMap[timerKey]) continue;
                    // Skip seeding if per-faction rules say no displacement (e.g. deep-rear RBiH->RS).
                    const isFrontAdj = allFrontAdjacent || frontOsids.has(osid);
                    const fraction = getInitialDisplacementFraction(controller, fromFaction, munId, isFrontAdj);
                    if (fraction === null) continue;
                    timerMap[timerKey] = {
                        mun_id: munId,
                        from_faction: fromFaction,
                        to_faction: controller,
                        started_turn: currentTurn
                    };
                    report.timers_started += 1;
                }
            }
        }
    }

    // 0b) RF-5B: policy-driven bilateral seed. Step 0 runs on the first war turn of 1992,
    //     when RBiH and HRHB are allied, so it never seeds this pair. Once the open bilateral
    //     war has begun (rbih_hrhb_state.war_started_turn) and while the pair is at war, a
    //     faction with an expulsion policy (hasMinorityExpulsionPolicy: a bot, or a human side
    //     whose player has not ordered the halt) seeds (once per faction) the
    //     other community in every OSID it holds inside its POLICY_EXPULSION_SCOPE municipalities.
    //     Wave B timers start POLICY_WAVE_B_DELAY_TURNS later.
    const bilateralWarStarted = typeof state.political.rbih_hrhb_state?.war_started_turn === 'number';
    if (bilateralWarStarted) {
        const pc = state.political.political_controllers ?? {};
        for (const holder of BILATERAL_POLICY_HOLDER_ORDER) {
            const other: FactionId = holder === 'HRHB' ? 'RBiH' : 'HRHB';
            if (!isRbihHrhbPair(holder, other)) continue;
            if (!hasMinorityExpulsionPolicy(state, holder)) continue;
            if (!areFactionsAtWar(state, other, holder)) continue;
            const appliedFlag = minorityPolicyAppliedFlag(holder);
            if (typeof state.military.event_flags?.[appliedFlag] === 'number') continue;
            for (const osid of Object.keys(pc).sort(strictCompare)) {
                if (!osid.startsWith('op:')) continue;
                if (pc[osid] !== holder) continue;
                const munId = osid.split(':')[1] as MunicipalityId | undefined;
                if (!munId) continue;
                const scope = getPolicyExpulsionEntry(holder, munId);
                if (!scope) continue;
                const timerKey = `${osid}|${other}`;
                // RB9: a dormant timer (people already expelled here) yields, and the policy
                // wave draws only on those who remain.
                const existingTimer = timerMap[timerKey];
                if (existingTimer && existingTimer.dormant_since_turn === undefined) continue;
                timerMap[timerKey] = {
                    mun_id: munId,
                    from_faction: other,
                    to_faction: holder,
                    started_turn: scope.wave === 'B' ? currentTurn + POLICY_WAVE_B_DELAY_TURNS : currentTurn,
                    cause: 'policy_expulsion',
                    ...carriedDisplacement(existingTimer),
                };
                report.timers_started += 1;
            }
            if (!state.military.event_flags) state.military.event_flags = {};
            state.military.event_flags[appliedFlag] = currentTurn;
        }
    }
    const policyWaveFactions = new Set<FactionId>();

    // 1) Start takeover timers from flipped OSIDs (battle-driven).
    //    Seeds timers for ALL minority factions — not just the defender.
    //    Example: VRS captures HRHB OSID with Bosniak minority → seeds both HRHB and RBiH timers.
    for (const battle of battles) {
        if (!battle.settlement_flipped) continue;
        const toFaction = battle.attacker_faction;
        if (!toFaction) continue;
        const rec = settlements.get(battle.location);
        if (!rec) continue;
        const munId = getMunicipalityIdFromRecord(rec);
        if (!munId) continue;
        const osidKey = battle.osid ?? `sid:${battle.location}`;
        for (const fromFaction of allFactions) {
            if (fromFaction === toFaction) continue;
            if (!areFactionsAtWar(state, fromFaction, toFaction)) continue;
            const timerKey = `${osidKey}|${fromFaction}`;
            // A stale RF-5B policy timer (the OSID changed hands) or a dormant one (RB9) yields
            // to the captor's timer, which inherits the people already expelled.
            if (!isReplaceableTimer(timerMap[timerKey])) continue;
            timerMap[timerKey] = {
                mun_id: munId,
                from_faction: fromFaction,
                to_faction: toFaction,
                started_turn: currentTurn,
                ...carriedDisplacement(timerMap[timerKey])
            };
            report.timers_started += 1;
        }
    }

    const friendlyMunsByFaction = buildFriendlyMunicipalitiesByFaction(state, settlements);
    let passThroughResolver: PassThroughDestinationResolver | undefined;

    // 2) Mature timers into camp state (per-OSID displacement).
    // Count OSIDs per municipality once for per-OSID population split.
    const osidCountByMun = new Map<MunicipalityId, number>();
    {
        const pc2 = state.political.political_controllers;
        if (pc2) {
            for (const key of Object.keys(pc2)) {
                if (!key.startsWith('op:')) continue;
                const mParts = key.split(':');
                if (mParts.length < 2) continue;
                const m = mParts[1] as MunicipalityId;
                osidCountByMun.set(m, (osidCountByMun.get(m) ?? 0) + 1);
            }
        }
    }

    const routedByPoolKey = new Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>();

    const timerKeys = Object.keys(timerMap).sort(strictCompare);
    for (const timerKey of timerKeys) {
        const timer = timerMap[timerKey];
        if (!timer) continue;

        // Extract OSID from timerKey "osid|faction"
        const pipeIdx = timerKey.indexOf('|');
        const osid = pipeIdx >= 0 ? timerKey.substring(0, pipeIdx) : timerKey;

        const currentController = state.political.political_controllers?.[osid];

        // RB9: a dormant timer only remembers who was already expelled; it never fires. Under a safe
        // holder for RETURN_HOLD_WEEKS its routed survivors come home (bounded return rule).
        if (timer.dormant_since_turn !== undefined) {
            applyBoundedReturn(state, timerMap, timerKey, timer, osid, currentController, currentTurn);
            continue;
        }

        // Recapture check: if displaced faction regained control, retire the timer (RB9: a fired
        // timer stays as a dormant record of who was expelled; an unfired one is deleted).
        if (currentController === timer.from_faction) {
            retireTimer(state, timerMap, timerKey, currentTurn, currentController);
            continue;
        }
        // Alliance check: if factions no longer at war, retire the timer
        if (currentController && !areFactionsAtWar(state, timer.from_faction, currentController)) {
            retireTimer(state, timerMap, timerKey, currentTurn, currentController);
            continue;
        }
        // RF-5B: a policy wave belongs to the faction whose policy it is. If that faction no
        // longer holds the OSID (e.g. RS took it), the wave never fires and books nothing.
        if (timer.cause === 'policy_expulsion' && currentController !== timer.to_faction) {
            retireTimer(state, timerMap, timerKey, currentTurn, currentController);
            continue;
        }
        // H-20 (G1): the player's own halt outranks the policy and persists. A policy wave of a human
        // side that has not fired yet never fires once the halt is on record (seeded before the halt
        // only when the card came after the seed: an old save, or a turn whose decision cap held the
        // card back). A bot, headless and a hands-off side never have a halt, so nothing changes there.
        if (timer.cause === 'policy_expulsion' && timer.matured_turn === undefined
            && !hasMinorityExpulsionPolicy(state, timer.to_faction)) {
            retireTimer(state, timerMap, timerKey, currentTurn, currentController);
            continue;
        }

        if (timer.matured_turn === undefined) {
            // ── Branch A: Initial maturation ──
            if (currentTurn - timer.started_turn < TAKEOVER_DISPLACEMENT_DELAY_TURNS) continue;

            const munId = timer.mun_id;
            const dispState = getOrInitDisplacementState(
                state,
                munId,
                state.displacement.displacement_state?.[munId]?.original_population ?? 10000
            );

            const osidRec = osidSettlements?.get(osid);
            const osidCensusPop = getOsidCensusPopulation(osidRec);
            const osidCount = osidCountByMun.get(munId) ?? 1;
            const osidPop = osidCensusPop > 0
                ? osidCensusPop
                : Math.floor(dispState.original_population / osidCount);
            const remainingPop = Math.max(
                0,
                dispState.original_population - dispState.displaced_out - dispState.lost_population
            );
            const osidCensusShare = getOsidCensusHostileShare(osidRec, timer.from_faction);
            let hostileShare: number;
            if (osidCensusShare !== null) {
                hostileShare = Math.min(osidCensusShare, 0.95);
            } else {
                hostileShare = getDynamicHostileShare(
                    munId, timer.from_faction, dispState, population1991ByMun
                );
                hostileShare = Math.min(hostileShare, 0.80);
            }

            const isFrontAdjMatured = allFrontAdjacent || frontOsids.has(osid);
            const isPolicyTimer = timer.cause === 'policy_expulsion';
            if (isPolicyTimer) {
                hostileShare = Math.min(
                    getPolicyTargetShare(osidRec, timer.from_faction, munId, population1991ByMun),
                    0.95
                );
            }
            const initFraction = isPolicyTimer
                ? (getPolicyExpulsionEntry(timer.to_faction, munId)?.fraction ?? 0)
                : getInitialDisplacementFraction(
                    timer.to_faction, timer.from_faction, munId, isFrontAdjMatured
                ) ?? INITIAL_DISPLACEMENT_FRACTION;
            // RF-5B: a capture that replaced a fired policy timer carries that wave's count; the
            // initial wave then takes its fraction of the community that remains.
            const priorDisplaced = timer.cumulative_displaced ?? 0;
            const waveBase = priorDisplaced > 0
                ? Math.floor(Math.max(0, Math.floor(osidPop * hostileShare) - priorDisplaced) * initFraction)
                : Math.floor(osidPop * hostileShare * initFraction);
            const displacementAmount = Math.min(Math.max(0, waveBase), remainingPop);

            if (displacementAmount > 0) {
                const killFraction = getTakeoverKillFraction(munId, timer.from_faction, timer.to_faction);
                const killed = Math.floor(displacementAmount * killFraction);
                const survivors = Math.max(0, displacementAmount - killed);
                const fledAbroad = Math.floor(survivors * getFleeAbroadFraction(munId, timer.from_faction, timer.to_faction));
                const routedToCamp = Math.max(0, survivors - fledAbroad);
                const lost = killed + fledAbroad;
                // RB9 return rule: only the routed survivors can come back (not the killed or the fled abroad).
                timer.cumulative_routed = (timer.cumulative_routed ?? 0) + routedToCamp;

                const beforePop = remainingPop;
                dispState.displaced_out += routedToCamp;
                dispState.lost_population += lost;
                dispState.last_updated_turn = currentTurn;

                const sourcePoolKey = militiaPoolKey(munId, timer.from_faction);
                const sourcePool = state.military.militia_pools?.[sourcePoolKey];
                if (sourcePool && beforePop > 0) {
                    const ratio = displacementAmount / beforePop;
                    const reduction = Math.floor(sourcePool.available * ratio);
                    if (reduction > 0) {
                        sourcePool.available = Math.max(0, sourcePool.available - reduction);
                        timer.cumulative_pool_cut = (timer.cumulative_pool_cut ?? 0) + reduction; // RB9 return rule (E3)
                        sourcePool.updated_turn = currentTurn;
                    }
                }

                if (routedToCamp > 0) {
                    const existingCamp = campMap[munId];
                    const created = !existingCamp;
                    const camp: DisplacementCampState = existingCamp ?? {
                        mun_id: munId,
                        population: 0,
                        started_turn: currentTurn,
                        by_faction: {}
                    };
                    camp.population += routedToCamp;
                    camp.by_faction[timer.from_faction] = (camp.by_faction[timer.from_faction] ?? 0) + routedToCamp;
                    if (created) report.camps_created += 1;
                    campMap[munId] = camp;
                }

                report.timers_matured += 1;
                report.displaced_total += displacementAmount;
                report.killed_total += killed;
                report.fled_abroad_total += fledAbroad;
                report.routed_total += routedToCamp;
                report.source_municipalities.push(munId);

                recordCivilianDisplacementCasualties(state, timer.from_faction, killed, fledAbroad);
                if (isPolicyTimer) policyWaveFactions.add(timer.to_faction);

                appendDisplacementEvent(state, {
                    turn: currentTurn,
                    origin_mun: munId,
                    origin_osid: osid,
                    dest_mun: munId,
                    ethnicity: timer.from_faction,
                    caused_by: timer.to_faction,
                    // RB1: `displaced` is the routed share only. Killed and fled-abroad are
                    // their own fields, and every reader (appendDisplacementEvent's
                    // refugees_created, the Humanitarian Ledger, war dispatches) sums all three.
                    // Logging the whole wave here counted the killed and fled-abroad twice.
                    displaced: routedToCamp,
                    killed,
                    fled_abroad: fledAbroad,
                    settled: 0,
                });
            }

            // Re-route displaced_in population without casualties (pass-through).
            // These people were already displaced once; second displacement incurs no
            // additional killed/fled_abroad and does not increment displaced_total.
            // RF-5B (§6 panel, Calibration seat C1): a policy wave changes no holder, so the
            // people sheltering in the municipality (the holder's own refugees above all) are
            // not moved on; re-routing them handed the expelling side extra manpower.
            // A4 (RB2, §6 seats round 3, 2026-11-22, narrowed after the round-1 rule failed its pair): at a
            // capture only the captor's OWN sheltered people stay; every other group, an ally's refugees
            // included, is moved on as before, recorded as a turn-report row (`capture_pass_through`) and
            // never as a displacement event.
            // A9 (SD13, §6 broader panel round 1, 2026-11-24; DISPLACEMENT_MASTER §10.6): the pass-through
            // runs only when the capture leaves the captor as the municipality's majority holder. Taking an
            // outlying settlement that does not change the municipality's holder moves no sheltered group.
            // A9 B2 (SD13, owner rulings 2-3 of 2026-11-24, inside the round-1 A5b shape): a group whose side
            // still holds a supplied settlement in the municipality stays, and any other group goes only to
            // supplied ground in a territorial body linked to the source; with none reachable it stays.
            // Pass-through applies only to ground that is actually taken, never across enemy lines.
            if (
                !isPolicyTimer &&
                dispState.displaced_in > 0 &&
                getMunicipalityController(state, [], munId) === timer.to_faction
            ) {
                const byFaction = dispState.displaced_in_by_faction ?? {};
                const fKeys = Object.keys(byFaction).sort(strictCompare);
                for (const fid of fKeys) {
                    if (fid === timer.to_faction) continue;
                    let rem = Math.max(0, Math.floor(byFaction[fid] ?? 0));
                    if (rem <= 0) continue;
                    let destinations: Set<MunicipalityId> = friendlyMunsByFaction[fid];
                    if (passThroughReach) {
                        passThroughResolver ??= passThroughReach();
                        const reachable = passThroughResolver(fid, munId);
                        if (reachable === null || reachable.size === 0) continue;
                        destinations = new Set([...(destinations ?? [])].filter(m => reachable.has(m)));
                    }
                    const result = routeDisplacedCohort(
                        state, munId, fid, rem,
                        destinations,
                        settlements, routedByPoolKey, report,
                        { causedByFaction: timer.to_faction, reportReason: 'capture_pass_through' }
                    );
                    byFaction[fid] = result.remaining;
                }
                const remainder = (Object.values(byFaction) as number[])
                    .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0)
                    .reduce((sum, v) => sum + v, 0);
                dispState.displaced_in = remainder;
            }

            // Mark timer as matured instead of deleting
            timer.matured_turn = currentTurn;
            timer.cumulative_displaced = priorDisplaced + displacementAmount;  // Sustained pool accounts for initial fire
        } else {
            // ── Branch B: Sustained displacement ──
            // RF-5B: a policy wave is one bounded expulsion; it never drains further.
            if (timer.cause === 'policy_expulsion') continue;
            const munId = timer.mun_id;
            const dispState = getOrInitDisplacementState(
                state,
                munId,
                state.displacement.displacement_state?.[munId]?.original_population ?? 10000
            );

            const osidRecB = osidSettlements?.get(osid);
            const osidCensusPopB = getOsidCensusPopulation(osidRecB);
            const osidCount = osidCountByMun.get(munId) ?? 1;
            const osidPop = osidCensusPopB > 0
                ? osidCensusPopB
                : Math.floor(dispState.original_population / osidCount);
            const remainingPop = Math.max(
                0,
                dispState.original_population - dispState.displaced_out - dispState.lost_population
            );
            const osidCensusShareB = getOsidCensusHostileShare(osidRecB, timer.from_faction);
            let hostileShare: number;
            if (osidCensusShareB !== null) {
                hostileShare = Math.min(osidCensusShareB, 0.95);
            } else {
                hostileShare = getDynamicHostileShare(
                    munId, timer.from_faction, dispState, population1991ByMun
                );
                hostileShare = Math.min(hostileShare, 0.80);
            }

            const initialMinority = Math.floor(osidPop * hostileShare);
            const cumulativeDisplaced = timer.cumulative_displaced ?? 0;
            const remainingMinority = Math.max(0, initialMinority - cumulativeDisplaced);

            if (remainingMinority < SUSTAINED_MIN_REMAINING) {
                retireTimer(state, timerMap, timerKey, currentTurn, currentController);
                continue;
            }

            const sustainedAmount = Math.min(
                Math.floor(remainingMinority * SUSTAINED_DISPLACEMENT_RATE),
                remainingPop
            );
            if (sustainedAmount <= 0) continue;

            const killFraction = getTakeoverKillFraction(munId, timer.from_faction, timer.to_faction);
            const killed = Math.floor(sustainedAmount * killFraction);
            const survivors = Math.max(0, sustainedAmount - killed);
            const fledAbroad = Math.floor(survivors * getFleeAbroadFraction(munId, timer.from_faction, timer.to_faction));
            const directRouted = Math.max(0, survivors - fledAbroad);
            const lost = killed + fledAbroad;
            // RB9 return rule: only the routed survivors can come back.
            timer.cumulative_routed = (timer.cumulative_routed ?? 0) + directRouted;

            const beforePop = remainingPop;
            dispState.displaced_out += directRouted;
            dispState.lost_population += lost;
            dispState.last_updated_turn = currentTurn;

            // Reduce source militia pool proportionally
            const sourcePoolKey = militiaPoolKey(munId, timer.from_faction);
            const sourcePool = state.military.militia_pools?.[sourcePoolKey];
            if (sourcePool && beforePop > 0) {
                const ratio = sustainedAmount / beforePop;
                const reduction = Math.floor(sourcePool.available * ratio);
                if (reduction > 0) {
                    sourcePool.available = Math.max(0, sourcePool.available - reduction);
                    timer.cumulative_pool_cut = (timer.cumulative_pool_cut ?? 0) + reduction; // RB9 return rule (E3)
                    sourcePool.updated_turn = currentTurn;
                }
            }

            timer.cumulative_displaced = cumulativeDisplaced + sustainedAmount;

            // Direct routing to friendly municipalities (no camp — sustained = civilian flight)
            if (directRouted > 0) {
                routeDisplacedCohort(
                    state, munId, timer.from_faction, directRouted,
                    friendlyMunsByFaction[timer.from_faction],
                    settlements, routedByPoolKey, report,
                    { trackMilitiaPool: true, eventReason: 'sustained_displacement', causedByFaction: timer.to_faction }
                );
            }

            recordCivilianDisplacementCasualties(state, timer.from_faction, killed, fledAbroad);

            appendDisplacementEvent(state, {
                turn: currentTurn,
                origin_mun: munId,
                origin_osid: osid,
                dest_mun: munId,
                ethnicity: timer.from_faction,
                caused_by: timer.to_faction,
                // RB1: the routed share only (see the policy-timer event above).
                displaced: directRouted,
                killed,
                fled_abroad: fledAbroad,
                settled: 0,
            });

            report.sustained_fires += 1;
            report.sustained_displaced_total += sustainedAmount;
            report.displaced_total += sustainedAmount;
            report.killed_total += killed;
            report.fled_abroad_total += fledAbroad;
            report.routed_total += directRouted;
            report.source_municipalities.push(munId);
        }
    }

    // RF-5B bright line: an expulsion carried out under a recorded policy is an authorized
    // war crime, recorded once per faction on the turn its first wave displaces anyone. This
    // feeds the §2a `authorized_cleansing_condemnation` input exactly as a paramilitary
    // sweep does.
    for (const faction of [...policyWaveFactions].sort(strictCompare)) {
        const flag = minorityPolicyWarCrimeFlag(faction);
        if (state.military.event_flags?.[flag] === true) continue;
        // The flag is set only when the record was actually written (capital present).
        if (!recordWarCrime(state, faction)) continue;
        if (!state.military.event_flags) state.military.event_flags = {};
        state.military.event_flags[flag] = true;
    }

    // 3) Mature camp state into routed arrivals (urban-center order + capacity overflow).
    const campMuns = Object.keys(campMap).sort(strictCompare) as MunicipalityId[];
    for (const sourceMunId of campMuns) {
        const camp = campMap[sourceMunId];
        if (!camp) continue;
        if (currentTurn - camp.started_turn < CAMP_REROUTE_DELAY_TURNS) continue;

        let routedFromCamp = 0;
        const factionKeys = Object.keys(camp.by_faction).sort(strictCompare);
        for (const factionId of factionKeys) {
            const cohortAmount = Math.max(0, Math.floor(camp.by_faction[factionId] ?? 0));
            if (cohortAmount <= 0) continue;
            const result = routeDisplacedCohort(
                state, sourceMunId, factionId, cohortAmount,
                friendlyMunsByFaction[factionId],
                settlements, routedByPoolKey, report,
                { trackMilitiaPool: true, requireBrigadePresence: true, eventReason: 'camp_reroute_urban_motherland' }
            );
            camp.by_faction[factionId] = result.remaining;
            routedFromCamp += result.routed;
        }

        camp.population = (Object.values(camp.by_faction) as number[])
            .filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
            .reduce((sum, v) => sum + v, 0);

        if (routedFromCamp > 0) report.camps_routed += 1;
        if (camp.population <= 0) delete campMap[sourceMunId];
    }

    addOneTurnPoolContribution(state, routedByPoolKey);

    report.source_municipalities = orderedUnique(report.source_municipalities).sort(strictCompare);
    report.routing.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        return strictCompare(a.to_mun, b.to_mun);
    });
    return report;
}
