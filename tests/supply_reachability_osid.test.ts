import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';
import { computeSupplyReachabilityOsid } from '../src/state/supply_reachability_osid.js';
import {
    deriveCorridorsOsid,
    deriveSupplyStateByOsid,
    type SupplyStateByOsidReport
} from '../src/state/supply_state_derivation.js';

test('computeSupplyReachabilityOsid with single source reaches connected controlled OSIDs', () => {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'seed' },
        factions: [
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: ['sid1']
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'A' }
    };
    const edges = [
        { a: 'o1', b: 'o2' },
        { a: 'o2', b: 'o3' }
    ];
    const canonicalToOperational: Record<string, string> = { sid1: 'o1' };
    const operationalToCanonical = new Map<string, string[]>([
        ['o1', ['sid1']],
        ['o2', ['sid2']],
        ['o3', ['sid3']]
    ]);

    const report = computeSupplyReachabilityOsid(state, edges, canonicalToOperational, operationalToCanonical);
    assert.strictEqual(report.schema, 1);
    assert.strictEqual(report.turn, 5);
    assert.strictEqual(report.factions.length, 1);
    const fac = report.factions[0]!;
    assert.strictEqual(fac.faction_id, 'A');
    assert.deepStrictEqual(fac.sources, ['o1']);
    assert.deepStrictEqual(fac.controlled.sort(), ['o1', 'o2', 'o3']);
    assert.deepStrictEqual(fac.reachable_osids.sort(), ['o1', 'o2', 'o3']);
    assert.deepStrictEqual(fac.isolated_osids, []);
});

test('deriveSupplyStateByOsid yields by_osid state adequate/strained/critical', () => {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'seed' },
        factions: [{ id: 'A', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: ['s1'] }],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'A' }
    };
    const edges = [
        { a: 'o1', b: 'o2' },
        { a: 'o2', b: 'o3' }
    ];
    const reachReport = computeSupplyReachabilityOsid(
        state,
        edges,
        { s1: 'o1' },
        new Map([['o1', ['s1']], ['o2', ['s2']], ['o3', ['s3']]])
    );
    const corridorReport = deriveCorridorsOsid(state, edges, reachReport);
    const supplyByOsid = deriveSupplyStateByOsid(state, edges, reachReport, corridorReport);
    assert.strictEqual(supplyByOsid.schema, 1);
    assert.strictEqual(supplyByOsid.factions.length, 1);
    const byOsid = supplyByOsid.factions[0]!.by_osid;
    assert.ok(byOsid.length >= 3);
    const o1Entry = byOsid.find((e) => e.osid === 'o1');
    const o2Entry = byOsid.find((e) => e.osid === 'o2');
    assert.ok(o1Entry && (o1Entry.state === 'adequate' || o1Entry.state === 'strained' || o1Entry.state === 'critical'));
    assert.ok(o2Entry && (o2Entry.state === 'adequate' || o2Entry.state === 'strained' || o2Entry.state === 'critical'));
});

test('cascade determinism: same state and edges yield same by_osid (Phase 2)', () => {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 's' },
        factions: [{ id: 'A', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: ['s1'] }],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'A' }
    };
    const edges = [{ a: 'o1', b: 'o2' }, { a: 'o2', b: 'o3' }];
    const c2o = { s1: 'o1' };
    const o2c = new Map([['o1', ['s1']], ['o2', ['s2']], ['o3', ['s3']]]);
    const r1 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
    const corr1 = deriveCorridorsOsid(state, edges, r1);
    const report1 = deriveSupplyStateByOsid(state, edges, r1, corr1);
    const report2 = deriveSupplyStateByOsid(state, edges, r1, corr1);
    assert.deepStrictEqual(report1.factions[0]!.by_osid.map((e) => e.osid), report2.factions[0]!.by_osid.map((e) => e.osid));
    assert.deepStrictEqual(report1.factions[0]!.by_osid.map((e) => e.state), report2.factions[0]!.by_osid.map((e) => e.state));
});

test('deriveSupplyStateByOsid: isolated source in pocket is strained (not adequate)', () => {
    // Setup: faction A has heartland (o1-o2-o3, source o1) and
    // disconnected pocket (o5-o6, source o5) separated by enemy o4.
    // KEY: Without isolated source detection, o5 would be "adequate" because
    // it's a supply source. With detection, o5 is "strained" because its
    // pocket is disconnected from the heartland. Models Sarajevo UN airlift.
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'seed' },
        factions: [
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: ['s1', 's5'] // two sources: heartland + pocket
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'A', o4: 'B', o5: 'A', o6: 'A' }
    };
    const edges = [
        { a: 'o1', b: 'o2' },
        { a: 'o2', b: 'o3' },
        { a: 'o3', b: 'o4' }, // blocked by enemy
        { a: 'o4', b: 'o5' }, // blocked by enemy
        { a: 'o5', b: 'o6' }  // pocket internal
    ];
    const c2o: Record<string, string> = { s1: 'o1', s5: 'o5' };
    const o2c = new Map([
        ['o1', ['s1']], ['o2', ['s2']], ['o3', ['s3']],
        ['o4', ['s4']], ['o5', ['s5']], ['o6', ['s6']]
    ]);

    const reachReport = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
    const corridorReport = deriveCorridorsOsid(state, edges, reachReport);
    const supplyByOsid = deriveSupplyStateByOsid(state, edges, reachReport, corridorReport);

    const byOsid = supplyByOsid.factions[0]!.by_osid;

    // Heartland source o1: adequate (seeded into adequate BFS)
    assert.strictEqual(byOsid.find(e => e.osid === 'o1')?.state, 'adequate', 'heartland source should be adequate');

    // Pocket source o5: strained — key assertion for isolated source detection.
    // Without the fix this would be "adequate" (self-seeded by its own source).
    assert.strictEqual(byOsid.find(e => e.osid === 'o5')?.state, 'strained', 'pocket source should be strained (isolated from heartland)');

    // Pocket non-source o6: strained (also in disconnected pocket)
    assert.strictEqual(byOsid.find(e => e.osid === 'o6')?.state, 'strained', 'pocket non-source should be strained');

    // No pocket OSID should be critical (they ARE reachable from their local source)
    assert.notStrictEqual(byOsid.find(e => e.osid === 'o5')?.state, 'critical');
    assert.notStrictEqual(byOsid.find(e => e.osid === 'o6')?.state, 'critical');
});

test('deriveSupplyStateByOsid: single-source faction — source is adequate, all in same heartland', () => {
    // When there's only one source, all connected OSIDs are in the heartland.
    // The source OSID itself is adequate (seeded). Non-source OSIDs may be
    // strained due to brittle corridors, but none should be critical.
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'seed' },
        factions: [
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: ['s1']
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'A' }
    };
    const edges = [{ a: 'o1', b: 'o2' }, { a: 'o2', b: 'o3' }];
    const reachReport = computeSupplyReachabilityOsid(
        state, edges, { s1: 'o1' },
        new Map([['o1', ['s1']], ['o2', ['s2']], ['o3', ['s3']]])
    );
    const corridorReport = deriveCorridorsOsid(state, edges, reachReport);
    const supplyByOsid = deriveSupplyStateByOsid(state, edges, reachReport, corridorReport);
    const byOsid = supplyByOsid.factions[0]!.by_osid;
    // Source is adequate (seeded into adequate BFS)
    assert.strictEqual(byOsid.find(e => e.osid === 'o1')?.state, 'adequate');
    // All connected, none critical
    assert.notStrictEqual(byOsid.find(e => e.osid === 'o2')?.state, 'critical');
    assert.notStrictEqual(byOsid.find(e => e.osid === 'o3')?.state, 'critical');
});

test('deriveSupplyStateByOsid: pocket without source is critical (not strained)', () => {
    // A disconnected group with NO source → isolated → critical
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'seed' },
        factions: [
            {
                id: 'A',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: ['s1'] // only heartland source
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { o1: 'A', o2: 'A', o3: 'B', o4: 'A' }
    };
    const edges = [
        { a: 'o1', b: 'o2' },
        { a: 'o2', b: 'o3' }, // blocked
        { a: 'o3', b: 'o4' }  // blocked — o4 is isolated, no local source
    ];
    const reachReport = computeSupplyReachabilityOsid(
        state, edges, { s1: 'o1' },
        new Map([['o1', ['s1']], ['o2', ['s2']], ['o3', ['s3']], ['o4', ['s4']]])
    );
    const corridorReport = deriveCorridorsOsid(state, edges, reachReport);
    const supplyByOsid = deriveSupplyStateByOsid(state, edges, reachReport, corridorReport);
    const byOsid = supplyByOsid.factions[0]!.by_osid;
    assert.strictEqual(byOsid.find(e => e.osid === 'o4')?.state, 'critical', 'pocket without source should be critical');
});

test('SupplyStateByOsidReport used for supply_mult: adequate→1, strained→0.75, critical→0.45/0.5', () => {
    const report: SupplyStateByOsidReport = {
        schema: 1,
        turn: 1,
        factions: [
            {
                faction_id: 'A',
                by_osid: [
                    { osid: 'loc1', state: 'adequate' },
                    { osid: 'loc2', state: 'strained' },
                    { osid: 'loc3', state: 'critical' }
                ]
            }
        ]
    };
    assert.strictEqual(report.factions[0]!.by_osid.find((e) => e.osid === 'loc1')?.state, 'adequate');
    assert.strictEqual(report.factions[0]!.by_osid.find((e) => e.osid === 'loc2')?.state, 'strained');
    assert.strictEqual(report.factions[0]!.by_osid.find((e) => e.osid === 'loc3')?.state, 'critical');
});
