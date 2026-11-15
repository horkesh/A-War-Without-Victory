/**
 * Command loop L6 inertness proof (Authority that binds).
 *
 * Compares two runs of `tools/ai_play/desktop_calibration_compare.ts` (main vs this branch,
 * same arguments, `--final-save-dir` and `--out` set). For the player branch it:
 *   1. loads `<dir>/player/final_save.json`, deletes the only field this lane adds to the
 *      simulation, `military.command_authority.last_recovery_breakdown`, re-serializes with
 *      `serializeState`, and hashes with sha256;
 *   2. compares the per-turn player control counts from each `--out` report;
 *   3. checks the branch actually wrote the breakdown (so the gated path ran).
 *
 * The Authority debit lives only in the desktop IPC handlers (a human answering a proposal),
 * which this simulated player path never calls, so everything except the breakdown must be
 * byte-identical.
 *
 * Usage:
 *   npx tsx tools/diagnostics/authority_strip_compare.ts \
 *     --base-saves <dir> --base-report <json> --branch-saves <dir> --branch-report <json> [--out <json>]
 * Exit code 0 only when the stripped hashes and every per-turn control count match and the
 * branch carries the breakdown.
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

function loadSave(dir: string): GameState {
    return JSON.parse(readFileSync(resolve(dir, 'player', 'final_save.json'), 'utf8')) as GameState;
}

function strippedHash(state: GameState): string {
    const copy = JSON.parse(JSON.stringify(state)) as GameState & Record<string, any>;
    const auth = (copy.military as Record<string, any> | undefined)?.command_authority;
    if (auth && typeof auth === 'object') delete auth.last_recovery_breakdown;
    return createHash('sha256').update(serializeState(copy)).digest('hex');
}

function playerControlCounts(reportPath: string): Array<{ turn: number; counts: string }> {
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { turns?: Array<Record<string, any>> };
    return (report.turns ?? []).map((row) => ({
        turn: Number(row.turn),
        counts: JSON.stringify(row.player?.control_counts ?? row.player_control_counts ?? null),
    }));
}

function main(): void {
    const baseSave = loadSave(required('--base-saves'));
    const branchSave = loadSave(required('--branch-saves'));
    const baseHash = strippedHash(baseSave);
    const branchHash = strippedHash(branchSave);

    const baseCounts = playerControlCounts(required('--base-report'));
    const branchCounts = playerControlCounts(required('--branch-report'));
    const mismatches: number[] = [];
    const turns = Math.max(baseCounts.length, branchCounts.length);
    for (let i = 0; i < turns; i += 1) {
        if (baseCounts[i]?.counts !== branchCounts[i]?.counts) mismatches.push(baseCounts[i]?.turn ?? branchCounts[i]?.turn ?? i);
    }

    const branchAuth = (branchSave.military as Record<string, any> | undefined)?.command_authority;
    const baseAuth = (baseSave.military as Record<string, any> | undefined)?.command_authority;
    const result = {
        base_stripped_sha256: baseHash,
        branch_stripped_sha256: branchHash,
        stripped_equal: baseHash === branchHash,
        turns_compared: turns,
        per_turn_control_mismatches: mismatches,
        base_has_breakdown: Boolean(baseAuth && 'last_recovery_breakdown' in baseAuth),
        branch_has_breakdown: Boolean(branchAuth && branchAuth.last_recovery_breakdown),
        branch_breakdown: branchAuth?.last_recovery_breakdown ?? null,
        pass: false,
    };
    result.pass = result.stripped_equal && mismatches.length === 0 && result.branch_has_breakdown && !result.base_has_breakdown;

    const text = JSON.stringify(result, null, 2);
    const outPath = arg('--out');
    if (outPath) writeFileSync(resolve(outPath), `${text}\n`);
    console.log(text);
    process.exitCode = result.pass ? 0 : 1;
}

main();
