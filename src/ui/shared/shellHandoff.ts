export type ArmyHQTab = 'briefing' | 'summary' | 'records' | 'personnel';
export type ArmyHQRecordsSubTab = 'aar' | 'ops';

export type ShellHandoffCommand =
  | {
      kind: 'army-hq';
      tab: ArmyHQTab;
      recordsSubTab?: ArmyHQRecordsSubTab;
      corpsId?: string | null;
    }
  | {
      kind: 'codex';
    };

export function isShellHandoffCommand(value: unknown): value is ShellHandoffCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Partial<ShellHandoffCommand>;
  if (command.kind === 'codex') return true;
  if (command.kind !== 'army-hq') return false;
  if (
    command.tab !== 'briefing' &&
    command.tab !== 'summary' &&
    command.tab !== 'records' &&
    command.tab !== 'personnel'
  ) {
    return false;
  }
  if (command.recordsSubTab != null && command.recordsSubTab !== 'aar' && command.recordsSubTab !== 'ops') {
    return false;
  }
  if (command.corpsId != null && typeof command.corpsId !== 'string') {
    return false;
  }
  return true;
}
