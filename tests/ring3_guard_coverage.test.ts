import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { isRing3SensitiveFamily } from '../src/sim/events/event_families.js';

/**
 * The genocide-producing event and its two dependants carried NO `family`, and
 * `isRing3SensitiveFamily` returns false on its first line for any falsy family.
 * The single most sensitive row in the catalog was therefore outside the mechanical
 * Ring-3 guard: `validateRing3EnablingRejection` (event_loader.ts:786) could not see
 * it, so nothing stopped a response option from runtime-enabling it.
 *
 * Found by the §6 panel red-team seat, 2026-08-28.
 */
describe('Ring-3 guard covers the enclave-fall chain', () => {
    interface EventRow { id?: string; family?: string }

    const rows = (() => {
        const raw: unknown = JSON.parse(readFileSync('data/scenarios/events/war_1995.json', 'utf8'));
        const container = raw as { events?: unknown };
        const list = (Array.isArray(raw) ? raw : (container.events ?? Object.values(raw as object))) as EventRow[];
        const map = new Map<string, EventRow>();
        for (const row of list) {
            if (row && typeof row.id === 'string') map.set(row.id, row);
        }
        return map;
    })();

    const CHAIN = [
        'srebrenica_falls_1995',
        'zepa_falls_1995',
        'srebrenica_column_breakout_1995',
    ];

    it.each(CHAIN)('%s carries a Ring-3 sensitive family', (id) => {
        const row = rows.get(id);
        expect(row, `${id} missing from war_1995.json`).toBeDefined();
        expect(row!.family, `${id} has no family — it is invisible to the Ring-3 guard`).toBeTruthy();
        expect(isRing3SensitiveFamily(row!.family)).toBe(true);
    });

    it('an absent family is NOT sensitive — the reason the hole existed', () => {
        // Pinning the trap itself: this is why a missing field silently disabled
        // the guard rather than failing loudly.
        expect(isRing3SensitiveFamily(undefined)).toBe(false);
        expect(isRing3SensitiveFamily('')).toBe(false);
    });
});
