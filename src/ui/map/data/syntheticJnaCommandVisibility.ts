import type { FormationView } from './types.js';

const SYNTHETIC_JNA_COMMAND_IDS = new Set(['jna_herzegovina_command']);

export function isWithdrawnEmptySyntheticJnaCommand(
    command: FormationView,
    formations: ReadonlyArray<FormationView>,
    eventFlags?: Record<string, string | number | boolean>,
): boolean {
    if (!SYNTHETIC_JNA_COMMAND_IDS.has(command.id)) return false;

    const withdrawalRecorded = command.status === 'inactive' || eventFlags?.jna_withdrawn === true;
    if (!withdrawalRecorded || (command.personnel ?? 0) > 0) return false;

    return !formations.some((formation) => (
        formation.id !== command.id
        && formation.corps_id === command.id
        && formation.status === 'active'
        && (formation.personnel ?? 0) > 0
    ));
}

export function hideWithdrawnEmptySyntheticJnaCommands(
    formations: ReadonlyArray<FormationView>,
    eventFlags?: Record<string, string | number | boolean>,
): FormationView[] {
    return formations.filter((formation) => (
        !isWithdrawnEmptySyntheticJnaCommand(formation, formations, eventFlags)
    ));
}
