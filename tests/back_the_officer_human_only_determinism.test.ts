/**
 * Phase 2 slice 1 "Back the Officer" — determinism guard.
 *
 * The Override (force-launch) and Commit/Withhold loop is HUMAN-ONLY: it lives
 * entirely in the desktop IPC handlers (a human clicking the AutonomyPanel).
 * A headless scenario run (meta.headless_scenario_auto_control) must NEVER set
 * `player_op_response` or proposal-driven `force_launch` from a proposal, so the
 * feature cannot shift bot/scenario output or run hashes.
 *
 * Two assertions, no heavy scenario run required:
 *  1. Static ownership — the ONLY code that ASSIGNS `player_op_response` to a
 *     value (vs clearing it to undefined) lives in src/desktop/. No src/sim/**
 *     or src/scenario/** path writes it. (war_phases.ts only clears it.)
 *  2. Purity — the desktop card builder (buildOpProposalCardData) is a read-model
 *     and never mutates the state it is handed.
 */

import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildOpProposalCardData } = require('../src/desktop/autonomy_ipc_contract.cjs') as {
  buildOpProposalCardData: (state: any, proposals: any[]) => any[];
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|cjs|mjs|js)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('back-the-officer is human-only (determinism guard)', () => {
  it('no sim/scenario code assigns player_op_response to a value (only desktop IPC does)', () => {
    const roots = [resolve(process.cwd(), 'src', 'sim'), resolve(process.cwd(), 'src', 'scenario')];
    // Match an ASSIGNMENT to an object-literal value (the proposal-resolution
    // write `= { plan_id, approved, turn }`). The per-turn clear `= undefined`
    // in war_phases.ts is allowed (it removes stale responses, never sets one).
    const assignRe = /player_op_response\s*=\s*\{/;
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const src = readFileSync(file, 'utf8');
        if (assignRe.test(src)) offenders.push(file.replace(/\\/g, '/'));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no sim/scenario code references the proposal force-launch IPC channel', () => {
    const roots = [resolve(process.cwd(), 'src', 'sim'), resolve(process.cwd(), 'src', 'scenario')];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const src = readFileSync(file, 'utf8');
        if (src.includes('force-launch-proposal') || src.includes('forceLaunchProposal')) {
          offenders.push(file.replace(/\\/g, '/'));
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the desktop card builder is a pure read-model — it does not mutate the state it reads', () => {
    const state = {
      military: {
        formations: { '1st_corps': { name: '1st Corps' } },
        named_officer_data: [{ id: 'off_x', name: 'Atif Dudaković', rank: 'corps_commander' }],
        named_officers: { off_x: { status: 'active' } },
        corps_command: {
          '1st_corps': {
            active_operations: [
              { id: 'op_a', name: 'Operation A', plan_id: 'plan_a', tg_commander_officer_id: 'off_x', commander_assessment: 'abort' },
            ],
          },
        },
      },
    };
    const before = JSON.stringify(state);
    buildOpProposalCardData(state, [
      { id: 'PROP_30_ops_0', faction: 'RBiH', domain: 'ops', proposed_action: 'APPROVE_OP:1st_corps:plan_a' },
    ]);
    // No force_launch, no player_op_response, no mutation of any kind.
    expect(JSON.stringify(state)).toBe(before);
    const op = state.military.corps_command['1st_corps'].active_operations[0] as Record<string, unknown>;
    expect(op.force_launch).toBeUndefined();
    expect((state.military.corps_command['1st_corps'] as Record<string, unknown>).player_op_response).toBeUndefined();
  });
});
