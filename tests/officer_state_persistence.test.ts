import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { deserializeState, serializeState } from '../src/state/serialize.js';
import type { NamedOfficer } from '../src/state/officer_types.js';

const STARTUP_SAVE_PATH = join(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json');

function exactOfficer(): NamedOfficer {
    return {
        id: 'test_exact_officer',
        name: 'Exact Officer',
        faction: 'RS',
        rank: 'corps_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 4,
        political_reliability: 4,
        home_corps_id: 'vrs_1st_krajina',
        compatible_corps_ids: ['vrs_1st_krajina'],
        available_from_turn: 0,
        is_historical_start: true,
        historical_corps_id: 'vrs_1st_krajina',
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        bio_short: 'An exactly sourced command biography.',
        command_style: 'Methodical command',
        known_for: 'Exact appointment',
        political_alignment_note: 'Regular command hierarchy.',
    };
}

describe('officer persistence', () => {
    it('preserves sourced identity, faction, corps attribution, and biography through save/load', () => {
        const state = deserializeState(readFileSync(STARTUP_SAVE_PATH, 'utf8'));
        const officer = exactOfficer();
        state.military.named_officer_data = [officer];
        state.military.named_officers = {
            [officer.id]: {
                officer_id: officer.id,
                status: 'active',
                assigned_corps_id: 'vrs_1st_krajina',
                turns_in_command: 4,
                battles: 1,
                victories: 1,
                effective_competence_penalty: 0,
                penalty_turns_remaining: 0,
                acting_commander: false,
            },
        };

        const restored = deserializeState(serializeState(state));

        expect(restored.military.named_officer_data).toHaveLength(1);
        expect(restored.military.named_officer_data?.[0]).toMatchObject(officer);
        expect(restored.military.named_officers?.[officer.id]).toMatchObject({
            assigned_corps_id: 'vrs_1st_krajina',
            status: 'active',
            turns_in_command: 4,
        });
    });
});
