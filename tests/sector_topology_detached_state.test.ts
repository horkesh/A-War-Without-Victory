/**
 * R5 Phase 2e Task 3 — fidelity characterization of `buildDetachedNarrowReadState`
 * / `buildDetachedWorkingFormations`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 9 Task 3. This is the adapter's own contract test, distinct from
 * `sector_topology_snapshot.test.ts` (which pins the capture step): here we
 * take a captured `SectorTopologySolveInput` and prove the reshaped
 * `SectorTopologyNarrowReadState` it produces reports the SAME values, for
 * every allow-listed field, as the original live `GameState` — i.e. the
 * Map->Record reshape and the `directive_priority_sector_id` un-flattening
 * are lossless, not just type-correct.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { buildDetachedNarrowReadState, buildDetachedWorkingFormations } from '../src/sim/combat/sector_topology_detached_state.js';
import { deserializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasFixture = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

type ContactGraphEdge = { edge_id: string; a: string; b: string; shared_segments?: number; min_dist?: number };

function loadStateRaw(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

describe.skipIf(!hasFixture)('buildDetachedNarrowReadState — fidelity against the source GameState', () => {
    it('meta/political/factions round-trip exactly', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const detached = buildDetachedNarrowReadState(input);

        expect(detached.meta.turn).toBe(state.meta.turn);
        expect(detached.meta.decision_mode).toBe(state.meta.decision_mode);

        const sourcePoliticalControllers = state.political.political_controllers ?? {};
        for (const osid of Object.keys(sourcePoliticalControllers).sort()) {
            expect(detached.political.political_controllers?.[osid]).toBe(sourcePoliticalControllers[osid]);
        }

        const sourceControlEvents = state.political.control_events ?? [];
        expect(detached.political.control_events?.length).toBe(sourceControlEvents.length);
        for (let i = 0; i < sourceControlEvents.length; i++) {
            expect(detached.political.control_events![i]!.settlement_id).toBe(sourceControlEvents[i]!.settlement_id);
            expect(detached.political.control_events![i]!.from).toBe(sourceControlEvents[i]!.from);
            expect(detached.political.control_events![i]!.to).toBe(sourceControlEvents[i]!.to);
        }

        const sourceFactionIds = [...new Set(state.factions.map((f) => f.id))].sort();
        expect((detached.factions ?? []).map((f) => f.id).slice().sort()).toEqual(sourceFactionIds);
    });

    it('corps_command reshape un-flattens directive.priority_sector_id and preserves axis objectives', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const detached = buildDetachedNarrowReadState(input);

        const rawCorpsCommand = state.military.corps_command ?? {};
        let sawDirective = false;
        let sawAxisObjectives = false;
        for (const corpsId of Object.keys(rawCorpsCommand)) {
            const sourceCmd = rawCorpsCommand[corpsId]!;
            const detachedCmd = detached.military.corps_command?.[corpsId];
            expect(detachedCmd).toBeDefined();

            expect(detachedCmd!.directive?.priority_sector_id).toBe(sourceCmd.directive?.priority_sector_id);
            if (sourceCmd.directive?.priority_sector_id !== undefined) sawDirective = true;

            const sourceOps = sourceCmd.active_operations ?? [];
            expect(detachedCmd!.active_operations?.length).toBe(sourceOps.length);
            for (let i = 0; i < sourceOps.length; i++) {
                const sourceOp = sourceOps[i]!;
                const detachedOp = detachedCmd!.active_operations![i]!;
                expect(detachedOp.type).toBe(sourceOp.type);
                expect(detachedOp.phase).toBe(sourceOp.phase);
                expect(detachedOp.sector_id).toBe(sourceOp.sector_id);
                expect(detachedOp.participating_brigades).toEqual(sourceOp.participating_brigades ?? []);

                const sourceAxes = sourceOp.axes ?? [];
                expect(detachedOp.axes?.length ?? 0).toBe(sourceAxes.length);
                for (let a = 0; a < sourceAxes.length; a++) {
                    const sourceAxis = sourceAxes[a]!;
                    const detachedAxis = detachedOp.axes![a]!;
                    expect(detachedAxis.objectives).toEqual(sourceAxis.objectives);
                    if ((sourceAxis.objectives ?? []).length > 0) sawAxisObjectives = true;
                }
            }
        }
        // Positive guard: the source save must actually exercise both paths,
        // or this test would pass vacuously.
        expect(sawDirective).toBe(true);
        expect(sawAxisObjectives).toBe(true);
    });

    it('named_officers / named_officer_data / campaign_plans / brigade_movement / posture orders round-trip', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const detached = buildDetachedNarrowReadState(input);

        const sourceOfficers = state.military.named_officers ?? {};
        for (const id of Object.keys(sourceOfficers)) {
            const source = sourceOfficers[id]!;
            const found = detached.military.named_officers?.[id];
            expect(found).toBeDefined();
            expect(found!.status).toBe(source.status);
            expect(found!.assigned_corps_id).toBe(source.assigned_corps_id);
            expect(found!.effective_competence_penalty).toBe(source.effective_competence_penalty);
        }

        const sourceOfficerData = state.military.named_officer_data ?? [];
        expect(detached.military.named_officer_data?.length).toBe(sourceOfficerData.length);
        for (const source of sourceOfficerData) {
            const found = detached.military.named_officer_data!.find((o) => o.id === source.id);
            expect(found).toBeDefined();
            expect(found!.competence).toBe(source.competence);
            expect(found!.aggressiveness).toBe(source.aggressiveness);
        }

        const sourceCampaignPlans = state.military.campaign_plans ?? {};
        for (const faction of Object.keys(sourceCampaignPlans)) {
            const sourcePlan = sourceCampaignPlans[faction];
            const detachedPlan = detached.military.campaign_plans?.[faction];
            if (!sourcePlan) {
                expect(detachedPlan ?? null).toBeNull();
                continue;
            }
            expect(detachedPlan?.valid_until_turn).toBe(sourcePlan.valid_until_turn);
            expect(detachedPlan?.front_priorities.length).toBe(sourcePlan.front_priorities.length);
        }

        const sourceMovementState = state.military.brigade_movement_state ?? {};
        for (const fid of Object.keys(sourceMovementState)) {
            const source = sourceMovementState[fid]!;
            const found = detached.military.brigade_movement_state?.[fid];
            expect(found).toBeDefined();
            expect(found!.status).toBe(source.status);
        }

        const sourcePostureOrders = state.military.brigade_posture_orders ?? [];
        expect(detached.military.brigade_posture_orders?.length).toBe(sourcePostureOrders.length);
    });

    it('unresolved_sector_brigades round-trips from live state through capture into the detached state (regression: a prior version silently hardcoded undefined here)', () => {
        const state = loadStateRaw();
        const edges = loadEdges();

        // Force a non-empty, non-vacuous synthetic value so this test does
        // not depend on the fixture save happening to have one already —
        // this is exactly the field a prior bug silently dropped, so the
        // guard must not be satisfiable by coincidence.
        const sampleFormationId = Object.keys(state.military.formations ?? {}).sort()[0];
        expect(sampleFormationId, 'fixture must have at least one formation').toBeDefined();
        state.military.unresolved_sector_brigades = [sampleFormationId!, 'op:test:synthetic_unresolved' as never];

        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        // Capture preserves authored order, not resorted.
        expect(input.unresolvedSectorBrigades).toEqual([sampleFormationId, 'op:test:synthetic_unresolved']);

        const detached = buildDetachedNarrowReadState(input);
        expect(detached.military.unresolved_sector_brigades).toEqual([sampleFormationId, 'op:test:synthetic_unresolved']);
    });
});

describe.skipIf(!hasFixture)('buildDetachedWorkingFormations — fidelity and mutability', () => {
    it('every field matches the source formation for a sample', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const working = buildDetachedWorkingFormations(input);

        const sampleId = input.formationIdsSorted[0]!;
        const sourceFormation = state.military.formations![sampleId]!;
        const workingFormation = working[sampleId]!;

        expect(workingFormation.faction).toBe(sourceFormation.faction);
        expect(workingFormation.name).toBe(sourceFormation.name);
        expect(workingFormation.status).toBe(sourceFormation.status);
        expect(workingFormation.location_osid).toBe(sourceFormation.location_osid);
        expect(workingFormation.personnel).toBe(sourceFormation.personnel);
        expect(workingFormation.corps_id).toBe(sourceFormation.corps_id);
        // Regression: a prior version hardcoded this to 0 regardless of the
        // source formation's true value (see the dedicated round-trip test
        // below for why that's wrong — it broke the mutation journal's
        // `before` fidelity, caught on a real 188-week run).
        expect(workingFormation.entrenchment_turns).toBe(sourceFormation.entrenchment_turns);
    });

    it('entrenchment_turns round-trips the TRUE source value, not a hardcoded 0 (regression: a prior version assumed a hardcoded 0 starting point was behavior-inert since the field is write-only within this call graph — true for the sectors output, false for the mutation journal\'s before fidelity, which commitSectorTopologySolve validates against live state)', () => {
        const state = loadStateRaw();
        const edges = loadEdges();

        const sampleFormationId = Object.keys(state.military.formations ?? {}).sort()[0];
        expect(sampleFormationId, 'fixture must have at least one formation').toBeDefined();
        const formation = state.military.formations![sampleFormationId!]!;
        // Force a nonzero, non-vacuous value so this guard is not
        // satisfiable by coincidence if the fixture's sample happens to
        // already be 0.
        formation.entrenchment_turns = 3;

        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        expect(input.formations.get(sampleFormationId as never)!.entrenchment_turns).toBe(3);

        const working = buildDetachedWorkingFormations(input);
        expect(working[sampleFormationId!]!.entrenchment_turns).toBe(3);
    });

    it('is a genuinely mutable projection independent of the source formations map', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const working = buildDetachedWorkingFormations(input);

        const sampleId = input.formationIdsSorted[0]!;
        expect(() => {
            working[sampleId]!.location_osid = 'op:test:mutated_location';
        }).not.toThrow();
        expect(working[sampleId]!.location_osid).toBe('op:test:mutated_location');

        // The snapshot's own captured formation (a frozen Object) must be untouched.
        expect(input.formations.get(sampleId)!.location_osid).not.toBe('op:test:mutated_location');
    });

    it('buildDetachedNarrowReadState threads a supplied workingFormations object through by reference', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, { isFinalPass: true });
        const working = buildDetachedWorkingFormations(input);

        const detached = buildDetachedNarrowReadState(input, working);
        expect(detached.military.formations).toBe(working);
    });
});
