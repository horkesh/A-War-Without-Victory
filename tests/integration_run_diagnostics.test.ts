import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { GameState, FormationState, CorpsFrontSector } from '../src/state/game_state.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_run_diagnostics');

/** Extract municipality slug from an OSID like "op:municipality:slug" */
function getMunicipality(osid: string): string {
    return osid.split(':')[1] ?? '';
}

/**
 * Build adjacency map from the operational contact graph for BFS distance checks.
 */
async function loadContactGraph(): Promise<Map<string, string[]>> {
    const graphPath = join(process.cwd(), 'data', 'derived', 'operational', 'operational_contact_graph.json');
    const adj = new Map<string, string[]>();
    try {
        const raw = JSON.parse(await readFile(graphPath, 'utf8'));
        const edges: Array<{ a: string; b: string }> = raw.edges ?? [];
        for (const e of edges) {
            if (!adj.has(e.a)) adj.set(e.a, []);
            if (!adj.has(e.b)) adj.set(e.b, []);
            adj.get(e.a)!.push(e.b);
            adj.get(e.b)!.push(e.a);
        }
    } catch {
        // Graph not available — tests using it will degrade gracefully
    }
    return adj;
}

/**
 * BFS from `from` to `to`, returning hop count. Returns maxHops+1 if unreachable.
 */
/** Corps line brigade sitting on one of its sector's front OSIDs — far from home is expected, not drift. */
function isAssignedLineOnSectorFront(state: GameState, f: FormationState): boolean {
    const sectors = state.military.corps_front_sectors;
    if (!sectors || !f.location_osid) return false;
    for (const sid of Object.keys(sectors)) {
        const sec = sectors[sid]!;
        if (!sec.assigned_brigade_ids.includes(f.id)) continue;
        const loc = f.location_osid;
        for (const ss of sec.sub_segments) {
            if (ss.friendly_osids.includes(loc)) return true;
        }
        return false;
    }
    return false;
}

function bfsDistance(adj: Map<string, string[]>, from: string, to: string, maxHops: number): number {
    if (from === to) return 0;
    if (!adj.has(from)) return maxHops + 1;
    const visited = new Set<string>([from]);
    let frontier = [from];
    for (let h = 1; h <= maxHops; h++) {
        const next: string[] = [];
        for (const n of frontier) {
            for (const nb of adj.get(n) ?? []) {
                if (visited.has(nb)) continue;
                if (nb === to) return h;
                visited.add(nb);
                next.push(nb);
            }
        }
        frontier = next;
        if (!frontier.length) break;
    }
    return maxHops + 1;
}

describe('run diagnostics (40w)', () => {
    let state: GameState;
    let adj: Map<string, string[]>;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
        adj = await loadContactGraph();
    }, 600_000); // 10 min timeout for 40w scenario

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });

    // ─── 1. Brigade Drift ─────────────────────────────────────────────────

    describe('brigade drift', () => {
        it('<20% of active brigades are >4 hops from home_osid (excluding ops participants and sector-front line)', () => {
            if (skipped) return;
            const MAX_DRIFT_HOPS = 4;
            const formations = (state as any).military.formations as Record<string, FormationState>;
            const corpsStates = (state as any).military.corps_states ?? {};

            // Collect brigade IDs participating in active operations
            const opParticipants = new Set<string>();
            for (const [_corpsId, cs] of Object.entries(corpsStates) as Array<[string, any]>) {
                const op = cs.active_operation;
                if (!op) continue;
                for (const axis of op.axes ?? []) {
                    for (const bid of axis.brigade_ids ?? []) opParticipants.add(bid);
                }
            }

            let totalChecked = 0;
            const drifted: Array<{ id: string; corps: string; home: string; loc: string; dist: number }> = [];

            for (const [id, f] of Object.entries(formations)) {
                if (f.status !== 'active') continue;
                if (f.kind === 'paramilitary' || f.kind === 'militia') continue;
                if (!f.home_osid || !f.location_osid || f.home_osid === f.location_osid) continue;
                if (opParticipants.has(id)) continue;

                totalChecked++;

                // If contact graph is available, use BFS; otherwise fall back to municipality check
                if (adj.size > 0) {
                    const dist = bfsDistance(adj, f.home_osid, f.location_osid, MAX_DRIFT_HOPS + 1);
                    if (dist > MAX_DRIFT_HOPS && !isAssignedLineOnSectorFront(state, f)) {
                        drifted.push({
                            id,
                            corps: (f as any).corps_id ?? 'unknown',
                            home: f.home_osid,
                            loc: f.location_osid,
                            dist,
                        });
                    }
                } else {
                    // Fallback: municipality mismatch = drift
                    const homeMun = getMunicipality(f.home_osid);
                    const locMun = getMunicipality(f.location_osid);
                    if (homeMun !== locMun && !isAssignedLineOnSectorFront(state, f)) {
                        drifted.push({
                            id,
                            corps: (f as any).corps_id ?? 'unknown',
                            home: f.home_osid,
                            loc: f.location_osid,
                            dist: -1,
                        });
                    }
                }
            }

            if (drifted.length > 0) {
                console.log(`Brigade drift (${drifted.length}/${totalChecked} checked):`);
                for (const d of drifted.slice(0, 20)) {
                    console.log(`  ${d.id} (${d.corps}) at ${getMunicipality(d.loc)} — home ${getMunicipality(d.home)} (${d.dist} hops)`);
                }
            }

            const rate = totalChecked > 0 ? drifted.length / totalChecked : 0;
            // At 40w many brigades have moved for operations and not returned.
            // 20% threshold allows for post-operation drift while catching mass displacement bugs.
            expect(rate,
                `${drifted.length}/${totalChecked} brigades drifted >4 hops — should be <20%`
            ).toBeLessThan(0.20);
        });
    });

    // ─── 2. Siege Health (Sarajevo) ───────────────────────────────────────

    describe('siege health', () => {
        const SARAJEVO_MUNS = [
            'centar_sarajevo', 'ilidza', 'novi_grad_sarajevo', 'novo_sarajevo',
            'stari_grad_sarajevo', 'vogosca', 'hadzici', 'pale', 'ilijas', 'trnovo',
        ];
        const GORAZDE_MUNS = ['gorazde', 'foca', 'cajnice', 'kalinovik', 'rogatica', 'visegrad'];

        it('SRK has >=4 brigades near Sarajevo municipalities', () => {
            if (skipped) return;
            const formations = (state as any).military.formations as Record<string, FormationState>;
            const nearSarajevo: string[] = [];

            for (const [id, f] of Object.entries(formations)) {
                if ((f as any).corps_id !== 'vrs_sarajevo_romanija') continue;
                if (f.status !== 'active' || f.kind !== 'brigade') continue;
                if (!f.location_osid) continue;
                const mun = getMunicipality(f.location_osid);
                if (SARAJEVO_MUNS.includes(mun)) {
                    nearSarajevo.push(`${id} @ ${mun} (pers=${f.personnel})`);
                }
            }

            console.log(`SRK brigades near Sarajevo (${nearSarajevo.length}):`);
            for (const line of nearSarajevo) console.log(`  ${line}`);

            expect(nearSarajevo.length,
                `SRK has ${nearSarajevo.length} brigades near Sarajevo — need >=4`
            ).toBeGreaterThanOrEqual(4);
        });

        it('Drina/Herzegovina corps have >=2 brigades near Gorazde municipalities', () => {
            if (skipped) return;
            const formations = (state as any).military.formations as Record<string, FormationState>;
            const targetCorps = ['vrs_herzegovina', 'vrs_drina'];
            const nearGorazde: string[] = [];

            for (const [id, f] of Object.entries(formations)) {
                if (!targetCorps.includes((f as any).corps_id)) continue;
                if (f.status !== 'active' || f.kind !== 'brigade') continue;
                if (!f.location_osid) continue;
                const mun = getMunicipality(f.location_osid);
                if (GORAZDE_MUNS.includes(mun)) {
                    nearGorazde.push(`${id} @ ${mun} (pers=${f.personnel})`);
                }
            }

            console.log(`Drina/Herzegovina brigades near Gorazde (${nearGorazde.length}):`);
            for (const line of nearGorazde) console.log(`  ${line}`);

            expect(nearGorazde.length,
                `Drina/Herzegovina have ${nearGorazde.length} brigades near Gorazde — need >=2`
            ).toBeGreaterThanOrEqual(2);
        });
    });

    // ─── 3. Empty Sectors ─────────────────────────────────────────────────

    describe('empty sectors', () => {
        it('fewer than 5 sectors with >3 edges have zero assigned brigades', () => {
            if (skipped) return;
            const sectors = (state as any).military.corps_front_sectors as Record<string, CorpsFrontSector> ?? {};
            const gaps: string[] = [];

            for (const [sid, sec] of Object.entries(sectors)) {
                const edgeCount = (sec.edge_ids ?? []).length;
                const brigCount = (sec.assigned_brigade_ids ?? []).length;
                if (edgeCount > 3 && brigCount === 0) {
                    gaps.push(`${sid}: ${edgeCount} edges, 0 brigades (faction=${sec.faction}, corps=${sec.corps_id})`);
                }
            }

            if (gaps.length > 0) {
                console.log(`Empty sectors with front edges (${gaps.length}):`);
                for (const line of gaps) console.log(`  ${line}`);
            }

            expect(gaps.length,
                `${gaps.length} sectors with >3 edges have 0 brigades — should be <5`
            ).toBeLessThan(5);
        });
    });

    // ─── 4. Combat Ineffective Concentration ──────────────────────────────

    describe('combat ineffective concentration', () => {
        it('no corps has >50% of brigades below 400 personnel', () => {
            if (skipped) return;
            const formations = (state as any).military.formations as Record<string, FormationState>;
            const corpsBrigades: Record<string, { total: number; ineffective: number; totalPers: number }> = {};

            for (const [_id, f] of Object.entries(formations)) {
                if (f.status !== 'active' || f.kind !== 'brigade') continue;
                const corps = (f as any).corps_id ?? 'unknown';
                if (!corpsBrigades[corps]) corpsBrigades[corps] = { total: 0, ineffective: 0, totalPers: 0 };
                corpsBrigades[corps].total++;
                corpsBrigades[corps].totalPers += f.personnel ?? 0;
                if ((f.personnel ?? 0) < 400) corpsBrigades[corps].ineffective++;
            }

            const collapsed: string[] = [];
            for (const [corps, stats] of Object.entries(corpsBrigades).sort()) {
                if (stats.total < 3) continue; // skip tiny corps
                if (stats.ineffective > stats.total * 0.5) {
                    const pct = ((stats.ineffective / stats.total) * 100).toFixed(0);
                    collapsed.push(
                        `${corps}: ${stats.ineffective}/${stats.total} (${pct}%) combat ineffective — avg ${(stats.totalPers / stats.total).toFixed(0)} pers`
                    );
                }
            }

            if (collapsed.length > 0) {
                console.log(`Corps with >50% combat ineffective (${collapsed.length}):`);
                for (const line of collapsed) console.log(`  ${line}`);
            }

            // Log overall stats
            const totalIneff = Object.values(formations).filter(
                (f: any) => f.status === 'active' && f.kind === 'brigade' && (f.personnel ?? 0) < 400
            ).length;
            const totalBrig = Object.values(formations).filter(
                (f: any) => f.status === 'active' && f.kind === 'brigade'
            ).length;
            console.log(`Total combat ineffective: ${totalIneff}/${totalBrig} across all corps`);

            // Allow up to 1 corps in this state — late-war attrition can exhaust
            // a single corps (e.g. ARBiH 4th Corps after sustained fighting).
            expect(collapsed.length,
                `${collapsed.length} corps with >50% ineffective: ${collapsed.join('; ')}`
            ).toBeLessThanOrEqual(1);
        });
    });

    // ─── 5. Stranded Pools ────────────────────────────────────────────────

    describe('stranded pools', () => {
        it('<3 pools with available > 200 but committed === 0', () => {
            if (skipped) return;
            const pools = (state as any).military.militia_pools ?? {};
            const stranded: string[] = [];

            for (const [key, pool] of Object.entries(pools) as Array<[string, any]>) {
                if ((pool.available ?? 0) > 200 && (pool.committed ?? 0) === 0) {
                    stranded.push(`${key}: ${pool.available} available, 0 committed (faction=${pool.faction})`);
                }
            }

            if (stranded.length > 0) {
                console.log(`Stranded pools (${stranded.length}):`);
                for (const line of stranded) console.log(`  ${line}`);
            }

            expect(stranded.length,
                `${stranded.length} stranded pools — should be <3`
            ).toBeLessThan(3);
        });
    });
});
