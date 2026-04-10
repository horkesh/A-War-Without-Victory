import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { deserializeState, serializeState } from '../state/serialize.js';
import { loadScenario } from './scenario_loader.js';
import { buildScenarioStartupState } from './scenario_runner.js';

export type StartupSnapshotKey = 'apr_1992';

interface StartupSnapshotDefinition {
    readonly scenarioRelativePath: string;
    readonly artifactRelativePath: string;
    readonly overrideEnvVar?: string;
}

const STARTUP_SNAPSHOT_DEFINITIONS: Record<StartupSnapshotKey, StartupSnapshotDefinition> = {
    apr_1992: {
        scenarioRelativePath: 'data/scenarios/apr1992_definitive_52w.json',
        artifactRelativePath: 'data/derived/startup/apr_1992_initial_save.json',
        overrideEnvVar: 'AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992',
    },
};

function normalizeStartupSnapshotPayload(payload: string): string {
    return payload.replace(/\r\n/g, '\n');
}

export function getStartupSnapshotDefinition(key: StartupSnapshotKey): StartupSnapshotDefinition {
    return STARTUP_SNAPSHOT_DEFINITIONS[key];
}

export function getStartupSnapshotPath(baseDir: string, key: StartupSnapshotKey): string {
    const definition = getStartupSnapshotDefinition(key);
    const overridePath = definition.overrideEnvVar ? process.env[definition.overrideEnvVar] : undefined;
    return overridePath && overridePath.trim().length > 0
        ? overridePath
        : join(baseDir, definition.artifactRelativePath);
}

export function getStartupSnapshotScenarioPath(baseDir: string, key: StartupSnapshotKey): string {
    return join(baseDir, getStartupSnapshotDefinition(key).scenarioRelativePath);
}

export async function buildStartupSnapshotPayload(baseDir: string, key: StartupSnapshotKey): Promise<string> {
    const scenario = await loadScenario(getStartupSnapshotScenarioPath(baseDir, key));
    const { state } = await buildScenarioStartupState(scenario, baseDir);
    return normalizeStartupSnapshotPayload(serializeState(state));
}

export async function loadStartupSnapshotPayload(baseDir: string, key: StartupSnapshotKey): Promise<string> {
    return normalizeStartupSnapshotPayload(await readFile(getStartupSnapshotPath(baseDir, key), 'utf8'));
}

export async function loadStartupSnapshotState(baseDir: string, key: StartupSnapshotKey) {
    const payload = await loadStartupSnapshotPayload(baseDir, key);
    return deserializeState(payload);
}

export async function writeStartupSnapshot(baseDir: string, key: StartupSnapshotKey): Promise<{ path: string; payload: string }> {
    const path = getStartupSnapshotPath(baseDir, key);
    const payload = await buildStartupSnapshotPayload(baseDir, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, payload, 'utf8');
    return { path, payload };
}

export async function validateStartupSnapshot(baseDir: string, key: StartupSnapshotKey): Promise<{
    path: string;
    actual: string;
    expected: string;
    matches: boolean;
}> {
    const path = getStartupSnapshotPath(baseDir, key);
    const [actual, expected] = await Promise.all([
        loadStartupSnapshotPayload(baseDir, key),
        buildStartupSnapshotPayload(baseDir, key),
    ]);
    return {
        path,
        actual,
        expected,
        matches: actual === expected,
    };
}
