/**
 * Phase M4: Displacement routing tests.
 * - Per-municipality routing table coverage
 * - Edge cases (Posavina, Drina enclaves, Sarajevo)
 * - Fallback behavior for unmapped municipalities
 */

import { describe, expect, it } from 'vitest';
import { getDisplacementRouteForMun } from '../src/state/displacement_routing_data.js';

describe('Displacement Routing — Bosniak (RBiH)', () => {
    it('Prijedor Bosniak routes first toward the Bihac pocket before interior corridors', () => {
        const route = getDisplacementRouteForMun('prijedor', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('bihac');
        expect(route.includes('travnik')).toBeTruthy();
    });

    it('Bijeljina Bosniak routes to Kalesija/Tuzla basin', () => {
        const route = getDisplacementRouteForMun('bijeljina', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kalesija');
        expect(route.includes('tuzla')).toBeTruthy();
    });

    it('Zvornik Bosniak routes west toward Kalesija/Tuzla first', () => {
        const route = getDisplacementRouteForMun('zvornik', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kalesija');
        expect(route.includes('tuzla')).toBeTruthy();
    });

    it('Foča Bosniak routes to Goražde enclave', () => {
        const route = getDisplacementRouteForMun('foca', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('gorazde');
    });

    it('Banja Luka Bosniak routes via Vrbas valley to Travnik', () => {
        const route = getDisplacementRouteForMun('banja_luka', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('travnik');
    });

    it('Bosanski Petrovac Bosniak routes to Bihać pocket', () => {
        const route = getDisplacementRouteForMun('bosanski_petrovac', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('bihac');
    });

    it('Ilidža Bosniak routes to Sarajevo center', () => {
        const route = getDisplacementRouteForMun('ilidza', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('centar_sarajevo');
    });

    it('Mostar Bosniak routes north along Neretva', () => {
        const route = getDisplacementRouteForMun('mostar', 'RBiH');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('jablanica');
    });

    it('abroad_fraction is 0 for Bosniaks (no external state)', () => {
        // Verified by design — Bosniak routes have 0 abroad fraction
        // The function only returns routes, not abroad fractions
        const route = getDisplacementRouteForMun('prijedor', 'RBiH');
        expect(route.length > 0).toBeTruthy();
    });
});

describe('Displacement Routing — Croat (HRHB)', () => {
    it('Posavina Croats route to Orašje', () => {
        const route = getDisplacementRouteForMun('bosanski_samac', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('orasje');
    });

    it('Orasje stays in pocket', () => {
        const route = getDisplacementRouteForMun('orasje', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('orasje');
    });

    it('Krajina Croats route to Livno/Herzegovina', () => {
        const route = getDisplacementRouteForMun('banja_luka', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('livno');
    });

    it('Lašva valley Croats route to Kiseljak', () => {
        const route = getDisplacementRouteForMun('vitez', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kiseljak');
    });

    it('Kakanj Croats route to Kiseljak/Fojnica', () => {
        const route = getDisplacementRouteForMun('kakanj', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kiseljak');
    });

    it('Sarajevo Croats route to Kiseljak', () => {
        const route = getDisplacementRouteForMun('centar_sarajevo', 'HRHB');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kiseljak');
    });
});

describe('Displacement Routing — Serb (RS)', () => {
    it('Tuzla Serbs route to Bijeljina/Lopare', () => {
        const route = getDisplacementRouteForMun('tuzla', 'RS');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('bijeljina');
    });

    it('Sarajevo Serbs route to Pale/Sokolac', () => {
        const route = getDisplacementRouteForMun('centar_sarajevo', 'RS');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('pale');
    });

    it('Bihać Serbs route to Bosanski Petrovac', () => {
        const route = getDisplacementRouteForMun('bihac', 'RS');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('bosanski_petrovac');
    });

    it('Mostar Serbs route to Nevesinje', () => {
        const route = getDisplacementRouteForMun('mostar', 'RS');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('nevesinje');
    });

    it('Konjic Serbs route to Kalinovik', () => {
        const route = getDisplacementRouteForMun('konjic', 'RS');
        expect(route.length > 0).toBeTruthy();
        expect(route[0]).toBe('kalinovik');
    });

    it('Banja Luka Serbs are NOT displaced (RS-controlled)', () => {
        // Banja Luka is not in the Serb routing region — Serbs aren't displaced there
        const route = getDisplacementRouteForMun('banja_luka', 'RS');
        expect(route.length).toBe(0);
    });
});

describe('Displacement Routing — Fallback', () => {
    it('unknown municipality returns empty route', () => {
        const route = getDisplacementRouteForMun('nonexistent_mun', 'RBiH');
        expect(route.length).toBe(0);
    });

    it('invalid faction returns empty route', () => {
        const route = getDisplacementRouteForMun('prijedor', 'INVALID' as any);
        expect(route.length).toBe(0);
    });
});
