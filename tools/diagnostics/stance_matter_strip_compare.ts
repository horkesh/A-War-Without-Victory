/**
 * Stance-matter inertness proof (posture model option 2, plan Checks 5).
 *
 * Compares two runs of `tools/ai_play/desktop_calibration_compare.ts` (stack base vs this
 * branch, same arguments, `--final-save-dir` and `--out` set). For the player branch it:
 *   1. loads `<dir>/player/final_save.json`, deletes `meta.stance_matters`,
 *      `meta.stance_matter_history` and `military.stance_matter_state`, re-serializes with
 *      `serializeState`, and hashes with sha256;
 *   2. compares the per-turn player control counts from each `--out` report;
 *   3. counts the stance-matter receipts on the branch (must be > 0, so the gated path ran).
 *
 * Usage:
 *   npx tsx tools/diagnostics/stance_matter_strip_compare.ts \
 *     --base-saves <dir> --base-report <json> --branch-saves <dir> --branch-report <json> [--out <json>]
 * Exit code 0 only when the stripped hashes and every per-turn control count match and the
 * branch raised at least one matter.
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
    delete copy.meta.stance_matters;
    delete copy.meta.stance_matter_history;
    delete (copy.military as Record<string, unknown>).stance_matter_state;
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
    const countMismatches = baseCounts
        .map((row, i) => ({ turn: row.turn, base: row.counts, branch: branchCounts[i]?.counts ?? 'missing' }))
        .filter((row) => row.base !== row.branch);
    const branchReceipts = branchSave.meta.stance_matter_history ?? [];
    const outcomes: Record<string, number> = {};
    for (const receipt of branchReceipts) outcomes[receipt.outcome] = (outcomes[receipt.outcome] ?? 0) + 1;
    const result = {
        base_stripped_sha256: baseHash,
        branch_stripped_sha256: branchHash,
        stripped_equal: baseHash === branchHash,
        turns_compared: baseCounts.length,
        per_turn_control_mismatches: countMismatches,
        base_has_stance_fields: Boolean(baseSave.meta.stance_matters || baseSave.meta.stance_matter_history || (baseSave.military as any).stance_matter_state),
        branch_matter_receipts: branchReceipts.length,
        branch_receipt_outcomes: outcomes,
        pass: baseHash === branchHash && countMismatches.length === 0 && baseCounts.length === branchCounts.length && branchReceipts.length > 0,
    };
    const text = `${JSON.stringify(result, null, 2)}\n`;
    const out = arg('--out');
    if (out) writeFileSync(resolve(out), text, 'utf8');
    process.stdout.write(text);
    process.exitCode = result.pass ? 0 : 1;
}

main();
