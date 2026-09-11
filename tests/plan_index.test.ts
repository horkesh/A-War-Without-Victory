/**
 * The plan index answers, as data, a question the repo could not answer at all: which plan owns
 * which lane, and is that lane open?
 *
 * It exists because the local model was asked exactly that on 2026-09-11 and correctly REFUSED —
 * the roadmap carries the information but never in one place, so it can be read and not
 * enumerated. 292 plan documents exist; 264 are unlinked history. A dispatcher should not have to
 * open them to discover that.
 *
 * DERIVED, NOT MAINTAINED. The index is regenerated from MASTER_ROADMAP.md and these tests fail
 * if the committed file differs. A hand-kept copy of state that already lives somewhere else is
 * a second source of truth, and this repo has been bitten by that repeatedly — the roadmap stays
 * the authority and this file is only its enumerable shadow.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseRegister, renderIndex, INDEX } = require('../tools/derive_plan_index.cjs') as {
  parseRegister: (repoRoot?: string) => Array<{
    lane: string; title: string; closed: boolean; status: string; plans: string[];
  }>;
  renderIndex: (repoRoot?: string) => string;
  INDEX: string;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml');

interface PlanRow { path: string; exists: boolean; tokens: number; fits_context: boolean; tasks: string | null }
interface LaneRow { lane: string; title: string; lane_open: boolean; status: string; plans: PlanRow[] }

function loadIndex(): { version: number; source: string; lanes: LaneRow[] } {
  return yaml.load(readFileSync(INDEX, 'utf8'), { schema: yaml.JSON_SCHEMA });
}

describe('plan index', () => {
  it('the committed file matches a fresh derivation', () => {
    // If this fails, the roadmap changed and nobody re-derived. Run:
    //   node tools/derive_plan_index.cjs
    expect(readFileSync(INDEX, 'utf8')).toBe(renderIndex());
  });

  it('--check agrees, so CI can enforce it without a diff', () => {
    const code = (() => {
      try {
        execFileSync('node', ['tools/derive_plan_index.cjs', '--check'], { stdio: 'pipe' });
        return 0;
      } catch (error) {
        return (error as { status?: number }).status ?? -1;
      }
    })();
    expect(code).toBe(0);
  });

  it('every plan it names exists on disk', () => {
    const missing = loadIndex().lanes
      .flatMap((lane) => lane.plans)
      .filter((plan) => !existsSync(plan.path))
      .map((plan) => plan.path);
    expect(missing).toEqual([]);
  });

  it('records a token cost for every plan, so a dispatcher can tell what fits', () => {
    // The whole point for the local executor: a 40,000-token plan cannot be handed to a 32K
    // context, and finding that out by truncation is how a model answers about text it never saw.
    for (const plan of loadIndex().lanes.flatMap((lane) => lane.plans)) {
      expect(plan.tokens, plan.path).toBeGreaterThan(0);
      expect(plan.fits_context, plan.path).toBe(plan.tokens < 30720);
    }
  });

  it('marks open and closed lanes, and at least one lane is open', () => {
    const lanes = loadIndex().lanes;
    expect(lanes.length).toBeGreaterThan(0);
    // A register where everything reads closed would mean the parser stopped working, not that
    // the project finished.
    expect(lanes.some((lane) => lane.lane_open)).toBe(true);
    expect(lanes.some((lane) => !lane.lane_open)).toBe(true);
  });

  it('the parser actually reads statuses — a closed lane is detected as closed', () => {
    // Guards the CLOSED_MARKERS list: if it stopped matching, every lane would look open and
    // the index would quietly claim far more live work than exists.
    const rows = parseRegister();
    const closed = rows.filter((row) => row.closed);
    expect(closed.length).toBeGreaterThan(0);
    for (const row of closed) {
      expect(row.status.toUpperCase()).toMatch(/COMPLETE|CLOSED/);
    }
  });

  it('names a task manifest only when the file is really there', () => {
    for (const plan of loadIndex().lanes.flatMap((lane) => lane.plans)) {
      if (plan.tasks !== null) expect(existsSync(plan.tasks), plan.tasks).toBe(true);
    }
  });
});
