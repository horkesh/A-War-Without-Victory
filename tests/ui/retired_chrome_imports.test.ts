import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const appSource = fs.readFileSync(path.join(repoRoot, 'src/ui/map/App.tsx'), 'utf8');

describe('retired map chrome', () => {
  it('keeps retired chrome out of the live App import graph', () => {
    expect(appSource).not.toContain('./components/TopToolbar');
    expect(appSource).not.toContain('./components/MapModeToolbar');
    expect(appSource).toContain('./components/PresidentialToolbar');
    expect(appSource).toContain('./components/BottomStatusStrip');
  });

  it('does not keep retired chrome in the live components root', () => {
    expect(fs.existsSync(path.join(repoRoot, 'src/ui/map/components/TopToolbar.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, 'src/ui/map/components/MapModeToolbar.tsx'))).toBe(false);
  });
});
