import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('GUI polish typography floor', () => {
  it('keeps active operations planning labels above the 7px floor', () => {
    for (const path of [
      'src/ui/map/components/ops_modal/PlanParameters.tsx',
      'src/ui/map/components/ops_modal/PlanPhase.tsx',
      'src/ui/map/components/ops_modal/G2Phase.tsx',
      'src/ui/map/components/ops_modal/ObjectiveList.tsx',
    ]) {
      expect(read(path), path).not.toContain('text-[7px]');
    }
  });

  it('makes the PresidentialToolbar command-authority gauge discoverable beyond a title tooltip', () => {
    const toolbar = read('src/ui/map/components/PresidentialToolbar.tsx');
    const enMessages = read('src/ui/map/i18n/messages.en.ts');

    expect(toolbar).toContain("aria-label={t('presidentialToolbar.commandAuthorityValue', { current, max })}");
    expect(toolbar).toContain('aria-describedby="command-authority-description"');
    expect(toolbar).toContain('id="command-authority-description"');
    expect(toolbar).not.toContain('<span className="text-[8px] font-mono font-bold uppercase tracking-[0.12em] text-text-secondary">AUTH</span>');
    expect(enMessages).toContain("'presidentialToolbar.auth': 'Authority'");
    expect(enMessages).toContain("'toolbar.commandAuthority.label': 'Authority'");
    expect(enMessages).not.toContain("'presidentialToolbar.auth': 'AUTH'");
    expect(enMessages).not.toContain("'toolbar.commandAuthority.label': 'AUTH'");
  });
});
