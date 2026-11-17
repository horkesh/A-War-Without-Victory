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

test("Kravica shows its RBiH morale line exactly once after the E1 data fix", () => {
    const rows = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'data', 'scenarios', 'events', 'war_1993.json'), 'utf8')) as Array<Record<string, unknown>>;
    const kravica = rows.find((row) => row.id === 'kravica_attack_1993');
    assert.ok(kravica);
    const morale = eventDefinitionDisplayEffects(kravica).filter((e) => e.kind === 'morale_change' && e.faction === 'RBiH');
    assert.strictEqual(morale.length, 1);
});

// §6 E1 display ruling (2026-11-17): no count on a war-crimes line; the side's forces are named.
import { formatWarCrimesRecordLine } from '../../src/ui/map/data/warCrimesRecordLine.js';

test('war-crimes line names the side and shows no number', () => {
    for (const faction of ['RBiH', 'RS', 'HRHB']) {
        const line = formatWarCrimesRecordLine(faction, 3);
        assert.ok(line.length > 0, faction);
        assert.ok(!/\d/.test(line), `no digits in "${line}"`);
        assert.ok(!/humanitarian/i.test(line), `no euphemism in "${line}"`);
    }
    assert.match(formatWarCrimesRecordLine('HRHB', 1), /Herzeg-Bosnia forces/);
});

test('war-crimes line is empty without a positive delta (no false zero)', () => {
    assert.strictEqual(formatWarCrimesRecordLine('RS', 0), '');
    assert.strictEqual(formatWarCrimesRecordLine('RS', undefined), '');
    assert.strictEqual(formatWarCrimesRecordLine(undefined, 2), '');
});

// The counter needs a final judicial finding (§10 Rule 2). These six cards have none.
test('cards without a final judicial finding carry no war-crimes delta', () => {
    const files = ['war_1992.json', 'war_1993.json'];
    const unadjudicated = new Set([
        'battle_of_the_barracks_sarajevo', 'battle_of_the_barracks_tuzla', 'turajlic_assassination_1993',
        'kravica_attack_1993', 'srebrenica_shelling_1993', 'mostar_bridge_destroyed_1993',
    ]);
    let seen = 0;
    for (const file of files) {
        const rows = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'data', 'scenarios', 'events', file), 'utf8')) as Array<Record<string, unknown>>;
        for (const row of rows) {
            if (!unadjudicated.has(String(row.id))) continue;
            seen++;
            const all = [row.effect, ...((row.effects as unknown[]) ?? [])] as Array<{ kind?: string }>;
            assert.ok(!all.some((e) => e?.kind === 'humanitarian_impact'), `${String(row.id)} still records a war crime`);
        }
    }
    assert.strictEqual(seen, unadjudicated.size);
});
