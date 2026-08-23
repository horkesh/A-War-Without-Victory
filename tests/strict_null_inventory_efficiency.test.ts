import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('strict-null inventory test efficiency', () => {
  it('builds the repository inventory once for the entire test module', () => {
    const source = readFileSync(
      join(process.cwd(), 'tests', 'strict_null_inventory_progress.test.ts'),
      'utf8',
    );
    expect(source.match(/buildInventory\(process\.cwd\(\)\)/g)).toHaveLength(1);
  });
});
