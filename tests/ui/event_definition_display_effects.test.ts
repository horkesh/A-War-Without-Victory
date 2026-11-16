import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { eventDefinitionDisplayEffects } from '../../src/ui/map/data/DataLoader.js';

// §6 E1 (2026-11-16): the card must show what the engine applies (`effect` + `effects`).

test('a mechanical effect is listed first, then each effects entry', () => {
    const shown = eventDefinitionDisplayEffects({
        effect: { kind: 'morale_change', faction: 'RBiH', delta: 3 },
        effects: [{ kind: 'aggression_modifier', faction: 'RS', delta: 0.1 }, { kind: 'narrative', text: 'x' }],
    });
    assert.deepStrictEqual(shown.map((e) => e.kind), ['morale_change', 'aggression_modifier', 'narrative']);
});

test('a narrative effect beside effects stays hidden (card text unchanged)', () => {
    const shown = eventDefinitionDisplayEffects({
        effect: { kind: 'narrative', text: 'line' },
        effects: [{ kind: 'supply_delta', faction: 'RS', delta: -3 }],
    });
    assert.deepStrictEqual(shown.map((e) => e.kind), ['supply_delta']);
});

test('an effect-only row shows its effect, whatever its kind', () => {
    assert.deepStrictEqual(eventDefinitionDisplayEffects({ effect: { kind: 'narrative', text: 'line' } }).length, 1);
    assert.deepStrictEqual(eventDefinitionDisplayEffects({}).length, 0);
});

test('Kravica shows its RBiH morale line exactly once after the E1 data fix', () => {
    const rows = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'data', 'scenarios', 'events', 'war_1993.json'), 'utf8')) as Array<Record<string, unknown>>;
    const kravica = rows.find((row) => row.id === 'kravica_attack_1993');
    assert.ok(kravica);
    const morale = eventDefinitionDisplayEffects(kravica).filter((e) => e.kind === 'morale_change' && e.faction === 'RBiH');
    assert.strictEqual(morale.length, 1);
});
