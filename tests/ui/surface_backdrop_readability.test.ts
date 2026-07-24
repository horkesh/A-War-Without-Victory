import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const FILES = [
  'src/ui/map/App.tsx',
  'src/ui/map/components/chronicle/ChronicleOverlay.tsx',
  'src/ui/map/components/presidential_desk/DeskAuthorityHeader.tsx',
  'src/ui/map/components/presidential_desk/PresidentDeskShell.tsx',
  'src/ui/map/components/warroom/CommandCardStrip.tsx',
];

describe('reading-surface backdrop contract', () => {
  it('does not use non-emitted 92/94 opacity utilities on player reading surfaces', () => {
    for (const path of FILES) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/bg-(?:panel-bg|black)\/(?:92|94)\b/);
    }
  });

  it('keeps Warroom native previews and command surfaces opaque', () => {
    const app = readFileSync('src/ui/map/App.tsx', 'utf8');
    const commandStrip = readFileSync('src/ui/map/components/warroom/CommandCardStrip.tsx', 'utf8');
    const desk = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');
    const authority = readFileSync('src/ui/map/components/presidential_desk/DeskAuthorityHeader.tsx', 'utf8');

    expect(app).toContain('bg-[#11141b]');
    expect(commandStrip).toContain('bg-[#11141b]');
    expect(desk).toContain('bg-[#11141b]');
    expect(authority).toContain('bg-[#11141b]');
  });

  it('renders Chronicle on a solid content plane without backdrop blur', () => {
    const source = readFileSync('src/ui/map/components/chronicle/ChronicleOverlay.tsx', 'utf8');

    expect(source).toContain('fixed inset-0 overflow-hidden bg-[#090a0f] flex flex-col');
    expect(source).toContain('w-[360px] shrink-0 bg-[#11131a] flex flex-col min-h-0');
    expect(source).not.toContain('fixed inset-0 bg-black/92 backdrop-blur-sm');
    expect(source).not.toContain('w-[360px] shrink-0 bg-black/35 backdrop-blur-sm');
  });
});
