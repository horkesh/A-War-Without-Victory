import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';
import type { NamedOfficer } from '../src/state/officer_types.js';

describe('officer startup and save persistence', () => {
    let startup: GameState;
    let hydrated: GameState;
    let sourceOfficers: NamedOfficer[];
    let payload: string;

    beforeAll(async () => {
        sourceOfficers = (JSON.parse(readFileSync(
            join(process.cwd(), 'data', 'scenarios', 'officers', 'apr1992_officers.json'),
            'utf8',
        )) as { officers: NamedOfficer[] }).officers;
        startup = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992')).state;
        payload = serializeState(startup);
        hydrated = deserializeState(payload);
    }, 120_000);

    it('loads exactly the retained playable officer identities at campaign birth', () => {
        const sourceIds = sourceOfficers.map((officer) => officer.id).sort();
        const startupIds = (startup.military.named_officer_data ?? []).map((officer) => officer.id).sort();

        expect(startupIds).toEqual(sourceIds);
        expect(new Set(sourceIds).size).toBe(sourceIds.length);
    });

    it('preserves exact faction and corps assignments through canonical save/load', () => {
        const sourceById = new Map(sourceOfficers.map((officer) => [officer.id, officer]));
        for (const officer of hydrated.military.named_officer_data ?? []) {
            const source = sourceById.get(officer.id);
            expect(source, officer.id).toBeDefined();
            expect(officer.faction, `${officer.id}.faction`).toBe(source?.faction);
            expect(officer.home_corps_id ?? null, `${officer.id}.home_corps_id`).toBe(source?.home_corps_id ?? null);
            expect(officer.historical_corps_id ?? null, `${officer.id}.historical_corps_id`).toBe(source?.historical_corps_id ?? null);
            expect(officer.compatible_corps_ids ?? [], `${officer.id}.compatible_corps_ids`)
                .toEqual(source?.compatible_corps_ids ?? []);
        }
        expect(serializeState(hydrated)).toBe(payload);
    });

    it('preserves every authored biography field without inventing absent identities', () => {
        const bioFields = [
            'bio_short',
            'command_style',
            'known_for',
            'political_alignment_note',
            'sensitive_history_note',
        ] as const;
        const hydratedById = new Map((hydrated.military.named_officer_data ?? []).map((officer) => [officer.id, officer]));

        for (const source of sourceOfficers) {
            const restored = hydratedById.get(source.id);
            expect(restored, source.id).toBeDefined();
            for (const field of bioFields) {
                expect(restored?.[field], `${source.id}.${field}`).toBe(source[field]);
            }
        }
        expect(hydratedById.has('hvo_i_nakic')).toBe(true);
        expect(hydratedById.has('hvo_bilonjic')).toBe(true);
        expect(hydratedById.has('hvo_nakic_unreviewed_alias')).toBe(false);
    });
});
