/**
 * Local Truces — Graz Accords (RS-HRHB Non-Aggression).
 *
 * Historical context: On 6 May 1992 (~week 4), Bosnian Serb and Bosnian Croat
 * leaders met in Graz, Austria, and agreed to divide Bosnia between them.
 * A de facto non-aggression pact held in Herzegovina and around Kiseljak.
 * Fighting continued in the Posavina corridor, Jajce, and central Bosnia
 * where RS/HRHB forces were entangled with each other via RBiH presence.
 *
 * Design (v2): Corps-pair truces + OSID-level Kiseljak exclusion.
 * - Herzegovina: vrs_herzegovina ↔ hvo_southeast_herzegovina
 *                vrs_2nd_krajina ↔ hvo_tomislavgrad
 * - Kiseljak: 9 HRHB-held OSIDs (VRS cannot target) + 7 VRS-held OSIDs (HRHB cannot target)
 * - NOT covered: Posavina, central Bosnia outside Kiseljak, Krajina HRHB cells
 *
 * Player agency: Accept/decline at w4. Break Herzegovina or Kiseljak independently.
 *
 * Deterministic: no randomness, no timestamps.
 */

import type { FactionId, GameState } from '../state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Week at which the Graz Accords fire (6 May 1992 ≈ week 4 of the scenario). */
export const GRAZ_ACCORDS_TURN = 4;

/**
 * Corps pairs bound by the Herzegovina truce.
 * When active, these corps do not generate attack orders against each other's territory.
 *
 * Design: West Herzegovina truce (2KK ↔ Tomislavgrad) is immediate at Graz (w4).
 * East Herzegovina truce (VRS Herz ↔ HVO SE Herz) activates AFTER Op Jackal ends —
 * historically, HVO-VRS fought for east Mostar / Stolac through June 1992.
 */
export const GRAZ_CORPS_PAIRS_WEST: readonly [string, string][] = [
    ['vrs_2nd_krajina', 'hvo_tomislavgrad'],
];
export const GRAZ_CORPS_PAIRS_EAST: readonly [string, string][] = [
    ['vrs_herzegovina', 'hvo_southeast_herzegovina'],
];
export const GRAZ_CORPS_PAIRS: readonly [string, string][] = [
    ...GRAZ_CORPS_PAIRS_WEST,
    ...GRAZ_CORPS_PAIRS_EAST,
];

/**
 * Kiseljak OSID-level exclusion: VRS cannot target these HRHB-held OSIDs.
 */
export const GRAZ_KISELJAK_VRS_EXCLUSION = new Set([
    'op:kiseljak:azapovici_2',
    'op:kiseljak:bilalovac_2',
    'op:kiseljak:brnjaci_2',
    'op:kiseljak:bukovica',
    'op:kiseljak:drazevici',
    'op:kiseljak:gromiljak_2',
    'op:kiseljak:kiseljak_2',
]);

/**
 * Kiseljak OSID-level exclusion: HRHB cannot target these VRS-held OSIDs bordering Kiseljak.
 */
export const GRAZ_KISELJAK_HRHB_EXCLUSION = new Set([
    'op:hadzici:misevici_2',
    'op:hadzici:tarcin_2',
    'op:ilidza:rudnik_2',
    'op:visoko:bradve_2',
    'op:visoko:buzic_mahala_2',
    'op:visoko:rajcici_2',
    'op:visoko:stuparici_2',
]);

/**
 * Number of turns an aggression spike lasts after the opponent breaks the truce.
 */
const TRUCE_BREAK_SPIKE_TURNS = 6;

/** Aggression modifier applied to the wronged faction after truce break. */
const TRUCE_BREAK_AGGRESSION_SPIKE = 0.25;

// ═══════════════════════════════════════════════════════════════════════════
// Core queries
// ═══════════════════════════════════════════════════════════════════════════

/** Return true if the Graz Accords are currently active (fired and accepted by both). */
export function isGrazAccordsActive(state: GameState): boolean {
    if (state.political.vienna_declaration_turn == null) return false;
    if ((state.meta?.turn ?? 0) < state.political.vienna_declaration_turn) return false;
    const accepted = state.political.vienna_accepted;
    if (!accepted) return false;
    return accepted['RS'] === true && accepted['HRHB'] === true;
}

/** Return true if the Herzegovina corps-pair truce is active (not broken). */
export function isHerzegovinaTruceActive(state: GameState): boolean {
    return isGrazAccordsActive(state) && state.political.vienna_herzegovina_broken_by == null;
}

/** Return true if the Kiseljak OSID exclusion is active (not broken). */
export function isKiseljakExclusionActive(state: GameState): boolean {
    return isGrazAccordsActive(state) && state.political.vienna_kiseljak_broken !== true;
}

/**
 * Return the truce partner corps for a given corps under Herzegovina truce.
 * Returns null if the corps is not in a Graz corps pair.
 */
export function getCorpsTrucePartner(corpsId: string): string | null {
    for (const [a, b] of GRAZ_CORPS_PAIRS) {
        if (corpsId === a) return b;
        if (corpsId === b) return a;
    }
    return null;
}

/**
 * Return true if this corps is part of a Graz corps pair.
 */
export function isCorpsInGrazPair(corpsId: string): boolean {
    return getCorpsTrucePartner(corpsId) !== null;
}

/** Return true if this corps is in the EAST Herzegovina pair (VRS Herz ↔ HVO SE Herz). */
export function isEastHerzegovinaPair(corpsId: string): boolean {
    return GRAZ_CORPS_PAIRS_EAST.some(([a, b]) => corpsId === a || corpsId === b);
}

/** Return true if this corps is in the WEST Herzegovina pair (2KK ↔ Tomislavgrad). */
export function isWestHerzegovinaPair(corpsId: string): boolean {
    return GRAZ_CORPS_PAIRS_WEST.some(([a, b]) => corpsId === a || corpsId === b);
}

/**
 * Return the truce partner for a given faction under the Graz Accords.
 * RS ↔ HRHB. RBiH has no truce partner.
 */
export function getTrucePartner(faction: FactionId): FactionId | null {
    if (faction === 'RS') return 'HRHB';
    if (faction === 'HRHB') return 'RS';
    return null;
}

/**
 * Check if an OSID is protected from a faction by the Kiseljak exclusion.
 * Returns true if the faction should NOT attack this OSID.
 */
export function isKiseljakExcluded(osid: string, faction: FactionId): boolean {
    if (faction === 'RS') return GRAZ_KISELJAK_VRS_EXCLUSION.has(osid);
    if (faction === 'HRHB') return GRAZ_KISELJAK_HRHB_EXCLUSION.has(osid);
    return false;
}

/**
 * RS corps exempt from the faction-level Graz block.
 * These corps are historically documented as fighting HRHB forces in the Posavina corridor —
 * the Graz Accords explicitly did NOT cover that theatre.
 * vrs_1st_krajina: fights HVO Orašje pocket throughout 1992.
 * vrs_2nd_krajina: falls through to the corps-pair mechanism (which then blocks it).
 *
 * NOTE: This blanket exemption lets 1KK take HRHB territory in central Bosnia (e.g. Žepče)
 * which is historically wrong — VRS never captured Žepče (7.3% Serb, no strategic value).
 * The real fix is strategic targeting in bot AI (demographic affinity + line-flattening
 * assessment), not Graz scoping. See backlog: bot_strategic_targeting_design.
 */
// Only 1KK is exempt — fights HVO Orašje pocket throughout 1992.
// 2KK REMOVED from exemption: it was falling through to the corps-pair
// mechanism but the faction-level block should also apply. 2KK historically
// did NOT fight HVO in Prozor/Gornji Vakuf — that's Herzegovina Corps area.
export const GRAZ_EXEMPT_RS_CORPS = new Set([
    'vrs_1st_krajina',
]);

/** HRHB corps exempt from Graz — Posavina fighting + Cincar/Mistral 1/Jajce */
export const GRAZ_EXEMPT_HRHB_CORPS = new Set([
    'hvo_northwest_bosnia',  // Orašje pocket — Posavina corridor fighting
    'hvo_tomislavgrad',  // Op Cincar (Nov 1994) / Mistral 1 (Jun 1995) / Jajce 95 — documented HV-HVO bypasses of Graz against VRS Krajina (BB v2 ch. 28; ICTY Gotovina IT-06-90 §44-58)
]);

/**
 * Should this corps skip offensive targeting against the given OSID's controller?
 * Combines faction-level RS→HRHB block + corps-pair truce check + Kiseljak exclusion.
 * Used by bot_corps_ai directive generation.
 *
 * Check order:
 * 1. Faction-level RS→HRHB block for all non-exempt RS corps (covers SRK, Drina, etc.)
 * 2. Herzegovina corps-pair truce (covers 2KK ↔ Tomislavgrad, VRS Herz ↔ HVO SE Herz)
 * 3. Kiseljak OSID-level exclusion (any RS corps, any HRHB corps)
 */
export function shouldGrazBlockAttack(
    state: GameState,
    corpsId: string,
    faction: FactionId,
    targetOsid: string,
    targetController: FactionId | string,
): boolean {
    if (!isGrazAccordsActive(state)) return false;

    const trucePartnerFaction = getTrucePartner(faction);
    if (!trucePartnerFaction) return false;
    if (targetController !== trucePartnerFaction) return false;

    // Faction-level RS→HRHB block: any RS corps not explicitly exempt is blocked.
    // The Graz Accords covered the RS-HRHB ceasefire across all of Bosnia except
    // the Posavina corridor where RS and HVO were already engaged in fighting.
    // This catches SRK (vrs_sarajevo_romanija), Drina (vrs_drina), 5th Corps, etc.
    if (isHerzegovinaTruceActive(state) && faction === 'RS' && !GRAZ_EXEMPT_RS_CORPS.has(corpsId)) {
        return true;
    }

    // HRHB → RS faction-level block (bilateral ceasefire).
    // East-pair corps (hvo_southeast_herzegovina) are excluded here — their time-gated
    // truce (not blocked before Op Jackal ends; blocked after) is handled in the
    // corps-pair block below. All other non-exempt HRHB corps are blocked.
    if (faction === 'HRHB' && (targetController === 'RS')
        && isHerzegovinaTruceActive(state)
        && !GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)
        && !isEastHerzegovinaPair(corpsId)) {
        return true;
    }

    // Herzegovina corps-pair truce: block if corps is in a pair and truce is unbroken.
    // West pair (2KK ↔ Tomislavgrad) activates at Graz (w4).
    // East pair (VRS Herz ↔ HVO SE Herz) activates only after Op Jackal ends.
    if (isHerzegovinaTruceActive(state) && isCorpsInGrazPair(corpsId)) {
        // Honor the per-faction exemption sets in the corps-pair branch too — a
        // corps explicitly exempt from Graz (e.g. hvo_tomislavgrad for Op Cincar
        // and downstream Mistral 1 / Jajce cascade) is not blocked even though it
        // sits in a pair. Otherwise the West-pair branch would always return true.
        if (faction === 'HRHB' && GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) return false;
        if (faction === 'RS' && GRAZ_EXEMPT_RS_CORPS.has(corpsId)) return false;
        if (isWestHerzegovinaPair(corpsId)) {
            return true; // West truce is always active when Graz is active
        }
        if (isEastHerzegovinaPair(corpsId) && state.political.graz_east_herzegovina_active_turn != null) {
            return true; // East truce only after Op Jackal ends
        }
        // East pair before Op Jackal ends → NOT blocked
        if (isEastHerzegovinaPair(corpsId)) {
            return false;
        }
        return true; // Fallback for any future pairs
    }

    // Kiseljak OSID exclusion: block specific OSIDs regardless of corps
    if (isKiseljakExclusionActive(state) && isKiseljakExcluded(targetOsid, faction)) {
        return true;
    }

    return false;
}

/**
 * Return extra aggression modifier for `faction` because the opponent broke the truce.
 * Returns TRUCE_BREAK_AGGRESSION_SPIKE for TRUCE_BREAK_SPIKE_TURNS turns after the break.
 * Returns 0 otherwise.
 */
export function getTruceBreakAggressionBonus(faction: FactionId, state: GameState): number {
    if (!isGrazAccordsActive(state)) return 0;
    const partner = getTrucePartner(faction);
    if (!partner) return 0;

    const brokenTurn = state.political.truce_broken_turn?.[partner];
    if (brokenTurn == null) return 0;

    const currentTurn = state.meta?.turn ?? 0;
    if (currentTurn < brokenTurn + TRUCE_BREAK_SPIKE_TURNS) {
        return TRUCE_BREAK_AGGRESSION_SPIKE;
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// State mutation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fire the Graz Accords event if it hasn't fired yet and the current
 * turn is >= GRAZ_ACCORDS_TURN.
 *
 * Sets state.vienna_declaration_turn and auto-accepts for bot factions.
 * Returns the narrative text if fired, or null if already fired or not yet time.
 */
export function checkAndFireGrazAccords(state: GameState): string | null {
    if (state.political.vienna_declaration_turn != null) return null; // already fired
    if (state.meta?.phase !== 'war') return null;
    const turn = state.meta?.turn ?? 0;
    if (turn < GRAZ_ACCORDS_TURN) return null;

    state.political.vienna_declaration_turn = turn;

    // Auto-accept for both factions (bot behavior).
    // Player-controlled factions get accept/decline via IPC (future).
    if (!state.political.vienna_accepted) state.political.vienna_accepted = {};
    state.political.vienna_accepted['RS'] = true;
    state.political.vienna_accepted['HRHB'] = true;

    return '6 May 1992 — Karadžić and Boban meet in Graz, Austria, and agree to divide Bosnia between them. '
        + 'Herzegovina Corps and HVO Southeast Herzegovina observe a ceasefire. '
        + 'Kiseljak pocket forces hold positions. '
        + 'Posavina corridor fighting continues unabated.';
}

/**
 * Record that `faction` broke the RS-HRHB truce by attacking the partner's territory.
 * Determines which sub-truce was broken (Herzegovina corps-pair or Kiseljak exclusion).
 * Returns the warning text if newly recorded, or null if not applicable.
 */
export function recordTruceBroken(faction: FactionId, targetOsid: string, state: GameState): string | null {
    if (!isGrazAccordsActive(state)) return null;
    const partner = getTrucePartner(faction);
    if (!partner) return null;

    const factionName = faction === 'RS' ? 'Serb forces' : 'Croat forces';
    const partnerName = partner === 'HRHB' ? 'Croat' : 'Serb';

    // Check if this is a Kiseljak exclusion break
    if (isKiseljakExclusionActive(state) && isKiseljakExcluded(targetOsid, faction)) {
        state.political.vienna_kiseljak_broken = true;
        if (!state.political.truce_broken_turn) state.political.truce_broken_turn = {};
        if (state.political.truce_broken_turn[faction] == null) {
            state.political.truce_broken_turn[faction] = state.meta?.turn ?? 0;
        }
        return `Warning: ${factionName} are attacking ${partnerName}-held territory near Kiseljak, `
            + `breaking the Kiseljak exclusion zone. ${partnerName} forces will respond aggressively.`;
    }

    // Check if this is a Herzegovina corps-pair break
    if (isHerzegovinaTruceActive(state)) {
        state.political.vienna_herzegovina_broken_by = faction;
        if (!state.political.truce_broken_turn) state.political.truce_broken_turn = {};
        if (state.political.truce_broken_turn[faction] == null) {
            state.political.truce_broken_turn[faction] = state.meta?.turn ?? 0;
        }
        return `Warning: ${factionName} are attacking ${partnerName}-held territory in Herzegovina, `
            + `breaking the Graz Accords ceasefire. ${partnerName} forces will respond aggressively.`;
    }

    return null;
}
