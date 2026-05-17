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
    const glassPanel = read('src/ui/map/components/GlassPanel.tsx');

    expect(app).toContain("'--awwv-toolbar-clearance' as string");
    expect(app).toContain("'--awwv-bottom-bar-clearance' as string");
    expect(oob).toContain("top: 'var(--awwv-toolbar-clearance, 5.5rem)'");
    expect(oob).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
    expect(oob).not.toContain('bottom-9');
    expect(panelRail).toContain("top: 'var(--awwv-toolbar-clearance, 5.5rem)'");
    expect(panelRail).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
    expect(glassPanel).toContain('SIDE_PANEL_FRAME_STYLE');
    expect(glassPanel).toContain("top: 'var(--awwv-toolbar-clearance, 5.5rem)'");
    expect(glassPanel).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
    expect(glassPanel).not.toContain('top-14 bottom-0');
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

  it('keeps the faction picker in the wargame icon system instead of emoji glyphs', () => {
    const sidePicker = read('src/ui/map/components/SidePickerOverlay.tsx');

    expect(sidePicker).toContain("import { Icon } from './icons/Icon'");
    expect(sidePicker).toContain('<Icon name="locked" size={13} />');
    expect(sidePicker).toContain('<Icon name="transit" size={13} />');
    expect(sidePicker).not.toMatch(/ð|📂|🔄/);
  });
  it('keeps the advance-turn confirmation in the dark command-shell palette', () => {
    const advanceTurnModal = read('src/ui/map/components/warroom/AdvanceTurnModal.tsx');

    expect(advanceTurnModal).toContain('bg-panel-bg/97');
    expect(advanceTurnModal).toContain('bg-panel-card/70');
    expect(advanceTurnModal).toContain('border-panel-border');
    expect(advanceTurnModal).toContain('text-text-primary');
    expect(advanceTurnModal).toContain('bg-accent-gold');
    expect(advanceTurnModal).not.toMatch(/bg-(?:white|neutral-50|neutral-100|neutral-200|amber-100|green-600)/);
    expect(advanceTurnModal).not.toMatch(/text-(?:neutral-900|neutral-950|neutral-800|neutral-700|amber-800)/);
    expect(advanceTurnModal).not.toMatch(/border-(?:neutral-300|neutral-400)/);
  });

  it('keeps the order queue docked to the left rail instead of floating over it empty', () => {
    const orderQueue = read('src/ui/map/components/OrderQueue.tsx');

    expect(orderQueue).toContain('if (stagedOrders.length === 0) return null;');
    expect(orderQueue).toContain("bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)'");
    expect(orderQueue).toContain("width: '15.5rem'");
    expect(orderQueue).not.toContain('Order queue (0)');
    expect(orderQueue).not.toContain("width: '18rem'");
    expect(orderQueue).not.toContain("bottom: '2.25rem'");
  });

  it('opens useful OOB sections by default for the unselected command view', () => {
    const oob = read('src/ui/map/components/OOBSidebar.tsx');

    expect(oob).toContain('situation: true');
    expect(oob).toContain('army: true');
  });
});
