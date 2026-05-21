import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    HISTORICAL_EVENT_ANCHORS_JAN1993,
    HISTORICAL_AREA_BANDS_JAN1993,
    HISTORICAL_OSID_ANCHORS_JAN1993_SUPPLEMENT,
    HISTORICAL_EVENT_ANCHORS_APR1994,
    HISTORICAL_AREA_BANDS_APR1994,
    HISTORICAL_OSID_ANCHORS_APR1994,
    HISTORICAL_EVENT_ANCHORS_APR1995,
    HISTORICAL_AREA_BANDS_APR1995,
    HISTORICAL_OSID_ANCHORS_APR1995,
    HISTORICAL_EVENT_ANCHORS_OCT1995,
    HISTORICAL_AREA_BANDS_OCT1995,
    HISTORICAL_OSID_ANCHORS_OCT1995,
    type HistoricalEventAnchor,
    type HistoricalAreaShareBand,
    type HistoricalEpochOsidAnchor,
} from '../src/scenario/historical_anchors.js';

/**
 * Tier 1 painted-target anchor contract tests.
 *
 * Source plan: docs/plans/2026-05-21-tier1-painted-target-anchors-plan.md
 * Adopted answers: docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md
 *
 * SCOPE (this commit): contract tests only — shape, uniqueness, and reference
 * validity (event IDs exist in authored event JSON, OSIDs exist in painted maps).
 *
 * DEFERRED (follow-on): runtime evaluation against final_save.json artifacts.
 * The runner already evaluates the Dec 1992 OSID anchor set inline
 * (scenario_runner.ts:610); extending the runner or this test to evaluate the
 * new Type 1 / Type 2 / Type 3 anchor types is a separate lane. Until that
 * lands, these tests validate the anchor data is well-formed; they do NOT
 * validate the simulation produces them.
 */

const PAINTED_JAN1993 = join(process.cwd(), 'data', 'source', 'calibration', 'painted_control_jan1993.json');
const PAINTED_APR1994 = join(process.cwd(), 'data', 'source', 'calibration', 'painted_control_apr1994.json');
const PAINTED_APR1995 = join(process.cwd(), 'data', 'source', 'calibration', 'painted_control_apr1995.json');
const PAINTED_OCT1995 = join(process.cwd(), 'data', 'source', 'calibration', 'painted_control_oct1995.json');

const EVENT_JSONS = ['war_1992', 'war_1993', 'war_1994', 'war_1995', 'consequences'].map((n) =>
    join(process.cwd(), 'data', 'scenarios', 'events', `${n}.json`),
);

interface PaintedFile {
    meta: { counts?: Record<string, number> };
    by_settlement_id: Record<string, string>;
}

function loadPainted(path: string): PaintedFile | null {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
}

function loadAllAuthoredEventIds(): Set<string> {
    const ids = new Set<string>();
    for (const path of EVENT_JSONS) {
        if (!existsSync(path)) continue;
        const data = JSON.parse(readFileSync(path, 'utf8'));
        const events = Array.isArray(data) ? data : data.events ?? [];
        for (const ev of events) {
            if (ev && typeof ev.id === 'string') ids.add(ev.id);
        }
    }
    return ids;
}

const AUTHORED_EVENT_IDS = loadAllAuthoredEventIds();

function osidPresentInPainted(osid: string, painted: PaintedFile | null): boolean {
    if (!painted) return true; // can't validate; skip rather than false-fail
    return Object.prototype.hasOwnProperty.call(painted.by_settlement_id, osid);
}

// ─── Shared contract assertions ──────────────────────────────────────────

function assertEventAnchorContract(
    label: string,
    anchors: readonly HistoricalEventAnchor[],
): void {
    it(`${label}: event anchors have unique event_ids`, () => {
        const ids = anchors.map((a) => a.event_id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${label}: event anchors reference authored events`, () => {
        if (AUTHORED_EVENT_IDS.size === 0) return; // event JSONs not loadable; skip
        for (const a of anchors) {
            expect(AUTHORED_EVENT_IDS.has(a.event_id), `unknown event_id: ${a.event_id}`).toBe(true);
            if (a.xor_with) {
                for (const x of a.xor_with) {
                    expect(AUTHORED_EVENT_IDS.has(x), `unknown xor_with id: ${x}`).toBe(true);
                }
            }
        }
    });

    it(`${label}: event anchors have positive tolerance and non-empty citations`, () => {
        for (const a of anchors) {
            expect(a.tolerance, `event ${a.event_id} tolerance`).toBeGreaterThanOrEqual(0);
            expect(a.expected_week_max, `event ${a.event_id} expected_week_max`).toBeGreaterThan(0);
            expect(a.citation.trim().length, `event ${a.event_id} citation`).toBeGreaterThan(0);
        }
    });
}

function assertAreaBandContract(
    label: string,
    bands: readonly HistoricalAreaShareBand[],
): void {
    it(`${label}: area bands have valid bounds and citations`, () => {
        for (const b of bands) {
            expect(b.min_share, `${b.faction}@w${b.at_week} min`).toBeGreaterThanOrEqual(0);
            expect(b.max_share, `${b.faction}@w${b.at_week} max`).toBeLessThanOrEqual(1);
            expect(b.min_share, `${b.faction}@w${b.at_week} bounds`).toBeLessThan(b.max_share);
            expect(b.citation.trim().length, `${b.faction}@w${b.at_week} citation`).toBeGreaterThan(0);
        }
    });

    it(`${label}: area bands have no duplicate (week, faction) pairs`, () => {
        const keys = bands.map((b) => `${b.at_week}:${b.faction}`);
        expect(new Set(keys).size).toBe(keys.length);
    });
}

function assertOsidAnchorContract(
    label: string,
    anchors: readonly HistoricalEpochOsidAnchor[],
    painted: PaintedFile | null,
): void {
    it(`${label}: OSID anchors have no duplicate OSIDs`, () => {
        const ids = anchors.map((a) => a.osid);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it(`${label}: OSID anchors reference painted OSIDs`, () => {
        if (!painted) return;
        for (const a of anchors) {
            expect(
                osidPresentInPainted(a.osid, painted),
                `OSID not in painted map: ${a.osid}`,
            ).toBe(true);
        }
    });

    it(`${label}: OSID anchors have non-empty citations and valid factions`, () => {
        const validFactions = new Set(['RBiH', 'RS', 'HRHB']);
        for (const a of anchors) {
            expect(validFactions.has(a.expected_controller), `${a.osid} faction`).toBe(true);
            expect(a.citation.trim().length, `${a.osid} citation`).toBeGreaterThan(0);
            expect(a.at_week, `${a.osid} at_week`).toBeGreaterThan(0);
        }
    });
}

// ─── Per-epoch contract tests ────────────────────────────────────────────

describe('Tier 1 painted-target anchors — Jan 1993 (w40)', () => {
    const painted = loadPainted(PAINTED_JAN1993);

    assertEventAnchorContract('jan1993', HISTORICAL_EVENT_ANCHORS_JAN1993);
    assertAreaBandContract('jan1993', HISTORICAL_AREA_BANDS_JAN1993);
    assertOsidAnchorContract('jan1993 supplement', HISTORICAL_OSID_ANCHORS_JAN1993_SUPPLEMENT, painted);

    it('jan1993: all area bands are authoritative (no diagnostic_only)', () => {
        for (const b of HISTORICAL_AREA_BANDS_JAN1993) {
            expect(b.diagnostic_only, `${b.faction}@w40 should be authoritative`).toBeFalsy();
        }
    });

    it('jan1993: all OSID supplement anchors are at w40', () => {
        for (const a of HISTORICAL_OSID_ANCHORS_JAN1993_SUPPLEMENT) {
            expect(a.at_week, `${a.osid} at_week`).toBe(40);
        }
    });
});

describe('Tier 1 painted-target anchors — Apr 1994 (w104)', () => {
    const painted = loadPainted(PAINTED_APR1994);

    assertEventAnchorContract('apr1994', HISTORICAL_EVENT_ANCHORS_APR1994);
    assertAreaBandContract('apr1994', HISTORICAL_AREA_BANDS_APR1994);
    assertOsidAnchorContract('apr1994', HISTORICAL_OSID_ANCHORS_APR1994, painted);

    it('apr1994: all area bands are diagnostic_only (engine cannot deliver under Issue #37)', () => {
        for (const b of HISTORICAL_AREA_BANDS_APR1994) {
            expect(b.diagnostic_only, `${b.faction}@w104 should be diagnostic_only`).toBe(true);
        }
    });

    it('apr1994: gorazde_2 anchor is RBiH (post-repaint)', () => {
        const anchor = HISTORICAL_OSID_ANCHORS_APR1994.find((a) => a.osid === 'op:gorazde:gorazde_2');
        expect(anchor?.expected_controller, 'gorazde_2 must be RBiH after repaint').toBe('RBiH');
    });
});

describe('Tier 1 painted-target anchors — Apr 1995 (w156)', () => {
    const painted = loadPainted(PAINTED_APR1995);

    assertEventAnchorContract('apr1995', HISTORICAL_EVENT_ANCHORS_APR1995);
    assertAreaBandContract('apr1995', HISTORICAL_AREA_BANDS_APR1995);
    assertOsidAnchorContract('apr1995', HISTORICAL_OSID_ANCHORS_APR1995, painted);

    it('apr1995: all area bands are diagnostic_only (pre-Storm, mid-erosion engine gap)', () => {
        for (const b of HISTORICAL_AREA_BANDS_APR1995) {
            expect(b.diagnostic_only, `${b.faction}@w156 should be diagnostic_only`).toBe(true);
        }
    });

    it('apr1995: pre-collapse Krajina OSIDs anchored as RS (catch premature engine flips)', () => {
        const krajinaOsids = [
            'op:sanski_most:sanski_most_2',
            'op:kljuc:kljuc_2',
            'op:bosanski_petrovac:bosanski_petrovac_2',
            'op:titov_drvar:drvar_2',
            'op:bosansko_grahovo:bosansko_grahovo_2',
            'op:glamoc:glamoc_2',
            'op:donji_vakuf:donji_vakuf_2',
            'op:mrkonjic_grad:mrkonjic_grad_2',
            'op:sipovo:sipovo_2',
        ];
        for (const osid of krajinaOsids) {
            const anchor = HISTORICAL_OSID_ANCHORS_APR1995.find((a) => a.osid === osid);
            expect(anchor?.expected_controller, `${osid} must be RS at w156`).toBe('RS');
        }
    });
});

describe('Tier 1 painted-target anchors — Oct 1995 (w188)', () => {
    const painted = loadPainted(PAINTED_OCT1995);

    assertEventAnchorContract('oct1995', HISTORICAL_EVENT_ANCHORS_OCT1995);
    assertAreaBandContract('oct1995', HISTORICAL_AREA_BANDS_OCT1995);
    assertOsidAnchorContract('oct1995', HISTORICAL_OSID_ANCHORS_OCT1995, painted);

    it('oct1995: RS area band is authoritative (sim already passes Dayton target)', () => {
        const rsBand = HISTORICAL_AREA_BANDS_OCT1995.find((b) => b.faction === 'RS');
        expect(rsBand?.diagnostic_only, 'RS Dayton band should NOT be diagnostic_only').toBeFalsy();
    });

    it('oct1995: RBiH and HRHB area bands are diagnostic_only (Mistral/Sana gap)', () => {
        for (const b of HISTORICAL_AREA_BANDS_OCT1995.filter((b) => b.faction !== 'RS')) {
            expect(b.diagnostic_only, `${b.faction}@w188 should be diagnostic_only`).toBe(true);
        }
    });

    it('oct1995: srebrenica_falls_1995 + zepa_falls_1995 + nato_deliberate_force_1995 have XOR alternatives', () => {
        const requireXor = ['srebrenica_falls_1995', 'zepa_falls_1995', 'nato_deliberate_force_1995'];
        for (const id of requireXor) {
            const anchor = HISTORICAL_EVENT_ANCHORS_OCT1995.find((a) => a.event_id === id);
            expect(anchor?.xor_with, `${id} must have xor_with per canon §3.3`).toBeDefined();
            expect(anchor?.xor_with?.length ?? 0, `${id} xor_with non-empty`).toBeGreaterThan(0);
        }
    });

    it('oct1995: zepa_2 anchor is RS (Žepa fell 25 Jul 1995)', () => {
        const anchor = HISTORICAL_OSID_ANCHORS_OCT1995.find((a) => a.osid === 'op:rogatica:zepa_2');
        expect(anchor?.expected_controller, 'zepa_2 must be RS at w188').toBe('RS');
    });

    it('oct1995: gorazde_2 anchor is RBiH (post-repaint, Goražde holds through Dayton)', () => {
        const anchor = HISTORICAL_OSID_ANCHORS_OCT1995.find((a) => a.osid === 'op:gorazde:gorazde_2');
        expect(anchor?.expected_controller, 'gorazde_2 must be RBiH at w188').toBe('RBiH');
    });

    it('oct1995: Sarajevo center remains RBiH per Engine Invariants §12.1', () => {
        const anchor = HISTORICAL_OSID_ANCHORS_OCT1995.find(
            (a) => a.osid === 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo',
        );
        expect(anchor?.expected_controller, 'Sarajevo center must be RBiH').toBe('RBiH');
    });
});

// ─── Cross-epoch sanity ───────────────────────────────────────────────────

describe('Tier 1 anchors — cross-epoch monotone properties', () => {
    it('srebrenica_2 flips RBiH (apr94/apr95) -> RS (oct95)', () => {
        const apr94 = HISTORICAL_OSID_ANCHORS_APR1994.find((a) => a.osid === 'op:srebrenica:srebrenica_2');
        const apr95 = HISTORICAL_OSID_ANCHORS_APR1995.find((a) => a.osid === 'op:srebrenica:srebrenica_2');
        const oct95 = HISTORICAL_OSID_ANCHORS_OCT1995.find((a) => a.osid === 'op:srebrenica:srebrenica_2');
        expect(apr94?.expected_controller).toBe('RBiH');
        expect(apr95?.expected_controller).toBe('RBiH');
        expect(oct95?.expected_controller).toBe('RS');
    });

    it('gorazde_2 stays RBiH at all three late epochs (post-repaint)', () => {
        const apr94 = HISTORICAL_OSID_ANCHORS_APR1994.find((a) => a.osid === 'op:gorazde:gorazde_2');
        const apr95 = HISTORICAL_OSID_ANCHORS_APR1995.find((a) => a.osid === 'op:gorazde:gorazde_2');
        const oct95 = HISTORICAL_OSID_ANCHORS_OCT1995.find((a) => a.osid === 'op:gorazde:gorazde_2');
        expect(apr94?.expected_controller).toBe('RBiH');
        expect(apr95?.expected_controller).toBe('RBiH');
        expect(oct95?.expected_controller).toBe('RBiH');
    });

    it('zepa_2 flips RBiH (apr94/apr95) -> RS (oct95)', () => {
        const apr94 = HISTORICAL_OSID_ANCHORS_APR1994.find((a) => a.osid === 'op:rogatica:zepa_2');
        const apr95 = HISTORICAL_OSID_ANCHORS_APR1995.find((a) => a.osid === 'op:rogatica:zepa_2');
        const oct95 = HISTORICAL_OSID_ANCHORS_OCT1995.find((a) => a.osid === 'op:rogatica:zepa_2');
        expect(apr94?.expected_controller).toBe('RBiH');
        expect(apr95?.expected_controller).toBe('RBiH');
        expect(oct95?.expected_controller).toBe('RS');
    });
});
