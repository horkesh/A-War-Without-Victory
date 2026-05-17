import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('live tactical command surfaces avoid CRT overlays', () => {
  it('keeps the command rail and field ops snapshot in the archival shell style', () => {
    const oobSidebar = read('src/ui/map/components/OOBSidebar.tsx');
    const operationsPanel = read('src/ui/map/components/OperationsPanel.tsx');

    expect(oobSidebar).not.toContain('crt-overlay');
    expect(operationsPanel).not.toContain('crt-overlay');
  });
});
