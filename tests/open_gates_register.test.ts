/**
 * Open Gates Register integrity.
 *
 * The register only earns its place if it is checkable. Two halves here:
 *   1. the committed register validates, and its shape matches what the roadmap says;
 *   2. the validator actually rejects bad data.
 *
 * The second half is not ceremony. A validator that returns "no errors" for every input
 * would pass half one forever while the register rotted — the exact false-green shape this
 * repo has been bitten by before.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  loadRegister,
  validateRegister,
  openGates,
} = require('../tools/validate_open_gates.cjs') as {
  loadRegister: (path?: string) => Register;
  validateRegister: (register: unknown, options?: { today?: string | null }) => string[];
  openGates: (register: Register) => Gate[];
};

interface Gate {
  id: string;
  lane: string;
  title: string;
  status: 'open' | 'blocked' | 'closed';
  kind: string;
  opened: string;
  closed?: string;
  blocks: string[];
  evidence_required: string;
  evidence_path: string | null;
  source: string;
  notes?: string;
}

interface Register {
  version: number;
  updated: string;
  lanes: string[];
  gates: Gate[];
}

/** A minimal register that is valid, used as the base for each negative case. */
function validFixture(): Register {
  return {
    version: 1,
    updated: '2026-09-10',
    lanes: ['R7', 'REPO'],
    gates: [
      {
        id: 'R7-EXAMPLE-GATE',
        lane: 'R7',
        title: 'Example',
        status: 'open',
        kind: 'acceptance',
        opened: '2026-09-01',
        blocks: [],
        evidence_required: 'A named artifact that would demonstrably close this gate.',
        evidence_path: null,
        source: 'docs/open_gates.yml',
      },
    ],
  };
}

describe('open gates register', () => {
  it('the committed register parses and validates with no errors', () => {
    const register = loadRegister();
    const errors = validateRegister(register, { today: '2026-09-10' });
    expect(errors).toEqual([]);
  });

  it('every gate names evidence that would close it', () => {
    const register = loadRegister();
    for (const gate of register.gates) {
      expect(gate.evidence_required.trim().length).toBeGreaterThan(20);
    }
  });

  it('closed gates point at evidence, open gates do not claim to be closed', () => {
    const register = loadRegister();
    for (const gate of register.gates) {
      if (gate.status === 'closed') {
        expect(gate.evidence_path, `${gate.id} is closed`).toBeTruthy();
        expect(gate.closed, `${gate.id} is closed`).toBeTruthy();
      }
    }
  });

  it('the R7 roll-up gate cannot close while other R7 gates are open', () => {
    const register = loadRegister();
    const rollUp = register.gates.find((gate) => gate.id === 'R7-ACCEPTANCE-ALL-GREEN');
    expect(rollUp).toBeDefined();
    const otherR7Open = register.gates.filter(
      (gate) => gate.lane === 'R7' && gate.id !== rollUp!.id && gate.status !== 'closed',
    );
    if (otherR7Open.length > 0) {
      expect(rollUp!.status).not.toBe('closed');
    }
  });

  it('gate ids are unique', () => {
    const register = loadRegister();
    const ids = register.gates.map((gate) => gate.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('openGates excludes closed rows and is deterministically ordered', () => {
    const register = loadRegister();
    const rows = openGates(register);
    expect(rows.every((gate) => gate.status !== 'closed')).toBe(true);
    const keys = rows.map((gate) => `${gate.lane}:${gate.id}`);
    expect(keys).toEqual([...keys].sort());
    // Calling twice must not reorder.
    expect(openGates(register).map((gate) => gate.id)).toEqual(rows.map((gate) => gate.id));
  });

  // ── the validator must actually reject bad data ────────────────────────────────

  it('rejects a duplicate id', () => {
    const register = validFixture();
    register.gates.push({ ...register.gates[0] });
    expect(validateRegister(register).join('\n')).toMatch(/duplicate id/);
  });

  it('rejects an unknown status', () => {
    const register = validFixture();
    (register.gates[0] as unknown as { status: string }).status = 'in-progress';
    expect(validateRegister(register).join('\n')).toMatch(/status must be one of/);
  });

  it('rejects an unknown lane', () => {
    const register = validFixture();
    register.gates[0].lane = 'R42';
    expect(validateRegister(register).join('\n')).toMatch(/not in the declared lanes list/);
  });

  it('rejects a closed gate with no evidence_path', () => {
    const register = validFixture();
    register.gates[0].status = 'closed';
    register.gates[0].closed = '2026-09-02';
    register.gates[0].evidence_path = null;
    expect(validateRegister(register).join('\n')).toMatch(/closed but evidence_path is null/);
  });

  it('rejects an evidence_path that does not exist', () => {
    const register = validFixture();
    register.gates[0].status = 'closed';
    register.gates[0].closed = '2026-09-02';
    register.gates[0].evidence_path = 'docs/this-file-does-not-exist.md';
    expect(validateRegister(register).join('\n')).toMatch(/does not exist/);
  });

  it('rejects a source path that does not exist', () => {
    const register = validFixture();
    register.gates[0].source = 'docs/plans/no-such-plan.md';
    expect(validateRegister(register).join('\n')).toMatch(/source .* does not exist/);
  });

  it('rejects a placeholder evidence_required', () => {
    const register = validFixture();
    register.gates[0].evidence_required = 'TODO';
    expect(validateRegister(register).join('\n')).toMatch(/observable artifact/);
  });

  it('rejects a future date', () => {
    const register = validFixture();
    register.gates[0].opened = '2027-01-01';
    expect(validateRegister(register, { today: '2026-09-10' }).join('\n')).toMatch(/is in the future/);
  });

  it('rejects a missing required field', () => {
    const register = validFixture();
    delete (register.gates[0] as Partial<Gate>).evidence_required;
    expect(validateRegister(register).join('\n')).toMatch(/missing required field/);
  });

  it('accepts the valid fixture, so the negative cases are not passing by accident', () => {
    expect(validateRegister(validFixture(), { today: '2026-09-10' })).toEqual([]);
  });

  // ── --json machine-readable mode ───────────────────────────────────────────────
  // Added 2026-09-10. Written by the local executor model, reviewed and applied by the
  // planner — the first end-to-end use of tools/local_executor/. The proposal reused
  // openGates() rather than reimplementing it, which is what made it acceptable.

  it('--json emits parseable JSON listing only open gates, and nothing else', () => {
    const out = execFileSync('node', ['tools/validate_open_gates.cjs', '--json'], { encoding: 'utf8' });
    expect(out).not.toContain('open_gates: OK');

    const parsed = JSON.parse(out) as {
      updated: string;
      total: number;
      open: number;
      gates: Array<{ id: string; lane: string; status: string; title: string; blocks: string[] }>;
    };

    const register = loadRegister();
    expect(parsed.total).toBe(register.gates.length);
    expect(parsed.open).toBe(openGates(register).length);
    expect(parsed.gates).toHaveLength(parsed.open);
    expect(parsed.gates.every((gate) => gate.status !== 'closed')).toBe(true);
    for (const gate of parsed.gates) {
      expect(Array.isArray(gate.blocks)).toBe(true);
      expect(gate.id.length).toBeGreaterThan(0);
    }
  });

  it('--json wins over --list rather than being order-dependent', () => {
    const a = execFileSync('node', ['tools/validate_open_gates.cjs', '--json', '--list'], { encoding: 'utf8' });
    const b = execFileSync('node', ['tools/validate_open_gates.cjs', '--list', '--json'], { encoding: 'utf8' });
    expect(() => JSON.parse(a)).not.toThrow();
    expect(() => JSON.parse(b)).not.toThrow();
  });
});
