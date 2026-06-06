/**
 * Real-save adapter-after-deserialize contract tests.
 *
 * These assertions cover the UI GameStateAdapter (`parseGameState`) reading
 * raw vs round-tripped real state. They are split out of
 * `save_load_real_roundtrip.test.ts` so that the headless serialize/deserialize
 * round-trip proof there does NOT transitively import the UI adapter (and its
 * react-dependent i18n module). Keeping this UI-coupled block in its own file
 * means a missing UI dependency only affects this adapter contract, not the
 * core save/load determinism proof.
 *
 * Behavior is identical to the previously-bundled `adapter-after-deserialize
 * contract` describe block — assertions are moved verbatim, not changed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

const REAL_SAVE_PATH = join(process.cwd(), 'data', 'derived', 'latest_run_final_save.json');

const SKIP_REASON = 'Real save file not found — run a scenario first (npm run sim:scenario:run:40w)';

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

    it('formation field values spot-check: sample brigade and corps survive roundtrip identically', () => {
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

        // Spot-check: first brigade and first corps only. This is NOT exhaustive —
        // it proves the roundtrip path works for sampled formations, not all of them.
        const rawBrigade = adapterFromRaw.formations.find(f => f.kind === 'brigade');
        const rawCorps = adapterFromRaw.formations.find(f => f.kind === 'corps' || f.kind === 'corps_asset');

        expect(rawBrigade).toBeDefined();
        expect(rawCorps).toBeDefined();

        if (rawBrigade) {
            const rtBrigade = adapterFromRoundTrip.formations.find(f => f.id === rawBrigade.id);
            expect(rtBrigade).toBeDefined();
            if (rtBrigade) {
                expect(rtBrigade.readiness).toBe(rawBrigade.readiness);
                expect(rtBrigade.cohesion).toBe(rawBrigade.cohesion);
                expect(rtBrigade.morale).toBe(rawBrigade.morale);
                expect(rtBrigade.kind).toBe(rawBrigade.kind);
                expect(rtBrigade.faction).toBe(rawBrigade.faction);
                expect(rtBrigade.personnel).toBe(rawBrigade.personnel);
            }
        }

        if (rawCorps) {
            const rtCorps = adapterFromRoundTrip.formations.find(f => f.id === rawCorps.id);
            expect(rtCorps).toBeDefined();
            if (rtCorps) {
                expect(rtCorps.readiness).toBe(rawCorps.readiness);
                expect(rtCorps.cohesion).toBe(rawCorps.cohesion);
                expect(rtCorps.kind).toBe(rawCorps.kind);
                expect(rtCorps.faction).toBe(rawCorps.faction);
            }
        }
    });

    it('corps command field values spot-check: sample corps stance and exhaustion survive roundtrip', () => {
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

        // Spot-check: first corps with a stance set. One sample, not exhaustive.
        const rawCorpsWithStance = adapterFromRaw.formations.find(
            f => (f.kind === 'corps' || f.kind === 'corps_asset') && f.corpsStance !== undefined,
        );

        expect(rawCorpsWithStance).toBeDefined();

        if (rawCorpsWithStance) {
            const rtCorps = adapterFromRoundTrip.formations.find(f => f.id === rawCorpsWithStance.id);
            expect(rtCorps).toBeDefined();
            if (rtCorps) {
                expect(rtCorps.corpsStance).toBe(rawCorpsWithStance.corpsStance);
                expect(rtCorps.corpsExhaustion).toBe(rawCorpsWithStance.corpsExhaustion);
            }
        }
    });

    /**
     * RECOMPUTED FIELDS — NOT parity-owned across roundtrip.
     *
     * The following fields on FormationView are intentionally DERIVED fresh
     * on every adapter parse. They are NOT expected to be byte-identical across
     * raw vs round-tripped state because they are computed from other state:
     *
     * - commandStrain          (computeCorpsCommandStrain — derived from active ops, exhaustion)
     * - projectedStrainNextTurn (projectStrainDecay — derived from commandStrain)
     * - recoveryForecast       (deriveRecoveryForecast — derived from strain state)
     * - situationAssessment    (deriveCorpsSituationAssessment — derived from stance, exhaustion, strain)
     * - homeDistanceMult       (computed inline from homeHops + equipment_class)
     * - readinessTrend          (deriveReadinessTrend — derived from corps command state)
     *
     * These recomputed fields may vary between raw and round-tripped state
     * if the underlying data they derive from has been migrated/normalized
     * during deserialization. This is intentional: the adapter always shows
     * the freshest derivation of the current state.
     */
    it('documents intentionally recomputed fields (not parity-owned)', () => {
        // This test exists as living documentation. The fields listed above
        // are recomputed on every parseGameState call. Any test asserting
        // exact parity for these fields would be incorrect.
        const RECOMPUTED_FIELDS = [
            'commandStrain',
            'projectedStrainNextTurn',
            'recoveryForecast',
            'situationAssessment',
            'homeDistanceMult',
            'readinessTrend',
        ];
        expect(RECOMPUTED_FIELDS.length).toBe(6);
    });
});
