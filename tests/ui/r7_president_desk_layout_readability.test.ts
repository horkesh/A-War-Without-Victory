import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 President Desk layout readability', () => {
  it('marks the scroll region with a bottom content fade', () => {
    const source = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');

    expect(source).toContain('[mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)]');
  });

  it('keeps the date attached to the authored whiteboard and clears Desk content below it', () => {
    const warroomSource = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
    const deskSource = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');
    const dateBoardStart = warroomSource.indexOf('function WarroomDateBoard');
    const hotspotStart = warroomSource.indexOf('function WarroomHotspot');
    const dateBoard = warroomSource.slice(dateBoardStart, hotspotStart);

    expect(dateBoardStart).toBeGreaterThan(-1);
    expect(hotspotStart).toBeGreaterThan(dateBoardStart);
    expect(dateBoard).toContain('data-testid="warroom-date-board"');
    expect(dateBoard).not.toContain('translateX(');
    expect(dateBoard).toContain('...box');
    expect(dateBoard).toContain("transform: 'rotate(-0.45deg)'");
    expect(dateBoard).toContain("background: 'rgba(236, 232, 216, 0.94)'");

    // At 16:9 widths the fixed 32rem Desk column overlaps the authored board.
    // Its transparent shell stays fixed while scrollable cards begin below the
    // latest faction label centre (735 / 2752 of the scene width), with enough
    // room for the label box and its shadow.
    expect(deskSource).toContain('mt-[max(0px,calc(26.71vw_-_7.5625rem))]');
    expect(deskSource).toContain('min-[2048px]:mt-0');
  });
});
