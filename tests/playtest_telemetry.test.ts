/**
 * Local-first playtest telemetry slice — digest + gated writer.
 *
 * Proves:
 *   (a) flag-OFF (default) ⇒ maybeWritePlaytestSessionDigest is a no-op: returns null,
 *       writes NOTHING to disk.
 *   (b) flag-ON ⇒ writes the expected local diagnostic shape deterministically (same
 *       inputs ⇒ byte-identical content; filename label is the only varying part).
 *   (c) the digest builder is pure/deterministic and orders controllers stably.
 *
 * Determinism: tests use an isolated temp dir and restore the override afterwards.
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    resetPlaytestTelemetryOverride,
    setPlaytestTelemetryOverride,
} from '../src/diagnostics/telemetry/playtest_telemetry_flag.js';
import {
    PLAYTEST_TELEMETRY_DIGEST_SCHEMA,
    buildPlaytestSessionDigest,
    maybeWritePlaytestSessionDigest,
    serializePlaytestSessionDigest,
    type PlaytestSummaryInput,
} from '../src/diagnostics/telemetry/playtest_telemetry.js';

const SUMMARY: PlaytestSummaryInput = {
    schema: 2,
    turns: [{ turn: 1 }, { turn: 2 }, { turn: 3 }],
    end_state: { kind: 'treaty', treaty_id: 'dayton', since_turn: 3 },
    end_state_totals: {
        // Intentionally out-of-order keys to prove deterministic sorting.
        settlements_by_controller: { RS: 40, RBiH: 55, HRHB: 12 },
    },
    war_active_turns: 3,
};

describe('playtest telemetry digest + gated writer', () => {
    let tmp: string;

    beforeEach(() => {
        resetPlaytestTelemetryOverride();
        tmp = mkdtempSync(join(tmpdir(), 'awwv-playtest-telemetry-'));
    });

    afterEach(() => {
        resetPlaytestTelemetryOverride();
        try {
            rmSync(tmp, { recursive: true, force: true });
        } catch {
            // best-effort cleanup
        }
    });

    it('builds a deterministic digest with stably-ordered controllers (pure)', () => {
        const d1 = buildPlaytestSessionDigest({ scenarioId: 'scn', runId: 'r1', summary: SUMMARY });
        const d2 = buildPlaytestSessionDigest({ scenarioId: 'scn', runId: 'r1', summary: SUMMARY });
        expect(serializePlaytestSessionDigest(d1)).toBe(serializePlaytestSessionDigest(d2));

        expect(d1.schema).toBe(PLAYTEST_TELEMETRY_DIGEST_SCHEMA);
        expect(d1.turns_run).toBe(3);
        expect(d1.first_turn).toBe(1);
        expect(d1.last_turn).toBe(3);
        expect(d1.war_active_turns).toBe(3);
        expect(d1.end_state_kind).toBe('treaty');
        expect(d1.end_state_treaty_id).toBe('dayton');
        expect(d1.end_state_since_turn).toBe(3);
        // Sorted by controller id: HRHB < RBiH < RS
        expect(d1.settlements_by_controller.map((r) => r.controller)).toEqual(['HRHB', 'RBiH', 'RS']);
        expect(d1.total_settlements_counted).toBe(107);
    });

    it('handles an empty/early summary without throwing', () => {
        const d = buildPlaytestSessionDigest({
            scenarioId: 'scn',
            runId: 'r0',
            summary: { schema: 2, turns: [] },
        });
        expect(d.turns_run).toBe(0);
        expect(d.first_turn).toBeNull();
        expect(d.last_turn).toBeNull();
        expect(d.settlements_by_controller).toEqual([]);
        expect(d.total_settlements_counted).toBe(0);
        expect(d.end_state_kind).toBeNull();
    });

    it('(a) flag OFF (default) is a no-op: returns null and writes nothing', async () => {
        // Default state: override reset, no env → OFF.
        const result = await maybeWritePlaytestSessionDigest({
            scenarioId: 'scn',
            runId: 'r1',
            summary: SUMMARY,
            dir: tmp,
            filenameLabel: 'fixed',
        });
        expect(result).toBeNull();
        // Directory must contain no telemetry artifacts.
        const entries = existsSync(tmp) ? readdirSync(tmp) : [];
        expect(entries).toEqual([]);
    });

    it('(b) flag ON writes the expected deterministic shape to the local dir', async () => {
        setPlaytestTelemetryOverride(true);
        const path = await maybeWritePlaytestSessionDigest({
            scenarioId: 'my/scenario.json',
            runId: 'turns3',
            summary: SUMMARY,
            dir: tmp,
            filenameLabel: 'fixedlabel',
        });
        expect(path).not.toBeNull();
        expect(existsSync(path!)).toBe(true);

        // Filename sanitizes path separators and embeds the label.
        const files = readdirSync(tmp);
        expect(files).toHaveLength(1);
        expect(files[0]).toBe('my_scenario.json__turns3__fixedlabel.json');

        const written = readFileSync(path!, 'utf8');
        const expected = serializePlaytestSessionDigest(
            buildPlaytestSessionDigest({ scenarioId: 'my/scenario.json', runId: 'turns3', summary: SUMMARY })
        );
        // Content is byte-identical to the pure digest serialization (no clock leakage).
        expect(written).toBe(expected);
        expect(written).not.toContain('fixedlabel'); // label is filename-only, not content
    });

    it('(b2) flag ON produces byte-identical content across runs (only filename label varies)', async () => {
        setPlaytestTelemetryOverride(true);
        const p1 = await maybeWritePlaytestSessionDigest({
            scenarioId: 'scn', runId: 'r1', summary: SUMMARY, dir: tmp, filenameLabel: 'aaa',
        });
        const p2 = await maybeWritePlaytestSessionDigest({
            scenarioId: 'scn', runId: 'r1', summary: SUMMARY, dir: tmp, filenameLabel: 'bbb',
        });
        expect(p1).not.toBe(p2);
        expect(readFileSync(p1!, 'utf8')).toBe(readFileSync(p2!, 'utf8'));
    });
});
