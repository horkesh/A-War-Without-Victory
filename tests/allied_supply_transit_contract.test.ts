/**
 * Allied supply transit contract (2026-10-28).
 *
 * Reachability starts only from the beneficiary's OWN eligible configured
 * origins (controlled + politically owned). Normal transit may cross current
 * RBiH↔HRHB allied territory under the canonical isFriendlyFaction predicate
 * (alliance > 0.20), but owned report membership never includes ally nodes,
 * ally depots never seed supply, and allied transit cannot turn a bottleneck
 * into unlimited supply.
 */
import assert from 'node:assert';
import { test } from 'vitest';

import { buildAdjacencyMap } from '../src/map/adjacency_map.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { computeSupplyReachability, type SupplyReachabilityReport } from '../src/state/supply_reachability.js';
import {
    computeSupplyReachabilityOsid,
    type SupplyReachabilityOsidReport,
} from '../src/state/supply_reachability_osid.js';
import {
    deriveCorridors,
    deriveSupplyState,
    deriveCorridorsOsid,
    deriveSupplyStateByOsid,
} from '../src/state/supply_state_derivation.js';
import type { EdgeRecord } from '../src/map/settlements.js';

const FACTION_PROFILE = {
    authority: 0,
    legitimacy: 0,
    control: 0,
    logistics: 0,
    exhaustion: 0,
};

interface StateOptions {
    controllers: Record<string, string | null>;
    sources: Record<string, string[]>;
    aor?: Record<string, string[]>;
    alliance?: number;
}

function makeState(opts: StateOptions): GameState {
    const factionIds = Object.keys(opts.sources).sort();
    const derivedAor: Record<string, string[]> = {};
    for (const id of factionIds) {
        derivedAor[id] = Object.keys(opts.controllers)
            .filter((node) => opts.controllers[node] === id)
            .sort();
    }
    const political: Record<string, unknown> = {
        political_controllers: { ...opts.controllers },
    };
    if (opts.alliance !== undefined) {
        political.war_alliance_rbih_hrhb = opts.alliance;
    }
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'allied-supply-transit-contract' },
        factions: factionIds.map((id) => ({
            id,
            profile: { ...FACTION_PROFILE },
            areasOfResponsibility: [...(opts.aor?.[id] ?? derivedAor[id] ?? [])],
            supply_sources: [...(opts.sources[id] ?? [])],
        })),
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political,
        displacement: {},
    } as unknown as GameState;
}

function makeEdges(pairs: Array<[string, string]>): EdgeRecord[] {
    return pairs.map(([a, b]) => ({ a, b } as EdgeRecord));
}

function osidMaps(nodes: string[]): {
    canonicalToOperational: Record<string, string>;
    operationalToCanonical: Map<string, string[]>;
} {
    const canonicalToOperational: Record<string, string> = {};
    const operationalToCanonical = new Map<string, string[]>();
    for (const node of nodes) {
        canonicalToOperational[node] = node;
        operationalToCanonical.set(node, [node]);
    }
    return { canonicalToOperational, operationalToCanonical };
}

function sidFaction(report: SupplyReachabilityReport, id: string) {
    const fac = report.factions.find((f) => f.faction_id === id);
    if (!fac) throw new Error(`missing SID faction ${id}`);
    return fac;
}

function osidFaction(report: SupplyReachabilityOsidReport, id: string) {
    const fac = report.factions.find((f) => f.faction_id === id);
    if (!fac) throw new Error(`missing OSID faction ${id}`);
    return fac;
}

function byOsidState(
    report: ReturnType<typeof deriveSupplyStateByOsid>,
    factionId: string,
    osid: string,
) {
    const fac = report.factions.find((f) => f.faction_id === factionId);
    if (!fac) throw new Error(`missing supply-state faction ${factionId}`);
    const entry = fac.by_osid.find((e) => e.osid === osid);
    if (!entry) throw new Error(`missing supply-state ${factionId}/${osid}`);
    return entry.state;
}

test('SID: allied HRHB source reaches HRHB pocket through an RBiH bridge; transit stays out of owned report', () => {
    const state = makeState({
        controllers: { h_source: 'HRHB', r_bridge: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: [], RS: [] },
        alliance: 0.75,
    });
    const adjacencyMap = buildAdjacencyMap(makeEdges([
        ['h_source', 'r_bridge'],
        ['r_bridge', 'h_pocket'],
    ]));

    const report = computeSupplyReachability(state, adjacencyMap);
    const hrhb = sidFaction(report, 'HRHB');
    assert.deepStrictEqual(hrhb.controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(hrhb.reachable_controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(hrhb.isolated_controlled, []);
    assert.ok(!hrhb.reachable_controlled.includes('r_bridge'), 'transit node must not enter reachable_controlled');
    assert.ok(hrhb.edges_used.includes('h_source__r_bridge'));
    assert.ok(hrhb.edges_used.includes('h_pocket__r_bridge'));

    // Mirror: RBiH source -> HRHB bridge -> RBiH pocket.
    const mirror = makeState({
        controllers: { r_source: 'RBiH', h_bridge: 'HRHB', r_pocket: 'RBiH' },
        sources: { HRHB: [], RBiH: ['r_source'], RS: [] },
        alliance: 0.75,
    });
    const mirrorAdjacency = buildAdjacencyMap(makeEdges([
        ['r_source', 'h_bridge'],
        ['h_bridge', 'r_pocket'],
    ]));
    const mirrorReport = computeSupplyReachability(mirror, mirrorAdjacency);
    const rbih = sidFaction(mirrorReport, 'RBiH');
    assert.deepStrictEqual(rbih.controlled, ['r_pocket', 'r_source']);
    assert.deepStrictEqual(rbih.reachable_controlled, ['r_pocket', 'r_source']);
    assert.deepStrictEqual(rbih.isolated_controlled, []);
    assert.ok(!rbih.reachable_controlled.includes('h_bridge'));
});

test('SID: alliance at/below 0.20 blocks allied transit; just above 0.20 restores it', () => {
    const state = makeState({
        controllers: { h_source: 'HRHB', r_bridge: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: [], RS: [] },
        alliance: 0.75,
    });
    const adjacencyMap = buildAdjacencyMap(makeEdges([
        ['h_source', 'r_bridge'],
        ['r_bridge', 'h_pocket'],
    ]));

    assert.deepStrictEqual(sidFaction(computeSupplyReachability(state, adjacencyMap), 'HRHB').reachable_controlled, [
        'h_pocket',
        'h_source',
    ]);

    state.political.war_alliance_rbih_hrhb = 0.20;
    state.meta.turn = 1;
    const atThreshold = sidFaction(computeSupplyReachability(state, adjacencyMap), 'HRHB');
    assert.deepStrictEqual(atThreshold.reachable_controlled, ['h_source']);
    assert.deepStrictEqual(atThreshold.isolated_controlled, ['h_pocket']);

    state.political.war_alliance_rbih_hrhb = 0.201;
    state.meta.turn = 2;
    const aboveThreshold = sidFaction(computeSupplyReachability(state, adjacencyMap), 'HRHB');
    assert.deepStrictEqual(aboveThreshold.reachable_controlled, ['h_pocket', 'h_source']);
});

test('SID: configured origin captured by ally or enemy is not an eligible seed', () => {
    for (const captor of ['RBiH', 'RS']) {
        const state = makeState({
            controllers: { h_source: captor, h_pocket: 'HRHB' },
            sources: { HRHB: ['h_source'], RBiH: ['r_depot'], RS: [] },
            alliance: 0.75,
        });
        const adjacencyMap = buildAdjacencyMap(makeEdges([['h_source', 'h_pocket']]));
        const hrhb = sidFaction(computeSupplyReachability(state, adjacencyMap), 'HRHB');
        assert.deepStrictEqual(hrhb.sources, ['h_source'], 'configured sources stay reported');
        assert.deepStrictEqual(hrhb.controlled, ['h_pocket']);
        assert.deepStrictEqual(hrhb.reachable_controlled, [], `captor ${captor} must not lend a source`);
        assert.deepStrictEqual(hrhb.isolated_controlled, ['h_pocket']);
    }
});

test('SID: stale beneficiary AoR cannot claim an allied bridge or a foreign-captured source', () => {
    const state = makeState({
        controllers: { h_source: 'HRHB', r_bridge: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: [], RS: [] },
        aor: { HRHB: ['h_source', 'r_bridge', 'h_pocket'], RBiH: ['r_bridge'] },
        alliance: 0.75,
    });
    const adjacencyMap = buildAdjacencyMap(makeEdges([
        ['h_source', 'r_bridge'],
        ['r_bridge', 'h_pocket'],
    ]));
    const hrhb = sidFaction(computeSupplyReachability(state, adjacencyMap), 'HRHB');
    assert.deepStrictEqual(
        hrhb.controlled,
        ['h_pocket', 'h_source'],
        'known-foreign-owned bridge must leave the beneficiary controlled report',
    );
    assert.deepStrictEqual(hrhb.reachable_controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(hrhb.isolated_controlled, []);
    assert.ok(!hrhb.controlled.includes('r_bridge'));
    assert.ok(!hrhb.reachable_controlled.includes('r_bridge'));

    const captured = makeState({
        controllers: { h_source: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: ['r_depot'], RS: [] },
        aor: { HRHB: ['h_source', 'h_pocket'], RBiH: ['h_source'] },
        alliance: 0.75,
    });
    const capturedAdjacency = buildAdjacencyMap(makeEdges([['h_source', 'h_pocket']]));
    const capturedHrhb = sidFaction(computeSupplyReachability(captured, capturedAdjacency), 'HRHB');
    assert.deepStrictEqual(capturedHrhb.sources, ['h_source'], 'configured sources stay reported');
    assert.deepStrictEqual(capturedHrhb.controlled, ['h_pocket']);
    assert.deepStrictEqual(capturedHrhb.reachable_controlled, []);
    assert.deepStrictEqual(capturedHrhb.isolated_controlled, ['h_pocket']);
});

test('SID: RS remains own-only even when HRHB is allied to RBiH', () => {
    const state = makeState({
        controllers: { rs_source: 'RS', h_bridge: 'HRHB', rs_pocket: 'RS' },
        sources: { HRHB: [], RBiH: [], RS: ['rs_source'] },
        alliance: 0.75,
    });
    const adjacencyMap = buildAdjacencyMap(makeEdges([
        ['rs_source', 'h_bridge'],
        ['h_bridge', 'rs_pocket'],
    ]));
    const rs = sidFaction(computeSupplyReachability(state, adjacencyMap), 'RS');
    assert.deepStrictEqual(rs.controlled, ['rs_pocket', 'rs_source']);
    assert.deepStrictEqual(rs.reachable_controlled, ['rs_source']);
    assert.deepStrictEqual(rs.isolated_controlled, ['rs_pocket']);
});

test('OSID: allied transit reaches the pocket, excludes transit nodes, and refreshes on alliance change', () => {
    const nodes = ['h_source', 'r_bridge', 'h_pocket'];
    const state = makeState({
        controllers: { h_source: 'HRHB', r_bridge: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: [], RS: [] },
        alliance: 0.75,
    });
    const edgeList = makeEdges([
        ['h_source', 'r_bridge'],
        ['r_bridge', 'h_pocket'],
    ]);
    const { canonicalToOperational, operationalToCanonical } = osidMaps(nodes);

    const first = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const firstHrhb = osidFaction(first, 'HRHB');
    assert.deepStrictEqual(firstHrhb.controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(firstHrhb.reachable_osids, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(firstHrhb.isolated_osids, []);
    assert.ok(!firstHrhb.reachable_osids.includes('r_bridge'), 'transit node must not enter reachable_osids');
    assert.ok(firstHrhb.edges_used.includes('h_source__r_bridge'));
    assert.ok(firstHrhb.edges_used.includes('h_pocket__r_bridge'));

    const corridors = deriveCorridorsOsid(state, edgeList, first);
    assert.deepStrictEqual(
        corridors.corridors
            .filter((c) => c.faction_id === 'HRHB' && c.state !== 'cut')
            .map((c) => c.edge_id)
            .sort(),
        ['h_pocket__r_bridge', 'h_source__r_bridge'],
        'corridor derivation must retain allied transit legs',
    );

    // Break alliance on the same GameState: own controller set is unchanged.
    state.political.war_alliance_rbih_hrhb = 0.20;
    state.meta.turn = 1;
    const broken = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const brokenHrhb = osidFaction(broken, 'HRHB');
    assert.notStrictEqual(brokenHrhb, firstHrhb, 'transit eligibility change must invalidate the OSID cache');
    assert.deepStrictEqual(brokenHrhb.controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(brokenHrhb.reachable_osids, ['h_source']);
    assert.deepStrictEqual(brokenHrhb.isolated_osids, ['h_pocket']);

    // Restore alliance: cache refreshes again.
    state.political.war_alliance_rbih_hrhb = 0.75;
    state.meta.turn = 2;
    const restored = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const restoredHrhb = osidFaction(restored, 'HRHB');
    assert.notStrictEqual(restoredHrhb, brokenHrhb);
    assert.deepStrictEqual(restoredHrhb.reachable_osids, ['h_pocket', 'h_source']);
});

test('OSID: bridge owner ally->RS and ally->unknown blocks and invalidates despite unchanged own nodes', () => {
    const nodes = ['h_source', 'r_bridge', 'h_pocket'];
    const state = makeState({
        controllers: { h_source: 'HRHB', r_bridge: 'RBiH', h_pocket: 'HRHB' },
        sources: { HRHB: ['h_source'], RBiH: [], RS: [] },
        alliance: 0.75,
    });
    const edgeList = makeEdges([
        ['h_source', 'r_bridge'],
        ['r_bridge', 'h_pocket'],
    ]);
    const { canonicalToOperational, operationalToCanonical } = osidMaps(nodes);

    const allied = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const alliedHrhb = osidFaction(allied, 'HRHB');
    assert.deepStrictEqual(alliedHrhb.reachable_osids, ['h_pocket', 'h_source']);

    // Ally -> RS.
    state.political.political_controllers!['r_bridge'] = 'RS';
    state.meta.turn = 1;
    const rsOwned = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const rsHrhb = osidFaction(rsOwned, 'HRHB');
    assert.notStrictEqual(rsHrhb, alliedHrhb);
    assert.deepStrictEqual(rsHrhb.controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(rsHrhb.reachable_osids, ['h_source']);
    assert.deepStrictEqual(rsHrhb.isolated_osids, ['h_pocket']);

    // Restore alliance, then ally -> unknown.
    state.political.war_alliance_rbih_hrhb = 0.75;
    state.political.political_controllers!['r_bridge'] = 'RBiH';
    state.meta.turn = 2;
    const restored = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const restoredHrhb = osidFaction(restored, 'HRHB');
    assert.deepStrictEqual(restoredHrhb.reachable_osids, ['h_pocket', 'h_source']);

    state.political.political_controllers!['r_bridge'] = null;
    state.meta.turn = 3;
    const unknownOwned = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const unknownHrhb = osidFaction(unknownOwned, 'HRHB');
    assert.notStrictEqual(unknownHrhb, restoredHrhb, 'unknown transit ownership must invalidate the OSID cache');
    assert.deepStrictEqual(unknownHrhb.controlled, ['h_pocket', 'h_source']);
    assert.deepStrictEqual(unknownHrhb.reachable_osids, ['h_source']);
    assert.deepStrictEqual(unknownHrhb.isolated_osids, ['h_pocket']);
});

test('OSID: captured or absent own origins stay isolated; an ally depot is not borrowed', () => {
    for (const captor of ['HRHB', 'RS', null] as const) {
        const state = makeState({
            controllers: { o_source: captor, o_pocket: 'RBiH' },
            sources: { HRHB: [], RBiH: ['o_source'], RS: [] },
            aor: { RBiH: ['o_source', 'o_pocket'] }, // stale claim is irrelevant at OSID
            alliance: 0.75,
        });
        const edgeList = makeEdges([['o_source', 'o_pocket']]);
        const { canonicalToOperational, operationalToCanonical } = osidMaps(['o_source', 'o_pocket']);
        const rbih = osidFaction(
            computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical),
            'RBiH',
        );
        assert.deepStrictEqual(rbih.sources, ['o_source'], 'configured sources stay reported');
        assert.deepStrictEqual(rbih.controlled, ['o_pocket']);
        assert.deepStrictEqual(rbih.reachable_osids, [], `captor ${String(captor)} must not lend a source`);
        assert.deepStrictEqual(rbih.isolated_osids, ['o_pocket']);
    }

    const allyDepot = makeState({
        controllers: { o_depot: 'HRHB', o_pocket: 'RBiH' },
        sources: { HRHB: ['o_depot'], RBiH: [], RS: [] },
        aor: { RBiH: ['o_pocket'] },
        alliance: 0.75,
    });
    const depotEdges = makeEdges([['o_depot', 'o_pocket']]);
    const { canonicalToOperational, operationalToCanonical } = osidMaps(['o_depot', 'o_pocket']);
    const rbih = osidFaction(
        computeSupplyReachabilityOsid(allyDepot, depotEdges, canonicalToOperational, operationalToCanonical),
        'RBiH',
    );
    assert.deepStrictEqual(rbih.sources, []);
    assert.deepStrictEqual(rbih.controlled, ['o_pocket']);
    assert.deepStrictEqual(rbih.reachable_osids, []);
    assert.deepStrictEqual(rbih.isolated_osids, ['o_pocket'], 'ally depot must not supply the beneficiary');
});

test('both pipelines: a line through allied legs stays brittle/strained, not automatically adequate', () => {
    // SID: RBiH source/end with an allied HRHB bottleneck in the middle.
    const sidState = makeState({
        controllers: { s1: 'RBiH', s2: 'HRHB', s3: 'RBiH' },
        sources: { HRHB: [], RBiH: ['s1'], RS: [] },
        alliance: 0.75,
    });
    const adjacencyMap = buildAdjacencyMap(makeEdges([
        ['s1', 's2'],
        ['s2', 's3'],
    ]));
    const sidReach = computeSupplyReachability(sidState, adjacencyMap);
    const sidRbihReach = sidFaction(sidReach, 'RBiH');
    assert.deepStrictEqual(sidRbihReach.controlled, ['s1', 's3'], 'middle ally must stay out of owned membership');
    assert.deepStrictEqual(sidRbihReach.reachable_controlled, ['s1', 's3']);
    const sidCorridors = deriveCorridors(sidState, adjacencyMap, sidReach);
    const sidStates = new Map(sidCorridors.corridors.map((c) => [c.edge_id, c.state]));
    assert.strictEqual(sidStates.get('s1__s2'), 'brittle');
    assert.strictEqual(sidStates.get('s2__s3'), 'brittle');
    const sidSupply = deriveSupplyState(sidState, adjacencyMap, sidReach, sidCorridors);
    const sidRbih = sidSupply.factions.find((f) => f.faction_id === 'RBiH');
    assert.ok(sidRbih);
    assert.strictEqual(sidRbih!.by_settlement.find((e) => e.sid === 's1')?.state, 'adequate');
    assert.strictEqual(sidRbih!.by_settlement.find((e) => e.sid === 's2'), undefined, 'ally node has no beneficiary supply entry');
    assert.strictEqual(sidRbih!.by_settlement.find((e) => e.sid === 's3')?.state, 'strained');

    // OSID: same allied bottleneck, owned output stays source/end only.
    const nodes = ['o1', 'o2', 'o3'];
    const osidState = makeState({
        controllers: { o1: 'RBiH', o2: 'HRHB', o3: 'RBiH' },
        sources: { HRHB: [], RBiH: ['o1'], RS: [] },
        alliance: 0.75,
    });
    const edgeList = makeEdges([
        ['o1', 'o2'],
        ['o2', 'o3'],
    ]);
    const { canonicalToOperational, operationalToCanonical } = osidMaps(nodes);
    const osidReach = computeSupplyReachabilityOsid(osidState, edgeList, canonicalToOperational, operationalToCanonical);
    const osidRbihReach = osidFaction(osidReach, 'RBiH');
    assert.deepStrictEqual(osidRbihReach.controlled, ['o1', 'o3'], 'middle ally must stay out of owned membership');
    assert.deepStrictEqual(osidRbihReach.reachable_osids, ['o1', 'o3']);
    const osidCorridors = deriveCorridorsOsid(osidState, edgeList, osidReach);
    const osidStates = new Map(osidCorridors.corridors.map((c) => [c.edge_id, c.state]));
    assert.strictEqual(osidStates.get('o1__o2'), 'brittle');
    assert.strictEqual(osidStates.get('o2__o3'), 'brittle');
    const osidSupply = deriveSupplyStateByOsid(osidState, edgeList, osidReach, osidCorridors);
    const osidRbih = osidSupply.factions.find((f) => f.faction_id === 'RBiH');
    assert.ok(osidRbih);
    assert.strictEqual(osidRbih!.by_osid.find((e) => e.osid === 'o1')?.state, 'adequate');
    assert.strictEqual(osidRbih!.by_osid.find((e) => e.osid === 'o2'), undefined, 'ally node has no beneficiary supply entry');
    assert.strictEqual(osidRbih!.by_osid.find((e) => e.osid === 'o3')?.state, 'strained');
});

test('OSID: allied diamond keeps redundant open corridors/adequate; removing one route strains; cutting both isolates', () => {
    const nodes = ['r_a', 'r_b', 'h1', 'h2', 'h3'];
    const state = makeState({
        controllers: { r_a: 'RBiH', r_b: 'RBiH', h1: 'HRHB', h2: 'HRHB', h3: 'HRHB' },
        sources: { HRHB: [], RBiH: ['r_a'], RS: [] },
        alliance: 0.75,
    });
    const { canonicalToOperational, operationalToCanonical } = osidMaps(nodes);
    const diamond = makeEdges([
        ['r_a', 'h1'],
        ['h1', 'r_b'],
        ['r_a', 'h2'],
        ['h2', 'r_b'],
    ]);

    const reach = computeSupplyReachabilityOsid(state, diamond, canonicalToOperational, operationalToCanonical);
    const rbih = osidFaction(reach, 'RBiH');
    assert.deepStrictEqual(rbih.reachable_osids, ['r_a', 'r_b']);
    assert.ok(!rbih.reachable_osids.includes('h1'));
    assert.ok(!rbih.reachable_osids.includes('h2'));

    const corridors = deriveCorridorsOsid(state, diamond, reach);
    const fullStates = new Map(corridors.corridors.map((c) => [c.edge_id, c.state]));
    assert.strictEqual(fullStates.get('h1__r_a'), 'open');
    assert.strictEqual(fullStates.get('h1__r_b'), 'open');
    assert.strictEqual(fullStates.get('h2__r_a'), 'open');
    assert.strictEqual(fullStates.get('h2__r_b'), 'open');

    const fullSupply = deriveSupplyStateByOsid(state, diamond, reach, corridors);
    assert.strictEqual(byOsidState(fullSupply, 'RBiH', 'r_a'), 'adequate');
    assert.strictEqual(byOsidState(fullSupply, 'RBiH', 'r_b'), 'adequate');

    // Remove one route: remaining graph is a tree -> brittle, r_b strained.
    const oneRoute = diamond.filter((e) => !(e.a === 'h2' && e.b === 'r_b'));
    state.meta.turn = 1;
    const oneReach = computeSupplyReachabilityOsid(state, oneRoute, canonicalToOperational, operationalToCanonical);
    const oneCorridors = deriveCorridorsOsid(state, oneRoute, oneReach);
    assert.ok(oneCorridors.corridors.every((c) => c.state === 'brittle'));
    const oneSupply = deriveSupplyStateByOsid(state, oneRoute, oneReach, oneCorridors);
    assert.strictEqual(byOsidState(oneSupply, 'RBiH', 'r_a'), 'adequate');
    assert.strictEqual(byOsidState(oneSupply, 'RBiH', 'r_b'), 'strained');

    // Cut the remaining route as well: r_b stays in the graph but is
    // isolated from the source -> critical.
    const noRoute = makeEdges([
        ['r_a', 'h1'],
        ['r_a', 'h2'],
        ['r_b', 'h3'],
    ]);
    state.meta.turn = 2;
    const noReach = computeSupplyReachabilityOsid(state, noRoute, canonicalToOperational, operationalToCanonical);
    const noCorridors = deriveCorridorsOsid(state, noRoute, noReach);
    const noSupply = deriveSupplyStateByOsid(state, noRoute, noReach, noCorridors);
    assert.strictEqual(byOsidState(noSupply, 'RBiH', 'r_b'), 'critical');

    // Cache-derived output equals a fresh-instance compute on identical inputs.
    const fresh = makeState({
        controllers: { r_a: 'RBiH', r_b: 'RBiH', h1: 'HRHB', h2: 'HRHB' },
        sources: { HRHB: [], RBiH: ['r_a'], RS: [] },
        alliance: 0.75,
    });
    const freshReach = computeSupplyReachabilityOsid(fresh, diamond, canonicalToOperational, operationalToCanonical);
    const freshCorridors = deriveCorridorsOsid(fresh, diamond, freshReach);
    const freshSupply = deriveSupplyStateByOsid(fresh, diamond, freshReach, freshCorridors);
    assert.deepStrictEqual(freshCorridors.corridors, corridors.corridors);
    assert.deepStrictEqual(freshSupply.factions, fullSupply.factions);
});

test('OSID: an allied-owned configured source cannot be borrowed to bypass the own bottleneck', () => {
    const nodes = ['a', 'b', 'c', 'd'];
    const state = makeState({
        controllers: { a: 'RBiH', b: 'HRHB', c: 'RBiH', d: 'RBiH' },
        sources: { HRHB: [], RBiH: ['a', 'b'], RS: [] },
        alliance: 0.75,
    });
    const edgeList = makeEdges([
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'b'],
    ]);
    const { canonicalToOperational, operationalToCanonical } = osidMaps(nodes);

    const reach = computeSupplyReachabilityOsid(state, edgeList, canonicalToOperational, operationalToCanonical);
    const rbih = osidFaction(reach, 'RBiH');
    assert.deepStrictEqual(rbih.sources, ['a', 'b'], 'configured sources stay reported');
    assert.deepStrictEqual(rbih.controlled, ['a', 'c', 'd']);
    assert.deepStrictEqual(rbih.reachable_osids, ['a', 'c', 'd']);
    assert.ok(!rbih.reachable_osids.includes('b'), 'allied source node stays out of owned reachable set');

    const corridors = deriveCorridorsOsid(state, edgeList, reach);
    const states = new Map(corridors.corridors.map((c) => [c.edge_id, c.state]));
    assert.strictEqual(states.get('a__b'), 'brittle', 'own->ally leg is a single-point bottleneck');
    assert.strictEqual(states.get('b__c'), 'open');
    assert.strictEqual(states.get('b__d'), 'open');
    assert.strictEqual(states.get('c__d'), 'open');

    const supply = deriveSupplyStateByOsid(state, edgeList, reach, corridors);
    assert.strictEqual(byOsidState(supply, 'RBiH', 'a'), 'adequate');
    assert.strictEqual(byOsidState(supply, 'RBiH', 'c'), 'strained', 'unowned allied source b must not seed adequate supply');
    assert.strictEqual(byOsidState(supply, 'RBiH', 'd'), 'strained');
});
