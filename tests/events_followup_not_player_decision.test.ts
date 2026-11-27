import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * FOLLOWUP-PLAYER-UNSETTLED, accepted as final (orchestrator ruling §58, 2026-11-27): a same-turn
 * follow-up row (`same_turn_requires_events: true`) fires after the pause before combat, so a live
 * player's card from it would wait a turn while headless answers it the same turn. The engine keeps
 * that behaviour; the event data must never create the case. This contract fails if a follow-up row
 * is a decision (carries `response_options`).
 */

const EVENTS_DIR = resolve('data/scenarios/events');

type EventRow = { id?: string; same_turn_requires_events?: boolean; response_options?: unknown[] };

function loadAllEvents(): Array<{ file: string; row: EventRow }> {
    const out: Array<{ file: string; row: EventRow }> = [];
    const files = readdirSync(EVENTS_DIR).filter((name) => name.endsWith('.json')).sort();
    for (const file of files) {
        const parsed = JSON.parse(readFileSync(join(EVENTS_DIR, file), 'utf8').replace(/^﻿/, ''));
        const rows: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [];
        for (const row of rows) {
            if (row && typeof row === 'object') out.push({ file, row: row as EventRow });
        }
    }
    return out;
}

describe('same-turn follow-up rows are never player decisions (§58)', () => {
    const events = loadAllEvents();

    it('loads the event catalogue and finds the follow-up rows', () => {
        expect(events.length).toBeGreaterThan(100);
        expect(events.filter(({ row }) => row.same_turn_requires_events === true).length).toBeGreaterThan(0);
    });

    it('no same_turn_requires_events row carries response_options', () => {
        const offenders = events
            .filter(({ row }) => row.same_turn_requires_events === true
                && Array.isArray(row.response_options) && row.response_options.length > 0)
            .map(({ file, row }) => `${file}:${row.id}`);
        expect(offenders).toEqual([]);
    });
});
