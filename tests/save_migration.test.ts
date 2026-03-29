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

    it('migrates active_operation to active_operations array', () => {
        const fakeOp = { name: 'Op Corridor', objective_osids: ['op:brcko:brcko_2'] };
        const state = {
            schema_version: 1,
            military: {
                corps_command: {
                    'corps_1ek': {
                        command_span: 5,
                        subordinate_count: 3,
                        og_slots: 2,
                        active_ogs: [],
                        corps_exhaustion: 0,
                        stance: 'balanced',
                        active_operation: fakeOp,
                    },
                    'corps_drk': {
                        command_span: 4,
                        subordinate_count: 2,
                        og_slots: 1,
                        active_ogs: [],
                        corps_exhaustion: 0,
                        stance: 'defensive',
                        active_operation: null,
                    },
                },
            },
        } as any;

        const applied = applyMigrations(state);
        expect(applied).toBeGreaterThan(0);
        expect(state.schema_version).toBe(getLatestSchemaVersion());

        // Corps with an active_operation should have it wrapped in an array
        const ek = state.military.corps_command['corps_1ek'];
        expect(ek.active_operations).toEqual([fakeOp]);
        expect(ek.active_operation).toBeUndefined();

        // Corps with null active_operation should have empty array
        const drk = state.military.corps_command['corps_drk'];
        expect(drk.active_operations).toEqual([]);
        expect(drk.active_operation).toBeUndefined();
    });

    it('preserves existing active_operations array', () => {
        const fakeOp = { name: 'Op Drina', objective_osids: ['op:gorazde:gorazde_2'] };
        const state = {
            schema_version: 1,
            military: {
                corps_command: {
                    'corps_drk': {
                        command_span: 4,
                        subordinate_count: 2,
                        og_slots: 1,
                        active_ogs: [],
                        corps_exhaustion: 0,
                        stance: 'offensive',
                        active_operations: [fakeOp],
                    },
                },
            },
        } as any;

        applyMigrations(state);

        // Should not overwrite existing active_operations
        const drk = state.military.corps_command['corps_drk'];
        expect(drk.active_operations).toEqual([fakeOp]);
    });
});
