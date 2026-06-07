/**
 * Contain-enclave per-turn DIAGNOSTIC (contain Lane 1).
 *
 * Design: docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md §4
 * (Lane 1 — diagnostic predicate, ZERO behavior change).
 *
 * Records which `(besiegingFaction, enclave)` pairs are currently *containable*
 * per `isEnclaveContainable`, plus isolation telemetry, to a per-turn report
 * surface (TurnReport.contain_diagnostic). This surface is NOT read by any
 * sim/combat/targeting path — it feeds NO stance, NO target generation, NO
 * outcome. Byte-identity of the sim is the gate; this module only observes.
 *
 * Faction-agnostic by construction: it enumerates every (besieger, enclave)
 * pair where besieger ≠ enclave.faction, so it surfaces both the VRS-vs-eastern
 * and the ARBiH-vs-HVO containment signals through the identical path.
 *
 * Deterministic: sorted iteration (enclave id, then faction id); no RNG, no
 * wall-clock; pure reads of ENCLAVE_DEFINITIONS + the passed BFS report +
 * the enclave-resilience isolation counters already on state.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../../state/supply_reachability_osid.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    ENCLAVE_DEFINITIONS,
    isEnclaveContainable,
    osidBelongsToEnclave,
} from './enclave_resilience.js';

/** The three canonical faction IDs, sorted, used to enumerate candidate besiegers.
 *  Typed literal (no escape-hatch cast) — each entry is compiler-checked as a
 *  FactionId; .slice() preserves the element type, .sort() mutates in place. */
const FACTION_LITERALS: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];
const ALL_FACTIONS: readonly FactionId[] = FACTION_LITERALS.slice().sort(strictCompare);

/** One `(besiegingFaction, enclave)` containment observation for this turn. */
export interface ContainPairDiagnostic {
    /** Enclave id (e.g. 'srebrenica', 'zepce'). */
    enclave_id: string;
    /** The enclave's own (defending) faction. */
    enclave_faction: FactionId;
    /** The candidate besieging faction (≠ enclave_faction). */
    besieging_faction: FactionId;
    /** isEnclaveContainable(state, capital_or_member_osid, besieger, reach) result. */
    containable: boolean;
    /** How many of the enclave's member OSIDs the besieger could contain this turn
     *  (i.e. pass the predicate). */
    containable_osid_count: number;
    /** How many of the enclave's member OSIDs the enclave faction's BFS marks isolated. */
    isolated_osid_count: number;
    /** Enclave resilience isolation_turns counter (from state.political.enclave_resilience). */
    isolation_turns: number;
    /** The enclave's resilience_start_turn (0 when unspecified). */
    resilience_start_turn: number;
}

export interface ContainDiagnosticReport {
    turn: number;
    /** Total (besieger, enclave) pairs that are containable this turn. */
    containable_pairs: number;
    /** Per-pair observations, sorted by (enclave_id, besieging_faction). */
    pairs: ContainPairDiagnostic[];
}

/**
 * Build the per-turn contain diagnostic. PURE w.r.t. sim state — reads only,
 * mutates nothing. The caller stores the result on TurnReport (a non-persisted
 * per-turn diagnostic surface), never on GameState.
 *
 * @param state       current game state (for turn + enclave_resilience counters)
 * @param supplyReach the BFS supply-reachability report (provides isolated_osids)
 */
export function buildContainDiagnostic(
    state: GameState,
    supplyReach: SupplyReachabilityOsidReport | undefined | null,
): ContainDiagnosticReport {
    const turn = state.meta?.turn ?? 0;
    const resilience = state.political?.enclave_resilience;

    const pairs: ContainPairDiagnostic[] = [];

    const sortedEnclaves = [...ENCLAVE_DEFINITIONS].sort((a, b) => strictCompare(a.id, b.id));

    for (const enclave of sortedEnclaves) {
        // Member OSIDs of this enclave that the enclave faction's BFS marks isolated.
        const facEntry = supplyReach?.factions?.find((f) => f.faction_id === enclave.faction);
        const isolatedSet = facEntry ? new Set(facEntry.isolated_osids) : new Set<string>();

        // Enumerate this enclave's member OSIDs once (deterministic source order).
        const memberOsids = enclave.osid_list ?? [];
        // For prefix-based enclaves (Sarajevo/Bihać) there is no explicit member
        // list here; isolation is reported per-OSID by the BFS, so we intersect
        // the besieger-candidate check against the isolated set directly.
        const isolatedMembers = [...isolatedSet]
            .filter((osid) => osidBelongsToEnclave(osid, enclave))
            .sort(strictCompare);
        const candidateOsids = (memberOsids.length > 0 ? memberOsids : isolatedMembers)
            .slice()
            .sort(strictCompare);

        const isolatedOsidCount = candidateOsids.filter((osid) => isolatedSet.has(osid)).length;
        const isolationTurns = resilience ? readResilienceIsolationTurns(resilience, enclave.id) : 0;

        for (const besieger of ALL_FACTIONS) {
            if (besieger === enclave.faction) continue;

            let containableCount = 0;
            for (const osid of candidateOsids) {
                if (isEnclaveContainable(state, osid, besieger, supplyReach)) containableCount++;
            }

            pairs.push({
                enclave_id: enclave.id,
                enclave_faction: enclave.faction,
                besieging_faction: besieger,
                containable: containableCount > 0,
                containable_osid_count: containableCount,
                isolated_osid_count: isolatedOsidCount,
                isolation_turns: isolationTurns,
                resilience_start_turn: enclave.resilience_start_turn ?? 0,
            });
        }
    }

    // Stable final sort (enclave_id, besieging_faction) regardless of insertion order.
    pairs.sort((a, b) => {
        const e = strictCompare(a.enclave_id, b.enclave_id);
        if (e !== 0) return e;
        return strictCompare(a.besieging_faction, b.besieging_faction);
    });

    return {
        turn,
        containable_pairs: pairs.filter((p) => p.containable).length,
        pairs,
    };
}

/** Read the isolation_turns counter for an enclave from the resilience map. */
function readResilienceIsolationTurns(
    resilience: NonNullable<GameState['political']['enclave_resilience']>,
    enclaveId: string,
): number {
    const entry = resilience[enclaveId];
    if (entry === undefined) return 0;
    if (typeof entry === 'number') return 0; // bare-number legacy form carries no isolation_turns
    return entry.isolation_turns ?? 0;
}
