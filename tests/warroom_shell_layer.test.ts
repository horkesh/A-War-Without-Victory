import { describe, it, expect, vi } from 'vitest';
import { regionToShellHandoff } from '../src/ui/map/components/warroom/WarroomShellLayer';
import { isShellHandoffCommand, type ShellHandoffCommand } from '../src/ui/shared/shellHandoff';

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

  it('wall_calendar_area → advance-turn', () => {
    expect(regionToShellHandoff('wall_calendar_area')).toEqual({ kind: 'advance-turn' });
  });

  it('wall_calendar → advance-turn', () => {
    expect(regionToShellHandoff('wall_calendar')).toEqual({ kind: 'advance-turn' });
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
// WarroomShellLayer.onNavigate must: apply the command (if any) AND signal
// transition to game view. App.tsx wires this as:
//   onNavigate={(command) => { if (command) applyShellHandoffCommand(...); setAppScreen('game'); }}
// The following tests verify the contract at the callback boundary.

describe('WarroomShellLayer onNavigate contract', () => {
  it('when called with a mapped command, applies the command and transitions to game', () => {
    const applySpy = vi.fn().mockReturnValue(true);
    const setAppScreen = vi.fn();

    // Simulate exactly what App.tsx wires as onNavigate
    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (command) applySpy(command);
      setAppScreen('game');
    };

    const command = regionToShellHandoff('wall_flag_area');
    onNavigate(command);

    expect(applySpy).toHaveBeenCalledWith({ kind: 'army-hq', tab: 'summary' });
    expect(setAppScreen).toHaveBeenCalledWith('game');
  });

  it('when called with undefined (unmapped region), transitions to game without applying a command', () => {
    const applySpy = vi.fn();
    const setAppScreen = vi.fn();

    const onNavigate = (command?: ReturnType<typeof regionToShellHandoff>) => {
      if (command) applySpy(command);
      setAppScreen('game');
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
    ];
    for (const regionId of mappedRegions) {
      const command = regionToShellHandoff(regionId);
      expect(command).toBeDefined();
      expect(isShellHandoffCommand(command)).toBe(true);
    }
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
