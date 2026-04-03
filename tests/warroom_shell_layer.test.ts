import { describe, it, expect } from 'vitest';
import { regionToShellHandoff } from '../src/ui/map/components/warroom/WarroomShellLayer';

describe('regionToShellHandoff', () => {
  it('wall_flag_area → army-hq summary', () => {
    expect(regionToShellHandoff('wall_flag_area')).toEqual({ kind: 'army-hq', tab: 'summary' });
  });

  it('commander_coatrack → army-hq summary', () => {
    expect(regionToShellHandoff('commander_coatrack')).toEqual({ kind: 'army-hq', tab: 'summary' });
  });

  it('command_briefing_folio → army-hq briefing', () => {
    expect(regionToShellHandoff('command_briefing_folio')).toEqual({ kind: 'army-hq', tab: 'briefing' });
  });

  it('newspaper_stack → chronicle', () => {
    expect(regionToShellHandoff('newspaper_stack')).toEqual({ kind: 'chronicle' });
  });

  it('intelligence_journal → army-hq records aar', () => {
    expect(regionToShellHandoff('intelligence_journal')).toEqual({
      kind: 'army-hq',
      tab: 'records',
      recordsSubTab: 'aar',
    });
  });

  it('unknown region → undefined', () => {
    expect(regionToShellHandoff('unknown_region')).toBeUndefined();
  });

  it('wall_cork_board (strategic map, no React equivalent) → undefined', () => {
    expect(regionToShellHandoff('wall_cork_board')).toBeUndefined();
  });

  it('wall_calendar_area (advance-turn, no React equivalent) → undefined', () => {
    expect(regionToShellHandoff('wall_calendar_area')).toBeUndefined();
  });
});
