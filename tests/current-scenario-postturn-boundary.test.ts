import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameState } from '../src/state/game_state.js';

type PublicTurnCapture = {
    state: GameState;
    status: 'success';
};

const capture = vi.hoisted(() => ({
    publicTurns: [] as PublicTurnCapture[],
    legacyTurns: [] as GameState[],
    observerStates: [] as GameState[],
    repairEntries: [] as Array<{ edgeCount: number; operationalEdgesOnly: boolean }>,
    flipApplications: [] as Array<{
        applied: number;
        targetSid: string | null;
        targetFaction: string | null;
    }>,
    controlMapApplications: 0,
    syntheticPositiveFlip: false,
}));

vi.mock('../src/sim/combat/attack_resolution_osid.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/sim/combat/attack_resolution_osid.js')>();
    return {
        ...real,
        displaceFormationsInEnemyTerritory: (
            ...args: Parameters<typeof real.displaceFormationsInEnemyTerritory>
        ) => {
            if ((new Error().stack ?? '').includes('repairScenarioArtifactState')) {
                capture.repairEntries.push({
                    edgeCount: args[1].length,
                    operationalEdgesOnly: args[1].every((edge) =>
                        edge.a.startsWith('op:') && edge.b.startsWith('op:')),
                });
            }
            return real.displaceFormationsInEnemyTerritory(...args);
        },
    };
});

vi.mock('../src/state/control_flip_proposals.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/state/control_flip_proposals.js')>();
    return {
        ...real,
        computeControlFlipProposals: (
            ...args: Parameters<typeof real.computeControlFlipProposals>
        ) => {
            const computed = real.computeControlFlipProposals(...args);
            if (!capture.syntheticPositiveFlip) return computed;

            const state = args[0];
            const controllers = state.political.political_controllers ?? {};
            const targetSid = Object.keys(controllers)
                .sort()
                .find((sid) => sid.startsWith('op:') && controllers[sid] === 'RS');
            if (!targetSid) throw new Error('positive flip fixture requires an RS-controlled OSID');

            return {
                ...computed,
                proposals: [{
                    edge_id: `${targetSid}__synthetic-fixture`,
                    pressure_value: computed.threshold,
                    side_a: 'RS',
                    side_b: 'RBiH',
                    favored_side: 'RBiH',
                    losing_side: 'RS',
                    targets: [{
                        sid: targetSid,
                        from: 'RS',
                        to: 'RBiH',
                        reason: 'breach_1hop' as const,
                    }],
                }],
            };
        },
        applyControlFlipProposals: (
            ...args: Parameters<typeof real.applyControlFlipProposals>
        ) => {
            const result = real.applyControlFlipProposals(...args);
            const target = args[1].proposals[0]?.targets[0];
            capture.flipApplications.push({
                applied: result.applied,
                targetSid: target?.sid ?? null,
                targetFaction: target?.to ?? null,
            });
            return result;
        },
    };
});

vi.mock('../src/sim/turn_pipeline.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/sim/turn_pipeline.js')>();
    return {
        ...real,
        runTurn: async (...args: Parameters<typeof real.runTurn>) => {
            const result = await real.runTurn(...args);
            if (result.status === 'success') {
                capture.publicTurns.push({
                    state: structuredClone(result.nextState),
                    status: result.status,
                });
            }
            return result;
        },
    };
});

vi.mock('../src/state/turn_pipeline.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/state/turn_pipeline.js')>();
    return {
        ...real,
        runOneTurn: (...args: Parameters<typeof real.runOneTurn>) => {
            const result = real.runOneTurn(...args);
            capture.legacyTurns.push(structuredClone(result.state));
            return result;
        },
    };
});

vi.mock('../src/state/political_control_init.js', async (importOriginal) => {
    const real = await importOriginal<typeof import('../src/state/political_control_init.js')>();
    return {
        ...real,
        applyMunicipalityControllersFromMun1990Only: async (
            ...args: Parameters<typeof real.applyMunicipalityControllersFromMun1990Only>
        ) => {
            capture.controlMapApplications += 1;
            return real.applyMunicipalityControllersFromMun1990Only(...args);
        },
    };
});

import { loadOperationalEdges } from '../src/data/operational_data.js';
import { assertFormationsInFriendlyTerritory } from '../src/sim/combat/assert_formation_territory.js';
import { assertOperationLifecycle } from '../src/sim/combat/assert_operation_lifecycle.js';
import { auditSectorTruth } from '../src/sim/combat/sector_truth_audit.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { serializeState } from '../src/state/serialize.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

const DEFINITIVE_SCENARIO = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_188w.json');
const RETAINED_OUTPUT_ROOT = process.env.AWWV_POSTTURN_GATE_TEST_OUTPUT_ROOT;
const retainedArtifactPaths: Array<{ label: string; path: string }> = [];
let retainedOutputRootInitialized = false;

async function writeRetainedArtifactRegistry(): Promise<void> {
    if (!RETAINED_OUTPUT_ROOT) return;
    await writeFile(
        join(RETAINED_OUTPUT_ROOT, 'ARTIFACT_REGISTRY.json'),
        `${JSON.stringify({
            schema: 'awwv.postturn-gate.artifact-registry.v1',
            paths: retainedArtifactPaths,
        }, null, 2)}\n`,
        'utf8',
    );
}

async function createOwnedArtifactDirectory(label: string, temporaryPrefix: string): Promise<string> {
    if (!RETAINED_OUTPUT_ROOT) return mkdtemp(join(tmpdir(), temporaryPrefix));
    if (!retainedOutputRootInitialized) {
        await mkdir(RETAINED_OUTPUT_ROOT);
        retainedOutputRootInitialized = true;
    }
    const sequence = String(retainedArtifactPaths.length + 1).padStart(2, '0');
    const outputPath = join(RETAINED_OUTPUT_ROOT, `${sequence}-${label}`);
    await mkdir(outputPath);
    retainedArtifactPaths.push({
        label,
        path: outputPath.replaceAll('\\', '/'),
    });
    await writeRetainedArtifactRegistry();
    return outputPath;
}

async function listArtifactFiles(root: string, current = root): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(current, { withFileTypes: true })) {
        const absolute = join(current, entry.name);
        if (entry.isDirectory()) files.push(...await listArtifactFiles(root, absolute));
        else if (entry.isFile()) files.push(absolute.slice(root.length + 1).replaceAll('\\', '/'));
    }
    return files.sort();
}

async function writeRetainedArtifactManifest(): Promise<void> {
    if (!RETAINED_OUTPUT_ROOT || !retainedOutputRootInitialized) return;
    const manifestName = 'ARTIFACT_MANIFEST.json';
    const files = (await listArtifactFiles(RETAINED_OUTPUT_ROOT))
        .filter((path) => path !== manifestName);
    const artifacts = await Promise.all(files.map(async (relativePath) => {
        const bytes = await readFile(join(RETAINED_OUTPUT_ROOT, relativePath));
        return {
            path: relativePath,
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
        };
    }));
    await writeFile(
        join(RETAINED_OUTPUT_ROOT, manifestName),
        `${JSON.stringify({
            schema: 'awwv.postturn-gate.artifact-manifest.v1',
            artifact_count: artifacts.length,
            artifacts,
        }, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
    );
}

async function cleanupTemporaryArtifactDirectory(path: string): Promise<void> {
    if (!RETAINED_OUTPUT_ROOT) await rm(path, { recursive: true, force: true });
}

function resetCapture(): void {
    capture.publicTurns.length = 0;
    capture.legacyTurns.length = 0;
    capture.observerStates.length = 0;
    capture.repairEntries.length = 0;
    capture.flipApplications.length = 0;
    capture.controlMapApplications = 0;
    capture.syntheticPositiveFlip = false;
}

function persistedState(state: GameState): GameState {
    return JSON.parse(serializeState(state)) as GameState;
}

function sectorTruthWithoutDisposableRatings(state: GameState): unknown {
    return Object.fromEntries(
        Object.entries(state.military.corps_front_sectors ?? {})
            .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
            .map(([id, sector]) => {
                const copy = structuredClone(sector) as unknown as Record<string, unknown>;
                delete copy.threat_ratio;
                delete copy.threat_rating;
                return [id, copy];
            }),
    );
}

function formationTopologyForIds(state: GameState, ids: readonly string[]): unknown {
    return Object.fromEntries(ids.map((id) => {
        const formation = state.military.formations[id];
        return [id, formation ? {
            id: formation.id,
            faction: formation.faction,
            kind: formation.kind ?? null,
            status: formation.status,
            readiness: formation.readiness ?? null,
            location_osid: formation.location_osid ?? null,
            assignment: formation.assignment ?? null,
            assigned_sub_segment_id: formation.assigned_sub_segment_id ?? null,
            corps_id: formation.corps_id ?? null,
        } : null];
    }));
}

async function assertValidWarBoundary(state: GameState): Promise<void> {
    const edges = await loadOperationalEdges(process.cwd());
    expect(validateGameStateShape(state)).toMatchObject({ ok: true });
    expect(assertFormationsInFriendlyTerritory(state)).toEqual([]);
    expect(assertOperationLifecycle(state)).toEqual([]);
    expect(auditSectorTruth(
        state,
        Object.values(state.military.corps_front_sectors ?? {}),
        edges,
    )).toMatchObject({ ok: true });
}

async function runObservedScenario(options: {
    scenarioPath: string;
    weeks: number;
    artifactLabel: string;
    positiveFlip?: boolean;
}): Promise<{
    result: Awaited<ReturnType<typeof runScenario>>;
    publicTurns: PublicTurnCapture[];
    legacyTurns: GameState[];
    observers: GameState[];
    weeklySaves: GameState[];
    repairEntries: Array<{ edgeCount: number; operationalEdgesOnly: boolean }>;
    flips: Array<{ applied: number; targetSid: string | null; targetFaction: string | null }>;
    controlMapApplications: number;
    outDir: string;
}> {
    const publicStart = capture.publicTurns.length;
    const legacyStart = capture.legacyTurns.length;
    const observerStart = capture.observerStates.length;
    const repairStart = capture.repairEntries.length;
    const flipStart = capture.flipApplications.length;
    const controlMapStart = capture.controlMapApplications;
    const outDir = await createOwnedArtifactDirectory(options.artifactLabel, 'awwv-postturn-gate-');
    capture.syntheticPositiveFlip = options.positiveFlip === true;

    const result = await runScenario({
        scenarioPath: options.scenarioPath,
        outDirOverride: outDir,
        weeksOverride: options.weeks,
        emitSaveAtWeeks: Array.from({ length: options.weeks }, (_, index) => index + 1),
        postureAllPushAndApplyBreaches: options.positiveFlip === true,
        consoleDiagnostics: false,
        diagnosticTurnBoundaryObserver: ({ state }) => {
            capture.observerStates.push(structuredClone(state));
        },
    });

    const weeklySaves = await Promise.all((result.paths.weekly_saves ?? []).map(async (path) =>
        JSON.parse(await readFile(path, 'utf8')) as GameState));
    return {
        result,
        publicTurns: capture.publicTurns.slice(publicStart),
        legacyTurns: capture.legacyTurns.slice(legacyStart),
        observers: capture.observerStates.slice(observerStart),
        weeklySaves,
        repairEntries: capture.repairEntries.slice(repairStart),
        flips: capture.flipApplications.slice(flipStart),
        controlMapApplications: capture.controlMapApplications - controlMapStart,
        outDir,
    };
}

describe('scenario post-turn repair gate', () => {
    beforeEach(() => {
        resetCapture();
    });

    afterAll(async () => {
        await writeRetainedArtifactManifest();
    });

    it('preserves successful public war boundaries when no scenario control flip applies', async () => {
        const runs: Awaited<ReturnType<typeof runObservedScenario>>[] = [];
        try {
            runs.push(await runObservedScenario({
                scenarioPath: DEFINITIVE_SCENARIO,
                weeks: 2,
                artifactLabel: 'zero-flip-run-a',
            }));
            runs.push(await runObservedScenario({
                scenarioPath: DEFINITIVE_SCENARIO,
                weeks: 2,
                artifactLabel: 'zero-flip-run-b',
            }));

            for (const run of runs) {
                expect(run.publicTurns).toHaveLength(2);
                expect(run.legacyTurns).toHaveLength(0);
                expect(run.observers).toHaveLength(2);
                expect(run.weeklySaves).toHaveLength(2);
                expect(run.flips).toHaveLength(2);
                expect(run.flips.map((entry) => entry.applied)).toEqual([0, 0]);
                expect(run.repairEntries).toEqual([]);

                for (let index = 0; index < 2; index += 1) {
                    const engineState = run.publicTurns[index]!.state;
                    const observedState = run.observers[index]!;
                    const engineFormationIds = Object.keys(engineState.military.formations ?? {}).sort();

                    expect(observedState.political.political_controllers)
                        .toEqual(engineState.political.political_controllers);
                    expect(observedState.military.war_front_edges_osid)
                        .toEqual(engineState.military.war_front_edges_osid);
                    expect(sectorTruthWithoutDisposableRatings(observedState))
                        .toEqual(sectorTruthWithoutDisposableRatings(engineState));
                    expect(formationTopologyForIds(observedState, engineFormationIds))
                        .toEqual(formationTopologyForIds(engineState, engineFormationIds));
                    expect(persistedState(observedState)).toEqual(run.weeklySaves[index]);
                    await assertValidWarBoundary(observedState);
                }
            }

            expect(serializeState(runs[0]!.observers[0]!))
                .toBe(serializeState(runs[1]!.observers[0]!));
            expect(serializeState(runs[0]!.observers[1]!))
                .toBe(serializeState(runs[1]!.observers[1]!));
            expect(runs[0]!.result.final_state_hash).toBe(runs[1]!.result.final_state_hash);
        } finally {
            await Promise.all(runs.map((run) => cleanupTemporaryArtifactDirectory(run.outDir)));
        }
    }, 180_000);

    it('uses real control-flip application and repairs once after an applied scenario flip', async () => {
        let run: Awaited<ReturnType<typeof runObservedScenario>> | undefined;
        try {
            run = await runObservedScenario({
                scenarioPath: DEFINITIVE_SCENARIO,
                weeks: 1,
                artifactLabel: 'positive-flip-run',
                positiveFlip: true,
            });

            expect(run.publicTurns).toHaveLength(1);
            expect(run.flips).toHaveLength(1);
            expect(run.flips[0]).toMatchObject({ applied: 1, targetFaction: 'RBiH' });
            expect(run.repairEntries).toEqual([{ edgeCount: expect.any(Number), operationalEdgesOnly: true }]);
            expect(run.repairEntries[0]!.edgeCount).toBeGreaterThan(0);
            expect(run.observers[0]!.political.political_controllers?.[run.flips[0]!.targetSid!])
                .toBe('RBiH');
            expect(persistedState(run.observers[0]!)).toEqual(run.weeklySaves[0]);
            await assertValidWarBoundary(run.observers[0]!);
        } finally {
            if (run) await cleanupTemporaryArtifactDirectory(run.outDir);
        }
    }, 180_000);

    it('preserves the authentic remaining-peace branch and its repair phase guard', async () => {
        const fixtureRoot = await createOwnedArtifactDirectory(
            'remaining-peace-fixture',
            'awwv-postturn-peace-fixture-',
        );
        const scenarioPath = join(fixtureRoot, 'remaining-peace.json');
        let run: Awaited<ReturnType<typeof runObservedScenario>> | undefined;
        try {
            await writeFile(scenarioPath, JSON.stringify({
                scenario_id: 'remaining_peace_postturn_gate',
                start_lifecycle_phase: 'peace',
                peace_referendum_held_at_start: true,
                peace_referendum_turn: 0,
                peace_war_start_turn: 4,
                peace_war_start_control: 'apr1992',
                weeks: 1,
                init_control: 'apr1992',
                init_control_mode: 'hybrid_1992',
                init_formations_oob: true,
                turns: [],
            }, null, 2), 'utf8');

            run = await runObservedScenario({
                scenarioPath,
                weeks: 1,
                artifactLabel: 'remaining-peace-run',
            });
            expect(run.publicTurns).toHaveLength(0);
            expect(run.legacyTurns).toHaveLength(1);
            expect(run.observers).toHaveLength(1);
            expect(run.legacyTurns[0]!.meta.phase).toBe('peace');
            expect(run.observers[0]!.meta.phase).toBe('peace');
            expect(run.legacyTurns[0]!.meta.turn).toBe(1);
            expect(run.observers[0]!.meta.turn).toBe(1);
            expect(run.controlMapApplications).toBe(0);
            expect(run.repairEntries).toEqual([]);
            expect(serializeState(run.observers[0]!)).toBe(serializeState(run.legacyTurns[0]!));
            expect(persistedState(run.observers[0]!)).toEqual(run.weeklySaves[0]);
            expect(existsSync(run.result.paths.final_save)).toBe(true);
        } finally {
            if (run) await cleanupTemporaryArtifactDirectory(run.outDir);
            await cleanupTemporaryArtifactDirectory(fixtureRoot);
        }
    }, 180_000);
});
