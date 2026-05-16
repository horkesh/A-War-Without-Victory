import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('tactical shell frame contract', () => {
  it('uses one shared top and bottom clearance contract for side rails', () => {
    const app = read('src/ui/map/App.tsx');
    const oob = read('src/ui/map/components/OOBSidebar.tsx');
    const panelRail = read('src/ui/map/components/panelRail.ts');

    expect(app).toContain("'--awwv-toolbar-clearance' as string");
    expect(app).toContain("'--awwv-bottom-bar-clearance' as string");
    expect(oob).toContain("top: 'var(--awwv-toolbar-clearance, 5.5rem)'");
    expect(oob).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
    expect(oob).not.toContain('bottom-9');
    expect(panelRail).toContain("top: 'var(--awwv-toolbar-clearance, 5.5rem)'");
    expect(panelRail).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
  });

  it('keeps right rail panels flush with the viewport edge instead of floating off-grid', () => {
    const panelRail = read('src/ui/map/components/panelRail.ts');

    expect(panelRail).toContain('export const DETAIL_PANEL_STYLE');
    expect(panelRail).toContain('right: 0');
    expect(panelRail).not.toContain("right: '1rem'");
  });

  it('prevents hidden flip-card faces from reserving vertical layout height', () => {
    const flipCard = read('src/ui/map/components/army_hq/FlipCard.tsx');

    expect(flipCard).toContain("isFlipped ? 'absolute inset-0 pointer-events-none' : 'relative'");
    expect(flipCard).toContain("isFlipped ? 'relative overflow-y-auto' : 'absolute inset-0 overflow-hidden pointer-events-none'");
    expect(flipCard).not.toContain("className=\"relative grid");
    expect(flipCard).not.toContain("gridArea: '1/1'");
  });

  it('renders the blocking War Begins modal above tactical side panels', () => {
    const transition = read('src/ui/map/components/PeaceWarTransition.tsx');

    expect(transition).toContain('zIndex={Z.MODAL_HARD}');
    expect(transition).not.toContain('zIndex={Z.GLASS_PANEL_PEACE_WAR}');
  });
});
