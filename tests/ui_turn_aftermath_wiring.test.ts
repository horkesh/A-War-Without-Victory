import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('turn aftermath UI wiring', () => {
  it('mounts the aftermath modal from the tactical shell', () => {
    const app = read('../src/ui/map/App.tsx');
    expect(app).toContain("import { TurnAftermathModal }");
    expect(app).toContain('const turnAftermath = useGameStore');
    expect(app).toContain('<TurnAftermathModal');
    expect(app).toContain('openInboxHome');
  });

  it('routes all tactical advance-turn entrypoints through the aftermath dependency bundle', () => {
    const files = [
      '../src/ui/map/components/PresidentialToolbar.tsx',
      '../src/ui/map/components/warroom/AdvanceTurnModal.tsx',
      '../src/ui/map/hooks/useKeyboardShortcuts.ts',
      '../src/ui/map/components/PeaceStatusPanel.tsx',
      '../src/ui/map/components/TopToolbar.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source, file).toContain('getTurnAftermathAdvanceDeps');
      expect(source, file).toContain('...getTurnAftermathAdvanceDeps()');
    }
  });
});
