import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 President Desk layout readability', () => {
  it('marks the scroll region with a bottom content fade', () => {
    const source = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');

    expect(source).toContain('[mask-image:linear-gradient(to_bottom,black_calc(100%_-_1.5rem),transparent)]');
  });

  it('keeps the date always visible by pinning it in the Desk column, not by moving the board', () => {
    // WHAT THIS TEST USED TO PROTECT, AND WHY IT CHANGED.
    //
    // R7 required the date to be visible at all times. That was discharged two ways, both now
    // removed:
    //
    //   1. `translateX(min(0px, calc(28vw - 616px)))` slid the whiteboard date along the wall
    //      until it cleared this column. The shift is viewport-driven while the board is
    //      plate-driven, so it worked at 3440x1440 and put the date on BARE WALL at 1920x1080 and
    //      ON TOP OF THE CORKBOARD MAP at 1366x768.
    //   2. `mt-[max(0px,calc(26.71vw_-_7.5625rem))]` pushed every painted Desk card down by up to
    //      a quarter of the viewport to keep the board in view past this column.
    //
    // Neither is recoverable by tuning. At the 1280x720 design minimum the board sits entirely
    // behind this panel, so no placement rule exposes it. Design §2/§3 accept the occlusion — the
    // panel has a close button, the room is meant to be looked at — and discharge the requirement
    // honestly, in the panel that is doing the covering.
    const warroomSource = readFileSync('src/ui/map/components/warroom/WarroomShellLayer.tsx', 'utf8');
    const deskSource = readFileSync('src/ui/map/components/presidential_desk/PresidentDeskShell.tsx', 'utf8');
    const dateBoardStart = warroomSource.indexOf('function WarroomDateBoard');
    const hotspotStart = warroomSource.indexOf('function WarroomHotspot');
    const dateBoard = warroomSource.slice(dateBoardStart, hotspotStart);

    expect(dateBoardStart).toBeGreaterThan(-1);
    expect(hotspotStart).toBeGreaterThan(dateBoardStart);
    expect(dateBoard).toContain('data-testid="warroom-date-board"');
    expect(dateBoard).toContain('...box');

    // The board stays where it was painted. This half of the old test was always right.
    expect(dateBoard).not.toContain('translateX(');

    // The replacement requirement: a date that does not scroll away. It must be OUTSIDE the
    // scroll region — inside it, it is just another card that leaves the screen, which is the
    // gap that made sliding the whiteboard look necessary in the first place.
    const pinnedIndex = deskSource.indexOf('data-testid="desk-pinned-date"');
    const scrollIndex = deskSource.indexOf('data-testid="president-desk-scroll-region"');
    expect(pinnedIndex).toBeGreaterThan(-1);
    expect(scrollIndex).toBeGreaterThan(-1);
    expect(pinnedIndex).toBeLessThan(scrollIndex);

    // And the clearance that existed only to serve the old approach is gone with it.
    expect(deskSource).not.toContain('mt-[max(0px,calc(26.71vw_-_7.5625rem))]');
  });
});
