import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// R8 render check: the Verdict opens on the signing beat when a finished game is loaded from a
// save, without the Dayton conference room ever loading. The beat rendered unstyled because the
// dayton-live-* classes it uses live in live.css, which only the room imported. Every such class
// the beat uses must be defined by a stylesheet the beat's own module imports.
const dir = join(__dirname, '../../src/ui/map/dayton_conference');
const read = (name: string) => readFileSync(join(dir, name), 'utf8');

describe('Dayton signing beat styles', () => {
    it('imports a stylesheet that defines every dayton-live class it uses', () => {
        const beat = read('DaytonSigningBeat.tsx');
        const imported = [...beat.matchAll(/^import '\.\/([\w-]+\.css)';/gm)].map((match) => match[1]);
        expect(imported).toContain('live.css');
        const defined = new Set<string>();
        for (const file of imported) {
            for (const match of read(file).matchAll(/\.(dayton-live[\w-]*)/g)) defined.add(match[1]);
        }
        const used = [...new Set([...beat.matchAll(/\b(dayton-live[\w-]*)\b/g)].map((match) => match[1]))];
        expect(used.length).toBeGreaterThan(5);
        const undefinedClasses = used.filter((name) => !defined.has(name));
        expect(undefinedClasses).toEqual([]);
    });

    it('loads live.css before the beat\'s own sheets, the order it always had after the room', () => {
        const beat = read('DaytonSigningBeat.tsx');
        const order = ['live.css', 'room.css', 'boundary.css', 'signing.css'].map((name) => beat.indexOf(`import './${name}'`));
        expect(order.every((index) => index >= 0)).toBe(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });
});
