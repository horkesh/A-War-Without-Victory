import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EV1 guard (2026-11-14): every `requires_player_response` event must carry a ranked answer,
 * either an authored `historical_default_response_id` (source-backed events) or a
 * `staff_recommended_response_id` (design counterfactuals and abstract command decisions).
 *
 * Why: a "let history run" player, Observer mode and the R8 `--historical-choice` harness
 * (tools/ui/paradox_local_qa.cjs `selectHistoricalEventChoice`) cannot answer an event that has
 * neither. The R8 dry run found 9 such events out of 301, which blocked the R8 qualifying
 * campaigns.
 *
 * The two fields mean different things and must not be swapped to make this test pass:
 * - `historical_default_response_id` claims the option is the historically attested choice
 *   (gold "Historical default" chip) AND becomes the headless/Observer bot pick, so adding one
 *   can move the 188w calibration baseline.
 * - `staff_recommended_response_id` is shown as "Staff recommendation" ("Your staff recommends
 *   this option. It is not the historical default ..."); the bot never reads it.
 */

const EVENTS_DIR = resolve('data/scenarios/events');

/**
 * Named exceptions. Each one needs a reason and a record. An entry that gains a default must be
 * removed from here (the stale-exception test below fails until it is).
 */
const EXCEPTIONS: Readonly<Record<string, string>> = {
    // §6 Ring-3 decision, deliberately UNAUTHORED. Unanimous four-seat §6 panel (Historian,
    // scenario-tester/calibration, Engine/systems, Red-team), 2026-11-14, record:
    // docs/40_reports/implemented/20261114_EV1_EVENT_DEFAULTS_PANEL.md. Neither option describes
    // what the RS leadership did in the Drina valley in 1992 (written orders for the record while
    // the campaign went on; ICTY Karadžić IT-95-5/18-T), so a "Historical default" chip would be
    // false and a "Staff recommendation" chip would steer a Ring-3 decision. History mode uses the
    // explicit operator selector `--rs-drina-policy` in the R8 harness, which records the pick as
    // a counterfactual with no historicity claim.
    //
    // The headless bot still resolves this event by ARRAY POSITION (bot_v1 -> `systematic`).
    // That is a positional artefact, NOT a historical claim: no report, Chronicle entry or Codex
    // text may describe it as historical. The repair (re-price, rename, a third option, an
    // authored default) is docs/plans/2026-08-31-s6-ring3-half-migration-packet.md, which needs
    // its own panel and a calibration slot.
    drina_cleansing_decision_1992: 'unauthored by unanimous EV1 §6 panel ruling (2026-11-14)',
};

type EventRow = {
    id?: unknown;
    requires_player_response?: unknown;
    historical_default_response_id?: unknown;
    staff_recommended_response_id?: unknown;
    response_options?: Array<{ id?: unknown }>;
};

function loadAllEvents(): Array<{ file: string; row: EventRow }> {
    const out: Array<{ file: string; row: EventRow }> = [];
    const files = readdirSync(EVENTS_DIR).filter((name) => name.endsWith('.json')).sort();
    for (const file of files) {
        const parsed = JSON.parse(readFileSync(join(EVENTS_DIR, file), 'utf8').replace(/^﻿/, ''));
        const rows: unknown[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.events)
                ? parsed.events
                : [];
        for (const row of rows) {
            if (row && typeof row === 'object') out.push({ file, row: row as EventRow });
        }
    }
    return out;
}

function rankedAnswer(row: EventRow): string | null {
    const optionIds = new Set((row.response_options ?? []).map((option) => option.id));
    for (const candidate of [row.historical_default_response_id, row.staff_recommended_response_id]) {
        if (typeof candidate === 'string' && candidate.length > 0 && optionIds.has(candidate)) return candidate;
    }
    return null;
}

describe('EV1: every requires_player_response event has a ranked answer', () => {
    const events = loadAllEvents();
    const required = events.filter(({ row }) => row.requires_player_response === true);

    it('loads the event corpus', () => {
        expect(events.length).toBeGreaterThan(250);
        expect(required.length).toBeGreaterThan(0);
    });

    it('has a historical default or a staff recommendation on every required event', () => {
        const missing = required
            .filter(({ row }) => !EXCEPTIONS[String(row.id)] && rankedAnswer(row) === null)
            .map(({ file, row }) => `${file}: ${String(row.id)}`);
        expect(missing).toEqual([]);
    });

    it('has exactly one exception, the §6 Drina decision, and it carries no ranked answer of any kind', () => {
        expect(Object.keys(EXCEPTIONS)).toEqual(['drina_cleansing_decision_1992']);
        const drina = required.find(({ row }) => row.id === 'drina_cleansing_decision_1992')?.row as
            (EventRow & { response_options?: Array<{ id?: unknown; historical_marker?: unknown }> }) | undefined;
        expect(drina).toBeDefined();
        expect(drina).not.toHaveProperty('historical_default_response_id');
        expect(drina).not.toHaveProperty('staff_recommended_response_id');
        for (const option of drina!.response_options ?? []) {
            expect(option).not.toHaveProperty('historical_marker');
        }
    });

    it('keeps the exception list honest (no stale or unknown entries)', () => {
        const byId = new Map(required.map(({ row }) => [String(row.id), row]));
        for (const id of Object.keys(EXCEPTIONS)) {
            const row = byId.get(id);
            expect(row, `exception ${id} is not a requires_player_response event`).toBeDefined();
            expect(rankedAnswer(row!), `exception ${id} now has a ranked answer; remove it from EXCEPTIONS`).toBeNull();
        }
    });
});
