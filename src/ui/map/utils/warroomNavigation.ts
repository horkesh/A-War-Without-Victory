import type { ShellHandoffCommand } from '../../shared/shellHandoff';

export type WarroomLocalCommand =
  | {
      kind: 'strategic-overview';
    }
  | {
      kind: 'diplomacy';
    }
  | {
      kind: 'event-log';
    };

export function isWarroomLocalCommand(value: unknown): value is WarroomLocalCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Partial<WarroomLocalCommand>;
  return command.kind === 'strategic-overview' || command.kind === 'diplomacy' || command.kind === 'event-log';
}

export type WarroomNavigationCommand = ShellHandoffCommand | WarroomLocalCommand;
