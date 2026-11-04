/**
 * Commander friendly-territory handoff regression.
 *
 * Bug (retained Pribelja case, turn 155): a same-faction corps responsibility
 * transfer removed OSIDs from the corps' current zones even though the faction
 * still controlled them. `classifySectorActivity` treated every previous-zone
 * OSID that was no longer in the corps' current zones as lost, marking every
 * sector `overrun` and forcing `fortify` with no control events.
 *
 * These tests exercise the real decision path (`BotCorpsCommander.decide`) and
 * assert the produced `sector_activity_log` / `sector_stances`, not internal
 * helper counters. Fixtures are quiet, non-massing and use the neutral
 * personality so other legitimate fortify reasons stay visible.
 */

import { describe, it, expect } from 'vitest';
import type {
    FactionId,
    FormationId,
    CorpsFrontSector,
} from '../../src/state/game_state.js';
import type {
    CommanderBriefing,
    CommanderOutput,
    CommanderState,
    ZoneAssessment,
    ZoneId,
} from '../../src/sim/combat/commander/commander_state.js';
import { BotCorpsCommander } from '../../src/sim/combat/commander/commander_loop.js';

import {
    makeCommanderBrigade as makeBrigade,
    makeCommanderZone as makeZone,
    makeCommanderMinimalBriefing as makeMinimalBriefing,
    makeCommanderMinimalState as makeMinimalState,
    DEFAULT_COMMANDER_PERSONALITY,
} from '../_helpers/commander.js';

const TURN = 155;
const CORPS = 'krajina_corps' as FormationId;
const FACTION = 'RS' as FactionId;

/**
 * Full-enough SpatialContext: own-faction authoritative controller set plus a
 * connected component map that covers the current corps territory. No enemy
 * intel, no massing signs.
 */
function makeSpatial(friendlyOsids: readonly string[]): any {
    const sorted = [...friendlyOsids].sort();
    const componentMap = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const osid of sorted) {
        componentMap.set(osid, 0);
        adjacency.set(osid, sorted.filter((other) => other !== osid));
    }
    return {
        componentsByFaction: new Map([[FACTION, componentMap]]),
        // Preserve caller insertion order here so ordering tests can prove the
        // authoritative set itself is reordered, not silently normalized.
        friendlyOsidsByFaction: new Map([[FACTION, new Set(friendlyOsids)]]),
        politicallyConnectedOsidsByFaction: new Map([[FACTION, new Set(friendlyOsids)]]),
        adjacency,
        sharedBoundaryAdjacency: adjacency,
        computedAtTurn: TURN,
        phase: 'pre-combat',
    };
}

function makeSector(overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        sector_id: 'sector_0',
        corps_id: CORPS,
        faction: FACTION,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: [],
        sub_segments: [],
        length_edges: 4,
        territory_osids: [],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        sector_stance: 'defend',
        ...overrides,
    } as unknown as CorpsFrontSector;
}

function previousZone(zoneId: string, osids: readonly string[]): ZoneAssessment {
    return makeZone({
        zone_id: zoneId as ZoneId,
        corps_id: CORPS,
        faction: FACTION,
        osids: [...osids],
    });
}

function previousStateWithZones(zones: readonly ZoneAssessment[]): CommanderState {
    return makeMinimalState({ zone_assessments: [...zones] });
}

function makeBriefing(
    sectors: readonly CorpsFrontSector[],
    friendlyOsids: readonly string[],
    previousState: CommanderState,
): CommanderBriefing {
    return makeMinimalBriefing({
        corps_id: CORPS,
        faction: FACTION,
        turn: TURN,
        spatial: makeSpatial(friendlyOsids),
        sectors: [...sectors],
        brigades: sectors.map((sector, index) => makeBrigade({
            // Keep brigade identity tied to the sector, not its array position,
            // so a reordered sector list yields an equivalent fresh briefing.
            id: (sector.assigned_brigade_ids[0] ?? `bde_${index}`) as FormationId,
            faction: FACTION,
            location_osid: sector.territory_osids[0] ?? 'op:none:0',
            disrupted_turns: 0,
        })),
        officer_personality: DEFAULT_COMMANDER_PERSONALITY,
        intel_data: null,
        previous_state: previousState,
    });
}

function decide(briefing: CommanderBriefing, previousState: CommanderState): CommanderOutput {
    return new BotCorpsCommander().decide(briefing, previousState);
}

function activityFor(output: CommanderOutput, sectorId: string): string {
    const entries = output.updated_state.sector_activity_log.filter(
        (entry) => entry.turn === TURN && entry.sector_id === sectorId,
    );
    expect(entries).toHaveLength(1);
    return entries[0]!.activity;
}

function stanceFor(output: CommanderOutput, sectorId: string): string | undefined {
    return output.sector_stances.find((entry) => entry.sector_id === sectorId)?.stance;
}

describe('commander friendly-territory handoff', () => {
    it('same-faction corps responsibility transfer is not overrun and does not force fortify', () => {
        // Previous turn: this corps held the old zone (including Pribelja).
        // Current turn: responsibility moved to another same-faction corps, so
        // the old zone's OSIDs are outside this corps' sector territory but are
        // still authoritatively faction-held.
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:old', ['op:old:1', 'op:pribelja']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_krajina_a',
                territory_osids: ['op:new:1'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
            makeSector({
                sector_id: 'sector_krajina_b',
                territory_osids: ['op:new:2'],
                assigned_brigade_ids: ['bde_1' as FormationId],
            }),
        ];
        const friendly = ['op:new:1', 'op:new:2', 'op:old:1', 'op:pribelja'];

        const output = decide(makeBriefing(sectors, friendly, previousState), previousState);

        for (const sector of sectors) {
            expect(activityFor(output, sector.sector_id)).toBe('quiet');
            expect(stanceFor(output, sector.sector_id)).not.toBe('fortify');
            expect(stanceFor(output, sector.sector_id)).toBe('defend');
        }
    });

    it('same-corps zone boundary reshape is not overrun', () => {
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:a', ['op:test:a', 'op:test:b']),
            previousZone('zone:krajina:b', ['op:test:c']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_reshape_a',
                territory_osids: ['op:test:a', 'op:test:c'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
            makeSector({
                sector_id: 'sector_reshape_b',
                territory_osids: ['op:test:b'],
                assigned_brigade_ids: ['bde_1' as FormationId],
            }),
        ];
        const friendly = ['op:test:a', 'op:test:b', 'op:test:c'];

        const output = decide(makeBriefing(sectors, friendly, previousState), previousState);

        for (const sector of sectors) {
            expect(activityFor(output, sector.sector_id)).toBe('quiet');
            expect(stanceFor(output, sector.sector_id)).toBe('defend');
        }
    });

    it('unchanged territory remains quiet and keeps the default defend stance', () => {
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:stable', ['op:test:a', 'op:test:b']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_stable',
                territory_osids: ['op:test:a', 'op:test:b'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
        ];
        const friendly = ['op:test:a', 'op:test:b'];

        const output = decide(makeBriefing(sectors, friendly, previousState), previousState);

        expect(activityFor(output, 'sector_stable')).toBe('quiet');
        expect(stanceFor(output, 'sector_stable')).toBe('defend');
    });

    it('genuine enemy capture still classifies overrun and forces fortify', () => {
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:lost', ['op:test:a', 'op:captured']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_captured',
                territory_osids: ['op:test:a'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
        ];
        // `op:captured` is no longer in the own-faction authoritative set.
        const friendly = ['op:test:a'];

        const output = decide(makeBriefing(sectors, friendly, previousState), previousState);

        expect(activityFor(output, 'sector_captured')).toBe('overrun');
        expect(stanceFor(output, 'sector_captured')).toBe('fortify');
    });

    it('mixed friendly handoff plus true enemy capture still classifies overrun', () => {
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:mixed', ['op:handoff', 'op:captured']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_mixed',
                territory_osids: ['op:test:a'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
        ];
        // Handoff cell stays faction-held; captured cell does not.
        const friendly = ['op:test:a', 'op:handoff'];

        const output = decide(makeBriefing(sectors, friendly, previousState), previousState);

        expect(activityFor(output, 'sector_mixed')).toBe('overrun');
        expect(stanceFor(output, 'sector_mixed')).toBe('fortify');
    });

    it('collection ordering is stable and deterministic across real decision outputs', () => {
        const previousState = previousStateWithZones([
            previousZone('zone:krajina:z', ['op:old:z']),
            previousZone('zone:krajina:a', ['op:old:a', 'op:pribelja']),
        ]);
        const sectors = [
            makeSector({
                sector_id: 'sector_z',
                territory_osids: ['op:test:z'],
                assigned_brigade_ids: ['bde_0' as FormationId],
            }),
            makeSector({
                sector_id: 'sector_a',
                territory_osids: ['op:test:a'],
                assigned_brigade_ids: ['bde_1' as FormationId],
            }),
        ];
        const friendly = ['op:test:a', 'op:test:z', 'op:old:a', 'op:old:z', 'op:pribelja'];
        const briefing = makeBriefing(sectors, friendly, previousState);

        // Equivalent fresh briefing with every collection reversed: sector
        // order, previous-zone order, each zone's OSID order, and the
        // authoritative friendly-set insertion order.
        const reorderedZones = [...previousState.zone_assessments]
            .reverse()
            .map((zone) => ({ ...zone, osids: [...zone.osids].reverse() }));
        const reorderedPreviousState = previousStateWithZones(reorderedZones);
        const reorderedSectors = [...sectors].reverse();
        const reorderedFriendly = [...friendly].reverse();
        const reorderedBriefing = makeBriefing(
            reorderedSectors,
            reorderedFriendly,
            reorderedPreviousState,
        );

        // Prove the second input really is reordered (non-vacuous comparison).
        const originalSectorIds = briefing.sectors.map((sector) => sector.sector_id);
        const reorderedSectorIds = reorderedBriefing.sectors.map((sector) => sector.sector_id);
        expect(originalSectorIds).toEqual(['sector_z', 'sector_a']);
        expect(reorderedSectorIds).toEqual([...originalSectorIds].reverse());
        expect(reorderedSectorIds).not.toEqual(originalSectorIds);

        const originalZoneIds = previousState.zone_assessments.map((zone) => zone.zone_id);
        const reorderedZoneIds = reorderedPreviousState.zone_assessments.map((zone) => zone.zone_id);
        expect(reorderedZoneIds).toEqual([...originalZoneIds].reverse());
        expect(reorderedZoneIds).not.toEqual(originalZoneIds);

        const originalOsidOrder = previousState.zone_assessments.map((zone) => [...zone.osids]);
        const reorderedOsidOrder = reorderedPreviousState.zone_assessments.map((zone) => [...zone.osids]);
        expect(reorderedOsidOrder).toEqual(
            [...originalOsidOrder].reverse().map((osids) => [...osids].reverse()),
        );
        expect(originalOsidOrder).toContainEqual(['op:old:a', 'op:pribelja']);
        expect(reorderedOsidOrder).toContainEqual(['op:pribelja', 'op:old:a']);

        const originalFriendlyOrder = [
            ...briefing.spatial.friendlyOsidsByFaction.get(FACTION)!,
        ];
        const reorderedFriendlyOrder = [
            ...reorderedBriefing.spatial.friendlyOsidsByFaction.get(FACTION)!,
        ];
        expect(originalFriendlyOrder).toEqual(friendly);
        expect(reorderedFriendlyOrder).toEqual([...friendly].reverse());
        expect(reorderedFriendlyOrder).not.toEqual(originalFriendlyOrder);

        expect(reorderedBriefing.previous_state).toBe(reorderedPreviousState);

        const first = decide(briefing, previousState);
        const second = decide(briefing, previousState);
        const reordered = decide(reorderedBriefing, reorderedPreviousState);

        const turnEntries = (output: CommanderOutput) =>
            output.updated_state.sector_activity_log.filter((entry) => entry.turn === TURN);

        // Identical-input repeatability is retained.
        expect(turnEntries(first)).toEqual(turnEntries(second));
        expect(first.sector_stances).toEqual(second.sector_stances);

        // Reordered-equivalent input yields the same actual activity/stances.
        expect(turnEntries(reordered)).toEqual(turnEntries(first));
        expect(reordered.sector_stances).toEqual(first.sector_stances);

        const firstEntries = turnEntries(first);

        // Deterministic order: sector ids sorted within the turn.
        expect(firstEntries.map((entry) => entry.sector_id)).toEqual([
            'sector_a',
            'sector_z',
        ]);
        expect(firstEntries.map((entry) => entry.activity)).toEqual(['quiet', 'quiet']);
        expect(stanceFor(first, 'sector_a')).toBe('defend');
        expect(stanceFor(first, 'sector_z')).toBe('defend');
    });
});
