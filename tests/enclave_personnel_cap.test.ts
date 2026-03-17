/**
 * Tests for per-enclave max personnel caps (B2: Gorazde over-mobilization fix).
 *
 * Verifies that:
 * - getEnclaveMaxPersonnel returns differentiated caps per enclave
 * - getEnclaveIdForOsid correctly maps OSIDs to enclave IDs
 * - Unknown enclaves/OSIDs fall back to defaults
 */

import { describe, it, expect } from 'vitest';
import { getEnclaveMaxPersonnel, getEnclaveIdForOsid } from '../src/sim/combat/enclave_resilience.js';
import { ENCLAVE_MAX_PERSONNEL } from '../src/state/formation_constants.js';

describe('getEnclaveMaxPersonnel', () => {
    it('returns per-enclave values for known enclaves', () => {
        expect(getEnclaveMaxPersonnel('gorazde')).toBe(800);
        expect(getEnclaveMaxPersonnel('srebrenica')).toBe(600);
        expect(getEnclaveMaxPersonnel('zepa')).toBe(400);
        expect(getEnclaveMaxPersonnel('bihac_pocket')).toBe(1500);
        expect(getEnclaveMaxPersonnel('sarajevo')).toBe(1500);
    });

    it('returns default ENCLAVE_MAX_PERSONNEL for unknown enclave', () => {
        expect(getEnclaveMaxPersonnel('unknown_enclave')).toBe(ENCLAVE_MAX_PERSONNEL);
        expect(getEnclaveMaxPersonnel('')).toBe(ENCLAVE_MAX_PERSONNEL);
    });
});

describe('getEnclaveIdForOsid', () => {
    it('maps Gorazde OSID correctly', () => {
        expect(getEnclaveIdForOsid('op:gorazde:gorazde_2')).toBe('gorazde');
        expect(getEnclaveIdForOsid('op:gorazde:faocici_2')).toBe('gorazde');
    });

    it('maps Srebrenica OSID correctly', () => {
        expect(getEnclaveIdForOsid('op:srebrenica:srebrenica_2')).toBe('srebrenica');
    });

    it('maps Zepa OSID correctly', () => {
        expect(getEnclaveIdForOsid('op:rogatica:zepa_2')).toBe('zepa');
    });

    it('maps Sarajevo OSID correctly (prefix-based)', () => {
        expect(getEnclaveIdForOsid('op:centar_sarajevo:centar_sarajevo')).toBe('sarajevo');
        expect(getEnclaveIdForOsid('op:novo_sarajevo:anything')).toBe('sarajevo');
    });

    it('maps Bihac pocket OSID correctly (prefix-based)', () => {
        expect(getEnclaveIdForOsid('op:bihac:bihac_2')).toBe('bihac_pocket');
        expect(getEnclaveIdForOsid('op:cazin:cazin_2')).toBe('bihac_pocket');
    });

    it('returns null for non-enclave OSID', () => {
        expect(getEnclaveIdForOsid('op:banja_luka:foo')).toBeNull();
        expect(getEnclaveIdForOsid('')).toBeNull();
        expect(getEnclaveIdForOsid('op:tuzla:tuzla_2')).toBeNull();
    });
});
