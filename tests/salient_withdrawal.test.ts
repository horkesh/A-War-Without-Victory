import { describe, expect, it } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { updateStrandedBrigadeLifecycle } from '../src/sim/combat/stranded_brigade_lifecycle.js';
import { evacuateFormationsSeveredByCapture } from '../src/sim/combat/salient_withdrawal.js';

function brigade(id: string, location: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active', created_turn: 0,
        personnel: 1500, cohesion: 60, morale: 60, location_osid: location,
        assignment: { kind: 'sector', sector_id: 'sector:rbih:pocket' },
        ...overrides,
    } as FormationState;
}

function stateWith(formations: Record<string, FormationState>): GameState {
    return {
        meta: { turn: 23, phase: 'war', seed: 'salient-withdrawal' },
        factions: [{ id: 'RBiH' }, { id: 'HRHB' }, { id: 'RS' }],
        military: { formations } as any,
        political: {
            war_alliance_rbih_hrhb: 0.75,
            political_controllers: {
                pocket: 'RBiH', corridor: 'HRHB', neck: 'RS', rear: 'RBiH', rear2: 'RBiH',
            },
            last_supply_state_by_osid: {
                pocket: 'critical', corridor: 'adequate', neck: 'adequate', rear: 'adequate', rear2: 'adequate',
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

const adjacency = new Map<string, readonly string[]>([
    ['pocket', ['corridor']],
    ['corridor', ['neck', 'pocket']],
    ['neck', ['corridor', 'rear']],
    ['rear', ['neck', 'rear2']],
    ['rear2', ['rear']],
]);

describe('salient withdrawal on a collapsing neck', () => {
    it('evacuates a non-enclave brigade through an allied corridor to the main line', () => {
        const state = stateWith({ pocket_brigade: brigade('pocket_brigade', 'pocket') });

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual(['pocket_brigade']);
        expect(state.military.formations.pocket_brigade.location_osid).toBe('rear');
        expect(state.military.formations.pocket_brigade.stranded_status).toBe('reconnected');
        expect(state.military.formations.pocket_brigade.personnel).toBe(1500);
    });

    it('does not evacuate a hard-coded enclave brigade', () => {
        const state = stateWith({ enclave: brigade('enclave', 'pocket', { tags: ['enclave'] }) });

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.enclave.location_osid).toBe('pocket');
    });

    it('does not evacuate a brigade committed to an active operation in the pocket', () => {
        const state = stateWith({ committed: brigade('committed', 'pocket') });
        state.military.corps_command = {
            arbih_2nd_corps: {
                corps_id: 'arbih_2nd_corps',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_link', name: 'Pocket Link', corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH', type: 'sector_attack', phase: 'planning',
                    participating_brigades: ['committed'], axes: [], objectives: [],
                } as any],
            } as any,
        };

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.committed.location_osid).toBe('pocket');
    });

    it('does not evacuate a local brigade holding an active operation staging cell', () => {
        const state = stateWith({ local_guard: brigade('local_guard', 'pocket') });
        state.military.corps_command = {
            arbih_2nd_corps: {
                corps_id: 'arbih_2nd_corps',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_link', name: 'Pocket Link', corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH', type: 'sector_attack', phase: 'planning',
                    participating_brigades: ['other'],
                    staging_osid: 'pocket', axes: [], objectives: [],
                } as any],
            } as any,
        };

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.local_guard.location_osid).toBe('pocket');
    });
});

const NOVO_SELO = 'op:bosanski_samac:novo_selo_2';
const GAREVAC = 'op:modrica:garevac_2';
const CENTRAL = 'op:bosanski_samac:central_2';
const ORASJE = 'op:orasje:orasje';
const ORASJE_SECOND = 'op:orasje:donja_mahala';
const ORASJE_THIRD = 'op:orasje:ostra_luka';

const orasjeAdjacency = new Map<string, readonly string[]>([
    [NOVO_SELO, [GAREVAC]],
    [GAREVAC, [NOVO_SELO, 'op:bosanski_samac:central_link']],
    ['op:bosanski_samac:central_link', [GAREVAC, CENTRAL]],
    [CENTRAL, ['op:bosanski_samac:central_link', 'op:bosanski_samac:central_3']],
    ['op:bosanski_samac:central_3', [CENTRAL, 'op:bosanski_samac:central_4']],
    ['op:bosanski_samac:central_4', ['op:bosanski_samac:central_3', 'op:bosanski_samac:central_5']],
    ['op:bosanski_samac:central_5', ['op:bosanski_samac:central_4']],
    [ORASJE, [ORASJE_SECOND]],
    [ORASJE_SECOND, [ORASJE, ORASJE_THIRD]],
    [ORASJE_THIRD, [ORASJE_SECOND]],
    ['op:bosanski_samac:domaljevac_2', []],
]);

function orasjeState(): GameState {
    const formations: Record<string, FormationState> = {
        hrhb_102nd_brigade: brigade('hrhb_102nd_brigade', NOVO_SELO, {
            faction: 'HRHB',
            corps_id: 'hvo_northwest_bosnia',
            personnel: 1800,
            cohesion: 42,
            morale: 45,
            assignment: { kind: 'sector', sector_id: 'sector:hvo_northwest_bosnia:novo_selo' },
        }),
        hrhb_orasje_garrison: brigade('hrhb_orasje_garrison', ORASJE, {
            faction: 'HRHB',
            corps_id: 'hvo_northwest_bosnia',
            assignment: { kind: 'sector', sector_id: 'sector:hvo_northwest_bosnia:orasje' },
        }),
        hrhb_central_anchor: brigade('hrhb_central_anchor', CENTRAL, {
            faction: 'HRHB',
            corps_id: 'hvo_northwest_bosnia',
            assignment: { kind: 'sector', sector_id: 'sector:hvo_northwest_bosnia:central' },
        }),
    };
    const controllers: Record<string, string> = {
        [NOVO_SELO]: 'HRHB',
        [GAREVAC]: 'RS',
        'op:bosanski_samac:central_link': 'RBiH',
        [CENTRAL]: 'HRHB',
        'op:bosanski_samac:central_3': 'HRHB',
        'op:bosanski_samac:central_4': 'HRHB',
        'op:bosanski_samac:central_5': 'HRHB',
        [ORASJE]: 'HRHB',
        [ORASJE_SECOND]: 'HRHB',
        [ORASJE_THIRD]: 'HRHB',
        'op:bosanski_samac:domaljevac_2': 'HRHB',
    };
    const supply: Record<string, string> = {};
    for (const osid of Object.keys(controllers)) supply[osid] = 'adequate';
    return {
        meta: { turn: 23, phase: 'war', seed: 'orasje-evacuation' },
        factions: [{ id: 'RBiH' }, { id: 'HRHB' }, { id: 'RS' }],
        military: {
            formations,
            corps_front_sectors: {
                'sector:hvo_northwest_bosnia:orasje': {
                    sector_id: 'sector:hvo_northwest_bosnia:orasje',
                    corps_id: 'hvo_northwest_bosnia',
                    faction: 'HRHB',
                    assigned_brigade_ids: ['hrhb_orasje_garrison'],
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: [ORASJE, ORASJE_SECOND, ORASJE_THIRD],
                },
                'sector:hvo_northwest_bosnia:novo_selo': {
                    sector_id: 'sector:hvo_northwest_bosnia:novo_selo',
                    corps_id: 'hvo_northwest_bosnia',
                    faction: 'HRHB',
                    assigned_brigade_ids: ['hrhb_102nd_brigade'],
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: [NOVO_SELO],
                },
                'sector:hvo_northwest_bosnia:central': {
                    sector_id: 'sector:hvo_northwest_bosnia:central',
                    corps_id: 'hvo_northwest_bosnia',
                    faction: 'HRHB',
                    assigned_brigade_ids: ['hrhb_central_anchor'],
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: [CENTRAL, 'op:bosanski_samac:central_3', 'op:bosanski_samac:central_4'],
                },
            },
        } as any,
        political: {
            war_alliance_rbih_hrhb: 0.75,
            political_controllers: controllers,
            last_supply_state_by_osid: supply,
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('owner-directed 102nd evacuation from the Odzak pocket', () => {
    it('relocates the 102nd to its own held Orasje pocket instead of the central graph route', () => {
        const state = orasjeState();
        const controllersBefore = JSON.stringify(state.political.political_controllers);
        state.military.brigade_movement_orders = {
            hrhb_102nd_brigade: { destination_sids: ['op:orasje:orasje'], stance: 'column', owner: 'bot_discretionary' },
        } as any;
        state.military.brigade_movement_state = {
            hrhb_102nd_brigade: { status: 'in_transit', destination_sids: ['op:orasje:orasje'], owner: 'bot_discretionary' },
        } as any;

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        const formation = state.military.formations.hrhb_102nd_brigade;
        expect(report.evacuated_formation_ids).toEqual(['hrhb_102nd_brigade']);
        expect(formation.location_osid).toBe(ORASJE);
        expect(formation.location_osid).not.toBe(CENTRAL);
        expect(formation.corps_id).toBe('hvo_northwest_bosnia');
        expect(formation.personnel).toBe(1800);
        expect(formation.cohesion).toBe(42);
        expect(formation.morale).toBe(45);
        expect(formation.assignment).toBeNull();
        expect(formation.stranded_status).toBe('reconnected');
        expect(state.military.brigade_movement_orders?.hrhb_102nd_brigade).toBeUndefined();
        expect(state.military.brigade_movement_state?.hrhb_102nd_brigade).toBeUndefined();
        expect(JSON.stringify(state.political.political_controllers)).toBe(controllersBefore);
    });

    it('keeps the relocated 102nd on the Orasje corps front through the next stranded lifecycle pass', () => {
        const state = orasjeState();
        evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        const firstPass = updateStrandedBrigadeLifecycle(state, orasjeAdjacency);

        const formation = state.military.formations.hrhb_102nd_brigade;
        expect(formation.stranded_status).toBe('none');
        expect(firstPass.newly_stranded.filter(id => id === 'hrhb_102nd_brigade')).toEqual([]);
        expect(firstPass.still_holding.filter(id => id === 'hrhb_102nd_brigade')).toEqual([]);

        state.meta.turn += 1;
        const secondPass = updateStrandedBrigadeLifecycle(state, orasjeAdjacency);

        expect(secondPass.newly_stranded.filter(id => id === 'hrhb_102nd_brigade')).toEqual([]);
        expect(secondPass.still_holding.filter(id => id === 'hrhb_102nd_brigade')).toEqual([]);
        expect(formation.stranded_status).toBe('none');
        expect(formation.location_osid).toBe(ORASJE);
        expect(formation.corps_id).toBe('hvo_northwest_bosnia');
        expect(formation.personnel).toBe(1800);
        expect(formation.cohesion).toBe(42);
    });

    it('leaves an unrelated same-faction brigade on the ordinary central graph route', () => {
        const state = orasjeState();
        state.military.formations.hrhb_103rd_brigade = brigade('hrhb_103rd_brigade', NOVO_SELO, {
            faction: 'HRHB',
            corps_id: 'hvo_northwest_bosnia',
        });

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual(['hrhb_102nd_brigade', 'hrhb_103rd_brigade']);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(ORASJE);
        expect(state.military.formations.hrhb_103rd_brigade.location_osid).toBe(CENTRAL);
    });

    it('does not relocate the 102nd when no authored destination is held and corps-claimed', () => {
        const state = orasjeState();
        const controllers = state.political.political_controllers as Record<string, string>;
        controllers[ORASJE] = 'RS';
        controllers[ORASJE_SECOND] = 'RS';
        controllers[ORASJE_THIRD] = 'RS';
        controllers['op:bosanski_samac:domaljevac_2'] = 'RS';

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('does not relocate the 102nd into a pocket claimed by a different corps sector', () => {
        const state = orasjeState();
        state.military.corps_front_sectors!['sector:hvo_northwest_bosnia:orasje']!.corps_id = 'hvo_herzegovina';

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('does not relocate the 102nd when authored destinations are unowned or unknown', () => {
        const unowned = orasjeState();
        const unownedControllers = unowned.political.political_controllers as unknown as Record<string, string | null>;
        unownedControllers[ORASJE] = null;
        unownedControllers[ORASJE_SECOND] = null;
        unownedControllers[ORASJE_THIRD] = null;
        unownedControllers['op:bosanski_samac:domaljevac_2'] = null;
        const unownedReport = evacuateFormationsSeveredByCapture(unowned, GAREVAC, 'HRHB', orasjeAdjacency);
        expect(unownedReport.evacuated_formation_ids).toEqual([]);
        expect(unowned.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);

        const unknown = orasjeState();
        const unknownControllers = unknown.political.political_controllers as unknown as Record<string, string>;
        delete unknownControllers[ORASJE];
        delete unknownControllers[ORASJE_SECOND];
        delete unknownControllers[ORASJE_THIRD];
        delete unknownControllers['op:bosanski_samac:domaljevac_2'];
        const unknownReport = evacuateFormationsSeveredByCapture(unknown, GAREVAC, 'HRHB', orasjeAdjacency);
        expect(unknownReport.evacuated_formation_ids).toEqual([]);
        expect(unknown.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('does not relocate the 102nd into a sector claimed by its corps but owned by another faction', () => {
        const state = orasjeState();
        for (const sector of Object.values(state.military.corps_front_sectors!)) {
            sector.faction = 'RS';
        }

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('does not relocate the 102nd when an active operation owns it', () => {
        const state = orasjeState();
        state.military.corps_command = {
            hvo_northwest_bosnia: {
                corps_id: 'hvo_northwest_bosnia',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_pocket', name: 'Odzak Pocket', corps_id: 'hvo_northwest_bosnia',
                    faction: 'HRHB', type: 'sector_attack', phase: 'execution',
                    participating_brigades: ['hrhb_102nd_brigade'], axes: [], objectives: [],
                }],
            } as any,
        } as any;

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('does not relocate the 102nd out of an operation staging cell', () => {
        const state = orasjeState();
        state.military.corps_command = {
            hvo_northwest_bosnia: {
                corps_id: 'hvo_northwest_bosnia',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_pocket', name: 'Odzak Pocket', corps_id: 'hvo_northwest_bosnia',
                    faction: 'HRHB', type: 'sector_attack', phase: 'planning',
                    participating_brigades: ['other'], staging_osid: NOVO_SELO, axes: [], objectives: [],
                }],
            } as any,
        } as any;

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('keeps an enclave-tagged 102nd in place', () => {
        const state = orasjeState();
        state.military.formations.hrhb_102nd_brigade.tags = ['enclave'];

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });

    it('keeps the 102nd at Orasje when it already holds the authored pocket', () => {
        const state = orasjeState();
        state.military.formations.hrhb_102nd_brigade.location_osid = ORASJE;

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(ORASJE);
    });

    it('does not stage an authored relocation when no ordinary evacuation would occur', () => {
        const state = orasjeState();
        (state.political.political_controllers as Record<string, string>)['op:bosanski_samac:central_link'] = 'RS';

        const report = evacuateFormationsSeveredByCapture(state, GAREVAC, 'HRHB', orasjeAdjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.hrhb_102nd_brigade.location_osid).toBe(NOVO_SELO);
    });
});
