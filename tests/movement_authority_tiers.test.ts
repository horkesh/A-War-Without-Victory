import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_ROOT = join(process.cwd(), 'src');

function readSrc(relPath: string): string {
  return readFileSync(join(SRC_ROOT, relPath), 'utf-8');
}

describe('Movement Authority Tier Invariants', () => {
  it('T1: commander_loop.ts only writes brigade_movement_orders for prepositioning (bounded T1 exception)', () => {
    const src = readSrc('sim/combat/commander/commander_loop.ts');
    // T1 writes brigade_movement_orders ONLY in the prepositioning block for main_effort
    // surplus brigades unreachable from front. All other movement flows through T2.
    // Verify the write site is scoped inside a prepositioning_orders loop guard.
    expect(src).toMatch(/prepositioning_orders/);
    // The file must not write location_osid directly (that is always T3/T4/T5 territory)
    expect(src).not.toMatch(/location_osid\s*=/);
    // The file must reference MOVEMENT_AUTHORITY.md (annotation present)
    expect(src).toMatch(/MOVEMENT_AUTHORITY/);
  });

  it('T3: osid_column_movement.ts never calls T2 decision functions', () => {
    const src = readSrc('sim/combat/osid_column_movement.ts');
    expect(src).not.toMatch(/evaluateSectorMarch/);
    expect(src).not.toMatch(/generateBotBrigadeOrders/);
  });

  it('T3: brigade_movement_orders.ts (executor) never imports from commander/', () => {
    const src = readSrc('sim/combat/brigade_movement_orders.ts');
    expect(src).not.toMatch(/from ['"].*commander\//);
    expect(src).not.toMatch(/require\(['"].*commander\//);
  });

  it('T4: attack_resolution_osid.ts never writes brigade_movement_orders (only location_osid)', () => {
    const src = readSrc('sim/combat/attack_resolution_osid.ts');
    // Combat consequence: only location_osid and retreat/advance, not movement orders
    expect(src).not.toMatch(/brigade_movement_orders\s*=/);
  });

  it('T6 repair files do not import T1 intent files', () => {
    const t6Files = [
      'sim/combat/commander_march_correction.ts',
      'sim/combat/brigade_front_distribution.ts',
      'sim/combat/brigade_home_return.ts',
    ];
    const t1Files = ['commander_loop', 'allocate', 'emit', 'decide', 'plan'];
    for (const file of t6Files) {
      const src = readSrc(file);
      for (const t1 of t1Files) {
        expect(src).not.toMatch(new RegExp(`from ['"].*commander/${t1}`));
      }
    }
  });
});
