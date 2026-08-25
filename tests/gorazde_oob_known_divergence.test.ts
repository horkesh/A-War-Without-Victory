/**
 * GORAŽDE / `rs_5th_podrinje` — KNOWN-DIVERGENCE PIN.
 *
 * This is the mirror of T6 in `nw_bosnia_oob_correctness.test.ts`, and it exists
 * for the same reason: the playable data on this row is DELIBERATELY WRONG ON THE
 * HISTORY, and both halves of that statement have to stay true at once.
 *
 * IT EXISTS BECAUSE THE FINDING WAS ALREADY LOST ONCE. Before this file, the
 * Goražde correction lived only as prose in `docs/provenance/OFFICER_OOB_PROVENANCE.json`.
 * Prose is not enforced, and an automated provenance pass had already deleted
 * neighbouring findings on exactly that basis. A finding carried only by a comment
 * is a finding waiting for the next sweep.
 *
 * THE HISTORY. Balkan Battlegrounds places the 5th Podrinje at GORAŽDE and NEVER at
 * Vlasenica at any date (Vol. II PDF p.310/printed 291 fn 121; PDF p.416/printed 397
 * fn 42). The Vlasenica value in the playable data is a transcription error off
 * Appendix G's "5th ..., HQ Vlasenica" corps-troops column. It is known-wrong.
 *
 * WHY THE CORRECT VALUE COULD NOT BE USED, measured in run n223
 * (runs/apr1992_definitive_188w__9e902ad68783fbe7__w188_n223, destroyed_brigades.json).
 * Homed at the only available Goražde cell the brigade recorded `battles_fought: 0`,
 * `total_casualties_taken: 857`, `turn_destroyed: 172`, `lifecycle_status: "destroyed"`.
 * It never fought. It bled out passively inside the pocket. In the n222 baseline the
 * same brigade finishes the campaign ACTIVE with 1,557 personnel at
 * `op:rogatica:rogatica_2` after 2 battles. The revert is therefore
 * ON CALIBRATION GROUNDS, NOT EVIDENCE GROUNDS.
 *
 * WHY NO OTHER GORAŽDE CELL WOULD HAVE WORKED EITHER — this is the part that must not
 * have to be re-derived, and the third test below pins it as a computed fact rather
 * than as a claim. Enumerated over the 17 real Goražde OSIDs: four are RS-held at t0
 * (`glamoc`, `kamen`, `podkozara_donja_2`, `sopotnica`); `glamoc` and `kamen` have
 * zero neighbours outside the municipality at all; `podkozara_donja_2` has two but
 * none RS-held; only `sopotnica` has a land connection to RS territory
 * (`op:rogatica:varosiste_2`) and it sits inside the enclave guard key space AND is an
 * Operation Zvezda 94 objective. The candidate set is EMPTY. No selection rule of any
 * kind had a correct output — this is an engine-representation gap, not a data-entry
 * gap, and it is why the row is wrong on purpose.
 *
 * DO NOT "FIX" THIS FILE by asserting `gorazde` again. That is not a restoration, it
 * is a re-application of a change that was measured and withdrawn. If you intend to
 * carry the historically correct home, the prerequisite is a supplied Goražde cell —
 * i.e. the third test below must legitimately change — not an edit to the OOB row.
 */

import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { test } from 'vitest';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import { ENCLAVE_DEFINITIONS } from '../src/sim/combat/enclave_resilience.js';

const REPO_ROOT = process.cwd();
const PROVENANCE_PATH = path.join(REPO_ROOT, 'docs', 'provenance', 'OFFICER_OOB_PROVENANCE.json');
const GORAZDE_PREFIX = 'op:gorazde:';

async function readJson(filePath: string): Promise<any> {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('G1: KNOWN DIVERGENCE — rs_5th_podrinje carries the mechanically-required Vlasenica value', async () => {
    const brigades = await loadOobBrigades(REPO_ROOT);
    const podrinje = brigades.find(b => b.id === 'rs_5th_podrinje');
    assert.ok(podrinje, 'rs_5th_podrinje must exist in the OOB');

    const why =
        'This row is deliberately divergent from the evidence, and Vlasenica is the ' +
        'KNOWN-WRONG value being held on purpose. Balkan Battlegrounds places this ' +
        'brigade at GORAŽDE and never at Vlasenica (BB2 p.310/291 fn 121, p.416/397 ' +
        'fn 42). The correct Goražde placement was implemented and measured in run ' +
        'n223: battles_fought 0, total_casualties_taken 857, turn_destroyed 172, ' +
        'lifecycle_status "destroyed" — the brigade never fought once and bled out ' +
        'passively inside the pocket, because its only available cell is ' +
        'supply-isolated from turn zero. The n222 baseline has the same brigade ' +
        'finishing ACTIVE with 1,557 personnel at op:rogatica:rogatica_2 after 2 ' +
        'battles. Reverted on CALIBRATION GROUNDS, NOT EVIDENCE GROUNDS. Do not ' +
        'restore the Goražde value on the strength of the citation alone — see G3 ' +
        'below, which pins the reason no Goražde cell works, and ' +
        'docs/provenance/OFFICER_OOB_PROVENANCE.json.';

    assert.strictEqual(podrinje.home_mun, 'vlasenica', why);
    assert.strictEqual(podrinje.home_osid, 'op:vlasenica:sebiocina', why);
});

test('G2: the Goražde finding survives the divergence in machine-readable provenance', async () => {
    const record = (await readJson(PROVENANCE_PATH)).records?.['brigade:rs_5th_podrinje'];
    assert.ok(record, 'the provenance record must exist — it is the only carrier of the Goražde finding');

    const citation = String(record.citation ?? '');
    for (const fragment of ['footnote 121', 'footnote 42', '1st GORAZDE Light Infantry Brigade']) {
        assert.ok(citation.includes(fragment),
            `provenance citation must still carry the BB2 Goražde evidence (${fragment}). ` +
            'The playable data diverges from this finding; deleting the finding would ' +
            'convert a documented divergence into a silent error — which is exactly how ' +
            'the original Vlasenica transcription survived unnoticed.');
    }

    // The scope caveat is load-bearing: the citation supports the MUNICIPALITY and
    // nothing finer. Losing it invites a future reader to treat the BB pages as though
    // they endorsed a specific cell, which they never did.
    assert.ok(citation.includes('MUNICIPALITY ONLY — THIS CITATION DOES NOT COVER THE home_osid'),
        'the citation must retain its MUNICIPALITY-ONLY scope caveat; without it the BB ' +
        'pages read as though they endorsed a settlement-level home, which they do not');

    const conflictNote = String(record.conflict_note ?? '');
    assert.ok(conflictNote.includes('CALIBRATION GROUNDS, NOT ON EVIDENCE GROUNDS'),
        'the conflict_note must state that Vlasenica is restored on calibration grounds ' +
        'and not on evidence grounds — that sentence is what stops a future reader from ' +
        're-deriving the Goražde fix and rediscovering the 857-casualty result');
    assert.ok(conflictNote.includes('never places this brigade at Vlasenica'),
        'the conflict_note must keep recording that the held value is known-wrong; a ' +
        'divergence that stops describing itself as one becomes an ordinary error');
    assert.ok(conflictNote.includes('battles_fought 0'),
        'the conflict_note must retain the measured mechanism (battles_fought 0 / 857 ' +
        'casualties), not merely the conclusion');
});

test('G3: ENUMERATED — no RS-held Goražde cell at t0 is both outside the enclave guard and land-connected to RS territory', async () => {
    // This recomputes the finding rather than trusting it. If it ever legitimately
    // fails, that is the signal that the engine CAN now represent a supplied VRS
    // brigade in Goražde municipality — at which point G1 should be revisited, and
    // this test is the evidence that it may be.
    const [graph, startup] = await Promise.all([
        readJson(path.join(REPO_ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json')),
        readJson(path.join(REPO_ROOT, 'data', 'derived', 'startup', 'apr_1992_initial_save.json')),
    ]);

    const controllers: Record<string, string> = startup.political.initial_political_controllers;
    assert.ok(controllers && Object.keys(controllers).length > 0,
        'startup snapshot must expose initial_political_controllers');

    const adjacency = new Map<string, Set<string>>();
    for (const edge of graph.edges as Array<{ a: string; b: string }>) {
        if (!adjacency.has(edge.a)) adjacency.set(edge.a, new Set());
        if (!adjacency.has(edge.b)) adjacency.set(edge.b, new Set());
        adjacency.get(edge.a)!.add(edge.b);
        adjacency.get(edge.b)!.add(edge.a);
    }

    const gorazdeCells = [...adjacency.keys()].filter(id => id.startsWith(GORAZDE_PREFIX)).sort();
    // Liveness (napkin 0h/B): assert the set we iterate is non-empty and the expected
    // size, so a topology rename cannot turn this into a green loop over nothing.
    assert.strictEqual(gorazdeCells.length, 17,
        `expected 17 Goražde cells in the contact graph, found ${gorazdeCells.length}. ` +
        'If the topology legitimately changed, re-run the enumeration before adjusting ' +
        'this number — the whole point of this test is that the count is evidence.');

    const gorazdeGuard = ENCLAVE_DEFINITIONS.find(def => def.id === 'gorazde');
    assert.ok(gorazdeGuard?.osid_list, 'the gorazde enclave definition must expose an osid_list');
    const guarded = new Set(gorazdeGuard!.osid_list as readonly string[]);

    const rsHeld = gorazdeCells.filter(id => controllers[id] === 'RS');
    assert.ok(rsHeld.length > 0,
        'liveness: at least one Goražde cell must be RS-held at t0, else this test proves nothing');

    // A cell is viable only if it is (a) outside the guard key space, so a turn-0 VRS
    // brigade does not sit in the guard's watched cells, and (b) adjacent to RS-held
    // territory outside the municipality, so it is not supply-isolated from turn zero.
    const viable = rsHeld.filter(id => {
        if (guarded.has(id)) return false;
        const neighbours = [...(adjacency.get(id) ?? [])];
        return neighbours.some(n => !n.startsWith(GORAZDE_PREFIX) && controllers[n] === 'RS');
    });

    assert.deepStrictEqual(viable, [],
        'A viable Goražde home for a VRS brigade now exists, where the enumeration ' +
        'behind rs_5th_podrinje\'s known divergence found NONE. Candidates examined: ' +
        `${rsHeld.join(', ')}. This is not a test to silence — it is the precondition ` +
        'for restoring the historically correct Goražde home (see G1). Verify against ' +
        'operation staging/objective cells before using it, then re-measure at 188w: ' +
        'the previous attempt died at turn 172 having fought zero battles.');

    // Pin the two component reasons separately, so a future failure says WHICH changed.
    assert.deepStrictEqual(rsHeld.filter(id => !guarded.has(id)), ['op:gorazde:podkozara_donja_2'],
        'the set of RS-held Goražde cells outside the enclave guard is expected to be ' +
        'exactly one cell. A selection rule with a candidate set of size 1 is a fixed ' +
        'choice wearing a derivation (napkin 0n) — and that one cell is Operation ' +
        'Zvezda 94\'s staging OSID, which is how the brigade came to be homed on a ' +
        'staging cell inside a pocket in the first place.');
});
