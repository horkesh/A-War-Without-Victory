/**
 * Command loop L7 inertness proof (army clashes).
 *
 * Compares two runs of `tools/ai_play/desktop_calibration_compare.ts` (main vs this branch, same
 * arguments, `--final-save-dir` and `--out` set). For the player and headless saves it deletes the
 * only fields this lane adds (`meta.army_clashes`, `meta.army_clash_history`,
 * `military.army_clash_state`), re-serializes with `serializeState`, hashes with sha256, and
 * compares; it also compares the per-turn player control counts and reports whether the branch
 * carried any clash field at all.
 *
 * Clashes are raised only from desktop IPC (a president staging an order) and answered only
 * there; the simulated player path never calls those handlers, so the stripped saves must be
 * byte-identical and the branch normally carries no clash field.
 *
 * Usage:
 *   npx tsx tools/diagnostics/army_clash_strip_compare.ts \
 *     --base-saves <dir> --base-report <json> --branch-saves <dir> --branch-report <json> [--out <json>]
 * Exit code 0 only when every stripped hash and every per-turn control count match.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serializeState } from '../../src/state/serialize.js';
import type { GameState } from '../../src/state/game_state.js';

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index === -1 ? undefined : process.argv[index + 1];
}

function required(name: string): string {
    const value = arg(name);
    if (!value) throw new Error(`${name} is required`);
    return resolve(value);
}

function loadSave(dir: string, branch: 'player' | 'headless'): GameState {
    return JSON.parse(readFileSync(resolve(dir, branch, 'final_save.json'), 'utf8')) as GameState;
}

function clashFieldsPresent(state: GameState): string[] {
    const present: string[] = [];
    if (state.meta && 'army_clashes' in state.meta) present.push('meta.army_clashes');
    if (state.meta && 'army_clash_history' in state.meta) present.push('meta.army_clash_history');
    if (state.military && 'army_clash_state' in state.military) present.push('military.army_clash_state');
    return present;
}

function strippedHash(state: GameState): string {
    const copy = JSON.parse(JSON.stringify(state)) as GameState & Record<string, any>;
    if (copy.meta) {
        delete (copy.meta as Record<string, unknown>).army_clashes;
        delete (copy.meta as Record<string, unknown>).army_clash_history;
    }
    if (copy.military) delete (copy.military as Record<string, unknown>).army_clash_state;
    return createHash('sha256').update(serializeState(copy)).digest('hex');
}

function playerControlCounts(reportPath: string): Array<{ turn: number; counts: string }> {
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { turns?: Array<Record<string, any>> };
    return (report.turns ?? []).map((row) => ({
        turn: Number(row.turn),
        counts: JSON.stringify(row.player?.control_counts ?? null),
    }));
}

function main(): void {
    const baseDir = required('--base-saves');
    const branchDir = required('--branch-saves');
    const branches = {} as Record<'player' | 'headless', { base: string; branch: string; equal: boolean; branch_clash_fields: string[] }>;
    for (const branch of ['player', 'headless'] as const) {
        const base = loadSave(baseDir, branch);
        const mine = loadSave(branchDir, branch);
        const baseHash = strippedHash(base);
        const branchHash = strippedHash(mine);
        branches[branch] = { base: baseHash, branch: branchHash, equal: baseHash === branchHash, branch_clash_fields: clashFieldsPresent(mine) };
    }

    const baseCounts = playerControlCounts(required('--base-report'));
    const branchCounts = playerControlCounts(required('--branch-report'));
    const mismatches: number[] = [];
    const turns = Math.max(baseCounts.length, branchCounts.length);
    for (let i = 0; i < turns; i += 1) {
        if (baseCounts[i]?.counts !== branchCounts[i]?.counts) mismatches.push(baseCounts[i]?.turn ?? branchCounts[i]?.turn ?? i);
    }

    const result = {
        stripped_sha256: branches,
        turns_compared: turns,
        per_turn_control_mismatches: mismatches,
        pass: branches.player.equal && branches.headless.equal && mismatches.length === 0
            && branches.headless.branch_clash_fields.length === 0,
    };
    const text = JSON.stringify(result, null, 2);
    const outPath = arg('--out');
    if (outPath) writeFileSync(resolve(outPath), `${text}\n`);
    console.log(text);
    process.exitCode = result.pass ? 0 : 1;
}

main();
