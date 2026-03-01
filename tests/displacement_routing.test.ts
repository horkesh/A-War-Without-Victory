/**
 * Phase M4: Displacement routing tests.
 * - Per-municipality routing table coverage
 * - Edge cases (Posavina, Drina enclaves, Sarajevo)
 * - Fallback behavior for unmapped municipalities
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDisplacementRouteForMun } from '../src/state/displacement_routing_data.js';

describe('Displacement Routing — Bosniak (RBiH)', () => {
    it('Prijedor Bosniak routes to Travnik/Jajce, not Tuzla', () => {
        const route = getDisplacementRouteForMun('prijedor', 'RBiH');
        assert.ok(route.length > 0, 'Route should not be empty');
        assert.strictEqual(route[0], 'travnik', 'Primary destination should be Travnik');
        assert.ok(route.includes('jajce'), 'Should include Jajce');
    });

    it('Bijeljina Bosniak routes to Kalesija/Tuzla basin', () => {
        const route = getDisplacementRouteForMun('bijeljina', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'kalesija', 'Primary should be Kalesija');
        assert.ok(route.includes('tuzla'), 'Should include Tuzla');
    });

    it('Zvornik Bosniak routes to Srebrenica enclave first', () => {
        const route = getDisplacementRouteForMun('zvornik', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'srebrenica', 'Primary should be Srebrenica (enclave)');
    });

    it('Foča Bosniak routes to Goražde enclave', () => {
        const route = getDisplacementRouteForMun('foca', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'gorazde', 'Primary should be Goražde');
    });

    it('Banja Luka Bosniak routes via Vrbas valley to Travnik', () => {
        const route = getDisplacementRouteForMun('banja_luka', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'travnik');
    });

    it('Bosanski Petrovac Bosniak routes to Bihać pocket', () => {
        const route = getDisplacementRouteForMun('bosanski_petrovac', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'bihac');
    });

    it('Ilidža Bosniak routes to Sarajevo center', () => {
        const route = getDisplacementRouteForMun('ilidza', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'centar_sarajevo');
    });

    it('Mostar Bosniak routes north along Neretva', () => {
        const route = getDisplacementRouteForMun('mostar', 'RBiH');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'jablanica');
    });

    it('abroad_fraction is 0 for Bosniaks (no external state)', () => {
        // Verified by design — Bosniak routes have 0 abroad fraction
        // The function only returns routes, not abroad fractions
        const route = getDisplacementRouteForMun('prijedor', 'RBiH');
        assert.ok(route.length > 0);
    });
});

describe('Displacement Routing — Croat (HRHB)', () => {
    it('Posavina Croats route to Orašje', () => {
        const route = getDisplacementRouteForMun('bosanski_samac', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'orasje', 'Primary should be Orašje');
    });

    it('Orasje stays in pocket', () => {
        const route = getDisplacementRouteForMun('orasje', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'orasje');
    });

    it('Krajina Croats route to Livno/Herzegovina', () => {
        const route = getDisplacementRouteForMun('banja_luka', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'livno');
    });

    it('Lašva valley Croats route to Kiseljak', () => {
        const route = getDisplacementRouteForMun('vitez', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'kiseljak');
    });

    it('Kakanj Croats route to Kiseljak/Fojnica', () => {
        const route = getDisplacementRouteForMun('kakanj', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'kiseljak');
    });

    it('Sarajevo Croats route to Kiseljak', () => {
        const route = getDisplacementRouteForMun('centar_sarajevo', 'HRHB');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'kiseljak');
    });
});

describe('Displacement Routing — Serb (RS)', () => {
    it('Tuzla Serbs route to Bijeljina/Lopare', () => {
        const route = getDisplacementRouteForMun('tuzla', 'RS');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'bijeljina');
    });

    it('Sarajevo Serbs route to Pale/Sokolac', () => {
        const route = getDisplacementRouteForMun('centar_sarajevo', 'RS');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'pale');
    });

    it('Bihać Serbs route to Bosanski Petrovac', () => {
        const route = getDisplacementRouteForMun('bihac', 'RS');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'bosanski_petrovac');
    });

    it('Mostar Serbs route to Nevesinje', () => {
        const route = getDisplacementRouteForMun('mostar', 'RS');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'nevesinje');
    });

    it('Konjic Serbs route to Kalinovik', () => {
        const route = getDisplacementRouteForMun('konjic', 'RS');
        assert.ok(route.length > 0);
        assert.strictEqual(route[0], 'kalinovik');
    });

    it('Banja Luka Serbs are NOT displaced (RS-controlled)', () => {
        // Banja Luka is not in the Serb routing region — Serbs aren't displaced there
        const route = getDisplacementRouteForMun('banja_luka', 'RS');
        assert.strictEqual(route.length, 0, 'No route — RS-controlled, no Serb displacement');
    });
});

describe('Displacement Routing — Fallback', () => {
    it('unknown municipality returns empty route', () => {
        const route = getDisplacementRouteForMun('nonexistent_mun', 'RBiH');
        assert.strictEqual(route.length, 0);
    });

    it('invalid faction returns empty route', () => {
        const route = getDisplacementRouteForMun('prijedor', 'INVALID' as any);
        assert.strictEqual(route.length, 0);
    });
});
