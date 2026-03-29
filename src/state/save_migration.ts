/**
 * Save migration registry — versioned field defaults for old saves.
 *
 * Each migration has a schema version number and a migrate function that patches
 * the state in-place. On load, migrations newer than state.schema_version are
 * applied in ascending version order.
 *
 * Usage:
 *   registerMigration({ version: 2, migrate: (state) => { state.foo ??= defaultFoo; } });
 *   applyMigrations(state);  // called during scenario load / save load
 *
 * Deterministic: migrations applied in sorted version order, no randomness.
 */

import type { GameState } from './game_state.js';

interface SaveMigration {
    /** Schema version this migration brings the state TO. */
    version: number;
    /** Human-readable description for debugging. */
    description: string;
    /** Patch state in-place. Called only when state.schema_version < this.version. */
    migrate: (state: GameState) => void;
}

const migrations: SaveMigration[] = [];

/**
 * Register a save migration. Migrations are sorted by version at apply time.
 * Each milestone adding GameState fields should register one migration here.
 */
export function registerMigration(migration: SaveMigration): void {
    migrations.push(migration);
}

/**
 * Apply all pending migrations to a loaded state.
 * Returns the number of migrations applied.
 */
export function applyMigrations(state: GameState): number {
    const currentVersion = state.schema_version ?? 0;
    const pending = migrations
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version);

    for (const m of pending) {
        m.migrate(state);
        state.schema_version = m.version;
    }

    return pending.length;
}

/**
 * Get the highest registered migration version.
 */
export function getLatestSchemaVersion(): number {
    if (migrations.length === 0) return 0;
    return Math.max(...migrations.map(m => m.version));
}

// ── Migrations ──────────────────────────────────────────────────────────────

// v0.5.0: HRHB enclave resilience fields (kiseljak, lasva_valley, zepce)
registerMigration({
    version: 1,
    description: 'Add HRHB enclave resilience entries if missing',
    migrate: (state) => {
        const er = (state.military as any).enclave_resilience;
        if (er && typeof er === 'object') {
            for (const id of ['kiseljak', 'lasva_valley', 'zepce']) {
                if (!(id in er)) {
                    er[id] = { resilience: 0, isolation_turns: 0, hardening_active: false };
                }
            }
        }
    },
});

// v2: Migrate active_operation (single nullable) → active_operations (array)
registerMigration({
    version: 2,
    description: 'Migrate corps_command active_operation to active_operations array',
    migrate: (state) => {
        const corpsCommand = (state.military as any)?.corps_command;
        if (!corpsCommand || typeof corpsCommand !== 'object') return;
        for (const corpsId of Object.keys(corpsCommand).sort()) {
            const cmd = corpsCommand[corpsId];
            if (!cmd || typeof cmd !== 'object') continue;
            if (!cmd.active_operations) {
                cmd.active_operations = (cmd as any).active_operation
                    ? [(cmd as any).active_operation]
                    : [];
                delete (cmd as any).active_operation;
            }
        }
    },
});
