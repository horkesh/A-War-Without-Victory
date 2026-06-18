import type { ShellHandoffCommand } from '../../shared/shellHandoff';

export type WarroomOverlaySurface =
  | 'president-desk'
  | 'command-surface'
  | 'diplomacy'
  | 'intelligence'
  | 'staff'
  | 'chronicle'
  | 'faction';

export type WarroomLocalCommand =
  | {
      kind: 'war-map';
    }
  | {
      kind: 'warroom-overlay';
      surface: WarroomOverlaySurface;
    };

export function isWarroomLocalCommand(value: unknown): value is WarroomLocalCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Partial<WarroomLocalCommand>;
  return (
    command.kind === 'war-map'
    || command.kind === 'warroom-overlay'
  );
}

export type WarroomNavigationCommand = ShellHandoffCommand | WarroomLocalCommand;

export type WarroomRouteId =
  | 'president-desk'
  | 'command-surface'
  | 'diplomacy'
  | 'intelligence'
  | 'staff'
  | 'chronicle'
  | 'faction'
  | 'war-map'
  | 'advance';

export interface WarroomRouteEntry {
  id: WarroomRouteId;
  label: string;
  regionIds: readonly string[];
  command?: WarroomNavigationCommand;
}

export const WARROOM_ROUTE_ENTRIES: readonly WarroomRouteEntry[] = [
  {
    id: 'president-desk',
    label: "President's Desk",
    regionIds: ['president_desk_area'],
    command: { kind: 'warroom-overlay', surface: 'president-desk' },
  },
  {
    id: 'command-surface',
    label: 'Command Surface',
    regionIds: ['command_briefing_folio'],
    command: { kind: 'warroom-overlay', surface: 'command-surface' },
  },
  {
    id: 'diplomacy',
    label: 'Diplomacy',
    regionIds: ['diplomatic_telephone'],
    command: { kind: 'warroom-overlay', surface: 'diplomacy' },
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    regionIds: ['intelligence_journal', 'desk_radio'],
    command: { kind: 'warroom-overlay', surface: 'intelligence' },
  },
  {
    id: 'staff',
    label: 'Army HQ',
    regionIds: ['commander_coatrack'],
    command: { kind: 'warroom-overlay', surface: 'staff' },
  },
  {
    id: 'chronicle',
    label: 'Chronicle',
    regionIds: ['newspaper_stack'],
    command: { kind: 'warroom-overlay', surface: 'chronicle' },
  },
  {
    id: 'faction',
    label: 'Faction',
    regionIds: ['wall_flag_area'],
    command: { kind: 'warroom-overlay', surface: 'faction' },
  },
  {
    id: 'war-map',
    label: 'War Map',
    regionIds: ['desk_map', 'wall_cork_board'],
    command: { kind: 'war-map' },
  },
  {
    id: 'advance',
    label: 'Advance',
    regionIds: ['wall_calendar_area', 'wall_calendar'],
    command: { kind: 'advance-turn' },
  },
] as const;

export function commandForWarroomRoute(routeId: WarroomRouteId): WarroomNavigationCommand | undefined {
  return WARROOM_ROUTE_ENTRIES.find((entry) => entry.id === routeId)?.command;
}

export function routeForWarroomRegion(regionId: string): WarroomRouteId | undefined {
  return WARROOM_ROUTE_ENTRIES.find((entry) => entry.regionIds.includes(regionId))?.id;
}

export function commandForWarroomRegion(regionId: string): WarroomNavigationCommand | undefined {
  const routeId = routeForWarroomRegion(regionId);
  return routeId ? commandForWarroomRoute(routeId) : undefined;
}
