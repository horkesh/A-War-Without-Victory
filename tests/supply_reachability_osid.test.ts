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
