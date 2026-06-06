/**
 * Real-save round-trip proof tests.
 *
 * These tests use the actual latest_run_final_save.json (a real 40w+ scenario output)
 * to prove that the serialize/deserialize pipeline is idempotent on production-scale state.
 *
 * Unlike the existing round-trip tests that use minimal hand-built fixtures,
 * these catch field-level regressions that only appear with real state complexity.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

// NOTE: The UI GameStateAdapter (`parseGameState`) adapter-after-deserialize
// contract lives in `save_load_real_roundtrip_adapter.test.ts`. It is split out
// so this headless core round-trip proof does not transitively import the UI
// (react-dependent) module and can collect/run without UI dependencies present.

const REAL_SAVE_PATH = join(process.cwd(), 'data', 'derived', 'latest_run_final_save.json');

const SKIP_REASON = 'Real save file not found — run a scenario first (npm run sim:scenario:run:40w)';

describe('real-save round-trip proof', () => {

    it('serialize(deserialize(file)) round-trip is idempotent', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');

        // First pass: deserialize (with migration) then re-serialize
        const state1 = deserializeState(fileContents);
        const json1 = serializeState(state1);

        // Second pass: deserialize the re-serialized, then serialize again
        const state2 = deserializeState(json1);
        const json2 = serializeState(state2);

        // Idempotency: second round-trip must be byte-identical to first
        expect(json2).toBe(json1);
    });

    it('re-serialized state preserves all top-level keys', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        const originalKeys = Object.keys(original).sort();
        const reserializedKeys = Object.keys(reserialized).sort();
        if ((original.schema_version ?? 0) < 21) {
            originalKeys.push('paramilitary_decision_history');
            originalKeys.sort();
        }

        expect(reserializedKeys).toEqual(originalKeys);
    });

    it('re-serialized state preserves faction count and IDs', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        const origIds = original.factions.map((f: any) => f.id).sort();
        const reserIds = reserialized.factions.map((f: any) => f.id).sort();
        expect(reserIds).toEqual(origIds);
        expect(reserialized.factions.length).toBe(original.factions.length);
    });

    it('re-serialized state preserves formation count', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        const origCount = Object.keys(original.military.formations).length;
        const reserCount = Object.keys(reserialized.military.formations).length;
        expect(reserCount).toBe(origCount);
    });

    it('re-serialized state preserves political_controllers count', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        const origCount = Object.keys(original.political.political_controllers).length;
        const reserCount = Object.keys(reserialized.political.political_controllers).length;
        expect(reserCount).toBe(origCount);
    });

    it('re-serialized state preserves autonomy fields when present', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        // Autonomy level
        expect(reserialized.meta.autonomy_level).toBe(original.meta.autonomy_level);

        // Pending proposal reviews (if any exist)
        if (original.meta.pending_proposal_reviews) {
            expect(reserialized.meta.pending_proposal_reviews.length)
                .toBe(original.meta.pending_proposal_reviews.length);
        }

        // Autonomy overrides
        if (original.meta.autonomy_overrides) {
            expect(reserialized.meta.autonomy_overrides)
                .toEqual(original.meta.autonomy_overrides);
        }
    });

    it('re-serialized state preserves corps command entries', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        if (original.military.corps_command) {
            const origCorps = Object.keys(original.military.corps_command).sort();
            const reserCorps = Object.keys(reserialized.military.corps_command).sort();
            expect(reserCorps).toEqual(origCorps);

            // Spot-check: each corps entry preserves player_op_response if present
            for (const corpsId of origCorps) {
                const origEntry = original.military.corps_command[corpsId];
                const reserEntry = reserialized.military.corps_command[corpsId];
                if (origEntry.player_op_response !== undefined) {
                    expect(reserEntry.player_op_response).toBe(origEntry.player_op_response);
                }
            }
        }
    });

    it('re-serialized state preserves war_exhaustion values', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const original = JSON.parse(fileContents);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));

        if (original.political.war_exhaustion) {
            expect(reserialized.political.war_exhaustion)
                .toEqual(original.political.war_exhaustion);
        }
    });

    it('serializeGameState output is deterministic on the same input', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const state = deserializeState(fileContents);

        const json1 = serializeGameState(state, 2);
        const json2 = serializeGameState(state, 2);

        expect(json2).toBe(json1);
    });
});

describe('save-load hash preservation', () => {

    it('deserialize-then-reserialize preserves content hash', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');

        // Hash the canonical re-serialization (first pass)
        const state1 = deserializeState(fileContents);
        const json1 = serializeState(state1);
        const hash1 = createHash('sha256').update(json1).digest('hex').slice(0, 16);

        // Hash the second pass (load the re-serialized, re-serialize again)
        const state2 = deserializeState(json1);
        const json2 = serializeState(state2);
        const hash2 = createHash('sha256').update(json2).digest('hex').slice(0, 16);

        // Hashes must be identical — proves save/load preserves state identity
        expect(hash2).toBe(hash1);
    });
});
