import { describe, it, expect } from 'vitest';
import { applyMigrations, getLatestSchemaVersion } from '../src/state/save_migration.js';

describe('save_migration', () => {
    it('applies pending migrations to old saves', () => {
        const state = {
            schema_version: 0,
            military: {
                enclave_resilience: {
                    sarajevo: { resilience: 20, isolation_turns: 5, hardening_active: false },
                },
            },
        } as any;

        const applied = applyMigrations(state);
        expect(applied).toBeGreaterThan(0);
        expect(state.schema_version).toBe(getLatestSchemaVersion());
        // HRHB enclave entries should be added
        expect(state.military.enclave_resilience.kiseljak).toBeDefined();
        expect(state.military.enclave_resilience.lasva_valley).toBeDefined();
        expect(state.military.enclave_resilience.zepce).toBeDefined();
    });

    it('skips already-applied migrations', () => {
        const state = {
            schema_version: getLatestSchemaVersion(),
            military: {},
        } as any;

        const applied = applyMigrations(state);
        expect(applied).toBe(0);
    });

    it('preserves existing enclave data', () => {
        const state = {
            schema_version: 0,
            military: {
                enclave_resilience: {
                    kiseljak: { resilience: 15, isolation_turns: 3, hardening_active: true },
                },
            },
        } as any;

        applyMigrations(state);
        // Pre-existing kiseljak data should be preserved, not overwritten
        expect(state.military.enclave_resilience.kiseljak.resilience).toBe(15);
        expect(state.military.enclave_resilience.kiseljak.hardening_active).toBe(true);
    });
});
