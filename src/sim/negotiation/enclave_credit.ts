/**
 * No territory credit for an overrun enclave (DC A6 follow-up 1; Pyrrhic panel 2026-11-09,
 * historian, sensitive-history, canon and game-design seats, unanimous with conditions).
 *
 * A6 keeps an enclave held at signature with its defenders; a fallen enclave follows the map.
 * Without this rule, taking an enclave first is what moves it, so the capture paid at the
 * table (+0.37 points of RS share for Srebrenica on the retained save) and atrocity could
 * reward. This is a territory-credit rule, not a condemnation: when the capital of one of
 * the three eastern safe-area enclaves with an explicit cell list (Srebrenica, Žepa,
 * Goražde) is held at the end by a faction other than its defender, that faction's graded
 * territory share leaves out the enclave cells it holds. The map is unchanged (Dayton did
 * give Srebrenica and Žepa to RS); only the grade, and every preview of it, stops crediting
 * them. It names no event and carries no flag.
 *
 * Read at the verdict and in grade previews only; nothing here is written to state.
 * Deterministic: fixed enclave order, sorted cell lists.
 */
import type { FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { ENCLAVE_DEFINITIONS } from '../combat/enclave_resilience.js';
import osidAreasJson from '../../../data/derived/operational/osid_areas.json';

/** The UN safe areas of UNSCR 819/824 that carry an explicit cell list. Bihać (no list) is a recorded residual. */
export const CREDIT_GUARDED_ENCLAVES = ['gorazde', 'srebrenica', 'zepa'] as const;

const AREAS = osidAreasJson as { total_area_km2: number; areas: Record<string, number> };

const GUARDED = CREDIT_GUARDED_ENCLAVES.map((id) => {
    const def = ENCLAVE_DEFINITIONS.find((e) => e.id === id);
    if (!def?.capital_osid || !def.osid_list) throw new Error(`enclave ${id} needs a capital and a cell list`);
    return { id, defender: def.faction, capital: def.capital_osid, cells: [...def.osid_list].sort(strictCompare) };
});

type Controllers = Readonly<Record<string, FactionId | null | undefined>>;

/**
 * The enclave cells `faction` holds on `end` in enclaves it overran: the capital in its hands
 * on the wartime `front` (a capture, not a plan's assignment of an enclave its defenders held).
 */
export function overrunEnclaveCells(front: Controllers, end: Controllers, faction: string): string[] {
    const out: string[] = [];
    for (const e of GUARDED) {
        if (faction === e.defender || front[e.capital] !== faction) continue;
        for (const o of e.cells) if (end[o] === faction) out.push(o);
    }
    return out.sort(strictCompare);
}

/** Percentage points of the country (by area) that `faction` holds in enclaves it overran. */
export function overrunEnclaveSharePct(front: Controllers, end: Controllers, faction: string): number {
    const km2 = overrunEnclaveCells(front, end, faction).reduce((s, o) => s + (AREAS.areas[o] ?? 0), 0);
    return AREAS.total_area_km2 > 0 ? (km2 / AREAS.total_area_km2) * 100 : 0;
}

/** A territory share with the overrun enclave cells left out (never below zero). */
export function creditedTerritoryPct(rawPct: number, front: Controllers, end: Controllers, faction: string): number {
    const share = overrunEnclaveSharePct(front, end, faction);
    return share > 0 ? Math.max(0, rawPct - share) : rawPct;
}
