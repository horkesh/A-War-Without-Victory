import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Engine Invariants 11.2 timestamp exclusion', () => {
  it('does not derive persisted AI decision telemetry from wall-clock time', () => {
    const client = source('src/sim/ai_commander/anthropic_client.ts');

    expect(client).not.toContain('Date.now(');
    expect(client).not.toContain('performance.now(');
    expect(client).not.toContain('latency_ms:');
  });
});
