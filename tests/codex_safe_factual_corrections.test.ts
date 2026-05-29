import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';

interface EventRow {
    id: string;
    narrative?: string;
    effect?: { text?: string };
    effects?: Array<{ text?: string }>;
    response_options?: Array<{ label?: string; description?: string }>;
}

const war1995 = JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/scenarios/events/war_1995.json'), 'utf8'),
) as EventRow[];

function rowText(id: string): string {
    const row = war1995.find((event) => event.id === id);
    assert.ok(row, `Missing event ${id}`);
    return JSON.stringify(row);
}

test('Deliberate Force wording stays bounded and avoids cinematic causality claims', () => {
    const text = `${rowText('nato_deliberate_force_1995')}\n${rowText('deliberate_force_rs_compliance_1995')}`;

    for (const forbidden of [
        'devastates VRS military infrastructure',
        'shatters its ability to sustain offensive operations',
        'Holbrooke holds the pause button',
        'absorbs the punishment',
        'Absorb the strikes',
        'degrade VRS combat power',
    ]) {
        assert.strictEqual(text.includes(forbidden), false, forbidden);
    }

    assert.ok(text.includes('damages VRS military infrastructure and adds pressure to its ability to sustain operations'));
    assert.ok(text.includes('US diplomacy presses Pale to withdraw heavy weapons from Sarajevo and open supply routes'));
    assert.ok(text.includes('continues to face NATO air strikes'));
});

test('Mistral 2 wording stays neutral and avoids triumphalist operation framing', () => {
    const text = rowText('operation_mistral_2_1995');

    for (const forbidden of [
        'Croatian war machine',
        'into the heart of VRS-held western Bosnia',
        'Jajce -- the symbolic prize lost in October 1992 amid mutual HVO-ARBiH recriminations -- is liberated',
        'The VRS line in western Bosnia is disintegrating',
        'sweep through western Bosnia',
        'collapsing VRS positions',
    ]) {
        assert.strictEqual(text.includes(forbidden), false, forbidden);
    }

    assert.ok(text.includes('HV/HVO forces advance from the Grahovo-Glamoc area during Operation Mistral 2'));
    assert.ok(text.includes('Jajce -- the symbolic prize lost in October 1992 amid mutual HVO-ARBiH recriminations -- is recaptured'));
    assert.ok(text.includes('VRS positions in western Bosnia come under severe pressure'));
    assert.ok(text.includes('advance through western Bosnia, taking substantial territory and forcing VRS withdrawals'));
});
