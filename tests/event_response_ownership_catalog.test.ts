import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const eventDir = path.join(process.cwd(), 'data', 'scenarios', 'events');
const files = fs.readdirSync(eventDir).filter((file) => file.endsWith('.json')).sort();
const validFactions = new Set(['RBiH', 'RS', 'HRHB']);

describe('required event response ownership', () => {
    it('requires every required-response event to declare responding_faction', () => {
        const missing: string[] = [];
        const invalid: string[] = [];

        for (const file of files) {
            const events = JSON.parse(fs.readFileSync(path.join(eventDir, file), 'utf8'));
            for (const event of events) {
                if (event.requires_player_response !== true) continue;
                if (!event.responding_faction) {
                    missing.push(`${file}:${event.id}`);
                } else if (!validFactions.has(event.responding_faction)) {
                    invalid.push(`${file}:${event.id}:${event.responding_faction}`);
                }
            }
        }

        expect(missing, `Missing responding_faction:\n${missing.join('\n')}`).toHaveLength(0);
        expect(invalid, `Invalid responding_faction:\n${invalid.join('\n')}`).toHaveLength(0);
    });
});
