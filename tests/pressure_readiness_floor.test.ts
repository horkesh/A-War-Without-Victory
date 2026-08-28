import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The accumulate branch of updateEventPressure had no zero floor while the decay
 * branch did. A modifier set summing negative would drive readiness arbitrarily
 * below 0, and every turn climbing back out is a turn the event silently cannot
 * fire — long after the suppressing condition has gone.
 */
describe('event pressure readiness floor', () => {
    it('the accumulate branch is floored at zero', () => {
        const src = readFileSync('src/sim/events/pressure_system.ts', 'utf8');
        expect(src).toContain('readiness[def.id] = Math.max(0, (readiness[def.id] ?? 0) + rate);');
    });

    it('no shipped event can reach a negative rate', () => {
        // The floor is behaviour-neutral only while this holds. If a future row
        // breaks it, that is the moment to check the floor is doing what is wanted
        // rather than masking a mis-signed modifier.
        const dir = 'data/scenarios/events';
        const offenders: string[] = [];
        for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
            const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
            const list = Array.isArray(raw) ? raw : (raw.events ?? Object.values(raw));
            for (const e of list as Array<{ id?: string; pressure?: { base_rate: number; modifiers?: Array<{ rate_bonus: number }> } }>) {
                if (!e?.pressure) continue;
                const negSum = (e.pressure.modifiers ?? [])
                    .filter((m) => m.rate_bonus < 0)
                    .reduce((s, m) => s + m.rate_bonus, 0);
                if (e.pressure.base_rate + negSum < 0) {
                    offenders.push(`${file}:${e.id} (base ${e.pressure.base_rate} + neg ${negSum})`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
