#!/usr/bin/env node
/**
 * Phase H1.3: Scenario harness preflight wrapper (check-only, no generation).
 * 1) Runs Phase H1.2 data prerequisites check.
 * 2) If OK, runs Phase H1.1 scenario harness with same args (pass-through).
 * 3) If NOT OK, exits non-zero with same remediation text.
 * Does not generate files; does not modify harness behavior; preserves exit codes.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import {
  PROVENANCE_OVERRIDE_ENV_VAR,
  S6_GRADE_RUN_ENV_VAR,
  MIN_OVERRIDE_REASON_LENGTH,
  readGitDirty,
  readGitDirtyPaths,
  readProvenanceOverride,
} from '../../src/scenario/run_provenance.js';


const prereqResult = checkDataPrereqs();
if (!prereqResult.ok) {
  process.stderr.write(formatMissingRemediation(prereqResult));
  process.exit(1);
}

/**
 * §6-GRADE CLEANLINESS GATE — checked at run START, not at comparison time.
 *
 * A dirty tree makes a run un-pairable: the commit does not describe it, so the comparison
 * hard-fails. If that only surfaced when the two artifacts were compared, you would have
 * burned TWO 188w runs (~55 min each, serialized) before learning the pair was void. That
 * is how a correct rule becomes a hated one and then gets disabled. So the launcher refuses
 * to begin; the comparison-time check stays as the backstop for pairs produced some other
 * way, or by a §6-grade run that forgot the flag.
 *
 * OPT-IN by `AWWV_S6_GRADE_RUN=true`, because it cannot apply to every run: the harness
 * contract suite runs real scenarios constantly against a tree that is dirty most of the
 * working day, and it cannot key on `ENABLE_COLLAPSE` either, since the OFF half of a §6
 * pair is unmarked and looks like any other run.
 *
 * The ESCAPE HATCH (`AWWV_PROVENANCE_OVERRIDE="<reason>"`) permits the start and SILENCES
 * NOTHING: the reason is stamped into `run_meta.json`, ordinary comparisons warn on it, and
 * the §6 comparison hard-fails on its presence. Fully usable for exploratory work,
 * structurally unavailable for a §6 verdict — using it is what disqualifies the run.
 */
if (process.env[S6_GRADE_RUN_ENV_VAR] === 'true') {
  const override = readProvenanceOverride();
  if (override !== undefined && override.length < MIN_OVERRIDE_REASON_LENGTH) {
    process.stderr.write(
      `${PROVENANCE_OVERRIDE_ENV_VAR} is set but the reason is too short to act on `
      + `(${override.length} chars, minimum ${MIN_OVERRIDE_REASON_LENGTH}): "${override}".\n`
      + `The reason is stamped into run_meta.json and read by whoever finds the run later. `
      + `Say what was uncommitted and why the run was worth taking anyway.\n`
    );
    process.exit(1);
  }
  if (override === undefined) {
    const dirty = readGitDirty(process.cwd());
    if (dirty !== false) {
      const why = dirty === null
        ? 'git could not be read, so the tree cannot be CERTIFIED clean'
        : 'the working tree has uncommitted or untracked changes';
      // NAME THE PATHS. A gate that exists to prevent an attribution error must not emit a
      // message you cannot attribute — the first version said only "the tree is dirty" and
      // cost a round trip, because the dirty file was the previous evidence run's own --map
      // output and one line of `git status` would have said so.
      const paths = readGitDirtyPaths(process.cwd());
      const listing = paths === null || paths.length === 0
        ? '    (git could not enumerate the changes)\n'
        : paths.map(l => `    ${l}\n`).join('');
      process.stderr.write(
        `REFUSING to start a §6-grade run: ${why}.\n\n`
        + `  DIRTY:\n${listing}\n`
        + `  A dirty tree makes the run un-pairable — its commit does not describe it, and the\n`
        + `  §6 comparison will reject the pair AFTER both runs have cost their full wall-clock.\n`
        + `  Fix: commit or 'git stash' the tree and re-launch.\n`
        + `  If a listed path is a previous run's OUTPUT rather than an input, that is a repo-hygiene\n`
        + `  defect worth fixing at the source, not a reason to weaken this check.\n`
        + `  Or, for exploratory work that is NOT going to license a §6 verdict, set\n`
        + `  ${PROVENANCE_OVERRIDE_ENV_VAR}="<why this run is worth taking dirty>" — the reason is\n`
        + `  stamped into run_meta.json and permanently disqualifies the run from §6.\n`
      );
      process.exit(1);
    }
  }
}

const args = process.argv.slice(2);
const repoRoot = process.cwd();
const child = spawn(
  process.execPath,
  [join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(repoRoot, 'tools', 'scenario_runner', 'run_scenario.ts'), ...args],
  {
    stdio: 'inherit',
    cwd: repoRoot
  }
);

child.on('error', (err) => {
  console.error('run_scenario_with_preflight: harness spawn failed', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
