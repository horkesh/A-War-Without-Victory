import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { deferUnauthorizedHistoricalOperationsForPlayer } from '../src/sim/combat/historical_operation_authorization.js';
import { injectPrePlannedOperations, injectQueuedOperation, _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import { getSectorOffensiveApproachOsids } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { collectOpInjectionWarnings } from '../src/sim/combat/operation_validation.js';
import type { OpInjectionWarning } from '../src/sim/combat/operation_validation.js';
import type {
    CorpsCommandState,
    CorpsFrontSector,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

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
    it('defines the current pre-planned operation catalog', () => {
        assert.equal(_ALL_PRE_PLANNED.length, 16);
        assert.deepEqual(
            _ALL_PRE_PLANNED.map((def) => def.name),
            [
                'Operation Koridor',
                'Operation Drina',
                'Operation Podrinje Sweep',
                'Operation Pracha River',
                'Operation Zvezda 94',
                'Operation Visegrad',
                'Operation Prsten',
                'Operation Trnovo',
                'Operation Herzegovina',
                'Operation Foca',
                'Operation Prijedor',
                'Operation Corridor',
                'Operation Jajce',
                'Operation Donji Vakuf',
                'Operation Bosanski Novi',
                'Operation Jackal',
            ],
        );
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
            ['op:foca:foca_3', ['op:foca:patkovina']],
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

    it('trims queued objectives already claimed by a live probe before overlap validation', () => {
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

        const injected = injectQueuedOperation(state, 'vrs_1st_krajina');

        assert.equal(injected, true);
        const donjiVakuf = command.active_operations.find((op) => op.name === 'Operation Donji Vakuf');
        assert.ok(donjiVakuf);
        const objectives = donjiVakuf!.axes!.flatMap((axis) => axis.objectives);
        assert.ok(!objectives.includes('op:donji_vakuf:oborci_2'));
        assert.ok(objectives.includes('op:donji_vakuf:torlakovac_2'));
        assert.ok(
            !(state.military.op_injection_warnings ?? []).some((warning) => warning.check === 'objective_overlap'),
        );
    });
});
