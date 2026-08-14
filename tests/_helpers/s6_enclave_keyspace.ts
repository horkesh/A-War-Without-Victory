/**
 * §6 enclave key-space + enclave-rim DERIVATION (RC panel criteria 4 and 7).
 *
 * WHY THIS IS A DERIVATION AND NOT A LIST
 * ---------------------------------------
 * `ENCLAVE_DEFINITIONS` already exists in THREE places — the engine
 * (`src/sim/combat/enclave_resilience.ts`), the standalone verifier
 * (`tools/verify_collapse_section6.cjs`), and the map UI
 * (`src/ui/map/data/GameStateAdapter.ts`). The UI copy has ALREADY DRIFTED: it carries
 * 15 Goražde entries against the engine's 18, because three were added in March 1993-era
 * calibration work and nothing pins the replica. A hardcoded 84-OSID list in a test would
 * become replica #4 and would drift in exactly the same way, silently — a §6 gate that
 * asserts against a stale key space is a §6 gate that has stopped guarding part of the
 * enclave.
 *
 * So both key sets are derived at test time from two sources of truth:
 *   - the engine's own G1 predicate `getEnclaveDefForOsid` (NOT a copy of the prefixes
 *     and lists it consults — the predicate itself), applied over
 *   - the 712-OSID universe and adjacency of
 *     `data/derived/operational/operational_contact_graph.json`.
 *
 * The panel's counts (SET A = 84, SET B = 43) are asserted as SANITY PINS ON THE
 * DERIVATION in the criterion suite. They are not the data. If the enclave geometry
 * legitimately changes, the pin goes red and asks to be re-blessed — which is the point.
 *
 * TERMS
 * -----
 * SET A ("guarded key space") — every OSID in the 712-node universe for which
 *   `getEnclaveDefForOsid` returns non-null. All 9 enclaves: the six RBiH families
 *   (Bihać and Sarajevo are PREFIX enclaves, expanded here) plus the three HRHB pockets.
 *   Panel figure: 84. This is the key space criterion 4 asserts ON-vs-OFF identity over.
 *
 * SET B ("enclave rim") — the 1-ring over the contact graph seeded from the FULL SET-A
 *   membership of the four must-hold enclaves (Goražde, Bihać, Teočak, Sarajevo core),
 *   MINUS anything that is itself in SET A. Panel figure: 43. These are the cells the §6
 *   guard does NOT protect: the guard is own-OSID-only, so an enclave can be hollowed out
 *   through its unguarded rim, severed by ordinary combat, and lost with no guarded OSID
 *   ever acquiring `collapse_damage`.
 *
 * DEAD KEYS — panel defect D2: `op:gorazde:novakovici` and `op:gorazde:zorlaci` are in
 *   `ENCLAVE_DEFINITIONS` but are not nodes in the 712-OSID universe, so the Goražde
 *   list reads 18 and only 16 resolve. Reported here (and compared for identity anyway,
 *   which is free) rather than silently dropped.
 *
 * Determinism: pure set/graph arithmetic over persisted data. No RNG, no wall-clock, no
 * filesystem metadata; every emitted array is sorted with `strictCompare`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENCLAVE_DEFINITIONS, getEnclaveDefForOsid } from '../../src/sim/combat/enclave_resilience.js';
import { strictCompare } from '../../src/state/validateGameState.js';

/** The four enclaves whose OUTCOME the §6 guard promises: they must not fall. */
export const MUST_HOLD_ENCLAVE_IDS: readonly string[] = ['bihac_pocket', 'gorazde', 'sarajevo', 'teocak'];

/** Teočak salient tip — the far end of the corridor criterion 7 asserts stays attached. */
export const TEOCAK_OSID = 'op:ugljevik:teocak_krstac_2';
/**
 * The 2nd Corps landmass anchor. `enclave_resilience.ts:150-157` states the attachment
 * explicitly: Teočak reaches the ~81-OSID RBiH component via
 * `op:zvornik:rastosnica_2 → kalesija → tuzla`. Tuzla town is the end of that named chain.
 */
export const TUZLA_OSID = 'op:tuzla:tuzla_2';

export const CONTACT_GRAPH_PATH = join('data', 'derived', 'operational', 'operational_contact_graph.json');

interface ContactGraphFile {
    nodes: Array<{ id: string }>;
    edges: Array<{ a: string; b: string }>;
}

export interface OperationalGraph {
    /** Every OSID in the operational universe, sorted. Panel figure: 712. */
    readonly osids: readonly string[];
    /** Undirected adjacency; every neighbour list sorted, every universe OSID present. */
    readonly adjacency: ReadonlyMap<string, readonly string[]>;
}

/** Load the OSID contact graph. The ONLY fs access is reading the file's bytes. */
export function loadOperationalGraph(baseDir: string): OperationalGraph {
    const raw = JSON.parse(readFileSync(join(baseDir, CONTACT_GRAPH_PATH), 'utf8')) as ContactGraphFile;
    const osids = raw.nodes.map(n => n.id).sort(strictCompare);
    const universe = new Set(osids);

    const adjacency = new Map<string, string[]>();
    for (const osid of osids) adjacency.set(osid, []);
    for (const edge of raw.edges) {
        // Edges referencing a non-node are ignored: the universe is the node list.
        if (!universe.has(edge.a) || !universe.has(edge.b)) continue;
        adjacency.get(edge.a)!.push(edge.b);
        adjacency.get(edge.b)!.push(edge.a);
    }
    for (const [osid, neighbours] of adjacency) {
        adjacency.set(osid, [...new Set(neighbours)].sort(strictCompare));
    }
    return { osids, adjacency };
}

export interface EnclaveKeySpace {
    /** SET A — every universe OSID the G1 predicate resolves to an enclave. Sorted. */
    readonly guarded: readonly string[];
    /** SET A as a set, for membership tests. */
    readonly guardedSet: ReadonlySet<string>;
    /** SET A partitioned by enclave id; each member list sorted, map keys sorted. */
    readonly byEnclave: ReadonlyMap<string, readonly string[]>;
    /** Defect D2 — `osid_list` members that are not nodes in the universe. Sorted. */
    readonly deadKeys: readonly string[];
}

/**
 * Derive SET A by applying the LIVE G1 predicate to every OSID in the universe.
 *
 * Deliberately does not read `osid_prefixes` / `osid_list` to rebuild the geometry — it
 * asks `getEnclaveDefForOsid`, the same function `isPhase3DEnclaveGuarded` asks. If the
 * predicate changes, this derivation changes with it, which is the whole design.
 */
export function deriveEnclaveKeySpace(graph: OperationalGraph): EnclaveKeySpace {
    const guarded: string[] = [];
    const byEnclave = new Map<string, string[]>();
    for (const osid of graph.osids) {
        const def = getEnclaveDefForOsid(osid);
        if (def === null) continue;
        guarded.push(osid);
        const bucket = byEnclave.get(def.id);
        if (bucket) bucket.push(osid);
        else byEnclave.set(def.id, [osid]);
    }
    guarded.sort(strictCompare);

    const universe = new Set(graph.osids);
    const deadKeys: string[] = [];
    for (const def of ENCLAVE_DEFINITIONS) {
        for (const osid of def.osid_list ?? []) {
            if (!universe.has(osid)) deadKeys.push(osid);
        }
    }
    deadKeys.sort(strictCompare);

    const sortedByEnclave = new Map<string, readonly string[]>();
    for (const id of [...byEnclave.keys()].sort(strictCompare)) {
        sortedByEnclave.set(id, [...byEnclave.get(id)!].sort(strictCompare));
    }

    return { guarded, guardedSet: new Set(guarded), byEnclave: sortedByEnclave, deadKeys };
}

export interface EnclaveRim {
    /** SET B — the union 1-ring. Sorted. Panel figure: 43. */
    readonly ring1: readonly string[];
    /** 1-ring attributable to each seed enclave (cells shared by two enclaves appear twice). */
    readonly ring1ByEnclave: ReadonlyMap<string, readonly string[]>;
    /** ring1 ∪ ring2 — DIAGNOSTIC ONLY, never asserted. Sorted. Panel figure: 110. */
    readonly ring2: readonly string[];
}

/**
 * Derive the enclave rim: unguarded cells within 1 (and, for the diagnostic, 2) hops of
 * the four must-hold enclaves.
 *
 * The seeds are the enclaves' FULL SET-A membership, not their capitals. A capital-only
 * seed reproduces exactly the hole criterion 7 exists to close: an enclave can be reduced
 * to its capital cell without a capital assertion noticing.
 *
 * The 2-ring expands from ring-1 cells only and never traverses through a guarded cell —
 * it is a strain-neighbourhood diagnostic, not a reachability set.
 */
export function deriveEnclaveRim(
    graph: OperationalGraph,
    keySpace: EnclaveKeySpace,
    enclaveIds: readonly string[] = MUST_HOLD_ENCLAVE_IDS,
): EnclaveRim {
    const ring1Set = new Set<string>();
    const ring1ByEnclave = new Map<string, readonly string[]>();

    for (const enclaveId of [...enclaveIds].sort(strictCompare)) {
        const seeds = keySpace.byEnclave.get(enclaveId) ?? [];
        const own = new Set<string>();
        for (const seed of seeds) {
            for (const neighbour of graph.adjacency.get(seed) ?? []) {
                if (keySpace.guardedSet.has(neighbour)) continue;
                own.add(neighbour);
            }
        }
        const sorted = [...own].sort(strictCompare);
        ring1ByEnclave.set(enclaveId, sorted);
        for (const osid of sorted) ring1Set.add(osid);
    }

    const ring2Set = new Set(ring1Set);
    for (const osid of [...ring1Set].sort(strictCompare)) {
        for (const neighbour of graph.adjacency.get(osid) ?? []) {
            if (keySpace.guardedSet.has(neighbour)) continue;
            ring2Set.add(neighbour);
        }
    }

    return {
        ring1: [...ring1Set].sort(strictCompare),
        ring1ByEnclave,
        ring2: [...ring2Set].sort(strictCompare),
    };
}

// ── Control-map comparison primitives (pure; the assertions call these) ──────

export type ControllerMap = Readonly<Record<string, string | null | undefined>>;

export interface ControllerDivergence {
    readonly osid: string;
    readonly off: string | null | undefined;
    readonly on: string | null | undefined;
}

/** Render a divergence list into a stable, greppable failure message body. */
export function formatDivergences(divergences: readonly ControllerDivergence[]): string {
    return divergences.map(d => `${d.osid}: OFF=${String(d.off)} ON=${String(d.on)}`).join('; ');
}

/**
 * LIVENESS — how many of `keys` the control map actually RESOLVES.
 *
 * This is the counter-measure to the vacuity class that has now bitten this lane three
 * times. `findControllerDivergences` over two EMPTY maps compares `undefined` against
 * `undefined` 84 times and reports zero divergences: a confident green that asserted
 * nothing. The same shape already exists in the §6 G2 suite, where the three
 * full-keyspace loops iterate zero times against a `collapse_damage.by_entity` that holds
 * 0 keys, and the receipt still reads EXECUTED.
 *
 * A zero-violation result is only meaningful next to the number of things examined, so
 * every criterion asserts its resolved count as well as its violation count. A measured
 * 188w artifact carries all 712 universe OSIDs in `political_controllers` with no extras,
 * so the expected resolution over any derived subset is the full subset — anything less
 * means an empty map, a wrong field path, or a key space that has drifted off the data.
 */
export function countResolved(keys: readonly string[], map: ControllerMap): number {
    let resolved = 0;
    for (const osid of keys) {
        if (map[osid] !== undefined) resolved += 1;
    }
    return resolved;
}

/**
 * CRITERION 4 core — every key must carry the IDENTICAL controller value in both runs.
 *
 * *** IDENTITY, NEVER "is RBiH-held". ***
 * The gate packet's literal wording ("every Goražde OSID remains RBiH at war's end")
 * ALREADY FAILS at HEAD before any collapse change: 21 of the 84 guarded OSIDs are not
 * held by their enclave's faction. Srebrenica's 11 and Žepa's 1 fell — correctly, that is
 * the genocide the rupture floor exists to record. Goražde `glamoc`/`kamen`/`sopotnica`,
 * Bihać `orasac_2`/`trubar` and Sarajevo `radava`/`recica`/`faletici` are prefix/list
 * over-coverage, and `op:novo_sarajevo:lukavica` is the SRK's own HQ — RS-held is
 * HISTORICALLY CORRECT there. An absolute check goes red on day one, and the tempting
 * "fix" is to shrink back to the four capitals, which is the hole this closes.
 *
 * Identity asks the only question §6 actually poses to a collapse change: did turning
 * collapse ON move any enclave cell that collapse-OFF did not move?
 *
 * `undefined` (key absent) and `null` are compared as distinct values — a key that
 * disappears from one map IS a divergence.
 */
export function findControllerDivergences(
    keys: readonly string[],
    off: ControllerMap,
    on: ControllerMap,
): ControllerDivergence[] {
    const divergences: ControllerDivergence[] = [];
    for (const osid of [...keys].sort(strictCompare)) {
        const offValue = off[osid];
        const onValue = on[osid];
        if (!Object.is(offValue, onValue)) divergences.push({ osid, off: offValue, on: onValue });
    }
    return divergences;
}

/**
 * CRITERION 7 core — a cell the baseline holds must not be newly lost.
 *
 * One-directional by design, unlike criterion 4: a rim cell GAINED under collapse-ON is
 * not a §6 concern (the enclave is not endangered by its neighbourhood improving), while
 * a rim cell LOST is the envelopment vector. Cells the baseline does not hold are not
 * examined at all.
 */
export function findNewlyLostCells(
    cells: readonly string[],
    off: ControllerMap,
    on: ControllerMap,
    faction: string,
): ControllerDivergence[] {
    const lost: ControllerDivergence[] = [];
    for (const osid of [...cells].sort(strictCompare)) {
        if (off[osid] !== faction) continue;
        if (on[osid] === faction) continue;
        lost.push({ osid, off: off[osid], on: on[osid] });
    }
    return lost;
}

/**
 * BFS the connected component of `start` over cells held by `faction`.
 *
 * This is the topological half of criterion 7, and it is not redundant with the 1-ring.
 * The Teočak corridor is `rastosnica_2 → kalesija → tuzla`. At depth 2 —
 * `op:kalesija:{kalesija_grad_2,kalesija_selo,kikaci}`, `op:zvornik:sapna`,
 * `op:tuzla:{gornja_tuzla,simin_han_2}`, all RBiH-held and all unguarded — the chain can
 * be cut while `rastosnica_2` itself stays RBiH. A 1-ring check sees nothing and Teočak
 * is severed anyway: measured against the baseline control map, that cut drops Teočak's
 * component from 248 OSIDs to 4. `rastosnica_2` measures strain 56.40 and sits inside the
 * measured 34-entry cliff, so this is a live path, not a hypothetical.
 *
 * Sorted neighbour iteration; the returned set's iteration order is not relied upon.
 */
export function heldComponent(
    graph: OperationalGraph,
    start: string,
    controllers: ControllerMap,
    faction: string,
): Set<string> {
    const component = new Set<string>();
    if (controllers[start] !== faction) return component;
    component.add(start);
    const queue: string[] = [start];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbour of graph.adjacency.get(current) ?? []) {
            if (component.has(neighbour)) continue;
            if (controllers[neighbour] !== faction) continue;
            component.add(neighbour);
            queue.push(neighbour);
        }
    }
    return component;
}

/** Are `a` and `b` in the same `faction`-held component? */
export function sameHeldComponent(
    graph: OperationalGraph,
    a: string,
    b: string,
    controllers: ControllerMap,
    faction: string,
): boolean {
    return heldComponent(graph, a, controllers, faction).has(b);
}
