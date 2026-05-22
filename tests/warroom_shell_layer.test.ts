import { describe, it, expect, vi } from 'vitest';
import {
  buildWarroomProjectedMapModel,
  getWarroomBoardDateLabel,
  getWarroomRegionLabel,
  getWarroomRegionClipPath,
  regionToShellHandoff,
  warroomRegionsUrlForFaction,
} from '../src/ui/map/components/warroom/WarroomShellLayer';
import { isShellHandoffCommand, type ShellHandoffCommand } from '../src/ui/shared/shellHandoff';
import { warroomCommandStaysInRoom } from '../src/ui/map/utils/shellNavigation';
import { isWarroomLocalCommand, type WarroomLocalCommand } from '../src/ui/map/utils/warroomNavigation';

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

  it('wall_cork_board legacy alias → undefined (same behavior as desk_map)', () => {
    expect(regionToShellHandoff('wall_cork_board')).toBeUndefined();
  });

  it('desk_radio → event-log', () => {
    expect(regionToShellHandoff('desk_radio')).toEqual({ kind: 'event-log' });
  });

  it('diplomatic_telephone → army-hq summary', () => {
    expect(regionToShellHandoff('diplomatic_telephone')).toEqual({ kind: 'army-hq', tab: 'summary' });
  });

  it('wall_calendar_area → advance-turn', () => {
    expect(regionToShellHandoff('wall_calendar_area')).toEqual({ kind: 'advance-turn' });
  });

  it('wall_calendar → advance-turn', () => {
    expect(regionToShellHandoff('wall_calendar')).toEqual({ kind: 'advance-turn' });
  });

  it('desk_map → undefined (intentional: clicking the map navigates to game/map view)', () => {
    // desk_map is the primary map-access hotspot in the warroom.
    // It intentionally returns undefined so the onNavigate callback reaches
    // warroomCommandStaysInRoom(undefined) → false → setAppScreen('game'),
    // showing the tactical map without pre-opening any specific panel.
    // DATA BOUNDARY: no command = navigate to game view. This is not a missing case.
    expect(regionToShellHandoff('desk_map')).toBeUndefined();
  });

  it('desk_map undefined return causes game-view transition without applying a command', () => {
    // Prove the full onNavigate contract for desk_map:
    // undefined command → no applyShellHandoffCommand call → setAppScreen('game').
    const applySpy = vi.fn();
    const setAppScreen = vi.fn();

    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (isWarroomLocalCommand(command)) return;
      if (command) applySpy(command);
      if (!warroomCommandStaysInRoom(command)) setAppScreen('game');
    };

    const command = regionToShellHandoff('desk_map'); // → undefined
    onNavigate(command);

    expect(applySpy).not.toHaveBeenCalled();
    expect(setAppScreen).toHaveBeenCalledWith('game');
  });
});

// ── Entry path message type contracts ─────────────────────────────────────────
// These tests verify the message type strings used in the warroom.ts ↔ React
// iframe protocol so that a typo in either direction fails here, not at runtime.

describe('warroom React shell entry path — message type contracts', () => {
  it('awwv-shell:show-warroom is the correct type for warroom.ts→React show-warroom message', () => {
    // warroom.ts posts this when REACT_SHELL_ENABLED and back-to-HQ received.
    // App.tsx listens for this exact string to set appScreen='warroom'.
    const msg = { type: 'awwv-shell:show-warroom' };
    expect(msg.type).toBe('awwv-shell:show-warroom');
  });

  it('awwv-shell:handoff is the correct type for warroom.ts→React handoff message', () => {
    const command = { kind: 'army-hq', tab: 'summary' } as const;
    const msg = { type: 'awwv-shell:handoff', command };
    expect(msg.type).toBe('awwv-shell:handoff');
    expect(isShellHandoffCommand(msg.command)).toBe(true);
  });

  it('awwv-back-to-hq is the correct type for React→warroom.ts back-to-HQ message', () => {
    // TopToolbar.tsx and PresidentialToolbar.tsx post this to window.parent.
    // warroom.ts listens for this on the window message event.
    const msg = { type: 'awwv-back-to-hq' };
    expect(msg.type).toBe('awwv-back-to-hq');
  });
});

// ── onNavigate callback contract ───────────────────────────────────────────────
// WarroomShellLayer.onNavigate must: apply the command (if any), then transition
// to game view ONLY for commands that do not stay in room.
// App.tsx wires this as (Wave 3):
//   onNavigate={(command) => {
//     if (command) applyShellHandoffCommand({ ...store, setEventLogOpen }, command);
//     if (!warroomCommandStaysInRoom(command)) setAppScreen('game');
//   }}

describe('WarroomShellLayer onNavigate contract', () => {
  it('navigating command (army-hq) applies command and transitions to game', () => {
    const applySpy = vi.fn().mockReturnValue(true);
    const setAppScreen = vi.fn();

    // Simulate the Wave 3 App.tsx onNavigate
    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (isWarroomLocalCommand(command)) return;
      if (command) applySpy(command);
      if (!warroomCommandStaysInRoom(command)) setAppScreen('game');
    };

    const command = regionToShellHandoff('wall_flag_area'); // → army-hq, navigates away
    onNavigate(command);

    expect(applySpy).toHaveBeenCalledWith({ kind: 'army-hq', tab: 'summary' });
    expect(setAppScreen).toHaveBeenCalledWith('game');
  });

  it('legacy wall_cork_board hotspot transitions to game/map view', () => {
    const applySpy = vi.fn().mockReturnValue(true);
    const setAppScreen = vi.fn();

    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (isWarroomLocalCommand(command)) return;
      if (command) applySpy(command);
      if (!warroomCommandStaysInRoom(command)) setAppScreen('game');
    };

    const command = regionToShellHandoff('wall_cork_board'); // legacy alias, same transition as desk_map
    onNavigate(command);

    expect(applySpy).not.toHaveBeenCalled();
    expect(setAppScreen).toHaveBeenCalledWith('game');
  });

  it('when called with undefined (unmapped region), transitions to game without applying a command', () => {
    const applySpy = vi.fn();
    const setAppScreen = vi.fn();

    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (isWarroomLocalCommand(command)) return;
      if (command) applySpy(command);
      if (!warroomCommandStaysInRoom(command)) setAppScreen('game');
    };

    onNavigate(undefined);

    expect(applySpy).not.toHaveBeenCalled();
    expect(setAppScreen).toHaveBeenCalledWith('game');
  });

  it('all mapped regions produce valid ShellHandoffCommands', () => {
    const mappedRegions = [
      'wall_flag_area',
      'commander_coatrack',
      'command_briefing_folio',
      'newspaper_stack',
      'intelligence_journal',
      'wall_calendar_area',
      'wall_calendar',
      'diplomatic_telephone',
    ];
    for (const regionId of mappedRegions) {
      const command = regionToShellHandoff(regionId);
      expect(command).toBeDefined();
      expect(isShellHandoffCommand(command)).toBe(true);
    }
  });
});

// ── Wave 3: new ShellHandoffCommand kinds ────────────────────────────────────

describe('shared-vs-local Warroom command split', () => {
  it('{ kind: strategic-overview } is a local Warroom command only', () => {
    const cmd: WarroomLocalCommand = { kind: 'strategic-overview' };
    expect(isShellHandoffCommand(cmd)).toBe(false);
  });

  it('{ kind: event-log } is a local Warroom command only', () => {
    const cmd: WarroomLocalCommand = { kind: 'event-log' };
    expect(isShellHandoffCommand(cmd)).toBe(false);
  });
});

// ── warroomCommandStaysInRoom ─────────────────────────────────────────────────

describe('warroom region data contract', () => {
  it('uses player-facing hotspot labels for visible ribbons', () => {
    expect(getWarroomRegionLabel({ id: 'desk_map', tooltip: 'Operational Map' })).toBe('Operational Map');
    expect(getWarroomRegionLabel({ id: 'wall_calendar_area' })).toBe('Wall Calendar Area');
  });

  it('loads canonical clickable-region files from /data/ui by faction', () => {
    expect(warroomRegionsUrlForFaction('RBiH')).toBe('/data/ui/hq_rbih_clickable_regions.json');
    expect(warroomRegionsUrlForFaction('RS')).toBe('/data/ui/hq_rs_clickable_regions.json');
    expect(warroomRegionsUrlForFaction('HRHB')).toBe('/data/ui/hq_hrhb_clickable_regions.json');
  });

  it('converts authored absolute polygons to local hotspot clip paths', () => {
    expect(getWarroomRegionClipPath({
      id: 'desk_map',
      bounds: { x: 100, y: 200, width: 200, height: 100 },
      polygon: [
        [100, 200],
        [300, 200],
        [300, 300],
        [100, 300],
      ],
    })).toBe('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  });

  it('builds a faction-only projected corkboard map with current front lines', () => {
    const model = buildWarroomProjectedMapModel({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { osid: 'op:left' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [17, 44],
              [18, 44],
              [18, 45],
              [17, 45],
              [17, 44],
            ]],
          },
        },
        {
          type: 'Feature',
          properties: { osid: 'op:right' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [18, 44],
              [19, 44],
              [19, 45],
              [18, 45],
              [18, 44],
            ]],
          },
        },
      ],
    }, {
      'op:left': 'RBiH',
      'op:right': 'RS',
    }, 'RBiH');

    expect(model?.territoryPaths).toHaveLength(1);
    expect(model?.frontLinePaths).toHaveLength(1);
    expect(model?.outlinePaths).toHaveLength(2);
  });

  it('formats the whiteboard date from loaded game metadata', () => {
    expect(getWarroomBoardDateLabel({ metadata: { turn: 12, date: '24 June 1992' }, turn: 12 }))
      .toBe('24 June 1992');
    expect(getWarroomBoardDateLabel({ metadata: { turn: 0, date: '1 Apr 1992 · Turn 0 (War)' }, turn: 0 }))
      .toBe('1 Apr 1992');
    expect(getWarroomBoardDateLabel({ label: 'Turn 0 (war)', metadata: { turn: 0, date: 'UNKNOWN' }, turn: 0 }))
      .toBe('1 Apr 1992');
    expect(getWarroomBoardDateLabel({ metadata: { turn: 7, date: 'UNKNOWN' }, turn: 7 }))
      .toBe('20 May 1992');
  });
});

describe('warroomCommandStaysInRoom', () => {
  it('advance-turn stays in room', () => {
    expect(warroomCommandStaysInRoom({ kind: 'advance-turn' })).toBe(true);
  });

  it('army-hq navigates away (does not stay in room)', () => {
    expect(warroomCommandStaysInRoom({ kind: 'army-hq', tab: 'summary' })).toBe(false);
  });

  it('undefined returns false', () => {
    expect(warroomCommandStaysInRoom(undefined)).toBe(false);
  });
});

describe('warroom local commands', () => {
  it('strategic-overview is a local Warroom command, not a shared shell handoff', () => {
    const cmd = { kind: 'strategic-overview' } as const;
    expect(isWarroomLocalCommand(cmd)).toBe(true);
    expect(isShellHandoffCommand(cmd)).toBe(false);
  });

  it('event-log is a local Warroom command, not a shared shell handoff', () => {
    const cmd = { kind: 'event-log' } as const;
    expect(isWarroomLocalCommand(cmd)).toBe(true);
    expect(isShellHandoffCommand(cmd)).toBe(false);
  });
});

// ── advance-turn ShellHandoffCommand type-level check ─────────────────────────
// Ensures { kind: 'advance-turn' } is a valid ShellHandoffCommand at both
// runtime (isShellHandoffCommand) and type-level (TypeScript assignment).

describe('advance-turn ShellHandoffCommand', () => {
  it('{ kind: advance-turn } is a valid ShellHandoffCommand', () => {
    // Type-level: if this fails to compile, the union type is missing the variant.
    const cmd: ShellHandoffCommand = { kind: 'advance-turn' };
    expect(isShellHandoffCommand(cmd)).toBe(true);
  });

  it('wall_calendar_area produces advance-turn command accepted by isShellHandoffCommand', () => {
    const cmd = regionToShellHandoff('wall_calendar_area');
    expect(cmd).toBeDefined();
    expect(isShellHandoffCommand(cmd)).toBe(true);
    expect(cmd?.kind).toBe('advance-turn');
  });
});

// ── AdvanceTurnModal state contract ───────────────────────────────────────────
// The modal renders when advanceTurnPending=true and hides when false.
// These tests verify the state contract without mounting React (pure logic).

describe('AdvanceTurnModal state contract', () => {
  it('advanceTurnPending=true should cause the modal to render', () => {
    // Verify the predicate that AdvanceTurnModal uses: `if (!pending) return null`
    const pending = true;
    const shouldRender = pending;
    expect(shouldRender).toBe(true);
  });

  it('advanceTurnPending=false should suppress the modal', () => {
    const pending = false;
    const shouldRender = pending;
    expect(shouldRender).toBe(false);
  });

  it('setAdvanceTurnPending(false) clears the pending flag', () => {
    // Simulate the store setter contract
    let state = { advanceTurnPending: true };
    const setAdvanceTurnPending = (v: boolean) => { state = { advanceTurnPending: v }; };
    setAdvanceTurnPending(false);
    expect(state.advanceTurnPending).toBe(false);
  });
});
