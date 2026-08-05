/**
 * R5 Phase 2e Task 4 — atomic serial commit of a pure solve's mutation
 * journal back onto live `GameState`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 7.4 and section 9 Task 4.
 *
 * Two passes, exactly as section 7.4 specifies:
 *   1. Validation replays the journal into a tiny shadow of only the target
 *      fields (`Map<FormationId, {location_osid, entrenchment_turns,
 *      assigned_sub_segment_id, assignment}>` plus the single
 *      `unresolved_sector_brigades` value), checking every row's `before`
 *      against the shadow's current value and every row's `sequence`
 *      against a strict 0-based counter — WITHOUT touching live state. It
 *      also checks that live `meta.turn` and the live front-edge set still
 *      match the captured `SectorTopologySolveInput`'s provenance.
 *   2. Only after every row validates, apply every row to the real live
 *      `formations`/`unresolved_sector_brigades` in sequence.
 *
 * Any precondition failure throws `SectorTopologyStaleCommitError` before
 * the first live write — no partial commit, no catch-and-fallback (plan
 * section 7.4: "Do not catch and fall back after a partial commit").
 *
 * Deliberately a SEPARATE file from `sector_topology_mutation_journal.ts`
 * (the plan's literal file-ownership map names that file) to avoid a
 * circular import: this module needs `SectorTopologySolveInput`/
 * `SectorTopologySolveOutput` from `sector_topology_solver_types.ts`, which
 * itself imports `SectorTopologyMutation` FROM `sector_topology_mutation_journal.ts`.
 * Importing `solver_types.ts` back into `mutation_journal.ts` would be
 * circular; a sibling file avoids it while keeping the same one-concern-
 * per-file convention this session's other Phase 2e modules already use.
 *
 * NOT wired into any production caller yet (plan step 5, "make pure-solve/
 * serial-commit the production default," is a separate, higher-risk change
 * — switching the live turn-loop's actual code path — deliberately deferred
 * to its own dedicated, 188w-validated increment; see the session
 * checkpoint in the plan doc for why).
 *
 * Diagnostics timing note: `output.diagnostics` is a completed record of
 * messages already emitted live (via `emitRoutineConsoleDebug`/`Warn`)
 * during the pure solve itself, not deferred output waiting to be announced
 * at commit time — the collector observes, it does not suppress. Commit's
 * job is state mutation only.
 */

import type { FormationAssignment, FormationId, GameState } from '../../state/game_state.js';
import type { SectorTopologyMutation } from './sector_topology_mutation_journal.js';
import type { SectorTopologySolveInput, SectorTopologySolveOutput } from './sector_topology_solver_types.js';
import { strictCompare } from '../../state/validateGameState.js';

export type SectorTopologyCommitFailureKind =
    | 'stale-turn'
    | 'stale-front-edges'
    | 'malformed-sequence'
    | 'unknown-mutation-kind'
    | 'target-formation-missing'
    | 'stale-value';

export class SectorTopologyStaleCommitError extends Error {
    readonly kind: SectorTopologyCommitFailureKind;

    constructor(kind: SectorTopologyCommitFailureKind, detail: string) {
        super(`Sector topology commit precondition failed (${kind}): ${detail}`);
        this.kind = kind;
        this.name = 'SectorTopologyStaleCommitError';
    }
}

function assignmentsEqual(a: FormationAssignment | null, b: FormationAssignment | null): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    return a.kind === b.kind
        && a.region_id === b.region_id
        && a.edge_id === b.edge_id
        && a.sector_id === b.sector_id
        && a.role === b.role;
}

function formationIdArraysEqual(a: readonly FormationId[] | undefined, b: readonly FormationId[] | undefined): boolean {
    if (a === b) return true;
    if (a === undefined || b === undefined) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

interface FrontEdgeProvenanceRow {
    readonly edge_id: string;
    readonly a: string;
    readonly b: string;
    readonly side_a: string | null;
    readonly side_b: string | null;
}

function canonicalizeFrontEdges(rows: readonly FrontEdgeProvenanceRow[]): string {
    return rows
        .map((r) => `${r.edge_id}|${r.a}|${r.b}|${r.side_a ?? ''}|${r.side_b ?? ''}`)
        .sort(strictCompare)
        .join('\n');
}

interface CommitShadowFormation {
    location_osid: string | undefined;
    entrenchment_turns: number | undefined;
    assigned_sub_segment_id: string | undefined;
    assignment: FormationAssignment | null;
}

/**
 * Validate `mutations` against `state`'s CURRENT values without mutating
 * anything. Throws `SectorTopologyStaleCommitError` on the first failure.
 * Exported for direct unit testing of the validation pass in isolation from
 * the apply pass (plan step 2: "Prove every failure occurs before any live
 * write or diagnostic emission").
 */
export function validateSectorTopologyCommit(
    state: GameState,
    input: SectorTopologySolveInput,
    mutations: readonly SectorTopologyMutation[],
): void {
    if (state.meta.turn !== input.turn) {
        throw new SectorTopologyStaleCommitError(
            'stale-turn',
            `captured turn ${input.turn}, live turn is ${state.meta.turn}`,
        );
    }

    const liveFrontEdges = canonicalizeFrontEdges(state.military.war_front_edges_osid ?? []);
    const capturedFrontEdges = canonicalizeFrontEdges(input.frontEdges);
    if (liveFrontEdges !== capturedFrontEdges) {
        throw new SectorTopologyStaleCommitError(
            'stale-front-edges',
            'live war_front_edges_osid no longer matches the captured input provenance',
        );
    }

    const liveFormations = state.military.formations ?? {};
    const shadow = new Map<FormationId, CommitShadowFormation>();
    let shadowUnresolved: readonly FormationId[] | undefined = state.military.unresolved_sector_brigades;

    function shadowFor(formationId: FormationId): CommitShadowFormation {
        const existing = shadow.get(formationId);
        if (existing) return existing;
        const live = liveFormations[formationId];
        if (!live) {
            throw new SectorTopologyStaleCommitError(
                'target-formation-missing',
                `formation ${formationId} referenced by the mutation journal is not present in live state`,
            );
        }
        const fresh: CommitShadowFormation = {
            location_osid: live.location_osid,
            entrenchment_turns: live.entrenchment_turns,
            assigned_sub_segment_id: live.assigned_sub_segment_id,
            assignment: live.assignment ?? null,
        };
        shadow.set(formationId, fresh);
        return fresh;
    }

    for (let i = 0; i < mutations.length; i++) {
        const row = mutations[i]!;
        if (row.sequence !== i) {
            throw new SectorTopologyStaleCommitError(
                'malformed-sequence',
                `expected sequence ${i}, got ${row.sequence} (kind ${row.kind})`,
            );
        }
        switch (row.kind) {
            case 'formation-location': {
                const s = shadowFor(row.formationId);
                if (s.location_osid !== row.before) {
                    throw new SectorTopologyStaleCommitError(
                        'stale-value',
                        `row ${i} (formation-location, ${row.formationId}): expected before ${String(row.before)}, live shadow has ${String(s.location_osid)}`,
                    );
                }
                s.location_osid = row.after;
                break;
            }
            case 'formation-entrenchment': {
                const s = shadowFor(row.formationId);
                if (s.entrenchment_turns !== row.before) {
                    throw new SectorTopologyStaleCommitError(
                        'stale-value',
                        `row ${i} (formation-entrenchment, ${row.formationId}): expected before ${String(row.before)}, live shadow has ${String(s.entrenchment_turns)}`,
                    );
                }
                s.entrenchment_turns = row.after;
                break;
            }
            case 'formation-assigned-sub-segment': {
                const s = shadowFor(row.formationId);
                if (s.assigned_sub_segment_id !== row.before) {
                    throw new SectorTopologyStaleCommitError(
                        'stale-value',
                        `row ${i} (formation-assigned-sub-segment, ${row.formationId}): expected before ${String(row.before)}, live shadow has ${String(s.assigned_sub_segment_id)}`,
                    );
                }
                s.assigned_sub_segment_id = row.after;
                break;
            }
            case 'formation-assignment': {
                const s = shadowFor(row.formationId);
                if (!assignmentsEqual(s.assignment, row.before)) {
                    throw new SectorTopologyStaleCommitError(
                        'stale-value',
                        `row ${i} (formation-assignment, ${row.formationId}): expected before ${JSON.stringify(row.before)}, live shadow has ${JSON.stringify(s.assignment)}`,
                    );
                }
                s.assignment = row.after;
                break;
            }
            case 'unresolved-sector-brigades': {
                if (!formationIdArraysEqual(shadowUnresolved, row.before)) {
                    throw new SectorTopologyStaleCommitError(
                        'stale-value',
                        `row ${i} (unresolved-sector-brigades): expected before ${JSON.stringify(row.before)}, live shadow has ${JSON.stringify(shadowUnresolved)}`,
                    );
                }
                shadowUnresolved = row.after;
                break;
            }
            default: {
                const unknown = row as { kind: string };
                throw new SectorTopologyStaleCommitError(
                    'unknown-mutation-kind',
                    `row ${i} has unrecognized kind ${JSON.stringify(unknown.kind)}`,
                );
            }
        }
    }
}

/**
 * Apply `mutations` to live `state` in exact sequence. Callers MUST have
 * already called `validateSectorTopologyCommit` (or use `commitSectorTopologySolve`,
 * which does both in order) — this function performs no validation of its
 * own and will corrupt state if handed a stale or malformed journal.
 */
function applySectorTopologyCommit(state: GameState, mutations: readonly SectorTopologyMutation[]): void {
    const formations = state.military.formations ?? {};
    for (const row of mutations) {
        switch (row.kind) {
            case 'formation-location':
                formations[row.formationId]!.location_osid = row.after;
                break;
            case 'formation-entrenchment':
                formations[row.formationId]!.entrenchment_turns = row.after;
                break;
            case 'formation-assigned-sub-segment':
                formations[row.formationId]!.assigned_sub_segment_id = row.after;
                break;
            case 'formation-assignment':
                formations[row.formationId]!.assignment = row.after;
                break;
            case 'unresolved-sector-brigades':
                state.military.unresolved_sector_brigades = [...row.after];
                break;
        }
    }
}

/**
 * Validate, then apply, a pure solve's output onto live `state`. Also
 * assigns `output.sectors` to `state.military.corps_front_sectors`,
 * matching every existing imperative call site's own final step.
 * Throws `SectorTopologyStaleCommitError` before any live write when a
 * precondition fails; never partially applies a journal.
 */
export function commitSectorTopologySolve(
    state: GameState,
    input: SectorTopologySolveInput,
    output: SectorTopologySolveOutput,
): void {
    validateSectorTopologyCommit(state, input, output.mutations);
    applySectorTopologyCommit(state, output.mutations);
    state.military.corps_front_sectors = { ...output.sectors };
}
