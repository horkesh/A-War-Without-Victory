// Run the in-process sim from the repo root, wherever an ai_play script was launched from.
//
// Parts of the sim still resolve data files against process.cwd() (settlement-graph fallbacks,
// political-control init defaults, ...), so these tools only worked when started from the repo root.
// The desktop app solves the same problem by chdir-ing to its data root before running turns
// (src/desktop/electron-main.cjs); this does the same for the headless tools.
//
// Import this module FIRST in each in-process ai_play entry point, so the chdir happens before any
// other module runs. Resolve user-supplied relative paths with fromLaunchDir(), so `--out results`
// still means "results under the folder I launched from".
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute repo root (tools/ai_play -> repo). */
export const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** The folder the script was launched from, captured before the chdir. */
export const LAUNCH_CWD = process.cwd();

// Only when needed: process.chdir() throws inside worker threads (e.g. a vitest worker that imports
// president_playthrough.ts), and there the cwd is already the repo root.
if (resolve(LAUNCH_CWD) !== REPO_ROOT) process.chdir(REPO_ROOT);

/** Resolve a user-supplied path against the launch folder (absolute paths pass through). */
export function fromLaunchDir(path: string): string {
    return resolve(LAUNCH_CWD, path);
}
