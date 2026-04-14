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
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

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

describe('adapter-after-deserialize contract', () => {

    it('parseGameState produces consistent field counts on raw vs round-tripped state', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const rawParsed = JSON.parse(fileContents);

        // Run adapter on raw JSON.parse result
        const adapterFromRaw = parseGameState(rawParsed);

        // Run adapter on deserialized-then-reserialized state (full migration path)
        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));
        const adapterFromRoundTrip = parseGameState(reserialized);

        // Formation counts must match
        expect(adapterFromRoundTrip.formations.length).toBe(adapterFromRaw.formations.length);

        // Turn and phase
        expect(adapterFromRoundTrip.turn).toBe(adapterFromRaw.turn);
        expect(adapterFromRoundTrip.phase).toBe(adapterFromRaw.phase);

        // Settlement control counts
        expect(Object.keys(adapterFromRoundTrip.controlBySettlement).length)
            .toBe(Object.keys(adapterFromRaw.controlBySettlement).length);

        // Corps front sector count
        if (adapterFromRaw.corpsFrontSectors) {
            expect(adapterFromRoundTrip.corpsFrontSectors?.length)
                .toBe(adapterFromRaw.corpsFrontSectors.length);
        }

        // Front edge counts
        if (adapterFromRaw.frontEdgesOsid) {
            expect(adapterFromRoundTrip.frontEdgesOsid?.length)
                .toBe(adapterFromRaw.frontEdgesOsid.length);
        }
    });

    it('adapter formation IDs match between raw and round-tripped state', () => {
        if (!existsSync(REAL_SAVE_PATH)) {
            console.warn(SKIP_REASON);
            return;
        }

        const fileContents = readFileSync(REAL_SAVE_PATH, 'utf8');
        const rawParsed = JSON.parse(fileContents);
        const adapterFromRaw = parseGameState(rawParsed);

        const state = deserializeState(fileContents);
        const reserialized = JSON.parse(serializeState(state));
        const adapterFromRoundTrip = parseGameState(reserialized);

        const rawIds = adapterFromRaw.formations.map(f => f.id).sort();
        const rtIds = adapterFromRoundTrip.formations.map(f => f.id).sort();
        expect(rtIds).toEqual(rawIds);
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
