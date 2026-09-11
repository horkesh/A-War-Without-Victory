/**
 * The manifest is data; the prompt is rendered from it. Keeping a YAML manifest AND a
 * hand-written prompt would be two sources of truth that drift — the failure the plan index, the
 * open-gates register and the lesson-pointer checker were each built to stop.
 *
 * The refusals matter as much as the rendering. A BLOCKED task must not be dispatchable: a prompt
 * that quietly describes work nobody can do wastes a dispatch and produces a confident answer
 * about missing evidence.
 */

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { render, hardRules } = require('../tools/render_task_prompt.cjs') as {
  render: (manifestPath: string, taskId: string, repoRoot?: string) => string;
  hardRules: (repoRoot?: string) => string;
};

const MANIFEST = 'docs/plans/tasks/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.yml';

describe('render_task_prompt', () => {
  it('renders a read-only task as read-only, with no edit list', () => {
    const text = render(MANIFEST, 'WR01-T1-FONT-INVENTORY');
    expect(text).toContain('**NONE. This task changes no files.**');
    expect(text).toContain('src/ui/map/components/PresidentialInbox.tsx');
  });

  it('tells a read-only task how its output will be checked', () => {
    // Without this the executor has no reason to quote verbatim, and an unverifiable answer from
    // a 9B model is worth less than not asking.
    const text = render(MANIFEST, 'WR01-T1-FONT-INVENTORY');
    expect(text).toContain('Quote VERBATIM');
    expect(text).toContain('An invented quote fails the whole');
  });

  it('REFUSES a blocked task, and says why', () => {
    expect(() => render(MANIFEST, 'WR01-T3-LUMINANCE-TABLE'))
      .toThrow(/BLOCKED and must not be dispatched/);
  });

  it('REFUSES an unknown task and lists the ids that exist', () => {
    expect(() => render(MANIFEST, 'NO-SUCH-TASK')).toThrow(/Known ids: WR01-T1/);
  });

  it('carries the hard rules verbatim from TASK_TEMPLATE rather than restating them', () => {
    // A second copy of a rule is a copy that will eventually disagree with the first.
    const rules = hardRules();
    expect(rules).toContain('## Hard rules');
    expect(rules).toContain('Never `git stash`');
    expect(render(MANIFEST, 'WR01-T1-FONT-INVENTORY')).toContain(rules);
  });

  it('does not leak the next section of the template into the rules', () => {
    // The extraction slices to the next `## ` heading; if that broke, the prompt would carry
    // TASK_TEMPLATE's own "Out of scope" placeholder alongside the task's real one.
    expect(hardRules()).not.toContain('## Out of scope');
  });
});
