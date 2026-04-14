/**
 * Tests for the enclave guard in consolidateRearPockets.
 *
 * Root cause: interior enclave OSIDs (Sarajevo city fragments, Srebrenica pocket)
 * are topologically surrounded by the besieging faction from turn 1. When no ARBiH
 * brigade is physically present, consolidateRearPockets previously saw allSurrounded=true
 * and hasDefender=false → auto-flip to RS without a battle.
 *
 * Fix: before the flip loop, check if any OSID in the cluster belongs to an enclave
 * whose faction is NOT the surrounding faction. If yes, suppress the flip.
 *
 * Tests:
 *   1. Surrounded Sarajevo OSID (novi_grad prefix) → flip suppressed
 *   2. Surrounded non-enclave OSID → flip fires normally
 *   3. Defender physically present at enclave OSID → hasDefender blocks before enclave guard
 *   4. Multi-OSID cluster where one member is an enclave OSID → whole cluster protected
 *   5. Srebrenica enclave OSID surrounded by RS → flip suppressed (generality)
 *   6. Broad prefix-only Bihać pocket teeth are not protected from cleanup
 */

import { describe, it, expect } from 'vitest';
import { consolidateRearPockets } from '../src/sim/combat/rear_pocket_consolidation.js';
import type { GameState, FactionId, FormationState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RS: FactionId = 'RS';
const RBIH: FactionId = 'RBiH';

/** Build a minimal GameState adequate for consolidateRearPockets. */
function makeState(options: {
    pc: Record<string, FactionId>;
    brigades?: Array<{ id: string; faction: FactionId; location_osid: string }>;
}): GameState {
    const { pc, brigades = [] } = options;

    const formations: Record<string, FormationState> = {};
    for (const b of brigades) {
        formations[b.id] = {
            id: b.id,
            name: b.id,
            faction: b.faction,
            kind: 'brigade',
            status: 'active',
            personnel: 800,
            cohesion: 70,
            morale: 70,
            experience: 0.4,
            corps_id: 'test_corps',
            location_osid: b.location_osid,
            home_osid: b.location_osid,
            tags: [],
        } as unknown as FormationState;
    }

    return {
        meta: {
            turn: 10,
            phase: 'war',
            seed: 'test',
            scenario_start_date: { year: 1993, month: 1, day: 1 },
        },
        factions: [{ id: RS }, { id: RBIH }],
        military: {
            formations,
            corps_front_sectors: {},
            brigade_movement_orders: {},
        },
        political: {
            political_controllers: { ...pc },
            control_events: [],
        },
        displacement: {
            hostile_takeover_timers: {},
        },
    } as unknown as GameState;
}

/**
 * Build an EdgeRecord list that expresses a surrounded topology:
 *
 *   [rs_bulk...] ── outer[i] ── center (RBiH)
 *
 * rs_bulk is a list of RS OSIDs that connect to each ring node. The RS
 * cluster formed by {outer + rs_bulk} must exceed MAX_POCKET_CLUSTER (6)
 * so consolidateRearPockets marks it `tooLarge` and skips it — correctly
 * leaving only the small enclave cluster (center) to be evaluated.
 *
 * All rs_bulk nodes must appear in pc as the ring faction's territory.
 */
function makeSurroundedEdges(
    center: string,
    outer: string[],
    rsBulk: string[],
): EdgeRecord[] {
    const edges: EdgeRecord[] = [];
    // center ↔ each ring node
    for (const o of outer) {
        edges.push({ a: center, b: o } as EdgeRecord);
    }
    // ring nodes ↔ first bulk node (they join the large RS cluster)
    for (const o of outer) {
        edges.push({ a: o, b: rsBulk[0]! } as EdgeRecord);
    }
    // bulk nodes form a chain: bulk[0] ── bulk[1] ── ... ── bulk[n]
    for (let i = 0; i < rsBulk.length - 1; i++) {
        edges.push({ a: rsBulk[i]!, b: rsBulk[i + 1]! } as EdgeRecord);
    }
    return edges;
}

// ─── OSID constants ───────────────────────────────────────────────────────────

// Sarajevo enclave — prefix 'op:novi_grad_sarajevo:'
const SAR_INTERIOR = 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo';
// Stari Grad — also in Sarajevo enclave prefix 'op:stari_grad_sarajevo:'
const SAR_STARI = 'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo';

// RS-controlled ring around Sarajevo interior
const RS_RING = [
    'op:ilidza:ilidza_2',
    'op:ilidza:otes_2',
    'op:rajlovac:rajlovac_2',
];

// RS bulk territory — 5 nodes so that RS cluster (3 ring + 5 bulk = 8) exceeds
// MAX_POCKET_CLUSTER (6), causing consolidateRearPockets to skip the RS cluster
// as tooLarge. Only the small enclave RBiH cluster (1 node) gets evaluated.
const RS_BULK = [
    'op:pale:pale_rs_a',
    'op:pale:pale_rs_b',
    'op:pale:pale_rs_c',
    'op:pale:pale_rs_d',
    'op:pale:pale_rs_e',
];

// A plain RBiH OSID not belonging to any enclave
const PLAIN_RBIH = 'op:kalinovik:kalinovik_2';

// RS neighbours for the plain OSID + bulk so the RS cluster is also tooLarge
const RS_PLAIN_NEIGHBOURS = [
    'op:kalinovik:kalinovik_rs_a',
    'op:kalinovik:kalinovik_rs_b',
];
const RS_PLAIN_BULK = [
    'op:kalinovik:kalinovik_rs_c',
    'op:kalinovik:kalinovik_rs_d',
    'op:kalinovik:kalinovik_rs_e',
    'op:kalinovik:kalinovik_rs_f',
    'op:kalinovik:kalinovik_rs_g',
];

// Srebrenica enclave — explicit osid_list member
const SREBRENICA_OSID = 'op:srebrenica:srebrenica_2';
const RS_DRINA_RING = [
    'op:srebrenica:bratunac_2',
    'op:vlasenica:milici_2',
    'op:zvornik:zvornik_rs',
];
const RS_DRINA_BULK = [
    'op:zvornik:zvornik_rs_a',
    'op:zvornik:zvornik_rs_b',
    'op:zvornik:zvornik_rs_c',
    'op:zvornik:zvornik_rs_d',
    'op:zvornik:zvornik_rs_e',
];

const BIHAC_TOOTH = 'op:bihac:orasac_2';
const KRUPA_TOOTH = 'op:bosanska_krupa:arapusa_2';
const RS_BIHAC_RING = [
    'op:bihac:racic',
    'op:bihac:trubar',
];
const RS_BIHAC_BULK = [
    'op:bihac:bulk_a',
    'op:bihac:bulk_b',
    'op:bihac:bulk_c',
    'op:bihac:bulk_d',
    'op:bihac:bulk_e',
];
const RS_KRUPA_RING = [
    'op:bosanska_krupa:donji_dubovik_2',
    'op:bosanska_krupa:jasenica_2',
];
const RS_KRUPA_BULK = [
    'op:bosanska_krupa:bulk_a',
    'op:bosanska_krupa:bulk_b',
    'op:bosanska_krupa:bulk_c',
    'op:bosanska_krupa:bulk_d',
    'op:bosanska_krupa:bulk_e',
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('consolidateRearPockets — enclave guard', () => {

    it('Test 1: surrounded Sarajevo interior OSID → flip suppressed', () => {
        // SAR_INTERIOR (RBiH) is fully surrounded by RS ring.
        // No ARBiH brigade present. Without the enclave guard this would flip.
        // With the guard: cluster contains an enclave OSID → no flip.
        // RS cluster (3 ring + 5 bulk = 8 nodes) exceeds MAX_POCKET_CLUSTER so it
        // is skipped as tooLarge — leaving only the 1-node enclave cluster evaluated.
        const pc: Record<string, FactionId> = { [SAR_INTERIOR]: RBIH };
        for (const n of RS_RING) pc[n] = RS;
        for (const n of RS_BULK) pc[n] = RS;

        const state = makeState({ pc });
        const edges = makeSurroundedEdges(SAR_INTERIOR, RS_RING, RS_BULK);
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers![SAR_INTERIOR]).toBe(RBIH);
    });

    it('Test 2: surrounded non-enclave OSID → flip fires normally', () => {
        // PLAIN_RBIH is fully surrounded by RS. No brigade present. No enclave membership.
        // RS cluster (2 ring + 5 bulk = 7 nodes) is tooLarge — only PLAIN_RBIH evaluated.
        // Expected: PLAIN_RBIH flips to RS.
        const pc: Record<string, FactionId> = { [PLAIN_RBIH]: RBIH };
        for (const n of RS_PLAIN_NEIGHBOURS) pc[n] = RS;
        for (const n of RS_PLAIN_BULK) pc[n] = RS;

        const state = makeState({ pc });
        const edges = makeSurroundedEdges(PLAIN_RBIH, RS_PLAIN_NEIGHBOURS, RS_PLAIN_BULK);
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(1);
        expect(state.political.political_controllers![PLAIN_RBIH]).toBe(RS);
        expect(report.flipped[0]).toMatchObject({ osid: PLAIN_RBIH, from: RBIH, to: RS });
    });

    it('Test 3: defender physically present at enclave OSID → hasDefender blocks before enclave guard', () => {
        // A physical defender blocks the flip upstream of the enclave guard.
        const pc: Record<string, FactionId> = { [SAR_INTERIOR]: RBIH };
        for (const n of RS_RING) pc[n] = RS;
        for (const n of RS_BULK) pc[n] = RS;

        const state = makeState({
            pc,
            brigades: [{ id: 'arbih_115th', faction: RBIH, location_osid: SAR_INTERIOR }],
        });
        const edges = makeSurroundedEdges(SAR_INTERIOR, RS_RING, RS_BULK);
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers![SAR_INTERIOR]).toBe(RBIH);
    });

    it('Test 4: multi-OSID cluster where one member is an enclave OSID → whole cluster protected', () => {
        // SAR_INTERIOR and SAR_STARI form a 2-OSID connected RBiH cluster, both surrounded by RS.
        // SAR_INTERIOR belongs to the Sarajevo enclave → whole cluster protected.
        // RS cluster (ring + bulk) is tooLarge so it is skipped automatically.
        const pc: Record<string, FactionId> = {
            [SAR_INTERIOR]: RBIH,
            [SAR_STARI]: RBIH,
        };
        for (const n of RS_RING) pc[n] = RS;
        for (const n of RS_BULK) pc[n] = RS;

        const state = makeState({ pc });
        const edges: EdgeRecord[] = [
            // cluster internal edge
            { a: SAR_INTERIOR, b: SAR_STARI } as EdgeRecord,
            // ring nodes surround both cluster OSIDs
            ...RS_RING.map(n => ({ a: SAR_INTERIOR, b: n } as EdgeRecord)),
            ...RS_RING.map(n => ({ a: SAR_STARI, b: n } as EdgeRecord)),
            // ring connects to bulk[0]; bulk forms a chain — makes RS cluster tooLarge
            ...RS_RING.map(n => ({ a: n, b: RS_BULK[0]! } as EdgeRecord)),
            ...RS_BULK.slice(0, -1).map((b, i) => ({ a: b, b: RS_BULK[i + 1]! } as EdgeRecord)),
        ];
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers![SAR_INTERIOR]).toBe(RBIH);
        expect(state.political.political_controllers![SAR_STARI]).toBe(RBIH);
    });

    it('Test 5: Srebrenica enclave OSID surrounded by RS → flip suppressed (generality check)', () => {
        // Srebrenica is defined via osid_list (not prefix). The guard handles both
        // osid_prefixes and osid_list enclave definitions.
        const pc: Record<string, FactionId> = { [SREBRENICA_OSID]: RBIH };
        for (const n of RS_DRINA_RING) pc[n] = RS;
        for (const n of RS_DRINA_BULK) pc[n] = RS;

        const state = makeState({ pc });
        const edges = makeSurroundedEdges(SREBRENICA_OSID, RS_DRINA_RING, RS_DRINA_BULK);
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers![SREBRENICA_OSID]).toBe(RBIH);
    });

    it('Test 6: broad prefix-only Bihać pocket teeth do not block surrounded-pocket cleanup', () => {
        const pc: Record<string, FactionId> = {
            [BIHAC_TOOTH]: RBIH,
            [KRUPA_TOOTH]: RBIH,
        };
        for (const n of RS_BIHAC_RING) pc[n] = RS;
        for (const n of RS_BIHAC_BULK) pc[n] = RS;
        for (const n of RS_KRUPA_RING) pc[n] = RS;
        for (const n of RS_KRUPA_BULK) pc[n] = RS;

        const state = makeState({ pc });
        const edges: EdgeRecord[] = [
            ...makeSurroundedEdges(BIHAC_TOOTH, RS_BIHAC_RING, RS_BIHAC_BULK),
            ...makeSurroundedEdges(KRUPA_TOOTH, RS_KRUPA_RING, RS_KRUPA_BULK),
        ];
        const reverseMap = new Map();

        const report = consolidateRearPockets(state, edges, reverseMap);

        expect(report.total_flipped).toBe(2);
        expect(state.political.political_controllers![BIHAC_TOOTH]).toBe(RS);
        expect(state.political.political_controllers![KRUPA_TOOTH]).toBe(RS);
    });

});
