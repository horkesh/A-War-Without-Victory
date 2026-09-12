/**
 * The manifest is data; the prompt is rendered from it. Keeping a YAML manifest AND a
 * hand-written prompt would be two sources of truth that drift — the failure the plan index, the
 * open-gates register and the lesson-pointer checker were each built to stop.
 *
 * The refusals matter as much as the rendering. A BLOCKED task must not be dispatchable: a prompt
 * that quietly describes work nobody can do wastes a dispatch and produces a confident answer
 * about missing evidence.
 *
 * THESE TESTS OWN THEIR INPUTS. They used to render tasks out of the live warroom manifest, which
 * made their meaning depend on project state — "refuses a blocked task" needed a task to still be
 * blocked, "renders an open task" needed one to still be open. Doing the work turned four tests
 * red with nothing wrong in the renderer. A renderer test asserts what the renderer does; whether
 * any real task is currently open is not a fact about the renderer.
 *
 * The live manifests are still exercised, but only through the one assertion that is genuinely
 * status-independent: everything dispatchable renders.
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { render, hardRules } = require('../tools/render_task_prompt.cjs') as {
  render: (manifestPath: string, taskId: string, repoRoot?: string) => string;
  hardRules: (repoRoot?: string) => string;
};
const { manifestPaths, load } = require('../tools/validate_task_manifests.cjs') as {
  manifestPaths: (repoRoot?: string) => string[];
  load: (relPath: string, repoRoot?: string) => { tasks?: { id: string; status: string }[] };
};

const MANIFEST = 'tests/fixtures/task_manifest_render.fixture.yml';

describe('render_task_prompt', () => {
  it('renders a read-only task as read-only, with no edit list', () => {
    const text = render(MANIFEST, 'FIX-T1-OPEN-READ-ONLY');
    expect(text).toContain('**NONE. This task changes no files.**');
    expect(text).toContain('src/ui/map/styles/globals.css');
  });

  it('tells a read-only task how its output will be checked', () => {
    // Without this the executor has no reason to quote verbatim, and an unverifiable answer from
    // a 9B model is worth less than not asking.
    const text = render(MANIFEST, 'FIX-T1-OPEN-READ-ONLY');
    expect(text).toContain('Quote VERBATIM');
    expect(text).toContain('An invented quote fails the whole');
  });

  it('REFUSES a blocked task, and says why', () => {
    expect(() => render(MANIFEST, 'FIX-T2-BLOCKED'))
      .toThrow(/BLOCKED and must not be dispatched/);
  });

  it('REFUSES a task that is already done', () => {
    // Re-dispatching finished work is how a re-derivation gets to DISAGREE with the answer that
    // is already recorded, leaving two answers and no authority.
    expect(() => render(MANIFEST, 'FIX-T3-DONE')).toThrow(/already done/);
  });

  it('REFUSES an unknown task and lists the ids that exist', () => {
    expect(() => render(MANIFEST, 'NO-SUCH-TASK')).toThrow(/Known ids: FIX-T1/);
  });

  it('carries the hard rules verbatim from TASK_TEMPLATE rather than restating them', () => {
    // A second copy of a rule is a copy that will eventually disagree with the first.
    const rules = hardRules();
    expect(rules).toContain('## Hard rules');
    expect(rules).toContain('Never `git stash`');
    expect(render(MANIFEST, 'FIX-T1-OPEN-READ-ONLY')).toContain(rules);
  });

  it('does not leak the next section of the template into the rules', () => {
    // The extraction slices to the next `## ` heading; if that broke, the prompt would carry
    // TASK_TEMPLATE's own "Out of scope" placeholder alongside the task's real one.
    expect(hardRules()).not.toContain('## Out of scope');
  });

  it('renders every dispatchable task in every committed manifest', () => {
    // The status-independent half. It says nothing about which tasks are open — only that
    // whatever IS open can actually be turned into a prompt. If every real task is done or
    // blocked this asserts nothing, which is correct and is why it is not the only test here.
    const failures: string[] = [];
    for (const relPath of manifestPaths()) {
      for (const task of load(relPath).tasks ?? []) {
        if (task.status !== 'open') continue;
        try {
          const text = render(relPath, task.id);
          if (!text.includes('## Hard rules')) failures.push(`${relPath} ${task.id}: no hard rules`);
        } catch (error) {
          failures.push(`${relPath} ${task.id}: ${(error as Error).message}`);
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
