/**
 * Turn AAR compilation.
 *
 * Two exported functions:
 *   captureAARSnapshot(state)        — called at turn start, captures pre-turn values
 *   compileTurnSummary(state, snap, report) — called at turn end, produces TurnSummary
 *
 * The AARSnapshot is stored transiently on TurnContext (never serialized).
 * The TurnSummary is written to GameState.turn_summaries[] (persists through save/load).
 */

import type { GameState, FactionId, FormationId } from '../state/game_state.js';
import type { TurnSummary, TurnBattle, NotableFlip, ArcTransition, DecorationAward, FormationSpawn, FormationDestruction, TurnNotableEvent } from '../state/turn_summary.js';
import type { AARSnapshot, TurnReport } from './turn_pipeline_types.js';
import type { NarrativeArc } from './war_stories.js';
import { strictCompare } from '../state/validateGameState.js';
import { getOsidAreas } from './osid_areas.js';
import { getOperationStormEventTurn, isWesternTheaterRuptured } from './combat/operation_storm_theater.js';

// ---------------------------------------------------------------------------
// Snapshot capture (turn start)
// ---------------------------------------------------------------------------

export function captureAARSnapshot(state: GameState): AARSnapshot {
    const turn = state.meta?.turn ?? 0;
    const formations = state.military.formations ?? {};

    const arcs: Record<FormationId, NarrativeArc> = {};
    const decoration_tiers: Record<FormationId, string[]> = {};
    const formation_ids = new Set<FormationId>();
    const already_destroyed = new Set<FormationId>();
    const formation_locations: Record<FormationId, string> = {};

    // No sort needed — snapshot is transient and never serialized
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (!f) continue;
        formation_ids.add(fid);
        if (f.location_osid) formation_locations[fid] = f.location_osid;
        if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded') {
            already_destroyed.add(fid);
        }
        // Arc and decoration diffs only apply to brigades
        if (f.kind !== 'brigade') continue;
        const warStory = f.war_story as { arc?: NarrativeArc } | undefined;
        if (warStory?.arc) arcs[fid] = warStory.arc;
        if (f.decorations?.length) {
            decoration_tiers[fid] = f.decorations.map((d) => d.tier);
        }
    }

    return {
        turn,
        supply: { ...state.military.general_supply_reserve },
        heavy_munitions: { ...state.military.heavy_munitions_reserve },
        arcs,
        decoration_tiers,
        already_destroyed,
        formation_ids,
        formation_locations,
        supply_state_by_osid: { ...(state.political?.last_supply_state_by_osid ?? {}) },
    };
}

// ---------------------------------------------------------------------------
// Summary compilation (turn end)
// ---------------------------------------------------------------------------

export function compileTurnSummary(
    state: GameState,
    snapshot: AARSnapshot,
    report: TurnReport,
): TurnSummary {
    const turn = state.meta?.turn ?? 0;

    // Pre-filter control_events once — used by both territory and battles sections
    const turnControlEvents = (state.political.control_events ?? []).filter((e) => e.turn === turn);

    return {
        turn,
        battles: compileBattles(state, report, turn, turnControlEvents),
        ...compileTerritory(turnControlEvents),
        ...compileDisplacement(state, turn),
        ...compileUnitEvents(state, snapshot),
        ...compileSupplyDeltas(state, snapshot),
        movements: compileMovements(state, snapshot),
        supply_transitions: compileSupplyTransitions(state, snapshot),
        events_fired: report.events_fired ?? [],
        notable_events: compileNotableEvents(state, turn),
        ...compileTerritoryAndSupplySnapshots(state),
    };
}

// ---------------------------------------------------------------------------
// Section: Battles
// ---------------------------------------------------------------------------

function compileBattles(
    state: GameState,
    report: TurnReport,
    turn: number,
    turnControlEvents: NonNullable<GameState['political']['control_events']>,
): TurnBattle[] {
    const rawBattles = report.attack_resolution_osid?.battles;
    if (!rawBattles?.length) return [];

    const formations = state.military.formations ?? {};

    // Group raw battle entries by target_osid
    const byOsid = new Map<string, typeof rawBattles>();
    for (const b of rawBattles) {
        const existing = byOsid.get(b.target_osid) ?? [];
        existing.push(b);
        byOsid.set(b.target_osid, existing);
    }

    // Build per-OSID casualty map from brigade_history engagements
    // No sort — Map insertion order is irrelevant here
    const casualtiesByOsid = new Map<string, { att: number; def: number }>();
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (!f?.brigade_history?.engagements) continue;
        for (const eng of f.brigade_history.engagements) {
            if (eng.turn !== turn) continue;
            const entry = casualtiesByOsid.get(eng.osid) ?? { att: 0, def: 0 };
            if (eng.role === 'attacker') entry.att += eng.casualties_taken;
            else entry.def += eng.casualties_taken;
            casualtiesByOsid.set(eng.osid, entry);
        }
    }

    const readRawCasualties = (group: typeof rawBattles): { att: number; def: number } | null => {
        let att = 0;
        let def = 0;
        for (const battle of group) {
            if (!Number.isFinite(battle.attacker_casualties) || !Number.isFinite(battle.defender_casualties)) {
                return null;
            }
            att += battle.attacker_casualties;
            def += battle.defender_casualties;
        }
        return { att, def };
    };

    // Build flipped OSID set and mun_id lookup from pre-filtered control_events
    const flippedOsids = new Set<string>();
    const osidToMunId = new Map<string, string>();
    for (const e of turnControlEvents) {
        if (e.mechanism === 'combat') flippedOsids.add(e.settlement_id);
        if (e.mun_id) osidToMunId.set(e.settlement_id, e.mun_id);
    }

    const result: TurnBattle[] = [];
    for (const [osid, group] of Array.from(byOsid.entries()).sort(([a], [b]) => strictCompare(a, b))) {
        const first = group[0];
        const allAttackerIds = [...new Set(group.map((b) => b.attacker_brigade))];
        const historyCasualties = casualtiesByOsid.get(osid) ?? null;
        const rawCasualties = readRawCasualties(group);
        const cas = rawCasualties ?? historyCasualties;

        result.push({
            osid,
            mun_id: osidToMunId.get(osid),
            attacker_faction: first.attacker_faction,
            defender_faction: first.defender_faction,
            primary_attacker_id: first.attacker_brigade,
            primary_defender_id: first.defender_brigade,
            all_attacker_ids: allAttackerIds,
            outcome: first.outcome,
            attacker_casualties: cas?.att ?? null,
            defender_casualties: cas?.def ?? null,
            casualties_reported: cas != null,
            territory_flipped: flippedOsids.has(osid),
            was_concentrated: group.length > 1,
            ...(first.execution_friction ? { execution_friction: first.execution_friction } : {}),
            defender_contributions: first.defender_contributions,
        });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Section: Territory
// ---------------------------------------------------------------------------

function compileTerritory(
    turnControlEvents: NonNullable<GameState['political']['control_events']>,
): Pick<TurnSummary, 'territory_net' | 'notable_flips'> {
    const visibleTerritoryEvents = turnControlEvents
        .filter((e) => e.mechanism !== 'setup_control');
    const territory_net: Partial<Record<FactionId, number>> = {};
    for (const e of visibleTerritoryEvents) {
        if (e.to) territory_net[e.to] = (territory_net[e.to] ?? 0) + 1;
        if (e.from) territory_net[e.from] = (territory_net[e.from] ?? 0) - 1;
    }

    // Notable flips: all combat flips for now; significance = generic.
    // Future: cross-reference operational data to classify municipality seats.
    const notable_flips: NotableFlip[] = visibleTerritoryEvents
        .filter((e) => e.mechanism === 'combat')
        .sort((a, b) => strictCompare(a.settlement_id, b.settlement_id))
        .map((e) => ({
            osid: e.settlement_id,
            mun_id: e.mun_id,
            from: e.from,
            to: e.to,
            significance: 'generic' as const,
        }));

    return { territory_net, notable_flips };
}

// ---------------------------------------------------------------------------
// Section: Displacement
// ---------------------------------------------------------------------------

function compileDisplacement(state: GameState, turn: number): Pick<TurnSummary, 'displacement_total' | 'displacement_by_ethnicity' | 'displacement_hotspot'> {
    const events = (state.displacement.displacement_event_log ?? []).filter((e) => e.turn === turn);

    let displacement_total = 0;
    const displacement_by_ethnicity: Partial<Record<FactionId, number>> = {};
    const byMun: Record<string, number> = {};

    for (const e of events) {
        displacement_total += e.displaced;
        if (e.ethnicity) {
            displacement_by_ethnicity[e.ethnicity] = (displacement_by_ethnicity[e.ethnicity] ?? 0) + e.displaced;
        }
        byMun[e.origin_mun] = (byMun[e.origin_mun] ?? 0) + e.displaced;
    }

    // Municipality with highest displacement
    let displacement_hotspot: string | undefined;
    let maxDisplaced = 0;
    for (const [mun, count] of Object.entries(byMun)) {
        if (count > maxDisplaced) {
            maxDisplaced = count;
            displacement_hotspot = mun;
        }
    }

    return { displacement_total, displacement_by_ethnicity, displacement_hotspot };
}

// ---------------------------------------------------------------------------
// Section: Unit Events (decorations, arcs, spawns, destructions)
// ---------------------------------------------------------------------------

function compileUnitEvents(
    state: GameState,
    snapshot: AARSnapshot,
): Pick<TurnSummary, 'decoration_awards' | 'arc_transitions' | 'formation_spawns' | 'formation_destructions'> {
    const formations = state.military.formations ?? {};

    const decoration_awards: DecorationAward[] = [];
    const arc_transitions: ArcTransition[] = [];
    const formation_spawns: FormationSpawn[] = [];
    const formation_destructions: FormationDestruction[] = [];

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f) continue;

        // Spawn/destruction detection applies to all formation kinds
        if (!snapshot.formation_ids.has(fid)) {
            formation_spawns.push({
                formation_id: fid,
                formation_name: f.name,
                faction: f.faction,
                kind: f.kind ?? 'brigade',
            });
        }
        if (
            snapshot.formation_ids.has(fid) &&
            !snapshot.already_destroyed.has(fid) &&
            (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded')
        ) {
            formation_destructions.push({
                formation_id: fid,
                formation_name: f.name,
                faction: f.faction,
            });
        }

        // Decoration and arc diffs are brigade-only
        if (f.kind !== 'brigade') continue;

        const prevTiers = new Set(snapshot.decoration_tiers[fid] ?? []);
        for (const dec of f.decorations ?? []) {
            if (!prevTiers.has(dec.tier)) {
                decoration_awards.push({
                    formation_id: fid,
                    formation_name: f.name,
                    faction: f.faction,
                    decoration: dec,
                });
            }
        }

        const warStory = f.war_story as { arc?: NarrativeArc } | undefined;
        const newArc = warStory?.arc;
        const oldArc = snapshot.arcs[fid];
        if (oldArc && newArc && oldArc !== newArc) {
            arc_transitions.push({
                formation_id: fid,
                formation_name: f.name,
                faction: f.faction,
                from_arc: oldArc,
                to_arc: newArc,
            });
        }
    }

    return { decoration_awards, arc_transitions, formation_spawns, formation_destructions };
}

// ---------------------------------------------------------------------------
// Section: Supply Deltas
// ---------------------------------------------------------------------------

function compileSupplyDeltas(
    state: GameState,
    snapshot: AARSnapshot,
): Pick<TurnSummary, 'supply_deltas' | 'heavy_munitions_deltas'> {
    const supply_deltas: Partial<Record<FactionId, number>> = {};
    const heavy_munitions_deltas: Partial<Record<FactionId, number>> = {};

    // Derive factions from actual state rather than a hardcoded literal
    const factions = Object.keys(state.military.general_supply_reserve ?? snapshot.supply);
    for (const f of factions) {
        const supplyDelta = (state.military.general_supply_reserve?.[f] ?? 0) - (snapshot.supply[f] ?? 0);
        if (supplyDelta !== 0) supply_deltas[f] = supplyDelta;

        const munDelta = (state.military.heavy_munitions_reserve?.[f] ?? 0) - (snapshot.heavy_munitions[f] ?? 0);
        if (munDelta !== 0) heavy_munitions_deltas[f] = munDelta;
    }

    return { supply_deltas, heavy_munitions_deltas };
}

// ---------------------------------------------------------------------------
// Section: Notable Events
// ---------------------------------------------------------------------------
// Section: Movements
// ---------------------------------------------------------------------------

function compileMovements(state: GameState, snapshot: AARSnapshot): TurnSummary['movements'] {
    const movements: TurnSummary['movements'] = [];
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || !f.location_osid) continue;
        if (f.lifecycle_status === 'destroyed' || f.lifecycle_status === 'disbanded') continue;
        const prevOsid = snapshot.formation_locations[fid];
        if (prevOsid && prevOsid !== f.location_osid) {
            movements.push({
                formation_id: fid,
                formation_name: f.name ?? fid,
                from_osid: prevOsid,
                to_osid: f.location_osid,
            });
        }
    }
    return movements;
}

// ---------------------------------------------------------------------------
// Section: Supply transitions
// ---------------------------------------------------------------------------

function compileSupplyTransitions(state: GameState, snapshot: AARSnapshot): TurnSummary['supply_transitions'] {
    const transitions: TurnSummary['supply_transitions'] = [];
    const current = state.political?.last_supply_state_by_osid ?? {};
    const prev = snapshot.supply_state_by_osid;
    for (const osid of Object.keys(current).sort(strictCompare)) {
        const curLevel = current[osid];
        const prevLevel = prev[osid];
        if (prevLevel && prevLevel !== curLevel) {
            transitions.push({ osid, from: prevLevel, to: curLevel });
        }
    }
    return transitions;
}

// ---------------------------------------------------------------------------
// Section: Territory + Supply Snapshots (end-of-turn absolute values)
// ---------------------------------------------------------------------------

function compileTerritoryAndSupplySnapshots(
    state: GameState,
): Pick<TurnSummary, 'territory_snapshot' | 'supply_snapshot'> {
    const pc = state.political?.political_controllers ?? {};
    const { total, areas } = getOsidAreas();

    const areaByFaction: Partial<Record<FactionId, number>> = {};
    for (const osid of Object.keys(pc).sort(strictCompare)) {
        const faction = pc[osid];
        if (!faction) continue;
        const osidArea = areas[osid] ?? 0;
        areaByFaction[faction] = (areaByFaction[faction] ?? 0) + osidArea;
    }

    const territory_snapshot: Partial<Record<FactionId, number>> = {};
    if (total > 0) {
        for (const faction of Object.keys(areaByFaction).sort(strictCompare)) {
            territory_snapshot[faction] = Math.round(((areaByFaction[faction] ?? 0) / total) * 10000) / 10000;
        }
    }

    const supply_snapshot: Partial<Record<FactionId, number>> = {};
    const reserves = state.military?.general_supply_reserve ?? {};
    for (const faction of Object.keys(reserves).sort(strictCompare)) {
        const val = reserves[faction];
        if (val != null) supply_snapshot[faction] = val;
    }

    return { territory_snapshot, supply_snapshot };
}

// ---------------------------------------------------------------------------

function compileNotableEvents(state: GameState, turn: number): TurnNotableEvent[] {
    const events: TurnNotableEvent[] = [];

    // Graz Accords activated this turn
    if (state.political.vienna_declaration_turn === turn) {
        events.push({
            kind: 'graz_accords_activated',
            description: 'Graz Accords activated — RS–HRHB non-aggression pact.',
        });
    }

    // Truce broken this turn
    const truce_breaks = state.political.truce_broken_turn ?? {};
    for (const [faction, breakTurn] of Object.entries(truce_breaks).sort(([a], [b]) => strictCompare(a, b))) {
        if (breakTurn === turn) {
            events.push({
                kind: 'truce_broken',
                description: `${faction} broke the Graz Accords truce.`,
                faction,
            });
        }
    }

    // Emergent RBiH-HRHB framework predicate cleared this turn.
    // The formal calendar/narrative Washington Agreement event is recorded in events_fired.
    const washingtonTurn = state.political.rbih_hrhb_state?.washington_turn;
    if (washingtonTurn === turn) {
        events.push({
            kind: 'rbih_hrhb_framework_activated',
            description: 'RBiH-HRHB federation framework activated - bilateral ceasefire and joint anti-RS coordination are live.',
        });
    }

    // Operation Storm opened the western theater this turn
    if (isWesternTheaterRuptured(state)) {
        // Detect first occurrence: no prior summary has reported it
        const alreadyReported = (state.turn_summaries ?? []).some((s) =>
            s.notable_events.some((e) => e.kind === 'operation_storm')
        );
        const eventTurn = getOperationStormEventTurn(state) ?? state.meta.operation_storm_turn;
        if (!alreadyReported && (eventTurn == null || eventTurn === turn)) {
            events.push({
                kind: 'operation_storm',
                description: 'Operation Storm (Oluja) triggered.',
            });
        }
    }

    return events;
}
