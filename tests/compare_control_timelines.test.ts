import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    classifyCapture,
    compareControlTimelines,
    normalizeControlEvents,
    readJsonLinesStrict,
} = require('../tools/diagnostics/compare_control_timelines.cjs');

type Event = Record<string, unknown>;

function save(turn: number, initial: Record<string, string>, events: Event[]) {
    const current = { ...initial };
    for (const event of events) {
        if ((event.turn as number) <= turn) current[(event.settlement_id ?? event.osid) as string] = event.to as string;
    }
    return {
        meta: { turn },
        political: {
            initial_political_controllers: initial,
            political_controllers: current,
            control_events: events,
        },
    };
}

function fixtureRun(root: string, name: string, events: Event[], battles: Record<string, unknown>[][], opts: { finalTurn?: number; manifest?: Record<string, string>; malformedWeekly?: string } = {}) {
    const dir = join(root, name);
    mkdirSync(dir);
    const initial = { a: 'RBiH', b: 'RS' };
    const finalTurn = opts.finalTurn ?? 4;
    writeFileSync(join(dir, 'initial_save.json'), JSON.stringify({ meta: { turn: 0 }, political: { political_controllers: initial } }) + '\n');
    writeFileSync(join(dir, 'final_save.json'), JSON.stringify(save(finalTurn, initial, events)) + '\n');
    writeFileSync(join(dir, 'save_w2.json'), JSON.stringify(save(2, initial, events)) + '\n');
    const weekly = Array.from({ length: finalTurn }, (_, index) => JSON.stringify({ week_index: index + 1, battles: battles[index] ?? [] })).join('\n') + '\n';
    writeFileSync(join(dir, 'weekly_report.jsonl'), opts.malformedWeekly ?? weekly);
    writeFileSync(join(dir, 'run_meta.json'), JSON.stringify({ weeks: finalTurn, provenance: { git_commit: 'deadbeef', git_dirty: true, consumed_inputs: { files: Object.entries(opts.manifest ?? { 'input.json': 'aaa' }).map(([path, sha256]) => ({ path, sha256 })) } } }) + '\n');
    return dir;
}

function references(root: string) {
    const dir = join(root, 'refs');
    mkdirSync(dir);
    const target = { a: 'RBiH', b: 'RS' };
    for (const id of ['jan1993', 'apr1994', 'apr1995', 'oct1995']) {
        writeFileSync(join(dir, `painted_control_${id}.json`), JSON.stringify({ by_settlement_id: target }) + '\n');
    }
    return dir;
}

const battle = (id: string, turn: number, osid: string, attacker: string, faction: string) => ({
    battle_id: id,
    target_osid: osid,
    attacker_brigade: attacker,
    attacker_faction: faction,
    attacker_won: true,
    operation_id: 'op-1',
    outcome: 'decisive_victory',
    power_ratio: 2.5,
    turn,
});

describe('compare_control_timelines', () => {
    it('keeps gross loss and gain when the net score cancels and preserves same-turn event order', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const baselineEvents = [
            { turn: 2, settlement_id: 'a', mechanism: 'combat', from: 'RBiH', to: 'RS', battle_id: '2:a:x', attacker_brigade: 'x' },
            { turn: 2, settlement_id: 'a', mechanism: 'combat', from: 'RS', to: 'RBiH', battle_id: '2:a:y', attacker_brigade: 'y' },
            { turn: 3, settlement_id: 'b', mechanism: 'combat', from: 'RS', to: 'RBiH', battle_id: '3:b:y', attacker_brigade: 'y' },
        ];
        const candidateEvents = [
            { turn: 2, settlement_id: 'a', mechanism: 'combat', from: 'RBiH', to: 'RS', battle_id: '2:a:x', attacker_brigade: 'x' },
        ];
        const base = fixtureRun(root, 'base', baselineEvents, [[], [battle('2:a:x', 2, 'a', 'x', 'RS'), battle('2:a:y', 2, 'a', 'y', 'RBiH')], [battle('3:b:y', 3, 'b', 'y', 'RBiH')]]);
        const cand = fixtureRun(root, 'cand', candidateEvents, [[], [battle('2:a:x', 2, 'a', 'x', 'RS')]]);
        const result = compareControlTimelines({ baselineDir: base, candidateDir: cand, referencesDir: references(root), epochs: [{ id: 'oct1995', turn: 4 }] });
        expect(result.checkpoints[0]).toMatchObject({ baseline_score: 1, candidate_score: 1, gross_lost: 1, gross_gained: 1, net: 0 });
        expect(result.regressed_osids[0].baseline.events.map((event: Event) => event.battle_id)).toEqual(['2:a:x', '2:a:y']);
        expect(result.changed_osids.map((row: Event) => row.osid)).toEqual(['a', 'b']);
        const gained = result.changed_osids.find((row: Event) => row.osid === 'b');
        expect(gained.baseline.events.map((event: any) => event.battle.operation_id)).toEqual(['op-1']);
        expect(gained.baseline.events.map((event: any) => event.attribution.kind)).toEqual(['operation_owned']);
        expect(result.timeline.first_transient_divergence.turn).toBe(2);
        expect(result.timeline.earliest_persistent_divergence.turn).toBe(2);
    });

    it('details checkpoint owner changes even when both owners are wrong for the reference', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const base = fixtureRun(root, 'base', [], []);
        const events = [{ turn: 2, settlement_id: 'a', mechanism: 'abandoned', from: 'RBiH', to: 'RS' }];
        const cand = fixtureRun(root, 'cand', events, []);
        const refs = references(root);
        for (const id of ['jan1993', 'apr1994', 'apr1995', 'oct1995']) {
            writeFileSync(join(refs, `painted_control_${id}.json`), JSON.stringify({ by_settlement_id: { a: 'HRHB', b: 'RS' } }) + '\n');
        }
        const result = compareControlTimelines({ baselineDir: base, candidateDir: cand, referencesDir: refs, epochs: [{ id: 'oct1995', turn: 4 }] });
        expect(result.checkpoints[0]).toMatchObject({ gross_lost: 0, gross_gained: 0, net: 0 });
        expect(result.changed_osids.map((row: Event) => row.osid)).toEqual(['a']);
        expect(result.changed_osids[0].candidate.events[0].attribution.kind).toBe('non_combat_mechanism');
    });

    it('normalizes compact osid explicitly and rejects missing or ambiguous identifiers', () => {
        expect(normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'abandoned', from: 'RBiH', to: 'RS' }], 2)[0].osid).toBe('a');
        expect(() => normalizeControlEvents([{ turn: 1, mechanism: 'abandoned', from: 'RBiH', to: 'RS' }], 2)).toThrow(/identifier/);
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', settlement_id: 'b', mechanism: 'abandoned', from: 'RBiH', to: 'RS' }], 2)).toThrow(/ambiguous/);
    });

    it.each(['combat', 'paramilitary', 'consolidation', 'abandoned', 'event', 'setup_control'])(
        'accepts the native %s mechanism and native null event owner',
        (mechanism) => {
            expect(normalizeControlEvents([{ turn: 1, osid: 'a', mechanism, from: null, to: 'RS', battle_id: '1:a:x', attacker_brigade: 'x' }], 1)[0]).toMatchObject({ mechanism, from: null, to: 'RS' });
        },
    );

    it('rejects unknown mechanisms, unknown owners, and missing required owner keys', () => {
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'invented', from: 'RBiH', to: 'RS' }], 1)).toThrow(/mechanism/);
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'event', from: 'NOT_A_FACTION', to: 'RS' }], 1)).toThrow(/from owner/);
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'event', from: 'RBiH', to: 'ALSO_INVALID' }], 1)).toThrow(/to owner/);
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'event', to: 'RS' }], 1)).toThrow(/missing from/);
        expect(() => normalizeControlEvents([{ turn: 1, osid: 'a', mechanism: 'event', from: 'RBiH' }], 1)).toThrow(/missing to/);
    });

    it('rejects invalid owner domains in saved controller maps and references', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const dir = fixtureRun(root, 'run', [], []);
        const initialPath = join(dir, 'initial_save.json');
        const initial = JSON.parse(String(require('node:fs').readFileSync(initialPath)));
        initial.political.political_controllers.a = 'NOT_A_FACTION';
        writeFileSync(initialPath, JSON.stringify(initial) + '\n');
        const refs = references(root);
        expect(() => compareControlTimelines({ baselineDir: dir, candidateDir: dir, referencesDir: refs, epochs: [{ id: 'oct1995', turn: 4 }] })).toThrow(/initial controllers.*owner/);

        const valid = fixtureRun(root, 'valid', [], []);
        writeFileSync(join(refs, 'painted_control_oct1995.json'), JSON.stringify({ by_settlement_id: { a: null, b: 'RS' } }) + '\n');
        expect(() => compareControlTimelines({ baselineDir: valid, candidateDir: valid, referencesDir: refs, epochs: [{ id: 'oct1995', turn: 4 }] })).toThrow(/reference.*owner/);
    });

    it('reports a valid combat join without an operation as operationless and unattributed', () => {
        const event = normalizeControlEvents([{ turn: 1, settlement_id: 'a', mechanism: 'combat', from: 'RBiH', to: 'RS', battle_id: '1:a:x', attacker_brigade: 'x' }], 1)[0];
        const { operation_id: _omitted, ...receipt } = battle('1:a:x', 1, 'a', 'x', 'RS');
        expect(classifyCapture(event, receipt)).toEqual({ kind: 'operationless_or_unattributed', operation_ids: [] });
    });

    it('rejects save replay mismatches and malformed or truncated JSONL', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const events = [{ turn: 1, settlement_id: 'a', mechanism: 'abandoned', from: 'RBiH', to: 'RS' }];
        const dir = fixtureRun(root, 'bad-save', events, []);
        const inconsistent = save(2, { a: 'RBiH', b: 'RS' }, events);
        inconsistent.political.political_controllers.a = 'RBiH';
        writeFileSync(join(dir, 'save_w2.json'), JSON.stringify(inconsistent) + '\n');
        expect(() => compareControlTimelines({ baselineDir: dir, candidateDir: dir, referencesDir: references(root), epochs: [{ id: 'oct1995', turn: 4 }] })).toThrow(/save_w2.*replay/i);
        const bad = join(root, 'bad.jsonl');
        writeFileSync(bad, '{"week_index":1}\n{"week_index":2}');
        expect(() => readJsonLinesStrict(bad)).toThrow(/terminal newline/);
        writeFileSync(bad, '{"week_index":1}\nnot-json\n');
        expect(() => readJsonLinesStrict(bad)).toThrow(/line 2/);
    });

    it.each([
        ['missing', [], /missing battle receipt/],
        ['contradictory', [[battle('1:a:x', 1, 'b', 'x', 'RS')]], /contradictory battle receipt/],
        ['duplicate', [[battle('1:a:x', 1, 'a', 'x', 'RS'), battle('1:a:x', 1, 'a', 'x', 'RS')]], /duplicate battle_id/],
    ])('fails closed for %s combat receipts', (_name, battles, pattern) => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const events = [{ turn: 1, settlement_id: 'a', mechanism: 'combat', from: 'RBiH', to: 'RS', battle_id: '1:a:x', attacker_brigade: 'x' }];
        const dir = fixtureRun(root, 'run', events, battles as Record<string, unknown>[][]);
        expect(() => compareControlTimelines({ baselineDir: dir, candidateDir: dir, referencesDir: references(root), epochs: [{ id: 'oct1995', turn: 4 }] })).toThrow(pattern);
    });

    it('reports manifest hash changes and marks source and decision causes unmeasured', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const base = fixtureRun(root, 'base', [], [], { manifest: { 'same.json': '1', 'missing.json': '2' } });
        const cand = fixtureRun(root, 'cand', [], [], { manifest: { 'same.json': '9', 'new.json': '3' } });
        const result = compareControlTimelines({ baselineDir: base, candidateDir: cand, referencesDir: references(root), epochs: [{ id: 'oct1995', turn: 4 }] });
        expect(result.provenance.consumed_input_differences.map((row: Event) => row.path)).toEqual(['missing.json', 'new.json', 'same.json']);
        expect(result.causal_boundary).toEqual({ source_cause: 'UNMEASURED', decision_cause: 'UNMEASURED' });
    });

    it('treats an omitted weekly battles field as an empty native battle list', () => {
        const root = mkdtempSync(join(tmpdir(), 'control-timeline-'));
        const base = fixtureRun(root, 'base', [], []);
        const cand = fixtureRun(root, 'cand', [], []);
        for (const dir of [base, cand]) {
            const rows = Array.from({ length: 4 }, (_, index) => JSON.stringify(index === 1 ? { week_index: index + 1 } : { week_index: index + 1, battles: [] }));
            writeFileSync(join(dir, 'weekly_report.jsonl'), rows.join('\n') + '\n');
        }
        expect(compareControlTimelines({ baselineDir: base, candidateDir: cand, referencesDir: references(root), epochs: [{ id: 'oct1995', turn: 4 }] }).baseline.capture_join_coverage).toEqual({ combat_events: 0, exact_battle_joins: 0 });
    });
});
