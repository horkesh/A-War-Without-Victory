import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../..');

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

describe('legacy autonomy_panel route retirement', () => {
  it('keeps generated proposal reviews owned by Decision Room, not the stale AutonomyPanel route', () => {
    const app = readRepoFile('src/ui/map/App.tsx');
    const registry = readRepoFile('src/ui/map/data/decisionSurfaceRegistry.ts');
    const inboxItems = readRepoFile('src/ui/map/data/inboxItems.ts');

    expect(app).not.toContain("import { AutonomyPanel }");
    expect(app).not.toContain('autonomyPanelOpen');
    expect(app).not.toContain("action === 'autonomy_panel'");
    expect(registry).not.toContain("'autonomy_panel'");
    expect(inboxItems).not.toContain("'autonomy_panel'");
  });
});
