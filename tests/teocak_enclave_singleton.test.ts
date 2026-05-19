/**
 * Teocak singleton enclave — late-war 188w anchor repair.
 *
 * Background: `op:ugljevik:teocak_krstac_2` is the painted RBiH OSID
 * for the lone Bosniak holdout in Ugljevik municipality (255th Slavna
 * Mountain Brigade "Hajrudin Mesić", BB1 p.509). Historically it held
 * against VRS East Bosnian Corps pressure throughout 1992–1995.
 *
 * At 188w in the integrated-context wave following commit 04c750e3
 * ("default player_faction in headless harness"), Teocak regressed
 * from RBiH-held to RS-captured because it had no enclave entry to
 * give the lone defender resilience, defense bonus, or capital-OSID
 * garrison concentration. This batch adds Teocak as a singleton
 * enclave mirroring the existing Žepa pattern.
 *
 * These tests pin the mechanical contract. The 40w/188w hash drift
 * is authorized by 04c750e3's "Re-anchor pending under
 * LANE-V09X-PLAYER-FACTION-CONTRACT if drift exceeds noise" handoff.
 */

import { describe, it, expect } from 'vitest';
import {
    ENCLAVE_DEFINITIONS,
    getEnclaveIdForOsid,
    getEnclaveMaxPersonnel,
    getEnclaveDefenseBonus,
    updateEnclaveResilience,
    osidBelongsToEnclave,
} from '../src/sim/combat/enclave_resilience.js';
import type { EnclaveResilienceEntry, GameState } from '../src/state/game_state.js';

const TEOCAK_OSID = 'op:ugljevik:teocak_krstac_2';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: 1,
        meta: { turn: 20, seed: 'test', phase: 'war' },
        factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] },
        ],
        ...overrides,
        military: {
            formations: {},
            ...(overrides?.military || {}),
        } as any,
        political: {
            settlements: [],
            municipalities: {},
            political_controllers: {},
            ...(overrides?.political || {}),
        } as any,
        displacement: {
            ...(overrides?.displacement || {}),
        } as any,
    } as unknown as GameState;
}

function makeCriticalSupplyReport(osids: string[], faction: string = 'RBiH') {
    return {
        schema: 1 as const,
        turn: 20,
        factions: [
            {
                faction_id: faction,
                by_osid: osids.map((osid) => ({ osid, state: 'critical' as const })),
            },
        ],
    };
}

describe('Teocak singleton enclave — definition contract', () => {
    it('ENCLAVE_DEFINITIONS contains a teocak entry', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak');
        expect(teocak).toBeDefined();
    });

    it('Teocak is faction RBiH', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak');
        expect(teocak?.faction).toBe('RBiH');
    });

    it('Teocak singleton scopes exactly one OSID via osid_list (no prefix glob)', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak');
        expect(teocak?.osid_list).toEqual([TEOCAK_OSID]);
        expect(teocak?.osid_prefixes).toBeUndefined();
    });

    it('Teocak capital_osid equals the singleton OSID (concentric defense focus)', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak');
        expect(teocak?.capital_osid).toBe(TEOCAK_OSID);
    });

    it('Teocak resilience_start_turn matches the 1992 Drina/Majevica formation window', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak');
        // Same window as Srebrenica/Žepa (16) — pocket crystallized through 1992 VRS offensives
        expect(teocak?.resilience_start_turn).toBe(16);
    });
});

describe('Teocak singleton — OSID lookup', () => {
    it('getEnclaveIdForOsid maps the Teocak OSID to "teocak"', () => {
        expect(getEnclaveIdForOsid(TEOCAK_OSID)).toBe('teocak');
    });

    it('osidBelongsToEnclave is true only for the Teocak OSID', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak')!;
        expect(osidBelongsToEnclave(TEOCAK_OSID, teocak)).toBe(true);
        // Neighbouring Ugljevik OSIDs are NOT in Teocak singleton
        expect(osidBelongsToEnclave('op:ugljevik:ugljevik_2', teocak)).toBe(false);
        expect(osidBelongsToEnclave('op:ugljevik:donja_trnova_2', teocak)).toBe(false);
        // Adjacent Žepa OSID is NOT in Teocak
        expect(osidBelongsToEnclave('op:rogatica:zepa_2', teocak)).toBe(false);
    });
});

describe('Teocak singleton — max personnel cap (lone holdout sizing)', () => {
    it('getEnclaveMaxPersonnel("teocak") returns 400 (matches Žepa singleton class)', () => {
        // Tiny isolated pocket; ~3–5k population; comparable to Žepa (400).
        expect(getEnclaveMaxPersonnel('teocak')).toBe(400);
    });
});

describe('Teocak singleton — resilience growth under isolation', () => {
    it('accumulates isolation_turns from critical supply at Teocak OSID', () => {
        const state = makeMinimalState();
        const supply = makeCriticalSupplyReport([TEOCAK_OSID]);
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['teocak'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(1);
        expect(entry.hardening_active).toBe(false);
    });

    it('does not grow resilience before resilience_start_turn (turn 16)', () => {
        const state = makeMinimalState({
            meta: { turn: 10, seed: 'test', phase: 'war' },
        } as any);
        const supply = makeCriticalSupplyReport([TEOCAK_OSID]);
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['teocak'] as EnclaveResilienceEntry;
        // Pre-start-turn: critical supply does not increment isolation OR resilience
        expect(entry.isolation_turns).toBe(0);
        expect(entry.resilience).toBe(0);
    });

    it('grows resilience after resilience_start_turn under critical supply', () => {
        const state = makeMinimalState({
            meta: { turn: 20, seed: 'test', phase: 'war' },
        } as any);
        const supply = makeCriticalSupplyReport([TEOCAK_OSID]);
        for (let i = 0; i < 5; i++) {
            updateEnclaveResilience(state, supply);
        }
        const entry = state.political.enclave_resilience!['teocak'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(5);
        // 5 turns × growth_critical(2) × growth_mult(0.30) = 3.0
        expect(entry.resilience).toBeCloseTo(3.0, 5);
    });
});

describe('Teocak singleton — defense bonus wiring', () => {
    it('getEnclaveDefenseBonus returns >1.0 at Teocak OSID when resilience is positive', () => {
        const state = makeMinimalState({
            political: {
                enclave_resilience: {
                    teocak: { resilience: 10, isolation_turns: 5, hardening_active: false },
                },
            } as any,
        });
        const bonus = getEnclaveDefenseBonus(state, TEOCAK_OSID);
        expect(bonus).toBeGreaterThan(1.0);
    });

    it('getEnclaveDefenseBonus returns 1.0 at non-Teocak OSIDs', () => {
        const state = makeMinimalState({
            political: {
                enclave_resilience: {
                    teocak: { resilience: 20, isolation_turns: 10, hardening_active: true },
                },
            } as any,
        });
        expect(getEnclaveDefenseBonus(state, 'op:ugljevik:ugljevik_2')).toBe(1.0);
        expect(getEnclaveDefenseBonus(state, 'op:brcko:brcko')).toBe(1.0);
    });
});

describe('Teocak singleton — boundary with sensitive-history enclaves', () => {
    it('Teocak is NOT in the Sarajevo prefix set (not city-core)', () => {
        // The SARAJEVO_ID_SET_ENGINE_GEOMETRY_CANON gate scopes Sarajevo prefixes;
        // Teocak's singleton osid_list must never overlap a Sarajevo prefix.
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak')!;
        for (const osid of teocak.osid_list ?? []) {
            expect(osid.startsWith('op:centar_sarajevo:')).toBe(false);
            expect(osid.startsWith('op:novo_sarajevo:')).toBe(false);
            expect(osid.startsWith('op:stari_grad:')).toBe(false);
            expect(osid.startsWith('op:novi_grad:')).toBe(false);
        }
    });

    it('Teocak singleton does not collide with Srebrenica or Žepa osid_lists', () => {
        const teocak = ENCLAVE_DEFINITIONS.find((e) => e.id === 'teocak')!;
        const sreb = ENCLAVE_DEFINITIONS.find((e) => e.id === 'srebrenica')!;
        const zepa = ENCLAVE_DEFINITIONS.find((e) => e.id === 'zepa')!;
        for (const osid of teocak.osid_list ?? []) {
            expect(sreb.osid_list).not.toContain(osid);
            expect(zepa.osid_list).not.toContain(osid);
        }
    });
});
