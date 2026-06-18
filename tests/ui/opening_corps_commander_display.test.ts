import { describe, expect, it } from 'vitest';
import type { LoadedGameState, NamedOfficerView } from '../../src/ui/map/data/types.js';
import { resolveCorpsCommanderDisplay } from '../../src/ui/map/utils/officerUtils.js';

function officer(overrides: Partial<NamedOfficerView> & { id: string; name: string }): NamedOfficerView {
    return {
        id: overrides.id,
        name: overrides.name,
        faction: overrides.faction ?? 'RS',
        rank: overrides.rank ?? 'corps_commander',
        competence: overrides.competence ?? 3,
        aggressiveness: overrides.aggressiveness ?? 3,
        defensive_skill: overrides.defensive_skill ?? 3,
        political_reliability: overrides.political_reliability ?? 3,
        home_corps_id: overrides.home_corps_id,
        compatible_corps_ids: overrides.compatible_corps_ids,
        available_from_turn: overrides.available_from_turn ?? 0,
        available_until_turn: overrides.available_until_turn,
        is_historical_start: overrides.is_historical_start,
        historical_corps_id: overrides.historical_corps_id,
        pool_tier: overrides.pool_tier,
        origin: overrides.origin ?? 'military',
        status: overrides.status ?? 'reserve',
        assigned_corps_id: overrides.assigned_corps_id ?? null,
        acting_commander: overrides.acting_commander ?? false,
        turns_in_command: overrides.turns_in_command ?? 0,
        battles: overrides.battles ?? 0,
        victories: overrides.victories ?? 0,
    };
}

function state(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'Turn 0',
        turn: 0,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        ...overrides,
    } as LoadedGameState;
}

describe('opening corps commander display', () => {
    it('prefers the real active corps commander over any opening fallback', () => {
        const gameState = state({
            namedOfficerData: [
                officer({ id: 'reserve', name: 'Reserve Officer', home_corps_id: 'vrs_drina', pool_tier: 'tier_a' }),
                officer({ id: 'active', name: 'Active Commander', status: 'active', assigned_corps_id: 'vrs_drina' }),
            ],
            namedOfficerStateById: {
                active: {
                    officer_id: 'active',
                    status: 'active',
                    assigned_corps_id: 'vrs_drina',
                    acting_commander: false,
                    turns_in_command: 0,
                    battles: 0,
                    victories: 0,
                },
            },
        });

        expect(resolveCorpsCommanderDisplay('vrs_drina', 'RS', gameState)).toEqual({
            name: 'Active Commander',
            acting: false,
            source: 'active',
        });
    });

    it('shows a turn-safe opening officer without activating him in sim state', () => {
        const gameState = state({
            namedOfficerData: [
                officer({
                    id: 'vrs_zivanovic',
                    name: 'Milenko Zivanovic',
                    home_corps_id: 'vrs_drina',
                    available_from_turn: 28,
                    is_historical_start: true,
                    historical_corps_id: 'vrs_drina',
                    pool_tier: 'starter',
                }),
                officer({ id: 'vrs_andric', name: 'Svetozar Andric', home_corps_id: 'vrs_drina', pool_tier: 'tier_b', competence: 4 }),
            ],
            namedOfficerStateById: {
                vrs_andric: {
                    officer_id: 'vrs_andric',
                    status: 'reserve',
                    assigned_corps_id: null,
                    acting_commander: false,
                    turns_in_command: 0,
                    battles: 0,
                    victories: 0,
                },
            },
        });

        expect(resolveCorpsCommanderDisplay('vrs_drina', 'RS', gameState)).toEqual({
            name: 'Svetozar Andric',
            acting: true,
            source: 'opening_read_model',
        });
        expect(gameState.namedOfficerStateById?.vrs_andric?.assigned_corps_id).toBeNull();
    });

    it('does not use broad compatibility or non-corps ranks for opening command labels', () => {
        const gameState = state({
            namedOfficerData: [
                officer({
                    id: 'compatible_only',
                    name: 'Compatible Only',
                    compatible_corps_ids: ['vrs_drina'],
                    pool_tier: 'starter',
                    competence: 5,
                }),
                officer({
                    id: 'deputy_home',
                    name: 'Home Deputy',
                    rank: 'deputy',
                    home_corps_id: 'vrs_drina',
                    pool_tier: 'starter',
                    competence: 5,
                }),
                officer({
                    id: 'home_corps',
                    name: 'Home Corps Commander',
                    home_corps_id: 'vrs_drina',
                    pool_tier: 'tier_b',
                    competence: 3,
                }),
            ],
        });

        expect(resolveCorpsCommanderDisplay('vrs_drina', 'RS', gameState)).toEqual({
            name: 'Home Corps Commander',
            acting: true,
            source: 'opening_read_model',
        });
    });

    it('uses a command-staff label for synthetic JNA command formations', () => {
        expect(resolveCorpsCommanderDisplay('jna_herzegovina_command', 'RS', state())).toEqual({
            name: 'JNA forward command staff',
            acting: false,
            source: 'synthetic',
        });
    });

    it('shows opening ARBiH corps command without assigning the officers', () => {
        const gameState = state({
            namedOfficerData: [
                officer({
                    id: 'arbih_hadzihasanovic',
                    name: 'Enver Hadzihasanovic',
                    faction: 'RBiH',
                    home_corps_id: 'arbih_3rd_corps',
                    available_from_turn: 22,
                    is_historical_start: true,
                    historical_corps_id: 'arbih_3rd_corps',
                    pool_tier: 'starter',
                    competence: 5,
                }),
                officer({
                    id: 'arbih_cikotic',
                    name: 'Selmo Cikotic',
                    faction: 'RBiH',
                    home_corps_id: 'arbih_3rd_corps',
                    pool_tier: 'tier_b',
                    competence: 4,
                }),
                officer({
                    id: 'arbih_hujdur',
                    name: 'Midhad Hujdur',
                    faction: 'RBiH',
                    home_corps_id: 'arbih_4th_corps',
                    pool_tier: 'tier_b',
                    competence: 4,
                    defensive_skill: 4,
                }),
            ],
            namedOfficerStateById: {
                arbih_cikotic: {
                    officer_id: 'arbih_cikotic',
                    status: 'reserve',
                    assigned_corps_id: null,
                    acting_commander: false,
                    turns_in_command: 0,
                    battles: 0,
                    victories: 0,
                },
                arbih_hujdur: {
                    officer_id: 'arbih_hujdur',
                    status: 'reserve',
                    assigned_corps_id: null,
                    acting_commander: false,
                    turns_in_command: 0,
                    battles: 0,
                    victories: 0,
                },
            },
        });

        expect(resolveCorpsCommanderDisplay('arbih_3rd_corps', 'RBiH', gameState)).toEqual({
            name: 'Selmo Cikotic',
            acting: true,
            source: 'opening_read_model',
        });
        expect(resolveCorpsCommanderDisplay('arbih_4th_corps', 'RBiH', gameState)).toEqual({
            name: 'Midhad Hujdur',
            acting: true,
            source: 'opening_read_model',
        });
        expect(gameState.namedOfficerStateById?.arbih_cikotic?.assigned_corps_id).toBeNull();
        expect(gameState.namedOfficerStateById?.arbih_hujdur?.assigned_corps_id).toBeNull();
    });
});
