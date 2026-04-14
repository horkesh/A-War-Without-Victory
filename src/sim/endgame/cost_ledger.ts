/**
 * Cost Ledger — downstream aggregation of war costs.
 *
 * This is a REFLECTION surface, not a new owner. It reads upstream truth
 * (casualty ledger, displacement, verdict, rupture consequences) and
 * produces a serializable summary for comparison and narrative surfaces.
 *
 * Deterministic: no Math.random(), no timestamps, sorted iteration via strictCompare.
 */

import type { GameState } from '../../state/game_state.js';
import type { RuptureConsequence, OutcomeClass } from '../../state/negotiation_types.js';
import { computeFactionVerdict } from '../negotiation/scoring.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: readonly string[] = ['HRHB', 'RBiH', 'RS'] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CostLedgerEntry {
    faction: string;
    military_killed: number;
    military_wounded: number;
    civilian_casualties_caused: number;
    refugees_created: number;
    territory_controlled_pct: number;
    enclaves_held: string[];
    enclaves_lost: string[];
    war_crimes_events: number;
    outcome_class: OutcomeClass;
    condemnation_flags: string[];
}

export interface CostLedger {
    war_duration_weeks: number;
    entries: CostLedgerEntry[];
    rupture_consequences: { id: string; perpetrator_faction: string; description: string }[];
    total_military_killed: number;
    total_civilian_killed: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build cost ledger from current game state. Pure, deterministic.
 * Reads upstream truth only — does not write or own any state.
 */
export function buildCostLedger(state: GameState): CostLedger {
    const turn = state.meta?.turn ?? 0;
    const casualtyLedger = state.military?.casualty_ledger ?? {};
    const negotiation = state.military?.negotiation;
    const capitalMap = negotiation?.capital ?? {};
    const ruptures = negotiation?.rupture_consequences ?? [];
    const civCasualties = state.displacement?.civilian_casualties ?? {};

    // Build entries sorted by faction ID for determinism
    const factions = [...CANONICAL_FACTIONS].sort(strictCompare);
    const entries: CostLedgerEntry[] = [];
    let totalMilitaryKilled = 0;
    let totalCivilianKilled = 0;

    for (const faction of factions) {
        // Read from casualty ledger (upstream truth for military casualties)
        const factionCasualties = casualtyLedger[faction];
        const militaryKilled = factionCasualties?.killed ?? 0;
        const militaryWounded = factionCasualties?.wounded ?? 0;
        totalMilitaryKilled += militaryKilled;

        // Read from negotiation capital (upstream truth for territory, enclaves, etc.)
        const capital = capitalMap[faction];
        const territoryPct = capital?.territory_controlled_pct ?? 0;
        const refugeesCreated = capital?.refugees_created ?? 0;
        const enclavesHeld = [...(capital?.enclaves_held ?? [])].sort(strictCompare);
        const enclavesLost = [...(capital?.enclaves_lost ?? [])].sort(strictCompare);
        const warCrimesEvents = capital?.war_crimes_events ?? 0;
        const civilianCasualtiesCaused = capital?.civilian_casualties_caused ?? 0;

        // Read civilian killed from displacement state (ethnicity-aligned)
        const civKilled = civCasualties[faction]?.killed ?? 0;
        totalCivilianKilled += civKilled;

        // Compute verdict for outcome_class and condemnation_flags
        const verdict = computeFactionVerdict(state, faction);

        entries.push({
            faction,
            military_killed: militaryKilled,
            military_wounded: militaryWounded,
            civilian_casualties_caused: civilianCasualtiesCaused,
            refugees_created: refugeesCreated,
            territory_controlled_pct: territoryPct,
            enclaves_held: enclavesHeld,
            enclaves_lost: enclavesLost,
            war_crimes_events: warCrimesEvents,
            outcome_class: verdict.outcome_class,
            condemnation_flags: [...verdict.condemnation_flags].sort(strictCompare),
        });
    }

    // Build rupture consequence summaries, sorted by id for determinism
    const ruptureEntries = [...ruptures]
        .sort((a, b) => strictCompare(a.id, b.id))
        .map((r: RuptureConsequence) => ({
            id: r.id,
            perpetrator_faction: r.perpetrator_faction,
            description: r.description,
        }));

    return {
        war_duration_weeks: turn,
        entries,
        rupture_consequences: ruptureEntries,
        total_military_killed: totalMilitaryKilled,
        total_civilian_killed: totalCivilianKilled,
    };
}
