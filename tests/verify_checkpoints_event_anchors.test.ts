import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// EVENT-ANCHORS (SHAPE, ruling §61) and AREA-BANDS (RECORDED, ruling §63) rows of
// tools/verify_checkpoints.cjs, run end to end on small fixture run directories. Both rows read
// src/scenario/historical_anchors.ts at run time, so the anchor ids below are the real ones.

const REPO = process.cwd();
const TOOL = join(REPO, 'tools', 'verify_checkpoints.cjs');
const scratch = mkdtempSync(join(tmpdir(), 'verify-anchors-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const osidAreas = JSON.parse(readFileSync(join(REPO, 'data', 'derived', 'operational', 'osid_areas.json'), 'utf8')) as {
    total_area_km2: number;
    areas: Record<string, number>;
};

/** Sorted OSIDs RS until the RS share first reaches 0.49 (inside the 0.47-0.51 Dayton band), the rest RBiH. */
function controllersNearDayton(): Record<string, string> {
    const out: Record<string, string> = {};
    let rs = 0;
    for (const osid of Object.keys(osidAreas.areas).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        if (rs / osidAreas.total_area_km2 < 0.49) { out[osid] = 'RS'; rs += osidAreas.areas[osid]; } else out[osid] = 'RBiH';
    }
    return out;
}

type Fires = Record<string, number>;
interface Fixture {
    meta: Record<string, unknown>;
    fires: Fires;
    counts?: Record<string, number>;
    weekly?: Array<{ week_index: number; events_fired: Array<{ id: string }> }>;
}

let n = 0;
function run(f: Fixture): { out: string; status: number | null } {
    const dir = join(scratch, `run${n++}`);
    mkdirSync(dir);
    const save = {
        meta: f.meta,
        military: {
            fired_event_ids: Object.keys(f.fires).sort(),
            event_last_fired_turn: f.fires,
            event_fire_counts: f.counts ?? Object.fromEntries(Object.keys(f.fires).map((k) => [k, 1])),
        },
        political: { initial_political_controllers: controllersNearDayton(), control_events: [] },
    };
    writeFileSync(join(dir, 'final_save.json'), JSON.stringify(save));
    if (f.weekly) writeFileSync(join(dir, 'weekly_report.jsonl'), f.weekly.map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = spawnSync(process.execPath, [TOOL, dir], { cwd: REPO, encoding: 'utf8' });
    expect(res.error).toBeUndefined();
    return { out: res.stdout + res.stderr, status: res.status };
}

const row = (out: string, id: string) => out.split('\n').find((l) => l.includes(`] ${id} `)) ?? '';
const bandRow = (out: string, week: number, faction: string) =>
    out.split('\n').find((l) => new RegExp(`\\] w${week}\\s+${faction}\\s`).test(l)) ?? '';

// Every anchor fired on time on its primary leg: a run whose only difference is the anchor shape.
const ALL_PRIMARY_ON_TIME: Fires = {
    jna_withdrawal_1992: 5, sarajevo_siege_begins_1992: 6, operation_corridor_1992: 12, srebrenica_enclave_forms_1992: 9,
    jajce_falls_1992: 28, srebrenica_demilitarization_1993: 54, un_safe_areas_declared_1993: 57, markale_massacre_1994: 96,
    nato_ultimatum_sarajevo_1994: 97, sarajevo_exclusion_zone_1994: 98, hrhb_washington_agreement_1994: 102,
    gorazde_crisis_1994: 105, bihac_crisis_1994: 135, carter_ceasefire_1994: 141, coha_ceasefire_begins_1995: 143,
    coha_expires_1995: 161, srebrenica_falls_1995: 171, zepa_falls_1995: 173, operation_summer_95: 172,
    operation_storm_1995: 174, nato_deliberate_force_1995: 178,
};
// Zepa both legs; Srebrenica alt leg only; Storm late (deadline t176); Summer 95 never fired.
const MIXED: Fires = { ...ALL_PRIMARY_ON_TIME, csq_enclave_held_alt_intervention: 145, csq_srebrenica_stalemate_1995: 170, operation_storm_1995: 180 };
delete MIXED.srebrenica_falls_1995;
delete MIXED.operation_summer_95;

const HIST = { decision_mode: 'historical', turn: 188, headless_scenario_auto_control: true };

describe('verify_checkpoints EVENT-ANCHORS row', () => {
    const hist = run({ meta: HIST, fires: MIXED });

    it('hands-off historical: primary only on time passes', () => {
        expect(hist.out).toContain('mode read: historical');
        expect(row(hist.out, 'nato_deliberate_force_1995')).toMatch(/primary t178 .*\*\* PASS \*\*/);
        expect(row(hist.out, 'jna_withdrawal_1992')).toContain('** PASS **');
    });

    it('hands-off historical: both legs fired is a FAIL', () => {
        expect(row(hist.out, 'zepa_falls_1995')).toContain('*** FAIL: both legs fired ***');
    });

    it('hands-off historical: only the alternative leg is an alt-path pass (red)', () => {
        expect(row(hist.out, 'srebrenica_falls_1995')).toContain('*** ALT-PATH PASS: only the alternative leg fired ***');
    });

    it('a late primary and a primary that never fired are FAILs', () => {
        expect(row(hist.out, 'operation_storm_1995')).toMatch(/by t176 \(174\+2\)\s+primary t180\s+\*\*\* FAIL: primary fired late \*\*\*/);
        expect(row(hist.out, 'operation_summer_95')).toContain('*** FAIL: nothing fired ***');
        expect(hist.out).toMatch(/event anchors compared: 21 — 17 pass, 1 alt-path pass, 3 fail, 0 gap; SHAPE red: 4/);
    });

    it('emergent: both legs fired is NOTED, not failed; the alt leg alone passes', () => {
        const emer = run({ meta: { ...HIST, decision_mode: 'emergent' }, fires: MIXED });
        expect(emer.out).toContain('mode read: emergent');
        expect(row(emer.out, 'zepa_falls_1995')).toContain('** PASS: both legs fired (NOTED, not failed) **');
        expect(row(emer.out, 'srebrenica_falls_1995')).toContain('** PASS: via the alternative leg **');
        expect(row(emer.out, 'operation_storm_1995')).toContain('*** FAIL: primary fired late ***');
    });

    it('player run (human faction, no harness auto-control): either leg passes', () => {
        const player = run({ meta: { decision_mode: 'historical', turn: 188, player_faction: 'RBiH' }, fires: MIXED });
        expect(player.out).toContain('mode read: player');
        expect(row(player.out, 'zepa_falls_1995')).toContain('** PASS: both legs fired (NOTED, not failed) **');
    });

    it('a recurring event is judged on its first fire week from weekly_report.jsonl', () => {
        const rec = run({
            meta: HIST,
            fires: { ...ALL_PRIMARY_ON_TIME, operation_storm_1995: 180 },
            counts: { operation_storm_1995: 2 },
            weekly: [{ week_index: 174, events_fired: [{ id: 'operation_storm_1995' }] }, { week_index: 180, events_fired: [{ id: 'operation_storm_1995' }] }],
        });
        expect(row(rec.out, 'operation_storm_1995')).toMatch(/primary t174\s+\*\* PASS \*\*/);
    });

    it('the row never changes the exit code (SHAPE)', () => {
        const clean = run({ meta: HIST, fires: ALL_PRIMARY_ON_TIME });
        expect(clean.out).toMatch(/event anchors compared: 21 — 21 pass, 0 alt-path pass, 0 fail, 0 gap; SHAPE red: 0/);
        expect(hist.status).toBe(clean.status);
        // The RESULT line is the existing one; the new rows add nothing to it.
        const result = (s: string) => s.split('\n').find((l) => l.startsWith('RESULT:'));
        expect(result(hist.out)).toBe(result(clean.out));
    });
});

describe('verify_checkpoints AREA-BANDS row', () => {
    const full = run({ meta: HIST, fires: ALL_PRIMARY_ON_TIME });

    it('prints the share, the band and in/out, and marks diagnostic_only bands', () => {
        expect(bandRow(full.out, 188, 'RS')).toMatch(/w188 RS\s+0\.49\d\d\s+band 0\.47-0\.51\s+IN\s+\(authoritative\)/);
        expect(bandRow(full.out, 40, 'RS')).toMatch(/w40\s+RS\s+0\.49\d\d\s+band 0\.62-0\.68\s+OUT\s+\(authoritative\)/);
        expect(bandRow(full.out, 188, 'HRHB')).toMatch(/0\.0000\s+band 0\.18-0\.23\s+OUT\s+\(diagnostic only\)/);
        expect(full.out).toMatch(/area bands compared: 12 — \d+ in, \d+ out, 0 gap/);
    });

    it('a band past the run\'s last turn is a GAP, and the run\'s exit code is unchanged', () => {
        const short = run({ meta: { ...HIST, turn: 100 }, fires: { jna_withdrawal_1992: 5 } });
        expect(bandRow(short.out, 40, 'RS')).toContain('OUT');
        expect(bandRow(short.out, 104, 'RS')).toContain('GAP (run ends t100)');
        expect(bandRow(short.out, 188, 'RS')).toContain('GAP (run ends t100)');
        expect(short.out).toMatch(/area bands compared: 12 — \d+ in, \d+ out, 9 gap/);
        // Event anchors whose deadline is past the run's end with nothing fired are GAPs too.
        expect(row(short.out, 'zepa_falls_1995')).toContain('** GAP: run ends t100, before the deadline **');
        const shortClean = run({ meta: { ...HIST, turn: 100 }, fires: ALL_PRIMARY_ON_TIME });
        expect(short.status).toBe(shortClean.status);
    });
});
