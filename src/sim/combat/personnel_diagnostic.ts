import type { GameState } from '../../state/game_state.js';
import { stableStringify } from '../../utils/stable_json.js';
import { isReasonCodeTopicEnabled, sortedIds } from './reason_code_debug.js';

export const PERSONNEL_DIAGNOSTIC_PREFIX = '[personnel]';

export type PersonnelPresence =
    | { presence: 'formation_absent' }
    | { presence: 'formation_present_undefined' }
    | { presence: 'formation_present_null' }
    | { presence: 'personnel_absent' }
    | { presence: 'present_undefined' }
    | { presence: 'present_null' }
    | { presence: 'present_nonfinite'; value: string }
    | { presence: 'present_value'; value: number };

export interface PersonnelPhaseBoundary {
    completed_turn: number;
    phase_index: number;
    phase_name: string;
    phase_group: string;
    snapshots: ReadonlyMap<string, PersonnelPresence>;
}

let cachedSelection: { configured: boolean; ids: string[] } | undefined;
function selectedPersonnelFormations(): { configured: boolean; ids: string[] } {
    if (cachedSelection) return cachedSelection;
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS;
    const ids = typeof raw === 'string'
        ? sortedIds([...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))])
        : [];
    return cachedSelection = { configured: ids.length > 0, ids };
}

export function resetPersonnelSelectorCacheForTests(): void {
    cachedSelection = undefined;
}

function personnelPresence(state: GameState, formationId: string): PersonnelPresence {
    const formations = state.military.formations;
    if (!Object.prototype.hasOwnProperty.call(formations, formationId)) return { presence: 'formation_absent' };
    const formation = formations[formationId];
    if (formation === undefined) return { presence: 'formation_present_undefined' };
    if (formation === null) return { presence: 'formation_present_null' };
    if (!Object.prototype.hasOwnProperty.call(formation, 'personnel')) return { presence: 'personnel_absent' };
    if (formation.personnel === undefined) {
        return { presence: 'present_undefined' };
    }
    if (formation.personnel === null) return { presence: 'present_null' };
    if (!Number.isFinite(formation.personnel)) return { presence: 'present_nonfinite', value: String(formation.personnel) };
    return { presence: 'present_value', value: formation.personnel };
}

function emit(record: Record<string, unknown>): void {
    try {
        console.log(`${PERSONNEL_DIAGNOSTIC_PREFIX} ${stableStringify({ schema_version: 1, ...record })}`);
    } catch {
        // Observation and stdout failures cannot affect simulation flow.
    }
}

export class PersonnelObserver {
    constructor(private readonly ids: readonly string[]) {}

    beforePhase(state: GameState, phaseName: string, phaseIndex: number, phaseGroup: string): PersonnelPhaseBoundary | undefined {
        try {
            const snapshots = new Map(this.ids.map((id) => [id, personnelPresence(state, id)]));
            const boundary = { completed_turn: state.meta.turn, phase_index: phaseIndex, phase_name: phaseName, phase_group: phaseGroup, snapshots };
            emit({ event: 'phase_start', completed_turn: boundary.completed_turn, phase_index: phaseIndex, phase_name: phaseName, phase_group: phaseGroup, actors: this.ids.map((formation_id) => ({ formation_id, personnel: snapshots.get(formation_id)! })) });
            return boundary;
        } catch {
            return undefined;
        }
    }

    afterPhase(state: GameState, boundary: PersonnelPhaseBoundary | undefined, disposition: 'executed' | 'skipped', skipReason: string | null): void {
        if (!boundary) return;
        try {
            emit({
                event: 'phase_end', completed_turn: boundary.completed_turn, phase_index: boundary.phase_index,
                phase_name: boundary.phase_name, phase_group: boundary.phase_group, disposition, skip_reason: skipReason,
                changes: this.ids.map((formation_id) => {
                    const before = boundary.snapshots.get(formation_id)!;
                    const after = personnelPresence(state, formation_id);
                    const delta = before.presence === 'present_value' && after.presence === 'present_value'
                        ? after.value - before.value
                        : null;
                    return { formation_id, before, after, delta };
                }),
            });
        } catch {
            // Observation must not mask a completed gameplay phase.
        }
    }

    terminalBoundary(state: GameState, phaseIndex: number): void {
        try {
            emit({ event: 'terminal', completed_turn: state.meta.turn, phase_index: phaseIndex, actors: this.ids.map((formation_id) => ({ formation_id, personnel: personnelPresence(state, formation_id) })) });
        } catch {
            // Observation must not change terminal handling.
        }
    }
}

export function createPersonnelObserver(): PersonnelObserver | undefined {
    if (!isReasonCodeTopicEnabled('personnel')) return undefined;
    const selection = selectedPersonnelFormations();
    if (!selection.configured) return undefined;
    return new PersonnelObserver(selection.ids);
}

export function isPersonnelDiagnosticSelected(formationId: string): boolean {
    if (!isReasonCodeTopicEnabled('personnel')) return false;
    const selection = selectedPersonnelFormations();
    return selection.configured && selection.ids.includes(formationId);
}

export function emitPersonnelWriterRecord(formationId: string, record: Record<string, unknown>): void {
    if (!isPersonnelDiagnosticSelected(formationId)) return;
    try {
        emit({ event: 'writer', formation_id: formationId, ...record });
    } catch {
        // Payload construction and serialization are diagnostic-only.
    }
}
