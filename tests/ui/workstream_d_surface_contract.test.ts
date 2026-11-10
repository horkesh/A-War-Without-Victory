import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync('src/ui/map/App.tsx', 'utf8');
const decisionRoomSource = readFileSync(
  'src/ui/map/components/command_surface/CommandSurface.tsx',
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

  it('keeps the Command Surface header fixed and lets each column scroll on its own', () => {
    // Owner redesign 2026-11-10: a full-height surface; the header never scrolls, the
    // area rail, the matters and the detail each own their vertical scroll, and the
    // detail's action footer stays in view below its scrolling body.
    expect(decisionRoomSource).toMatch(/data-testid="warroom-decision-room-host"[\s\S]{0,300}overflow-hidden/);
    expect(decisionRoomSource).toMatch(/<header className="flex shrink-0/);
    expect(decisionRoomSource).toContain('grid min-h-0 flex-1');
    expect(decisionRoomSource).toContain('data-testid="command-card-strip"');
    expect(decisionRoomSource).toMatch(/flex min-h-0 flex-col overflow-y-auto">/);
    expect(decisionRoomSource).toMatch(/data-testid="decision-room-dossier-scroll" className="min-h-0 flex-1 overflow-y-auto"/);
    expect(decisionRoomSource).toMatch(/flex shrink-0 flex-col gap-3 border-t/);
    expect(decisionRoomSource).not.toContain('sticky bottom-0');
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
