export type ArmyHQTab = 'briefing' | 'summary' | 'records' | 'personnel';
export type ArmyHQRecordsSubTab = 'aar' | 'ops' | 'opportunities';

export type ShellHandoffCommand =
  | {
      kind: 'army-hq';
      tab: ArmyHQTab;
      recordsSubTab?: ArmyHQRecordsSubTab;
      corpsId?: string | null;
    }
  | {
      kind: 'codex';
    }
  | {
      kind: 'chronicle';
    }
  | {
      /** Advance-turn: player clicked the wall calendar hotspot in the React Warroom shell.
       *  Handled by AdvanceTurnModal in App.tsx — sets advanceTurnPending in gameStore. */
      kind: 'advance-turn';
    };

export function isShellHandoffCommand(value: unknown): value is ShellHandoffCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Partial<ShellHandoffCommand>;
  if (command.kind === 'codex' || command.kind === 'chronicle' || command.kind === 'advance-turn') return true;
  if (command.kind !== 'army-hq') return false;
  if (
    command.tab !== 'briefing' &&
    command.tab !== 'summary' &&
    command.tab !== 'records' &&
    command.tab !== 'personnel'
  ) {
    return false;
  }
  if (
    command.recordsSubTab != null
    && command.recordsSubTab !== 'aar'
    && command.recordsSubTab !== 'ops'
    && command.recordsSubTab !== 'opportunities'
  ) {
    return false;
  }
  if (command.corpsId != null && typeof command.corpsId !== 'string') {
    return false;
  }
  return true;
}

export function encodeShellHandoffCommand(command: ShellHandoffCommand): string {
  return encodeURIComponent(JSON.stringify(command));
}

export function decodeShellHandoffCommand(raw: string | null | undefined): ShellHandoffCommand | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return isShellHandoffCommand(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
