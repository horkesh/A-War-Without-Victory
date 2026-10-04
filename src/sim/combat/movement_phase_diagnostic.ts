import type { BrigadeMovementOrder, BrigadeMovementState, FormationId, GameState } from '../../state/game_state.js';
import { isReasonCodeTopicEnabled, resetReasonCodeTopicCacheForTests, sortedIds } from './reason_code_debug.js';

export type Presence<T> =
    | { presence: 'absent' }
    | { presence: 'present_undefined' }
    | { presence: 'present_null' }
    | { presence: 'present_value'; value: T };
type FormationSnapshot = Presence<{
    faction: Presence<string>;
    status: Presence<string>;
    location_osid: Presence<string>;
    corps_id: Presence<string>;
}>;
export interface MovementActorSnapshot {
    formation: FormationSnapshot;
    movement_state: Presence<BrigadeMovementState>;
    movement_order: Presence<BrigadeMovementOrder>;
}
export interface MovementPhaseManifestEntry {
    phase_index: number;
    phase_name: string;
    phase_group: string;
}
export interface MovementPhaseReceipt extends MovementPhaseManifestEntry {
    completed_turn: number;
    disposition: 'executed' | 'skipped';
    skip_reason: string | null;
    formation_id: string;
    before: MovementActorSnapshot;
    after: MovementActorSnapshot;
}
export interface MovementTerminalReceipt {
    completed_turn: number;
    phase_index: number;
    formation_id: string;
    before: MovementActorSnapshot;
    after: MovementActorSnapshot;
}
export interface MovementPhaseDiagnostics {
    topic: 'movement_phase';
    selector_configured: boolean;
    requested_formations: string[];
    phase_manifest: MovementPhaseManifestEntry[];
    causal_proof: false;
    receipts: MovementPhaseReceipt[];
    terminal_receipts: MovementTerminalReceipt[];
}
export interface MovementPhaseBoundary extends MovementPhaseManifestEntry {
    completed_turn: number;
    snapshots: ReadonlyMap<string, MovementActorSnapshot>;
}

let cachedSelection: { configured: boolean; ids: string[] } | undefined;
function selectedFormations(): { configured: boolean; ids: string[] } {
    if (cachedSelection) return cachedSelection;
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
    const ids = typeof raw === 'string'
        ? sortedIds([...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))] as FormationId[])
        : [];
    return cachedSelection = { configured: ids.length > 0, ids };
}
export function resetMovementPhaseSelectorCacheForTests(): void {
    cachedSelection = undefined;
    resetReasonCodeTopicCacheForTests();
}

function present<T>(owner: object, key: PropertyKey, value: T | null | undefined): Presence<T> {
    if (!Object.prototype.hasOwnProperty.call(owner, key)) return { presence: 'absent' };
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    return { presence: 'present_value', value };
}
function copyMovementState(value: BrigadeMovementState): BrigadeMovementState {
    return { ...value, destination_sids: value.destination_sids ? [...value.destination_sids] : undefined, path: value.path ? [...value.path] : undefined };
}
function copyMovementOrder(value: BrigadeMovementOrder): BrigadeMovementOrder {
    return { ...value, destination_sids: [...value.destination_sids] };
}
function recordPresence<T>(record: Record<string, T> | undefined, id: string, copy: (value: T) => T): Presence<T> {
    if (!record || !Object.prototype.hasOwnProperty.call(record, id)) return { presence: 'absent' };
    const value = record[id];
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    return { presence: 'present_value', value: copy(value) };
}
function snapshot(state: GameState, id: string): MovementActorSnapshot {
    const formations = state.military.formations;
    const formation = formations[id];
    const formationSnapshot: FormationSnapshot = !Object.prototype.hasOwnProperty.call(formations, id)
        ? { presence: 'absent' }
        : formation === undefined
            ? { presence: 'present_undefined' }
            : formation === null
                ? { presence: 'present_null' }
                : { presence: 'present_value', value: {
                    faction: present(formation, 'faction', formation.faction),
                    status: present(formation, 'status', formation.status),
                    location_osid: present(formation, 'location_osid', formation.location_osid),
                    corps_id: present(formation, 'corps_id', formation.corps_id),
                } };
    return {
        formation: formationSnapshot,
        movement_state: recordPresence(state.military.brigade_movement_state, id, copyMovementState),
        movement_order: recordPresence(state.military.brigade_movement_orders, id, copyMovementOrder),
    };
}

export class MovementPhaseObserver {
    private readonly manifest: MovementPhaseManifestEntry[] = [];
    private readonly receipts: MovementPhaseReceipt[] = [];
    private readonly terminalReceipts: MovementTerminalReceipt[] = [];
    constructor(private readonly configured: boolean, private readonly ids: string[]) {}

    beforePhase(state: GameState, phaseName: string, phaseIndex: number, phaseGroup: string): MovementPhaseBoundary | undefined {
        const entry = { phase_index: phaseIndex, phase_name: phaseName, phase_group: phaseGroup };
        this.manifest.push(entry);
        if (!this.configured) return undefined;
        return { ...entry, completed_turn: state.meta.turn, snapshots: new Map(this.ids.map((id) => [id, snapshot(state, id)])) };
    }
    afterPhase(state: GameState, boundary: MovementPhaseBoundary | undefined, disposition: 'executed' | 'skipped', skipReason: string | null): void {
        if (!boundary) return;
        for (const id of this.ids) {
            this.receipts.push({ completed_turn: boundary.completed_turn, phase_name: boundary.phase_name, phase_group: boundary.phase_group, phase_index: boundary.phase_index, disposition, skip_reason: skipReason, formation_id: id, before: boundary.snapshots.get(id)!, after: snapshot(state, id) });
        }
    }
    terminalBoundary(state: GameState, phaseIndex: number): void {
        if (!this.configured) return;
        for (const id of this.ids) {
            const current = snapshot(state, id);
            this.terminalReceipts.push({ completed_turn: state.meta.turn, phase_index: phaseIndex, formation_id: id, before: current, after: snapshot(state, id) });
        }
    }
    finish(): MovementPhaseDiagnostics {
        return { topic: 'movement_phase', selector_configured: this.configured, requested_formations: [...this.ids], phase_manifest: [...this.manifest], causal_proof: false, receipts: [...this.receipts], terminal_receipts: [...this.terminalReceipts] };
    }
}
export function createMovementPhaseObserver(): MovementPhaseObserver | undefined {
    if (!isReasonCodeTopicEnabled('movement_phase')) return undefined;
    const selection = selectedFormations();
    return new MovementPhaseObserver(selection.configured, selection.ids);
}
