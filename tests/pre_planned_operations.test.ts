import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { deferUnauthorizedHistoricalOperationsForPlayer } from '../src/sim/combat/historical_operation_authorization.js';
import {
    admitAuthoredPrePlannedReinforcements,
    injectPrePlannedOperations,
    injectQueuedOperation,
    _ALL_PRE_PLANNED,
} from '../src/sim/combat/pre_planned_operations.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { getSectorOffensiveApproachOsids } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { collectOpInjectionWarnings } from '../src/sim/combat/operation_validation.js';
import type { OpInjectionWarning } from '../src/sim/combat/operation_validation.js';
import type {
    CorpsCommandState,
    CorpsFrontSector,
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

async function applyAutonomyTransition(state: GameState): Promise<void> {
    const step = warPhases.find((phase) => phase.name === 'apply-autonomy-transition');
    assert.ok(step);
    await step.run({ state, input: {}, report: {} } as any);
}

function makeMinimalState(): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};
    const corpsFrontSectors: Record<string, CorpsFrontSector> = {};

    for (const def of _ALL_PRE_PLANNED) {
        if (!corpsCommand[def.corps]) {
            corpsCommand[def.corps] = {
                command_span: 5,
                subordinate_count: 10,
                og_slots: 0,
                active_ogs: [],
                active_operations: [],
                corps_exhaustion: 0,
                stance: 'balanced',
            };
        }

        if (!corpsFrontSectors[`sector:${def.corps}:0`]) {
            corpsFrontSectors[`sector:${def.corps}:0`] = {
                sector_id: `sector:${def.corps}:0`,
                corps_id: def.corps,
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 1,
                territory_osids: [],
            } as unknown as CorpsFrontSector;
        }

        for (const axisDef of def.axes) {
            for (const brigadeId of axisDef.brigades) {
                if (!formations[brigadeId]) {
                    formations[brigadeId] = {
                        id: brigadeId,
                        name: brigadeId,
                        faction: def.faction,
                        kind: brigadeId.startsWith('jna_') ? 'jna_phantom' : 'brigade',
                        status: 'active',
                        personnel: 1000,
                        corps_id: def.corps,
                        location_osid: axisDef.staging_osid ?? def.staging_osid,
                    } as FormationState;
                    corpsFrontSectors[`sector:${def.corps}:0`]!.assigned_brigade_ids.push(brigadeId);
                }
            }
        }
    }

    const politicalControllers: Record<string, string> = {};
    const enemyFaction: Record<string, string> = { RS: 'RBiH', RBiH: 'RS', HRHB: 'RBiH' };
    for (const def of _ALL_PRE_PLANNED) {
        politicalControllers[def.staging_osid] = def.faction;
        for (const axisDef of def.axes) {
            if (axisDef.staging_osid) politicalControllers[axisDef.staging_osid] = def.faction;
            for (const osid of axisDef.objectives) {
                politicalControllers[osid] = enemyFaction[def.faction] ?? 'RBiH';
            }
        }
    }

    return {
        meta: {
            turn: 0,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }, { id: 'HRHB' as FactionId }] as GameState['factions'],
        military: {
            formations,
            corps_command: corpsCommand,
            corps_front_sectors: corpsFrontSectors,
        } as any,
        political: {
            political_controllers: politicalControllers,
        } as any,
    } as unknown as GameState;
}

describe('pre-planned operations', () => {
    it('defines staggered local ARBiH operations for Visoko-Breza and Maglaj', () => {
        const visoko = _ALL_PRE_PLANNED.find((def) => def.name === 'Visoko–Breza Line Clearing');
        assert.ok(visoko);
        assert.equal(visoko.corps, 'arbih_1st_corps');
        assert.equal(visoko.faction, 'RBiH');
        assert.equal(visoko.available_from, 8);
        assert.equal(visoko.staging_osid, 'op:visoko:visoko_2');
        assert.equal(visoko.min_attack_outcome, 'victory');
        assert.equal(visoko.planning_duration, 8);
        assert.deepEqual(visoko.axes, [
            {
                axis_id: 'visoko_breza_perimeter',
                name: 'Visoko–Breza Perimeter',
                brigades: [
                    'arbih_165th_mountain',
                    'arbih_146th_light',
                    'arbih_164th_mountain',
                    'arbih_guards_brigade',
                ],
                objectives: ['op:visoko:gornja_vratnica_2'],
                staging_osid: 'op:visoko:visoko_2',
            },
        ]);

        const maglaj = _ALL_PRE_PLANNED.find((def) => def.name === 'Maglaj Local Counterattack');
        assert.ok(maglaj);
        assert.equal(maglaj.corps, 'arbih_3rd_corps');
        assert.equal(maglaj.faction, 'RBiH');
        assert.equal(maglaj.available_from, 14);
        assert.equal(maglaj.staging_osid, 'op:maglaj:maglaj_2');
        assert.equal(maglaj.min_attack_outcome, 'victory');
        assert.equal(maglaj.planning_duration, 8);
        assert.deepEqual(maglaj.axes, [
            {
                axis_id: 'maglaj_ozren_perimeter',
                name: 'Maglaj–Ozren Perimeter',
                brigades: [
                    'arbih_327th_vitezka_mountain',
                    'arbih_372nd_vitezka_mountain',
                    'arbih_328th_mountain',
                ],
                objectives: ['op:maglaj:jablanica'],
                staging_osid: 'op:maglaj:maglaj_2',
            },
        ]);
    });

    it('keeps the January 1993 RBiH Višegrad bridgehead outside Operation Višegrad', () => {
        const operation = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Visegrad');
        assert.ok(operation);
        const objectives = operation.axes.flatMap((axis) => axis.objectives);
        assert.equal(objectives.includes('op:visegrad:medjedja_2'), false);
        assert.equal(objectives.includes('op:visegrad:drinsko'), false);
    });

    it('uses a unique live OOB alias for an authored pre-planned participant', () => {
        const state = makeMinimalState();
        const authoredId = 'rs_1st_semberija_light_infantry';
        const authored = state.military.formations![authoredId]!;
        delete state.military.formations![authoredId];
        state.military.formations!.F_RS_0001 = {
            ...authored,
            id: 'F_RS_0001',
            tags: [...(authored.tags ?? []), `oob:${authoredId}`],
        };

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.vrs_east_bosnian!.active_operations[0]!;
        assert.ok(operation.participating_brigades.includes('F_RS_0001'));
        assert.equal(
            (state.military.op_injection_warnings ?? []).some((warning) =>
                warning.op_name === 'Operation Koridor'
                && warning.check === 'brigade_missing'
                && warning.detail.includes(authoredId)),
            false,
        );
    });

    it('does not admit a permanently degraded main-staff elite to a pre-planned operation', () => {
        const state = makeMinimalState();
        const brigade = state.military.formations!.rs_1st_semberija_light_infantry!;
        brigade.corps_id = 'vrs_main_staff';
        brigade.elite_loan_state = {
            on_loan: false,
            loaned_to_corps: null,
            loan_start_turn: null,
            last_recall_turn: null,
            loan_start_personnel: null,
            permanently_degraded: true,
            current_episode_id: null,
        };

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.vrs_east_bosnian!.active_operations[0]!;
        assert.ok(!operation.participating_brigades.includes(brigade.id));
        assert.equal(brigade.elite_loan_state.on_loan, false);
    });

    it('does not admit a cooldown-bound main-staff elite to a pre-planned operation', () => {
        const state = makeMinimalState();
        const brigade = state.military.formations!.rs_1st_semberija_light_infantry!;
        brigade.corps_id = 'vrs_main_staff';
        brigade.elite_loan_state = {
            on_loan: false,
            loaned_to_corps: null,
            loan_start_turn: null,
            last_recall_turn: -1,
            loan_start_personnel: null,
            permanently_degraded: false,
            current_episode_id: null,
        };

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.vrs_east_bosnian!.active_operations[0]!;
        assert.ok(!operation.participating_brigades.includes(brigade.id));
        assert.equal(brigade.elite_loan_state.on_loan, false);
    });

    it('does not admit a main-staff elite already loaned to another corps', () => {
        const state = makeMinimalState();
        const brigade = state.military.formations!.rs_1st_semberija_light_infantry!;
        brigade.corps_id = 'vrs_main_staff';
        brigade.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_drina',
            loan_start_turn: -2,
            last_recall_turn: null,
            loan_start_personnel: 1000,
            permanently_degraded: false,
            current_episode_id: null,
        };

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.vrs_east_bosnian!.active_operations[0]!;
        assert.ok(!operation.participating_brigades.includes(brigade.id));
        assert.equal(brigade.elite_loan_state.loaned_to_corps, 'vrs_drina');
    });

    it('does not double-roster a main-staff elite already loaned to the host corps', () => {
        const state = makeMinimalState();
        const brigade = state.military.formations!.rs_1st_semberija_light_infantry!;
        brigade.corps_id = 'vrs_main_staff';
        brigade.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_east_bosnian',
            loan_start_turn: -2,
            last_recall_turn: null,
            loan_start_personnel: 1000,
            permanently_degraded: false,
            current_episode_id: null,
        };

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.vrs_east_bosnian!.active_operations[0]!;
        assert.ok(!operation.participating_brigades.includes(brigade.id));
        assert.equal(brigade.elite_loan_state.loaned_to_corps, 'vrs_east_bosnian');
        assert.equal(brigade.elite_loan_state.loan_start_turn, -2);
    });

    it('defines the current pre-planned operation catalog', () => {
        assert.equal(_ALL_PRE_PLANNED.length, 23);
        assert.deepEqual(
            _ALL_PRE_PLANNED.map((def) => def.name),
            [
                'Operation Koridor',
                // Second vrs_east_bosnian op. It runs ONLY because the corps has a
                // queued_operations entry: for a headless calibration run
                // injectPrePlannedOperations executes once, at scenario load, so a corps'
                // second op is otherwise skipped by the injectedCorps guard and never
                // reconsidered -- silently, with no validation warning.
                'Operation Majevica',
                'Operation Drina',
                'Operation Podrinje Sweep',
                'Operation Pracha River',
                'Operation Zvezda 94',
                'Operation Visegrad',
                'Operation Prsten',
                'Operation Kijevo',
                'Operation Trnovo',
                'Operation Herzegovina',
                'Operation Foca',
                'Bosanska Krupa Takeover',
                'Operation Prijedor',
                'Operation Corridor',
                'Operation Jajce',
                'Operation Donji Vakuf',
                'Operation Bosanski Novi',
                'Operation Jackal',
                'Visoko–Breza Line Clearing',
                'Operation Circle',
                'Srebrenica–Cerska Link-Up',
                'Maglaj Local Counterattack',
            ],
        );
    });

    it('authors the April Bosanska Krupa takeover as a narrow 2KK operation', () => {
        const operation = _ALL_PRE_PLANNED.find((def) => def.name === 'Bosanska Krupa Takeover');
        assert.ok(operation);
        assert.equal(operation.corps, 'vrs_2nd_krajina');
        assert.equal(operation.faction, 'RS');
        assert.equal(operation.available_from, 0);
        assert.equal(operation.minimum_viable_participants, 1);
        assert.equal(operation.planning_duration, 2);
        assert.equal(operation.staging_osid, 'op:bosanska_krupa:ivanjska_2');
        assert.deepEqual(operation.axes, [{
            axis_id: 'krupa_town',
            name: 'Bosanska Krupa',
            brigades: ['rs_11th_krupa_light_infantry'],
            objectives: ['op:bosanska_krupa:veliki_badic'],
            staging_osid: 'op:bosanska_krupa:ivanjska_2',
        }]);
    });

    it('defines the summer 1992 Srebrenica-Cerska link-up as ordinary combat', () => {
        const operation = _ALL_PRE_PLANNED.find((def) => def.name === 'Srebrenica–Cerska Link-Up');
        assert.ok(operation);
        assert.equal(operation.corps, 'arbih_2nd_corps');
        assert.equal(operation.faction, 'RBiH');
        assert.equal(operation.staging_osid, 'op:vlasenica:cerska_2');
        assert.equal(operation.planning_duration, 14);
        assert.equal(operation.min_attack_outcome, 'victory');
        assert.equal(operation.minimum_viable_participants, 1);
        assert.equal(operation.available_from, 4);
        assert.deepEqual(operation.axes, [
            {
                axis_id: 'srebrenica_cerska_link',
                name: 'Cerska Column',
                brigades: [
                    'arbih_246th_vitezka_mountain',
                    'arbih_1st_cerska',
                    'arbih_1st_kamenica',
                ],
                objectives: [
                    'op:bratunac:pobudje_2',
                    'op:bratunac:jezestica_2',
                ],
                staging_osid: 'op:vlasenica:cerska_2',
            },
            {
                axis_id: 'srebrenica_convergence',
                name: 'Srebrenica Column',
                brigades: [
                    'arbih_280th_east_bosnian_light',
                    'arbih_281st_east_bosnian_light',
                    'arbih_282nd_east_bosnian_light',
                    'arbih_283rd_east_bosnian_light',
                    'arbih_284th_east_bosnian_light',
                ],
                objectives: ['op:bratunac:jezestica_2'],
                staging_osid: 'op:srebrenica:bostahovine_2',
            },
        ]);
    });

    it('lets the link-up claim its assembly area with one viable participant', () => {
        const state = makeMinimalState();
        state.meta.turn = 4;
        const definition = _ALL_PRE_PLANNED.find((def) => def.name === 'Srebrenica–Cerska Link-Up');
        assert.ok(definition);
        const authoredIds = definition.axes.flatMap((axis) => axis.brigades);
        for (const brigadeId of authoredIds) {
            state.military.formations![brigadeId]!.personnel = 100;
        }
        state.military.formations!.arbih_246th_vitezka_mountain!.personnel = 1000;

        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.arbih_2nd_corps!.active_operations
            .find((candidate) => candidate.name === definition.name);
        assert.ok(operation);
        assert.deepEqual([...operation.participating_brigades].sort(), [...authoredIds].sort());
    });

    it('admits an authored mandatory brigade that forms at the staging area during planning', () => {
        const state = makeMinimalState();
        state.meta.turn = 4;
        delete state.military.formations!.arbih_1st_cerska;
        injectPrePlannedOperations(state);

        const operation = state.military.corps_command!.arbih_2nd_corps!.active_operations
            .find((candidate) => candidate.name === 'Srebrenica–Cerska Link-Up');
        assert.ok(operation);
        assert.equal(operation.participating_brigades.includes('arbih_1st_cerska'), false);
        const initialStrengthBeforeAdmission = operation.participating_brigades.reduce(
            (sum, brigadeId) => sum + (state.military.formations?.[brigadeId]?.personnel ?? 0),
            0,
        );

        state.meta.turn = 4;
        state.military.formations!.arbih_1st_cerska = {
            id: 'arbih_1st_cerska', name: '1st Cerska Brigade', faction: 'RBiH',
            corps_id: 'arbih_2nd_corps', kind: 'brigade', status: 'active',
            personnel: 600, cohesion: 48, morale: 50,
            location_osid: 'op:vlasenica:cerska_2',
        } as FormationState;

        assert.equal(admitAuthoredPrePlannedReinforcements(state), 1);
        assert.ok(operation.participating_brigades.includes('arbih_1st_cerska'));
        assert.ok(operation.axes![0]!.assigned_brigades.includes('arbih_1st_cerska'));
        assert.equal(operation.initial_strength, initialStrengthBeforeAdmission + 600);
    });

    it('retains both Bosanski Brod targets in the canonical Corridor east-axis order', () => {
        const corridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Corridor');
        assert.ok(corridor);
        const eastAxis = corridor.axes.find((axis) => axis.axis_id === 'corridor_east');
        assert.ok(eastAxis);

        assert.deepEqual(
            eastAxis.objectives.filter((objective) => objective.startsWith('op:bosanski_brod:')),
            ['op:bosanski_brod:novo_selo_2', 'op:bosanski_brod:brod'],
        );
    });

    it('finishes the 1992 Donji Vakuf sweep at Korenici after Prusac', () => {
        const operation = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Donji Vakuf');
        assert.ok(operation);
        const sweep = operation.axes.find((axis) => axis.axis_id === 'donji_vakuf_sweep');
        assert.ok(sweep);

        assert.deepEqual(
            sweep.objectives.slice(-2),
            ['op:donji_vakuf:prusac_2', 'op:donji_vakuf:korenici'],
        );
        assert.ok(sweep.brigades.includes('rs_22nd_krajina_infantry'));
        assert.ok(sweep.brigades.includes('rs_5th_kozara_light_infantry'));
        assert.ok(sweep.brigades.includes('rs_16th_krajina_motorized'));
    });

    it('uses a full-operation Vlasic axis to clear the isolated Gornje Krcevine pocket', () => {
        const operation = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Donji Vakuf');
        assert.ok(operation);
        const axis = operation.axes.find((candidate) => candidate.axis_id === 'vlasic_pocket');
        assert.ok(axis);

        assert.deepEqual(axis.objectives, ['op:travnik:gornje_krcevine']);
        assert.equal(axis.staging_osid, 'op:travnik:varosluk');
        assert.deepEqual(axis.brigades, [
            'rs_1st_banja_luka_light_infantry',
            'rs_43rd_prijedor_motorized',
        ]);
    });

    it('does not spend the 1992 Podrinje Sweep on the January Srebrenica high-water cell at Obadi', () => {
        const sweep = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Podrinje Sweep');
        assert.ok(sweep);
        const enclaveAxis = sweep.axes.find((axis) => axis.axis_id === 'srebrenica_ring');
        assert.ok(enclaveAxis);

        assert.ok(!enclaveAxis.objectives.includes('op:srebrenica:obadi'));
    });

    it('injects one active operation per corps and preserves current queue chains', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        assert.equal(state.military.corps_command?.vrs_herzegovina?.active_operations[0]?.name, 'Operation Visegrad');
        assert.deepEqual(state.military.corps_command?.vrs_herzegovina?.queued_operations, ['Operation Foca']);

        assert.equal(state.military.corps_command?.vrs_1st_krajina?.active_operations[0]?.name, 'Operation Prijedor');
        assert.deepEqual(
            state.military.corps_command?.vrs_1st_krajina?.queued_operations,
            ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi'],
        );

        assert.equal(
            state.military.corps_command?.vrs_2nd_krajina?.active_operations[0]?.name,
            'Bosanska Krupa Takeover',
        );
        assert.equal(
            state.military.corps_command?.vrs_2nd_krajina?.active_operations[0]?.minimum_viable_participants,
            1,
        );

        assert.equal(state.military.corps_command?.vrs_drina?.active_operations[0]?.name, 'Operation Drina');
        assert.deepEqual(state.military.corps_command?.vrs_drina?.queued_operations, ['Operation Podrinje Sweep', 'Operation Pracha River', 'Operation Zvezda 94']);

        assert.equal(state.military.corps_command?.hvo_southeast_herzegovina?.queued_operations?.[0], 'Operation Jackal');
    });

    it('requires player authorization before injecting player-faction pre-planned operations', () => {
        const state = makeMinimalState();
        state.meta.player_faction = 'RS' as FactionId;

        injectPrePlannedOperations(state);

        assert.equal(state.military.corps_command?.vrs_drina?.active_operations.length, 0);
        const review = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
        );
        assert.ok(review);
        assert.equal(review.faction, 'RS');
        assert.equal(review.domain, 'ops');
        assert.ok(
            state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Visegrad'
            ),
            'the live Herzegovina operation should require authorization'
        );
        assert.ok(
            !state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Foca'
            ),
            'later same-corps operations must not be revealed while the live operation awaits authorization'
        );
        assert.deepEqual(state.military.corps_command?.vrs_herzegovina?.queued_operations, undefined);

        review!.accepted = true;
        review!.resolved_turn = state.meta.turn;

        injectPrePlannedOperations(state);

        assert.equal(state.military.corps_command?.vrs_drina?.active_operations[0]?.name, 'Operation Drina');
    });

    it('retains accepted authorization through temporary corps work and retries without reauthorization', async () => {
        const state = makeMinimalState();
        state.meta.player_faction = 'RS' as FactionId;
        const command = state.military.corps_command!.vrs_drina!;
        command.queued_operations = ['Operation Drina'];
        assert.equal(injectQueuedOperation(state, 'vrs_drina'), false);
        const review = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
        );
        assert.ok(review);
        review.accepted = true;
        review.resolved_turn = state.meta.turn;

        command.active_operations = [{
            name: 'Temporary Corps Task',
            type: 'sector_attack',
            phase: 'planning',
            is_pre_planned: true,
        } as any];
        state.meta.turn += 1;
        assert.equal(injectQueuedOperation(state, 'vrs_drina'), false);
        await applyAutonomyTransition(state);
        assert.equal(
            state.meta.pending_proposal_reviews?.find((proposal) => proposal.id === review.id)?.accepted,
            true,
        );

        command.active_operations = [];
        state.meta.turn += 1;
        assert.equal(injectQueuedOperation(state, 'vrs_drina'), true);
        assert.equal(command.active_operations[0]?.name, 'Operation Drina');

        state.meta.turn += 1;
        await applyAutonomyTransition(state);
        assert.equal(
            state.meta.pending_proposal_reviews?.find((proposal) => proposal.id === review.id)?.accepted,
            true,
            'resolved historical authorization remains a durable no-reprompt record',
        );
    });

    it('retains accepted authorization when a queued operation is permanently moot', async () => {
        const state = makeMinimalState();
        state.meta.player_faction = 'RS' as FactionId;
        const command = state.military.corps_command!.vrs_drina!;
        command.queued_operations = ['Operation Drina'];
        assert.equal(injectQueuedOperation(state, 'vrs_drina'), false);
        const review = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
        );
        assert.ok(review);
        review.accepted = true;
        review.resolved_turn = state.meta.turn;

        const drina = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Drina')!;
        for (const objective of drina.axes.flatMap((axis) => axis.objectives)) {
            state.political.political_controllers![objective] = 'RS';
        }
        state.meta.turn += 1;
        assert.equal(injectQueuedOperation(state, 'vrs_drina'), false);
        assert.equal(command.queued_operations, undefined);

        await applyAutonomyTransition(state);
        assert.equal(
            state.meta.pending_proposal_reviews?.find((proposal) => proposal.id === review.id)?.accepted,
            true,
        );
    });

    it('normalizes baked startup snapshots so selected player operations become authorization reviews', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);
        state.meta.player_faction = 'RS' as FactionId;

        deferUnauthorizedHistoricalOperationsForPlayer(state);

        assert.equal(state.military.corps_command?.vrs_drina?.active_operations.length, 0);
        assert.equal(state.military.corps_command?.vrs_herzegovina?.active_operations.length, 0);
        assert.equal(state.military.corps_command?.vrs_herzegovina?.queued_operations, undefined);
        assert.ok(
            state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
            ),
            'startup Drina operation should be converted into a presidential authorization review'
        );
        assert.ok(
            !state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Foca'
            ),
            'normalization must not expose the future same-corps queued operation'
        );
    });

    it('skips scenario-start completed pre-planned operations and asks the player for the next live operation', () => {
        const state = makeMinimalState();
        state.meta.player_faction = 'RS' as FactionId;
        const visegrad = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Visegrad');
        assert.ok(visegrad);
        for (const objective of visegrad!.axes.flatMap((axis) => axis.objectives)) {
            state.political.political_controllers![objective] = 'RS';
        }

        injectPrePlannedOperations(state);

        const command = state.military.corps_command!.vrs_herzegovina!;
        assert.equal(command.active_operations.some((op) => op.name === 'Operation Visegrad'), false);
        assert.ok(
            state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Foca'
            ),
            'the first live Herzegovina operation should require authorization'
        );
        assert.ok(
            !state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Visegrad'
            ),
            'already-achieved setup operations must not be offered for player authorization'
        );
        assert.ok(
            !(state.military.op_injection_warnings ?? []).some((warning) =>
                warning.op_name === 'Operation Visegrad' && warning.severity === 'error'
            ),
            'already-achieved setup operations must not produce an op_empty injection error'
        );
        assert.ok(
            state.military.preplanned_operations_satisfied_by_start?.some((entry) =>
                entry.corps_id === 'vrs_herzegovina' && entry.operation_name === 'Operation Visegrad'
            ),
            'scenario-start completed operations should be available to later chain triggers without fake AARs'
        );
    });

    it('anchors injected operations to the primary sector of their participating brigades', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operations[0];
        const drina = state.military.corps_command?.vrs_drina?.active_operations[0];
        const prijedor = state.military.corps_command?.vrs_1st_krajina?.active_operations[0];

        assert.equal(koridor?.sector_id, 'sector:vrs_east_bosnian:0');
        assert.equal(drina?.sector_id, 'sector:vrs_drina:0');
        assert.equal(prijedor?.sector_id, 'sector:vrs_1st_krajina:0');
    });

    it('keeps multi-axis structure and phantom participation intact', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const koridor = state.military.corps_command?.vrs_east_bosnian?.active_operations[0];
        assert.ok(koridor?.axes);
        assert.equal(koridor!.axes!.length, 2);
        assert.equal(koridor!.axes![0]!.axis_id, 'brcko_corridor');
        assert.equal(koridor!.axes![1]!.axis_id, 'posavina_flank');
        assert.ok(koridor!.participating_brigades.includes('jna_17th_corps_tg'));

        const prsten = state.military.corps_command?.vrs_sarajevo_romanija?.active_operations[0];
        assert.ok(prsten?.participating_brigades.includes('jna_4th_corps_tg'));
    });

    it('keeps Operation Koridor on an explicit corridor-breaking contract', () => {
        const koridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Koridor');
        assert.ok(koridor);
        assert.equal(koridor!.min_attack_outcome, 'repulsed');
        assert.equal(koridor!.planning_duration, 9);
    });

    it('lists the contested brcko_corridor objectives in stable alphabetical order (n140 dropped op:brcko:brcko)', () => {
        const koridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Koridor');
        assert.ok(koridor);
        const brckoAxis = koridor!.axes.find((axis) => axis.axis_id === 'brcko_corridor');
        assert.ok(brckoAxis, 'brcko_corridor axis must exist');
        // n140 (commit 7ce01a9e) deliberately removed op:brcko:brcko: Brčko-city is RS-held
        // at scenario start, so as a capture objective it was a friendly-skipped no-op.
        // The axis now drives the two contested targets only.
        assert.deepEqual(
            brckoAxis!.objectives,
            ['op:brcko:krepsic', 'op:brcko:skakava_donja'],
            'brcko_corridor must target only the two contested OSIDs (no op:brcko:brcko)',
        );
        assert.ok(
            !brckoAxis!.objectives.includes('op:brcko:brcko'),
            'op:brcko:brcko must remain dropped (RS-held at start, no-op as a capture objective)',
        );
        // Stable alphabetical ordering — ensures deterministic axis-objective iteration
        const sorted = [...brckoAxis!.objectives].sort();
        assert.deepEqual(
            brckoAxis!.objectives,
            sorted,
            'brcko_corridor objectives must remain in stable alphabetical order',
        );
    });

    it('filters already-controlled objectives without dropping viable axes', () => {
        const state = makeMinimalState();
        state.political.political_controllers!['op:zvornik:zvornik'] = 'RS';
        state.political.political_controllers!['op:zvornik:novo_selo'] = 'RS';

        injectPrePlannedOperations(state);

        const drina = state.military.corps_command?.vrs_drina?.active_operations[0];
        const zvornikAxis = drina?.axes?.find((axis) => axis.axis_id === 'zvornik_sweep');
        assert.ok(zvornikAxis);
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:zvornik'));
        assert.ok(!zvornikAxis!.objectives.includes('op:zvornik:novo_selo'));
        assert.ok(zvornikAxis!.objectives.length > 0);
    });

    it('does not emit brigade-missing warnings for deferred operations before available_from', () => {
        const state = makeMinimalState();
        delete state.military.formations['hvo_stola_brigade'];

        injectPrePlannedOperations(state);

        const warnings = state.military.op_injection_warnings ?? [];
        assert.ok(
            !warnings.some((warning) => warning.op_name === 'Operation Jackal'),
            'deferred Operation Jackal warnings should not be emitted before available_from'
        );
    });

    it('skips pre-planned injection entirely when the state has no active brigades', () => {
        const state = makeMinimalState();
        state.military.formations = {};

        injectPrePlannedOperations(state);

        const commands = Object.values(state.military.corps_command ?? {});
        assert.ok(commands.every((cmd) => (cmd.active_operations?.length ?? 0) === 0));
        assert.equal(state.military.op_injection_warnings?.length ?? 0, 0);
    });

    it('still validates queued operations at runtime when brigades are truly missing', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        delete state.military.formations['rs_gacko_brigade'];
        state.military.corps_command!.vrs_herzegovina!.queued_operations = ['Operation Foca'];

        const injected = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(injected, true);
        const warnings = state.military.op_injection_warnings ?? [];
        assert.ok(
            warnings.some((warning) =>
                warning.op_name === 'Operation Foca' &&
                warning.check === 'brigade_missing' &&
                warning.detail.includes('rs_gacko_brigade')
            ),
            'queued Foca injection should still warn about truly missing brigades'
        );
    });

    it('does not let a concurrent probe erase an objective from a queued historical operation', () => {
        const state = makeMinimalState();
        state.meta.turn = 16;
        state.political.political_controllers!['op:derventa:derventa_2'] = 'HRHB';
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [{
            name: 'probe_vrs_1st_krajina_t14',
            type: 'probe',
            phase: 'execution',
            started_turn: 14,
            phase_started_turn: 15,
            participating_brigades: ['rs_5th_kozara_light_infantry'],
            objectives: ['op:derventa:derventa_2'],
            current_objective_index: 0,
            momentum: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
        } as any];
        command.queued_operations = ['Operation Corridor'];

        const firstAttempt = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(firstAttempt, false);
        assert.deepEqual(command.queued_operations, ['Operation Corridor']);
        command.active_operations = [];

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');
        assert.equal(injected, true);
        const corridor = command.active_operations.find((op) => op.name === 'Operation Corridor');
        assert.ok(corridor);
        assert.ok(
            corridor!.axes?.some((axis) => axis.objectives.includes('op:derventa:derventa_2')),
            'a non-capturing probe must not permanently strip Derventa from Operation Corridor',
        );
    });

    it('keeps player-faction queued operations queued until the player authorizes them', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        state.meta.player_faction = 'RS' as FactionId;
        const command = state.military.corps_command!.vrs_herzegovina!;
        command.queued_operations = ['Operation Foca'];

        const first = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(first, false);
        assert.deepEqual(command.queued_operations, ['Operation Foca']);
        const review = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_herzegovina:Operation Foca'
        );
        assert.ok(review);

        review!.accepted = true;
        review!.resolved_turn = state.meta.turn;

        const second = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(second, true);
        assert.equal(command.active_operations[0]?.name, 'Operation Foca');
        assert.deepEqual(command.queued_operations, undefined);
    });

    it('does not bypass queued follow-ons or re-offer completed player pre-planned operations', () => {
        const state = makeMinimalState();
        state.meta.player_faction = 'RS' as FactionId;

        injectPrePlannedOperations(state, undefined, { faction: 'RS' });
        const prijedorReview = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_1st_krajina:Operation Prijedor'
        );
        assert.ok(prijedorReview);
        prijedorReview!.accepted = true;
        prijedorReview!.resolved_turn = state.meta.turn;
        injectPrePlannedOperations(state, undefined, { faction: 'RS' });

        const command = state.military.corps_command!.vrs_1st_krajina!;
        assert.equal(command.active_operations[0]?.name, 'Operation Prijedor');
        assert.deepEqual(command.queued_operations, ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi']);

        command.active_operations = [];
        state.operation_history = [{
            corps_id: 'vrs_1st_krajina',
            operation_name: 'Operation Prijedor',
            ended_turn: 7,
            outcome: 'success',
        } as any];
        state.meta.pending_proposal_reviews = [];

        injectPrePlannedOperations(state, undefined, { faction: 'RS' });

        assert.equal(
            command.active_operations.some((op) => op.name === 'Operation Corridor'),
            false,
            'scenario-start injector must not bypass the queued-operation owner',
        );
        assert.ok(
            !state.meta.pending_proposal_reviews?.some((proposal) =>
                proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_1st_krajina:Operation Prijedor'
            ),
            'completed Prijedor must not be re-offered',
        );

        const queuedAttempt = injectQueuedOperation(state, 'vrs_1st_krajina');
        assert.equal(queuedAttempt, false);
        const corridorReview = state.meta.pending_proposal_reviews?.find((proposal) =>
            proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_1st_krajina:Operation Corridor'
        );
        assert.ok(corridorReview);
        assert.deepEqual(command.queued_operations, ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi']);
    });

    it('keeps a queued operation queued when live operations already claim every objective', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        state.military.corps_command!.vrs_herzegovina!.queued_operations = ['Operation Foca'];
        state.military.corps_command!.vrs_herzegovina!.active_operations = [{
            name: 'Blocking Op',
            type: 'sector_attack',
            phase: 'planning',
            participating_brigades: ['rs_foa_brigade'],
            objectives: [
                'op:foca:patkovina',
                'op:foca:prevrac',
                'op:gorazde:kolovarice',
                'op:cajnice:batotici',
                'op:foca:brusna_2',
                'op:cajnice:miljeno_2',
                'op:gorazde:podkozara_donja_2',
                'op:kalinovik:vlaholje',
                'op:kalinovik:golubici_2',
                'op:kalinovik:sela_2',
            ],
            current_objective_index: 0,
        } as any];

        const injected = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(injected, false);
        assert.deepEqual(state.military.corps_command!.vrs_herzegovina!.queued_operations, ['Operation Foca']);
        assert.equal(
            state.military.corps_command!.vrs_herzegovina!.active_operations.filter((op) => op.name === 'Operation Foca').length,
            0,
        );
    });

    it('does not inject a queued operation when fewer than two viable participants remain', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        state.military.corps_command!.vrs_herzegovina!.queued_operations = ['Operation Foca'];
        state.military.formations['rs_bilea_brigade']!.personnel = 300;
        state.military.formations['rs_gacko_brigade']!.personnel = 300;
        state.military.formations['rs_kalinovik_brigade']!.personnel = 300;
        state.military.formations['rs_ajnie_brigade']!.personnel = 300;
        state.military.formations['rs_visegrad_brigade']!.personnel = 300;
        state.military.formations['jna_kalinovik_to_tg']!.status = 'inactive';

        const injected = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(injected, false);
        assert.deepEqual(state.military.corps_command!.vrs_herzegovina!.queued_operations, ['Operation Foca']);
        assert.ok(
            (state.military.op_injection_warnings ?? []).some((warning) =>
                warning.op_name === 'Operation Foca' &&
                warning.check === 'participants_below_attack_floor'
            ),
            'queued operation should leave a typed non-consuming blocker when viable participants are below launch floor'
        );
        assert.equal(
            state.military.corps_command!.vrs_herzegovina!.active_operations.filter((op) => op.name === 'Operation Foca').length,
            0,
        );
    });

    it('injects Operation Corridor after Operation Prijedor leaves slot 0 and preserves the remaining 1KK queue', () => {
        const state = makeMinimalState();
        state.meta.turn = 10;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi'];

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(injected, true);
        assert.equal(command.active_operations[0]?.name, 'Operation Corridor');
        assert.deepEqual(command.queued_operations, ['Operation Jajce', 'Operation Donji Vakuf', 'Operation Bosanski Novi']);
    });

    it('preserves unrelated transit while injecting the remaining viable operation axes', () => {
        const state = makeMinimalState();
        state.meta.turn = 18;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Jajce'];
        const jajce = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Jajce')!;
        const southBrigade = jajce.axes.find((axis) => axis.axis_id === 'vrbas_south')!.brigades[0]!;
        const transit = {
            status: 'in_transit' as const,
            stance: 'column' as const,
            destination_sids: ['op:test:unrelated'],
            turns_remaining: 4,
        };
        const order = {
            stance: 'column' as const,
            destination_sids: ['op:test:unrelated'],
        };
        state.military.brigade_movement_state = { [southBrigade]: structuredClone(transit) };
        state.military.brigade_movement_orders = { [southBrigade]: structuredClone(order) };

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(injected, true);
        const operation = command.active_operations.find((op) => op.name === 'Operation Jajce');
        assert.ok(operation);
        assert.equal(
            operation!.planning_duration,
            4,
            'an unauthored pre-planned duration must persist the longest-axis march buffer',
        );
        assert.deepEqual(
            [...operation!.participating_brigades].sort(),
            jajce.axes.find((axis) => axis.axis_id === 'vrbas_west')!.brigades,
        );
        assert.deepEqual(state.military.brigade_movement_state?.[southBrigade], transit);
        assert.deepEqual(state.military.brigade_movement_orders?.[southBrigade], order);

        for (const brigadeId of operation!.participating_brigades) {
            state.military.formations[brigadeId]!.location_osid = 'op:test:far_from_jajce';
        }
        state.political.political_controllers!['op:test:far_from_jajce'] = 'RS';
        state.meta.turn = 22;
        advanceSectorOffensives(state, null);
        assert.equal(
            operation!.phase,
            'planning',
            'the persisted four-turn window must prevent former one-turn early invalidation',
        );
    });

    it('reclaims bot-discretionary transit when its queued historical operation injects', () => {
        const state = makeMinimalState();
        state.meta.turn = 18;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Jajce'];
        const jajce = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Jajce')!;
        const southBrigade = jajce.axes.find((axis) => axis.axis_id === 'vrbas_south')!.brigades[0]!;
        state.military.brigade_movement_state = {
            [southBrigade]: {
                status: 'in_transit',
                stance: 'column',
                destination_sids: ['op:test:unrelated'],
                turns_remaining: 4,
                owner: 'bot_discretionary',
            },
        };
        state.military.brigade_movement_orders = {
            [southBrigade]: {
                stance: 'column',
                destination_sids: ['op:test:unrelated'],
                owner: 'bot_discretionary',
            },
        };

        assert.equal(injectQueuedOperation(state, 'vrs_1st_krajina'), true);

        const operation = command.active_operations.find((op) => op.name === 'Operation Jajce');
        assert.ok(operation);
        assert.equal(operation.participating_brigades.includes(southBrigade), true);
        assert.equal(operation.axes?.some((axis) => axis.axis_id === 'vrbas_south'), true);
        assert.equal(state.military.brigade_movement_state?.[southBrigade], undefined);
        assert.equal(state.military.brigade_movement_orders?.[southBrigade], undefined);
    });

    it('does not reclaim bot transit still committed to another active operation', () => {
        const state = makeMinimalState();
        state.meta.turn = 18;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        const jajce = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Jajce')!;
        const southBrigade = jajce.axes.find((axis) => axis.axis_id === 'vrbas_south')!.brigades[0]!;
        const existingOperation: CorpsOperation = {
            name: 'Existing bot operation',
            type: 'probe',
            phase: 'execution',
            started_turn: 17,
            phase_started_turn: 17,
            participating_brigades: [southBrigade],
            objectives: ['op:test:other'],
        };
        command.active_operations = [existingOperation];
        command.queued_operations = ['Operation Jajce'];
        const transit = {
            status: 'in_transit' as const,
            stance: 'column' as const,
            destination_sids: ['op:test:other'],
            turns_remaining: 2,
            owner: 'bot_discretionary' as const,
        };
        state.military.brigade_movement_state = { [southBrigade]: structuredClone(transit) };

        assert.equal(injectQueuedOperation(state, 'vrs_1st_krajina'), true);
        assert.deepEqual(state.military.brigade_movement_state?.[southBrigade], transit);
        assert.equal(
            command.active_operations.find((op) => op.name === 'Operation Jajce')
                ?.participating_brigades.includes(southBrigade),
            false,
        );
    });

    it('does not mutate movement records when queued injection has no uncommitted participants', () => {
        const state = makeMinimalState();
        state.meta.turn = 18;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Jajce'];
        const jajce = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Jajce')!;
        const participantIds = jajce.axes.flatMap((axis) => axis.brigades);
        state.military.brigade_movement_state = Object.fromEntries(participantIds.map((brigadeId) => [brigadeId, {
            status: 'in_transit',
            stance: 'column',
            destination_sids: [`op:test:${brigadeId}`],
            turns_remaining: 4,
        }]));
        state.military.brigade_movement_orders = Object.fromEntries(participantIds.map((brigadeId) => [brigadeId, {
            stance: 'column',
            destination_sids: [`op:test:${brigadeId}`],
        }]));
        const movementBefore = structuredClone(state.military.brigade_movement_state);
        const ordersBefore = structuredClone(state.military.brigade_movement_orders);

        assert.equal(injectQueuedOperation(state, 'vrs_1st_krajina'), false);
        assert.deepEqual(state.military.brigade_movement_state, movementBefore);
        assert.deepEqual(state.military.brigade_movement_orders, ordersBefore);
        assert.deepEqual(command.queued_operations, ['Operation Jajce']);
    });

    it('keeps understrength authored Corridor formations in planning without counting them toward injection viability', () => {
        const state = makeMinimalState();
        state.meta.turn = 10;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Corridor'];
        const forwardIds = new Set(['rs_27th_derventa_motorized', 'rs_16th_krajina_motorized']);
        const corridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Corridor')!;
        for (const brigadeId of corridor.axes.flatMap((axis) => axis.brigades)) {
            const formation = state.military.formations[brigadeId]!;
            formation.personnel = forwardIds.has(brigadeId) ? 1000 : 300;
        }
        state.military.formations['rs_27th_derventa_motorized']!.location_osid = 'op:derventa:cerani_2';
        state.military.formations['rs_16th_krajina_motorized']!.location_osid = 'op:derventa:lug';

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina', new Map());

        assert.equal(injected, true);
        const operation = command.active_operations.find((op) => op.name === 'Operation Corridor');
        assert.ok(operation);
        assert.deepEqual(
            [...operation!.participating_brigades].sort(),
            corridor.axes.flatMap((axis) => axis.brigades).sort(),
        );
    });

    it('gives Operation Corridor eight turns to stage its east-axis brigades', () => {
        const corridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Corridor');

        assert.ok(corridor);
        assert.equal(corridor!.planning_duration, 8);
    });

    it('stages all six Corridor east-axis brigades across the duration-minus-one movement budget', () => {
        const state = makeMinimalState();
        state.meta.turn = 10;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Corridor'];

        const corridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Corridor')!;
        const eastAxis = corridor.axes.find((axis) => axis.axis_id === 'corridor_east')!;
        const staging = eastAxis.staging_osid ?? corridor.staging_osid;
        const route = [
            'op:test:corridor_east_start',
            'op:test:corridor_route_1',
            'op:test:corridor_route_2',
            'op:test:corridor_route_3',
            'op:test:corridor_route_4',
            'op:test:corridor_route_5',
            'op:test:corridor_route_6',
            staging,
        ];
        const adjacency = new Map<string, string[]>();
        for (let i = 0; i < route.length; i++) {
            adjacency.set(route[i]!, [route[i - 1], route[i + 1]].filter((osid): osid is string => osid !== undefined));
            state.political.political_controllers![route[i]!] = 'RS';
        }
        for (const brigadeId of eastAxis.brigades) {
            state.military.formations[brigadeId]!.location_osid = route[0];
        }

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina', adjacency as any);

        assert.equal(injected, true);
        const operation = command.active_operations.find((op) => op.name === 'Operation Corridor');
        assert.ok(operation);
        const injectedEastAxis = operation!.axes?.find((axis) => axis.axis_id === 'corridor_east');
        assert.deepEqual(injectedEastAxis?.assigned_brigades, eastAxis.brigades);
    });

    it('keeps the displaced 31st Brigade eligible for the Donji Vakuf sweep', () => {
        const state = makeMinimalState();
        state.meta.turn = 27;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Donji Vakuf'];

        const donjiVakuf = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Donji Vakuf')!;
        const sweep = donjiVakuf.axes.find((axis) => axis.axis_id === 'donji_vakuf_sweep')!;
        const staging = sweep.staging_osid ?? donjiVakuf.staging_osid;
        const route = [
            'op:test:displaced_31st_start',
            'op:test:displaced_31st_route_1',
            'op:test:displaced_31st_route_2',
            'op:test:displaced_31st_route_3',
            'op:test:displaced_31st_route_4',
            'op:test:displaced_31st_route_5',
            staging,
        ];
        const adjacency = new Map<string, string[]>();
        for (let i = 0; i < route.length; i++) {
            adjacency.set(route[i]!, [route[i - 1], route[i + 1]].filter((osid): osid is string => osid !== undefined));
            state.political.political_controllers![route[i]!] = 'RS';
        }
        state.military.formations.rs_31st_light_infantry!.location_osid = route[0];

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina', adjacency as any);

        assert.equal(injected, true);
        const operation = command.active_operations.find((op) => op.name === 'Operation Donji Vakuf');
        assert.ok(operation);
        const injectedSweep = operation!.axes?.find((axis) => axis.axis_id === 'donji_vakuf_sweep');
        assert.ok(injectedSweep?.assigned_brigades.includes('rs_31st_light_infantry'));
    });

    it('keeps Trnovo kijevo_2 as a friendly approach waypoint after stripping it as a capture objective', () => {
        const state = makeMinimalState();
        state.meta.turn = 69;
        const command = state.military.corps_command!.vrs_sarajevo_romanija!;
        command.active_operations = [];
        command.queued_operations = ['Operation Trnovo'];
        state.political.political_controllers!['op:trnovo:gornja_presjenica'] = 'RS';
        state.political.political_controllers!['op:trnovo:kijevo_2'] = 'RS';
        state.political.political_controllers!['op:trnovo:delijas'] = 'RBiH';
        state.political.political_controllers!['op:trnovo:trnovo'] = 'RBiH';
        const adjacency = new Map([
            ['op:trnovo:gornja_presjenica', ['op:trnovo:kijevo_2', 'op:trnovo:trnovo']],
            ['op:trnovo:kijevo_2', ['op:trnovo:gornja_presjenica', 'op:trnovo:delijas']],
            ['op:trnovo:delijas', ['op:trnovo:kijevo_2']],
            ['op:trnovo:trnovo', ['op:trnovo:gornja_presjenica']],
        ]);

        const injected = injectQueuedOperation(state, 'vrs_sarajevo_romanija', adjacency as any);

        assert.equal(injected, true);
        const trnovo = command.active_operations.find((op) => op.name === 'Operation Trnovo');
        assert.ok(trnovo);
        const eastAxis = trnovo!.axes?.find((axis) => axis.axis_id === 'trnovo_east');
        assert.ok(eastAxis);
        assert.deepEqual(eastAxis!.objectives, ['op:trnovo:delijas']);
        const approaches = getSectorOffensiveApproachOsids(
            state,
            trnovo!,
            'RS' as FactionId,
            adjacency as any,
            new Map(),
            'rs_trnovo_brigade',
        );
        assert.deepEqual([...approaches], ['op:trnovo:kijevo_2']);
    });

    it('records a typed Corridor status when the queued operation is moot because all objectives are already held', () => {
        const state = makeMinimalState();
        state.meta.turn = 10;
        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Corridor', 'Operation Jajce'];
        const corridor = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Corridor');
        assert.ok(corridor);
        for (const objective of corridor!.axes.flatMap((axis) => axis.objectives)) {
            state.political.political_controllers![objective] = 'RS';
        }

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(injected, false);
        assert.deepEqual(command.queued_operations, ['Operation Jajce']);
        assert.ok(
            (state.military.op_injection_warnings ?? []).some((warning) =>
                warning.op_name === 'Operation Corridor' &&
                warning.check === 'all_objectives_owned'
            ),
            'moot Corridor queue skip should leave a typed all_objectives_owned status'
        );
    });

    it('keeps deferred Operation Jackal queued until its available_from turn', () => {
        const state = makeMinimalState();
        const jackal = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Jackal');
        assert.ok(jackal, 'Operation Jackal must exist in the pre-planned catalog');

        state.meta.turn = (jackal!.available_from ?? 8) - 1;
        injectPrePlannedOperations(state);

        const command = state.military.corps_command!.hvo_southeast_herzegovina!;
        assert.equal(command.active_operations.length, 0);
        assert.deepEqual(command.queued_operations ?? [], ['Operation Jackal']);
    });

    it('does not pin queued Operation Foca to a phantom that predictably withdraws before queue time', () => {
        const foca = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Foca');
        assert.ok(foca, 'Operation Foca must exist in the pre-planned catalog');

        const brigades = foca!.axes.flatMap((axis) => axis.brigades);
        assert.ok(!brigades.includes('jna_mostar_garrison_tg'));
    });

    it('preserves authored main effort for queued Operation Foca when Bileca is also viable', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        const command = state.military.corps_command!.vrs_herzegovina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Foca'];

        const injected = injectQueuedOperation(state, 'vrs_herzegovina');

        assert.equal(injected, true);
        const foca = command.active_operations.find((op) => op.name === 'Operation Foca');
        assert.ok(foca);
        const focaValley = foca!.axes?.find((axis) => axis.axis_id === 'foca_valley');
        assert.ok(focaValley);
        assert.deepEqual(focaValley!.assigned_brigades, ['rs_foa_brigade', 'rs_bilea_brigade']);
        assert.equal(focaValley!.main_brigade, 'rs_foa_brigade');
        assert.deepEqual(focaValley!.support_brigades, ['rs_bilea_brigade']);
    });

    it('excludes queued Operation Foca brigades that cannot reach the authored axis staging area', () => {
        const state = makeMinimalState();
        state.meta.turn = 8;
        const command = state.military.corps_command!.vrs_herzegovina!;
        command.active_operations = [];
        command.queued_operations = ['Operation Foca'];
        state.military.formations['rs_foa_brigade']!.location_osid = 'op:foca:patkovina';
        state.military.formations['rs_bilea_brigade']!.location_osid = 'op:nevesinje:zovi_do';
        state.political.political_controllers!['op:foca:patkovina'] = 'RS';
        state.political.political_controllers!['op:foca:foca_3'] = 'RS';
        state.political.political_controllers!['op:nevesinje:zovi_do'] = 'RS';
        for (let hop = 1; hop <= 5; hop++) {
            state.political.political_controllers![`op:test:bileca_route_${hop}`] = 'RS';
        }
        const adjacency = new Map([
            ['op:foca:patkovina', ['op:foca:foca_3']],
            ['op:foca:foca_3', ['op:foca:patkovina', 'op:test:bileca_route_5']],
            ['op:nevesinje:zovi_do', ['op:test:bileca_route_1']],
            ['op:test:bileca_route_1', ['op:nevesinje:zovi_do', 'op:test:bileca_route_2']],
            ['op:test:bileca_route_2', ['op:test:bileca_route_1', 'op:test:bileca_route_3']],
            ['op:test:bileca_route_3', ['op:test:bileca_route_2', 'op:test:bileca_route_4']],
            ['op:test:bileca_route_4', ['op:test:bileca_route_3', 'op:test:bileca_route_5']],
            ['op:test:bileca_route_5', ['op:test:bileca_route_4', 'op:foca:foca_3']],
        ]);

        const injected = injectQueuedOperation(state, 'vrs_herzegovina', adjacency as any);

        assert.equal(injected, true);
        const foca = command.active_operations.find((op) => op.name === 'Operation Foca');
        assert.ok(foca);
        const focaValley = foca!.axes?.find((axis) => axis.axis_id === 'foca_valley');
        assert.ok(focaValley);
        assert.deepEqual(focaValley!.assigned_brigades, ['rs_foa_brigade']);
        assert.equal(focaValley!.main_brigade, 'rs_foa_brigade');
        assert.ok(!foca!.participating_brigades.includes('rs_bilea_brigade'));
    });

    it('preserves brigade-level warning detail when collecting multiple missing brigades on one axis', () => {
        const state = makeMinimalState();
        const warnings: OpInjectionWarning[] = [
            {
                op_name: 'Operation Test',
                axis_id: 'axis_1',
                check: 'brigade_missing',
                detail: 'Brigade "a" not found in formations',
                severity: 'warning',
                turn: 0,
            },
            {
                op_name: 'Operation Test',
                axis_id: 'axis_1',
                check: 'brigade_missing',
                detail: 'Brigade "b" not found in formations',
                severity: 'warning',
                turn: 0,
            },
        ];

        collectOpInjectionWarnings(state, warnings);

        assert.equal(state.military.op_injection_warnings?.length, 2);
    });

    it('defers queued historical work until a live probe releases the objective', () => {
        const state = makeMinimalState();
        state.meta.turn = 19;

        const command = state.military.corps_command!.vrs_1st_krajina!;
        command.active_operations = [{
            id: 'probe_vrs_1st_krajina_t18',
            name: 'probe_vrs_1st_krajina_t18',
            type: 'probe',
            phase: 'execution',
            status: 'active',
            is_pre_planned: false,
            participating_brigades: ['rs_1st_armored'],
            axes: [{
                axis_id: 'probe',
                name: 'Probe',
                staging_osid: 'op:donji_vakuf:komar_2',
                objectives: ['op:donji_vakuf:oborci_2'],
                current_objective_index: 0,
                completed_objectives: [],
            }],
            objectives: ['op:donji_vakuf:oborci_2'],
            turns_elapsed: 0,
        } as any];
        command.queued_operations = ['Operation Donji Vakuf'];

        const firstAttempt = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(firstAttempt, false);
        assert.deepEqual(command.queued_operations, ['Operation Donji Vakuf']);
        command.active_operations = [];

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');
        assert.equal(injected, true);
        const donjiVakuf = command.active_operations.find((op) => op.name === 'Operation Donji Vakuf');
        assert.ok(donjiVakuf);
        const objectives = donjiVakuf!.axes!.flatMap((axis) => axis.objectives);
        assert.ok(objectives.includes('op:donji_vakuf:oborci_2'));
        assert.ok(objectives.includes('op:donji_vakuf:torlakovac_2'));
        assert.ok(
            !(state.military.op_injection_warnings ?? []).some((warning) => warning.check === 'objective_overlap'),
        );
    });

    it('authors the late-July Goražde counteroffensive as three combat axes', () => {
        const circle = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Circle');
        assert.ok(circle);
        assert.equal(circle!.faction, 'RBiH');
        assert.equal(circle!.corps, 'arbih_1st_corps');
        assert.equal(circle!.available_from, 8);
        assert.deepEqual(
            circle!.axes.map((axis) => ({
                id: axis.axis_id,
                staging: axis.staging_osid,
                objectives: axis.objectives,
                brigades: axis.brigades,
            })),
            [
                {
                    id: 'gorazde_perimeter',
                    staging: 'op:gorazde:gorazde_2',
                    objectives: ['op:gorazde:glamoc', 'op:gorazde:kamen', 'op:gorazde:sopotnica'],
                    brigades: ['arbih_801st_light', 'arbih_802nd_light', 'arbih_851st_vitezka_liberation'],
                },
                {
                    id: 'foca_corridor',
                    staging: 'op:gorazde:faocici_2',
                    objectives: ['op:foca:donje_zesce'],
                    brigades: ['arbih_843rd_light', 'arbih_808th_liberation'],
                },
                {
                    id: 'trnovo_corridor',
                    staging: 'op:trnovo:delijas',
                    objectives: ['op:trnovo:tosici'],
                    brigades: ['arbih_102nd_motorized', 'arbih_109th_mountain'],
                },
            ],
        );
    });

    it('authors the ordinary-combat VRS approach seizures around Goražde', () => {
        const prsten = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Prsten');
        const foca = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Foca');
        assert.ok(prsten);
        assert.ok(foca);
        const kijevo = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Kijevo');
        assert.ok(kijevo);
        assert.deepEqual(
            kijevo!.axes.map((axis) => ({ id: axis.axis_id, objectives: axis.objectives })),
            [
                { id: 'kijevo_shoulder', objectives: ['op:trnovo:kijevo_2'] },
                { id: 'praca_approach', objectives: ['op:pale:praca'] },
            ],
        );
        assert.deepEqual(
            foca!.axes
                .filter((axis) => axis.axis_id.startsWith('cajnice_'))
                .map((axis) => ({ id: axis.axis_id, staging: axis.staging_osid, objectives: axis.objectives })),
            [
                {
                    id: 'cajnice_south',
                    staging: 'op:cajnice:cajnice_2',
                    objectives: ['op:cajnice:batotici', 'op:foca:brusna_2', 'op:gorazde:kolovarice'],
                },
            ],
        );
        const drina = _ALL_PRE_PLANNED.find((def) => def.name === 'Operation Drina');
        assert.ok(drina);
        assert.deepEqual(
            drina!.axes.find((axis) => axis.axis_id === 'upper_drina_approaches'),
            {
                axis_id: 'upper_drina_approaches',
                name: 'Upper Drina Approaches',
                brigades: ['rs_visegrad_brigade'],
                objectives: ['op:cajnice:miljeno_2', 'op:gorazde:podkozara_donja_2'],
                staging_osid: 'op:cajnice:zaborak',
            },
        );
    });
});
