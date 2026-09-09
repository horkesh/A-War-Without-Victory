import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 President Desk layout readability', () => {
  it('marks the scroll region with a bottom content fade', () => {
    const source = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');

    expect(source).toContain('[mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)]');
  });

  it('keeps the Warroom date in a persistent sightline beside the fixed Desk column', () => {
    const source = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
    const projectedMapStart = source.indexOf('function WarroomProjectedMap');
    const dateBoardStart = source.indexOf('function WarroomDateBoard');
    const hotspotStart = source.indexOf('function WarroomHotspot');
    const projectedMap = source.slice(projectedMapStart, dateBoardStart);
    const dateBoard = source.slice(dateBoardStart, hotspotStart);
    const dateLabelStart = dateBoard.indexOf('data-testid="warroom-date-board-label"');
    const dateLabel = dateBoard.slice(dateLabelStart);

    expect(projectedMapStart).toBeGreaterThan(-1);
    expect(dateBoardStart).toBeGreaterThan(projectedMapStart);
    expect(hotspotStart).toBeGreaterThan(dateBoardStart);
    expect(projectedMap).not.toContain('warroom-date-board');
    expect(projectedMap).not.toContain('translateX(min(0px, calc(28vw - 616px)))');
    expect(dateBoard).toContain('data-testid="warroom-date-board"');
    expect(dateBoard).toContain('translateX(min(0px, calc(28vw - 616px)))');
    expect(dateLabel).toContain("transform: 'rotate(-0.45deg)'");
    expect(dateLabel).not.toContain('translateX(');
    expect(dateLabel).toContain("background: 'rgba(236, 232, 216, 0.94)'");
  });
});
