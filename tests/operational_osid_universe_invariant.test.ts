/**
 * THE OPERATIONAL OSID UNIVERSE INVARIANT — 744 drawn, 712 simulated.
 *
 * This exists because the 744-vs-712 gap has now produced FOUR wrong answers in
 * this repo (a viewer reporting merged cells as "Correct", then as "Not
 * compared", a mismatch count of 13 instead of 11, and a hardcoded `total = 744`
 * denominator). Every time, someone re-derived the meaning of the gap from raw
 * file counts instead of from the merge map. The facts are documented in
 * `docs/10_canon/context.md` (Area-Weighted Territory & Degenerate OSID Merge),
 * `docs/40_reports/CALIBRATION_MASTER.md` (n982) and closed in
 * `docs/PROJECT_LEDGER_KNOWLEDGE.md` — but documentation did not stop it, so the
 * invariant is asserted here instead.
 *
 * THE RULE, in one line:
 *   geojson (744) === contact graph (712) + micro_osid_merge_map children (32)
 *
 * A merged-away OSID is NOT a scored cell, NOT a live cell, and NOT a defect.
 * Its ground is represented by its merge parent. Any count over the DRAWN set
 * (744) instead of the SIMULATED set (712) is a bug.
 *
 * If a future merge changes these numbers, this file is the one place that has
 * to be updated deliberately — which is the point.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => JSON.parse(readFileSync(resolve(rel), 'utf8'));

const DRAWN = 744;
const SIMULATED = 712;
const MERGED_AWAY = 32;

const mergeMap = read('data/derived/operational/micro_osid_merge_map.json') as Record<string, string>;
const geo = read('data/derived/operational/operational_settlements.geojson') as {
    features: Array<{ properties: { osid: string; area_km2: number } }>;
};
const graph = read('data/derived/operational/operational_contact_graph.json') as {
    nodes?: Array<string | { osid?: string; id?: string }>;
    edges?: Array<{ a?: string; b?: string; from?: string; to?: string }>;
};

const children = new Set(Object.keys(mergeMap));
const parents = new Set(Object.values(mergeMap));
const geoIds = geo.features.map((f) => f.properties.osid);
const nodeId = (n: string | { osid?: string; id?: string }) => (typeof n === 'string' ? n : (n.osid ?? n.id ?? ''));
const liveNodes = new Set((graph.nodes ?? []).map(nodeId));

describe('operational OSID universe: 744 drawn = 712 simulated + 32 merged away', () => {
    it('holds the three counts', () => {
        expect(geoIds).toHaveLength(DRAWN);
        expect(children.size).toBe(MERGED_AWAY);
        expect(liveNodes.size).toBe(SIMULATED);
        expect(SIMULATED + MERGED_AWAY).toBe(DRAWN);
    });

    it('accounts for the gap EXACTLY — no unexplained polygon, no phantom child', () => {
        const drawnMinusChildren = geoIds.filter((osid) => !children.has(osid));
        expect(drawnMinusChildren).toHaveLength(SIMULATED);
        // set equality both directions: the gap is the merge map, nothing else
        expect(drawnMinusChildren.every((osid) => liveNodes.has(osid))).toBe(true);
        expect([...liveNodes].every((osid) => drawnMinusChildren.includes(osid))).toBe(true);
        // every child is actually a drawn polygon (a merge map entry with no
        // geometry would make the arithmetic lie)
        expect([...children].every((osid) => geoIds.includes(osid))).toBe(true);
    });

    it('keeps every merge parent alive — a child can never point at a dead cell', () => {
        expect([...parents].every((osid) => liveNodes.has(osid))).toBe(true);
        // and no child is itself a parent (no merge chains to resolve)
        expect([...children].some((osid) => parents.has(osid))).toBe(false);
    });

    it('is a SIZE rule, not an arbitrary list: every merged cell is sub-1km², every live cell is not', () => {
        // This is what makes the merge principled and re-derivable. THRESHOLD_KM2
        // = 1.0 in tools/merge_micro_osids.cjs.
        const areaOf = new Map(geo.features.map((f) => [f.properties.osid, f.properties.area_km2]));
        const childAreas = [...children].map((osid) => areaOf.get(osid)!);
        const liveAreas = [...liveNodes].map((osid) => areaOf.get(osid)!).filter((a) => typeof a === 'number');
        expect(Math.max(...childAreas)).toBeLessThan(1.0);
        expect(Math.min(...liveAreas)).toBeGreaterThanOrEqual(1.0);
    });

    it('keeps merged cells out of the contact graph entirely — they cannot become a front', () => {
        for (const child of children) expect(liveNodes.has(child)).toBe(false);
        const endpoints = new Set<string>();
        for (const e of graph.edges ?? []) {
            for (const v of [e.a, e.b, e.from, e.to]) if (typeof v === 'string') endpoints.add(v);
        }
        for (const child of children) expect(endpoints.has(child)).toBe(false);
    });

    it('pins WHICH derived files still contain merged ids, so a new leak fails loudly', () => {
        const leaksIn = (rel: string, extract: (j: unknown) => string[]) =>
            extract(read(rel)).filter((id) => children.has(id));

        // clean — must stay clean
        expect(leaksIn('data/derived/operational/osid_areas.json',
            (j) => Object.keys((j as { areas?: Record<string, unknown> }).areas ?? (j as Record<string, unknown>)))).toEqual([]);
        expect(leaksIn('data/derived/operational/urban_osids.json',
            (j) => (Array.isArray(j) ? j as string[] : ((j as { osids?: string[] }).osids ?? Object.keys(j as object))))).toEqual([]);
        expect(leaksIn('data/derived/operational/canonical_to_operational_map.json',
            (j) => Object.values(j as Record<string, unknown>).flat().filter((v): v is string => typeof v === 'string'))).toEqual([]);
        expect(leaksIn('data/source/calibration/painted_control_jan1993.json',
            (j) => Object.keys((j as { by_settlement_id?: Record<string, unknown> }).by_settlement_id ?? {}))).toEqual([]);

        // KNOWN, TRACKED deviations — both inert, both documented. If either
        // count changes, that is a deliberate act and this test should be updated
        // with the reason.
        //
        // forest_osids: 3 dead terrain flags on merged-away cells. Inert because
        // the lookup is keyed on a battle's OSID and a merged cell can never host
        // a battle (previous assertion proves it is not in the contact graph).
        expect(leaksIn('data/derived/operational/forest_osids.json',
            (j) => (Array.isArray(j) ? j as string[] : ((j as { osids?: string[] }).osids ?? Object.keys(j as object))))).toHaveLength(3);
        // operational_initial_master: CLEANED 2026-09-03 to the 712 canon says it
        // should hold. political_control_init's drop-and-warn guard is now a
        // no-op safety net rather than load-bearing. Proven behaviour-neutral:
        // a 3-turn campaign is byte-identical before and after.
        expect(leaksIn('data/derived/operational/operational_initial_master.json',
            (j) => ((j as { settlements?: Array<{ sid: string }> }).settlements ?? []).map((s) => s.sid))).toEqual([]);
    });

    it('keeps the initial master at the simulated count, with honest metadata', () => {
        const master = read('data/derived/operational/operational_initial_master.json') as {
            meta?: { settlement_count?: number }; settlements: Array<{ sid: string }>;
        };
        expect(master.settlements).toHaveLength(SIMULATED);
        // the count field must not drift from the array it describes
        expect(master.meta?.settlement_count).toBe(SIMULATED);
    });

    it('is not referenced by any scenario, OOB, or operation as a live location', () => {
        // The 32 were redirected at merge time (11 home_osid redirects per n982).
        // Nothing authored may point at one again.
        const authored = [
            'data/derived/startup/apr_1992_initial_save.json',
        ];
        for (const rel of authored) {
            let raw: string;
            try { raw = readFileSync(resolve(rel), 'utf8'); } catch { continue; }
            for (const child of children) {
                expect(raw.includes(`"${child}"`), `${rel} must not reference merged-away ${child}`).toBe(false);
            }
        }
    });
});
