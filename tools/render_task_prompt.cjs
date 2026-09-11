#!/usr/bin/env node
/**
 * Render one task from a manifest into the prose shape the executor actually receives.
 *
 * WHY RENDER RATHER THAN DISPATCH THE YAML. Small models read prose instructions markedly better
 * than they read structured data, and `tools/local_executor/TASK_TEMPLATE.md` is the prose shape
 * this repo has already proven. But keeping a YAML manifest AND a hand-written prompt would be
 * two sources of truth that drift — which is the failure the plan index, the open-gates register
 * and the lesson-pointer checker were each built to stop. So the manifest is the data, and the
 * prompt is generated from it every time.
 *
 * The hard rules are appended verbatim from TASK_TEMPLATE.md rather than restated here, for the
 * same reason: a second copy of a rule is a copy that will eventually disagree.
 *
 * Usage:
 *   node tools/render_task_prompt.cjs <manifest.yml> <TASK-ID>
 *   node tools/render_task_prompt.cjs <manifest.yml> <TASK-ID> --out prompt.md
 *
 * Exits 2 if the task is blocked or unknown — a blocked task must not be dispatched, and being
 * told why beats a prompt that quietly describes work nobody can do.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const TEMPLATE = 'tools/local_executor/TASK_TEMPLATE.md';

/** The "Hard rules" section of TASK_TEMPLATE.md, verbatim. One copy, not two. */
function hardRules(repoRoot = REPO_ROOT) {
  const text = fs.readFileSync(path.join(repoRoot, TEMPLATE), 'utf8');
  const start = text.indexOf('## Hard rules');
  if (start === -1) return '';
  const rest = text.slice(start);
  const end = rest.indexOf('\n## ', 3);
  return (end === -1 ? rest : rest.slice(0, end)).trimEnd();
}

function bullets(items, fallback) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items.map((item) => `- ${String(item).trim()}`).join('\n');
}

function render(manifestPath, taskId, repoRoot = REPO_ROOT) {
  const manifest = yaml.load(fs.readFileSync(path.join(repoRoot, manifestPath), 'utf8'), {
    schema: yaml.JSON_SCHEMA,
  });
  const task = (manifest.tasks ?? []).find((row) => row.id === taskId);
  if (!task) {
    const known = (manifest.tasks ?? []).map((row) => row.id).join(', ');
    throw new Error(`no task \`${taskId}\` in ${manifestPath}. Known ids: ${known}`);
  }
  if (task.status === 'blocked') {
    throw new Error(`${taskId} is BLOCKED and must not be dispatched: ${task.blocked_by ?? 'no reason recorded'}`);
  }
  if (task.status === 'done') {
    throw new Error(`${taskId} is already done.`);
  }

  const writes = Array.isArray(task.edit) && task.edit.length > 0;

  const parts = [
    `# Executor task — ${task.id}`,
    '',
    '> Generated from ' + manifestPath + ' by tools/render_task_prompt.cjs.',
    '> Do not edit this prompt; edit the manifest and render again.',
    '',
    '## Files you may edit',
    '',
    writes ? bullets(task.edit) : '**NONE. This task changes no files.** Report findings only; propose no edits.',
    '',
    '## Files you may READ for context',
    '',
    bullets(task.read, '- (none)'),
    '',
    'These are exact paths. Do not search the repository for others: at 32K context you cannot',
    'hold it, and exploring is where the budget goes and where invented answers come from.',
    '',
    '## The change',
    '',
    String(task.change).trim(),
    '',
  ];

  if (writes) {
    parts.push(
      '## Acceptance — this is the oracle',
      '',
      'These tests FAIL now and must pass when you are done:',
      '',
      bullets(task.fails_now),
      '',
      'These pass now and must still pass — do not break a neighbour to satisfy your own test:',
      '',
      bullets(task.must_not_break),
      '',
      '```bash',
      `npm run gate:local -- --tests ${[...(task.fails_now ?? []), ...(task.must_not_break ?? [])].join(',')}`,
      '```',
      '',
      'Done means that command exits **0**. Nothing else counts.',
      '',
    );
  } else {
    parts.push(
      '## How your output will be checked',
      '',
      String(task.read_only_acceptance ?? 'The planner verifies it.').trim(),
      '',
      'Quote VERBATIM from the files you were given, and give the file each quote came from.',
      'Every quote is checked against the file by a script. An invented quote fails the whole',
      'answer, and is worse than saying you could not find something.',
      '',
    );
  }

  parts.push(
    hardRules(repoRoot),
    '',
    '## Out of scope',
    '',
    bullets(task.out_of_scope, '- Anything not named above'),
    '',
    '## Report back',
    '',
    '- What you found or changed, one line each',
    '- Anything you noticed but did not touch',
    '- If you were blocked, say exactly what was missing and stop. A stopped task with a clear',
    '  reason is a good outcome; a silently widened one is not.',
    '',
  );

  return parts.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const [manifestPath, taskId] = positional;
  const outIndex = args.indexOf('--out');
  const outPath = outIndex === -1 ? null : args[outIndex + 1];

  if (!manifestPath || !taskId) {
    console.error('usage: node tools/render_task_prompt.cjs <manifest.yml> <TASK-ID> [--out prompt.md]');
    process.exit(2);
  }

  let text;
  try {
    text = render(manifestPath, taskId);
  } catch (error) {
    console.error(`REFUSING: ${error.message}`);
    process.exit(2);
  }

  if (outPath) {
    fs.writeFileSync(outPath, text);
    console.error(`rendered ${taskId} -> ${outPath} (${text.length} bytes, ~${Math.ceil(text.length / 4)} tok)`);
  } else {
    process.stdout.write(text);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { render, hardRules, TEMPLATE };
