import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
const decisionRoomSource = readFileSync(
  'src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx',
  'utf8',
);
const warroomStatusSource = readFileSync(
  'src/ui/map/components/warroom/WarroomStatusBar.tsx',
  'utf8',
);
const mapLegendSource = readFileSync('src/ui/map/components/MapModeLegend.tsx', 'utf8');
const stackOverlaySource = readFileSync(
  'src/ui/map/components/StackExpansionOverlay.tsx',
  'utf8',
);

describe('Workstream D surface ownership', () => {
  it('suspends incompatible Warroom shells when an async presidential blocker activates', () => {
    const effectStart = appSource.indexOf('// Async presidential blockers own the full interaction surface.');
    const effectEnd = appSource.indexOf('}, [activeEventDecisionId]);', effectStart);
    const effect = appSource.slice(effectStart, effectEnd);

    expect(effectStart).toBeGreaterThan(-1);
    expect(effect).toContain('if (activeEventDecisionId === null) return;');
    expect(effect).toContain('setWarroomDeskOpen(false)');
    expect(effect).toContain('setWarroomDecisionRoomOpen(false)');
    expect(effect).toContain('setWarroomOverlaySurface(null)');
    expect(effect).toContain('setCommandStripOpen(false)');
    expect(effect).toContain('setDiplomacyOpen(false)');
    expect(appSource).toMatch(/statusDock=\{\([\s\S]{0,120}!presidentialBlockingSurfaceActive/);
  });

  it('gives the Decision Room one vertical scroll owner below a fixed close header', () => {
    expect(appSource).toContain('data-decision-room-scroll-owner="true"');
    expect(appSource).toMatch(/data-decision-room-scroll-owner="true"[\s\S]{0,500}overflow-y-auto/);
    expect(appSource).toMatch(/data-decision-room-fixed-header="true"[\s\S]{0,250}shrink-0/);
    expect(appSource.indexOf('data-decision-room-fixed-header="true"')).toBeLessThan(
      appSource.indexOf('data-decision-room-scroll-owner="true"'),
    );
    expect(appSource).toMatch(/data-testid="warroom-decision-room-host"[\s\S]{0,300}overflow-hidden/);
    expect(decisionRoomSource).not.toContain('overflow-y-auto');
    expect(decisionRoomSource).not.toContain('max-h-[min(70vh,52rem)]');
    expect(decisionRoomSource).toMatch(/data-decision-room-dossier-actions="true"[\s\S]{0,250}border-t/);
    expect(decisionRoomSource).not.toMatch(/data-decision-room-dossier-actions="true"[\s\S]{0,250}sticky bottom-0/);
  });

  it('keeps Warroom essential copy readable and metadata at least 10px', () => {
    expect(warroomStatusSource).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(warroomStatusSource).toMatch(/text-\[12px\][^"\n]*font-bold[^"\n]*text-amber-50/);
    expect(warroomStatusSource).toMatch(/text-\[12px\][^"\n]*leading-snug[^"\n]*text-amber-300/);
    expect(warroomStatusSource).toMatch(/data-tutorial-step="warroom-status-bar"[\s\S]{0,220}bg-black\/90/);
    expect(warroomStatusSource).not.toMatch(/data-tutorial-step="warroom-status-bar"[\s\S]{0,220}bg-black\/70/);
  });

  it('uses the configured color-vision palette on an opaque contrast-safe map legend', () => {
    expect(mapLegendSource).toContain("color: 'var(--cb-faction-rs)'");
    expect(mapLegendSource).toContain("color: 'var(--cb-faction-rbih)'");
    expect(mapLegendSource).toContain("color: 'var(--cb-faction-hrhb)'");
    expect(mapLegendSource).toContain('bg-panel-bg');
    expect(mapLegendSource).not.toContain('bg-panel/80');
    expect(mapLegendSource).toContain('text-[12px] text-text-primary');
    expect(mapLegendSource).not.toMatch(/text-\[9px\]/);
    expect(stackOverlaySource).not.toMatch(/text-\[9px\]/);
  });
});
