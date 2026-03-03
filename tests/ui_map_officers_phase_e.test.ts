/**
 * Officers Phase E — map adapter and view types.
 * Asserts parseGameState maps named_officer_data / named_officers and formation.officer_quality.
 */
import { describe, expect, it } from 'vitest';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

function strictCompare(a: string, b: string): number {
    return a === b ? 0 : a < b ? -1 : 1;
}

describe('Officers Phase E — parseGameState officer mapping', () => {
    it('parses officers and formation officer_quality when state has named_officers and named_officer_data', () => {
        const officerId = 'off-rs-1';
        const formationId = 'f-brig-1';
        const state = {
            meta: { turn: 10, phase: 'war' },
            formations: {
                [formationId]: {
                    id: formationId,
                    faction: 'RS',
                    name: 'Test Brigade',
                    kind: 'brigade',
                    readiness: 'active',
                    cohesion: 100,
                    fatigue: 0,
                    status: 'active',
                    created_turn: 0,
                    tags: [],
                    officer_quality: 0.45,
                },
            },
            militia_pools: {},
            political_controllers: {},
            control_events: [],
            brigade_aor: {},
            named_officer_data: [
                {
                    id: officerId,
                    name: 'Test Commander',
                    faction: 'RS',
                    rank: 'corps_commander',
                    competence: 3,
                    aggressiveness: 4,
                    defensive_skill: 3,
                    political_reliability: 4,
                    available_from_turn: 0,
                    origin: 'jna',
                    casualty_vulnerability: 0.1,
                    can_improve: true,
                    improvement_rate: 0.05,
                    pool_tier: 'starter',
                },
            ],
            named_officers: {
                [officerId]: {
                    officer_id: officerId,
                    status: 'active',
                    assigned_corps_id: 'corps-1',
                    turns_in_command: 5,
                    battles: 10,
                    victories: 6,
                    effective_competence_penalty: 0,
                    penalty_turns_remaining: 0,
                    acting_commander: false,
                },
            },
        };

        const result = parseGameState(state);

        expect(result.namedOfficerData).toBeDefined();
        expect(Array.isArray(result.namedOfficerData)).toBe(true);
        expect((result.namedOfficerData ?? []).length).toBeGreaterThanOrEqual(1);
        const sorted = [...(result.namedOfficerData ?? [])].sort((a, b) => strictCompare(a.id, b.id));
        expect(sorted[0].id).toBe(officerId);
        expect(sorted[0].name).toBe('Test Commander');
        expect(sorted[0].faction).toBe('RS');
        expect(sorted[0].rank).toBe('corps_commander');
        expect(sorted[0].status).toBe('active');
        expect(sorted[0].assigned_corps_id).toBe('corps-1');
        expect(sorted[0].acting_commander).toBe(false);
        expect(sorted[0].turns_in_command).toBe(5);
        expect(sorted[0].battles).toBe(10);
        expect(sorted[0].victories).toBe(6);

        expect(result.namedOfficerStateById).toBeDefined();
        expect(result.namedOfficerStateById?.[officerId]).toBeDefined();
        expect(result.namedOfficerStateById?.[officerId].officer_id).toBe(officerId);
        expect(result.namedOfficerStateById?.[officerId].status).toBe('active');
        expect(result.namedOfficerStateById?.[officerId].assigned_corps_id).toBe('corps-1');
        expect(result.namedOfficerStateById?.[officerId].acting_commander).toBe(false);
        expect(result.namedOfficerStateById?.[officerId].turns_in_command).toBe(5);
        expect(result.namedOfficerStateById?.[officerId].battles).toBe(10);
        expect(result.namedOfficerStateById?.[officerId].victories).toBe(6);

        const formation = result.formations.find((f) => f.id === formationId);
        expect(formation).toBeDefined();
        expect(formation?.officer_quality).toBe(0.45);
    });
});
