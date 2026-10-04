import type { BrigadeMovementOrder, BrigadeMovementState, CorpsFrontSector, GameState } from '../../state/game_state.js';
import { getMovementDiagnosticSelection, type Presence } from './movement_phase_diagnostic.js';
import { isReasonCodeTopicEnabled } from './reason_code_debug.js';

export type FrontDistributionCallsite = 'distribute-brigades-to-front' | 'final-distribute-brigades-to-front' | 'direct-call';
export type FrontDistributionWriter =
    | 'main_phase_a'
    | 'main_phase_b'
    | 'rear_stack_dispersion'
    | 'threatened_reserve_commit'
    | 'empty_front_subsegment_fill'
    | 'shared_front_stack_deconflict'
    | 'must_hold_garrison_pin';

export interface FrontDistributionActorSnapshot {
    formation: Presence<{
        status: Presence<string>; kind: Presence<string>; faction: Presence<string>; location_osid: Presence<string>;
        corps_id: Presence<string>; personnel: Presence<number>; entrenchment_turns: Presence<number>; disrupted_turns: Presence<number>;
    }>;
    movement_state: Presence<BrigadeMovementState>;
    movement_order: Presence<BrigadeMovementOrder>;
    roster: { sector_id: string; assigned: boolean; reserve: boolean; rear: boolean; primary_subsegment_ids: string[] }[];
    operation_participant: boolean;
}
export interface FrontDistributionInvocationReceipt {
    callsite: FrontDistributionCallsite;
    completed_turn: number;
    invocation_ordinal: number;
    formation_id: string;
    enable_standing_og_reserve_commit: boolean;
    before_invocation: FrontDistributionActorSnapshot;
    write_count: number;
    wrote_helpers: FrontDistributionWriter[];
}
export interface FrontDistributionWriteReceipt {
    callsite: FrontDistributionCallsite;
    completed_turn: number;
    invocation_ordinal: number;
    write_ordinal: number;
    helper: FrontDistributionWriter;
    formation_id: string;
    boundary: 'pre_write';
    selection_inputs_boundary: 'post_selection_pre_write';
    action_kind: 'direct_location' | 'column_order';
    prior_mutations_in_invocation_possible: true;
    before: FrontDistributionActorSnapshot;
    candidate_ids: string[];
    target_ids: string[];
    target_osid: string;
    distance: number | null;
    score: number | null;
    feature_inputs: Record<string, string | number | boolean | null | string[] | number[]>;
}
export interface FrontDistributionDiagnostics {
    topic: 'front_distribution';
    selector_configured: boolean;
    requested_formations: string[];
    causal_proof: false;
    invocations: FrontDistributionInvocationReceipt[];
    writes: FrontDistributionWriteReceipt[];
}
export interface FrontDistributionWriteInput {
    helper: FrontDistributionWriter;
    formation_id: string;
    sectors: readonly CorpsFrontSector[];
    op_participants: ReadonlySet<string>;
    candidate_ids: readonly string[];
    target_ids: readonly string[];
    target_osid: string;
    distance: number | null;
    score: number | null;
    feature_inputs: FrontDistributionWriteReceipt['feature_inputs'];
    action_kind: FrontDistributionWriteReceipt['action_kind'];
}

function recordPresence<T>(record: Record<string, T> | undefined, id: string, copy: (value: T) => T): Presence<T> {
    if (!record || !Object.prototype.hasOwnProperty.call(record, id)) return { presence: 'absent' };
    const value = record[id];
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    return { presence: 'present_value', value: copy(value) };
}
function fieldPresence<T>(owner: object, key: PropertyKey, value: T | null | undefined): Presence<T> {
    if (!Object.prototype.hasOwnProperty.call(owner, key)) return { presence: 'absent' };
    if (value === undefined) return { presence: 'present_undefined' };
    if (value === null) return { presence: 'present_null' };
    return { presence: 'present_value', value };
}
function actorSnapshot(state: GameState, id: string, sectors: readonly CorpsFrontSector[], opParticipants: ReadonlySet<string>): FrontDistributionActorSnapshot {
    const formations = state.military.formations;
    const f = formations[id];
    const formation: FrontDistributionActorSnapshot['formation'] = !Object.prototype.hasOwnProperty.call(formations, id)
        ? { presence: 'absent' }
        : f === undefined ? { presence: 'present_undefined' }
            : f === null ? { presence: 'present_null' }
                : { presence: 'present_value', value: {
                    status: fieldPresence(f, 'status', f.status), kind: fieldPresence(f, 'kind', f.kind),
                    faction: fieldPresence(f, 'faction', f.faction), location_osid: fieldPresence(f, 'location_osid', f.location_osid),
                    corps_id: fieldPresence(f, 'corps_id', f.corps_id), personnel: fieldPresence(f, 'personnel', f.personnel),
                    entrenchment_turns: fieldPresence(f, 'entrenchment_turns', f.entrenchment_turns),
                    disrupted_turns: fieldPresence(f, 'disrupted_turns', f.disrupted_turns),
                } };
    return {
        formation,
        movement_state: recordPresence(state.military.brigade_movement_state, id, (value) => ({ ...value, destination_sids: value.destination_sids ? [...value.destination_sids] : undefined, path: value.path ? [...value.path] : undefined })),
        movement_order: recordPresence(state.military.brigade_movement_orders, id, (value) => ({ ...value, destination_sids: [...value.destination_sids] })),
        roster: sectors.map((sector) => ({
            sector_id: sector.sector_id,
            assigned: (sector.assigned_brigade_ids ?? []).includes(id),
            reserve: (sector.reserve_brigade_ids ?? []).includes(id),
            rear: (sector.rear_brigade_ids ?? []).includes(id),
            primary_subsegment_ids: (sector.sub_segments ?? []).filter((sub) => (sub.primary_brigade_ids ?? []).includes(id)).map((sub) => sub.sub_segment_id),
        })),
        operation_participant: opParticipants.has(id),
    };
}

export class FrontDistributionRecorder {
    private readonly writes: FrontDistributionWriteReceipt[] = [];
    private readonly invocationBefore: Map<string, FrontDistributionActorSnapshot>;
    constructor(
        private readonly state: GameState,
        private readonly sectors: readonly CorpsFrontSector[],
        private readonly opParticipants: ReadonlySet<string>,
        private readonly callsite: FrontDistributionCallsite,
        private readonly completedTurn: number,
        private readonly invocationOrdinal: number,
        private readonly configured: boolean,
        private readonly ids: string[],
        private readonly enableStandingOgReserveCommit: boolean,
    ) {
        this.invocationBefore = new Map(configured ? ids.map((id) => [id, actorSnapshot(state, id, sectors, opParticipants)]) : []);
    }
    recordWrite(input: FrontDistributionWriteInput): void {
        if (!this.configured || !this.ids.includes(input.formation_id)) return;
        this.writes.push({
            callsite: this.callsite, completed_turn: this.completedTurn, invocation_ordinal: this.invocationOrdinal,
            write_ordinal: this.writes.length, helper: input.helper, formation_id: input.formation_id,
            boundary: 'pre_write', selection_inputs_boundary: 'post_selection_pre_write', action_kind: input.action_kind, prior_mutations_in_invocation_possible: true,
            before: actorSnapshot(this.state, input.formation_id, input.sectors, input.op_participants),
            candidate_ids: [...input.candidate_ids], target_ids: [...input.target_ids], target_osid: input.target_osid,
            distance: input.distance, score: input.score,
            feature_inputs: Object.fromEntries(Object.entries(input.feature_inputs).map(([key, value]) => [key, Array.isArray(value) ? [...value] as typeof value : value])),
        });
    }
    finish(): FrontDistributionDiagnostics {
        return {
            topic: 'front_distribution', selector_configured: this.configured, requested_formations: [...this.ids], causal_proof: false,
            invocations: this.configured ? this.ids.map((id) => {
                const actorWrites = this.writes.filter((write) => write.formation_id === id);
                return { callsite: this.callsite, completed_turn: this.completedTurn, invocation_ordinal: this.invocationOrdinal, formation_id: id,
                    enable_standing_og_reserve_commit: this.enableStandingOgReserveCommit,
                    before_invocation: this.invocationBefore.get(id)!, write_count: actorWrites.length,
                    wrote_helpers: actorWrites.map((write) => write.helper) };
            }) : [],
            writes: [...this.writes],
        };
    }
}
export function createFrontDistributionRecorder(
    state: GameState, sectors: readonly CorpsFrontSector[], opParticipants: ReadonlySet<string>,
    callsite: FrontDistributionCallsite, completedTurn: number | undefined, invocationOrdinal: number,
    enableStandingOgReserveCommit: boolean,
): FrontDistributionRecorder | undefined {
    if (!isReasonCodeTopicEnabled('front_distribution')) return undefined;
    const selection = getMovementDiagnosticSelection();
    return new FrontDistributionRecorder(state, sectors, opParticipants, callsite, completedTurn ?? state.meta.turn, invocationOrdinal, selection.configured, selection.ids, enableStandingOgReserveCommit);
}

export function mergeFrontDistributionDiagnostics(existing: FrontDistributionDiagnostics | undefined, next: FrontDistributionDiagnostics | undefined): FrontDistributionDiagnostics | undefined {
    if (!next) return existing;
    if (!existing) return next;
    return { ...existing, invocations: [...existing.invocations, ...next.invocations], writes: [...existing.writes, ...next.writes] };
}
export function nextFrontDistributionInvocationOrdinal(existing: FrontDistributionDiagnostics | undefined): number {
    const last = existing?.invocations[existing.invocations.length - 1];
    return last ? last.invocation_ordinal + 1 : 0;
}
